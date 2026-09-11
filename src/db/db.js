import pg from "pg";
import { PresetOutput } from "utilities/output";
const { Pool } = pg;

export default class NewDatabaseController {
    constructor() {
        this.Output = new PresetOutput("db");
        this.pool = new Pool();

        this.Output.Log("Database initialized.");
    }

    async ensureIndexes() {
        try {
            await this.pool.query("CREATE INDEX IF NOT EXISTS idx_uploads_filename ON uwuso.uploads (filename)");
            await this.pool.query("CREATE INDEX IF NOT EXISTS idx_uploads_filehash ON uwuso.uploads (filehash)");
            await this.pool.query("CREATE INDEX IF NOT EXISTS idx_uploads_uploader_time ON uwuso.uploads (uploader_id, upload_time DESC)");
            await this.pool.query("CREATE INDEX IF NOT EXISTS idx_users_access_key ON uwuso.users (access_key)");
            await this.pool.query("CREATE INDEX IF NOT EXISTS idx_users_username ON uwuso.users (username)");
            await this.pool.query("CREATE INDEX IF NOT EXISTS idx_invites_hash ON uwuso.invites (hash)");
            await this.pool.query("CREATE INDEX IF NOT EXISTS idx_services_access_key ON uwuso.services (access_key)");
        } catch (e) {
            this.Output.Warn(`Could not ensure indexes: ${e}`);
        }
    }

    async query(text, params) {
        const start = Date.now();
        const res = await this.pool.query(text, params);
        const duration = Date.now() - start;

        if (duration >= 100)
            this.Output.Log(`Executed a query :: ${(duration / 1000).toFixed(2)}s :: ${res.rowCount} rows`);
        return res;
    }

    async getAmountOfUsers() {
        let users = await this.query("SELECT COUNT(id) AS count FROM uwuso.users");
        return users.rows[0].count;
    }

    async doesUserExistByAccessKey(accesskey) {
        let users = await this.query("SELECT EXISTS(SELECT 1 FROM uwuso.users WHERE access_key = $1) AS present", [accesskey]);
        return users.rows[0].present;
    }

    async findUserByDisplayName(displayname) {
        let users = await this.query("SELECT * FROM uwuso.users WHERE username = $1 LIMIT 1", [displayname]);
        return users.rows[0];
    }

    async findUserByAccessKey(accesskey) {
        let users = await this.query("SELECT * FROM uwuso.users WHERE access_key = $1 LIMIT 1", [accesskey]);
        return users.rows[0];
    }

    async addEventListing(eventString, eventCaller)
    {
        eventType = (+Date.now()/1000).toFixed(0).toString();
        if(!eventString) eventString = "Unknown";
        if(!eventCaller) eventCaller = 1;

        await server.db.query(`INSERT INTO uwuso.events (event_type, event_string, event_caller)
            VALUES ($1::text, $2::text, $3::bigint)`,
        [
            eventType,
            eventString,
            eventCaller
        ]);

        return true;
    }
}