import { Route } from "http/routing";
import { createReadStream } from 'fs';

export default class FaviconRoute extends Route
{
    constructor()
    {
        super("/favicon.ico", "GET");
    }

    async call(request, reply)
    {
        reply.status(200).type('image/x-icon').send(createReadStream(`${__dirname}/../../public/img/favicon.ico`));
    }
}