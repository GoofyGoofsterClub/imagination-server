import { APIRoute } from "http/routing";
import { hasPermission, USER_PERMISSIONS } from "utilities/permissions";
import hash from "utilities/hash";
import { clearAnnouncementCache, ACTIVE_ANNOUNCEMENT_ID } from "utilities/announcement";

/*--includedoc

@private false
@needsauth true
@adminonly true
@params [(string) key]
@returns Nothing.
@returnexample { "success": true }
Clears the active service announcement.

*/
export default class AdminAnnouncementClearAPIRoute extends APIRoute {
    constructor() {
        super("POST");
    }

    async call(request, reply, server) {
        try {
            const key = typeof request.body?.key === "string" ? request.body.key : null;
            const user = await server.db.findUserByAccessKey(hash(key));
            if (!user || user.banned || !hasPermission(user.permissions, USER_PERMISSIONS.ADMINISTRATOR))
                return { "success": false, "error": "You are not an administrator." };

            await server.db.query(`DELETE FROM uwuso.service_announcements WHERE id = ${ACTIVE_ANNOUNCEMENT_ID}`);
            clearAnnouncementCache();
            return { "success": true };
        } catch (error) {
            reply.code(500);
            return { "success": false, "error": "Failed to clear the announcement. Please try again." };
        }
    }
}
