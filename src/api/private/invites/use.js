import { APIRoute } from "http/routing";
import { v4 as uuidv4 } from "uuid";

/*--includedoc

@private false
@needsauth false
@adminonly false
@params [(string) code]
@returns Returns a private user data
@returnexample { "success": true, "data": { "displayName": "test", "accessKey": "vX2~!00000000-2f6b-4f8b-8d5b-9b8f6b7c4d0a" }
Consumes an invite code and creates a new user with it, returning the access key.

*/
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
            "administrator": target.is_administrator ?? false,
            "can_invite": target.can_invite ?? false,
            "protected": target.protected ?? false,
            "private": target.private ?? false,
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