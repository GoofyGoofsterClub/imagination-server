import { APIRoute } from "http/routing";
import { USER_PERMISSIONS, hasPermission } from "utilities/permissions";

/*--includedoc

@private false
@needsauth true
@adminonly true
@params [(string) key]
@returns All invites
@returnexample { "success": true, "data": [...] }
Returns all unused invites.

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

        if (!hasPermission(user.permissions, USER_PERMISSIONS.ADMINISTRATOR))
            return {
                "success": false,
                "error": "You are not an administrator."
            };

        let invites = await server.db.query(`SELECT * FROM uwuso.invites`);

        return {
            "success": true,
            "data": invites.rows
        };
    }
}