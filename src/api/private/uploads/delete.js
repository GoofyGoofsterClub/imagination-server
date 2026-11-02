import { APIRoute } from "http/routing";
import hash from "utilities/hash";
import { removeUploadFiles, deleteUserUploads } from 'utilities/deleteuploads';
import { invalidateStatistics } from 'utilities/statistics';
import { clearListCounts } from 'utilities/pagination';

/*--includedoc

@private false
@needsauth true
@adminonly false
@params [(string) key, (string) filename]
@returns Nothing
@returnexample { "success": true }
A route to request a file deletion.

*/
export default class DeleteUploadAPIRoute extends APIRoute {
    constructor() {
        super("GET");
    }

    async call(request, reply, server) {
        let user = await server.db.findUserByAccessKey(hash(request.query.key));

        if (!user)
            return {
                "success": false,
                "error": "Invalid key."
            };

        if (user.banned) return {
            "success": false,
            "error": "You are banned."
        };

        if (!request.query.filename)
            return {
                "success": false,
                "error": "No filename was provided."
            };

        if (request.query.filename == "*") {
            // delete all of theirs
            await deleteUserUploads(server.db, user.id);

            return {
                "success": true
            };
        }

        let fileInfo = await server.db.query(`SELECT uploader_id, disk_filename, views FROM uwuso.uploads WHERE filename = $1::text`, [request.query.filename]);

        if (fileInfo.rows.length < 1)
            return {
                "success": false,
                "error": "File does not exist."
            };

        fileInfo = fileInfo.rows[0];

        if (fileInfo.uploader_id !== user.id)
            return {
                "success": false,
                "error": "You do not own this file."
            };

        await server.db.query(`DELETE FROM uwuso.uploads WHERE uploader_id = $1::bigint AND filename = $2::text`, [user.id, request.query.filename]);

        clearListCounts();
        invalidateStatistics();
        await removeUploadFiles({ filename: request.query.filename, disk_filename: fileInfo.disk_filename });

        return {
            "success": true
        };

    }
}
