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
    );
    Output.Log("Connected to the database!");

    Output.Log("Registering routes...");
    const server = new HTTPServer(db);
    HTTPRouting.RegisterRoutes(server);

    server.start(process.env.HTTP_PORT).then(() => {
        Output.Log("Server started!");
    });
})().catch((error) => {
    Output.Error("sys", "An error occured while starting the server:", error);
});