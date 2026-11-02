import AsyncCache from "utilities/cache";
const announcementCache = new AsyncCache({ ttl: 10000, max: 1, stale: true });

export function clearAnnouncementCache() {
    announcementCache.clear();
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
