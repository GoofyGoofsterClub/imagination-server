import { APIRoute } from "http/routing";
import { USER_PERMISSIONS, hasPermission } from "utilities/permissions";
import { v4 as uuidv4 } from "uuid";
import hash from "utilities/hash";

const ACCESS_KEY_PREFIX = "vX2~!";


/*--includedoc

@private false
@needsauth true
@adminonly true
@params [(string) key, (string) target]
@returns A key
@returnexample { "success": true, "value": "" }
Resets user's access key

*/
export default class AdminModifySessionsAPIRoute extends APIRoute {
    constructor() {
        super("GET");
    }

    async call(request, reply, server) {
        try {
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

            if (target.superuser)
                return {
                    "success": false,
                    "error": "You cannot reset a superuser's key."
                };


            let accessKey = ACCESS_KEY_PREFIX + uuidv4();

            let result = await server.db.query(`UPDATE uwuso.users SET access_key = $2 WHERE username = $1`, [
                request.query.target,
                hash(accessKey)
            ]);

            if (result.rowCount === 0)
                return {
                    "success": false,
                    "error": "Failed to update the user's key."
                };

            return {
                "success": true,
                "value": accessKey
            };
        } catch (error) {
            reply.code(500);
            return { "success": false, "error": "Failed to reset the user's key." };
        }
    }
}
