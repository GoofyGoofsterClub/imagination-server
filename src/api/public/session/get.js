import { APIRoute } from "http/routing";

/*--includedoc

@private false
@needsauth false
@adminonly false
@params [(string) target]
@returns Publically available information about a user.
@returnexample { "success": true, "data": { "displayName": "test", "rating": 0, "uploads": 0, "invitedBy": null, "administrator": false, "views": 0, "badges": [], "paint": null, "isBanned": false }
Gets publically available information about a user.

*/
export default class PublicSessionGetAPIRoute extends APIRoute
{
    constructor()
    {
        super("GET");
    }

    async call(request, reply, server)
    {
        if (!request.query.target)
            return {
                "success": false,
                "error": "No target specified"
            };
        
        let doesExist = await server.db.checkDocumentExists("users", {
            "displayName": request.query.target
        });

        if (!doesExist)
            return {
                "success": false,
                "error": "User does not exist"
            };
        
        let user = await server.db.getDocument("users", {
            "displayName": request.query.target
        });

        if (user.private)
            return {
                "success": true,
                "data": {
                    "displayName": user.displayName,
                    "rating": 0,
                    "uploads": 0,
                    "invitedBy": null,
                    "administrator": false,
                    "views": 0,
                    "badges": user.badges ?? [],
                    "paint": user.paint ?? null,
                    "isBanned": user.isBanned ?? false
                }
            };

        return {
            "success": true,
            "data": {
                "displayName": user.displayName,
                "rating": user.rating ?? 0,
                "uploads": user.uploads ?? 0,
                "invitedBy": user.invitedBy ?? (user.invited_by ?? null),
                "administrator": user.administrator,
                "views": user.views ?? 0,
                "badges": user.badges ?? [],
                "paint": user.paint ?? null,
                "isBanned": user.isBanned ?? false
            }
        };
    }
}