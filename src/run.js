import Output, { shutdownLogger } from "utilities/output";
import HTTPServer from "http/server";
import HTTPRouting from "http/routing";
import DatabaseController from "db/old";
import NewDatabaseController from "db/db";
import RedisController from "db/redis";
import ViewCounter from "utilities/viewcounter";

let viewCounter = null;

Output.Log("Preparing the server...");
const run = async () => {
    Output.Log("Connecting to the database...");

    let db;
    let ndb;
    let databaseConnectionSuccess = false;

    while (!databaseConnectionSuccess) {
        try {
            db = await new DatabaseController(
                process.env.MONGO_HOST,
                process.env.MONGO_PORT,
                'boobspics'
            ).connect();

            ndb = await new NewDatabaseController();
            await ndb.ensureIndexes();
            await ndb.loadFileIdKey();

            Output.Log("Connected to the database!");
            databaseConnectionSuccess = true;
        }
        catch (e) {
            Output.Error("sys", `An error occurred while connecting to database: ${e}`);
        }
    }

    let redis = null;
    if (process.env.REDISHOST) {
        const redisController = new RedisController(process.env.REDISHOST);
        const connecting = redisController.connect();
        connecting.catch((e) => Output.Warn("sys", `Could not connect to Redis: ${e}`));
        const timeout = new Promise((resolve) => setTimeout(resolve, 5000).unref());
        await Promise.race([connecting, timeout]).catch(() => {});
        redis = redisController.redis;
        if (!redis?.isReady)
            Output.Warn("sys", "Redis is not ready yet, rate limits use process memory until it is.");
    }

    viewCounter = new ViewCounter(ndb);

    Output.Log("Registering routes...");
    const server = new HTTPServer(db, ndb, redis, viewCounter);

    HTTPRouting.RegisterRoutes(server);

    let amountOfUsers = await ndb.getAmountOfUsers();
    await Output.Log(`${amountOfUsers} users exists in database.`);

    if (amountOfUsers < 1) {
        Output.Warn("No users found in database, expecting an initial setup");
        Output.Warn("Alternatively, migrate MongoDB database to PostgreSQL if you used it before.");
    }

    server.server._public['initialSetup'] = amountOfUsers < 1;

    server.start(process.env.HTTP_PORT).then(() => {
        Output.Log("Server started!");
    });
}

async function runWrapper() {
    try {
        await run();
    }
    catch (e) {
        Output.Error("sys", "An error occurred while starting the server:", e);
        Output.Log("Retrying...");
        await runWrapper();
    }
}

runWrapper().catch((error) => {
    Output.Error("sys", "An error occurred while starting the server:", error);
});

async function gracefulShutdown(signal) {
    Output.Log("sys", `Received ${signal}, shutting down...`);
    await viewCounter?.stop().catch(() => {});
    await shutdownLogger();
    process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));