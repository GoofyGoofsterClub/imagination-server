import { APIRoute } from "http/routing";
import { USER_PERMISSIONS, hasPermission } from "utilities/permissions";

/*--includedoc

@private false
@needsauth false
@adminonly false
@params [(string) target]
@returns Publically available information about a user.
@returnexample { "success": true, "data": { "displayName": "test", "rating": 0, "uploads": 0, "invitedBy": null, "administrator": false, "views": 0, "badges": [], "paint": null, "isBanned": false }
Gets publically available information about a user.

*/
export default class PublicSessionGetAPIRoute extends APIRoute {
    constructor() {
        super("GET");
    }

    async call(request, reply, server) {
        if (!request.query.target)
            return {
                "success": false,
                "error": "No target specified"
            };

        let user = await server.db.findUserByDisplayName(request.query.target);

        if (!user)
            return {
                "success": false,
                "error": "User does not exist"
            };

        if (user.private_profile)
            return {
                "success": true,
                "data": {
                    "displayName": user.username,
                    "rating": 0,
                    "uploads": 0,
                    "invitedBy": null,
                    "administrator": false,
                    "views": 0,
                    "badges": user.badges ?? [],
                    "paint": user.paint ?? null,
                    "isBanned": user.banned ?? false
                }
            };

        return {
            "success": true,
            "data": {
                "displayName": user.username,
                "rating": 1, // -- TO-DO: Remove
                "uploads": user.uploads ?? 0,
                "invitedBy": null,
                "administrator": hasPermission(user.permissions, USER_PERMISSIONS.ADMINISTRATOR),
                "views": user.views ?? 0,
                "badges": user.badges ?? [],
                "paint": user.paint ?? null,
                "isBanned": user.banned ?? false
            }
        };
    }
}