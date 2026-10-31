import { Route } from "http/routing";
import { publicHost } from "utilities/links";

export default class IndexRoute extends Route
{
    constructor()
    {
        super("/", "GET");
    }

    async call(request, reply)
    {
        return reply.viewAsync("index.ejs", {
            "domain": publicHost(request)
        });
    }
}