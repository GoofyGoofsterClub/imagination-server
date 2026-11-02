(() => {
    if (!window.webVitals || !navigator.sendBeacon) return;
    const pageType = location.pathname === '/' ? (location.hash.includes('dashboard') ? 'dashboard' : 'home')
        : location.pathname.startsWith('/profile/') ? 'profile' : 'viewer';
    const report = ({ name, value }) => {
        // Deliberately omit URLs, filenames, keys, account identifiers and metric IDs.
        navigator.sendBeacon('/api/public/performance', new Blob([JSON.stringify({ name, value, pageType })], { type: 'application/json' }));
    };
    webVitals.onLCP(report);
    webVitals.onINP(report);
    webVitals.onCLS(report);
})();
