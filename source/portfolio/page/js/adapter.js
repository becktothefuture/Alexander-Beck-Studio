// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                        PORTFOLIO PAGE ADAPTER                                ║
// ║           Bridges Host UI/Config with the Portfolio Page Logic               ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

// This script is injected into the portfolio page context (or imported if module)
// It listens for Host UI events and updates the Notebook accordingly.

(function() {
    // Wait for Notebook to be available
    const waitForNotebook = setInterval(() => {
        if (window.notebook && window.notebook.init) {
            clearInterval(waitForNotebook);
            initAdapter();
        }
    }, 100);

    function initAdapter() {
        console.log('📒 Portfolio Adapter: Connecting to Host UI...');

        // 1. Theme Synchronization
        // Host uses CSS vars --bg-light / --bg-dark. Notebook uses its own system.
        // We observe Host class changes (dark-mode) or CSS var changes and push to Notebook.
        
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    syncTheme();
                }
            });
        });
        observer.observe(document.documentElement, { attributes: true });
        syncTheme(); // Initial sync

        // 2. Config Panel Bridge
        // The Host Control Panel writes to localStorage 'settings'. 
        // We listen for storage events or poll for changes if on same origin/window.
        // Since we are in the same window, we can hook into the global state if exposed,
        // or just rely on the callbacks defined in control-registry.js (which write directly to window.notebook).
        
        // 3. User Journey Instrumentation
        window.notebook.on('unlock', () => {
            console.log('📒 Notebook: Unlocked');
            // Maybe trigger a host sound or analytics event
        });

        window.notebook.on('page-flip', (pageIndex) => {
            // Sync URL hash if desired
            // history.replaceState(null, null, `#page/${pageIndex}`);
        });
    }

    function syncTheme() {
        const isDark = document.documentElement.classList.contains('dark-mode');
        // Map Host theme to Notebook theme
        if (window.notebook && window.notebook.setTheme) {
            window.notebook.setTheme(isDark ? 'dark' : 'light');
        }
        // Also ensure Notebook background matches Host background
        // Portfolio view uses transparent background mostly, but if it has a backing layer:
        const hostBg = getComputedStyle(document.body).backgroundColor;
        const nbContainer = document.getElementById('notebook-container');
        if (nbContainer) {
            // nbContainer.style.backgroundColor = hostBg; 
            // The portfolio view usually handles its own "desk" color. 
            // We might want to override CSS var --page-background if we want pages to match host?
            // Usually notebook pages are white/cream regardless of dark mode, 
            // but the *desk* (body) changes.
        }
    }

})();
