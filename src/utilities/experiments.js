import AsyncCache from "utilities/cache";
import { invalidate, onInvalidation } from 'utilities/cachebus';
const RANDOM_CUSTOM_URL_KEY = "experiment_random_custom_url";
const DOMAIN_PATTERN = /^(?=.{1,253}(:|$))([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(:\d{1,5})?$/;
export const MAX_RANDOM_CUSTOM_URL_DOMAINS = 100;

const experimentCache = new AsyncCache({ max: 1, stale: true, name: 'experiments' });
onInvalidation('experiments', () => experimentCache.clear());

export function clearExperimentCache() {
    invalidate('experiments');
}

export function isValidDomain(domain) {
    if (typeof domain !== "string") return false;
    const normalized = domain.trim().toLowerCase();
    return normalized.length > 0 && DOMAIN_PATTERN.test(normalized);
}

export function normalizeDomains(domains) {
    if (!Array.isArray(domains)) return null;
    const normalized = [...new Set(domains
        .filter((domain) => typeof domain === "string")
        .map((domain) => domain.trim().toLowerCase())
        .filter((domain) => domain.length > 0))];
    if (normalized.some((domain) => !DOMAIN_PATTERN.test(domain))) return null;
    return normalized;
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
