import { APIRoute } from "http/routing";
import { v4 as uuidv4 } from "uuid";
import { USER_PERMISSIONS, hasPermission } from "utilities/permissions";
import hash from "utilities/hash";

/*--includedoc

@private false
@needsauth false
@adminonly false
@params [(string) code]
@returns Returns a private user data
@returnexample { "success": true, "data": { "displayName": "test", "accessKey": "vX2~!00000000-2f6b-4f8b-8d5b-9b8f6b7c4d0a" }
Consumes an invite code and creates a new user with it, returning the access key.

*/
export default class InvitesUseAPIRoute extends APIRoute {
    constructor() {
        super("GET");
    }

    async call(request, reply, server) {
        if (!request.query.code)
            return {
                "success": false,
                "error": "Missing parameters."
            };

        let target = await server.db.query(`SELECT * FROM uwuso.invites WHERE hash = $1::text`, [request.query.code]);

        if (target.rows.length < 1)
            return {
                "success": false,
                "error": "Invalid code."
            };

        target = target.rows[0];

        if (target.valid_until < Date.now())
            return {
                "success": false,
                "error": "Code expired."
            };

        let targetUser = await server.db.findUserByDisplayName(target.username);

        if (targetUser.rows.length > 0)
            return {
                "success": false,
                "error": "User already exists."
            };

        await server.db.query(`DELETE FROM uwuso.invites WHERE hash = $1::text`, [request.query.code]);

        let accessKey = "vX2~!" + uuidv4();

        await server.db.query(`INSERT INTO uwuso.users (username, access_key, permissions, private_profile, banned, views, uploads, superuser)
            VALUES ($1::text, $2::text, $3::bigint,
                    $4::boolean, $5::boolean, $6::bigint, $7::bigint, $8::boolean)`,
            [
                target.username,
                hash(accessKey),
                permissions(USER_PERMISSIONS.UPLOAD,
                    USER_PERMISSIONS.VIEW_OWN_FILES,
                    USER_PERMISSIONS.CHANGE_DISPLAY_NAME
                ),
                false,
                false,
                0,
                0,
                false
            ]
        );

        return {
            "success": true,
            "data": {
                "displayName": target.username,
                "accessKey": accessKey
            }
        };
    }
}