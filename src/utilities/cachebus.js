import crypto from 'crypto';
import { withDeadline } from 'utilities/deadline';

const listeners = new Map();
const origin = crypto.randomUUID();
const channel = 'imagination:cache-invalidations:v1';
let publisher = null;
let subscriber = null;

export function onInvalidation(topic, listener) {
    if (!listeners.has(topic)) listeners.set(topic, new Set());
    listeners.get(topic).add(listener);
}

export function invalidate(topic, payload = '') {
    for (const listener of listeners.get(topic) || []) listener(payload);
    if (publisher?.isReady) {
        withDeadline(() => publisher.publish(channel, JSON.stringify({ origin, topic, payload })), 500, 'Cache invalidation').catch(() => {});
    }
}

export function startCacheBus(redis) {
    if (!redis) return;
    publisher = redis;
    const connect = async () => {
        if (subscriber) return;
        subscriber = redis.duplicate({ disableOfflineQueue: true });
        subscriber.on('error', () => {}); // TTLs remain the fallback during outages.
        try {
            await subscriber.connect();
            await subscriber.subscribe(channel, message => {
                if (message.length > 1024) return;
                try {
                    const event = JSON.parse(message);
                    if (event.origin === origin || typeof event.payload !== 'string' || event.payload.length > 256) return;
                    for (const listener of listeners.get(event.topic) || []) listener(event.payload);
                } catch (_) { }
            });
        } catch (_) { }
    };
    if (redis.isReady) connect();
    else redis.once('ready', connect);
}

export async function stopCacheBus() {
    publisher = null;
    if (subscriber) {
        try { await withDeadline(() => subscriber.quit(), 1000, 'Cache subscriber shutdown'); }
        catch (_) { if (subscriber.isOpen) subscriber.disconnect().catch(() => {}); }
        subscriber = null;
    }
}
