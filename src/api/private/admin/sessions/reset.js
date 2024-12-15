import { APIRoute } from "http/routing";
import { USER_PERMISSIONS, hasPermission } from "utilities/permissions";
import { v4 as uuidv4 } from "uuid";
import hash from "utilities/hash";


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


        let accessKey = "vX2~!" + uuidv4();

        let _target = await server.db.query(`UPDATE uwuso.users SET access_key = $2 WHERE username = $1`, [
            request.query.target,
            hash(accessKey)
        ]);

        return {
            "success": true,
            "value": accessKey
        };
    }
}
