import { Route } from "http/routing";

export default class NewImageServing extends Route {
    constructor() {
        super("/:filename", "GET");
    }

    async call(request, reply, server) {
        let fileInfo = await server.db.query(`SELECT id, uploader_id, filename, disk_filename, mimetype FROM uwuso.uploads WHERE filename = $1::text LIMIT 1`, [request.params.filename]);

        if (fileInfo.rows.length < 1) {
            reply.status(404);
            return reply.viewAsync("error.ejs", {
                "error_title": "Not Found",
                "error_message": "<p>This page doesn't exist.</p><img src='/public/img/uhhh.jpg'>"
            });
        }

        let file = fileInfo.rows[0];

        await Promise.all([
            server.db.query(`UPDATE uwuso.users SET views = views + 1 WHERE id = $1::bigint`, [file.uploader_id]),
            server.db.query(`UPDATE uwuso.uploads SET views = views + 1 WHERE id = $1::bigint`, [file.id])
        ]);

        let cache = server.server._public.StatisticsCache;
        if (cache && cache.value)
            cache.value.views = Number(cache.value.views) + 1;

        let fileMimetype = file.mimetype;
        if (
            !fileMimetype.startsWith("image/") &&
            !fileMimetype.startsWith("video/") &&
            !fileMimetype.startsWith("audio/") &&
            fileMimetype !== "application/pdf"
        )
            reply.header("Content-Disposition", `attachment; filename="${file.filename}.${file.file_ext ? file.file_ext : ""}"`);

        reply.type(file.mimetype);

        return reply.sendFile(file.disk_filename, `${__dirname}/../../privateuploads`, { contentType: false });
    }
}