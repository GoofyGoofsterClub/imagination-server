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
        // TO-DO(mishashto): Use redis instead of goofball mongodb.
    }
}