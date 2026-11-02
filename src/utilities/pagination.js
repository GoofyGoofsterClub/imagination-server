import AsyncCache from 'utilities/cache';
import { invalidate, onInvalidation } from 'utilities/cachebus';

const counts = new AsyncCache({ ttl: 15000, max: 1000 });
onInvalidation('list-counts', () => counts.clear());

export function cachedCount(key, load) { return counts.get(key, load); }
export function clearListCounts() { invalidate('list-counts'); }
export function encodeCursor(values) { return Buffer.from(JSON.stringify(values)).toString('base64url'); }
export function decodeCursor(value) {
    if (!value) return null;
    if (typeof value !== 'string' || value.length > 1000) throw new Error('Invalid cursor.');
    try {
        const values = JSON.parse(Buffer.from(value, 'base64url').toString());
        if (!Array.isArray(values) || values.length !== 2 || values.some(item => typeof item !== 'string') || !/^\d+$/.test(values[1]))
            throw new Error();
        return values;
    } catch (_) { throw new Error('Invalid cursor.'); }
}
