import fs from 'fs/promises';
import path from 'path';
import { invalidateFileByFilename } from 'utilities/filecache';
import { deletePreviewFiles } from 'utilities/previews';
import { invalidateStatistics } from 'utilities/statistics';
import { clearListCounts } from 'utilities/pagination';

const DELETE_BATCH_SIZE = 100;
const UNLINK_WORKERS = 4;

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
        const result = await db.query(`SELECT id, filename, disk_filename FROM uwuso.uploads
            WHERE uploader_id = $1::bigint ORDER BY id LIMIT ${DELETE_BATCH_SIZE}`, [userId]);
        if (!result.rows.length) break;
        // Unlink the files before deleting the rows so a failed request can be retried.
        let index = 0;
        await Promise.all(Array.from({ length: Math.min(UNLINK_WORKERS, result.rows.length) }, async () => {
            while (index < result.rows.length) await removeUploadFiles(result.rows[index++]);
        }));
        await db.query(`DELETE FROM uwuso.uploads WHERE id = ANY($1::bigint[])`, [result.rows.map(row => row.id)]);
        deleted += result.rows.length;
        clearListCounts();
        invalidateStatistics();
    }
    return deleted;
}