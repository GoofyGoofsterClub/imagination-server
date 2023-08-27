import { APIRoute } from "http/routing";

export default class UploadsCountAPIRoute extends APIRoute
{
    constructor()
    {
        super("GET");
    }

    async call(request, reply)
    {
        let collection = await this.db.getCollection("uploads");
        let count = await collection.countDocuments();
        reply.send({
            "count": count
        });
    }
}