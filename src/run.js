import Output from "utilities/output";
import HTTPServer from "http/server";
import HTTPRouting from "http/routing";
import DatabaseController from "db/old";
import NewDatabaseController from "db/db";

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

            Output.Log("Connected to the database!");
            databaseConnectionSuccess = true;
        }
        catch (e) {
            Output.Error("sys", `An error occurred while connecting to database: ${e}`);
        }
    }

    Output.Log("Registering routes...");
    const server = new HTTPServer(db, ndb);

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