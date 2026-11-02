import { APIRoute } from "http/routing";
import { USER_PERMISSIONS, hasPermission } from "utilities/permissions";
import hash from "utilities/hash";
import { cachedCount, decodeCursor, encodeCursor } from 'utilities/pagination';

/*--includedoc

@private false
@needsauth true
@adminonly true
@params [(string) key]
@returns Returns if key is valid
@returnexample { "success": true, "data": [...] }
Returns all user's public and private profile data.

*/
export default class AdminGetSessionsAPIRoute extends APIRoute {
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

        if (user.banned) return {
            "success": false,
            "error": "You are banned."
        };

        if (!hasPermission(user.permissions, USER_PERMISSIONS.ADMINISTRATOR)
            && !hasPermission(user.permissions, USER_PERMISSIONS.VIEW_OTHER_USERS))
            return {
                "success": false,
                "error": "You are not an administrator."
            };


        const page = Math.max(1, parseInt(request.query.page, 10) || 1);
        if (page > 1000000) return { success: false, error: 'Page is too large. Use cursor pagination.' };
        const pageSize = 50;
        const search = (request.query.search || "").trim();
        const offset = (page - 1) * pageSize;
        const filters = [];
        let whereClause = "";
        if (search) {
            filters.push(`%${search}%`);
            whereClause = `WHERE username ILIKE $1::text`;
        }
        const countFilters = [...filters];
        const countClause = whereClause;
        const cursorMode = request.query.pagination === 'cursor';
        let cursor;
        try { cursor = decodeCursor(request.query.cursor); }
        catch (error) { reply.code(400); return { success: false, error: error.message }; }
        if (cursorMode && cursor) {
            filters.push(...cursor);
            whereClause += `${whereClause ? ' AND' : 'WHERE'} (username, id) > ($${filters.length - 1}::text, $${filters.length}::bigint)`;
        }
        const limitIndex = filters.length + 1;
        const offsetIndex = filters.length + 2;

        const [result, total] = await Promise.all([server.db.query(`
            SELECT id, username, permissions, banned, superuser
            FROM uwuso.users
            ${whereClause}
            ORDER BY username ASC, id ASC
            LIMIT $${limitIndex}::integer ${cursorMode ? '' : `OFFSET $${offsetIndex}::integer`}`,
            cursorMode ? [...filters, pageSize + 1] : [...filters, pageSize, offset]),
            cachedCount(JSON.stringify(['users', search]), async () => Number((await server.db.query(
                `SELECT COUNT(id) AS count FROM uwuso.users ${countClause}`, countFilters)).rows[0].count))]);
        const hasNext = cursorMode ? result.rows.length > pageSize : page * pageSize < total;
        const last = result.rows[Math.min(result.rows.length, pageSize) - 1];

        const users = result.rows.slice(0, pageSize).map((session) => ({
            id: session.id,
            username: session.username,
            banned: session.banned,
            superuser: session.superuser,
            administrator: hasPermission(session.permissions, USER_PERMISSIONS.ADMINISTRATOR),
            can_invite: hasPermission(session.permissions, USER_PERMISSIONS.INVITE_USERS)
        }));

        return {
            "success": true,
            "data": users,
            "pagination": cursorMode ? 'cursor' : 'offset',
            "hasNext": hasNext,
            "nextCursor": hasNext && last ? encodeCursor([last.username, String(last.id)]) : null,
            "page": page,
            "pageSize": pageSize,
            "total": total,
            "totalPages": Math.ceil(total / pageSize)
        };
    }
}
