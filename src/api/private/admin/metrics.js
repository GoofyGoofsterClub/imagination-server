import { APIRoute } from 'http/routing';
import hash from 'utilities/hash';
import { hasPermission, USER_PERMISSIONS } from 'utilities/permissions';
import { getMetrics } from 'utilities/metrics';

export default class MetricsRoute extends APIRoute {
    constructor() { super('GET'); }
    async call(request, reply, server) {
        const user = await server.db.findUserByAccessKey(hash(request.headers.authorization || request.query.key));
        if (!user || user.banned || !hasPermission(user.permissions, USER_PERMISSIONS.ADMINISTRATOR)) {
            reply.code(403);
            return { success: false, error: 'Administrator access required.' };
        }
        return { success: true, data: getMetrics(server.db) };
    }
}
