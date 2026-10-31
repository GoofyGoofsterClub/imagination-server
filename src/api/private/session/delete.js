import { APIRoute } from "http/routing";
import { buildMessage } from "utilities/logexternal";
import fs from "fs";
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
        let user = await server.db.findUserByAccessKey(hash(request.query.key));

        if (!user)
            return {
                "success": false,
                "error": "Invalid key."
            };

        if (user.banned)
            return { "success": false, "error": "You are banned." };

        if (request.query.confirmation != user.username) return { "success": false, "error": "Confirmation username is missing or incorrect." };

        let uploads = await server.db.query(`SELECT disk_filename FROM uwuso.uploads WHERE uploader_id = $1::bigint`, [user.id]);
        await server.db.query(`DELETE FROM uwuso.users WHERE id = $1::bigint`, [user.id]);
        await Promise.all(uploads.rows.map((upload) => fs.promises.unlink(`${__dirname}/../../../../privateuploads/${upload.disk_filename}`).catch(() => { })));

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