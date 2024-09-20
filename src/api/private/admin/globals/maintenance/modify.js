import { APIRoute } from "http/routing";

/*--includedoc

@private false
@needsauth true
@adminonly true
@params [(string) key, (bool) enabled, (string) reason, (integer) mode]
@returns Modifies the value of maintenance global variable.
@returnexample { "success": true }
Modifies the value of maintenance global variable. Parameter mode can be: 0 - Dashboard only, 1 - Dashboard and API (everything, except this, of course), 2 - Service-wide.

*/
export default class ModifyGlobalsMaintenanceAPIRoute extends APIRoute {
    constructor() {
        super("GET", true);
    }

    async call(request, reply, server) {

        let doesExist = await server.odb.checkDocumentExists("users", {
            "key": hash(request.query.key)
        });

        if (!doesExist)
            return {
                "success": false,
                "error": "Invalid key."
            };

        let user = await server.odb.getDocument("users", {
            "key": hash(request.query.key)
        });

        if (!user.administrator)
            return {
                "success": false,
                "error": "You are not an administrator."
            };
        request.query.enabled = JSON.parse(request.query.enabled.toLowerCase());
        if (request.query.enabled == undefined || !request.query.reason || request.query.mode == undefined || parseInt(request.query.mode) == NaN)
            return { "success": false, "error": "Not enough data." };

        let isMaintenance = await server.odb.updateDocument("globals", {
            "field": "maintenance"
        }, {
            "$set": {
                "value": request.query.enabled ? {
                    "enabled": request.query.enabled,
                    "message": request.query.reason,
                    "mode": parseInt(request.query.mode)
                } : null
            }
        }, true);

        server.server._public.Maintenance = request.query.enabled ? {
            "field": "maintenance",
            "value": {
                "enabled": request.query.enabled,
                "message": request.query.reason,
                "mode": parseInt(request.query.mode)
            }
        } : false;

        return {
            "success": true
        };
    }
}