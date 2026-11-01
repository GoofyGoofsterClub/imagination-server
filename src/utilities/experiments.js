const RANDOM_CUSTOM_URL_KEY = "experiment_random_custom_url";
const EXPERIMENT_CACHE_TTL_MS = 60 * 1000;
const DOMAIN_PATTERN = /^(?=.{1,253}(:|$))([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(:\d{1,5})?$/;
export const MAX_RANDOM_CUSTOM_URL_DOMAINS = 100;

let experimentCache = { value: undefined, expiresAt: 0 };

export function clearExperimentCache() {
    experimentCache = { value: undefined, expiresAt: 0 };
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
    const now = Date.now();
    if (now < experimentCache.expiresAt) return experimentCache.value;
    const result = await db.query(`SELECT value FROM uwuso.settings WHERE key = $1::text`, [RANDOM_CUSTOM_URL_KEY]);
    let value;
    if (result.rows.length < 1) {
        value = { enabled: false, domains: [] };
    } else {
        try {
            const parsed = JSON.parse(result.rows[0].value);
            value = { enabled: !!parsed.enabled, domains: normalizeDomains(parsed.domains) ?? [] };
        }
        catch (e) {
            value = { enabled: false, domains: [] };
        }
    }
    experimentCache = { value, expiresAt: now + EXPERIMENT_CACHE_TTL_MS };
    return value;
}

export async function setRandomCustomUrlExperiment(db, enabled, domains) {
    const value = { enabled: !!enabled, domains };
    await db.query(`INSERT INTO uwuso.settings (key, value) VALUES ($1::text, $2::text)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, [RANDOM_CUSTOM_URL_KEY, JSON.stringify(value)]);
    clearExperimentCache();
    return value;
}

export async function pickRandomCustomUrl(db) {
    const experiment = await getRandomCustomUrlExperiment(db);
    if (!experiment.enabled || experiment.domains.length < 1) return null;
    return experiment.domains[Math.floor(Math.random() * experiment.domains.length)];
}
