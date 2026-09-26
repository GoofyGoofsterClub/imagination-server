import { Route } from "http/routing";

export default class RawNewImageServing extends Route {
    constructor() {
        super("/raw/:filename", "GET");
    }

    async call(request, reply, server) {
        const fileInfo = await server.db.query(`SELECT filename, disk_filename, mimetype FROM uwuso.uploads WHERE filename = $1::text LIMIT 1`, [request.params.filename]);
        if (fileInfo.rows.length < 1) {
            reply.status(404);
            return reply.viewAsync("error.ejs", { error_title: "Not Found", error_message: "<p>This file does not exist.</p>" });
        }

        const file = fileInfo.rows[0];
        if (request.query.download === "1")
            reply.header("Content-Disposition", `attachment; filename="${file.filename}"`);
        reply.type(file.mimetype);
        return reply.sendFile(file.disk_filename, `${__dirname}/../../privateuploads`, { contentType: false });
    }
}
