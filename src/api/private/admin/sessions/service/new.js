import { APIRoute } from "http/routing";
import { GeneratePrivateID, GeneratePublicID } from "utilities/id";

const restrictedFields = [
    // for future use
];

/*--includedoc

@private false
@needsauth true
@adminonly true
@params [(string) key, (string) internal_name]
@returns New service account authentication information or an error
@returnexample { "success": true, "data": { "access_key": "", "internal_key": "" } }
Returns specific field from a user's profile.

*/
export default class AdminCreateServiceAccount extends APIRoute
{
    constructor()
    {
        super("GET");
    }

    async call(request, reply)
    {
        let doesExist = await this.db.checkDocumentExists("users", {
            "key": request.query.key
        });

        if (!doesExist)
            return {
                "success": false,
                "error": "Invalid key."
            };
        
        let user = await this.db.getDocument("users", {
            "key": request.query.key
        });

        if (!user.administrator)
            return {
                "success": false,
                "error": "You are not an administrator."
            };
        
        if (!request.query.internal_name)
            return {
                "success": false,
                "error": "Missing parameters."
            };

        let newServiceAccount = {
            "internalName": request.query.internal_name,
            "accessKey": GeneratePrivateID(),
            "internalKey": GeneratePublicID(16, "v2S.~"),
            "owner": user._id,
            "subowners": [],
            "limits": { // TO-DO(mishashto): Needs to be implemented, as well as UI for this.
                "ratelimit": 0,
                "whitelistedMime": null,
                "blacklistedMime": [],
                "userAgent": null,
                "allowDirectExtension": false
            },
            "disabled": false,
            "forcedDisabled": false
        };

        let _r = await this.db.insertDocument("services", newServiceAccount);

        return {
            "success": true,
            "data": {
                "access_key": newServiceAccount.accessKey,
                "internal_key": newServiceAccount.internalKey,
                "owner": newServiceAccount.owner
            }
        }
    }
}