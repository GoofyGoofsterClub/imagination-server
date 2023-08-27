import { APIRoute } from "http/routing";

export default class UploadsCountAPIRoute extends APIRoute
{
    constructor()
    {
        super("GET");
    }

    async call(request, reply)
    {
        console.log(this.db);
        const uploads = await this.db.getCollection("uploads");
        const count = await uploads.find({}).toArray();
        reply.send({
            "count": count
        });
    }
}