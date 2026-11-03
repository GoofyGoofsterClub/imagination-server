import fs from 'fs/promises';
import path from 'path';
import AsyncCache from 'utilities/cache';
import { invalidate, onInvalidation } from 'utilities/cachebus';

const directory = path.resolve(__dirname, '../../privateuploads');
const metadata = new AsyncCache({ max: 10000, name: 'previews' });
onInvalidation('previews', filename => metadata.delete(filename));

export async function getPreview(file) {
    return metadata.get(file.disk_filename, async () => {
        try { return JSON.parse(await fs.readFile(path.join(directory, file.disk_filename + '.preview.json'), 'utf8')); }
        catch (_) { return null; }
    });
}

export async function deletePreviewFiles(diskFilename) {
    invalidate('previews', diskFilename);
    await Promise.all(['.preview.json', '.preview-640.webp', '.preview-1280.webp'].map(suffix =>
        fs.unlink(path.join(directory, diskFilename + suffix)).catch(error => { if (error.code !== 'ENOENT') throw error; })));
}
