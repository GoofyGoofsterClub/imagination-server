import { APIRoute } from "http/routing";
import { hasPermission, USER_PERMISSIONS } from "utilities/permissions";
import hash from "utilities/hash";

/*--includedoc

@private false
@needsauth true
@adminonly false
@params [(string) key]
@returns Returns publically available information about a user.
@returnexample { "success": true, "data": { "displayName": "username", "can_invite": true, "administrator": false, "isBanned": false } }
Gets publically available information about a user. (Internal use)

*/
export default class CheckSessionInfoAPIRoute extends APIRoute {
    constructor() {
        super("GET");
    }

    async call(request, reply, server) {
        let doesExist = await server.db.doesUserExistByAccessKey(hash(request.query.key));

        if (!doesExist)
            return {
                "success": false,
                "error": "Invalid key."
            };

        let user = await server.db.findUserByAccessKey(hash(request.query.key));

        if (user.banned)
            return { "success": false, "error": "You are banned." };

        return {
            "success": true,
            "data": {
                "displayName": user.username,
                "can_invite": hasPermission(user.permissions, USER_PERMISSIONS.INVITE_USERS) || hasPermission(user.permissions, USER_PERMISSIONS.ADMINISTRATOR),
                "administrator": hasPermission(user.permissions, USER_PERMISSIONS.ADMINISTRATOR),
                "isBanned": user.banned,
                "superuser": user.superuser
            }
        };
    }
}