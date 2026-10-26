import { APIRoute } from "http/routing";
import { hasPermission, USER_PERMISSIONS } from "utilities/permissions";
import hash from "utilities/hash";
import { normalizeDomains, setRandomCustomUrlExperiment, MAX_RANDOM_CUSTOM_URL_DOMAINS } from "utilities/experiments";

/*--includedoc

@private false
@needsauth true
@adminonly true
@params [(string) key, (bool) enabled, (array) domains]
@returns The saved experiment state.
@returnexample { "success": true, "data": { "enabled": true, "domains": ["uwu.so", "mirror.example"] } }
Toggles the random custom URL experiment. When enabled, uploads without the custom_url parameter get a link on a random domain from the list.

*/
export default class AdminExperimentsRandomCustomUrlAPIRoute extends APIRoute {
    constructor() {
        super("POST");
    }

    async call(request, reply, server) {
        const body = request.body ?? {};
        const user = await server.db.findUserByAccessKey(hash(body.key));
        if (!user || user.banned || !hasPermission(user.permissions, USER_PERMISSIONS.ADMINISTRATOR))
            return { "success": false, "error": "You are not an administrator." };

        if (typeof body.enabled !== "boolean")
            return { "success": false, "error": "Enabled must be a boolean." };

        const domains = normalizeDomains(body.domains ?? []);
        if (!domains)
            return { "success": false, "error": "Domains must be a list of valid hostnames." };
        if (domains.length > MAX_RANDOM_CUSTOM_URL_DOMAINS)
            return { "success": false, "error": `At most ${MAX_RANDOM_CUSTOM_URL_DOMAINS} domains are allowed.` };
        if (body.enabled && domains.length < 1)
            return { "success": false, "error": "At least one domain is required to enable the experiment." };

        return { "success": true, "data": await setRandomCustomUrlExperiment(server.db, body.enabled, domains) };
    }
}
