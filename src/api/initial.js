import { APIRoute } from "http/routing";
import { v4 as uuidv4 } from "uuid";

/*--includedoc

@private false
@needsauth false
@adminonly false
@params []
@returns Key of an initial user
@returnexample { "key": "XXXX-XXXX-XXXX-XXXX" }
Sets up the initial configuration of the server, creating a new user and giving access to it.

*/
export default class InitialSetupAPIRoute extends APIRoute
{
    constructor()
    {
        super("POST");
    }

    async call(request, reply, server)
    {
        let isInitialSetup = !(await server.db.checkDocumentExists("globals", { "field": "_initialSetup" }));

        if (!isInitialSetup)
        {
            reply.status(403);
            return { "error": "Server is already setup." };
        }

        request.body = JSON.parse(request.body);

        let accessKey = "vX2~!" + uuidv4();

        await server.db.insertDocument("users", {
            displayName: request.body.rootUsername,
            key: accessKey,
            administrator: true,
            can_invite: true,
            protected: true,
            private: true,
            isBanned: false,
            invitedBy: null,
            uploads: 0,
            views: 0
        });

        server.server._public.initialSetup = false;
        await server.db.insertDocument("globals", { "field": "_initialSetup", "value": false });
        await server.db.insertDocument("globals", { "field": "webTitle", "value": request.body.webTitle });
        reply.send({"key": accessKey});
    }
}