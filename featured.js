(function(){
  document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('featuredProducts');
    if (!container) return;

    const enabled = window.FIREBASE_ENABLED && window.firebaseConfig && window.firebase?.apps !== undefined;
    if (!enabled) return; // keep static fallback

    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(window.firebaseConfig);
      }
      const db = firebase.firestore();
      const snap = await db.collection('featured').orderBy('order', 'asc').limit(12).get();
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (!items.length) return; // keep static if empty

      // Build dynamic markup
      const grid = document.createElement('div');
      grid.className = 'product-list';
      items.forEach(it => {
        const card = document.createElement('div');
        card.className = 'product';
        card.innerHTML = `
          <img src="${it.image}" alt="${it.name}">
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
