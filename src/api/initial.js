import { APIRoute } from "http/routing";
import { v4 as uuidv4 } from "uuid";
import { ALL_PERMISSIONS } from "utilities/permissions";
import hash from "utilities/hash";

/*--includedoc

@private false
@needsauth false
@adminonly false
@params []
@returns Key of an initial user
@returnexample { "key": "XXXX-XXXX-XXXX-XXXX" }
Creates the initial root user and gives it full access.

*/
export default class InitialSetupAPIRoute extends APIRoute {
    constructor() {
        super("POST");
    }

    async call(request, reply, server) {
        if (typeof request.body === "string")
            request.body = JSON.parse(request.body);

        let accessKey = "vX2~!" + uuidv4();

        let client = await server.db.pool.connect();
        try {
            await client.query("BEGIN");
            // Serialize concurrent initial setups so only one root user can be created
            await client.query("SELECT pg_advisory_xact_lock(735389102)");

            let isInitialSetup = (await client.query("SELECT COUNT(*)::int AS count FROM uwuso.users")).rows[0].count < 1;

            if (!isInitialSetup) {
                await client.query("ROLLBACK");
                reply.status(403);
                return { "error": "Server is already setup." };
            }

            await client.query(`INSERT INTO uwuso.users (username, access_key, permissions, private_profile, banned, views, uploads, superuser)
                VALUES ($1::text, $2::text, $3::bigint,
                        $4::boolean, $5::boolean, $6::bigint, $7::bigint, $8::boolean)`,
                [
                    request.body.rootUsername,
                    hash(accessKey),
                    ALL_PERMISSIONS,
                    true,
                    false,
                    0,
                    0,
                    true
                ]);

            await client.query("COMMIT");
        }
        catch (e) {
            await client.query("ROLLBACK").catch(() => { });
            throw e;
        }
        finally {
            client.release();
        }

        server.server._public.initialSetup = false;
        reply.send({ "key": accessKey });
    }
}