import AsyncCache from "utilities/cache";
import { invalidate, onInvalidation } from 'utilities/cachebus';

const cache = new AsyncCache({ max: 1, stale: true, name: 'statistics' });
onInvalidation('statistics', () => cache.clear());

// The cache is process-wide (one slot); db only matters when the value is (re)loaded.
export function getStatistics(db) {
    return cache.get("totals", async () => {
        const result = await db.query(`SELECT COUNT(id)::bigint AS uploads,
            COALESCE(SUM(views), 0)::bigint AS views FROM uwuso.uploads`);
        const { uploads, views } = result.rows[0];
        // node-pg parses bigint columns as strings; the API contract promises numbers.
        return { count: Number(uploads), uploads: Number(uploads), views: Number(views) };
    });
}

export function invalidateStatistics() { invalidate('statistics'); }
