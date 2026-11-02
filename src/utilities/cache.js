const registry = new Map();
export function getCacheMetrics() {
    return [...registry].map(([name, cache]) => ({ name, size: cache.entries.size, hits: cache.hits, misses: cache.misses }));
}

/** Bounded, process-local cache with coalesced loads and race-safe invalidation. */
export default class AsyncCache {
    constructor({ ttl = 60000, max = 1000, stale = false, name } = {}) {
        this.ttl = ttl;
        this.max = max;
        this.stale = stale;
        this.entries = new Map();
        this.hits = 0;
        this.misses = 0;
        if (name) registry.set(name, this);
    }

    get(key, load) {
        let entry = this.entries.get(key);
        const now = Date.now();
        if (entry && entry.expiresAt > now) {
            this.hits++;
            this.entries.delete(key);
            this.entries.set(key, entry);
            return Promise.resolve(entry.value);
        }
        if (entry?.pending) {
            this.hits++;
            return this.stale && entry.hasValue ? Promise.resolve(entry.value) : entry.pending;
        }
        this.misses++;
        if (!entry) {
            entry = { hasValue: false, expiresAt: 0 };
            this.entries.set(key, entry);
            while (this.entries.size > this.max) this.entries.delete(this.entries.keys().next().value);
        }
        const pending = Promise.resolve().then(load).then((value) => {
            if (this.entries.get(key) === entry) {
                entry.value = value;
                entry.hasValue = true;
                entry.expiresAt = Date.now() + this.ttl;
            }
            return value;
        }).finally(() => { entry.pending = null; });
        entry.pending = pending;
        if (this.stale && entry.hasValue) {
            pending.catch(() => {});
            return Promise.resolve(entry.value);
        }
        return pending;
    }

    delete(key) { this.entries.delete(key); }
    clear() { this.entries.clear(); }
}
