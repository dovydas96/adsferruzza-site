document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.querySelector('.blog-grid');
  const isPostPage = document.getElementById('postContainer') !== null;

  async function loadPosts() {
    // If Firebase is configured, load from Firestore
    try {
      if (window.FIREBASE_ENABLED && window.firebase && firebase.apps.length) {
        const db = firebase.firestore();
        const snap = await db.collection('posts').orderBy('date', 'desc').get();
        const posts = snap.docs.map(d => d.data());
        if (posts.length) return posts;
      }
    } catch(e) {
      console.warn('Firebase posts fallback:', e.message);
    }
    // Fallback to local JSON
    const res = await fetch('blog/posts.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('Impossibile caricare i post');
    const posts = await res.json();
    posts.sort((a, b) => new Date(b.date) - new Date(a.date));
    return posts;
  }

  function formatDate(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('it-IT', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch { return iso; }
  }

  if (!isPostPage && grid) {
    // Feature flag: hide blogs entirely if disabled
    if (window.BLOGS_ENABLED === false) {
      grid.innerHTML = '<p style="opacity:.8; text-align:center; margin:1rem 0;">Articoli in arrivo…</p>';
      return;
    }
    try {
      const posts = await loadPosts();
      grid.innerHTML = '';
      if (!posts || posts.length === 0) {
        grid.innerHTML = '<p style="opacity:.8; text-align:center; margin:1rem 0;">Articoli in arrivo…</p>';
        return;
      }
      posts.forEach(p => {
        const art = document.createElement('article');
        art.className = 'blog-card';
        art.innerHTML = `
          <a class="blog-thumb" href="blog-post.html?slug=${encodeURIComponent(p.slug)}">
            <img src="${p.image}" alt="${p.title}" loading="lazy" decoding="async">
          </a>
          <div class="blog-content">
            <h2 class="blog-title"><a href="blog-post.html?slug=${encodeURIComponent(p.slug)}">${p.title}</a></h2>
            <p class="blog-meta">${formatDate(p.date)} · ${p.readTime} min</p>
            <p class="blog-excerpt">${p.excerpt}</p>
            <a class="blog-readmore" href="blog-post.html?slug=${encodeURIComponent(p.slug)}">Leggi di più →</a>
          </div>`;
        grid.appendChild(art);
      });
    } catch (e) {
      grid.innerHTML = '<p>Errore nel caricamento dei post. Riprova più tardi.</p>';
      console.error(e);
    }
  }

  if (isPostPage) {
    if (window.BLOGS_ENABLED === false) {
      const contentEl = document.getElementById('postContent');
      const titleEl = document.getElementById('postTitle');
      const metaEl = document.getElementById('postMeta');
      const imgEl = document.getElementById('postHeroImg');
      const crumbEl = document.getElementById('postBreadcrumb');
      if (titleEl) titleEl.textContent = 'Articoli in arrivo…';
      if (metaEl) metaEl.textContent = '';
      if (imgEl) { imgEl.src = ''; imgEl.alt = ''; }
      if (contentEl) contentEl.innerHTML = '<p>Stiamo preparando i contenuti del blog. Torna presto a trovarci!</p>';
      if (crumbEl) crumbEl.innerHTML = 'Home / Blog / …';
      return;
    }
    const params = new URLSearchParams(location.search);
    const slug = params.get('slug');
    const titleEl = document.getElementById('postTitle');
    const metaEl = document.getElementById('postMeta');
    const imgEl = document.getElementById('postHeroImg');
    const contentEl = document.getElementById('postContent');
    const crumbEl = document.getElementById('postBreadcrumb');

    try {
      const posts = await loadPosts();
      const post = posts.find(p => p.slug === slug) || posts[0];
      if (!post) throw new Error('Post non trovato');
      titleEl.textContent = post.title;
      metaEl.textContent = `${formatDate(post.date)} · ${post.readTime} min`;
  imgEl.src = post.image;
  imgEl.alt = post.title;
  imgEl.loading = 'eager'; // hero image should load ASAP
  imgEl.decoding = 'async';
      contentEl.innerHTML = post.content.map(p => `<p>${p}</p>`).join('');
      crumbEl.innerHTML = `Home / <a href="blog.html">Blog</a> / ${post.title}`;
      document.title = `${post.title} | AD Sferruzza Pasticceria`;
    } catch (e) {
      contentEl.innerHTML = '<p>Impossibile caricare il contenuto.</p>';
      console.error(e);
    }
  }
});