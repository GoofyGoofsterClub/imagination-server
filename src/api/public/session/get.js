import { APIRoute } from "http/routing";
import { USER_PERMISSIONS, hasPermission } from "utilities/permissions";

/*--includedoc

@private false
@needsauth false
@adminonly false
@params [(string) target]
@returns Publically available information about a user.
@returnexample { "success": true, "data": { "displayName": "test", "uploads": 0, "invitedBy": null, "administrator": false, "views": 0, "badges": [], "paint": null, "isBanned": false } }
Gets publically available information about a user.

*/
export default class PublicSessionGetAPIRoute extends APIRoute {
    constructor() {
        super("GET");
    }

    async call(request, reply, server) {
        const limit = await server.server._public.SessionGetRateLimiter.hit(request.ip);

        if (!limit.allowed) {
            reply.status(429);
            reply.header("Retry-After", limit.retryAfter);
            return {
                "success": false,
                "error": "Too many requests."
            };
        }

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

        const data = {
            // Reserved field: no writer exists yet, so it is always null.
            "invitedBy": null,
            "uploads": 0,
            "administrator": false,
            "views": 0,
            "badges": [],
            "paint": null,
            "isBanned": false
        };
        if (!user.private_profile) {
            data.uploads = user.uploads ?? 0;
            data.administrator = hasPermission(user.permissions, USER_PERMISSIONS.ADMINISTRATOR);
            data.views = user.views ?? 0;
            data.badges = user.badges ?? [];
            data.paint = user.paint ?? null;
            data.isBanned = user.banned ?? false;
        }

        return {
            "success": true,
            "data": {
                "displayName": user.username,
                ...data
            }
        };
    }
}