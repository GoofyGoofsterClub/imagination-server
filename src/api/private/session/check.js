import { APIRoute } from "http/routing";
import hash from "utilities/hash";

/*--includedoc

@private false
@needsauth true
@adminonly false
@params [(string) key]
@returns Returns if key is valid
@returnexample { "success": true }
Check if a session key is valid.

*/
export default class CheckSessionAPIRoute extends APIRoute {
    constructor() {
        super("GET");
    }

    async call(request, reply, server) {
        const limit = await server.server._public.CheckRateLimiter.hit(request.ip);

        if (!limit.allowed) {
            reply.status(429);
            reply.header("Retry-After", limit.retryAfter);
            return {
                "success": false,
                "error": "Too many requests."
            };
        }

        const key = typeof request.query.key === 'string' ? request.query.key : '';
        const doesExist = await server.db.doesUserExistByAccessKey(hash(key));

        return {
            "success": doesExist,
            "error": doesExist ? '' : 'Invalid key.'
        };
    }
}