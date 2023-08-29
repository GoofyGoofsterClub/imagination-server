import { Route } from "http/routing";

export default class EnableJSRoute extends Route
{
    constructor()
    {
        super("/please/enable/js", "GET");
    }

    async call(request, reply)
    {
        reply.view("enable.ejs", {
            "domain": request.headers['host']
        });
    }
}