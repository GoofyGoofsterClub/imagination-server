import { Route } from 'http/routing';
import { getFileByFilename } from 'utilities/filecache';
import { getPreview } from 'utilities/previews';
import serveUpload from 'utilities/serveupload';

export default class PreviewRoute extends Route {
    constructor() { super('/preview/:filename/:width', 'GET'); }
    async call(request, reply, server) {
        if (!['640', '1280'].includes(request.params.width)) {
            reply.code(400);
            return { success: false, error: 'Invalid preview width.' };
        }
        const file = await getFileByFilename(server.db, request.params.filename);
        if (!file) { reply.code(404); return { success: false, error: 'File not found.' }; }
        if (!await getPreview(file)) return reply.redirect(`/raw/${encodeURIComponent(file.filename)}`);
        reply.type('image/webp').header('X-Content-Type-Options', 'nosniff');
        return serveUpload(reply, file.disk_filename + `.preview-${request.params.width}.webp`);
    }
}
