import { APIRoute } from "http/routing";

export default class InvitesRemoveAPIRoute extends APIRoute
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