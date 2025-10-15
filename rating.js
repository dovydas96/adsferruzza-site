// rating.js - dynamically inject Google rating & review count into DOM and JSON-LD
// Assumptions: /data/reviews.json is produced by scheduled workflow with shape:
// { reviews: [ { rating: number, text: string, ... }, ... ], averageRating?: number }
// Will compute average if not provided; rounds to one decimal for display.

(async function(){
  const DATA_URL = (location.protocol === 'file:' ? './data/reviews.json' : '/data/reviews.json');
  try {
    const res = await fetch(DATA_URL, { cache: 'no-store' });
    if(!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    let list = Array.isArray(json.reviews) ? json.reviews : [];
    if(!list.length && location.protocol === 'file:') {
      // Provide dev placeholder list when offline locally
      list = [
        { rating: 5, text: 'Prodotti artigianali deliziosi.' },
        { rating: 5, text: 'Qualità straordinaria e cordialità.' }
      ];
    }
    if(!list.length) return; // nothing to inject
    let rating = typeof json.averageRating === 'number' ? json.averageRating : (list.reduce((a,r)=>a + (Number(r.rating)||0),0) / list.length);
    if(!isFinite(rating) || rating <= 0) return;
    rating = Math.round(rating * 10)/10; // one decimal

  // 1. Inject small UI element only if a page explicitly opts in with [data-rating-badge-target]
  let badge = document.querySelector('[data-rating-badge]');
  const target = document.querySelector('[data-rating-badge-target]');
  if(target) {
      if(!badge) {
        badge = document.createElement('div');
        badge.setAttribute('data-rating-badge','');
        badge.style.fontSize = '0.95rem';
        badge.style.display = 'inline-flex';
        badge.style.alignItems = 'center';
        badge.style.gap = '0.35rem';
        badge.style.background = 'rgba(255,226,161,0.15)';
        badge.style.padding = '0.4rem 0.65rem';
        badge.style.borderRadius = '999px';
        badge.style.border = '1px solid rgba(255,226,161,0.4)';
      }
      // If target is a heading, place the badge right after it; else append inside.
      if(/H\d/i.test(target.tagName)) target.insertAdjacentElement('afterend', badge); else target.appendChild(badge);
      const star = '★';
      badge.textContent = `${rating.toFixed(1)} ${star} (${list.length} recensioni su Google)`;
      badge.setAttribute('aria-label', `Valutazione media ${rating.toFixed(1)} su 5 basata su ${list.length} recensioni su Google`);
    }

    // 2. Update existing JSON-LD Bakery block's AggregateRating if present
    const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    for(const s of scripts) {
      try {
        const data = JSON.parse(s.textContent.trim());
        if(data && (data['@type']==='Bakery' || data['@type']==='LocalBusiness')) {
          data.aggregateRating = {
            '@type':'AggregateRating',
            ratingValue: rating.toFixed(1),
            reviewCount: list.length
          };
          s.textContent = JSON.stringify(data);
        }
      } catch(_) {/* ignore malformed */}
    }
  } catch(err) {
    console.warn('[rating] skip:', err.message);
  }
})();
