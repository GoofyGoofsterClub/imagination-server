import { APIRoute } from "http/routing";
import hash from "utilities/hash";
import { cachedCount, decodeCursor, encodeCursor } from 'utilities/pagination';

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
        if (page > 1000000) return { success: false, error: 'Page is too large. Use cursor pagination.' };
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
        const cursorMode = request.query.pagination === 'cursor';
        const countFilters = [...filters];
        const countClause = extraClause;
        let cursor;
        try { cursor = decodeCursor(request.query.cursor); }
        catch (error) { reply.code(400); return { success: false, error: error.message }; }
        if (cursor && !/^\d+$/.test(cursor[0])) {
            reply.code(400);
            return { success: false, error: 'Invalid cursor.' };
        }
        if (cursorMode && cursor) {
            filters.push(cursor[0], cursor[1]);
            extraClause += ` AND (upload_time, id) ${sort === 'ASC' ? '>' : '<'} ($${filters.length - 1}::bigint, $${filters.length}::bigint)`;
        }
        const limitIndex = filters.length + 1;
        const offsetIndex = filters.length + 2;
        const [uploads, total] = await Promise.all([server.db.query(`
            SELECT id, filename, upload_time, upload_domain
            FROM uwuso.uploads
            WHERE uploader_id = $1::bigint${extraClause}
            ORDER BY upload_time ${sort}, id ${sort}
            LIMIT $${limitIndex}::integer ${cursorMode ? '' : `OFFSET $${offsetIndex}::integer`}`,
            cursorMode ? [...filters, pageSize + 1] : [...filters, pageSize, offset]),
            cachedCount(JSON.stringify(['uploads', ...countFilters, countClause]), async () => {
                const result = await server.db.query(`SELECT COUNT(*) AS count FROM uwuso.uploads WHERE uploader_id = $1::bigint${countClause}`, countFilters);
                return Number(result.rows[0].count);
            })]);
        const hasNext = cursorMode ? uploads.rows.length > pageSize : page * pageSize < total;
        const rows = uploads.rows.slice(0, pageSize);
        const last = rows[rows.length - 1];
        return {
            "success": true,
            "data": rows,
            "pagination": cursorMode ? 'cursor' : 'offset',
            "hasNext": hasNext,
            "nextCursor": hasNext && last ? encodeCursor([String(last.upload_time), String(last.id)]) : null,
            "page": page,
            "pageSize": pageSize,
            "total": total,
            "totalPages": Math.ceil(total / pageSize)
        };
    }
}
