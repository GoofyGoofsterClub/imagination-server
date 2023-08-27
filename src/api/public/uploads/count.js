import { APIRoute } from "http/routing";

export default class UploadsCountAPIRoute extends APIRoute
{
    constructor()
    {
        super("GET");
    }

    async call(request, reply)
    {
        const count = await this.db.getCollection("uploads").count();
        reply.send({
            "count": count
        });
    }
}