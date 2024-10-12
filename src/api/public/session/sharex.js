import { APIRoute } from "http/routing";
import hash from "utilities/hash";

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
        let doesExist = await server.db.doesUserExistByAccessKey(hash(request.query.key));

        if (!doesExist)
            return {
                "success": false,
                "error": "Invalid key."
            };

        let user = await server.db.findUserByAccessKey(hash(request.query.key));


        reply.header('Content-Disposition',
            `attachment; filename=${user.username}.sxcu`);
        return {
            "Version": "13.7.0",
            "Name": request.headers['host'],
            "DestinationType": "ImageUploader, TextUploader, FileUploader",
            "RequestMethod": "POST",
            "RequestURL": `https://${request.headers['host']}/api/private/uploads/new`,
            "Headers": {
                "Authorization": request.query.key
            },
            "Body": "MultipartFormData",
            "FileFormName": "image",
            "URL": "$json:data.link$"
        };
    }
}