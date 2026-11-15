import fs from 'fs/promises';
import path from 'path';
import AsyncCache from 'utilities/cache';
import { invalidate, onInvalidation } from 'utilities/cachebus';

const directory = path.resolve(__dirname, '../../privateuploads');
export const PREVIEW_WIDTHS = [640, 1280];
const METADATA_SUFFIX = '.preview.json';
const PREVIEW_SUFFIXES = [METADATA_SUFFIX, ...PREVIEW_WIDTHS.map((width) => `.preview-${width}.webp`)];
const metadata = new AsyncCache({ max: 10000, name: 'previews' });
onInvalidation('previews', filename => metadata.delete(filename));

export async function getPreview(file) {
    if (!file?.disk_filename) return null;
    return metadata.get(file.disk_filename, async () => {
        try {
            return JSON.parse(await fs.readFile(path.join(directory, file.disk_filename + METADATA_SUFFIX), 'utf8'));
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
            return null;
        }
    });
}

export async function deletePreviewFiles(diskFilename) {
    // Unlink the files before invalidating so a concurrent reload resolves to null.
    await Promise.all(PREVIEW_SUFFIXES.map(suffix =>
        fs.unlink(path.join(directory, diskFilename + suffix)).catch(error => { if (error.code !== 'ENOENT') throw error; })));
    invalidate('previews', diskFilename);
}
