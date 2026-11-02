import { APIRoute } from "http/routing";
import { getStatistics } from "utilities/statistics";

/*--includedoc

@private false
@needsauth false
@adminonly false
@params []
@returns Total uploads and views.
@returnexample { "count": 123, "uploads": 123, "views": 456 }
Returns cached aggregate totals for uploads and image views.

*/
export default class UploadsCountAPIRoute extends APIRoute {
    constructor() {
        super("GET");
    }

    async call(request, reply, server) {
        reply.header("Cache-Control", "public, max-age=10, stale-while-revalidate=60");
        return getStatistics(server.db);
    }
}
