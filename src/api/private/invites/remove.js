import { APIRoute } from "http/routing";
import { USER_PERMISSIONS, hasPermission } from "utilities/permissions";
import hash from "utilities/hash";

/*--includedoc

@private false
@needsauth true
@adminonly true
@params [(string) key, (string) code]
@returns Nothing
@returnexample { "success": true }
Removes the already existing invite code.

*/
export default class InvitesRemoveAPIRoute extends APIRoute {
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

        await server.db.query(`DELETE FROM uwuso.invites WHERE hash = $1::text`, [request.query.code])

        return {
            "success": true
        };
    }
}