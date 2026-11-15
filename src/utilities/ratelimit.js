import { withDeadline } from "utilities/deadline";

const REDIS_RETRY_AFTER_MS = 5000;
const LOCAL_CLEANUP_THRESHOLD = 10000;

export default class RateLimiter {
    constructor(redis, prefix, limit, windowSeconds) {
        this.redis = redis;
        this.prefix = prefix;
        this.limit = limit;
        this.windowSeconds = windowSeconds;
        this.local = new Map();
        this.redisRetryAt = 0;
    }

    async hit(key) {
        if (this.redis && this.redis.isReady && Date.now() >= this.redisRetryAt) {
            try {
                const redisKey = `${this.prefix}:${key}`;
                const results = await withDeadline(() => this.redis.multi()
                    .set(redisKey, "0", { EX: this.windowSeconds, NX: true })
                    .incr(redisKey)
                    .ttl(redisKey)
                    .exec(), Number(process.env.REDIS_COMMAND_TIMEOUT_MS) || 500, "Redis rate limit");
                if (results === null || results.some(([error]) => error !== null))
                    throw new Error("Redis rate limit pipeline failed.");
                const count = results[1][1];
                const ttl = results[2][1];
                const retryAfter = ttl === -1 ? this.windowSeconds : Math.max(ttl, 1);
                return { allowed: count <= this.limit, count, retryAfter };
            }
            catch (error) {
                this.redisRetryAt = Date.now() + REDIS_RETRY_AFTER_MS;
                console.warn(`[wrn][ratelimit] Redis rate limiting unavailable, using the local fallback: ${error.message}`);
            }
        }

        const now = Date.now();
        let entry = this.local.get(key);
        if (!entry || entry.resetAt <= now) {
            entry = { count: 0, resetAt: now + this.windowSeconds * 1000 };
            this.local.set(key, entry);
        }
        entry.count++;

        if (this.local.size > LOCAL_CLEANUP_THRESHOLD)
            for (const [k, v] of this.local)
                if (v.resetAt <= now) this.local.delete(k);

        return { allowed: entry.count <= this.limit, count: entry.count, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
    }
}
