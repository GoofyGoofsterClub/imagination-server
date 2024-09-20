import { APIRoute } from "http/routing";
import { USER_PERMISSIONS, hasPermission } from "utilities/permissions";

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
        let doesExist = await server.db.doesUserExistByAccessKey(request.query.key);


        if (!doesExist)
            return {
                "success": false,
                "error": "Invalid key."
            };

        let user = await server.db.findUserByAccessKey(request.query.key);

        if (user.banned) return {
            "success": false,
            "error": "You are banned."
        };

        if (!hasPermission(user.permissions, USER_PERMISSIONS.ADMINISTRATOR))
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

        let target = await server.db.findUserByDisplayName(request.query.target);

        if (target.rows.length < 1)
            return {
                "success": false,
                "error": "Invalid target."
            };

        target = target.rows[0];

        if (request.query.field && hasPermission(target.permissions, USER_PERMISSIONS.ADMINISTRATOR))
            target[request.query.field] = administratorReplacements[request.query.field];

        return {
            "success": true,
            "data": !request.query.field ? target : target[request.query.field]
        };
    }
}