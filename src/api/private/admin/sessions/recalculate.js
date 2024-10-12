import { APIRoute } from "http/routing";
import CheckRating from "utilities/rating/conditions";
import CalculateRatingWorker from "utilities/rating/calculationworker";
import { PresetOutput } from "utilities/output";

/*--includedoc

@private false
@needsauth true
@adminonly true
@params []
@returns Nothing
@returnexample { "success": true }
Recalculates all sessions' rating.

*/
export default class AdminRecalculateRating extends APIRoute
{
    constructor()
    {
        super("GET");
    }

    async call(request, reply, server)
    {
        let tempOutput = new PresetOutput("forcedrecalculation");
        let doesExist = await server.db.checkDocumentExists("users", {
            "key": request.query.key
        });

        if (!doesExist)
            return {
                "success": false,
                "error": "Invalid key."
            };
        
        let user = await server.db.getDocument("users", {
            "key": request.query.key
        });

        let ratingResponse = await CheckRating(server.db, user.displayName);
        if (!ratingResponse)
            return {
                "success": false,
                "error": "You are banned."
            };


        if (!user.administrator)
            return {
                "success": false,
                "error": "You are not an administrator."
            };

        try
        {
            await CalculateRatingWorker(server.db, tempOutput);
        } catch(e)
        {
            return {
                "success": false
            }
        }

        return {
            "success": true
        };
    }
}