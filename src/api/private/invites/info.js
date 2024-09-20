import { APIRoute } from "http/routing";
import { USER_PERMISSIONS, hasPermission } from "utilities/permissions";

/*--includedoc

@private false
@needsauth true
@adminonly true
@params [(string) key, (string) code]
@returns Information about the invite
@returnexample { "success": true, "data": [...] }
Returns the data about a valid invite code.

*/
export default class InvitesInfoAPIRoute extends APIRoute {
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

        if (!hasPermission(user.permissions, USER_PERMISSIONS.ADMINISTRATOR))
            return {
                "success": false,
                "error": "You are not an administrator."
            };

        if (!request.query.code)
            return {
                "success": false,
                "error": "Missing parameters."
            };

        let target = await server.db.query(`SELECT * FROM uwuso.invites WHERE hash = $1::text`, [request.query.code]);

        if (target.rows.length < 1)
            return {
                "success": false,
                "error": "Invalid code."
            };

        return {
            "success": true,
            "data": target.rows
        };


    }
}