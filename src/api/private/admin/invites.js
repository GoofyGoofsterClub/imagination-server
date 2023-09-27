import { APIRoute } from "http/routing";

/*--includedoc

@private false
@needsauth true
@adminonly true
@params [(string) key]
@returns All invites
@returnexample { "success": true, "data": [...] }
Returns all unused invites.

*/
export default class AdminGetSessionsAPIRoute extends APIRoute
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

        if (!doesExist)
            return {
                "success": false,
                "error": "Invalid key."
            };
        
        let user = await this.db.getDocument("users", {
            "key": request.query.key
        });

        if (!user.administrator)
            return {
                "success": false,
                "error": "You are not an administrator."
            };

        let invites = await this.db.getDocuments("invites", {});

        return {
            "success": true,
            "data": invites
        };
    }
}