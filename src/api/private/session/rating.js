import { APIRoute } from "http/routing";
import calculateRating from "utilities/rating/calculate";

/*--includedoc

@private false
@needsauth true
@adminonly false
@params [(string) key]
@returns Recalculates and returns the rating of a user.
@returnexample { "success": true, "rating": 0.58488221 }
Recalculates and returns the rating of a user.

*/
export default class CheckRatingSessionAPIRoute extends APIRoute {
    constructor() {
        super("GET");
    }

    async call(request, reply, server) {

        // DEPRECATED: -- WILL BE REMOVED SOON

        return {
            "success": true,
            "rating": 1
        };
    }
}