document.addEventListener('DOMContentLoaded', async () => {
  const enabled = window.FIREBASE_ENABLED && window.firebaseConfig && firebase?.apps !== undefined;
  const fbWarn = document.getElementById('fbWarn');
  if (!enabled) { fbWarn.classList.remove('hidden'); return; }
  fbWarn.classList.add('hidden');

  // Init Firebase (idempotent)
  if (!firebase.apps.length) {
    firebase.initializeApp(window.firebaseConfig);
  }
  const auth = firebase.auth();
  const db = firebase.firestore();
  const storage = firebase.storage();

  // UI refs
  const authLoggedOut = document.getElementById('authLoggedOut');
  const authLoggedIn = document.getElementById('authLoggedIn');
  const userEmail = document.getElementById('userEmail');
  const btnLogin = document.getElementById('btnLogin');
  const btnRegister = document.getElementById('btnRegister');
  const btnLogout = document.getElementById('btnLogout');
  const email = document.getElementById('email');
  const password = document.getElementById('password');
  const postCard = document.getElementById('postCard');
  const postManageCard = document.getElementById('postManageCard');
  const photoCard = document.getElementById('photoCard');
  const featuredCard = document.getElementById('featuredCard');
  const featuredManageCard = document.getElementById('featuredManageCard');

  function setAuthed(user) {
    if (user) {
      // Optional allowlist check
      const allow = Array.isArray(window.ADMIN_EMAIL_ALLOWLIST) && window.ADMIN_EMAIL_ALLOWLIST.length
        ? window.ADMIN_EMAIL_ALLOWLIST.includes(user.email || '')
        : true;
      if (!allow) {
        alert('Questo utente non è autorizzato all\'area admin.');
        auth.signOut();
        return;
      }
      authLoggedOut.classList.add('hidden');
      authLoggedIn.classList.remove('hidden');
      userEmail.textContent = user.email || '';
      postCard.classList.remove('hidden');
      postManageCard && postManageCard.classList.remove('hidden');
  photoCard.classList.remove('hidden');
  featuredCard && featuredCard.classList.remove('hidden');
  featuredManageCard && featuredManageCard.classList.remove('hidden');
    } else {
      authLoggedOut.classList.remove('hidden');
      authLoggedIn.classList.add('hidden');
      postCard.classList.add('hidden');
      postManageCard && postManageCard.classList.add('hidden');
  photoCard.classList.add('hidden');
  featuredCard && featuredCard.classList.add('hidden');
  featuredManageCard && featuredManageCard.classList.add('hidden');
    }
  }

  auth.onAuthStateChanged((u) => setAuthed(u));

  btnLogin.addEventListener('click', async () => {
    try { await auth.signInWithEmailAndPassword(email.value.trim(), password.value); }
    catch (e) { alert('Accesso fallito: ' + e.message); }
  });
  btnRegister.addEventListener('click', async () => {
    try { await auth.createUserWithEmailAndPassword(email.value.trim(), password.value); alert('Utente registrato.'); }
    catch (e) { alert('Registrazione fallita: ' + e.message); }
  });
  btnLogout.addEventListener('click', async () => { await auth.signOut(); });

  // Post publishing
  const postTitle = document.getElementById('postTitle');
  const postExcerpt = document.getElementById('postExcerpt');
  const postReadTime = document.getElementById('postReadTime');
  const postDate = document.getElementById('postDate');
  const postContent = document.getElementById('postContent');
  const postImage = document.getElementById('postImage');
  const postSeoTitle = document.getElementById('postSeoTitle');
  const postSeoDescription = document.getElementById('postSeoDescription');
  const postOgImage = document.getElementById('postOgImage');
  const btnPublishPost = document.getElementById('btnPublishPost');
  const btnCancelEdit = document.getElementById('btnCancelEdit');
  const postStatus = document.getElementById('postStatus');
  const editImageHint = document.getElementById('editImageHint');
  const btnRefreshPosts = document.getElementById('btnRefreshPosts');
  const postManageStatus = document.getElementById('postManageStatus');
  const postList = document.getElementById('postList');
  let editingPostId = null; // holds slug when editing

  function slugify(t) {
    return t.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
  }
  function setStatus(el, msg) { el.textContent = msg; el.classList.remove('hidden'); setTimeout(()=>el.classList.add('hidden'), 4000); }

  btnPublishPost.addEventListener('click', async () => {
    try {
      const title = postTitle.value.trim();
      if (!title) throw new Error('Titolo richiesto');
      const slug = editingPostId || slugify(title);
      const date = (postDate.value || new Date().toISOString().slice(0,10));
      const readTime = Math.max(1, parseInt(postReadTime.value || '3', 10));
      const excerpt = postExcerpt.value.trim();
      const contentParas = postContent.value.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);

      let imageUrl = '';
      let ogImageUrl = '';
      if (postImage.files[0]) {
        const file = postImage.files[0];
        // Store blog covers under 'blog-covers/' to match Storage rules
        const stampedName = `${slug}-${Date.now()}-${file.name}`.replace(/\s+/g, '_');
        const ref = storage.ref().child(`blog-covers/${stampedName}`);
        await ref.put(file, {
          contentType: file.type || 'image/jpeg',
          cacheControl: 'public, max-age=31536000, immutable'
        });
        imageUrl = await ref.getDownloadURL();
      }
      if (postOgImage && postOgImage.files && postOgImage.files[0]) {
        const file = postOgImage.files[0];
        const stampedName = `${slug}-og-${Date.now()}-${file.name}`.replace(/\s+/g, '_');
        const ref = storage.ref().child(`blog-og/${stampedName}`);
        await ref.put(file, {
          contentType: file.type || 'image/jpeg',
          cacheControl: 'public, max-age=31536000, immutable'
        });
        ogImageUrl = await ref.getDownloadURL();
      }

      const seoTitle = (postSeoTitle?.value || '').trim();
      const seoDescription = (postSeoDescription?.value || '').trim();
      const payload = {
        slug, title, date, readTime, excerpt, content: contentParas
      };
      // when creating or if new image uploaded, set image
      if (imageUrl) payload.image = imageUrl;
      if (seoTitle) payload.seoTitle = seoTitle;
      if (seoDescription) payload.seoDescription = seoDescription;
      if (ogImageUrl) payload.ogImage = ogImageUrl;

      await db.collection('posts').doc(slug).set(payload, { merge: true });

      if (editingPostId) {
        setStatus(postStatus, 'Articolo aggiornato!');
      } else {
        setStatus(postStatus, 'Articolo pubblicato!');
      }
      // reset form and edit state
      clearPostForm();
      await loadPostList();
    } catch (e) {
      setStatus(postStatus, 'Errore: ' + e.message);
    }
  });

  function clearPostForm() {
    editingPostId = null;
    if (btnCancelEdit) btnCancelEdit.classList.add('hidden');
    if (editImageHint) editImageHint.classList.add('hidden');
    if (btnPublishPost) btnPublishPost.textContent = 'Pubblica';
    postTitle.value = '';
    postExcerpt.value = '';
    postReadTime.value = '3';
    postDate.value = '';
    postContent.value = '';
    postImage.value = '';
    if (postSeoTitle) postSeoTitle.value = '';
    if (postSeoDescription) postSeoDescription.value = '';
    if (postOgImage) postOgImage.value = '';
  }

  if (btnCancelEdit) btnCancelEdit.addEventListener('click', () => {
    clearPostForm();
    setStatus(postStatus, 'Modifica annullata');
  });

  // --- Post Manager: list & delete ---
  async function loadPostList() {
    if (!postList) return;
    postList.innerHTML = '<p style="opacity:.8">Caricamento articoli…</p>';
    try {
      const snap = await db.collection('posts').orderBy('date', 'desc').limit(200).get();
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (!items.length) { postList.innerHTML = '<p style="opacity:.8">Nessun articolo.</p>'; return; }
      const list = document.createElement('div');
      list.style.display = 'grid';
      list.style.gridTemplateColumns = '1fr';
      list.style.gap = '10px';
      items.forEach(it => {
        const row = document.createElement('div');
        row.style.border = '1px solid #444';
        row.style.borderRadius = '10px';
        row.style.padding = '10px';
        row.style.background = '#1f1f1f';
        row.innerHTML = `
          <div style="display:flex;gap:10px;align-items:center;justify-content:space-between;">
            <div>
              <div style="font-weight:700">${it.title || it.id}</div>
              <div style="opacity:.75;font-size:.9rem;">${it.date || ''} · ${it.readTime ? `${it.readTime} min` : ''}</div>
            </div>
            <div style="display:flex;gap:8px;">
              <button class="admin-btn" data-action="edit-post" data-id="${it.id}">Modifica</button>
              <button class="admin-btn" data-action="delete-post" data-id="${it.id}" data-image="${it.image || ''}">Elimina</button>
            </div>
          </div>
        `;
        list.appendChild(row);
      });
      postList.innerHTML = '';
      postList.appendChild(list);
    } catch (e) {
      postList.innerHTML = `<p style="color:#ffb4b4">Errore caricamento: ${e.message}</p>`;
    }
  }

  async function deletePost(postId, imageUrl) {
    try {
      // Delete Firestore doc
      await db.collection('posts').doc(postId).delete();
      // Try deleting cover image if hosted on Firebase Storage
      if (imageUrl && imageUrl.includes('firebasestorage.googleapis.com')) {
        try {
          await auth.currentUser?.getIdToken(true).catch(()=>{});
          await storage.refFromURL(imageUrl).delete();
        } catch {}
      }
      postManageStatus && setStatus(postManageStatus, 'Articolo eliminato');
      await loadPostList();
    } catch (e) {
      postManageStatus && setStatus(postManageStatus, 'Errore eliminazione: ' + e.message);
    }
  }

  if (btnRefreshPosts) btnRefreshPosts.addEventListener('click', loadPostList);
  if (postList) postList.addEventListener('click', async (ev) => {
    const delBtn = ev.target.closest('button[data-action="delete-post"]');
    const editBtn = ev.target.closest('button[data-action="edit-post"]');
    if (delBtn) {
      const id = delBtn.getAttribute('data-id');
      const image = delBtn.getAttribute('data-image');
      if (confirm(`Eliminare l'articolo "${id}"?`)) deletePost(id, image);
      return;
    }
    if (editBtn) {
      const id = editBtn.getAttribute('data-id');
      try {
        const doc = await db.collection('posts').doc(id).get();
        if (!doc.exists) throw new Error('Articolo non trovato');
        const data = doc.data() || {};
        editingPostId = id;
        postTitle.value = data.title || '';
        postExcerpt.value = data.excerpt || '';
        postReadTime.value = data.readTime || '3';
        postDate.value = data.date || '';
        postContent.value = Array.isArray(data.content) ? data.content.join('\n\n') : (data.content || '');
        if (postSeoTitle) postSeoTitle.value = data.seoTitle || '';
        if (postSeoDescription) postSeoDescription.value = data.seoDescription || '';
        // clear file inputs and show hint
        postImage.value = '';
        if (postOgImage) postOgImage.value = '';
        if (btnPublishPost) btnPublishPost.textContent = 'Aggiorna';
        if (btnCancelEdit) btnCancelEdit.classList.remove('hidden');
        if (editImageHint) editImageHint.classList.remove('hidden');
        window.scrollTo({ top: postCard.offsetTop - 20, behavior: 'smooth' });
        setStatus(postStatus, `Modifica: ${id}`);
      } catch (e) {
        setStatus(postManageStatus, 'Errore apertura modifica: ' + e.message);
      }
    }
  });

  auth.onAuthStateChanged((u) => { if (u) loadPostList(); });

  // Photo uploads
  const galleryFiles = document.getElementById('galleryFiles');
  const photoAlt = document.getElementById('photoAlt');
  const btnUploadPhotos = document.getElementById('btnUploadPhotos');
  const photoStatus = document.getElementById('photoStatus');
  const btnRefreshPhotos = document.getElementById('btnRefreshPhotos');
  const photoList = document.getElementById('photoList');
  const photoProgress = document.getElementById('photoProgress');
  const photoProgressBar = document.getElementById('photoProgressBar');
  const photoProgressText = document.getElementById('photoProgressText');

  btnUploadPhotos.addEventListener('click', async () => {
    // Capture previous button text in outer scope so it's available in finally
    const prevBtnText = btnUploadPhotos.textContent;
    try {
      const files = Array.from(galleryFiles.files || []);
      if (!files.length) throw new Error('Seleziona almeno una foto');

      // Prepare UI
  btnUploadPhotos.disabled = true;
      btnUploadPhotos.textContent = 'Caricamento…';
      if (photoProgress && photoProgressBar && photoProgressText) {
        photoProgress.classList.remove('hidden');
        photoProgress.removeAttribute('aria-hidden');
        photoProgressBar.style.width = '0%';
        photoProgressText.classList.remove('hidden');
        photoProgressText.textContent = `Preparazione…`;
      }

      // Ensure we have a fresh auth token before uploads (helps with some preflight/auth edge cases)
      await auth.currentUser?.getIdToken(true).catch(()=>{});

      // Aggregate progress across parallel uploads
      const totalBytes = files.reduce((sum, f) => sum + (f.size || 0), 0) || 1;
      const bytesMap = new Array(files.length).fill(0);
      let uploadedCount = 0;

      const uploadPromises = files.map((f, idx) => new Promise((resolve, reject) => {
        const stampedName = `${Date.now()}-${f.name}`.replace(/\s+/g, '_');
        const refPath = `gallery/${stampedName}`;
        const ref = storage.ref().child(refPath);
        const task = ref.put(f, {
          contentType: f.type || 'image/jpeg',
          cacheControl: 'public, max-age=31536000, immutable'
        });

        task.on('state_changed', (snapshot) => {
          bytesMap[idx] = snapshot.bytesTransferred || 0;
          const transferred = bytesMap.reduce((a, b) => a + b, 0);
          const percent = Math.min(100, Math.floor((transferred / totalBytes) * 100));
          if (photoProgressBar) photoProgressBar.style.width = percent + '%';
          if (photoProgressText) photoProgressText.textContent = `Caricamento ${Math.min(uploadedCount + 1, files.length)}/${files.length}… ${percent}%`;
        }, (err) => {
          reject(err);
        }, async () => {
          try {
            // Mark this file as fully transferred
            bytesMap[idx] = f.size || bytesMap[idx];
            const url = await ref.getDownloadURL();
            await db.collection('gallery').add({
              url,
              alt: (photoAlt.value || '').trim() || 'Foto galleria',
              path: refPath,
              uploadedAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
            uploadedCount++;
            resolve();
          } catch (e) {
            reject(e);
          }
        });
      }));

      await Promise.all(uploadPromises);

      if (photoProgressBar) photoProgressBar.style.width = '100%';
      if (photoProgressText) photoProgressText.textContent = `Completato: ${uploadedCount} / ${files.length} file`;
      setStatus(photoStatus, `${uploadedCount} foto caricate.`);
      galleryFiles.value = '';
      photoAlt.value = '';
      if (typeof loadPhotoList === 'function') {
        await loadPhotoList();
      }

    } catch (e) {
      setStatus(photoStatus, 'Errore: ' + e.message);
    } finally {
      // Reset UI
      btnUploadPhotos.disabled = false;
      btnUploadPhotos.textContent = prevBtnText || 'Carica';
      if (photoProgress && photoProgressBar && photoProgressText) {
        setTimeout(() => {
          photoProgress.classList.add('hidden');
          photoProgress.setAttribute('aria-hidden', 'true');
          photoProgressBar.style.width = '0%';
          photoProgressText.classList.add('hidden');
          photoProgressText.textContent = '';
        }, 800);
      }
    }
  });

  // --- Photo Manager: list & delete ---
  async function loadPhotoList() {
    if (!photoList) return;
    photoList.innerHTML = '<p style="opacity:.8">Caricamento foto…</p>';
    try {
      const snap = await db.collection('gallery').orderBy('uploadedAt', 'desc').limit(200).get();
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (!items.length) {
        photoList.innerHTML = '<p style="opacity:.8">Nessuna foto trovata. Caricane una sopra.</p>';
        return;
      }
      const list = document.createElement('div');
      list.style.display = 'grid';
      list.style.gridTemplateColumns = 'repeat(auto-fill, minmax(140px, 1fr))';
      list.style.gap = '12px';
      items.forEach(item => {
        const card = document.createElement('div');
        card.style.border = '1px solid #444';
        card.style.borderRadius = '10px';
        card.style.padding = '8px';
        card.style.background = '#1f1f1f';
        card.innerHTML = `
          <img src="${item.url}" alt="${item.alt || ''}" style="width:100%;height:100px;object-fit:cover;border-radius:6px;" />
          <div style="margin-top:6px; display:flex; gap:6px; align-items:center; justify-content:space-between;">
            <small style="opacity:.7;word-break:break-all;">${(item.path || '').split('/').pop() || 'foto'}</small>
            <button class="admin-btn" data-docid="${item.id}" data-path="${item.path || ''}" data-url="${item.url}">Elimina</button>
          </div>
        `;
        list.appendChild(card);
      });
      photoList.innerHTML = '';
      photoList.appendChild(list);
    } catch (e) {
      photoList.innerHTML = `<p style="color:#ffb4b4">Errore nel caricamento: ${e.message}</p>`;
    }
  }

  async function deletePhoto(docId, path, url) {
    try {
      // Prefer explicit path from Firestore; else derive from URL
      let storagePath = path;
      if (!storagePath && url) {
        const match = url.match(/\/o\/([^?]+)/);
        if (match && match[1]) storagePath = decodeURIComponent(match[1]);
      }
  if (!storagePath && !url) throw new Error('Percorso Storage non trovato');

  // Force fresh auth token before delete (avoids preflight/auth edge cases)
  await auth.currentUser?.getIdToken(true).catch(()=>{});

  // Prefer deleting by URL (lets SDK resolve correct bucket/endpoint)
  const objRef = url ? storage.refFromURL(url) : storage.ref().child(storagePath);
      try {
        await objRef.delete();
      } catch (err) {
        // One quick retry after token refresh to smooth transient CORS/preflight failures
        await new Promise(r => setTimeout(r, 250));
        await objRef.delete();
      }
      if (docId) {
        await db.collection('gallery').doc(docId).delete();
      }
      setStatus(photoStatus, 'Foto eliminata');
      await loadPhotoList();
    } catch (e) {
      setStatus(photoStatus, 'Errore eliminazione: ' + e.message);
    }
  }

  if (btnRefreshPhotos) btnRefreshPhotos.addEventListener('click', loadPhotoList);
  if (photoList) photoList.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button[data-docid]');
    if (!btn) return;
    const docId = btn.getAttribute('data-docid');
    const path = btn.getAttribute('data-path');
    const url = btn.getAttribute('data-url');
    if (confirm('Eliminare questa foto?')) deletePhoto(docId, path, url);
  });

  // Auto-load list when authenticated
  auth.onAuthStateChanged((u) => { if (u) loadPhotoList(); });

  // ================= Featured Products =================
  const featuredName = document.getElementById('featuredName');
  const featuredText = document.getElementById('featuredText');
  const featuredOrder = document.getElementById('featuredOrder');
  const featuredImage = document.getElementById('featuredImage');
  const btnAddFeatured = document.getElementById('btnAddFeatured');
  const featuredStatus = document.getElementById('featuredStatus');
  const btnRefreshFeatured = document.getElementById('btnRefreshFeatured');
  const featuredList = document.getElementById('featuredList');

  async function addFeatured() {
    try {
      const name = (featuredName?.value || '').trim();
      const text = (featuredText?.value || '').trim();
      const order = parseInt(featuredOrder?.value || '1', 10) || 1;
      if (!name) throw new Error('Nome richiesto');
      if (!featuredImage?.files?.[0]) throw new Error('Immagine richiesta');

      const file = featuredImage.files[0];
      const stamped = `${Date.now()}-${file.name}`.replace(/\s+/g, '_');
      const path = `featured/${stamped}`;
      const ref = storage.ref().child(path);
      await ref.put(file, {
        contentType: file.type || 'image/jpeg',
        cacheControl: 'public, max-age=31536000, immutable'
      });
      const image = await ref.getDownloadURL();

      await db.collection('featured').add({
        name, text, image, order,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        path
      });
      setStatus(featuredStatus, 'Prodotto aggiunto!');
      featuredName.value = '';
      featuredText.value = '';
      featuredOrder.value = '1';
      featuredImage.value = '';
      await loadFeatured();
    } catch (e) {
      setStatus(featuredStatus, 'Errore: ' + e.message);
    }
  }

  async function loadFeatured() {
    if (!featuredList) return;
    featuredList.innerHTML = '<p style="opacity:.8">Caricamento…</p>';
    try {
      const snap = await db.collection('featured').orderBy('order', 'asc').limit(100).get();
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (!items.length) { featuredList.innerHTML = '<p style="opacity:.8">Nessun prodotto.</p>'; return; }
      const list = document.createElement('div');
      list.style.display = 'grid';
      list.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
      list.style.gap = '12px';
      for (const it of items) {
        const card = document.createElement('div');
        card.style.border = '1px solid #444';
        card.style.borderRadius = '10px';
        card.style.padding = '8px';
        card.style.background = '#1f1f1f';
        card.setAttribute('draggable', 'true');
        card.setAttribute('data-id', it.id);
        card.setAttribute('data-order', it.order ?? '');
        card.innerHTML = `
          <div style="display:flex; gap:8px; align-items:center;">
            <div class="drag-handle" style="cursor:grab; user-select:none; font-size:18px;">≡</div>
            <img src="${it.image}" alt="${it.name}" style="width:80px;height:80px;object-fit:cover;border-radius:6px;flex:0 0 auto;" />
            <div style="flex:1; display:flex; flex-direction:column; gap:6px;">
              <input type="text" class="feat-name" value="${it.name || ''}" placeholder="Nome" style="width:100%; padding:6px; border-radius:6px; border:1px solid #444; background:#2a2a2a; color:#F6E7B6;" />
              <input type="text" class="feat-text" value="${it.text || ''}" placeholder="Descrizione/Prezzo" style="width:100%; padding:6px; border-radius:6px; border:1px solid #444; background:#2a2a2a; color:#F6E7B6;" />
              <div style="display:flex; gap:8px; align-items:center;">
                <label style="opacity:.8;">Ordine</label>
                <input type="number" class="feat-order" value="${it.order ?? 1}" min="1" style="width:80px; padding:6px; border-radius:6px; border:1px solid #444; background:#2a2a2a; color:#F6E7B6;" />
                <button class="admin-btn" data-action="save-featured" data-id="${it.id}">Salva</button>
                <button class="admin-btn" data-action="delete-featured" data-id="${it.id}" data-path="${it.path || ''}" data-url="${it.image}">Elimina</button>
              </div>
            </div>
          </div>
        `;
        list.appendChild(card);
      }
      featuredList.innerHTML = '';
      featuredList.appendChild(list);

      // Drag & drop reorder (simple within the grid)
      let dragEl = null;
      list.addEventListener('dragstart', (e) => {
        const target = e.target.closest('[draggable="true"]');
        if (!target) return;
        dragEl = target;
        e.dataTransfer.effectAllowed = 'move';
      });
      list.addEventListener('dragover', (e) => {
        if (!dragEl) return;
        e.preventDefault();
        const target = e.target.closest('[draggable="true"]');
        if (!target || target === dragEl) return;
        const rect = target.getBoundingClientRect();
        const after = (e.clientY - rect.top) / rect.height > 0.5;
        if (after) target.after(dragEl); else target.before(dragEl);
      });
      list.addEventListener('dragend', () => { dragEl = null; });
    } catch (e) {
      featuredList.innerHTML = `<p style="color:#ffb4b4">Errore: ${e.message}</p>`;
    }
  }

  async function deleteFeatured(id, path, url) {
    try {
      // delete storage image
      if (url) {
        await auth.currentUser?.getIdToken(true).catch(() => {});
        try {
          await storage.refFromURL(url).delete();
        } catch (e) {
          // fallback to path
          if (path) await storage.ref().child(path).delete();
        }
      } else if (path) {
        await storage.ref().child(path).delete();
      }
      // delete doc
      await db.collection('featured').doc(id).delete();
      await loadFeatured();
    } catch (e) {
      alert('Errore eliminazione: ' + e.message);
    }
  }

  if (btnAddFeatured) btnAddFeatured.addEventListener('click', addFeatured);
  if (btnRefreshFeatured) btnRefreshFeatured.addEventListener('click', loadFeatured);
  if (featuredList) featuredList.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button[data-action="delete-featured"]');
    const saveBtn = ev.target.closest('button[data-action="save-featured"]');
    if (btn) {
      const id = btn.getAttribute('data-id');
      const path = btn.getAttribute('data-path');
      const url = btn.getAttribute('data-url');
      if (confirm('Eliminare questo prodotto?')) deleteFeatured(id, path, url);
      return;
    }
    if (saveBtn) {
      const id = saveBtn.getAttribute('data-id');
      const card = saveBtn.closest('[draggable="true"]');
      const name = card.querySelector('.feat-name').value.trim();
      const text = card.querySelector('.feat-text').value.trim();
      const order = parseInt(card.querySelector('.feat-order').value || '1', 10) || 1;
      db.collection('featured').doc(id).set({ name, text, order }, { merge: true }).then(() => {
        loadFeatured();
      }).catch(err => alert('Errore salvataggio: ' + err.message));
    }
  });

  const btnSaveFeaturedOrder = document.getElementById('btnSaveFeaturedOrder');
  if (btnSaveFeaturedOrder && featuredList) {
    btnSaveFeaturedOrder.addEventListener('click', async () => {
      const cards = featuredList.querySelectorAll('[draggable="true"]');
      const batch = db.batch();
      let i = 1;
      cards.forEach(card => {
        const id = card.getAttribute('data-id');
        const ref = db.collection('featured').doc(id);
        batch.set(ref, { order: i++ }, { merge: true });
      });
      try {
        await batch.commit();
        await loadFeatured();
      } catch (e) {
        alert('Errore salvataggio ordine: ' + e.message);
      }
    });
  }
  auth.onAuthStateChanged((u) => { if (u) loadFeatured(); });
});