import { Route } from "http/routing";

export default class EnableJSRoute extends Route
{
    constructor()
    {
        super("/docs", "GET");
    }

    async call(request, reply)
    {
        reply.view("docs.ejs", {
            "domain": request.headers['host']
        });
    }
}