import { APIRoute } from "http/routing";
import hash from "utilities/hash";

/*--includedoc

@private false
@needsauth false
@adminonly false
@params [(string) key, (string) code]
@returns Nothing
@returnexample { "success": true }
Removes the already existing invite code. The code itself authorizes removal (used by the public invite page's decline button); a valid key may also be provided.

*/
export default class InvitesRemoveAPIRoute extends APIRoute {
    constructor() {
        super("GET");
    }

    async call(request, reply, server) {
        if (request.query.key) {
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
        }

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