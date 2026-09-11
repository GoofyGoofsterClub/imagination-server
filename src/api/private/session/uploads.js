import { APIRoute } from "http/routing";
import hash from "utilities/hash";

/*--includedoc

@private false
@needsauth true
@adminonly false
@params [(string) key, (integer) page, (string) search, (integer) from, (integer) to, (string) sort]
@returns Returns all user's uploads
@returnexample { "success": true, "data": [...] }
Returns all user's uploads

*/
export default class SessionUploadsAPIRoute extends APIRoute {
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

        if (user.banned)
            return { "success": false, "error": "You are banned." };

        const page = Math.max(1, parseInt(request.query.page, 10) || 1);
        const pageSize = 50;
        const sort = (request.query.sort || "DESC").toUpperCase();
        if (sort !== "ASC" && sort !== "DESC")
            return { "success": false, "error": "Invalid upload time sort order." };
        const offset = (page - 1) * pageSize;
        const search = (request.query.search || "").trim();
        const from = request.query.from ? parseInt(request.query.from, 10) : null;
        const to = request.query.to ? parseInt(request.query.to, 10) : null;
        const filters = [user.id];
        let extraClause = "";
        if (search) {
            filters.push(`%${search}%`);
            extraClause += ` AND filename ILIKE $${filters.length}::text`;
        }
        if (Number.isFinite(from)) {
            filters.push(from);
            extraClause += ` AND upload_time >= $${filters.length}::bigint`;
        }
        if (Number.isFinite(to)) {
            filters.push(to);
            extraClause += ` AND upload_time <= $${filters.length}::bigint`;
        }
        if (Number.isFinite(from) && Number.isFinite(to) && from > to)
            return { "success": false, "error": "The start date must be before the end date." };
        const limitIndex = filters.length + 1;
        const offsetIndex = filters.length + 2;
        const uploads = await server.db.query(`
            SELECT id, filename, upload_time, upload_domain,
                   COUNT(*) OVER() AS total_count
            FROM uwuso.uploads
            WHERE uploader_id = $1::bigint${extraClause}
            ORDER BY upload_time ${sort}
            LIMIT $${limitIndex}::integer OFFSET $${offsetIndex}::integer`,
            [...filters, pageSize, offset]);

        const total = uploads.rows.length > 0 ? Number(uploads.rows[0].total_count) : 0;
        return {
            "success": true,
            "data": uploads.rows,
            "page": page,
            "pageSize": pageSize,
            "total": total,
            "totalPages": Math.ceil(total / pageSize)
        };
    }
}