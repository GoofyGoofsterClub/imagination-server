import { APIRoute } from "http/routing";
import { buildMessage } from "utilities/logexternal";
import hash from "utilities/hash";

/*--includedoc

@private false
@needsauth true
@adminonly false
@params [(string) key, (string) new_name]
@returns Returns true in success if request was processed.
@returnexample { "success": true }
Changes the display name of a user.
WARNING: All previous uploads will still use old name, due to hashing.

*/
export default class ChangeUsername extends APIRoute {
    constructor() {
        super("GET");
    }

    async call(request, reply, server) {
        if (!hash(request.query.key) || !request.query.new_name)
            return { "success": false, "error": "One or all of the required fields is missing." };

        let doesExist = await server.db.doesUserExistByAccessKey(hash(request.query.key));

        if (!doesExist)
            return {
                "success": false,
                "error": "Invalid key."
            };

        let user = await server.db.findUserByAccessKey(hash(request.query.key));

        if (user.banned) return {
            "success": false,
            "error": "You are banned."
        };

        if (!hasPermission(user.permissions, USER_PERMISSIONS.CHANGE_DISPLAY_NAME))
            return {
                "success": false,
                "error": "You cannot change your name."
            };

        if (request.query.new_name.length > 32 || !/^[a-zA-Z0-9_]+$/.test(request.query.new_name)) {
            return {
                "success": false,
                "error": "Invalid username."
            }
        }

        let isUsernameTaken = await server.odb.findUserByDisplayName("users", request.query.new_name);

        if (isUsernameTaken.rows.length > 0)
            return { "success": false, "error": "Display name is already taken." };

        await server.db.query(`UPDATE uwuso.users SET username = $1 WHERE id = $2`, [request.query.new_name, user.id]);

        // External logging for trolling prevention
        await server.server._public.ExternalLogging.Log(buildMessage(
            request.headers['host'],
            "info",
            "User changed their username.",
            `Username has been changed from \`${user.username}\` to \`${request.query.new_name}\``,
            `https://${request.headers['host']}`
        ));

        return {
            "success": true
        };
    }
}