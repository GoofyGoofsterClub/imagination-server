var keystrokes = '';
const pageLoads = new Map();
const scriptLoads = new Map();
let navigationId = 0;
let currentPage = 'welcome';
let pendingExit = null;
let heroMotionId = 0;

function motionEnabled() {
    return typeof anime === 'function' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function stopPageMotion(content) {
    if (pendingExit) { pendingExit(); pendingExit = null; }
    if (typeof anime === 'function') anime.remove([content, ...content.children]);
    for (const element of [content, ...content.children]) {
        element.style.removeProperty('opacity');
        element.style.removeProperty('transform');
    }
}

function animatePageOut(content) {
    if (!motionEnabled()) return Promise.resolve();
    return new Promise(resolve => {
        pendingExit = resolve;
        anime({
            targets: content, opacity: [1, 0], translateY: [0, 100],
            duration: 200, easing: 'linear',
            complete: () => { if (pendingExit === resolve) pendingExit = null; resolve(); }
        });
    });
}

function animatePageIn(content) {
    if (!motionEnabled()) { stopPageMotion(content); return; }
    const children = [...content.children];
    // Compress the stagger as the page grows; the full reveal stays under 520ms.
    const speed = Math.max(1, children.length / 4);
    anime({ targets: content, opacity: [0, 1], translateY: [100, 0], duration: 200, easing: 'linear' });
    anime({
        targets: children, opacity: [0, 1], translateY: [-30, 0],
        duration: Math.max(40, 100 / speed), easing: 'linear', delay: anime.stagger(120 / speed)
    });
}

document.addEventListener('keydown', (event) => {
    if (/INPUT|TEXTAREA/.test(document.activeElement.tagName) || event.key.length !== 1) return;
    keystrokes = (keystrokes + event.key).slice(-10);
    const image = document.querySelector('.anime-girl');
    if (!image) return;
    for (const [word, filename] of [['arab', 'censored-sagiri.png'], ['tv', 'censored-sagiri2.png'], ['scp', 'scp-sagiri.png']]) {
        if (keystrokes.includes(word)) {
            image.removeAttribute('srcset');
            image.src = AssetUrl('/public/img/' + filename);
            keystrokes = '';
        }
    }
});

function showHero(show, animate = false) {
    const id = ++heroMotionId;
    const hero = document.querySelector('.big-showoff');
    const from = hero.getBoundingClientRect().height;
    if (typeof anime === 'function') anime.remove(hero);
    const finish = () => {
        if (id !== heroMotionId) return;
        document.documentElement.classList.toggle('inner-page', !show);
        hero.style.removeProperty('height');
        hero.style.removeProperty('display');
    };
    if (animate && motionEnabled()) {
        document.documentElement.classList.remove('inner-page');
        hero.style.display = 'block';
        hero.style.removeProperty('height');
        const expandedHeight = hero.getBoundingClientRect().height;
        anime({ targets: hero, height: [from, show ? expandedHeight : 0], duration: 200, easing: 'linear', complete: finish });
    } else finish();
    const image = document.querySelector('.anime-girl');
    if (show && image && !image.hasAttribute('src')) {
        image.srcset = image.dataset.srcset;
        image.sizes = '903px';
        image.src = image.dataset.src;
    }
}

function requestedPage() {
    const value = location.hash.slice(1) || 'welcome';
    return /^[a-z-]+$/.test(value) ? value : 'welcome';
}

function resolvePage(page) {
    return page === 'dashboard' && localStorage.getItem('key') ? 'dashboard-logged' : page;
}

function loadPage(page) {
    if (!pageLoads.has(page)) {
        const pending = AppFetch('/public/popovers/' + page + '.html').then(response => {
            if (!response.ok) throw new Error('Could not load this page. Please try again.');
            return response.text();
        }).catch(error => { pageLoads.delete(page); throw error; });
        pageLoads.set(page, pending);
    }
    return pageLoads.get(page);
}

function loadScript(src) {
    if (!scriptLoads.has(src)) {
        const pending = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            const timeout = setTimeout(() => { script.remove(); reject(new Error('Page script timed out. Please retry.')); }, 10000);
            script.src = src;
            script.onload = () => { clearTimeout(timeout); resolve(); };
            script.onerror = () => { clearTimeout(timeout); script.remove(); reject(new Error('Could not load page controls. Please retry.')); };
            document.head.appendChild(script);
        }).catch(error => { scriptLoads.delete(src); throw error; });
        scriptLoads.set(src, pending);
    }
    return scriptLoads.get(src);
}

async function ApplyPageContent(html, page, id, animate = false) {
    const template = document.createElement('template');
    template.innerHTML = html;
    const scripts = [...template.content.querySelectorAll('preload-script')].map(element => element.getAttribute('src'));
    template.content.querySelectorAll('preload-script').forEach(element => element.remove());
    if (id !== navigationId) return;
    const content = document.querySelector('body > .content');
    content.replaceChildren(template.content);
    Translatable.translateGroup(Translatable.find('body'));
    // Reveal the new page before optional scripts or API calls finish.
    if (animate) animatePageIn(content);
    else stopPageMotion(content);
    await Promise.all(scripts.map(loadScript));
    if (id !== navigationId) return;
    await window.PageInitializers[page]?.();
}

async function ChangePage(page, animate = true) {
    const id = ++navigationId;
    page = resolvePage(page);
    currentPage = page;
    const navPage = page === 'dashboard-logged' ? 'dashboard' : page;
    document.querySelectorAll('.nav-el[data-content]').forEach(element => element.classList.toggle('current', element.dataset.content === navPage));
    showHero(page === 'welcome', animate);
    const content = document.querySelector('body > .content');
    stopPageMotion(content);
    content.setAttribute('aria-busy', 'true');
    try {
        const html = await loadPage(page);
        if (id !== navigationId) return;
        if (animate) await animatePageOut(content);
        if (id !== navigationId) return;
        await ApplyPageContent(html, page, id, animate);
        if (page === 'welcome') GetUploadCount();
    } catch (error) {
        if (id !== navigationId) return;
        stopPageMotion(content);
        const message = document.createElement('p');
        message.textContent = error.message;
        const retry = document.createElement('button');
        retry.className = 'input-button';
        retry.textContent = 'Try again';
        retry.onclick = () => ChangePage(page);
        content.replaceChildren(message, retry);
    } finally {
        if (id === navigationId) content.removeAttribute('aria-busy');
    }
}

function SetContent(html) { document.querySelector('body > .content').innerHTML = html; }

async function GetUploadCount() {
    try {
        const data = await FetchJSON('/api/public/uploads/count');
        const uploads = document.getElementById('__upload_counter');
        const views = document.getElementById('__views_counter');
        if (uploads) uploads.textContent = Number(data.uploads ?? data.count).toLocaleString();
        if (views) views.textContent = Number(data.views ?? 0).toLocaleString();
    } catch (error) { console.warn('Statistics unavailable.', error); }
}

async function initializeLanguage() {
    Translatable.setAvailableLanguages(window.__APP.languages);
    defaultLanguage = window.__APP.translations;
    globalTranslationObject = defaultLanguage;
    const stored = localStorage.getItem('language');
    Translatable.setLanguage(stored || 'en');
    const selector = document.querySelector('#__main_language_select');
    selector.replaceChildren(...availableLanguages.map(language => new Option(language.name, language.code)));
    selector.value = CurrentLanguage;
    const apply = async () => {
        try {
            Translatable.setGlobalTranslationObject(await Translatable.getTranslationObject(CurrentLanguage));
        } catch (error) {
            Translatable.setGlobalTranslationObject(defaultLanguage);
            console.warn('Using default translations.', error);
        }
        document.documentElement.lang = CurrentLanguage === 'jp' ? 'ja' : CurrentLanguage === 'sa' ? 'ar' : CurrentLanguage;
        document.body.style.direction = availableLanguages.find(language => language.code === CurrentLanguage)?.rtl ? 'rtl' : 'initial';
        Translatable.translateGroup(Translatable.find('body'));
    };
    selector.onchange = () => {
        Translatable.setLanguage(selector.value);
        localStorage.setItem('language', CurrentLanguage);
        apply();
    };
    await apply();
}

function initialize() {
    const page = requestedPage();
    showHero(page === 'welcome');
    document.querySelectorAll('.nav-el[data-content]').forEach(element => {
        element.classList.toggle('current', element.dataset.content === page);
        element.onclick = event => {
            event.preventDefault();
            history.replaceState(null, '', '#' + element.dataset.content);
            ChangePage(element.dataset.content);
        };
    });
    initializeLanguage().catch(console.warn);
    if (page === 'welcome') GetUploadCount();
    else ChangePage(page, false);
    window.addEventListener('hashchange', () => ChangePage(requestedPage()));
    // Analytics never gates visible content or controls.
    window.addEventListener('load', () => {
        const script = document.createElement('script');
        script.src = 'https://a.uwu.so/script.js';
        script.dataset.websiteId = '04d5eaa1-173a-4e93-ac90-c1a523f759e9';
        document.head.appendChild(script);
    }, { once: true });
}

initialize();
