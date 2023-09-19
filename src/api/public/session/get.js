import { APIRoute } from "http/routing";


export default class PublicSessionGetAPIRoute extends APIRoute
{
    constructor()
    {
        super("GET");
    }

    async call(request, reply)
    {
        if (!request.query.target)
            return {
                "success": false,
                "error": "No target specified"
            };
        
        let doesExist = await this.db.checkDocumentExists("users", {
            "displayName": request.query.target
        });

        if (!doesExist)
            return {
                "success": false,
                "error": "User does not exist"
            };
        
        let user = await this.db.getDocument("users", {
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