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
export default class AdminRecalculateRating extends APIRoute {
    constructor() {
        super("GET");
    }

    async call(request, reply, server) {
        return {
            "success": false,
            "error": "DEPRECATED -- Will be removed soon."
        }
    }
}