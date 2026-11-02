import AsyncCache from "utilities/cache";
import { invalidate, onInvalidation } from 'utilities/cachebus';

const fileCache = new AsyncCache({ max: 10000 });
onInvalidation('files', filename => filename ? fileCache.delete(filename) : fileCache.clear());

export function getFileByFilename(db, filename) {
    return fileCache.get(filename, async () => {
        const result = await db.query(`SELECT id, uploader_id, filename, disk_filename, mimetype
            FROM uwuso.uploads WHERE filename = $1::text LIMIT 1`, [filename]);
        // Cache misses too, so repeated nonexistent URLs cannot hammer PostgreSQL.
        return result.rows[0] ?? null;
    });
}

export function invalidateFileByFilename(filename) { invalidate('files', filename); }
export function invalidateAllFiles() { invalidate('files'); }
