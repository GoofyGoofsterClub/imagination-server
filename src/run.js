import Output from "utilities/output";
import HTTPServer from "http/server";
import HTTPRouting from "http/routing";
import DatabaseController from "db/db";

Output.Log("Preparing the server...");

(async () => {
    Output.Log("Connecting to the database...");
    const db = await new DatabaseController(
        process.env.MONGO_HOST,
        process.env.MONGO_PORT,
        'boobspics'
    ).connect();

    Output.Log("Connected to the database!");

    let amountOfUsers = await (await db.getCollection("users")).countDocuments();


    Output.Log("Registering routes...");
    const server = new HTTPServer(db);

    let isInitialSetup = !(await db.checkDocumentExists("globals", { "field": "_initialSetup" }));

    if (amountOfUsers < 1) {
        Output.Warn("sys", `No users found in the database. Please complete the initial user setup.`);
    }

    HTTPRouting.RegisterRoutes(server);

    server.server._public['initialSetup'] = isInitialSetup;

    server.start(process.env.HTTP_PORT).then(() => {
        Output.Log("Server started!");
    });
})().catch((error) => {
    Output.Error("sys", "An error occured while starting the server:", error);
});