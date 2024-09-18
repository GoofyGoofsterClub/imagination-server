import { APIRoute } from "http/routing";
import { v4 as uuidv4 } from "uuid";
import hash from "utilities/hash";

/*--includedoc

@private false
@needsauth false
@adminonly false
@params []
@returns Key of an initial user
@returnexample { "key": "XXXX-XXXX-XXXX-XXXX" }
Sets up the initial configuration of the server, creating a new user and giving access to it.

*/
export default class InitialSetupAPIRoute extends APIRoute {
    constructor() {
        super("POST");
    }

    async call(request, reply, server) {
        let isInitialSetup = (await server.ndb.getAmountOfUsers()) < 1;

        if (!isInitialSetup) {
            reply.status(403);
            return { "error": "Server is already setup." };
        }

        request.body = JSON.parse(request.body);

        let accessKey = "vX2~!" + uuidv4();

        await server.ndb.query(`INSERT INTO uwuso.users (username, access_key, permissions, private_profile, banned, views, uploads)
            VALUES ($1::text, $2::text, $3::bigint,
                    $4::boolean, $5::boolean, $6::bigint, $7::bigint)`,
            [
                request.body.rootUsername,
                hash(accessKey),
                0x0,
                true,
                false,
                0,
                0
            ]
        );

        server.server._public.initialSetup = false;
        reply.send({ "key": accessKey });
    }
}