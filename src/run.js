import Output from "utilities/output";
import HTTPServer from "http/server";
import HTTPRouting from "http/routing";
import DatabaseController from "db/db";
import CalculateRatingWorker from "utilities/rating/calculationworker";
// These imports are for when there is no users.
import { v4 as uuidv4 } from "uuid";
import hash from "utilities/hash";

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

    setTimeout(() => CalculateRatingWorker(db, Output), 10000);

    Output.Log("Registering routes...");
    const server = new HTTPServer(db);
    
    if (amountOfUsers < 1)
    {
        await db.insertDocument("invites", {
            "hash": hash("initialuser"),
            "displayName": "uwu",
            "isAdmin": true,
            "invitedBy": null
        });
        Output.Warn("sys", `No users found in the database. Please go to /invite/${hash('initialuser')} to create an account.`);
    }

    HTTPRouting.RegisterRoutes(server);

    server.start(process.env.HTTP_PORT).then(() => {
        Output.Log("Server started!");
    });
})().catch((error) => {
    Output.Error("sys", "An error occured while starting the server:", error);
});