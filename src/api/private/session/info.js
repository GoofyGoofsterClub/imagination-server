import { APIRoute } from "http/routing";
import CheckRating from "utilities/rating/conditions";


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

        let ratingResponse = await CheckRating(this.db, user.displayName);

        // if is banned but duration has passed current time, unban
        if (user.isBanned && user.banDuration < Date.now() && user.banDuration != null)
        {
            await this.db.updateDocument("users", {
                "key": request.query.key
            }, {
                "$set": {
                    "isBanned": false,
                    "banDuration": null
                }
            });
            user.isBanned = false;
            user.banDuration = null;
        }


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