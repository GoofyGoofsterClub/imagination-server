import { APIRoute } from "http/routing";
import CheckRating from "utilities/rating/conditions";

const restrictedFields = [
    // for future use
];

const administratorReplacements = {
    "key": "<redacted>"
}

export default class AdminGetSessionsFieldAPIRoute extends APIRoute
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

        let ratingResponse = await CheckRating(this.db, user.displayName);
        if (!ratingResponse)
            return {
                "success": false,
                "error": "You are banned."
            };


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


        if (request.query.field && restrictedFields.includes(request.query.field))
            return {
                "success": false,
                "error": "You cannot get this field."
            };

        let target = await this.db.getDocument("users", {
            "displayName": request.query.target
        });

        if (!target)
            return {
                "success": false,
                "error": "Invalid target."
            };

        
        if (request.query.field && target.administrator)
            target[request.query.field] = administratorReplacements[request.query.field];

        return {
            "success": true,
            "data": !request.query.field ? target : target[request.query.field]
        };
    }
}