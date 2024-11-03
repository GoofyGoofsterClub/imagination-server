import pg from "pg";
import { PresetOutput } from "utilities/output";
const { Pool } = pg;

export default class NewDatabaseController {
    constructor() {
        this.Output = new PresetOutput("db");
        this.pool = new Pool();

        this.Output.Log("Database initialized.");
    }

    async query(text, params) {
        const start = Date.now();
        const res = await this.pool.query(text, params);
        const duration = Date.now() - start;

        this.Output.Log(`Executed a query :: ${(duration / 1000).toFixed(2)}s :: ${res.rowCount} rows`);
        return res;
    }

    async getAmountOfUsers() {
        let users = await this.query("SELECT COUNT(id) AS count FROM uwuso.users");
        return users.rows[0].count;
    }

    async doesUserExistByAccessKey(accesskey) {
        let users = await this.query("SELECT COUNT(id) AS count FROM uwuso.users WHERE access_key = $1", [accesskey]);
        return users.rows[0].count > 0;
    }

    async findUserByDisplayName(displayname) {
        let users = await this.query("SELECT * FROM uwuso.users WHERE username = $1", [displayname]);
        return users.rows[0];
    }

    async findUserByAccessKey(accesskey) {
        let users = await this.query("SELECT * FROM uwuso.users WHERE access_key = $1", [accesskey]);
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