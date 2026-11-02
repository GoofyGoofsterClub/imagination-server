import AsyncCache from "utilities/cache";
import { invalidate, onInvalidation } from 'utilities/cachebus';

const cache = new AsyncCache({ max: 1, stale: true });
onInvalidation('statistics', () => cache.clear());

export function getStatistics(db) {
    return cache.get("totals", async () => {
        const result = await db.query(`SELECT COUNT(id)::bigint AS uploads,
            COALESCE(SUM(views), 0)::bigint AS views FROM uwuso.uploads`);
        const uploads = result.rows[0].uploads;
        return { count: uploads, uploads, views: result.rows[0].views };
    });
}

export function invalidateStatistics() { invalidate('statistics'); }
