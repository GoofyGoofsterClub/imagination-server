import { Route } from "http/routing";
import { createReadStream, existsSync } from 'fs';

export default class FaviconRoute extends Route
{
    constructor()
    {
        super("/favicon.ico", "GET");
    }

    async call(request, reply)
    {
        const faviconPath = `${__dirname}/../../public/img/favicon.ico`;
        if (!existsSync(faviconPath))
            return reply.status(404).send("Favicon not found");
        reply.type('image/x-icon').header('Cache-Control', 'public, max-age=86400').send(createReadStream(faviconPath));
    }
}