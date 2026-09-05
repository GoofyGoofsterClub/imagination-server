import { Route } from "http/routing";

export default class EnableJSRoute extends Route
{
    constructor()
    {
        super("/docs", "GET");
    }

    async call(request, reply)
    {
        return reply.viewAsync("docs.ejs", {
            "domain": request.headers['host']
        });
    }
}