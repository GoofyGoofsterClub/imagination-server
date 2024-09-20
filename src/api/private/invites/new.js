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
        let doesExist = await server.db.doesUserExistByAccessKey(request.query.key);

        if (!doesExist)
            return {
                "success": false,
                "error": "Invalid key."
            };

        let user = await server.db.findUserByAccessKey(request.query.key);

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

        let inviteCode = hash(uuidv4());

        await server.db.query(`INSERT INTO uwuso.invites (hash, inviter, valid_until)
            VALUES ($1::text, $2::bigint, $3::timestamp)`,
            [
                inviteCode,
                user.id,
                Math.floor(+Date.now() / 1000) + 604800
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