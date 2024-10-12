import { APIRoute } from "http/routing";

/*--includedoc

@private false
@needsauth true
@adminonly true
@params [(string) key, (string) target]
@returns Nothing
@returnexample { "success": true }
Deletes a user.

*/
export default class AdminRemoveSessionAPIRoute extends APIRoute
{
    constructor()
    {
        super("GET");
    }

    async call(request, reply, server)
    {
        let doesExist = await server.db.checkDocumentExists("users", {
            "key": request.query.key
        });

        if (!doesExist)
            return {
                "success": false,
                "error": "Invalid key."
            };
        
        let user = await server.db.getDocument("users", {
            "key": request.query.key
        });

        if (!user.administrator)
            return {
                "success": false,
                "error": "You are not an administrator."
            };
        
        if (!request.query.target)
            return {
                "success": false,
                "error": "Missing parameters."
            };

        let target = await server.db.getDocument("users", {
            "displayName": request.query.target
        });

        if (!target)
            return {
                "success": false,
                "error": "Invalid target."
            };
        
        
        if (target.administrator)
        {
            if (user.displayName == target.displayName)
                return {
                    "success": false,
                    "error": "You cannot remove yourself."
                };

            return {
                "success": false,
                "error": "You cannot remove an administrator."
            };
        }

        let zxv = await server.db.deleteDocument("users", {
            "key": target.key
        });

        return {
            "success": true
        };
    }
}