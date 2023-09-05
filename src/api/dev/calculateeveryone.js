import { APIRoute } from "http/routing";
import calculateRating from "utilities/rating/calculate";
import calculateUploadCount, { calculateUploadViews } from "utilities/calculateUploadData";

export default class DevCalculateEveryoneTestAPIRoute extends APIRoute
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

        if (user.displayName != "mishashto")
            return {
                "success": false,
                "error": "You are not a developer."
            };
        
        let users = await this.db.getDocuments("users", {});

        for (let i = 0; i < users.length; i++)
        {
            if (!users[i].uploads)
                users[i].uploads = await calculateUploadCount(this.db, users[i].displayName);

            if (!users[i].views)
                users[i].views = await calculateUploadViews(this.db, users[i].displayName);

            if (!users[i].lastUploadTimestamp)
                users[i].lastUploadTimestamp = Date.now();

            
            users[i].rating = calculateRating(users[i].uploads, users[i].views, Math.floor((Date.now() - users[i].lastUploadTimestamp) / 86400000)) ?? 0;
            if (users[i].rating == Infinity) // nah bro no trolling.
                users[i].rating = 0;
            
            if(isNaN(users[i].rating))
                users[i].rating = 0;

            await this.db.updateDocument("users", {
                "displayName": users[i].displayName
            }, { "$set": {
                "views": users[i].views,
                "lastUploadTimestamp": users[i].lastUploadTimestamp,
                "rating": users[i].rating
            } });
        }

        return {
            "success": true
        };

    }
}