import path from 'path';

export default function serveUpload(reply, diskFilename, maxAge = 60000) {
    const prefix = process.env.MEDIA_ACCEL_PREFIX;
    if (prefix && /^\/[A-Za-z0-9_/-]+\/$/.test(prefix) && /^[A-Za-z0-9._~-]+$/.test(diskFilename) && !diskFilename.includes('..')) {
        reply.header('X-Accel-Redirect', prefix + encodeURIComponent(diskFilename));
        if (!reply.hasHeader('Cache-Control')) reply.header('Cache-Control', 'public, max-age=' + Math.floor(maxAge / 1000));
        return reply.send();
    }
    return reply.sendFile(diskFilename, path.resolve(__dirname, '../../privateuploads'), { contentType: false, maxAge });
}
