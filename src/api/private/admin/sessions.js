import { APIRoute } from "http/routing";

export default class AdminGetSessionsAPIRoute extends APIRoute
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
                "success": false
            };
        
        let user = await this.db.getDocument("users", {
            "key": request.query.key
        });

        if (!user.administrator)
            return {
                "success": false
            };


        let sessions = await this.db.getDocuments("users", {});

        for (let i = 0; i < sessions.length; i++)
        {
            let session = sessions[i];

            if (session.administrator)
                session.key = "<redacted>";
        }
        
        return {
            "success": true,
            "data": sessions
        };
    }
}