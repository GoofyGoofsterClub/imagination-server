import path from 'path';
import { stat } from 'fs/promises';
import { Route } from 'http/routing';
import { getFileByFilename } from 'utilities/filecache';
import { getPreview, PREVIEW_WIDTHS } from 'utilities/previews';
import serveUpload from 'utilities/serveupload';

export default class PreviewRoute extends Route {
    constructor() { super('/preview/:filename/:width', 'GET'); }
    async call(request, reply, server) {
        if (!PREVIEW_WIDTHS.includes(Number(request.params.width))) {
            reply.code(400);
            return { success: false, error: 'Invalid preview width.' };
        }
        const file = await getFileByFilename(server.db, request.params.filename);
        if (!file) { reply.code(404); return { success: false, error: 'File not found.' }; }
        if (!await getPreview(file)) return reply.redirect(`/raw/${encodeURIComponent(file.filename)}`);
        const previewFilename = file.disk_filename + `.preview-${request.params.width}.webp`;
        try {
            await stat(path.resolve(__dirname, '../../privateuploads', previewFilename));
        } catch {
            // The metadata exists but this width was never generated (or was lost);
            // fall back to the original file instead of failing to serve.
            return reply.redirect(`/raw/${encodeURIComponent(file.filename)}`);
        }
        reply.type('image/webp').header('X-Content-Type-Options', 'nosniff');
        return serveUpload(reply, previewFilename);
    }
}
