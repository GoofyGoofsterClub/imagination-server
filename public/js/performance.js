(() => {
    if (!window.webVitals || !navigator.sendBeacon) return;
    const PERFORMANCE_ENDPOINT = '/api/public/performance';
    const pageType = (() => {
        if (location.pathname === '/') return location.hash.includes('dashboard') ? 'dashboard' : 'home';
        if (location.pathname.startsWith('/profile/')) return 'profile';
        return 'viewer';
    })();
    const report = ({ name, value }) => {
        // Deliberately omit URLs, filenames, keys, account identifiers and metric IDs.
        const blob = new Blob([JSON.stringify({ name, value, pageType })], { type: 'application/json' });
        if (!navigator.sendBeacon(PERFORMANCE_ENDPOINT, blob)) {
            // The beacon could not be queued (navigation race, size quota); try a keepalive fetch instead.
            fetch(PERFORMANCE_ENDPOINT, { method: 'POST', body: blob, keepalive: true }).catch(() => {});
        }
    };
    webVitals.onLCP(report);
    webVitals.onINP(report);
    webVitals.onCLS(report);
})();