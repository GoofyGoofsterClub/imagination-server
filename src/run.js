import fs from "fs";
import path from "path";
import Output, { shutdownLogger } from "utilities/output";
import HTTPServer from "http/server";
import HTTPRouting from "http/routing";
import DatabaseController from "db/old";
import NewDatabaseController from "db/db";
import RedisController from "db/redis";
import ViewCounter from "utilities/viewcounter";
import { getStatistics } from 'utilities/statistics';
import { stopPreviews } from 'utilities/previews';
import { startCacheBus, stopCacheBus } from 'utilities/cachebus';

let viewCounter = null;
let httpServer = null;
let postgres = null;
let legacyDatabase = null;
let redisConnection = null;
let statisticsTimer = null;

fs.mkdirSync(path.resolve(__dirname, "..", "privateuploads"), { recursive: true });

Output.Log("Preparing the server...");
const run = async () => {
    Output.Log("Connecting to the database...");

    let db;
    let ndb;
    let databaseConnectionSuccess = false;

    while (!databaseConnectionSuccess) {
        try {
            db = process.env.LEGACY_MONGO_ENABLED === 'true' ? await new DatabaseController(
                process.env.MONGO_HOST,
                process.env.MONGO_PORT,
                'boobspics'
            ).connect() : null;

            ndb = await new NewDatabaseController();
            await ndb.loadFileIdKey();
            await ndb.query(`SELECT version FROM uwuso.schema_migrations WHERE version = '002-online-indexes'`).then(result => {
                if (!result.rows.length) throw new Error('Run pnpm migrate before starting the server.');
            });

            Output.Log("Connected to the database!");
            databaseConnectionSuccess = true;
        }
        catch (e) {
            Output.Error("sys", `An error occurred while connecting to database: ${e}`);
            // Release the partially-established connections so retries do not
            // exhaust the databases' connection slots
            try { if (db && db.client) await db.client.close(); } catch (_) { }
            try { if (ndb) await ndb.pool.end(); } catch (_) { }
            db = null;
            ndb = null;
            if (e.code === '42P01' || /migration|required|pnpm migrate/i.test(e.message)) throw e;
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    }

    let redis = null;
    let redisHost = process.env.REDISHOST || process.env.REDIS_HOST;
    if (redisHost) {
        const redisController = new RedisController(redisHost);
        const connecting = redisController.connect();
        connecting.catch((e) => Output.Warn("sys", `Could not connect to Redis: ${e}`));
        const timeout = new Promise((resolve) => setTimeout(resolve, 5000).unref());
        await Promise.race([connecting, timeout]).catch(() => {});
        redis = redisController.redis;
        if (!redis?.isReady)
            Output.Warn("sys", "Redis is not ready yet, rate limits use process memory until it is.");
    }

    viewCounter = new ViewCounter(ndb);
    postgres = ndb;
    legacyDatabase = db;
    redisConnection = redis;
    startCacheBus(redis);

    Output.Log("Registering routes...");
    const server = new HTTPServer(db, ndb, redis, viewCounter);
    httpServer = server;

    await HTTPRouting.RegisterRoutes(server);
    await server.pluginsReady;

    let amountOfUsers = await ndb.getAmountOfUsers();
    await Output.Log(`${amountOfUsers} users exists in database.`);

    if (amountOfUsers < 1) {
        Output.Warn("No users found in database, expecting an initial setup");
        Output.Warn("Alternatively, migrate MongoDB database to PostgreSQL if you used it before.");
    }

    server.server._public['initialSetup'] = amountOfUsers < 1;

    await server.start(process.env.HTTP_PORT);
    Output.Log("Server started!");
    const refreshStatistics = () => getStatistics(ndb).catch(error => Output.Warn('statistics', error.message));
    refreshStatistics();
    statisticsTimer = setInterval(refreshStatistics, 60000);
    statisticsTimer.unref();
}

run().catch(async (error) => {
    Output.Error("sys", "An error occurred while starting the server:", error);
    await gracefulShutdown('startup failure', 1);
});

let shuttingDown = false;
async function gracefulShutdown(signal, exitCode = 0) {
    if (shuttingDown) return;
    shuttingDown = true;
    const deadline = setTimeout(() => process.exit(1), 15000);
    deadline.unref();
    Output.Log("sys", `Received ${signal}, shutting down...`);
    clearInterval(statisticsTimer);
    await httpServer?.stop().catch(() => {});
    await stopPreviews();
    await viewCounter?.stop().catch(() => {});
    await stopCacheBus();
    await redisConnection?.quit().catch(() => {});
    await legacyDatabase?.client.close().catch(() => {});
    await postgres?.pool.end().catch(() => {});
    await shutdownLogger();
    process.exit(exitCode);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
