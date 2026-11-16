import { Route } from "http/routing";
import { getFileByFilename } from "utilities/filecache";
import serveUpload from 'utilities/serveupload';
import downloadFilename from 'utilities/downloadfilename';

const DOCUMENT_MIMETYPES = new Set([
    "text/html", "application/xhtml+xml", "text/xhtml", "text/xml", "application/xml",
    "text/xsl", "application/xslt+xml", "text/xslt", "image/svg+xml", "application/rss+xml", "application/atom+xml"
]);
const INLINE_TEXT_MIMETYPES = new Set(["text/plain", "text/csv", "text/css"]);
const isDocumentMimetype = (mimetype) => {
    // Stored part Content-Types can carry parameters (text/plain; charset=utf-8),
    // which exact Set lookups would miss.
    const normalized = (mimetype || "").split(";")[0].trim().toLowerCase();
    return DOCUMENT_MIMETYPES.has(normalized) || (/^text\//.test(normalized) && !INLINE_TEXT_MIMETYPES.has(normalized));
};

export default class RawNewImageServing extends Route {
    constructor() {
        super("/raw/:filename", "GET");
    }

    async call(request, reply, server) {
        const file = await getFileByFilename(server.db, request.params.filename);
        if (!file) {
            reply.status(404);
            return reply.viewAsync("error.ejs", { error_title: "Not Found", error_message: "<p>This file does not exist.</p>" });
        }

        // Uploads without a recognizable extension can be stored with a null
        // mimetype; fall back to a neutral binary type so the header is always set.
        const mimetype = file.mimetype || "application/octet-stream";
        reply.header("X-Content-Type-Options", "nosniff");
        if (request.query.download === "1" || isDocumentMimetype(mimetype))
            reply.header("Content-Disposition", `attachment; filename="${downloadFilename(file)}"`);
        reply.type(mimetype);
        return serveUpload(reply, file.disk_filename);
    }
}
