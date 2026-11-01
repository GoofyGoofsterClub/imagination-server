const ANNOUNCEMENT_CACHE_TTL_MS = 10 * 1000;
let announcementCache = { value: undefined, expiresAt: 0 };

export function clearAnnouncementCache() {
    announcementCache = { value: undefined, expiresAt: 0 };
}

export async function getAnnouncement(db) {
    const now = Date.now();
    if (now < announcementCache.expiresAt) return announcementCache.value;
    const result = await db.query(`
        SELECT message, severity, button_text, button_url, image_url
        FROM uwuso.service_announcements
        WHERE id = 1`);
    const value = result.rows[0] ?? null;
    announcementCache = { value, expiresAt: now + ANNOUNCEMENT_CACHE_TTL_MS };
    return value;
}
