import { APIRoute } from "http/routing";

export default class CheckSessionAPIRoute extends APIRoute
{
    constructor()
    {
        super("GET");
    }

    async call(request, reply)
    {
        let doesExist = await this.db.checkDocumentExists("users", {
            "key": request.query.key
        });

        return {
            "success": doesExist
        };
    }
}