import { Route } from "http/routing";

export default class IndexRoute extends Route
{
    constructor()
    {
        super("/", "GET");
    }

    async call(request, reply)
    {
        reply.view("index.ejs", {
            "domain": request.headers['host']
        });
    }
}