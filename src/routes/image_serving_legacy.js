import { Route } from "http/routing";
import hash from "utilities/hash";
import addView from "utilities/addview";

export default class ImageServing extends Route {
    constructor() {
        super("/:uploader/:filename", "GET");
    }

    async call(request, reply, server) {
        let fileInfo = await server.db.query(`SELECT * FROM uwuso.uploads WHERE filename = $1::text`, [request.params.filename]);

        if (fileInfo.rows.length < 1) {
            reply.status(404);
            return reply.view("error.ejs", {
                "error_title": "Not Found",
                "error_message": "<p>This page doesn't exist.</p><img src='/public/img/uhhh.jpg'>"
            });
        }

        let file = fileInfo.rows[0];

        // Add views to both the file and user

        await server.db.query(`UPDATE uwuso.users SET views = views + 1 WHERE id = $1::bigint`, [file.uploader_id]);
        await server.db.query(`UPDATE uwuso.uploads SET views = views + 1 WHERE id = $1::bigint`, [file.id]);

        let fileMimetype = file.mimetype;
        if (
            !fileMimetype.match(/image\/.*/g) &&
            !fileMimetype.match(/video\/.*/g) &&
            !fileMimetype.match(/audio\/.*/g) &&
            !fileMimetype.match(/application\/pdf/g)
        )
            reply.header("Content-Disposition", `attachment; filename="${file.filename}.${file.file_ext ? file.file_ext : ""}"`);

        reply.type(file.mimetype);

        reply.sendFile(file.disk_filename, {
            "root": `${__dirname}/../../privateuploads`
        });
    }
}