import { APIRoute } from "http/routing";

export default class CheckSessionInfoAPIRoute extends APIRoute
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
                "success": false
            };
        
        let user = await this.db.getDocument("users", {
            "key": request.query.key
        });

        return {
            "success": true,
            "data": {
                "displayName": user.displayName,
                "can_invite": user.can_invite,
                "administrator": user.administrator,
                "isBanned": user.isBanned == undefined ? false : user.isBanned
            }
        };
    }
}