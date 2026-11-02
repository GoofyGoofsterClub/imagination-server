import NewDatabaseController from 'db/db';
import { generatePreview, getPreview } from 'utilities/previews';

async function backfill() {
    const db = new NewDatabaseController();
    let cursor = '0';
    let generated = 0;
    try {
        while (true) {
            const result = await db.query(`SELECT id, disk_filename, mimetype FROM uwuso.uploads
                WHERE id > $1::bigint AND mimetype = ANY($2::text[]) ORDER BY id LIMIT 100`,
                [cursor, ['image/jpeg', 'image/png', 'image/webp', 'image/avif']]);
            if (!result.rows.length) break;
            for (const file of result.rows) {
                cursor = file.id;
                if (await getPreview(file)) continue;
                try { if (await generatePreview(file)) generated++; }
                catch (_) { console.warn(`Could not generate preview for upload ${file.id}; original is unchanged.`); }
            }
        }
        console.log(`Generated previews for ${generated} uploads.`);
    } finally { await db.pool.end(); }
}

backfill().catch(error => { console.error(error.message); process.exitCode = 1; });
