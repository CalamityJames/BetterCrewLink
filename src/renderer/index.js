"use strict";
if (typeof window !== 'undefined' && window.location) {
    const query = new URLSearchParams(window.location.search.substring(1));
    console.log('HEY');
    const view = query.get('view') || 'app';
    if (view === 'app') {
        import('./App');
    }
    else if (view === 'lobbies') {
        import('./LobbyBrowser/LobbyBrowserContainer');
    }
    else {
        import('./Overlay');
    }
}
//# sourceMappingURL=index.js.map