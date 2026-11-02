import { APIRoute } from 'http/routing';
import { recordWebVital } from 'utilities/metrics';

export default class PerformanceRoute extends APIRoute {
    constructor() { super('POST'); }
    async call(request, reply, server) {
        reply.header('Cache-Control', 'no-store');
        if (process.env.ENABLE_RUM !== 'true') { reply.code(404); return {}; }
        const { name, pageType, value } = request.body || {};
        if (!['LCP', 'INP', 'CLS'].includes(name) || !['home', 'dashboard', 'profile', 'viewer'].includes(pageType)
            || typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > (name === 'CLS' ? 100 : 600000)) {
            reply.code(400);
            return { success: false, error: 'Invalid performance metric.' };
        }
        const limit = await server.server._public.PerformanceRateLimiter.hit(request.ip);
        if (!limit.allowed) { reply.code(429).header('Retry-After', limit.retryAfter); return {}; }
        recordWebVital(name, pageType, value);
        reply.code(204);
        return reply.send();
    }
}
