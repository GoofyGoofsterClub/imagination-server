import { APIRoute } from "http/routing";
import hash from "utilities/hash";

export default class SessionUploadsAPIRoute extends APIRoute
{
    constructor()
    {
        super("GET");
    }

    async call(request, reply)
    {
        let doesExist = await this.db.checkDocumentExists("users", {
            "key": request.query.key
        });

        if (!doesExist)
            return {
                "success": false
            };
        
        let user = await this.db.getDocument("users", {
            "key": request.query.key
        });

        let uploaderHash = hash(user.displayName);

        let uploads = await this.db.getDocuments("uploads", {
            "uploader": uploaderHash
        });

        return {
            "success": true,
            "data": uploads
        };
    }
}