import Output from "utilities/output";
import HTTPServer from "http/server";
import HTTPRouting from "http/routing";
import DatabaseController from "db/old";
import NewDatabaseController from "db/db";

Output.Log("Preparing the server...");

(async () => {
    Output.Log("Connecting to the database...");
        const db = await new DatabaseController(
            process.env.MONGO_HOST,
            process.env.MONGO_PORT,
            'boobspics'
        ).connect();
    
        const ndb = await new NewDatabaseController();
    
        Output.Log("Connected to the database!");

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
})().catch((error) => {
    Output.Error("sys", "An error occured while starting the server:", error);
});