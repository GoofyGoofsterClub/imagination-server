import { APIRoute } from "http/routing";
import hash from "utilities/hash";
import fs from "fs";

/*--includedoc

@private false
@needsauth true
@adminonly false
@params [(string) key, (string) filename]
@returns Nothing
@returnexample { "success": true }
A route to request a file deletion.

*/
export default class DeleteUploadAPIRoute extends APIRoute
{
    constructor()
    {
        super("GET");
    }

    async call(request, reply, server)
    {
        let _auth = await server.server._public.Authenticate(server.db, request.query.key);
        if (!_auth)
        {
            reply.status(401);
            return reply.send({
                "error": "Unauthorized"
            });
        
        }

        if (_auth.isBanned)
        {
            reply.status(403);
            return reply.send({
                "error": "You are banned."
            });
        }

        if (!request.query.filename)
            return {
                "success": false,
                "error": "No filename was provided."
            };
        
        if (request.query.filename == "*")
        {
            // delete all of theirs
            let collection = await server.db.getCollection("uploads");
            let uploads = await collection.find({
                "uploader": hash(_auth.displayName)
            }).toArray();

            await collection.deleteMany({
                "uploader": hash(_auth.displayName)
            });

            for (let upload of uploads)
            {
                fs.unlinkSync(`${__dirname}/../../../../privateuploads/${upload.actual_filename}`);
            }

            return {
                "success": true
            };
        }
        
        let doesExist = await server.db.checkDocumentExists("uploads", {
            "filename": request.query.filename
        });

        if (!doesExist)
            return {
                "success": false,
                "error": "File does not exist."
            };
        
        let upload = await server.db.getDocument("uploads", {
            "filename": request.query.filename
        });

        if (upload.uploader !== hash(_auth.displayName))
            return {
                "success": false,
                "error": "You do not own this file."
            };
        
        let collection = await server.db.getCollection("uploads");
        await collection.deleteOne({
            "filename": request.query.filename
        });

        fs.unlinkSync(`${__dirname}/../../../../privateuploads/${upload.actual_filename}`);

        return {
            "success": true
        };
        
    }
}