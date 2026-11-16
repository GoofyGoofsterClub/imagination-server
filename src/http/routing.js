import fs from "fs";
import Output from "utilities/output";
import GetRoutesRecursively from "utilities/recursive";

export default class HTTPRouting {
    static async RegisterRoutes(server) {
        const routes = fs.readdirSync(`${__dirname}/../routes`);
        const api_routes = GetRoutesRecursively(`${__dirname}/../api`);
        for (const route of api_routes) {
            let routeName = route.replace(`${__dirname}/../api`, "");
            routeName = routeName.replace(".js", "");
            routeName = routeName.replace(/\\/g, "/");
            routeName = `/api${routeName}`;

            const routeModule = await import(route);
            const routeInstance = new routeModule.default();
            await routeInstance.register(server, routeName);
            Output.Log("http", `Registered API route :: ${routeName.cyan}`);
        }
        for (const route of routes) {
            const routeModule = await import(`${__dirname}/../routes/${route.split(".")[0]}`);
            const routeInstance = new routeModule.default();
            await routeInstance.register(server);
            Output.Log("http", `Registered route :: ${routeInstance.path.cyan}`);
        }

    }
}

class BaseRoute {
    constructor() {
        this.handler = this.call;
    }

    async register(server, path = this.path) {
        await server.registerRoute(path, this.method, async (request, reply) => {
            return await this.callWrapper(request, reply, server, this.handler);
        });
    }
}

export class Route extends BaseRoute {
    constructor(path, method) {
        super();
        this.path = path;
        this.method = method;
    }

    async call(request, reply) { }

    async callWrapper(request, reply, server, handler) {
        reply.header("X-Frame-Options", "SAMEORIGIN");
        reply.header("Content-Security-Policy", "frame-ancestors 'self'");
        if (server.server?._public?.initialSetup) {
            return reply.viewAsync('initial-setup.ejs');
        }
        const maintenance = server.server?._public?.Maintenance;
        if (maintenance && maintenance.value) {
            const mode = Number(maintenance.value.mode) || 0;
            const isDashboard = request.url === "/" || request.url.startsWith("/?");
            if (mode === 2 || isDashboard) {
                reply.status(503);
                return reply.viewAsync('maintenance.ejs', { reason: maintenance.value.message });
            }
        }
        return await handler(request, reply, server);
    }

}

export class APIRoute extends BaseRoute {
    constructor(method, excludeFromMaintenance) {
        super();
        this.method = method;
        this.excludeFromMaintenance = excludeFromMaintenance ?? false;
    }

    async call(request, reply) { }

    async callWrapper(request, reply, server, handler) {
        const maintenance = server.server?._public?.Maintenance;
        if (maintenance && maintenance.value && (Number(maintenance.value.mode) || 0) >= 1 && !this.excludeFromMaintenance) {
            reply.status(503);
            return reply.send({ success: false, error: `503 - Maintenance: ${maintenance.value.message}` });
        }
        return await handler(request, reply, server);
    }
}
