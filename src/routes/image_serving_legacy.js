import { Route } from "http/routing";
import { getAnnouncement } from "utilities/announcement";
import { isBrowserPageRequest } from "utilities/browser";
import { publicBaseUrl, DOWNLOAD_QUERY } from "utilities/links";
import { getFileByFilename } from "utilities/filecache";
import serveUpload from 'utilities/serveupload';
import downloadFilename from 'utilities/downloadfilename';

const browserImageTypes = new Set([
    "image/avif", "image/bmp", "image/gif", "image/jpeg", "image/png",
    "image/svg+xml", "image/webp", "image/x-icon"
]);

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

        const mimetype = file.mimetype ?? "";
        let kind;
        if (browserImageTypes.has(mimetype))
            kind = "image";
        else if (mimetype.startsWith("video/"))
            kind = "video";
        else if (mimetype.startsWith("audio/"))
            kind = "audio";
        else if (mimetype === "application/pdf")
            kind = "pdf";
        else
            kind = "other";
        if (!isBrowserPageRequest(request) || kind === "other") {
            if (kind === "other")
                reply.header("Content-Disposition", `attachment; filename="${downloadFilename(file)}"`);
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
            downloadUrl: `${rawUrl}?download=${DOWNLOAD_QUERY}`,
            embedUrl,
            announcement
        });
    }
}
