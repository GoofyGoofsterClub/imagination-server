import { APIRoute } from "http/routing";
import { v4 as uuidv4 } from "uuid";
import hash from "utilities/hash";

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

        let target = await this.db.getDocument("users", {
            "displayName": request.query.target
        });
        
        if (target)
            return {
                "success": false,
                "error": "Specified name is taken."
            };
        
        let inviteCode = uuidv4();
        let inviteHash = hash(inviteCode + request.query.target + ".e21");

        await this.db.insertDocument("invites", {
            "hash": inviteHash,
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