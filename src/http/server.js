import fastify from "fastify";
import fastifyMultipart from "fastify-multipart";
import fastifyCookie from "fastify-cookie";
import fastifyStatic from "fastify-static";
import eta from "eta";
import pointOfView from "point-of-view";
import { PresetOutput } from "utilities/output";

export default class HTTPServer
{
    constructor()
    {
        this.server = fastify();
        this.Output = new PresetOutput("http");
    }

    async registerPlugins()
    {

    }

    async registerRoute(path, method, handler)
    {
        this.server.route({
            method: method,
            url: path,
            handler: handler
        });
    }

    async start(port)
    {
        await this.server.listen({
            host: '0.0.0.0',
            port: port
        });
    }

    async stop()
    {
        await this.server.close();
    }
}