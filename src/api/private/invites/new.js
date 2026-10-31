import { APIRoute } from "http/routing";
import { v4 as uuidv4 } from "uuid";
import { USER_PERMISSIONS, hasPermission } from "utilities/permissions";
import hash from "utilities/hash";

/*--includedoc

@private false
@needsauth true
@adminonly true
@params [(string) key, (string) target ]
@returns Invite code
@returnexample { "success": true, "data": { "inviteCode": "00000000-2f6b-4f8b-8d5b-9b8f6b7c4d0a", "displayName": "test", "validUntil": 1600000000000 } }
Creates a new invite code for a user with selected username by an eligible user.

*/
export default class InvitesNewAPIRoute extends APIRoute {
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

        if (!hasPermission(user.permissions, USER_PERMISSIONS.ADMINISTRATOR) && !hasPermission(user.permissions, USER_PERMISSIONS.INVITE_USERS))
            return {
                "success": false,
                "error": "You are not an administrator or you cannot invite users."
            };

        if (!request.query.target)
            return {
                "success": false,
                "error": "Missing parameters."
            };

        if (request.query.target.length > 32 || !/^[a-zA-Z0-9_]+$/.test(request.query.target))
            return {
                "success": false,
                "error": "Invalid username."
            };

        let target = await server.db.findUserByDisplayName(request.query.target);
        if (target)
            return {
                "success": false,
                "error": "Specified name is taken."
            };

        let pendingInvites = await server.db.query(`SELECT COUNT(*)::int AS n FROM uwuso.invites
            WHERE inviter = $1::bigint AND valid_until > EXTRACT(epoch FROM NOW())::bigint`, [user.id]);
        if (pendingInvites.rows[0].n >= 100)
            return {
                "success": false,
                "error": "You have too many pending invites."
            };

        let activeInvite = await server.db.query(`SELECT id FROM uwuso.invites
            WHERE username = $1::text AND valid_until > EXTRACT(epoch FROM NOW())::bigint`, [request.query.target]);
        if (activeInvite.rows.length > 0)
            return {
                "success": false,
                "error": "An active invite for this name already exists."
            };

        let inviteCode = hash(uuidv4());

        await server.db.query(`INSERT INTO uwuso.invites (username, hash, inviter, valid_until)
            VALUES ($1::text, $2::text, $3::bigint, $4::bigint)`,
            [
                request.query.target,
                inviteCode,
                user.id,
                parseInt(Math.floor(+Date.now() / 1000) + 604800)
            ]
        );

        return {
            "success": true,
            "data": {
                "inviteCode": inviteCode,
                "displayName": request.query.target,
                "validUntil": Date.now() + 604800000 // 7 days
            }
        };
    }
}