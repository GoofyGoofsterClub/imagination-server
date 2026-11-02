function AssetUrl(url) {
    return window.__APP?.assets?.[url] || url;
}

async function AppFetch(url, options = {}) {
    const controller = new AbortController();
    const signal = options.signal ? AbortSignal.any([options.signal, controller.signal]) : controller.signal;
    const timer = setTimeout(() => controller.abort(), options.timeout || 10000);
    try {
        const response = await fetch(AssetUrl(url), { ...options, signal });
        // Keep the deadline active through body consumption, not only response headers.
        const body = await response.arrayBuffer();
        return new Response(response.status === 204 || response.status === 304 ? null : body, {
            status: response.status, statusText: response.statusText, headers: response.headers
        });
    } finally {
        clearTimeout(timer);
    }
}

async function FetchJSON(url, options) {
    const response = await AppFetch(url, options);
    const data = await response.json();
    if (!response.ok) {
        const error = new Error(data.error || `Request failed (${response.status}).`);
        error.status = response.status;
        error.retryAfter = response.headers.get('Retry-After');
        throw error;
    }
    return data;
}

window.PageInitializers = window.PageInitializers || {};
