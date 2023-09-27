import { APIRoute } from "http/routing";

/*--includedoc

@private false
@needsauth true
@adminonly true
@params [(string) key, (string) code]
@returns Nothing
@returnexample { "success": true }
Removes the already existing invite code.

*/
export default class InvitesRemoveAPIRoute extends APIRoute
{
    constructor()
    {
        super("GET");
    }

    async call(request, reply)
    {
        if (!request.query.code)
            return {
                "success": false,
                "error": "Missing parameters."
            };
        
        let target = await this.db.getDocuments("invites", {
            "hash": request.query.code
        });

        if (!target)
            return {
                "success": false,
                "error": "Invalid target."
            };
        
        await this.db.deleteDocuments("invites", {
            "hash": request.query.code
        });

        return {
            "success": true
        };
    }
}