import { Route } from "http/routing";
import { publicHost } from "utilities/links";

export default class EnableJSRoute extends Route
{
    constructor()
    {
        super("/please/enable.js", "GET");
    }

    async call(request, reply)
    {
        return reply.viewAsync("enableth.ejs", {
            "domain": publicHost(request)
        });
    }
}