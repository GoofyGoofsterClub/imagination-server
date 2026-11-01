import { APIRoute } from "http/routing";
import { USER_PERMISSIONS, hasPermission } from "utilities/permissions";
import hash from "utilities/hash";

const allowedFields = [
    "id",
    "username",
    "permissions",
    "private_profile",
    "banned",
    "views",
    "uploads",
    "superuser",
    "badges",
    "paint",
    "access_key"
];

const redactedFields = {
    "access_key": "<redacted>"
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
        let user = await server.db.findUserByAccessKey(hash(request.query.key));

        if (!user)
            return {
                "success": false,
                "error": "Invalid key."
            };

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


        let field = request.query.field;
        if (field === "key")
            field = "access_key";

        if (field && !allowedFields.includes(field))
            return {
                "success": false,
                "error": "You cannot get this field."
            };

        let target = await server.db.findUserByDisplayName(request.query.target);

        if (!target)
            return {
                "success": false,
                "error": "Invalid target."
            };

        if (field) {
            let value = target[field];
            if (value !== undefined
                && field in redactedFields
                && hasPermission(target.permissions, USER_PERMISSIONS.ADMINISTRATOR)
                && !hasPermission(user.permissions, USER_PERMISSIONS.GET_OTHERS_KEYS))
                value = redactedFields[field];

            return {
                "success": true,
                "data": value
            };
        }

        const { access_key, ...rest } = target;

        return {
            "success": true,
            "data": rest
        };
    }
}