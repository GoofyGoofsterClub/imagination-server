import { Route } from "http/routing";
import { getAnnouncement } from "utilities/announcement";
import { isBrowserPageRequest } from "utilities/browser";
import { publicBaseUrl } from "utilities/links";
import { getFileByFilename } from "utilities/filecache";
import serveUpload from 'utilities/serveupload';

export default class ImageServing extends Route {
    constructor() {
        super("/:uploader/:filename", "GET");
    }

    async call(request, reply, server) {
        reply.header('Vary', 'Accept, User-Agent');
        reply.header('Cache-Control', 'private, no-cache');
        let file = await getFileByFilename(server.db, request.params.filename);

        if (!file) {
            reply.status(404);
            return reply.viewAsync("error.ejs", {
                "error_title": "Not Found",
                "error_message": "<p>This page doesn't exist.</p><img src='/public/img/uhhh.jpg'>"
            });
        }

        server.server._public.ViewCounter.add(file.id, file.uploader_id);

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
            return serveUpload(reply, file.disk_filename);
        }

        const rawUrl = `/raw/${encodeURIComponent(request.params.uploader)}/${encodeURIComponent(file.filename)}`;
        const embedUrl = `${publicBaseUrl(request)}${rawUrl}`;
        const announcement = await getAnnouncement(server.db).catch(() => null);
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
