import pg from "pg";
import crypto from "crypto";
import { PresetOutput } from "utilities/output";
const { Pool } = pg;

export default class NewDatabaseController {
    constructor() {
        this.Output = new PresetOutput("db");
        this.pool = new Pool({
            max: Number(process.env.PGPOOL_MAX) || 20,
            connectionTimeoutMillis: Number(process.env.PG_CONNECT_TIMEOUT_MS) || 5000,
            statement_timeout: Number(process.env.PG_STATEMENT_TIMEOUT_MS) || 15000,
            idle_in_transaction_session_timeout: 15000,
            options: `-c imagination.storage_quota=${Math.max(0, Math.floor(Number(process.env.USER_STORAGE_QUOTA) || 0))}`,
            application_name: 'imagination-server'
        });
        this.metrics = { queries: 0, failures: 0, totalMs: 0, poolWaitMs: 0 };
        this.pool.on("error", (err) => this.Output.Warn(`Idle pool client error: ${err.message}`));

        this.Output.Log("Database initialized.");
    }

    async loadFileIdKey() {
        const result = await this.pool.query(`SELECT value FROM uwuso.settings WHERE key = 'file_id_key'`);
        if (!result.rows.length) throw new Error('Database initialization did not create the file-ID key.');
        this.fileIdKey = Buffer.from(result.rows[0].value, "hex");
    }

    async query(text, params) {
        const start = Date.now();
        let client;
        this.metrics.queries++;
        try {
            client = await this.pool.connect();
            const acquiredAt = Date.now();
            this.metrics.poolWaitMs += acquiredAt - start;
            const res = await client.query(text, params);
            const duration = Date.now() - start;
            if (duration >= 100) {
                // Fingerprint only: never emit SQL literals, tokens, or bind parameters.
                const fingerprint = crypto.createHash('sha256').update(text).digest('hex').slice(0, 12);
                this.Output.Log(`Slow query ${fingerprint}: total=${duration}ms pool=${acquiredAt - start}ms rows=${res.rowCount}`);
            }
            return res;
        } catch (error) {
            this.metrics.failures++;
            throw error;
        } finally {
            this.metrics.totalMs += Date.now() - start;
            client?.release();
        }
    }

    async getAmountOfUsers() {
        let users = await this.query("SELECT COUNT(id) AS count FROM uwuso.users");
        return users.rows[0].count;
    }

    async transaction(callback) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            try { await client.query('ROLLBACK'); } catch (_) { }
            throw error;
        } finally { client.release(); }
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
        let users = await this.query("SELECT id, username, permissions, banned, superuser FROM uwuso.users WHERE access_key = $1 LIMIT 1", [accesskey]);
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
