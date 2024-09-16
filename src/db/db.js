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
        const res = await pool.query(text, params);
        const duration = Date.now() - start;

        this.Output.Log(`Executed a query :: ${(duration / 1000).toFixed(2)}s :: ${res.rowCount} rows`);
    }
}