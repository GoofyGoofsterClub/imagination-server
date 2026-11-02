import AsyncCache from "utilities/cache";

const fileCache = new AsyncCache({ max: 10000 });

export function getFileByFilename(db, filename) {
    return fileCache.get(filename, async () => {
        const result = await db.query(`SELECT id, uploader_id, filename, disk_filename, mimetype
            FROM uwuso.uploads WHERE filename = $1::text LIMIT 1`, [filename]);
        // Cache misses too, so repeated nonexistent URLs cannot hammer PostgreSQL.
        return result.rows[0] ?? null;
    });
}

export function invalidateFileByFilename(filename) { fileCache.delete(filename); }
export function invalidateAllFiles() { fileCache.clear(); }
