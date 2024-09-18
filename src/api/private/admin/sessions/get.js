import { APIRoute } from "http/routing";
import CheckRating from "utilities/rating/conditions";

const restrictedFields = [
    // for future use
];

const administratorReplacements = {
    "key": "<redacted>"
}

/*--includedoc

@private false
@needsauth true
@adminonly true
@params [(string) key, (string) target, (string) field]
@returns Requested data
@returnexample { "success": true, "data": "" }
Returns specific field from a user's profile.

*/
export default class AdminGetSessionsFieldAPIRoute extends APIRoute {
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

        let ratingResponse = await CheckRating(server.odb, user.displayName);
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

        let target = await server.odb.getDocument("users", {
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