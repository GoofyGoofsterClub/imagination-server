import { Route } from "http/routing";
import { publicHost } from "utilities/links";
import { assetManifest, defaultTranslations, languages, jsonForScript } from "utilities/assets";

export default class IndexRoute extends Route
{
    constructor()
    {
        super("/", "GET");
    }

    async call(request, reply)
    {
        return reply.viewAsync("index.ejs", {
            "domain": publicHost(request),
            "bootstrap": jsonForScript({ assets: assetManifest, translations: defaultTranslations, languages })
        });
    }
}
