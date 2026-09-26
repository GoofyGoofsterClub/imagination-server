import { APIRoute } from "http/routing";
import { hasPermission, USER_PERMISSIONS } from "utilities/permissions";
import hash from "utilities/hash";
import { getAnnouncement } from "utilities/announcement";

/*--includedoc

@private false
@needsauth true
@adminonly true
@params [(string) key, (string) message, (string) severity, (string) buttonText, (string) buttonUrl]
@returns The saved announcement.
@returnexample { "success": true, "data": { "message": "Maintenance soon", "severity": "warning" } }
Creates or replaces the active service announcement.

*/
export default class AdminAnnouncementAPIRoute extends APIRoute {
    constructor() {
        super("POST");
    }

    async call(request, reply, server) {
        const body = request.body ?? {};
        const user = await server.db.findUserByAccessKey(hash(body.key));
        if (!user || user.banned || !hasPermission(user.permissions, USER_PERMISSIONS.ADMINISTRATOR))
            return { "success": false, "error": "You are not an administrator." };

        const message = typeof body.message === "string" ? body.message.trim() : "";
        const severity = typeof body.severity === "string" ? body.severity.toLowerCase() : "";
        const buttonText = typeof body.buttonText === "string" ? body.buttonText.trim() : "";
        const buttonUrl = typeof body.buttonUrl === "string" ? body.buttonUrl.trim() : "";

        if (!message || message.length > 1000)
            return { "success": false, "error": "Announcement text is required and must be at most 1000 characters." };
        if (!["info", "warning", "critical"].includes(severity))
            return { "success": false, "error": "Severity must be info, warning, or critical." };
        if (buttonText && !buttonUrl)
            return { "success": false, "error": "A button URL is required when button text is provided." };
        if (buttonUrl && !/^https?:\/\//i.test(buttonUrl))
            return { "success": false, "error": "Button URL must use http or https." };
        if (buttonText.length > 100 || buttonUrl.length > 2000)
            return { "success": false, "error": "Announcement button fields are too long." };

        await server.db.query(`
            INSERT INTO uwuso.service_announcements (id, message, severity, button_text, button_url, updated_at)
            VALUES (1, $1::text, $2::text, $3::text, $4::text, NOW())
            ON CONFLICT (id) DO UPDATE SET
                message = EXCLUDED.message,
                severity = EXCLUDED.severity,
                button_text = EXCLUDED.button_text,
                button_url = EXCLUDED.button_url,
                updated_at = EXCLUDED.updated_at`,
            [message, severity, buttonText || null, buttonUrl || null]);

        return { "success": true, "data": await getAnnouncement(server.db) };
    }
}
