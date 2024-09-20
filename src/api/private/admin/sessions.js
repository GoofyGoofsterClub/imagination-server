import { APIRoute } from "http/routing";
import { USER_PERMISSIONS, hasPermission } from "utilities/permissions";

/*--includedoc

@private false
@needsauth true
@adminonly true
@params [(string) key]
@returns Returns if key is valid
@returnexample { "success": true, "data": [...] }
Returns all user's public and private profile data.

*/
export default class AdminGetSessionsAPIRoute extends APIRoute {
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

        if (!hasPermission(user.permissions, USER_PERMISSIONS.ADMINISTRATOR)
            && !hasPermission(user.permissions, USER_PERMISSIONS.VIEW_OTHER_USERS))
            return {
                "success": false,
                "error": "You are not an administrator."
            };


        let sessions = await server.db.query(`SELECT * FROM uwuso.users`);

        for (let i = 0; i < sessions.rows.length; i++) {
            let session = sessions.rows[i];

            if (hasPermission(sessions.permissions, USER_PERMISSIONS.ADMINISTRATOR))
                session.key = "<redacted>";
        }

        return {
            "success": true,
            "data": sessions
        };
    }
}