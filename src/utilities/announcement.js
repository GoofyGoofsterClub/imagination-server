import AsyncCache from "utilities/cache";
import { invalidate, onInvalidation } from 'utilities/cachebus';
const announcementCache = new AsyncCache({ ttl: 10000, max: 1, stale: true, name: 'announcements' });
onInvalidation('announcement', () => announcementCache.clear());

export const ACTIVE_ANNOUNCEMENT_ID = 1;

export function clearAnnouncementCache() {
    invalidate('announcement');
}

export async function getAnnouncement(db) {
    return announcementCache.get("announcement", async () => {
    try {
        const result = await db.query(`
            SELECT message, severity, button_text, button_url, image_url
            FROM uwuso.service_announcements
            WHERE id = ${ACTIVE_ANNOUNCEMENT_ID}`);
        return result.rows[0] ?? null;
    } catch (error) {
        console.error(`[err][announcement] Failed to load the announcement: ${error.message}`);
        return null;
    }
    });
}
