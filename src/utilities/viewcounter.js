import { PresetOutput } from "utilities/output";

export default class ViewCounter {
    constructor(db, flushIntervalMs = 5000) {
        this.db = db;
        this.Output = new PresetOutput("views");
        this.uploads = new Map();
        this.users = new Map();
        this.flushing = null;
        this.timer = setInterval(() => this.flush(), flushIntervalMs);
        this.timer.unref();
    }

    add(uploadId, uploaderId) {
        this.uploads.set(uploadId, (this.uploads.get(uploadId) ?? 0) + 1);
        this.users.set(uploaderId, (this.users.get(uploaderId) ?? 0) + 1);
    }

    async flush() {
        if (this.flushing) return this.flushing;
        if (this.uploads.size < 1 && this.users.size < 1) return;

        const uploads = this.uploads;
        const users = this.users;
        this.uploads = new Map();
        this.users = new Map();

        this.flushing = (async () => {
            try {
                await this.db.query(`UPDATE uwuso.uploads AS u SET views = u.views + v.n
                    FROM unnest($1::bigint[], $2::integer[]) AS v(id, n) WHERE u.id = v.id`,
                    [[...uploads.keys()], [...uploads.values()]]);
                await this.db.query(`UPDATE uwuso.users AS u SET views = u.views + v.n
                    FROM unnest($1::bigint[], $2::bigint[]) AS v(id, n) WHERE u.id = v.id`,
                    [[...users.keys()], [...users.values()]]);
            }
            catch (e) {
                this.Output.Error(`Failed to flush view counts, retrying next interval: ${e}`);
                for (const [id, n] of uploads) this.uploads.set(id, (this.uploads.get(id) ?? 0) + n);
                for (const [id, n] of users) this.users.set(id, (this.users.get(id) ?? 0) + n);
            }
            finally {
                this.flushing = null;
            }
        })();
        return this.flushing;
    }

    async stop() {
        clearInterval(this.timer);
        if (this.flushing) await this.flushing;
        await this.flush();
    }
}
