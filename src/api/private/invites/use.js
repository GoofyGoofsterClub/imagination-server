import { APIRoute } from "http/routing";
import { v4 as uuidv4 } from "uuid";

export default class InvitesUseAPIRoute extends APIRoute
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
        
        let target = await this.db.getDocument("invites", {
            "hash": request.query.code
        });

        if (!target)
            return {
                "success": false,
                "error": "Invalid code."
            };
        
        if (target.validUntil < Date.now())
            return {
                "success": false,
                "error": "Code expired."
            };

        let targetUser = await this.db.getDocument("users", {
            "displayName": target.displayName
        });

        if (targetUser)
            return {
                "success": false,
                "error": "User already exists."
            };

        await this.db.deleteDocuments("invites", {
            "hash": request.query.code
        });

        let accessKey = "vX2~!" + uuidv4();

        await this.db.insertDocument("users", {
            "displayName": target.displayName,
            "key": accessKey,
            "administrator": false,
            "can_invite": false,
            "isBanned": false,
            "invitedBy": target.invitedBy,
            "uploads": 0,
            "views": 0,
            "lastUploadTimestamp": Date.now(),
            "rating": 0
        });

        return {
            "success": true,
            "data": {
                "displayName": target.displayName,
                "accessKey": accessKey
            }
        };
    }
}