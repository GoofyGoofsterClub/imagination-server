import { APIRoute } from "http/routing";
import CheckRating from "utilities/rating/conditions";

/*--includedoc

@private false
@needsauth true
@adminonly false
@params [(string) key, (string) confirmation]
@returns Deletes key owner's account completely. Extremely dangerous API call.
@returnexample { "success": true }
Deletes key owner's account completely. Extremely dangerous API call.

*/
export default class DeleteSessionAPIRoute extends APIRoute
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

        if (user.isBanned)
            return { "success": false, "error": "You are banned." };

        if (request.query.confirmation != user.displayName) return { "success": false, "error": "Confirmation username is missing or incorrect." };

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

        await this.db.deleteDocument("users", { "key": request.query.key });

        return {
            "success": true
        };
    }
}