import { APIRoute } from "http/routing";

/*--includedoc

@private false
@needsauth true
@adminonly false
@params [(string) key, (string) new_name]
@returns Returns true in success if request was processed.
@returnexample { "success": true }
Changes the display name of a user.
WARNING: All previous uploads will still use old name, due to hashing.

*/
export default class ChangeUsername extends APIRoute
{
    constructor()
    {
        super("GET");
    }

    async call(request, reply)
    {
        if (!request.query.key || !request.query.new_name)
        {
            return {"success": false, "error": "One of the fields is missing."};
        }

        let doesExist = await this.db.checkDocumentExists("users", {
            "key": request.query.key
        });

        let isUsernameTaken = await this.db.checkDocumentExists("users", {
            "displayName": request.query.new_name
        });

        if (isUsernameTaken)
        {
            return {"success": false, "error": "Display name is already taken."};
        }

        await this.db.updateDocument("users", {
            "key": request.query.key
        }, {
            "$set": {
                "displayName": request.query.new_name 
            }
        });

        return {
            "success": true
        };
    }
}