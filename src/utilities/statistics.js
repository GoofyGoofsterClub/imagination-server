import AsyncCache from "utilities/cache";
import { invalidate, onInvalidation } from 'utilities/cachebus';

const cache = new AsyncCache({ max: 1, stale: true, name: 'statistics' });
onInvalidation('statistics', () => cache.clear());

// The cache is process-wide (one slot); db only matters when the value is (re)loaded.
export function getStatistics(db) {
    return cache.get("totals", async () => {
        try {
            const result = await db.query(`SELECT COUNT(id)::bigint AS uploads,
                COALESCE(SUM(views), 0)::bigint AS views FROM uwuso.uploads`);
            const { uploads, views } = result.rows[0];
            // node-pg parses bigint columns as strings; the API contract promises numbers.
            return { count: Number(uploads), uploads: Number(uploads), views: Number(views) };
        } catch (error) {
            // Rethrown so the cache falls back to the stale value when one exists.
            console.error(`[err][statistics] Failed to refresh upload statistics: ${error.message}`);
            throw error;
        }
    });
}

export function invalidateStatistics() { invalidate('statistics'); }
