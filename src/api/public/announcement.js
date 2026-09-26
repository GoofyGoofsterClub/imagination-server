import { APIRoute } from "http/routing";
import { getAnnouncement } from "utilities/announcement";

/*--includedoc

@private false
@needsauth false
@adminonly false
@params []
@returns The active service announcement.
@returnexample { "success": true, "data": null }
Returns the active service announcement, if one exists.

*/
export default class PublicAnnouncementAPIRoute extends APIRoute {
    constructor() {
        super("GET");
    }

    async call(request, reply, server) {
        return {
            "success": true,
            "data": await getAnnouncement(server.db)
        };
    }
}
