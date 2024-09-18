import fastify from "fastify";
import fastifyMultipart from "fastify-multipart";
import fastifyCookie from "fastify-cookie";
import fastifyStatic from "fastify-static";
import eta from "eta";
import pointOfView from "point-of-view";
import { PresetOutput } from "utilities/output";
import { ExternalLogging, Field, buildMessage } from "utilities/logexternal";
import Authenticate from "utilities/authentication";

export default class HTTPServer {
    constructor(db, _db) {
        this.odb = db;
        this.db = _db;
        this.server = fastify({
            logger: (process.env.ENV && process.env.ENV == 'DEV')
        });
        this.server.odb = db;
        this.server.db = db;
        this.Output = new PresetOutput("http");
        this.externalLogging = new ExternalLogging(process.env.LOG_WEBHOOK);
        this.server.externalLogging = this.externalLogging;
        if (this.externalLogging.enabled)
            this.Output.Log("External logging enabled!");
        else
            this.Output.Log("External logging is not enabled, please set the LOG_WEBHOOK environment variable to enable it.");
        this.registerPlugins();
        this.registerErrorHandler();
        this.register404();
    }

    async register404() {
        this.server.setNotFoundHandler((request, reply) => {
            reply.view("404.ejs", {
                "domain": request.headers['host']
            });
        });
    }

    async registerErrorHandler() {
        this.server.setErrorHandler((error, request, reply) => {
            this.Output.Error("sys", "An error occured while processing a request:", error);
            let cookies = "";
            for (let cookie in request.cookies) {
                cookies += `\`${cookie}\` = \`${request.cookies[cookie]}\`\n`;
            }
            let url = request.url;
            if (url.includes("key")) {
                url = request.url.replace(/key=(\w+)+/, "key=<redacted>");
            }
            this.externalLogging.Log(buildMessage(
                request.headers['host'],
                "sys",
                "An error occured while processing a request:",
                `Error has been thrown:\n\`\`\`${error.stack}\`\`\``,
                null,
                new Field("Request URL", url, false),
                new Field("Request Method", request.method, false),
                new Field("Request Headers", request.headers ? (JSON.stringify(request.headers).length > 1024 ? "Too large to display" : JSON.stringify(request.headers)) : "No data", false),
                new Field("Request Body", request.body ? (JSON.stringify(request.body).length > 1024 ? "Too large to display" : JSON.stringify(request.body)) : "No data", false),
                new Field("Request Cookies", cookies ? (JSON.stringify(cookies).length > 1024 ? "Too large to display" : cookies.length > 0 ? cookies : "None") : "No data", false),
                new Field("Request IP", request.ip, false)
            ));

            // Set the status code to 400 so that external audit tools could automatically detect bot activity faster
            reply.status(400);

            reply.view("error.ejs", {
                "domain": request.headers['host'],
                "error_title": "An error occured while processing your request",
                "error_message": error
            });
        });
    }

    async registerPlugins() {
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

        this.server._public = {
            "Authenticate": Authenticate,
            "Output": this.Output,
            "ExternalLogging": this.externalLogging,
            "Ratelimits": [],
            "Maintenance": false
        };

        let isMaintenance = await this.odb.getDocument("globals", {
            "field": "maintenance"
        });

        if (isMaintenance && isMaintenance.value && isMaintenance.value.enabled) {
            this.server._public.Maintenance = isMaintenance;
        }
    }

    async registerRoute(path, method, handler) {
        this.server.route({
            method: method,
            url: path,
            handler: handler
        });
    }

    async start(port) {
        await this.server.listen({
            host: '0.0.0.0',
            port: port
        });
    }

    async stop() {
        await this.server.close();
    }
}