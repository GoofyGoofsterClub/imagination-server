import { Route } from "http/routing";

export default class ImageServing extends Route
{
    constructor()
    {
        super("/uploadImage", "POST");
    }

    async call(request, reply)
    {
        reply.status(301);
        reply.send({
            "success": false,
            "data": {
                "message": "This route has been deprecated. Please use /api/private/uploads/new instead or download a new ShareX file through dashboard.",
                "link": "This route has been deprecated. Please use /api/private/uploads/new instead or download a new ShareX file through dashboard."
            }
        });
    }
}