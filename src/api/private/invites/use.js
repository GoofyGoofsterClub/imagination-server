import { APIRoute } from "http/routing";
import { v4 as uuidv4 } from "uuid";
import { USER_PERMISSIONS, permissions } from "utilities/permissions";
import hash from "utilities/hash";

class InviteAlreadyConsumedError extends Error {
    constructor() {
        super("Code already used or invalid.");
    }
}

class UserAlreadyExistsError extends Error {
    constructor() {
        super("User already exists.");
    }
}

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

        if (target.valid_until * 1000 < Date.now())
            return {
                "success": false,
                "error": "Code expired."
            };

        let accessKey = "vX2~!" + uuidv4();

        // Deleting the invite and creating the user run in one transaction,
        // so a failure after the delete rolls the delete back too.
        try {
            await server.db.transaction(async (client) => {
                let deleted = await client.query(`DELETE FROM uwuso.invites WHERE hash = $1::text`, [request.query.code]);
                if (deleted.rowCount !== 1)
                    throw new InviteAlreadyConsumedError();

                let targetUser = await client.query(`SELECT * FROM uwuso.users WHERE username = $1 LIMIT 1`, [target.username]);
                if (targetUser.rows.length > 0)
                    throw new UserAlreadyExistsError();

                await client.query(`INSERT INTO uwuso.users (username, access_key, permissions, private_profile, banned, views, uploads, superuser)
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
            });
        } catch (error) {
            if (error instanceof InviteAlreadyConsumedError)
                return { "success": false, "error": "Code already used or invalid." };
            if (error instanceof UserAlreadyExistsError || error.code === "23505")
                return { "success": false, "error": "User already exists." };
            throw error;
        }

        return {
            "success": true,
            "data": {
                "displayName": target.username,
                "accessKey": accessKey
            }
        };
    }
}