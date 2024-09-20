import { APIRoute } from "http/routing";

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
        if (!request.query.code)
            return {
                "success": false,
                "error": "Missing parameters."
            };

        let target = await server.db.query(`SELECT * FROM uwuso.invites WHERE hash = $1::text`, [request.query.code]);

        if (target.rows.length < 0)
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