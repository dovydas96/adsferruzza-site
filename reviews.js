// One-time init guard in case script is included twice
if (!window.__reviewsInit) window.__reviewsInit = { started: false };

document.addEventListener('DOMContentLoaded', async () => {
  if (window.__reviewsInit.started) return;
  window.__reviewsInit.started = true;
  const section = document.getElementById('reviews');
  if (!section) return;
  const list = section.querySelector('.reviews-list');
  if (!list) return;

  function stars(rating) {
    const full = '★'.repeat(Math.floor(rating));
    const empty = '☆'.repeat(5 - Math.floor(rating));
    return `${full}${empty}`;
  }

  const LIMIT = 200;
  const escapeHTML = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const toHTML = (s) => escapeHTML(s).replace(/\n/g, '<br>');

  try {
    const RES_URL = (location.protocol === 'file:' ? './data/reviews.json' : 'data/reviews.json');
    let data, all;
    try {
      const res = await fetch(RES_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      data = await res.json();
      all = (data && data.reviews) ? data.reviews : [];
    } catch(fetchErr) {
      // Fallback for local dev: provide a tiny sample so UI still renders
      console.warn('[reviews] fallback placeholder used:', fetchErr.message);
      all = [
        { author_name: 'Cliente', rating: 5, text: 'Dolci eccellenti e servizio impeccabile!' },
        { author_name: 'Visitatore', rating: 5, text: 'Cannoli fantastici, tornerò sicuramente.' }
      ];
    }

    if (!all.length) {
      const info = document.createElement('p');
      info.textContent = 'Nessuna recensione disponibile al momento.';
      info.style.opacity = '0.8';
      list.appendChild(info);
      return;
    }

    // Create nav controls once
    let nav = section.querySelector('#reviewsNav');
    if (!nav) {
      nav = document.createElement('div');
      nav.id = 'reviewsNav';
      nav.style.display = 'flex';
      nav.style.justifyContent = 'center';
      nav.style.alignItems = 'center';
      nav.style.gap = '10px';
      nav.style.margin = '0.5rem 0 1rem';
      const prev = document.createElement('button');
      prev.id = 'reviewsPrev';
      prev.className = 'leave-review-btn';
      prev.style.padding = '0.35rem 0.8rem';
      prev.style.borderRadius = '999px';
      prev.textContent = '‹';
      prev.setAttribute('aria-label', 'Recensioni precedenti');
      const next = document.createElement('button');
      next.id = 'reviewsNext';
      next.className = 'leave-review-btn';
      next.style.padding = '0.35rem 0.8rem';
      next.style.borderRadius = '999px';
      next.textContent = '›';
      next.setAttribute('aria-label', 'Altre recensioni');
      nav.appendChild(prev);
      nav.appendChild(next);
      // Place nav after the list, before CTA if present
      list.insertAdjacentElement('afterend', nav);
    }

    let index = 0;
    const getVisible = () => (window.innerWidth <= 900 ? 1 : 3);

    function renderWindow() {
      const visible = Math.min(getVisible(), all.length);
      list.innerHTML = '';
      for (let i = 0; i < visible; i++) {
        const r = all[(index + i) % all.length];
        const div = document.createElement('div');
        div.className = 'review';
        const raw = String(r.text || '');
        const isLong = raw.length > LIMIT;
        const short = isLong ? raw.slice(0, LIMIT).replace(/\s+\S*$/, '') + '…' : raw;
        const shortHTML = toHTML(short);
        const fullHTML = toHTML(raw);
        const body = isLong ? `
          <p class="review-text">
            <span class="short">${shortHTML}</span>
            <span class="full" hidden>${fullHTML}</span>
          </p>
          <button class="review-toggle" aria-expanded="false" aria-label="Mostra recensione completa" style="align-self:flex-start; background:none; border:none; color:#FFD700; cursor:pointer; padding:0; font-weight:600;">Mostra di più</button>
        ` : `
          <p class="review-text">${fullHTML}</p>
        `;
        div.innerHTML = `
          <div class="review-header">
            <span class="reviewer">${escapeHTML(r.author_name || 'Cliente Google')}</span>
            <span class="stars" aria-label="Voto ${r.rating} su 5">${stars(r.rating || 5)}</span>
          </div>
          ${body}
        `;
        list.appendChild(div);
      }

      // Hide nav if not needed
      const prevBtn = section.querySelector('#reviewsPrev');
      const nextBtn = section.querySelector('#reviewsNext');
      const needNav = all.length > getVisible();
      if (prevBtn && nextBtn) {
        prevBtn.style.display = needNav ? '' : 'none';
        nextBtn.style.display = needNav ? '' : 'none';
      }
    }

    // First render
    renderWindow();

    // Toggle delegation (event listener added once per init)
    list.addEventListener('click', (e) => {
      const btn = e.target.closest('.review-toggle');
      if (!btn) return;
      const card = btn.closest('.review');
      if (!card) return;
      const shortEl = card.querySelector('.review-text .short');
      const fullEl = card.querySelector('.review-text .full');
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      if (!expanded) {
        if (shortEl) shortEl.hidden = true;
        if (fullEl) fullEl.hidden = false;
        card.classList.add('expanded');
        btn.setAttribute('aria-expanded', 'true');
        btn.textContent = 'Mostra meno';
      } else {
        if (shortEl) shortEl.hidden = false;
        if (fullEl) fullEl.hidden = true;
        card.classList.remove('expanded');
        btn.setAttribute('aria-expanded', 'false');
        btn.textContent = 'Mostra di più';
      }
    });

    // Nav handlers
    const prevBtn = section.querySelector('#reviewsPrev');
    const nextBtn = section.querySelector('#reviewsNext');
    let navBusy = false;
    const step = 1; // always move by one item
    const debounce = () => { navBusy = true; setTimeout(() => { navBusy = false; }, 180); };
    if (prevBtn && nextBtn) {
      const temporarilyDisable = () => {
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        setTimeout(() => { prevBtn.disabled = false; nextBtn.disabled = false; }, 200);
      };
      prevBtn.addEventListener('click', () => {
        if (navBusy) return;
        index = (index - step + all.length) % all.length;
        renderWindow();
        temporarilyDisable();
        debounce();
      });
      nextBtn.addEventListener('click', () => {
        if (navBusy) return;
        index = (index + step) % all.length;
        renderWindow();
        temporarilyDisable();
        debounce();
      });
    }

    // Responsive updates
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        // keep index aligned to page start
        const step = getVisible();
        index = Math.floor(index / step) * step % all.length;
        renderWindow();
      }, 120);
    });
  } catch (e) {
    console.error('Errore caricamento recensioni:', e);
    // Leave the static reviews in place as fallback
  }
});