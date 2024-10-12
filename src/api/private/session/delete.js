import { APIRoute } from "http/routing";
import hash from "utilities/hash";

/*--includedoc

@private false
@needsauth true
@adminonly false
@params [(string) key, (string) confirmation]
@returns Deletes key owner's account completely. Extremely dangerous API call.
@returnexample { "success": true }
Deletes key owner's account completely. Extremely dangerous API call.

*/
export default class DeleteSessionAPIRoute extends APIRoute {
    constructor() {
        super("GET");
    }

    async call(request, reply, server) {
        let doesExist = await server.db.doesUserExistByAccessKey(hash(request.query.key));

        if (!doesExist)
            return {
                "success": false,
                "error": "Invalid key."
            };

        let user = await server.db.findUserByAccessKey(hash(request.query.key));

        if (user.banned)
            return { "success": false, "error": "You are banned." };

        if (request.query.confirmation != user.username) return { "success": false, "error": "Confirmation username is missing or incorrect." };

        await server.db.query(`DELETE FROM uwuso.users WHERE id = $1::text`, [user.id]);

        // External logging for trolling prevention
        await server.server._public.ExternalLogging.Log(buildMessage(
            request.headers['host'],
            "info",
            "User changed deleted their profile.",
            ` \`${user.username}\` has deleted their account forever. Goodbye.`,
            `https://${request.headers['host']}`
        ));

        return {
            "success": true
        };
    }
}