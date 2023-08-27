import { Route } from "http/routing";

export default new Route("/", "GET", async (request, reply) => {
    reply.send("Hello, world!");
});