import { APIRoute } from "http/routing";
import { GeneratePrivateID, GeneratePublicID } from "utilities/id";
import { USER_PERMISSIONS, hasPermission, permissions } from "utilities/permissions";
import hash from "utilities/hash";

const MAX_INTERNAL_NAME_LENGTH = 255;

/*--includedoc

@private false
@needsauth true
@adminonly true
@params [(string) key, (string) internal_name]
@returns New service account authentication information or an error
@returnexample { "success": true, "data": { "access_key": "", "internal_key": "" } }
Creates a new service account and returns its one-time access key and internal key.

*/
export default class AdminCreateServiceAccount extends APIRoute {
    constructor() {
        super("POST");
    }

    async call(request, reply, server) {
        if (!request.body?.key || !request.body?.internal_name)
            return {
                "success": false,
                "error": "Missing parameters."
            };

        let user = await server.db.findUserByAccessKey(hash(request.body.key));

        if (!user)
            return {
                "success": false,
                "error": "Invalid key."
            };

        if (user.banned) return {
            "success": false,
            "error": "You are banned."
        };

        if (!hasPermission(user.permissions, USER_PERMISSIONS.ADMINISTRATOR))
            return {
                "success": false,
                "error": "You are not an administrator."
            };

        let accessKey = GeneratePrivateID();
        let internalKey = GeneratePublicID(16, "v2S.~");

        let _r = await server.db.query(`INSERT INTO uwuso.services (access_key, internal_key, display_name,
                owner, permissions, disabled)
                VALUES ($1::text, $2::text, $3::text,
                $4::bigint, $5::bigint, $6::boolean);`,
            [
                hash(accessKey),
                internalKey,
                request.body.internal_name.slice(0, MAX_INTERNAL_NAME_LENGTH),
                user.id,
                permissions(USER_PERMISSIONS.UPLOAD, USER_PERMISSIONS.VIEW_OWN_FILES),
                false
            ]);

        return {
            "success": true,
            "data": {
                "access_key": accessKey,
                "internal_key": internalKey,
                "owner": user.username
            }
        }
    }
}


// CREATE TABLE uwuso.services(
//     id integer NOT NULL GENERATED ALWAYS AS IDENTITY(INCREMENT BY 1 MINVALUE 0 MAXVALUE 2147483647 START WITH 1 CACHE 1),
//     access_key text NOT NULL,
//     internal_key text NOT NULL,
//     display_name text NOT NULL,
//     owner bigint NOT NULL,
//     permissions bigint NOT NULL DEFAULT 0,
//     disabled boolean NOT NULL DEFAULT false,
//     CONSTRAINT services_pk PRIMARY KEY(id)
// );
