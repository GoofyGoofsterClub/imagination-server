import { APIRoute } from "http/routing";

const restrictedFields = [
    "key",
    "protected",
    "displayName"
];

export default class AdminModifySessionsAPIRoute extends APIRoute
{
    constructor()
    {
        super("POST");
    }

    async call(request, reply)
    {
        const requestData = request.body;
        
        let doesExist = await this.db.checkDocumentExists("users", {
            "key": requestData.key
        });

        if (!doesExist)
            return {
                "success": false,
                "error": "Invalid key."
            };
        
        let user = await this.db.getDocument("users", {
            "key": requestData.key
        });

        if (!user.administrator)
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

        let target = await this.db.getDocument("users", {
            "displayName": requestData.target
        });

        if (!target)
            return {
                "success": false,
                "error": "Invalid target."
            };
        
        if (target.administrator && requestData.field == "isBanned")
            return {
                "success": false,
                "error": "You cannot ban an administrator."
            };

        this.db.updateDocument("users", {
            "displayName": requestData.target
        }, {
            "$set": {
                [requestData.field]: requestData.value
            }
        });

        return {
            "success": true
        };
    }
}
