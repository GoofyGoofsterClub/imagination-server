import { APIRoute } from "http/routing";

/*--includedoc

@private false
@needsauth true
@adminonly false
@params [(string) key, (string) new_name]
@returns Returns true in success if request was processed.
@returnexample { "success": true }
Changes the display name of a user.
WARNING: All previous uploads will still use old name, due to hashing.

*/
export default class ChangeUsername extends APIRoute
{
    constructor()
    {
        super("GET");
    }

    async call(request, reply)
    {
        if (!request.query.key || !request.query.new_name)
            return {"success": false, "error": "One of the fields is missing."};

        let doesExist = await this.db.checkDocumentExists("users", {
            "key": request.query.key
        });

        let user = await this.db.getDocument("users", {
            "key": request.query.key
        });


        if (!doesExist)
            return {"success": false, "error": "User does not exist."};

        if (user.usernameChangeBlockedUntil && user.usernameChangeBlockedUntil > Date.now())
            return {"succses": false, "error": `You cannot change your username until ${new Date(user.usernameChangeBlockedUntil).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "long"})}.`};

        let isUsernameTaken = await this.db.checkDocumentExists("users", {
            "displayName": request.query.new_name
        });

        if (isUsernameTaken)
            return {"success": false, "error": "Display name is already taken."};

        let nameChangesTotal = user.nameChanges ?? 1;

        await this.db.updateDocument("users", {
            "key": request.query.key
        }, {
            "$set": {
                "displayName": request.query.new_name,
                "usernameChangeBlockedUntil": user.adminstrator ? -1 : (Date.now() + 24 * 60 * 60 * 1000) * nameChangesTotal, // so people don't abuse it,
                "nameChanges": nameChangesTotal
            }
        });

        // External logging for trolling prevention
        await this._public.ExternalLogging.Log(buildMessage(
            request.headers['host'],
            "info",
            "User changed their username.",
            `Username has been changed from \`${user.displayName}\` to \`${request.query.new_name}\``,
            `https://${request.headers['host']}/${_auth.displayName}/${ids.public}`
        ));

        return {
            "success": true
        };
    }
}