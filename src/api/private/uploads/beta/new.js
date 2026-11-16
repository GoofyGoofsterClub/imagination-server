import { APIRoute } from "http/routing";
import { GeneratePrivateID, GeneratePublicID } from "utilities/id";
import hash, { hashBuffer } from "utilities/hash";
import addUpload from "utilities/addupload";
import { Field, buildMessage } from "utilities/logexternal";

import { promises as fs } from 'fs';

/*--includedoc

@private false
@needsauth true
@adminonly false
@params [(byte) file]
@returns New upload's link
@returnexample { }
Upload a file to the server as an authenticated user.

*/
export default class UploadsNewAPIRoute extends APIRoute
{
    constructor()
    {
        super("POST");
    }

    async call(request, reply, server)
    {
        let user = await server.db.findUserByAccessKey(hash(request.query.key));

        if (!user)
            return {
                "success": false,
                "error": "Invalid key."
            };

        if (user.banned) return {
            "success": false,
            "error": "You are banned."
        };

        let data;
        try {
            data = await request.file();
        }
        catch (e) {
            data = null;
        }

        if (!data) {
            reply.status(400);
            return reply.send({
                "success": false,
                "error": "No file was provided."
            });
        }

        const diskFilename = GeneratePrivateID();
        const filename = GeneratePublicID();
        const diskPath = `${__dirname}/../../../../privateuploads/${diskFilename}`;

        let buffer = Buffer.alloc(0);
        for await (const chunk of data.file)
            buffer = Buffer.concat([buffer, chunk]);

        if (data.file.truncated) {
            reply.status(413);
            return reply.send({
                "success": false,
                "error": "File is too large."
            });
        }

        await fs.writeFile(diskPath, buffer);

        const datahash = hashBuffer(buffer);

        await addUpload(server.db, user.username);

        // External logging
        server.externalLogging.Log(buildMessage(
            request.headers["host"],
            "info",
            "A new upload has been received.",
            `A file has been uploaded by \`${user.username}\` with the hash \`${datahash}\``,
            null,
            new Field("Filename", filename, true),
            new Field("Uploader", user.username, true)
        ));

        const protocol = request.headers["x-forwarded-proto"] || process.env.PUBLIC_PROTOCOL || "https";
        reply.send({
            "success": true,
            "data": {
                "link": `${protocol}://${request.headers["host"]}/${filename}`
            }
        });
    }
}