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
        this.registerPlugins();
    }

    async registerPlugins()
    {
        await this.server.register(fastifyMultipart);
        await this.server.register(fastifyCookie);
        await this.server.register(fastifyStatic, {
            root: `${__dirname}/../../public`,
            prefix: "/public/"
        });
        await this.server.register(pointOfView, {
            engine: {
                eta: eta
            },
            templates: `${__dirname}/../../private`
        });
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