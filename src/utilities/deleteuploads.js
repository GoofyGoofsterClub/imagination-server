import fs from 'fs/promises';
import path from 'path';
import { invalidateFileByFilename } from 'utilities/filecache';
import { deletePreviewFiles } from 'utilities/previews';
import { invalidateStatistics } from 'utilities/statistics';
import { clearListCounts } from 'utilities/pagination';

export async function removeUploadFiles(upload) {
    invalidateFileByFilename(upload.filename);
    // Remove the original before previews so an active transform detects deletion.
    await fs.unlink(path.resolve(__dirname, '../../privateuploads', upload.disk_filename)).catch(error => {
        if (error.code !== 'ENOENT') throw error;
    });
    await deletePreviewFiles(upload.disk_filename);
}

export async function deleteUserUploads(db, userId) {
    let deleted = 0;
    while (true) {
        const result = await db.query(`DELETE FROM uwuso.uploads WHERE id IN (
            SELECT id FROM uwuso.uploads WHERE uploader_id = $1::bigint ORDER BY id LIMIT 100
        ) RETURNING filename, disk_filename`, [userId]);
        if (!result.rows.length) break;
        // Bounded filesystem fan-out, rather than thousands of unlinks at once.
        let index = 0;
        await Promise.all(Array.from({ length: Math.min(4, result.rows.length) }, async () => {
            while (index < result.rows.length) await removeUploadFiles(result.rows[index++]);
        }));
        deleted += result.rows.length;
        clearListCounts();
        invalidateStatistics();
    }
    return deleted;
}
