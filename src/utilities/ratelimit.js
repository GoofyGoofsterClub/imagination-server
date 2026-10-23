export default class RateLimiter {
    constructor(redis, prefix, limit, windowSeconds) {
        this.redis = redis;
        this.prefix = prefix;
        this.limit = limit;
        this.windowSeconds = windowSeconds;
        this.local = new Map();
    }

    async hit(key) {
        if (this.redis && this.redis.isReady) {
            try {
                const redisKey = `${this.prefix}:${key}`;
                const [, count, ttl] = await this.redis.multi()
                    .set(redisKey, "0", { EX: this.windowSeconds, NX: true })
                    .incr(redisKey)
                    .ttl(redisKey)
                    .exec();
                return { allowed: count <= this.limit, count, retryAfter: Math.max(ttl, 1) };
            }
            catch (e) { }
        }

        const now = Date.now();
        let entry = this.local.get(key);
        if (!entry || entry.resetAt <= now) {
            entry = { count: 0, resetAt: now + this.windowSeconds * 1000 };
            this.local.set(key, entry);
        }
        entry.count++;

        if (this.local.size > 10000)
            for (const [k, v] of this.local)
                if (v.resetAt <= now) this.local.delete(k);

        return { allowed: entry.count <= this.limit, count: entry.count, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
    }
}
