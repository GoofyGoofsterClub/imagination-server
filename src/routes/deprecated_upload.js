import { Route } from "http/routing";

export default class DeprecatedUpload extends Route
{
    constructor()
    {
        super("/uploadImage", "POST");
    }

    async call(request, reply)
    {
        reply.status(301);
        const message = "This route has been deprecated. Please use /api/private/uploads/new instead or download a new ShareX file through dashboard.";
        reply.send({
            "success": false,
            "data": {
                "message": message,
                "link": "/api/private/uploads/new"
            }
        });
    }
}