import { APIRoute } from "http/routing";
import { GeneratePrivateID, GeneratePublicID } from "utilities/id";
import hash, { hashBuffer } from "utilities/hash";
import { promises as fs } from 'fs';

/*--includedoc

@private false
@needsauth true
@adminonly false
@params [(byte) file]
@returns New upload's link
@returnexample { "success": true, "data": { "link": "https://.../username/usIUSisdbQ" } }
Upload a file to the server as an authenticated user.

*/
export default class UploadsNewAPIRoute extends APIRoute {
    constructor() {
        super("POST");
    }

    async call(request, reply, server) {
        // Needed for extension to work
        reply.header("Access-Control-Allow-Origin", "*");

        let user;

        let isServiceUpload = false;
        let doesUserExist = await server.db.doesUserExistByAccessKey(hash(request.headers["authorization"]));

        if (!doesUserExist) {
            let serviceAccountAttempt = await server.db.query(`SELECT * FROM uwuso.services WHERE access_key = $1::text`, [hash(request.headers["authorization"])]);

            if (serviceAccountAttempt.rows.length < 1)
                return {
                    "success": false,
                    "error": "Invalid key."
                };

            isServiceUpload = true;
        }

        if (!isServiceUpload) {
            user = await server.db.findUserByAccessKey(hash(request.headers["authorization"]));

            if (user.banned) return {
                "success": false,
                "error": "You are banned."
            };
        }
        else {
            user = serviceAccountAttempt.rows[0];
        }
        if (!isServiceUpload && user.banned) {
            reply.status(403);
            return reply.send({
                "error": "You are banned."
            });
        }

        if (isServiceUpload && user.disabled) {
            return {
                "success": false,
                "error": "This service is disabled. Please enable it in the dashboard or contact administrator."
            }
        }

        const data = await request.file();
        const dataBuffer = await data.toBuffer();
        const datahash = await hashBuffer(dataBuffer.slice(0, 1024 * 1024));

        if (!data) {
            reply.status(400);
            return reply.send({
                "error": "No file was provided"
            });

        }

        const existance = await server.db.query(`SELECT * FROM uwuso.uploads WHERE filehash = $1::text`, [datahash]);

        if (existance.rows.length > 0) {
            reply.send({
                "success": true,
                "data": {
                    "link": `https://${request.headers['host']}/${user.username ?? user.internal_key}/${existance.rows[0].filename}`
                }
            });
            return;
        }

        let publicKeySlice = user.username ? hash(user.username.slice(0, 2)).slice(0, 2) + user.username.slice(0, 1) : hash(user.internal_key.slice(0, 2)).slice(0, 2) + user.internal_key.slice(0, 1);

        let ids = {
            "private": GeneratePrivateID(),
            "public": GeneratePublicID(8, publicKeySlice),
            "delete": GeneratePrivateID()
        };

        // write dataBuffer to private
        await fs.writeFile(`${__dirname}/../../../../privateuploads/${ids.private}`, dataBuffer);

        let stats = await fs.stat(`${__dirname}/../../../../privateuploads/${ids.private}`);

        let fileSizeInBytes = stats.size;

        await server.db.query(`INSERT INTO uwuso.uploads (uploader_id, filename, disk_filename,
            mimetype, filehash, views, filesize, service_upload) VALUES (
            $1::bigint, $2::text, $3::text,
            $4::text, $5::text, $6::integer, $7::bigint, $8::boolean)`, [
            user.id,
            ids.public,
            ids.private,
            data.mimetype,
            datahash,
            0,
            fileSizeInBytes,
            isServiceUpload
        ]);

        if (server.server._public.Ratelimits.length > 100)
            server.server._public.Ratelimits.shift();
        server.server._public.Ratelimits.push({
            "userName": user.username ?? user.internal_key,
            "timestamp": Date.now()
        });

        if (!isServiceUpload) // TO-DO(mishashto): Add another ratelimit for services.
        {
            let uploadsInLast10Seconds = server.server._public.Ratelimits.filter(x => x.userName == user.username && x.timestamp > Date.now() - 10000);
            if (uploadsInLast10Seconds.length > 10 && !_auth.protected) {
                await server.odb.updateDocument("users", {
                    "key": request.headers['authorization']
                }, {
                    "$set": {
                        "isBanned": true,
                        "banDuration": Date.now() + 60000,
                        "banFieldModificationBy": "uwu"
                    }
                });
                reply.status(429);
                return reply.send({
                    "error": "You are uploading too fast."
                });
            }

            await server.db.query(`UPDATE uwuso.users SET uploads = uploads + 1 WHERE id = $1::bigint`, [user.id]);

            // await addUpload(server.odb, user.username);
            // if (_auth.isMonitored) {
            //     await server.server._public.ExternalLogging.Log(buildMessage(
            //         request.headers['host'],
            //         "info",
            //         "A file has been uploaded.",
            //         `A file has been uploaded by \`${user.username}\`:\n\`${data.filename}\``,
            //         `https://${request.headers['host']}/${user.username}/${ids.public}`,
            //         new Field("File ID", ids.public, false),
            //         new Field("File Name", data.filename, true),
            //         new Field("File Size", fileSizeInBytes, true),
            //         new Field("File Extension", data.filename.split(".")[1], true),
            //         new Field("File Mimetype", data.mimetype, true),
            //         new Field("File Uploaded Through", request.headers['host'], true),
            //         new Field("File Uploaded By", user.username, true)
            //     ));
            // }
        }

        let shortenedUrl = null;

        if (process.env.SHORTENER_URI && request.query['shorten'] && !isServiceUpload) {
            let shortenerRequest = await fetch(`https://${process.env.SHORTENER_URI}/api/link/shorten?key=${request.headers['authorization']}&link=https://${request.headers['host']}/${ids.public}`);

            if (shortenerRequest.status == 200) {
                let shortenerRequestJSON = await shortenerRequest.json();
                shortenedUrl = shortenerRequestJSON.data.link;
            }
        }

        reply.send({
            "success": true,
            "data": {
                "link": shortenedUrl ?? (request.query['useLegacyStyling'] ? `https://${request.headers['host']}/${user.username ?? user.internal_key}/${ids.public}` : `https://${request.headers['host']}/${ids.public}`)
            }
        });

    }
}