import { Route } from "http/routing";

export default new Route("/", "GET", async (request, reply) => {
    reply.view("index.ejs", {
        "domain": request.headers['host']
    });
});