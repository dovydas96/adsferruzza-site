# Improvements Backlog

Audit date: 2026-04-25. Prioritised list of code quality, security, performance and SEO improvements for adsferruzza-site.

## 🔴 High priority

### 1. XSS via unescaped Firestore data in admin/blog/featured
Firestore docs are rendered directly into `innerHTML` with no escaping. An attacker who briefly compromises the admin account (or via a rules misconfiguration) can persist HTML/JS that executes for every visitor. Content containing `<` or `&` will also break rendering.

Locations:
- `blog.js:133` — `<h2><a>${p.title}</a></h2>` and `<p>${p.excerpt}</p>`
- `blog.js:196` — `contentEl.innerHTML = (post.content || []).map(renderParagraph).join('')`
- `blog.js:313` — related-posts block
- `featured.js:36` — `<h3>${it.name}</h3>`, `<p>${it.text}</p>`, `<img src="${it.image}" alt="${it.name}">`
- `admin.js:195, 397, 522` — admin panel lists inject `it.title`, `it.alt`, `item.path` into innerHTML

Fix: copy the `escapeHTML` helper already used in `reviews.js:18`, or switch to `textContent` / `createElement` + `setAttribute`.

### 2. Image URLs from Firestore injected into `src=""` without validation
Same files as #1 (`${it.image}`, `${p.image}`, `${item.url}`). A `javascript:` URL in Firestore becomes an executable vector in admin panels. Add a whitelist check (`https://` only) before assigning.

### 3. Admin "Registra (una tantum)" button exposed in production
`admin.html:47` — once the single admin user is provisioned, anyone who knows the Firebase project ID can call the Auth SDK to register more accounts. The email allowlist stops them from writing data but they will still pollute the Auth user list and consume quota.

Fix: remove the Register button (or hide it behind a dev flag) and disable Email/Password sign-up in the Firebase Auth console once the admin account exists.

### 4. ~~Duplicate script tags in `index.html`~~ (FALSE POSITIVE — closed)
Re-verified: `index.html` loads each Firebase compat module exactly once. Earlier grep output conflated script tags across multiple HTML files. No fix required.

## 🟠 Medium priority

### 5. Firebase SDK loaded without `defer` on admin/blog/blog-post pages
`admin.html:9-12`, `blog.html:32-33`, `blog-post.html:30-31` load Firebase compat scripts synchronously in `<head>`, blocking render. Add `defer`. `index.html` already does this correctly.

### 6. Admin identity hard-coded in three places
`adpasticceriasferruzza@gmail.com` appears in `firebase-config.js`, `firestore.rules`, `storage.rules`. Adding a second admin requires a rules redeploy. Move to an `admins/{uid}` Firestore collection with a boolean flag and have rules read from it.

### 7. Broken URL in sitemap
`sitemap.xml` lists `https://adsferruzza.com/gallery.html` — no such file exists. Remove it or create the page.

### 8. blog-post.html uses a stale canonical/OG
Canonical is `/blog-post.html` with no slug. All `?slug=...` URLs canonicalise to a single page, which will de-list every post except one in search results. `blog.js` rewrites it client-side but crawlers do not always follow. Fix by pre-building one HTML file per slug, or by server-side rendering.

### 9. JSON-LD AggregateRating hard-coded in index.html
`index.html:27` declares `"ratingValue":"5.0","reviewCount":25` statically. `rating.js` rewrites it client-side from `data/reviews.json`, but crawlers often read the static value. Generate `index.html` from `data/reviews.json` at build time in the existing GitHub Action.

### 10. FormSubmit captcha disabled + no alternative anti-bot
`index.html:155` — `<input name="_captcha" value="false">`. The honeypot + timestamp is typically bypassed by bots. Re-enable FormSubmit captcha, or move to a serverless endpoint with Cloudflare Turnstile.

### 11. `storage.rules` missing size/content-type limits
Any signed-in admin can upload files of any size and MIME type. Add:
```
allow write: if isAdmin()
  && request.resource.size < 10 * 1024 * 1024
  && request.resource.contentType.matches('image/.*');
```

## 🟡 Low priority / polish

### 12. `console.log` and `console.warn` left in production
`gallery.js`, `featured.js`, `reviews.js`, `rating.js`. Not harmful, but noisy. Wrap behind a `DEBUG` flag.

### 13. Large single-file modules
`script.js` is 769 lines and `style.css` is 1376 lines. Splitting `script.js` by concern (carousel, lightbox, nav, a11y) would make future changes easier.

### 14. Inline styles in JS templates
`admin.js` and `blog.js` use many `style="…"` attribute strings. Moving to CSS classes makes theming easier.

### 15. CSP requires `'unsafe-inline'` for scripts
`_headers` — `script-src 'self' https://www.gstatic.com 'unsafe-inline'`. Needed only because of the inline year-updating script in `index.html`. JSON-LD blocks use `application/ld+json` and do not count. Move the year script to a `.js` file and drop `unsafe-inline`.

### 16. `favicon.png` is 103 KB
Replace with a ~1 KB optimised 32×32 PNG, or rely solely on `favicon.svg` (651 bytes).

### 17. `partials.js` forces `cache: 'no-store'`
Forces header re-fetch on every navigation. Switch to default caching (ETag-driven) for better performance.

### 18. `robots.txt` not yet reviewed
Verify it does not disallow the site or key assets.

### 19. Dead `/coming-soon` redirect config
`_redirects:1-2` maps `/coming-soon` paths. If the coming-soon page is gone, delete these rules.

## Summary

| Severity | Count |
|----------|-------|
| High     | 3     |
| Medium   | 7     |
| Low      | 8     |

Nothing is critical or exploitable by a random visitor today. Priority #1 is the Firestore-data XSS because the attack surface grows as blog and featured content is added.

## Changelog
- 2026-04-25: Ported scripts to Node, fixed fetch-hours workflow bugs (closed item #19).
- 2026-04-25: Added `safe.js` helper; applied `escapeHTML`/`safeImageURL` in blog.js, featured.js, admin.js (closed items #1, #2).
- 2026-04-25: Hid admin Register button behind `?register=1` flag (closed item #3).
- 2026-04-25: Verified item #4 was a false positive — no duplicate script tags exist.

Nothing is critical or exploitable by a random visitor today. Priority #1 is the Firestore-data XSS because the attack surface grows as blog and featured content is added.
