import AsyncCache from "utilities/cache";
import { invalidate, onInvalidation } from 'utilities/cachebus';
const announcementCache = new AsyncCache({ ttl: 10000, max: 1, stale: true });
onInvalidation('announcement', () => announcementCache.clear());

export function clearAnnouncementCache() {
    invalidate('announcement');
}

export async function getAnnouncement(db) {
    return announcementCache.get("announcement", async () => {
    const result = await db.query(`
        SELECT message, severity, button_text, button_url, image_url
        FROM uwuso.service_announcements
        WHERE id = 1`);
        return result.rows[0] ?? null;
    });
}
