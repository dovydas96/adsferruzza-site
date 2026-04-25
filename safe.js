// Shared safety helpers for rendering untrusted content from Firestore.
// Available globally as window.safe.
(function(){
  function escapeHTML(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Only allow http(s) or data: image URLs. Blocks javascript: and similar.
  function safeImageURL(u) {
    if (!u || typeof u !== 'string') return '';
    const trimmed = u.trim();
    if (/^(https?:|data:image\/)/i.test(trimmed)) return escapeHTML(trimmed);
    return '';
  }

  window.safe = { escapeHTML, safeImageURL };
})();
