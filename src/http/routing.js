import fs from "fs";
import Output from "utilities/output";


export default class HTTPRouting
{
    static async RegisterRoutes(server)
    {
        const routes = fs.readdirSync(`${__dirname}/../routes`);
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