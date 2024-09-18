import { APIRoute } from "http/routing";

/*--includedoc

@private false
@needsauth false
@adminonly false
@params []
@returns The number of uploads in the database.
@returnexample { "count": 123 }
Counts the number of uploads in the database.

*/
export default class UploadsCountAPIRoute extends APIRoute {
    constructor() {
        super("GET");
    }

    async call(request, reply, server) {
        let collection = await server.odb.getCollection("uploads");
        let count = await collection.countDocuments();
        reply.send({
            "count": count
        });
    }
}