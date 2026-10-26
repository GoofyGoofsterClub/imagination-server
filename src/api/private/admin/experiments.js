import { APIRoute } from "http/routing";
import { hasPermission, USER_PERMISSIONS } from "utilities/permissions";
import hash from "utilities/hash";
import { getRandomCustomUrlExperiment } from "utilities/experiments";

/*--includedoc

@private false
@needsauth true
@adminonly true
@params [(string) key]
@returns Current state of experiment options.
@returnexample { "success": true, "data": { "randomCustomUrl": { "enabled": true, "domains": ["uwu.so", "mirror.example"] } } }
Returns the current state of experiment options.

*/
export default class AdminExperimentsAPIRoute extends APIRoute {
    constructor() {
        super("GET");
    }

    async call(request, reply, server) {
        const user = await server.db.findUserByAccessKey(hash(request.query.key));
        if (!user || user.banned || !hasPermission(user.permissions, USER_PERMISSIONS.ADMINISTRATOR))
            return { "success": false, "error": "You are not an administrator." };

        return {
            "success": true,
            "data": {
                "randomCustomUrl": await getRandomCustomUrlExperiment(server.db)
            }
        };
    }
}
