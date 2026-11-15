import { monitorEventLoopDelay } from 'perf_hooks';
import { getCacheMetrics } from 'utilities/cache';

const requests = new Map();
const webVitals = new Map();
const buckets = [10, 50, 100, 250, 500, 1000, 5000, Infinity];
const VITAL_LIMITS = { CLS: [0.1, 0.25, 1, Infinity], INP: [200, 500, 1000, Infinity], LCP: [2500, 4000, 10000, Infinity] };
const eventLoop = monitorEventLoopDelay({ resolution: 20 });
eventLoop.enable();
const MAX_REQUEST_METRICS = 1000;
let warnedAboutRequestCap = false;

function formatBound(value) {
    return Number.isFinite(value) ? value : '+Inf';
}

function countBuckets(bounds, metric, value) {
    bounds.forEach((upper, index) => { if (value <= upper) metric.buckets[index]++; });
}

export function recordRequest(route, status, duration) {
    const key = `${route}:${Math.floor(status / 100)}xx`;
    let metric = requests.get(key);
    if (!metric) {
        if (requests.size >= MAX_REQUEST_METRICS) {
            if (!warnedAboutRequestCap) {
                warnedAboutRequestCap = true;
                console.warn(`[wrn][metrics] Request metrics cap of ${MAX_REQUEST_METRICS} routes reached; new routes are dropped.`);
            }
            return;
        }
        metric = { route, statusClass: Math.floor(status / 100), count: 0, totalMs: 0, maxMs: 0, buckets: buckets.map(() => 0) };
        requests.set(key, metric);
    }
    metric.count++;
    metric.totalMs += duration;
    metric.maxMs = Math.max(metric.maxMs, duration);
    countBuckets(buckets, metric, duration);
}

export function getMetrics(db) {
    return {
        uptimeSeconds: process.uptime(),
        memory: process.memoryUsage(),
        caches: getCacheMetrics(),
        eventLoopMs: { mean: eventLoop.mean / 1e6 || 0, p99: eventLoop.percentile(99) / 1e6, max: eventLoop.max / 1e6 },
        database: { total: db.pool.totalCount, idle: db.pool.idleCount, waiting: db.pool.waitingCount, ...db.metrics },
        bucketUpperBoundsMs: buckets.map(formatBound),
        requests: [...requests.values()],
        webVitals: [...webVitals.values()]
    };
}

export function recordWebVital(name, pageType, value) {
    const limits = VITAL_LIMITS[name];
    const key = `${name}:${pageType}`;
    const metric = webVitals.get(key) || { name, pageType, count: 0, total: 0, max: 0, limits: limits.map(formatBound), buckets: limits.map(() => 0) };
    metric.count++;
    metric.total += value;
    metric.max = Math.max(metric.max, value);
    countBuckets(limits, metric, value);
    webVitals.set(key, metric);
}
