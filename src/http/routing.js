import fs from "fs";
import Output from "utilities/output";
import GetRoutesResursively from "utilities/recursive";

export default class HTTPRouting
{
    static async RegisterRoutes(server)
    {
        const routes = fs.readdirSync(`${__dirname}/../routes`);
        const api_routes = GetRoutesResursively(`${__dirname}/../api`);
        for(const route of routes)
        {
            const routeModule = await import(`${__dirname}/../routes/${route.split(".")[0]}`);
            await routeModule.default.register(server);
            Output.Log("http", `Registered route :: ${route.split(".")[0].cyan}`);
        }

    }
}

export class Route
{
    constructor( path, method, handler)
    {
        this.path = path;
        this.method = method;
        this.handler = handler;
    }

    async register(server)
    {
        this.db = server.db;
        await server.registerRoute(this.path, this.method, this.handler);
    }
}

export class APIRoute
{
    constructor(method, handler)
    {
        this.method = method;
        this.handler = handler;
    }

    async register(server, path)
    {
        this.db = server.db;
        await server.registerRoute(path, this.method, this.handler);
    }
}