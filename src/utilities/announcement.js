export async function getAnnouncement(db) {
    const result = await db.query(`
        SELECT message, severity, button_text, button_url
        FROM uwuso.service_announcements
        WHERE id = 1`);
    return result.rows[0] ?? null;
}
