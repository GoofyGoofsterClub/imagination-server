import { APIRoute } from "http/routing";

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
        const cacheTTL = 60 * 1000;
        const now = Date.now();
        const cache = server.server._public.StatisticsCache;

        if (cache && now - cache.createdAt < cacheTTL)
            return cache.value;

        const collection = await server.db.query(`
            SELECT COUNT(id)::bigint AS uploads,
                   COALESCE(SUM(views), 0)::bigint AS views
            FROM uwuso.uploads`);
        const uploads = collection.rows[0].uploads;
        const views = collection.rows[0].views;
        const value = {
            // Keep count for backwards compatibility with existing API clients.
            "count": uploads,
            "uploads": uploads,
            "views": views
        };

        server.server._public.StatisticsCache = {
            createdAt: now,
            value
        };
        return value;
    }
}
