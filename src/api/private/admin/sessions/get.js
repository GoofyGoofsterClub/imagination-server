import { APIRoute } from "http/routing";

const restrictedFields = [
    // for future use
];

const administratorReplacements = {
    "key": "<redacted>"
}

export default class AdminGetSessionsFieldAPIRoute extends APIRoute
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
        
        if (!request.query.target || !request.query.field)
            return {
                "success": false,
                "error": "Missing parameters."
            };
        
        if (restrictedFields.includes(request.query.field))
            return {
                "success": false,
                "error": "You cannot get this field."
            };

        let target = await this.db.getDocument("users", {
            "key": request.query.target
        });

        if (!target)
            return {
                "success": false,
                "error": "Invalid target."
            };
        
        if (!target[request.query.field])
            return {
                "success": false,
                "error": "Field does not exist."
            };
        
        if (target.administrator)
            target[request.query.field] = administratorReplacements[request.query.field];

        return {
            "success": true,
            "data": target[request.query.field]
        };
    }
}