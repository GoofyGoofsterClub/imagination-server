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
export default class CheckSessionAPIRoute extends APIRoute {
    constructor() {
        super("GET");
    }

    async call(request, reply, server) {
        let isMaintenance = await server.odb.getDocument("globals", {
            "field": "maintenance"
        });

        if (isMaintenance && isMaintenance.value && isMaintenance.value.enabled) {
            return { "success": false, "error": isMaintenance.value.message, "maintenance": true };
        }

        let doesExist = await server.odb.checkDocumentExists("users", {
            "key": request.query.key
        });

        return {
            "success": doesExist,
            "error": doesExist ? '' : 'Invalid key.'
        };
    }
}