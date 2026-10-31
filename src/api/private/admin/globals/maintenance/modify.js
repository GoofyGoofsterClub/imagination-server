import { APIRoute } from "http/routing";
import { USER_PERMISSIONS, hasPermission } from "utilities/permissions";
import hash from "utilities/hash";

const MAINTENANCE_KEY = "maintenance";

/*--includedoc

@private false
@needsauth true
@adminonly true
@params [(string) key, (bool) enabled, (string) reason, (integer) mode]
@returns Modifies the value of maintenance global variable.
@returnexample { "success": true, "data": { "enabled": true, "mode": 2, "message": "..." } }
Modifies the value of maintenance global variable. Parameter mode can be: 0 - Dashboard only, 1 - Dashboard and API (everything, except this, of course), 2 - Service-wide.

*/
export default class ModifyGlobalsMaintenanceAPIRoute extends APIRoute {
    constructor() {
        super("GET", true);
    }

    async call(request, reply, server) {
        let user = await server.db.findUserByAccessKey(hash(request.query.key));

        if (!user)
            return {
                "success": false,
                "error": "Invalid key."
            };

        if (user.banned) return {
            "success": false,
            "error": "You are banned."
        };

        if (!hasPermission(user.permissions, USER_PERMISSIONS.ADMINISTRATOR))
            return {
                "success": false,
                "error": "You are not an administrator."
            };

        const enabled = request.query.enabled === "true";
        const mode = parseInt(request.query.mode, 10);
        const message = (request.query.reason || "").trim().slice(0, 500);

        if (!Number.isInteger(mode) || mode < 0 || mode > 2)
            return {
                "success": false,
                "error": "Mode must be 0, 1, or 2."
            };
        if (enabled && message.length < 1)
            return {
                "success": false,
                "error": "A reason is required to enable maintenance mode."
            };

        const state = { enabled, mode, message };

        if (enabled)
            await server.db.query(`INSERT INTO uwuso.settings (key, value) VALUES ($1::text, $2::text)
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, [MAINTENANCE_KEY, JSON.stringify(state)]);
        else
            await server.db.query(`DELETE FROM uwuso.settings WHERE key = $1::text`, [MAINTENANCE_KEY]);

        server.server._public.Maintenance = enabled ? { value: state } : false;

        return {
            "success": true,
            "data": state
        };
    }
}
