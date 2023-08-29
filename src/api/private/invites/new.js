import { APIRoute } from "http/routing";
import { v4 as uuidv4 } from "uuid";
import hash from "utilities/hash";

export default class InvitesNewAPIRoute extends APIRoute
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

        if (!user.administrator && !user.can_invite)
            return {
                "success": false,
                "error": "You are not an administrator or you cannot invite users."
            };

        if (!request.query.target)
            return {
                "success": false,
                "error": "Missing parameters."
            };

        if (request.query.target.length > 32 || !/^[a-zA-Z0-9_]+$/.test(request.query.target))
            return {
                "success": false,
                "error": "Invalid username."
            };

        let target = await this.db.getDocument("users", {
            "displayName": request.query.target
        });
        
        if (target)
            return {
                "success": false,
                "error": "Specified name is taken."
            };
        
        let inviteCode = hash(uuidv4());

        await this.db.insertDocument("invites", {
            "hash": inviteCode,
            "displayName": request.query.target,
            "invitedBy": user.displayName
        });

        return {
            "success": true,
            "data": {
                "inviteCode": inviteCode,
                "displayName": request.query.target
            }
        };
    }
}