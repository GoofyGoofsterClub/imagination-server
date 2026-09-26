import { APIRoute } from "http/routing";
import { hasPermission, USER_PERMISSIONS } from "utilities/permissions";
import hash from "utilities/hash";

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
        const user = await server.db.findUserByAccessKey(hash(request.body?.key));
        if (!user || user.banned || !hasPermission(user.permissions, USER_PERMISSIONS.ADMINISTRATOR))
            return { "success": false, "error": "You are not an administrator." };

        await server.db.query(`DELETE FROM uwuso.service_announcements WHERE id = 1`);
        return { "success": true };
    }
}
