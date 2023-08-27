import fs from "fs";
import Output from "utilities/output";
import GetRoutesResursively from "utilities/recursive";

export default class HTTPRouting
{
    static async RegisterRoutes(server)
    {
        const routes = fs.readdirSync(`${__dirname}/../routes`);
        const api_routes = GetRoutesResursively(`${__dirname}/../api`);
        for(const route of api_routes)
        {
            let routeName = route.replace(`${__dirname}/../api`, "");
            routeName = routeName.replace(".js", "");
            routeName = routeName.replace(/\\/g, "/");
            routeName = `/api${routeName}`;

            const routeModule = await import(route);
            const routeInstance = new routeModule.default();
            await routeInstance.register(server, routeName);
            Output.Log("http", `Registered route :: ${routeName.cyan}`);
        }
        for(const route of routes)
        {
            const routeModule = await import(`${__dirname}/../routes/${route.split(".")[0]}`);
            const routeInstance = new routeModule.default();
            await routeInstance.register(server);
            Output.Log("http", `Registered route :: ${routeInstance.path.cyan}`);
        }

    }
}

export class Route
{
    constructor(path, method)
    {
        this.path = path;
        this.method = method;
        this.handler = this.call;
    }

    async call(request, reply) {}

    async register(server)
    {
        await server.registerRoute(this.path, this.method, this.handler);
    }
}

export class APIRoute
{
    constructor(method)
    {
        this.method = method;
        this.handler = this.call;
    }

    async call(request, reply) {}

    async register(server, path)
    {
        await server.registerRoute(path, this.method, this.handler);
    }
}