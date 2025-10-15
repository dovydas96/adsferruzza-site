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
  // Fallback to local JSON (use absolute path to be robust under redirects)
  const jsonPath = (location.protocol === 'file:' ? './blog/posts.json' : '/blog/posts.json');
  const res = await fetch(jsonPath, { cache: 'no-store' });
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

  // --- Content rendering helpers (headings, links, lists) ---
  const esc = (s='') => String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
  const slugify = (t='') => t.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/gi, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  function formatInline(text) {
    if (!text) return '';
    const tokens = [];
    let working = String(text);
    // 1) Markdown links [label](url)
    working = working.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi, (_m, label, url) => {
      const token = `__LINK_${tokens.length}__`;
      tokens.push({ token, html: `<a href=\"${esc(url)}\" target=\"_blank\" rel=\"noopener noreferrer\">${esc(label)}</a>` });
      return token;
    });
    // 2) Bold first: **text**
    working = working.replace(/\*\*([^*]+)\*\*/g, (_m, inner) => {
      const token = `__B_${tokens.length}__`;
      tokens.push({ token, html: `<strong>${esc(inner)}</strong>` });
      return token;
    });
    // 3) Italic: *text*
    working = working.replace(/(^|\s)\*([^*]+)\*(?=\s|$)/g, (_m, pre, inner) => {
      const token = `__I_${tokens.length}__`;
      tokens.push({ token, html: `${pre}<em>${esc(inner)}</em>` });
      return token;
    });
    // Escape the rest
    let safe = esc(working);
  // 4) Auto-link bare URLs (http/https)
  safe = safe.replace(/(https?:\/\/[^\s<]+)(?![^<]*>)/g, (m) => `<a href=\"${m}\" target=\"_blank\" rel=\"noopener noreferrer\">${m}</a>`);
  // 4b) Auto-link www.* (prepend https)
  safe = safe.replace(/(^|\s)(www\.[^\s<]+)(?![^<]*>)/g, (_m, pre, url) => `${pre}<a href=\"https://${url}\" target=\"_blank\" rel=\"noopener noreferrer\">${url}</a>`);
    // 5) Restore tokens
    for (const { token, html } of tokens) {
      safe = safe.replace(new RegExp(token, 'g'), html);
    }
    return safe;
  }
  function renderParagraph(raw) {
    if (!raw) return '';
    const text = String(raw).trim();
    // Treat common section labels as headings
  const isIntro = /^(introduzione|introduction):?$/i.test(text);
  const isConclusion = /^(conclusione|conclusion):?$/i.test(text);
    const hMatch = text.match(/^(#{1,6})\s+(.+)$/); // Markdown-style heading
    if (isIntro || isConclusion) {
      const label = text.charAt(0).toUpperCase() + text.slice(1);
      const id = slugify(label);
      return `<h2 id="${id}">${esc(label)}</h2>`;
    }
    if (hMatch) {
      const level = hMatch[1].length;
      const body = hMatch[2].trim();
      const id = slugify(body);
      // Ensure only one H1 per page: downgrade # to H2, ###→H3
      const tag = level <= 2 ? 'h2' : 'h3';
      return `<${tag} id="${id}">${esc(body)}</${tag}>`;
    }
    // Ordered list: lines beginning with "1. ", "2. ", etc.
    if (/^\d+\.\s+/m.test(text)) {
      const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);
      const items = lines.filter(l => /^\d+\.\s+/.test(l)).map(l => l.replace(/^\d+\.\s+/, ''));
      if (items.length >= 2) {
        const li = items.map(t => `<li>${formatInline(t)}</li>`).join('');
        return `<ol>${li}</ol>`;
      }
    }
    // Bullet list: lines starting with "- "
    if (/^-\s+/m.test(text)) {
      const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);
      const items = lines.filter(l => /^-\s+/.test(l)).map(l => l.replace(/^-\s+/, ''));
      if (items.length >= 2) {
        const li = items.map(t => `<li>${formatInline(t)}</li>`).join('');
        return `<ul>${li}</ul>`;
      }
    }
    // Preserve single newlines as <br> within the paragraph
    const withBreaks = formatInline(text).replace(/\n/g, '<br>');
    return `<p>${withBreaks}</p>`;
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

      // Add a lightweight CTA block under the list to guide users internally
      const cta = document.createElement('div');
      cta.className = 'blog-cta-links';
      cta.innerHTML = `
        <hr class="section-divider gold-gradient-divider" />
        <p style="text-align:center; margin:1rem 0 0.25rem; opacity:.9">Ti è piaciuto leggere? Scopri i nostri prodotti o contattaci per ordini.</p>
        <p style="text-align:center; gap:.75rem; display:flex; justify-content:center; flex-wrap:wrap; margin:.25rem 0 1.5rem;">
          <a href="/#products" class="button-link">Vai ai prodotti</a>
          <a href="/contact.html" class="button-link">Contattaci</a>
        </p>`;
      grid.parentElement.appendChild(cta);
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
  // Use post hero image or a sensible fallback
  imgEl.src = post.image || 'images/family-hero.jpg';
  imgEl.alt = post.title;
  imgEl.loading = 'eager'; // hero image should load ASAP
  imgEl.decoding = 'async';
  contentEl.innerHTML = (post.content || []).map(renderParagraph).join('');
      crumbEl.innerHTML = `Home / <a href="blog.html">Blog</a> / ${post.title}`;
  // Compute preferred SEO title/description values with graceful fallback
  const truncate = (s, n=160) => (s.length <= n ? s : s.slice(0, n).replace(/\s+\S*$/, '') + '…');
  const effectiveTitle = (post.seoTitle || post.metaTitle || post.title || '').trim();
  const fallbackText = Array.isArray(post.content) ? post.content.join(' ') : '';
  const desc = truncate(String(post.seoDescription || post.metaDescription || post.excerpt || fallbackText || '').trim());
  document.title = `${effectiveTitle} | AD Sferruzza Pasticceria`;

      // --- Dynamic SEO tags: description, canonical, OG/Twitter ---
      const ensureMeta = (selector, attrs) => {
        let el = document.head.querySelector(selector);
        if (!el) {
          el = document.createElement('meta');
          Object.entries(attrs).forEach(([k,v]) => el.setAttribute(k,v));
          document.head.appendChild(el);
        }
        return el;
      };
      const ensureLink = (rel, href) => {
        let link = document.head.querySelector(`link[rel="${rel}"]`);
        if (!link) { link = document.createElement('link'); link.setAttribute('rel', rel); document.head.appendChild(link); }
        link.setAttribute('href', href);
        return link;
      };
  // desc and effectiveTitle computed above
      // Canonical absolute URL using production host
      const canonicalUrl = `https://adsferruzza.com/blog-post.html?slug=${encodeURIComponent(post.slug)}`;
      ensureLink('canonical', canonicalUrl);
      // Meta description
      let mDesc = document.head.querySelector('meta[name="description"]');
      if (!mDesc) { mDesc = document.createElement('meta'); mDesc.setAttribute('name','description'); document.head.appendChild(mDesc); }
      mDesc.setAttribute('content', desc || 'Articolo del blog di AD Sferruzza Pasticceria.');
      // Open Graph
      ensureMeta('meta[property="og:type"]', { property:'og:type', content:'article' }).setAttribute('content','article');
      ensureMeta('meta[property="og:title"]', { property:'og:title' }).setAttribute('content', `${effectiveTitle} | AD Sferruzza Pasticceria`);
      ensureMeta('meta[property="og:description"]', { property:'og:description' }).setAttribute('content', desc);
      ensureMeta('meta[property="og:url"]', { property:'og:url' }).setAttribute('content', canonicalUrl);
      const defaultOg = 'https://adsferruzza.com/images/family-hero.jpg';
      const ogImage = post.ogImage || post.image;
      const absImage = ogImage
        ? (ogImage.startsWith('http') ? ogImage : `https://adsferruzza.com/${ogImage.replace(/^\/?/, '')}`)
        : defaultOg;
      ensureMeta('meta[property="og:image"]', { property:'og:image' }).setAttribute('content', absImage);
      // Twitter Card
      ensureMeta('meta[name="twitter:card"]', { name:'twitter:card' }).setAttribute('content','summary_large_image');
      ensureMeta('meta[name="twitter:title"]', { name:'twitter:title' }).setAttribute('content', `${effectiveTitle} | AD Sferruzza Pasticceria`);
      ensureMeta('meta[name="twitter:description"]', { name:'twitter:description' }).setAttribute('content', desc);
  ensureMeta('meta[name="twitter:image"]', { name:'twitter:image' }).setAttribute('content', absImage);

      // --- JSON-LD: Article and BreadcrumbList ---
      const articleLd = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: post.title,
        description: desc,
  image: absImage,
        author: { '@type': 'Organization', name: 'AD Sferruzza Pasticceria' },
        datePublished: post.date,
        dateModified: post.updatedAt || post.date,
        mainEntityOfPage: canonicalUrl,
        publisher: {
          '@type': 'Organization',
          name: 'AD Sferruzza Pasticceria',
          logo: {
            '@type': 'ImageObject',
            url: 'https://adsferruzza.com/images/icons/logo-512.png'
          }
        }
      };
      const breadcrumbLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://adsferruzza.com/' },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://adsferruzza.com/blog.html' },
          { '@type': 'ListItem', position: 3, name: post.title, item: canonicalUrl }
        ]
      };
      const injectLd = (id, obj) => {
        let tag = document.getElementById(id);
        if (!tag) {
          tag = document.createElement('script');
          tag.type = 'application/ld+json';
          tag.id = id;
          document.head.appendChild(tag);
        }
        tag.textContent = JSON.stringify(obj);
      };
      injectLd('ld-article', articleLd);
      injectLd('ld-breadcrumb', breadcrumbLd);

      // --- Internal linking: CTA and Related Posts ---
      try {
        // CTA links under the article body
        const postBody = document.querySelector('.post-body');
        if (postBody) {
          const ctaWrap = document.createElement('div');
          ctaWrap.className = 'post-cta-links';
          ctaWrap.innerHTML = `
            <hr class="section-divider gold-gradient-divider" />
            <div style="text-align:center; margin:1rem 0 0.25rem; opacity:.95">Vuoi saperne di più o fare un ordine?</div>
            <p style="text-align:center; gap:.75rem; display:flex; justify-content:center; flex-wrap:wrap; margin:.25rem 0 1.5rem;">
              <a href="/blog.html" class="button-link">Torna al Blog</a>
              <a href="/#products" class="button-link">Scopri i Prodotti</a>
              <a href="/contact.html" class="button-link">Contattaci</a>
            </p>`;
          postBody.appendChild(ctaWrap);
        }

        // Related posts (pick up to 2 others by recency)
        const others = (posts || []).filter(p => p.slug !== post.slug)
          .sort((a,b) => new Date(b.date) - new Date(a.date))
          .slice(0, 2);
        if (others.length && postBody) {
          const rel = document.createElement('section');
          rel.className = 'related-posts fade-in-section visible';
          rel.innerHTML = `
            <h3 style="text-align:center; margin-top:0.5rem;">Potrebbe interessarti anche</h3>
            <div class="related-grid" style="display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:1rem; margin:1rem 0 1.5rem;">
              ${others.map(o => `
                <article class="related-card" style="background:#1f1f1f; border:1px solid rgba(255,226,161,.25); border-radius:12px; overflow:hidden;">
                  <a href="/blog-post.html?slug=${encodeURIComponent(o.slug)}" class="related-thumb" style="display:block;">
                    <img src="${o.image}" alt="${o.title}" loading="lazy" decoding="async" style="width:100%; height:180px; object-fit:cover; display:block;" />
                  </a>
                  <div class="related-content" style="padding:.75rem 1rem 1rem;">
                    <h4 style="margin:.25rem 0 .25rem; font-size:1.05rem;"><a href="/blog-post.html?slug=${encodeURIComponent(o.slug)}">${o.title}</a></h4>
                    <p style="opacity:.8; margin:0 0 .5rem; font-size:.9rem;">${formatDate(o.date)} · ${o.readTime} min</p>
                    <p style="opacity:.85; margin:0; font-size:.95rem;">${o.excerpt}</p>
                  </div>
                </article>`).join('')}
            </div>`;
          postBody.appendChild(rel);
        }
      } catch (err) {
        console.warn('Internal linking widgets skipped:', err);
      }
    } catch (e) {
      contentEl.innerHTML = '<p>Impossibile caricare il contenuto.</p>';
      console.error(e);
    }
  }
});