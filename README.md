# AD Sferruzza Pasticceria — Sito vetrina

Static site with optional Firebase to manage featured items, gallery, and admin uploads.

What’s inside:
- index.html — landing with hero, featured, gallery, reviews, contact, map
- style.css / script.js — styles and interactivity (carousel, lightbox, a11y)
- featured.js / gallery.js / reviews.js — data loading; Firebase optional
- data/reviews.json — cached Google reviews snapshot (rating and total)
- robots.txt / sitemap.xml — basic SEO
- EDITING.md — how to update content and options
- website-layout-log.md — running notes on layout and decisions

## Documentation

- RECOMMENDATIONS.md — original improvement suggestions
- ROADMAP.md — consolidated, prioritized list of improvements

## Automation

Instagram feed and Google reviews can be updated automatically without a server via GitHub Actions:

- Reviews: `.github/workflows/fetch-reviews.yml` uses `scripts/fetch-google-reviews.ps1` and updates `data/reviews.json`.
	- Secrets required: `GOOGLE_PLACES_API_KEY`, `GOOGLE_PLACE_ID` (preferred) or `GOOGLE_MAPS_URL`.
- Instagram: `.github/workflows/fetch-instagram.yml` uses `scripts/fetch-instagram-media.ps1` and updates `data/instagram.json`.
	- Secrets required: `IG_ACCESS_TOKEN` (Graph API token) and `IG_USER_ID`.

Your site reads these JSON files at runtime to render reviews and, optionally, Instagram media.

Quick start:
- Open index.html in a browser (or serve locally)
- Replace placeholder images/texts; see EDITING.md
- To enable Firebase, fill firebase-config.js and ensure FIREBASE_ENABLED = true

Performance/SEO:
- Hero preloaded; images have width/height to reduce CLS
- Open Graph/Twitter set; JSON-LD includes Bakery and OfferCatalog
- Use scripts/optimize-images.ps1 to downsize JPEGs on Windows PowerShell

License: Content is placeholder; replace with your own. Code MIT unless specified otherwise.
