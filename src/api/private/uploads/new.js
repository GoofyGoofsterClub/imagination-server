import { APIRoute } from "http/routing";
import { GeneratePrivateID, GeneratePublicID } from "utilities/id";
import hash, { hashBuffer } from "utilities/hash";
import addUpload from "utilities/addupload";
import { Field, buildMessage } from "utilities/logexternal";
import CheckRating from "utilities/rating/conditions";
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
export default class UploadsNewAPIRoute extends APIRoute
{
    constructor()
    {
        super("POST");
    }

    async call(request, reply, server)
    {
        // Needed for extension to work
        reply.header("Access-Control-Allow-Origin", "*");

        let isServiceUpload = false;

        let _auth = await server.server._public.Authenticate(server.db, request.headers["authorization"]);
        if (!_auth)
        {
            _auth = await server.db.getDocument("services", {
                "accessKey": request.headers['authorization']
            });
            if (!_auth)
            {
                reply.status(401);
                return reply.send({
                    "error": "Unauthorized"
                });
            }
            
            isServiceUpload = true;
        }

        if (!isServiceUpload)
        {
            let ratingResponse = await CheckRating(server.db, _auth.displayName);
            if (!ratingResponse)
            {   
                reply.status(403);
                return reply.send({
                    "error": "You are banned."
                });
            }
        }

        if (!isServiceUpload && _auth.isBanned)
        {
            // if has ban duration and it passed then unban
            if (_auth.banDuration && _auth.banDuration < Date.now())
            {
                await server.db.updateDocument("users", {
                    "key": request.headers['authorization']
                }, { "$set": {
                    "isBanned": false,
                    "banDuration": null
                } });
            }
            else
            {
                reply.status(403);
                return reply.send({
                    "error": "You are banned."
                });
            }
        }

        if (isServiceUpload && _auth.disabled)
        {
            return {
                "success": false,
                "error": "This service is disabled. Please enable it in the dashboard or contact administrator."
            }    
        }

        const data = await request.file();
        const dataBuffer = await data.toBuffer();
        const datahash = await hashBuffer(dataBuffer.slice(0, 1024 * 1024));

        if (!data)
        {
            reply.status(400);
            return reply.send({
                "error": "No file was provided"
            });
        
        }

        const existance = await server.db.getDocument("uploads", {
            "uploader": hash(_auth.displayName ?? _auth.internalKey),
            "hash": datahash
        });

        if (existance)
        {
            reply.send({
                "success": true,
                "data": {
                    "link": `https://${request.headers['host']}/${_auth.displayName ?? _auth.internalKey}/${existance.filename}`
                }
            });
            return;
        }

        let publicKeySlice = _auth.displayName ? hash(_auth.displayName.slice(0, 2)).slice(0, 2) + _auth.displayName.slice(0, 1) : hash(_auth.internalKey.slice(0, 2)).slice(0, 2) + _auth.internalKey.slice(0, 1);

        let ids = {
            "private": GeneratePrivateID(),
            "public": GeneratePublicID(8, publicKeySlice),
            "delete": GeneratePrivateID()
        };
        
        // write dataBuffer to private
        await fs.writeFile(`${__dirname}/../../../../privateuploads/${ids.private}`, dataBuffer);

        let stats = await fs.stat(`${__dirname}/../../../../privateuploads/${ids.private}`);

        let fileSizeInBytes = stats.size;

        let collection = await server.db.getCollection("uploads");
        await collection.insertOne({
            "uploader": hash(_auth.displayName ?? _auth.internalKey),
            "uploaderId": _auth._id,
            "actual_filename": ids.private,
            "original_filename": data.filename,
            "filename": ids.public,
            "file_ext": data.filename.split(".")[1],
            "mimetype": data.mimetype,
            "hash": datahash,
            "timestamp": Date.now(),
            "deletehash": null, // DEPRECATED: But still used for backwards compatibility
            "uploaded_thru": request.headers['host'],
            "size": fileSizeInBytes
        });

        if (server.server._public.Ratelimits.length > 100)
            server.server._public.Ratelimits.shift();
        server.server._public.Ratelimits.push({
            "userName": _auth.displayName ?? _auth.internalKey,
            "timestamp": Date.now()
        });

        if (!isServiceUpload) // TO-DO(mishashto): Add another ratelimit for services.
        {
            let uploadsInLast10Seconds = server.server._public.Ratelimits.filter(x => x.userName == _auth.displayName && x.timestamp > Date.now() - 10000);
            if (uploadsInLast10Seconds.length > 10 && !_auth.protected)
            {
                await server.db.updateDocument("users", {
                    "key": request.headers['authorization']
                    }, { "$set": {
                        "isBanned": true,
                        "banDuration": Date.now() + 60000,
                        "banFieldModificationBy": "uwu"
                        } });
                reply.status(429);
                return reply.send({
                    "error": "You are uploading too fast."
                });
            }
            await addUpload(server.db, _auth.displayName);
            if(_auth.isMonitored)
            {
                await server.server._public.ExternalLogging.Log(buildMessage(
                    request.headers['host'],
                    "info",
                    "A file has been uploaded.",
                    `A file has been uploaded by \`${_auth.displayName}\`:\n\`${data.filename}\``,
                    `https://${request.headers['host']}/${_auth.displayName}/${ids.public}`,
                    new Field("File ID", ids.public, false),
                    new Field("File Name", data.filename, true),
                    new Field("File Size", fileSizeInBytes, true),
                    new Field("File Extension", data.filename.split(".")[1], true),
                    new Field("File Mimetype", data.mimetype, true),
                    new Field("File Uploaded Through", request.headers['host'], true),
                    new Field("File Uploaded By", _auth.displayName, true)
                ));
            }
        }

        let shortenedUrl = null;


        if (process.env.SHORTENER_URI && request.query['shorten'] && !isServiceUpload)
        {
            let shortenerRequest = await fetch(`https://${process.env.SHORTENER_URI}/api/link/shorten?key=${request.headers['authorization']}&link=https://${request.headers['host']}/${ids.public}`);

            if (shortenerRequest.status == 200)
            {
                let shortenerRequestJSON = await shortenerRequest.json();
                shortenedUrl = shortenerRequestJSON.data.link;
            }
        }

        reply.send({
            "success": true,
            "data": {
                "link": shortenedUrl ?? (request.query['useLegacyStyling'] ? `https://${request.headers['host']}/${_auth.displayName ?? _auth.internalKey}/${ids.public}` : `https://${request.headers['host']}/${ids.public}`)
            }
        });

    }
}