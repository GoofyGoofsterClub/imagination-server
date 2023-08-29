import { APIRoute } from "http/routing";
import { v4 as uuidv4 } from "uuid";
import hash from "utilities/hash";

export default class InvitesRemoveAPIRoute extends APIRoute
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

        if (!request.query.target)
            return {
                "success": false,
                "error": "Missing parameters."
            };
        
        let target = await this.db.getDocuments("invites", {
            "hash": request.query.target
        });

        if (!target)
            return {
                "success": false,
                "error": "Invalid target."
            };
        
        await this.db.deleteDocuments("invites", {
            "hash": request.query.target
        });

        return {
            "success": true
        };
    }
}