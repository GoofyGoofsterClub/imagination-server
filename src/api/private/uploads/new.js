import { APIRoute } from "http/routing";
import { GeneratePrivateID, EncodeUploadID } from "utilities/id";
import hash from "utilities/hash";
import { publicBaseUrl, publicProtocol } from "utilities/links";
import crypto from 'crypto';
import { promises as fs, createWriteStream } from 'fs';
import { Transform } from 'stream';
import { pipeline } from 'stream/promises';

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

        if (!request.headers["authorization"])
            return {
                "success": false,
                "error": "Invalid key."
            };

        let accessHash = hash(request.headers["authorization"]);
        let user = await server.db.findUserByAccessKey(accessHash);

        let isServiceUpload = false;
        let serviceAccountAttempt;

        if (!user) {
            serviceAccountAttempt = await server.db.query(`SELECT * FROM uwuso.services WHERE access_key = $1::text`, [accessHash]);

            if (!serviceAccountAttempt || serviceAccountAttempt.rows.length < 1)
                return {
                    "success": false,
                    "error": "Invalid key."
                };

            isServiceUpload = true;
            user = serviceAccountAttempt.rows[0];
        }

        if (!isServiceUpload && user.banned) return {
            "success": false,
            "error": "You are banned."
        };

        if (isServiceUpload && user.disabled) {
            return {
                "success": false,
                "error": "This service is disabled. Please enable it in the dashboard or contact administrator."
            }
        }

        if (isServiceUpload || !user.superuser) {
            const limit = await server.server._public.UploadRateLimiter.hit(isServiceUpload ? `service:${user.id}` : `user:${user.id}`);
            if (!limit.allowed) {
                reply.status(429);
                reply.header("Retry-After", limit.retryAfter);
                return reply.send({
                    "success": false,
                    "error": "You are uploading too fast."
                });
            }
        }

        const quota = Number(process.env.USER_STORAGE_QUOTA) || 0;
        let usedStorage = 0;
        if (quota > 0) {
            const usage = await server.db.query(`SELECT COALESCE(SUM(filesize), 0)::bigint AS used FROM uwuso.uploads WHERE uploader_id = $1::bigint`, [user.id]);
            usedStorage = Number(usage.rows[0].used);
            if (usedStorage >= quota) {
                reply.status(413);
                return reply.send({
                    "success": false,
                    "error": "Storage quota exceeded."
                });
            }
        }

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
                "error": "No file was provided"
            });
        }

        const diskFilename = GeneratePrivateID();
        const diskPath = `${__dirname}/../../../../privateuploads/${diskFilename}`;

        const fileHash = crypto.createHash('sha256');
        let fileSizeInBytes = 0;
        try {
            await pipeline(
                data.file,
                new Transform({
                    transform(chunk, encoding, callback) {
                        fileHash.update(chunk);
                        fileSizeInBytes += chunk.length;
                        callback(null, chunk);
                    }
                }),
                createWriteStream(diskPath)
            );
        }
        catch (e) {
            await fs.unlink(diskPath).catch(() => {});
            if (e.code === "FST_REQ_FILE_TOO_LARGE") {
                reply.status(413);
                return reply.send({
                    "success": false,
                    "error": "File is too large."
                });
            }
            throw e;
        }

        if (data.file.truncated) {
            await fs.unlink(diskPath).catch(() => {});
            reply.status(413);
            return reply.send({
                "success": false,
                "error": "File is too large."
            });
        }

        if (quota > 0 && usedStorage + fileSizeInBytes > quota) {
            await fs.unlink(diskPath).catch(() => {});
            reply.status(413);
            return reply.send({
                "success": false,
                "error": "Storage quota exceeded."
            });
        }

        const datahash = fileHash.digest('hex');
        let filename;
        let isNewUpload;

        try {
            const existing = await server.db.query(`SELECT filename FROM uwuso.uploads WHERE uploader_id = $1::bigint AND filehash = $2::text LIMIT 1`, [user.id, datahash]);

            if (existing.rows.length > 0) {
                filename = existing.rows[0].filename;
                isNewUpload = false;
            }
            else {
                const nextId = await server.db.query(`SELECT nextval(pg_get_serial_sequence('uwuso.uploads', 'id')) AS id`);
                const uploadId = nextId.rows[0].id;
                filename = EncodeUploadID(uploadId, server.db.fileIdKey);

                const inserted = await server.db.query(`INSERT INTO uwuso.uploads (id, uploader_id, filename, disk_filename,
                    mimetype, filehash, views, filesize, service_upload, upload_time, upload_domain)
                    OVERRIDING SYSTEM VALUE VALUES (
                    $11::bigint, $1::bigint, $2::text, $3::text,
                    $4::text, $5::text, $6::integer,
                    $7::bigint, $8::boolean,
                    $9::bigint, $10::text)
                    ON CONFLICT DO NOTHING
                    RETURNING filename`, [
                    user.id,
                    filename,
                    diskFilename,
                    data.mimetype,
                    datahash,
                    0,
                    fileSizeInBytes,
                    isServiceUpload,
                    Math.floor(+Date.now() / 1000),
                    request.headers['host'],
                    uploadId
                ]);

                isNewUpload = inserted.rows.length > 0;
                if (!isNewUpload) {
                    const winner = await server.db.query(`SELECT filename FROM uwuso.uploads WHERE uploader_id = $1::bigint AND filehash = $2::text LIMIT 1`, [user.id, datahash]);
                    filename = winner.rows[0].filename;
                }
            }
        }
        catch (e) {
            await fs.unlink(diskPath).catch(() => {});
            throw e;
        }

        if (!isNewUpload)
            await fs.unlink(diskPath).catch(() => {});

        if (isNewUpload) {
            let cache = server.server._public.StatisticsCache;
            if (cache && cache.value) {
                cache.value.uploads = Number(cache.value.uploads) + 1;
                cache.value.count = cache.value.uploads;
            }

            if (!isServiceUpload)
                await server.db.query(`UPDATE uwuso.users SET uploads = uploads + 1 WHERE id = $1::bigint`, [user.id]);
        }

        let shortenedUrl = null;

        const baseUrl = publicBaseUrl(request);

        if (request.query.custom_url)
            shortenedUrl = `${publicProtocol(request)}://${request.query.custom_url}/${filename}`;

        else if (process.env.SHORTENER_URI && request.query['shorten'] && !isServiceUpload)
        {
            let shortenerRequest = await fetch(`https://${process.env.SHORTENER_URI}/api/link/shorten?key=${request.headers['authorization']}&link=${encodeURIComponent(`${baseUrl}/${filename}`)}`);

            if (shortenerRequest.status == 200) {
                let shortenerRequestJSON = await shortenerRequest.json();
                shortenedUrl = shortenerRequestJSON.data.link;
            }
        }

        reply.send({
            "success": true,
            "data": {
                "link": shortenedUrl ?? (request.query['useLegacyStyling'] ? `${baseUrl}/${user.username ?? user.internal_key}/${filename}` : `${baseUrl}/${filename}`)
            }
        });

    }
}