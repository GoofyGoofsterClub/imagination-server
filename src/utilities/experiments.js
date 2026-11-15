import AsyncCache from "utilities/cache";
import { invalidate, onInvalidation } from 'utilities/cachebus';
const RANDOM_CUSTOM_URL_KEY = "experiment_random_custom_url";
const DOMAIN_PATTERN = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
const PORT_PATTERN = /^(?:6553[0-5]|655[0-2][0-9]|65[0-4][0-9]{2}|6[0-4][0-9]{3}|[1-5][0-9]{4}|[1-9][0-9]{0,3})$/;
export const MAX_RANDOM_CUSTOM_URL_DOMAINS = 100;

const experimentCache = new AsyncCache({ max: 1, stale: true, name: 'experiments' });
onInvalidation('experiments', () => experimentCache.clear());

export function clearExperimentCache() {
    invalidate('experiments');
}

function normalizeDomain(domain) {
    if (typeof domain !== "string") return null;
    const normalized = domain.trim().toLowerCase();
    if (normalized.length < 1) return null;
    const separator = normalized.indexOf(":");
    if (separator === -1) return DOMAIN_PATTERN.test(normalized) ? normalized : null;
    const host = normalized.slice(0, separator);
    const port = normalized.slice(separator + 1);
    if (!DOMAIN_PATTERN.test(host) || !PORT_PATTERN.test(port)) return null;
    return `${host}:${port}`;
}

export function isValidDomain(domain) {
    return normalizeDomain(domain) !== null;
}

export function normalizeDomains(domains) {
    if (!Array.isArray(domains)) return null;
    return [...new Set(domains.map(normalizeDomain).filter(Boolean))];
}

export async function getRandomCustomUrlExperiment(db) {
    return experimentCache.get("experiment", async () => {
    const result = await db.query(`SELECT value FROM uwuso.settings WHERE key = $1::text`, [RANDOM_CUSTOM_URL_KEY]);
    let value;
    if (result.rows.length < 1) {
        value = { enabled: false, domains: [] };
    } else {
        try {
            const parsed = JSON.parse(result.rows[0].value);
            value = { enabled: !!parsed.enabled, domains: normalizeDomains(parsed.domains) ?? [] };
        }
        catch (error) {
            console.error(`Invalid random custom URL experiment value for ${RANDOM_CUSTOM_URL_KEY}`, error);
            value = { enabled: false, domains: [] };
        }
    }
    return value;
    });
}

export async function setRandomCustomUrlExperiment(db, enabled, domains) {
    const value = { enabled: !!enabled, domains };
    await db.query(`INSERT INTO uwuso.settings (key, value) VALUES ($1::text, $2::text)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, [RANDOM_CUSTOM_URL_KEY, JSON.stringify(value)]);
    clearExperimentCache();
    return value;
}

export async function pickRandomCustomUrl(db) {
    let experiment;
    try {
        experiment = await getRandomCustomUrlExperiment(db);
    } catch (error) {
        console.error(`[err][experiments] Failed to load the random custom URL experiment: ${error.message}`);
        return null;
    }
    if (!experiment.enabled || experiment.domains.length < 1) return null;
    return experiment.domains[Math.floor(Math.random() * experiment.domains.length)];
}
