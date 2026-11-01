import { Route } from "http/routing";
import { getFileByFilename } from "utilities/filecache";

const DOCUMENT_MIMETYPES = new Set([
    "text/html", "application/xhtml+xml", "text/xhtml", "text/xml", "application/xml",
    "text/xsl", "application/xslt+xml", "text/xslt", "image/svg+xml", "application/rss+xml", "application/atom+xml"
]);
const INLINE_TEXT_MIMETYPES = new Set(["text/plain", "text/csv", "text/css"]);
const isDocumentMimetype = (mimetype) =>
    DOCUMENT_MIMETYPES.has(mimetype) || (/^text\//.test(mimetype) && !INLINE_TEXT_MIMETYPES.has(mimetype));

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

        reply.header("X-Content-Type-Options", "nosniff");
        if (request.query.download === "1" || isDocumentMimetype(file.mimetype))
            reply.header("Content-Disposition", `attachment; filename="${file.filename}"`);
        reply.type(file.mimetype);
        return reply.sendFile(file.disk_filename, `${__dirname}/../../privateuploads`, { contentType: false });
    }
}
