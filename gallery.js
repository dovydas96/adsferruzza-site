document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.querySelector('.gallery-grid');
  if (!grid) return;

  // Only use Firebase sources; do not show any static DOM fallback
  if (!(window.FIREBASE_ENABLED && window.firebase && firebase.apps && firebase.apps.length)) {
    console.warn('[Gallery] Firebase not available or disabled. No images will be shown.');
    return;
  }

  // Try Firestore first
  try {
    const db = firebase.firestore();
    const snap = await db.collection('gallery').orderBy('uploadedAt', 'desc').get();
    const photos = snap.docs.map(d => d.data()).filter(p => p && p.url);
    if (photos.length) {
      grid.innerHTML = '';
      photos.forEach(p => {
        const img = document.createElement('img');
        img.src = p.url;
        img.alt = p.alt || 'Foto galleria';
        img.className = 'gallery-img';
        img.tabIndex = 0;
        grid.appendChild(img);
      });
      return;
    }
    console.warn('[Gallery] No Firestore images found. Falling back to Storage.');
  } catch (err) {
    console.warn('[Gallery] Firestore load failed, trying Storage:', err && err.message);
  }

  // Fallback to Firebase Storage listing (still Firebase-only)
  try {
    if (!firebase.storage) {
      console.warn('[Gallery] Storage SDK unavailable.');
      return;
    }
    const storage = firebase.storage();
    const listRef = storage.ref().child('gallery');
    const acc = [];
    let page = await listRef.list({ maxResults: 1000 });
    acc.push(...page.items);
    while (page.nextPageToken) {
      page = await listRef.list({ maxResults: 1000, pageToken: page.nextPageToken });
      acc.push(...page.items);
    }
    if (!acc.length) {
      console.warn('[Gallery] No Storage images found.');
      return;
    }
    grid.innerHTML = '';
    for (const itemRef of acc.reverse()) {
      try {
        const url = await itemRef.getDownloadURL();
        const img = document.createElement('img');
        img.src = url;
        img.alt = 'Foto galleria';
        img.className = 'gallery-img';
        img.tabIndex = 0;
        grid.appendChild(img);
      } catch (_) { /* skip broken objects */ }
    }
  } catch (e) {
    console.warn('[Gallery] Storage listing failed:', e && e.message);
  }
});