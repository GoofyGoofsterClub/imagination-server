import http from "k6/http";
import { check, sleep } from "k6";
import exec from "k6/execution";
import { Counter, Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:16732";
const USERS = JSON.parse(open(__ENV.USERS_FILE || "./users.json")).users;
const RUN_ID = __ENV.RUN_ID || `${Date.now().toString(36)}`;

const MAX_SIZE = 8 * 1024 * 1024;

const pool = new Uint8Array(MAX_SIZE + 1024 * 1024);
for (let off = 0; off < pool.length; off += 65536)
    crypto.getRandomValues(pool.subarray(off, Math.min(off + 65536, pool.length)));

const MIMES = [
    ["image/png", "png"],
    ["image/jpeg", "jpg"],
    ["image/webp", "webp"],
    ["image/gif", "gif"],
];

const uploadOk = new Rate("upload_ok");
const uploadBytes = new Counter("upload_bytes");
const uploadRateLimited = new Counter("upload_429");
const uploadServerError = new Counter("upload_5xx");
const uploadDuplicateLink = new Counter("upload_duplicate_link");
const uploadDurationPerMiB = new Trend("upload_ms_per_mib");

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
        "http_req_duration{phase:paced}": ["p(95)<2000"],
        upload_5xx: ["count==0"],
        "upload_ok{phase:stress}": ["rate>=0"],
        "http_req_duration{phase:stress}": ["p(95)<10000"],
    },
    summaryTrendStats: ["avg", "min", "med", "p(90)", "p(95)", "p(99)", "max"],
};

if (__ENV.SCENARIO) {
    const only = options.scenarios[__ENV.SCENARIO];
    if (!only) throw new Error(`Unknown SCENARIO ${__ENV.SCENARIO}`);
    delete only.startTime;
    options.scenarios = { [__ENV.SCENARIO]: only };
}

function pickSize() {
    const r = Math.random();
    if (r < 0.6) return 50 * 1024 + Math.floor(Math.random() * 450 * 1024);
    if (r < 0.95) return 512 * 1024 + Math.floor(Math.random() * 2.5 * 1024 * 1024);
    return 5 * 1024 * 1024 + Math.floor(Math.random() * 3 * 1024 * 1024);
}

function buildFile(size) {
    const start = Math.floor(Math.random() * (pool.length - size));
    const buf = pool.slice(start, start + size);
    const header = `IMGLT|${RUN_ID}|${exec.vu.idInTest}|${exec.vu.iterationInInstance}|${size}|${Date.now()}|`;
    for (let i = 0; i < header.length; i++) buf[i] = header.charCodeAt(i);
    return buf;
}

const seenLinks = new Set();

function upload() {
    const user = USERS[exec.scenario.iterationInTest % USERS.length];
    const size = pickSize();
    const [mime, ext] = MIMES[Math.floor(Math.random() * MIMES.length)];
    const file = buildFile(size);

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
    upload();
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
        const d = `http_req_duration{phase:${phase}}`;
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
