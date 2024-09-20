import { APIRoute } from "http/routing";
import { Field, buildMessage } from "utilities/logexternal";
import { USER_PERMISSIONS, hasPermission } from "utilities/permissions";

const restrictedFields = [
    "key",
    "protected",
    "displayName"
];

/*--includedoc

@private false
@needsauth true
@adminonly true
@params [(string) key, (string) target, (string) field, (string) value]
@returns New value
@returnexample { "success": true, "value": "" }
Modifies a specific field from a user's profile, excluding protected fields.

*/
export default class AdminModifySessionsAPIRoute extends APIRoute {
    constructor() {
        super("POST");
    }

    async call(request, reply, server) {
        const requestData = request.body;

        let doesExist = await server.db.doesUserExistByAccessKey(request.query.key);


        if (!doesExist)
            return {
                "success": false,
                "error": "Invalid key."
            };

        let user = await server.db.findUserByAccessKey(request.query.key);

        if (!hasPermission(user.permissions, USER_PERMISSIONS.ADMINISTRATOR))
            return {
                "success": false,
                "error": "You are not an administrator."
            };

        if (!requestData.target || !requestData.field || 'value' in requestData == false)
            return {
                "success": false,
                "error": "Missing parameters."
            };

        if (restrictedFields.includes(requestData.field))
            return {
                "success": false,
                "error": "You cannot modify this field."
            };

        let target = await server.db.findUserByDisplayName(requestData.target);

        if (target.rows.length < 1)
            return {
                "success": false,
                "error": "Invalid target."
            };

        target = target.rows[0];

        if (target.superuser)
            return {
                "success": false,
                "error": "You cannot modify this user."
            };

        if (hasPermission(target.permissions, USER_PERMISSIONS.ADMINISTRATOR) && requestData.field == "isBanned")
            return {
                "success": false,
                "error": "You cannot ban an administrator."
            };

        await server.db.query(`UPDATE uwuso.users SET $1 = $2 WHERE username = $3`, [requestData.field, requestData.value, target.username]);

        // External logging
        server.externalLogging.Log(buildMessage(
            request.headers['host'],
            "info",
            "A user's session has been modified.",
            `A user's session has been modified by \`${user.displayName}\`:\n\`${requestData.target}\`'s \`${requestData.field}\` has been set to \`${requestData.value}\``,
            null,
            new Field("Target", requestData.target, true),
            new Field("Modified By", user.displayName, true),
            new Field("Field", requestData.field, true),
            new Field("Value", requestData.value, true)
        ));

        return {
            "success": true,
            "value": requestData.value
        };
    }
}
