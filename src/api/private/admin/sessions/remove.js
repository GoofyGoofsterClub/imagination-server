import { APIRoute } from "http/routing";
import { USER_PERMISSIONS, hasPermission } from "utilities/permissions";
import fs from "fs";
import hash from "utilities/hash";

/*--includedoc

@private false
@needsauth true
@adminonly true
@params [(string) key, (string) target]
@returns Nothing
@returnexample { "success": true }
Deletes a user.

*/
export default class AdminRemoveSessionAPIRoute extends APIRoute {
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

        let target = await server.db.findUserByDisplayName(request.query.target);

        if (!target)
            return {
                "success": false,
                "error": "Invalid target."
            };

        if (hasPermission(target.permissions, USER_PERMISSIONS.ADMINISTRATOR) || hasPermission(target.permissions, USER_PERMISSIONS.DELETE_ACCOUNTS)) {
            if (user.username == target.username)
                return {
                    "success": false,
                    "error": "You cannot remove yourself."
                };

            return {
                "success": false,
                "error": "You cannot remove an administrator or a person with similar permissions."
            };
        }

        let uploads = await server.db.query(`SELECT disk_filename FROM uwuso.uploads WHERE uploader_id = $1::bigint`, [target.id]);
        await server.db.query(`DELETE FROM uwuso.users WHERE id = $1::bigint`, [target.id]);
        await Promise.all(uploads.rows.map((upload) => fs.promises.unlink(`${__dirname}/../../../../../privateuploads/${upload.disk_filename}`).catch(() => { })));

        return {
            "success": true
        };
    }
}