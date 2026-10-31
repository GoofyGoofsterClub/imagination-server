import { Route } from "http/routing";
import { publicHost } from "utilities/links";

export default class EnableJSRoute extends Route
{
    constructor()
    {
        super("/docs", "GET");
    }

    async call(request, reply)
    {
        return reply.viewAsync("docs.ejs", {
            "domain": publicHost(request)
        });
    }
}