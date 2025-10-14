# Website Improvements Roadmap

This document consolidates all actionable recommendations for the pastry shop website. Priority: P1 (Now), P2 (Next), P3 (Later). Effort: S (Small), M (Medium), L (Large).

## P1 — Now (high impact, low/medium effort)

- [ ] Accessibility (P1, M)
  - [ ] Verify color contrast for new accent (#FFE2A1) on dark backgrounds (WCAG AA).
  - [ ] Ensure visible focus states everywhere; test keyboard-only navigation (tab/shift+tab).
  - [ ] Add prefers-reduced-motion support to reduce animations for motion-sensitive users.
  - [ ] Validate heading order and ARIA labels with Lighthouse/axe.
- [ ] Performance baseline (P1, M)
  - [ ] Convert hero and product images to AVIF/WEBP; keep JPEG fallback.
  - [ ] Set correct sizes/srcset for all images; audit with Lighthouse.
  - [ ] Minify CSS/JS, enable gzip/brotli on host; add long-lived cache headers for static assets.
  - [ ] Self-host Google Fonts or use font-display: swap; preconnect/preload as needed.
  - [ ] Extract/inline critical CSS for above-the-fold content.
- [ ] SEO hygiene (P1, S)
  - [ ] Page-specific title and meta description per page (home, blog, any future subpages).
  - [ ] Absolute canonical URLs and og:url (use full domain).
  - [ ] Add a custom 404 page and include it in the sitemap.
- [ ] Forms and anti-spam (P1, S)
  - [ ] Add honeypot field and basic rate limit; optionally enable reCAPTCHA/invisible challenge.
  - [ ] Confirm success redirect and message are localized and accessible (aria-live works).
- [ ] Privacy and consent (P1, S)
  - [ ] Add a simple Privacy Policy page (and Cookie Policy if analytics/cookies are added).
  - [ ] If adding analytics, implement a consent banner (no tracking until accepted).

## P2 — Next (medium impact or requires more setup)

- [ ] Progressive Web App (PWA) (P2, M)
  - [ ] Add manifest.json (icons, theme/background colors matching brand) and a service worker (precache shell + runtime caching for images).
  - [ ] Offline fallback page and “Add to Home Screen” readiness.
- [ ] Analytics and insights (P2, S/M)
  - [ ] Integrate GA4 or Matomo with consent mode; add basic events (CTA clicks, WhatsApp clicks, form submits, gallery lightbox opens).
  - [ ] Create a UTM strategy for social links; add campaign tags to profile links and site buttons.
- [ ] Structured data expansion (P2, S/M)
  - [ ] Add BreadcrumbList (home → sections/pages), WebSite with SearchAction, and an FAQPage for recurring customer questions.
  - [ ] If product pages are added, use Product with Offer and image, priceSpecification, availability.
- [ ] Content and brand (P2, M)
  - [ ] Commission a small photo shoot for hero and featured items.
  - [ ] Establish a blog cadence (1–2 posts/month); prepare a content calendar with seasonal specialties.
  - [ ] Create shareable OG images per page/post (can be templated/generate via script).
- [ ] Hosting and CI/CD (P2, S/M)
  - [ ] Choose host (Netlify/Vercel/GitHub Pages) and set up CI with preview deploys on pull requests.
  - [ ] Add simple checks (Lighthouse CI, HTML/CSS lint) to CI.

## P3 — Later (bigger features or optional)

- [ ] Internationalization (P3, M/L)
  - [ ] Add English content variant; route with /en/ and hreflang tags; define translation workflow.
- [ ] Admin tooling (P3, M)
  - [ ] Add a lightweight admin page to upload gallery images to Firebase Storage and write Firestore docs.
  - [ ] Scheduled backups for Firestore/Storage and a small restore guide.
- [ ] Testing and quality (P3, M)
  - [ ] E2E tests with Playwright for nav, hamburger menu, lightbox, and form submit flow.
  - [ ] Accessibility tests (axe) and visual regression (Percy/Chromatic alternative) for key pages.
- [ ] Monitoring and reliability (P3, S/M)
  - [ ] Uptime monitor (e.g., UptimeRobot) and client-side error reporting (Sentry) for JavaScript errors.
  - [ ] Real User Monitoring (optional) via your analytics choice.
- [ ] Security & hardening (P3, M)
  - [ ] Add a Content Security Policy (CSP) tuned for your assets (images, Firebase, fonts).
  - [ ] Ensure referrer-policy, x-content-type-options, and other standard headers are set by the host.
  - [ ] Migrate contact to a custom backend in future if needed (spam control/logging), with proper input validation.

## Nice-to-haves

- [ ] Design tokens (S)
  - [ ] Expand CSS variables to include neutrals, spacing scale, radius, and shadows for easier theming.
- [ ] Component polish (S/M)
  - [ ] Replace remaining inline styles with utility classes; ensure no style drift.
  - [ ] Add subtle hover states to product cards and CTA buttons using the new accent variables.
- [ ] Social & messaging (S)
  - [ ] Add WhatsApp message templates (e.g., pre-filled flavors/order sizes) with UTM parameters.
  - [ ] Add a simple “link-in-bio” page for Instagram with current promos.
- [ ] Email/domain hygiene (S)
  - [ ] If using a branded email, configure SPF, DKIM, and DMARC on the domain.

## Acceptance checks

- [ ] Lighthouse scores ≥ 90 for Performance, Accessibility, Best Practices, and SEO on a mobile profile.
- [ ] No critical accessibility issues in axe scan.
- [ ] All first-party assets cached with sensible headers; fonts are fast with fallback.
- [ ] No console errors in a typical page flow.

## Implementation tips

- Keep Firebase optional. When disabled, ensure gallery gracefully hides.
- Prefer CSS variables for all brand accents (already added: --accent, --accent-dark).
- Use currentColor for inline SVGs (done for social + scroll-to-top) so theme colors flow from CSS.
- Store large images in an /images/optimized/ folder and keep originals separately.
- Add a .well-known/security.txt and humans.txt if desired.
