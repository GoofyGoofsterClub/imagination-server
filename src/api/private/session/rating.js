import { APIRoute } from "http/routing";
import calculateRating from "utilities/rating/calculate";
import calculateUploadCount, { calculateUploadViews } from "utilities/calculateUploadData";

export default class CheckRatingSessionAPIRoute extends APIRoute
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
        
        if (!user.uploads)
            user.uploads = await calculateUploadCount(this.db, user.displayName);

        if (!user.views)
            user.views = await calculateUploadViews(this.db, user.displayName);

        if (!user.lastUploadTimestamp)
            user.lastUploadTimestamp = Date.now();

        
        user.rating = calculateRating(user.uploads, user.views, Math.floor((Date.now() - user.lastUploadTimestamp) / 86400000)) ?? 0;
        if (user.rating == Infinity) // nah bro no trolling.
            user.rating = 0;

        await this.db.updateDocument("users", {
            "key": request.query.key
        }, { "$set": {
            "views": user.views,
            "lastUploadTimestamp": user.lastUploadTimestamp,
            "rating": user.rating
        } });

        return {
            "success": true,
            "rating": user.rating
        };
    }
}