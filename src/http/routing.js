import fs from "fs";

export default class HTTPRouting
{
    static async RegisterRoutes(server)
    {
        const routes = fs.readdirSync("../routes");
        for(const route of routes)
        {
            const routeModule = await import(`routes/${route.split(".")[0]}`);
            await routeModule.default.register(server);
        }

    }
}

export class Route
{
    constructor(path, method, handler)
    {
        this.path = path;
        this.method = method;
        this.handler = handler;
    }

    async register(server)
    {
        await server.registerRoute(this.path, this.method, this.handler);
    }
}