import { APIRoute } from "http/routing";

export default class AdminRemoveSessionAPIRoute extends APIRoute
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

        let target = await this.db.getDocument("users", {
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

        let zxv = await this.db.deleteDocument("users", {
            "key": target.key
        });

        return {
            "success": true
        };
    }
}