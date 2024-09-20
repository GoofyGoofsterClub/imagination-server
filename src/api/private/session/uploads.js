import { APIRoute } from "http/routing";
import hash from "utilities/hash";

/*--includedoc

@private false
@needsauth true
@adminonly false
@params [(string) key]
@returns Returns all user's uploads
@returnexample { "success": true, "data": [...] }
Returns all user's uploads

*/
export default class SessionUploadsAPIRoute extends APIRoute {
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

        let uploads = await server.db.query(`SELECT * FROM uwuso.uploads WHERE uploader_id = $1::bigint`, [user.id]);

        return {
            "success": true,
            "data": uploads.rows
        };
    }
}