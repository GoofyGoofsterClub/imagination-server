import { APIRoute } from "http/routing";
import calculateRating from "utilities/rating/calculate";

/*--includedoc

@private false
@needsauth true
@adminonly false
@params [(string) key]
@returns Recalculates and returns the rating of a user.
@returnexample { "success": true, "rating": 0.58488221 }
Recalculates and returns the rating of a user.

*/
export default class CheckRatingSessionAPIRoute extends APIRoute {
    constructor() {
        super("GET");
    }

    async call(request, reply, server) {
        let doesExist = await server.odb.checkDocumentExists("users", {
            "key": request.query.key
        });

        if (!doesExist)
            return {
                "success": false,
                "error": "Invalid key."
            };

        let user = await server.odb.getDocument("users", {
            "key": request.query.key
        });

        if (!user.lastUploadTimestamp)
            user.lastUploadTimestamp = Date.now();


        user.rating = calculateRating(user.uploads, user.views, Math.floor((Date.now() - user.lastUploadTimestamp) / 86400000)) ?? 0;
        if (user.rating == Infinity) // nah bro no trolling.
            user.rating = 0;

        await server.odb.updateDocument("users", {
            "key": request.query.key
        }, {
            "$set": {
                "views": user.views,
                "lastUploadTimestamp": user.lastUploadTimestamp,
                "rating": user.rating
            }
        });

        return {
            "success": true,
            "rating": user.rating
        };
    }
}