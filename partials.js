// Lightweight client-side include for static sites
// Usage: <div data-include="/partials/header.html"></div>
document.addEventListener('DOMContentLoaded', async () => {
  const nodes = document.querySelectorAll('[data-include]');
  await Promise.all(Array.from(nodes).map(async (el) => {
    const orig = el.getAttribute('data-include');
    if (!orig) return;
    const candidates = [];
    // original as-is
    candidates.push(orig);
    // strip leading slash if present (useful under file:// or local previews)
    const stripped = orig.replace(/^\//, '');
    if (stripped !== orig) candidates.push(stripped);
    // try parent-relative paths for nested pages
    candidates.push('../' + stripped);
    candidates.push('../../' + stripped);
    let loaded = false;
    for (const url of candidates) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const html = await res.text();
        el.innerHTML = html;
        el.setAttribute('data-include-loaded', 'true');
        loaded = true;
        break;
      } catch (e) {
        // try next candidate
        continue;
      }
    }
    if (!loaded) {
      console.warn('Include failed for', orig, 'after trying candidates:', candidates);
      // Minimal fallback header to preserve navigation on previews
      if (el.tagName.toLowerCase() === 'header') {
        el.innerHTML = `
          <div class="logo" style="display:flex;align-items:center;gap:.5rem;">
            <img src="/images/logo.png" alt="AD Sferruzza Pasticceria" width="120" height="29">
          </div>
          <button class="nav-toggle" aria-controls="primary-nav" aria-expanded="false" aria-label="Apri menu">
            <span class="nav-toggle-bar"></span>
            <span class="nav-toggle-bar"></span>
            <span class="nav-toggle-bar"></span>
          </button>
          <nav id="primary-nav" aria-label="Principale">
            <a href="/" class="nav-link">Home</a>
            <a href="/#products" class="nav-link">Prodotti</a>
            <a href="/#about" class="nav-link">La Nostra Storia</a>
            <a href="/#gallery" class="nav-link">Galleria</a>
            <a href="/#contact" class="nav-link">Contatti</a>
            <a href="/blog.html" class="nav-link">Blog</a>
            <span class="nav-underline" aria-hidden="true"></span>
          </nav>
        `;
        el.setAttribute('data-include-loaded', 'fallback');
      }
    }
  }));
  document.dispatchEvent(new CustomEvent('partials:loaded'));
});
