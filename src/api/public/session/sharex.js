import { APIRoute } from "http/routing";
import hash from "utilities/hash";
import { publicBaseUrl } from "utilities/links";

/*--includedoc

@private false
@needsauth true
@adminonly false
@params [(string) key]
@returns Returns a ShareX config file for the user.
@returnexample ShareX file
Generate a ShareX config file for the user.

*/
export default class CheckSessionInfoAPIRoute extends APIRoute {
    constructor() {
        super("GET");
    }

    async call(request, reply, server) {
        let user = await server.db.findUserByAccessKey(hash(request.query.key));

        if (!user)
            return {
                "success": false,
                "error": "Invalid key."
            };

        let safeName = (user.username || "").replace(/[^A-Za-z0-9._-]/g, "");
        if (!safeName || safeName === "." || safeName === "..")
            safeName = "sharex-config";

        reply.header('Content-Disposition',
            `attachment; filename="${safeName}.sxcu"`);
        return {
            "Version": "18.0.1",
            "DestinationType": "ImageUploader, FileUploader",
            "RequestMethod": "POST",
            "RequestURL": `${publicBaseUrl(request)}/api/private/uploads/new`,
            "Headers": {
                "Authorization": request.query.key
            },
            "Body": "MultipartFormData",
            "FileFormName": "image",
            "URL": "{json:data.link}"
        };
    }
}