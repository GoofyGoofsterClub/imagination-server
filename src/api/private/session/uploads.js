import { APIRoute } from "http/routing";
import hash from "utilities/hash";

/*--includedoc

@private false
@needsauth true
@adminonly false
@params [(string) key]
@returns Returns all user's uploads
@returnexample { "success": true, "data": [...] }
Returns all user's uploads

*/
export default class SessionUploadsAPIRoute extends APIRoute
{
    constructor()
    {
        super("GET");
    }

    async call(request, reply, server)
    {
        let doesExist = await server.db.checkDocumentExists("users", {
            "key": request.query.key
        });

        if (!doesExist)
            return {
                "success": false
            };
        
        let user = await server.db.getDocument("users", {
            "key": request.query.key
        });

        let uploaderHash = hash(user.displayName);

        let uploads = await server.db.getDocuments("uploads", {
            "uploader": uploaderHash
        });

        return {
            "success": true,
            "data": uploads
        };
    }
}