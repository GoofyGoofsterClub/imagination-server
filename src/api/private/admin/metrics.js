import { APIRoute } from 'http/routing';
import hash from 'utilities/hash';
import { hasPermission, USER_PERMISSIONS } from 'utilities/permissions';
import { getMetrics } from 'utilities/metrics';

export default class MetricsRoute extends APIRoute {
    constructor() { super('GET'); }
    async call(request, reply, server) {
        const credential = request.headers.authorization || request.query.key;
        if (!credential) {
            reply.code(401);
            return { success: false, error: 'Missing access key.' };
        }
        let user;
        try {
            user = await server.db.findUserByAccessKey(hash(credential));
        } catch (error) {
            reply.code(500);
            return { success: false, error: 'Failed to authenticate request.' };
        }
        if (!user || user.banned || !hasPermission(user.permissions, USER_PERMISSIONS.ADMINISTRATOR)) {
            reply.code(403);
            return { success: false, error: 'Administrator access required.' };
        }
        return { success: true, data: getMetrics(server.db) };
    }
}
