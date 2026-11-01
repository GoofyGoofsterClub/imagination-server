const FILE_CACHE_TTL_MS = 60 * 1000;
const FILE_CACHE_MAX = 10000;

/**
 * Bounded TTL cache for upload metadata lookups by filename.
 * The served columns (id, uploader_id, filename, disk_filename, mimetype)
 * are immutable after upload, so a short TTL is safe; entries are also
 * evicted explicitly when a file is deleted.
 */
const fileCache = new Map();

function evictExpired() {
    if (fileCache.size < FILE_CACHE_MAX) return;
    const now = Date.now();
    for (const [key, entry] of fileCache)
        if (now >= entry.expiresAt) fileCache.delete(key);
    // Still over the cap: drop the oldest entries (Map preserves insertion order)
    for (const key of fileCache.keys()) {
        if (fileCache.size < FILE_CACHE_MAX) break;
        fileCache.delete(key);
    }
}

export function getFileByFilename(db, filename) {
    const now = Date.now();
    const cached = fileCache.get(filename);
    if (cached && now < cached.expiresAt) {
        // Refresh position so eviction drops least-recently-used entries
        fileCache.delete(filename);
        fileCache.set(filename, cached);
        return Promise.resolve(cached.row);
    }
    return db.query(`SELECT id, uploader_id, filename, disk_filename, mimetype FROM uwuso.uploads WHERE filename = $1::text LIMIT 1`, [filename])
        .then((result) => {
            if (result.rows.length > 0) {
                evictExpired();
                fileCache.set(filename, { row: result.rows[0], expiresAt: now + FILE_CACHE_TTL_MS });
            }
            return result.rows[0];
        });
}

export function invalidateFileByFilename(filename) {
    fileCache.delete(filename);
}

export function invalidateAllFiles() {
    fileCache.clear();
}
