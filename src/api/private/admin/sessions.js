import { APIRoute } from "http/routing";

/*--includedoc

@private false
@needsauth true
@adminonly true
@params [(string) key]
@returns Returns if key is valid
@returnexample { "success": true, "data": [...] }
Returns all user's public and private profile data.

*/
export default class AdminGetSessionsAPIRoute extends APIRoute {
    constructor() {
        super("GET");
    }

    async call(request, reply, server) {
        let doesExist = await server.odb.checkDocumentExists("users", {
            "key": request.query.key
        });

        if (!doesExist)
            return {
                "success": false
            };

        let user = await server.odb.getDocument("users", {
            "key": request.query.key
        });

        if (!user.administrator)
            return {
                "success": false
            };


        let sessions = await server.odb.getDocuments("users", {});

        for (let i = 0; i < sessions.length; i++) {
            let session = sessions[i];

            if (session.administrator)
                session.key = "<redacted>";
        }

        return {
            "success": true,
            "data": sessions
        };
    }
}