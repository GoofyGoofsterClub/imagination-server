import { APIRoute } from "http/routing";

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
        let doesExist = await server.odb.checkDocumentExists("users", {
            "key": request.query.key
        });

        if (!doesExist)
            return {
                "success": false,
                "error": "Invalid key."
            };

        let user = await server.odb.getDocument("users", {
            "key": request.query.key
        });

        if (!user.administrator)
            return {
                "success": false,
                "error": "You are not an administrator."
            };

        if (!request.query.code)
            return {
                "success": false,
                "error": "Missing parameters."
            };

        let target = await server.odb.getDocument("invites", {
            "hash": request.query.code
        });

        if (!target)
            return {
                "success": false,
                "error": "Invalid code."
            };

        return {
            "success": true,
            "data": target
        };


    }
}