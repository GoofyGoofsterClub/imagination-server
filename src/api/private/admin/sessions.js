import { APIRoute } from "http/routing";
import { USER_PERMISSIONS, hasPermission } from "utilities/permissions";
import hash from "utilities/hash";

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
        let doesExist = await server.db.doesUserExistByAccessKey(hash(request.query.key));


        if (!doesExist)
            return {
                "success": false,
                "error": "Invalid key."
            };

        let user = await server.db.findUserByAccessKey(hash(request.query.key));

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
        const pageSize = 50;
        const search = (request.query.search || "").trim();
        const offset = (page - 1) * pageSize;
        const searchPattern = `%${search}%`;

        const result = await server.db.query(`
            SELECT id, username, permissions, banned, superuser,
                   COUNT(*) OVER() AS total_count
            FROM uwuso.users
            WHERE username ILIKE $1::text
            ORDER BY username ASC
            LIMIT $2::integer OFFSET $3::integer`,
            [searchPattern, pageSize, offset]);

        const total = result.rows.length > 0 ? Number(result.rows[0].total_count) : Number((await server.db.query(
            `SELECT COUNT(id) AS count FROM uwuso.users WHERE username ILIKE $1::text`, [searchPattern]
        )).rows[0].count);

        const users = result.rows.map((session) => ({
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
            "page": page,
            "pageSize": pageSize,
            "total": total,
            "totalPages": Math.ceil(total / pageSize)
        };
    }
}