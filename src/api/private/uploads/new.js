import { APIRoute } from "http/routing";
import { GeneratePrivateID, GeneratePublicID } from "utilities/id";
import hash from "utilities/hash";
import addUpload from "utilities/addupload";
import { pipeline } from "stream/promises";
import { promisify } from "util";
import { Field, buildMessage } from "utilities/logexternal";
import fs from "fs";

export default class UploadsNewAPIRoute extends APIRoute
{
    constructor()
    {
        super("POST");
    }

    async call(request, reply)
    {
        let _auth = await this._public.Authenticate(this.db, request.headers["authorization"]);
        if (!_auth)
        {
            reply.status(401);
            return reply.send({
                "error": "Unauthorized"
            });
        
        }

        if (_auth.isBanned)
        {
            // if has ban duration and it passed then unban
            if (_auth.banDuration && _auth.banDuration < Date.now())
            {
                await this.db.updateDocument("users", {
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

        const data = await request.file();

        if (!data)
        {
            reply.status(400);
            return reply.send({
                "error": "No file was provided"
            });
        
        }

        let ids = {
            "private": GeneratePrivateID(),
            "public": GeneratePublicID(8, _auth.displayName.slice(0, 2)),
            "delete": GeneratePrivateID()
        };
        
        const pipelineAsync = promisify(pipeline);
        await pipelineAsync(
            data.file,
            fs.createWriteStream(`${__dirname}/../../../../privateuploads/${ids.private}`)
        );

        let stats = fs.statSync(`${__dirname}/../../../../privateuploads/${ids.private}`);
        let fileSizeInBytes = stats.size;

        let collection = await this.db.getCollection("uploads");
        await collection.insertOne({
            "uploader": hash(_auth.displayName),
            "actual_filename": ids.private,
            "original_filename": data.filename,
            "filename": ids.public,
            "file_ext": data.filename.split(".")[1],
            "mimetype": data.mimetype,
            "timestamp": Date.now(),
            "deletehash": null, // DEPRECATED: But still used for backwards compatibility
            "uploaded_thru": request.headers['host'],
            "size": fileSizeInBytes
        });

        if (this._public.Ratelimits.length > 100)
            this._public.Ratelimits.shift();
        this._public.Ratelimits.push({
            "userName": _auth.displayName,
            "timestamp": Date.now()
        });

        let uploadsInLast10Seconds = this._public.Ratelimits.filter(x => x.userName == _auth.displayName && x.timestamp > Date.now() - 10000);
        if (uploadsInLast10Seconds.length > 10)
        {
            await this.db.updateDocument("users", {
                "key": request.headers['authorization']
                }, { "$set": {
                    "isBanned": true,
                    "banDuration": Date.now() + 60000
                    } });
            reply.status(429);
            return reply.send({
                "error": "You are uploading too fast."
            });
        }

        await addUpload(this.db, _auth.displayName);

        if(_auth.isMonitored)
        {
            await this._public.ExternalLogging.Log(buildMessage(
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

        reply.send({
            "success": true,
            "data": {
                "link": `https://${request.headers['host']}/${_auth.displayName}/${ids.public}`
            }
        });

    }
}