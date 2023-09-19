import { Route } from "http/routing";

export default class ProfileRoute extends Route
{
    constructor()
    {
        super("/profile/:username", "GET");
    }

    async call(request, reply)
    {
        reply.view("profile.ejs", {
            "username": request.params.username
        });
    }
}