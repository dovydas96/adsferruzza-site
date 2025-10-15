(function(){
  document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('featuredProducts');
    if (!container) return;

    const enabled = window.FIREBASE_ENABLED && window.firebaseConfig && window.firebase?.apps !== undefined;
    if (!enabled) {
      // If Firebase is off, ensure a friendly empty-state message is shown
      const loading = container.querySelector('.loading');
      if (loading) loading.textContent = 'Prodotti in evidenza in arrivo…';
      else container.textContent = 'Prodotti in evidenza in arrivo…';
      return;
    }

    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(window.firebaseConfig);
      }
      const db = firebase.firestore();
      const snap = await db.collection('featured').orderBy('order', 'asc').limit(12).get();
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (!items.length) {
        const msg = document.createElement('div');
        msg.className = 'empty-state';
        msg.textContent = 'Prodotti in evidenza in arrivo…';
        container.replaceWith(msg);
        return;
      }

      // Build dynamic markup
      const grid = document.createElement('div');
      grid.className = 'product-list';
      items.forEach(it => {
        const card = document.createElement('div');
        card.className = 'product';
        card.innerHTML = `
          <img src="${it.image}" alt="${it.name}" loading="lazy" decoding="async">
          <h3>${it.name}</h3>
          <p>${it.text || ''}</p>
        `;
        grid.appendChild(card);
      });
      container.replaceWith(grid);
    } catch (e) {
      // On any error, leave fallback content
      console.warn('Featured load skipped:', e.message);
    }
  });
})();
