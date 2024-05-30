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
@returnexample { }
Upload a file to the server as an authenticated user.

*/
export default class UploadsNewAPIRoute extends APIRoute
{
    constructor()
    {
        super("POST");
    }

    async call(request, reply)
    {
        reply.status(403);
        return {};
    }
}