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
        
        if (!request.query.target || !request.query.field || !request.query.value)
            return {
                "success": false,
                "error": "Missing parameters."
            };
        
        if (restrictedFields.includes(request.query.field))
            return {
                "success": false,
                "error": "You cannot modify this field."
            };

        let target = await this.db.getDocument("users", {
            "key": request.query.target
        });

        if (!target)
            return {
                "success": false,
                "error": "Invalid target."
            };
        
        let collection = await this.db.getCollection("users");

        collection.updateOne({
            "key": request.query.target
        }, {
            "$set": {
                [request.query.field]: request.query.value
            }
        });

        return {
            "success": true
        };
    }
}