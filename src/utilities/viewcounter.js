import { PresetOutput } from 'utilities/output';

export default class ViewCounter {
    constructor(db, flushIntervalMs = 5000) {
        this.db = db;
        this.Output = new PresetOutput('views');
        this.uploads = new Map();
        this.flushing = null;
        this.timer = setInterval(() => this.flush(), flushIntervalMs);
        this.timer.unref();
    }

    add(uploadId, uploaderId) {
        const entry = this.uploads.get(uploadId) || { n: 0, uploaderId };
        entry.n++;
        this.uploads.set(uploadId, entry);
    }

    async flush() {
        if (this.flushing) return this.flushing;
        if (!this.uploads.size) return true;
        const batch = new Map([...this.uploads.entries()].slice(0, 1000));
        const users = new Map();
        for (const [id, entry] of batch) {
            this.uploads.delete(id);
            if (entry.uploaderId != null) users.set(entry.uploaderId, (users.get(entry.uploaderId) || 0) + entry.n);
        }
        this.flushing = (async () => {
            try {
                // Both counter sets commit together; retries cannot double-count a partial flush.
                await this.db.transaction(async client => {
                    await client.query(`UPDATE uwuso.uploads AS u SET views = u.views + v.n
                        FROM unnest($1::bigint[], $2::integer[]) AS v(id, n) WHERE u.id = v.id`,
                        [[...batch.keys()], [...batch.values()].map(entry => entry.n)]);
                    if (users.size) await client.query(`UPDATE uwuso.users AS u SET views = u.views + v.n
                        FROM unnest($1::bigint[], $2::bigint[]) AS v(id, n) WHERE u.id = v.id`,
                        [[...users.keys()], [...users.values()]]);
                });
                return true;
            } catch (error) {
                for (const [id, entry] of batch) {
                    const pending = this.uploads.get(id);
                    this.uploads.set(id, { ...entry, n: entry.n + (pending?.n || 0) });
                }
                this.Output.Warn(`Failed to flush view counts: ${error.message}`);
                return false;
            } finally { this.flushing = null; }
        })();
        return this.flushing;
    }

    async stop() {
        clearInterval(this.timer);
        if (this.flushing) await this.flushing;
        while (this.uploads.size) { if (!await this.flush()) break; }
    }
}
