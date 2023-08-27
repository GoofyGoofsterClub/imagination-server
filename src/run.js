import Output from "utilities/output";
import HTTPServer from "http/server";

Output.Log("Preparing the server...");

(async () => {
    const server = new HTTPServer();

    server.start(process.env.HTTP_PORT).then(() => {
        Output.Log("Server started!");
    });
})().catch((error) => {
    Output.Error("sys", "An error occured while starting the server:", error);
});