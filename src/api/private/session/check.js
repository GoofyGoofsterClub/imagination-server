import { APIRoute } from "http/routing";

/*--includedoc

@private false
@needsauth true
@adminonly false
@params [(string) key]
@returns Returns if key is valid
@returnexample { "success": true }
Check if a session key is valid.

*/
export default class CheckSessionAPIRoute extends APIRoute
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

        return {
            "success": doesExist
        };
    }
}