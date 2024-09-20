import { APIRoute } from "http/routing";
import hash from "utilities/hash";

/*--includedoc

@private false
@needsauth true
@adminonly false
@params [(string) key]
@returns Returns if key is valid
@returnexample { "success": true }
Check if a session key is valid.

*/
export default class CheckSessionAPIRoute extends APIRoute {
    constructor() {
        super("GET");
    }

    async call(request, reply, server) {
        // TO-DO: Add maintenance check? Idk why it was here but ig needed??

        let doesExist = await server.db.doesUserExistByAccessKey(hash(request.query.key));

        return {
            "success": doesExist,
            "error": doesExist ? '' : 'Invalid key.'
        };
    }
}