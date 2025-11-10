(function() {
  // The server template sets window.APP_BASE to the static folder (e.g. '/static/').
  const base = (window.APP_BASE || '');
  // Don't load auth pages as partials - they should be standalone
  const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/signup';
  const parts = isAuthPage ? [] : [
    { url: base + 'partials/voice-status.html', target: '#voice-placeholder' },
    { url: base + 'partials/accessibility.html', target: '#accessibility-placeholder' },
    { url: base + 'partials/nav.html', target: '#nav-placeholder' },
    { url: base + 'partials/landing.html', target: '#app' },
    { url: base + 'partials/upload.html', target: '#app' },
    { url: base + 'partials/dashboard.html', target: '#app' },
    { url: base + 'partials/roadmap.html', target: '#app' },
    { url: base + 'partials/interview.html', target: '#app' },
    { url: base + 'partials/collaboration.html', target: '#app' },
    { url: base + 'partials/profile.html', target: '#app' },
    { url: base + 'partials/loading-overlay.html', target: '#loading-overlay-placeholder' },
    { url: base + 'partials/notification-container.html', target: '#notification-container-placeholder' }
  ];

  async function loadPart(part) {
    try {
      const res = await fetch(part.url);
      if (!res.ok) throw new Error('Failed to load ' + part.url);
      const html = await res.text();
      const container = document.querySelector(part.target);
      if (container) {
        // For sections in #app target, add them normally
        container.insertAdjacentHTML('beforeend', html);
        
        // For non-section partials, replace the placeholder
        if (part.target !== '#app') {
          container.outerHTML = html;
        }
      }
      return true;
    } catch (err) {
      console.error('Error loading part:', part.url, err);
      return false;
    }
  }

  async function init() {
    const promises = parts.map(p => loadPart(p));
    const results = await Promise.all(promises);

    const loadingEl = document.getElementById('sections-loading');
    if (loadingEl) loadingEl.remove();

    // Load Chart.js first (from CDN) then the app script
    const chartScript = document.createElement('script');
    chartScript.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    chartScript.onload = () => {
      // APP_BASE may be set by the server template to point to the static folder (e.g. '/static/')
      const base = (window.APP_BASE || '');
      const script = document.createElement('script');
      script.src = base + 'app.js';
      script.defer = true;
      document.body.appendChild(script);
    };
    chartScript.onerror = () => {
      console.error('Failed to load Chart.js from CDN. Charts may not render.');
      const base = (window.APP_BASE || '');
      const script = document.createElement('script');
      script.src = base + 'app.js';
      script.defer = true;
      document.body.appendChild(script);
    };
    document.head.appendChild(chartScript);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
