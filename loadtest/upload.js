import http from "k6/http";
import { check, sleep } from "k6";
import exec from "k6/execution";
import { Counter, Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:16732";
const USERS = JSON.parse(open(__ENV.USERS_FILE || "./users.json")).users;
const RUN_ID = __ENV.RUN_ID || `${Date.now().toString(36)}`;

// Generate once with node scripts/generate-load-fixtures.cjs before running k6.
const IMAGES = ['small', 'medium', 'large', 'huge'].map(name => new Uint8Array(open(`./fixtures/${name}.png`, 'b')));

const uploadOk = new Rate("upload_ok");
const uploadBytes = new Counter("upload_bytes");
const uploadRateLimited = new Counter("upload_429");
const uploadServerError = new Counter("upload_5xx");
const uploadDuplicateLink = new Counter("upload_duplicate_link");
const uploadDurationPerMiB = new Trend("upload_ms_per_mib");
const successfulUploadDuration = new Trend("successful_upload_duration", true);
const successfulUploads = new Counter('successful_uploads');

export const options = {
    scenarios: {
        paced: {
            executor: "constant-vus",
            vus: 10,
            duration: "60s",
            exec: "paced",
            tags: { phase: "paced" },
        },
        stress: {
            executor: "ramping-vus",
            startTime: "65s",
            startVUs: 10,
            stages: [
                { duration: "20s", target: 30 },
                { duration: "20s", target: 30 },
            ],
            gracefulRampDown: "10s",
            exec: "stress",
            tags: { phase: "stress" },
        },
    },
    thresholds: {
        "upload_ok{phase:paced}": ["rate>0.99"],
        "successful_upload_duration{phase:paced}": ["p(95)<2000"],
        upload_5xx: ["count==0"],
        "successful_uploads{phase:stress}": ["count>0"],
        "successful_upload_duration{phase:stress}": ["p(95)<10000"],
    },
    summaryTrendStats: ["avg", "min", "med", "p(90)", "p(95)", "p(99)", "max"],
};

if (__ENV.SCENARIO) {
    const only = options.scenarios[__ENV.SCENARIO];
    if (!only) throw new Error(`Unknown SCENARIO ${__ENV.SCENARIO}`);
    delete only.startTime;
    options.scenarios = { [__ENV.SCENARIO]: only };
    for (const name of Object.keys(options.thresholds)) {
        if (name.includes('{phase:') && !name.includes(`{phase:${__ENV.SCENARIO}}`)) delete options.thresholds[name];
    }
}

function buildFile() {
    const random = Math.random();
    const image = IMAGES[random < 0.3 ? 0 : random < 0.6 ? 1 : random < 0.95 ? 2 : 3];
    // A valid ancillary tEXt chunk makes uploads unique without corrupting image bytes.
    const text = `loadtest\0IMGLT|${RUN_ID}|${exec.vu.idInTest}|${exec.vu.iterationInInstance}|${Date.now()}|`;
    const chunk = new Uint8Array(text.length + 12);
    const view = new DataView(chunk.buffer);
    view.setUint32(0, text.length);
    chunk.set([116, 69, 88, 116], 4);
    for (let i = 0; i < text.length; i++) chunk[i + 8] = text.charCodeAt(i);
    let crc = 0xffffffff;
    for (let i = 4; i < chunk.length - 4; i++) {
        crc ^= chunk[i];
        for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    view.setUint32(chunk.length - 4, (crc ^ 0xffffffff) >>> 0);
    const output = new Uint8Array(image.length + chunk.length);
    output.set(image.subarray(0, 33));
    output.set(chunk, 33);
    output.set(image.subarray(33), 33 + chunk.length);
    return output;
}

const seenLinks = new Set();

function upload() {
    const user = USERS[exec.scenario.iterationInTest % USERS.length];
    const file = buildFile();
    const size = file.length;
    const mime = 'image/png';
    const ext = 'png';

    const res = http.post(
        `${BASE_URL}/api/private/uploads/new`,
        { file: http.file(file.buffer, `lt-${exec.vu.idInTest}-${exec.vu.iterationInInstance}.${ext}`, mime) },
        { headers: { Authorization: user.key }, tags: { name: "upload" }, timeout: "120s" },
    );

    let body = null;
    try { body = res.json(); } catch (_) { }
    const link = body && body.data && body.data.link;

    const ok = check(res, {
        "status 200": (r) => r.status === 200,
        "success true": () => !!(body && body.success),
        "link returned": () => typeof link === "string" && /^https:\/\/[^/]+\/[\w.~-]+$/.test(link),
    });

    check(res, { "200 or 429, never 5xx": (r) => r.status === 200 || r.status === 429 });
    uploadOk.add(ok);
    if (res.status === 429) uploadRateLimited.add(1);
    if (res.status >= 500) uploadServerError.add(1);

    if (res.timings.duration > 1000)
        console.warn(`SLOW ${res.timings.duration.toFixed(0)}ms status=${res.status} size=${size} sending=${res.timings.sending.toFixed(0)}ms waiting=${res.timings.waiting.toFixed(0)}ms`);

    if (ok) {
        successfulUploads.add(1);
        successfulUploadDuration.add(res.timings.duration);
        uploadBytes.add(size);
        uploadDurationPerMiB.add(res.timings.duration / (size / 1048576));
        if (seenLinks.has(link)) uploadDuplicateLink.add(1);
        seenLinks.add(link);
        console.log(`LINK ${link} ${size} ${mime}`);
    }
    return res;
}

export function paced() {
    const started = Date.now();
    upload();
    const left = 1250 - (Date.now() - started);
    if (left > 0) sleep(left / 1000);
}

export function stress() {
    const response = upload();
    // Don't benchmark an artificial retry storm against the rate limiter.
    if (response.status === 429) sleep(Math.max(1, Number(response.headers['Retry-After']) || 1));
}

export function handleSummary(data) {
    return {
        stdout: textSummary(data),
        "loadtest/upload-summary.json": JSON.stringify(data, null, 2),
    };
}

function textSummary(data) {
    const m = data.metrics;
    const v = (name, stat) => (m[name] && m[name].values[stat] !== undefined ? m[name].values[stat] : 0);
    const lines = [
        "",
        "==== upload test ====",
    ];
    for (const phase of ["paced", "stress"]) {
        const d = `successful_upload_duration{phase:${phase}}`;
        lines.push(
            `[${phase}] ok=${(v(`upload_ok{phase:${phase}}`, "rate") * 100).toFixed(2)}%` +
            `  p50=${v(d, "med").toFixed(0)}ms p95=${v(d, "p(95)").toFixed(0)}ms p99=${v(d, "p(99)").toFixed(0)}ms max=${v(d, "max").toFixed(0)}ms`,
        );
    }
    lines.push(
        `uploads ok: ${(v("upload_bytes", "count") / 1048576).toFixed(1)} MiB at ${(v("upload_bytes", "rate") / 1048576).toFixed(2)} MiB/s`,
        `requests: ${v("http_reqs", "count")} (${v("http_reqs", "rate").toFixed(2)}/s)`,
        `429s: ${v("upload_429", "count")}  5xx: ${v("upload_5xx", "count")}  duplicate links: ${v("upload_duplicate_link", "count")}`,
        `ms per MiB: med=${v("upload_ms_per_mib", "med").toFixed(0)} p95=${v("upload_ms_per_mib", "p(95)").toFixed(0)}`,
        "",
    );
    return lines.join("\n");
}
