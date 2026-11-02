import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import AsyncCache from 'utilities/cache';
import { invalidate, onInvalidation } from 'utilities/cachebus';

const directory = path.resolve(__dirname, '../../privateuploads');
const supported = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const metadata = new AsyncCache({ max: 10000 });
onInvalidation('previews', filename => metadata.delete(filename));
const queue = new Map();
let running = false;
let worker = Promise.resolve();

export async function getPreview(file) {
    return metadata.get(file.disk_filename, async () => {
        try { return JSON.parse(await fs.readFile(path.join(directory, file.disk_filename + '.preview.json'), 'utf8')); }
        catch (_) { return null; }
    });
}

export async function generatePreview(file) {
    if (!supported.has(file.mimetype)) return false;
    const original = path.join(directory, file.disk_filename);
    const image = sharp(original, { limitInputPixels: 40000000, sequentialRead: true });
    const info = await image.metadata();
    // Never replace animations with a static first frame.
    if ((info.pages || 1) > 1) return false;
    const outputs = [];
    try {
        for (const width of [640, 1280]) {
            const output = original + `.preview-${width}.webp`;
            outputs.push(output);
            await image.clone().rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 82 }).toFile(output);
        }
        // Ensure deletion racing with a background transform cannot leave orphan previews.
        await fs.access(original);
        const rotated = [5, 6, 7, 8].includes(info.orientation);
        const value = { width: rotated ? info.height : info.width, height: rotated ? info.width : info.height };
        const marker = original + '.preview.json';
        outputs.push(marker);
        await fs.writeFile(marker, JSON.stringify(value));
        await fs.access(original);
        invalidate('previews', file.disk_filename);
        return true;
    } catch (error) {
        await Promise.all(outputs.map(output => fs.unlink(output).catch(() => {})));
        throw error;
    }
}

export function enqueuePreview(file) {
    if (process.env.GENERATE_PREVIEWS === 'false' || !supported.has(file.mimetype) || queue.size >= 100) return;
    queue.set(file.disk_filename, file);
    if (running) return;
    running = true;
    // Native transforms run off the JS thread, serially, and never gate upload responses.
    worker = (async () => {
        while (queue.size) {
            const [key, next] = queue.entries().next().value;
            queue.delete(key);
            try { await generatePreview(next); }
            catch (_) { /* Unsupported/corrupt images keep their original-file viewer. */ }
        }
    })().finally(() => { running = false; });
}

export async function stopPreviews() { queue.clear(); await worker; }

export async function deletePreviewFiles(diskFilename) {
    queue.delete(diskFilename);
    invalidate('previews', diskFilename);
    await Promise.all(['.preview.json', '.preview-640.webp', '.preview-1280.webp'].map(suffix =>
        fs.unlink(path.join(directory, diskFilename + suffix)).catch(error => { if (error.code !== 'ENOENT') throw error; })));
}
