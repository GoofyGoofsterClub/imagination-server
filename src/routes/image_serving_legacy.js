import { Route } from "http/routing";
import { getAnnouncement } from "utilities/announcement";
import { isBrowserPageRequest } from "utilities/browser";

export default class ImageServing extends Route {
    constructor() {
        super("/:uploader/:filename", "GET");
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

        const browserImageTypes = [
            "image/avif", "image/bmp", "image/gif", "image/jpeg", "image/png",
            "image/svg+xml", "image/webp", "image/x-icon"
        ];
        const kind = browserImageTypes.includes(file.mimetype) ? "image"
            : file.mimetype.startsWith("video/") ? "video"
                : file.mimetype.startsWith("audio/") ? "audio"
                    : file.mimetype === "application/pdf" ? "pdf" : "other";
        if (!isBrowserPageRequest(request) || kind === "other") {
            if (kind === "other")
                reply.header("Content-Disposition", `attachment; filename="${file.filename}"`);
            reply.type(file.mimetype);
            return reply.sendFile(file.disk_filename, `${__dirname}/../../privateuploads`, { contentType: false });
        }

        const rawUrl = `/raw/${encodeURIComponent(request.params.uploader)}/${encodeURIComponent(file.filename)}`;
        const protocol = request.headers["x-forwarded-proto"] || "http";
        const embedUrl = `${protocol}://${request.headers.host}${rawUrl}`;
        const announcement = await getAnnouncement(server.db);
        return reply.viewAsync("viewer.ejs", {
            filename: file.filename,
            mimetype: file.mimetype,
            kind,
            rawUrl,
            downloadUrl: `${rawUrl}?download=1`,
            embedUrl,
            announcement
        });
    }
}