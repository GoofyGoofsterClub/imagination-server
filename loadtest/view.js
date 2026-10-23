import http from "k6/http";
import { check } from "k6";
import exec from "k6/execution";
import { SharedArray } from "k6/data";
import { Rate, Counter } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:16732";

const LINKS = new SharedArray("links", () => {
    const out = [];
    for (const line of open(__ENV.LINKS_FILE || "./links.log").split("\n")) {
        const m = line.match(/LINK (https?:\/\/[^/\s]+\/(\S+)) (\d+) (\S+?)"?(\s|$)/);
        if (m) out.push({ link: m[1], id: m[2], size: Number(m[3]), mime: m[4] });
    }
    return out;
});

if (LINKS.length === 0) throw new Error("No links found, run upload.js with --console-output first");

const BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
};

const contentOk = new Rate("content_ok");
const viewerOk = new Rate("viewer_ok");
const notFound = new Counter("not_found");

export const options = {
    scenarios: {
        open_all: {
            executor: "shared-iterations",
            vus: 200,
            iterations: LINKS.length,
            maxDuration: "5m",
            exec: "openAll",
            tags: { phase: "open_all" },
        },
        hot_views: {
            executor: "constant-arrival-rate",
            startTime: "5s",
            rate: 200,
            timeUnit: "1s",
            duration: "45s",
            preAllocatedVUs: 50,
            maxVUs: 1000,
            exec: "hotViews",
            tags: { phase: "hot_views" },
        },
    },
    thresholds: {
        content_ok: ["rate>0.99"],
        viewer_ok: ["rate>0.99"],
        "http_req_duration{phase:open_all}": ["p(95)<2000"],
        "http_req_duration{phase:hot_views}": ["p(95)<500"],
        "http_req_failed{phase:hot_views}": ["rate<0.01"],
    },
    summaryTrendStats: ["avg", "min", "med", "p(90)", "p(95)", "p(99)", "max"],
};

function localUrl(link) {
    return link.replace(/^https?:\/\/[^/]+/, BASE_URL);
}

function verifyContent(res, item) {
    if (res.status === 404) notFound.add(1);
    const body = res.body ? new Uint8Array(res.body) : new Uint8Array(0);
    let header = "";
    for (let i = 0; i < Math.min(80, body.length); i++) header += String.fromCharCode(body[i]);
    const parts = header.split("|");
    return check(res, {
        "file 200": (r) => r.status === 200,
        "file size matches": () => body.length === item.size,
        "file header intact": () => parts[0] === "IMGLT" && Number(parts[4]) === item.size,
        "content-type matches": (r) => (r.headers["Content-Type"] || "").startsWith(item.mime),
    });
}

export function openAll() {
    const item = LINKS[exec.scenario.iterationInTest];
    const url = localUrl(item.link);

    const raw = http.get(url, { responseType: "binary", tags: { name: "link_raw" }, timeout: "60s" });
    contentOk.add(verifyContent(raw, item));

    const page = http.get(url, { headers: BROWSER_HEADERS, tags: { name: "link_viewer" } });
    viewerOk.add(check(page, {
        "viewer 200": (r) => r.status === 200,
        "viewer is html": (r) => (r.headers["Content-Type"] || "").includes("text/html"),
        "viewer references raw": (r) => typeof r.body === "string" && r.body.includes(`/raw/${item.id}`),
    }));

    const embedded = http.get(`${BASE_URL}/raw/${item.id}`, { responseType: "binary", tags: { name: "raw_endpoint" }, timeout: "60s" });
    contentOk.add(verifyContent(embedded, item));
}

const SMALL = [];
for (let i = 0; i < LINKS.length; i++) if (LINKS[i].size < 512 * 1024) SMALL.push(i);

export function hotViews() {
    const item = LINKS[SMALL[Math.floor(Math.random() * SMALL.length)]];
    const res = http.get(localUrl(item.link), {
        responseType: "none",
        tags: { name: "link_hot" },
    });
    check(res, { "hot 200": (r) => r.status === 200 });
}

export function handleSummary(data) {
    const m = data.metrics;
    const v = (name, stat) => (m[name] && m[name].values[stat] !== undefined ? m[name].values[stat] : 0);
    const lines = ["", "==== view test ====", `links: ${LINKS.length}`];
    for (const phase of ["open_all", "hot_views"]) {
        const d = `http_req_duration{phase:${phase}}`;
        lines.push(`[${phase}] p50=${v(d, "med").toFixed(0)}ms p95=${v(d, "p(95)").toFixed(0)}ms p99=${v(d, "p(99)").toFixed(0)}ms max=${v(d, "max").toFixed(0)}ms`);
    }
    lines.push(
        `content_ok=${(v("content_ok", "rate") * 100).toFixed(2)}% viewer_ok=${(v("viewer_ok", "rate") * 100).toFixed(2)}% 404s=${v("not_found", "count")}`,
        `hot_views failed=${(v("http_req_failed{phase:hot_views}", "rate") * 100).toFixed(2)}%  dropped_iterations=${v("dropped_iterations", "count")}`,
        `requests: ${v("http_reqs", "count")} (${v("http_reqs", "rate").toFixed(1)}/s)`,
        "",
    );
    return {
        stdout: lines.join("\n"),
        "loadtest/view-summary.json": JSON.stringify(data, null, 2),
    };
}
