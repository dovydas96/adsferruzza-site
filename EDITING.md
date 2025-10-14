# Editing Guide

This guide explains how to update images and information on your website.

## Gallery photos
There are three ways the gallery can populate images (in this order):
1) Firestore collection `gallery` (if Firebase is configured)
2) Firebase Storage folder `gallery` (if enabled)
3) Static fallback images in `index.html` inside the `#gallery .gallery-grid`

If you’re not using Firebase, use the static fallback:
- Open `index.html`
- Find the section: `<section id="gallery" class="gallery">`
- Inside the `<div class="gallery-grid">`, replace or add `<img>` tags.
- Each image should have:
  - `src` pointing to `images/gallery/your-photo.jpg` (place the file under `images/gallery/`)
  - `alt` text describing the photo

Example:

```
<img src="images/gallery/new.jpg" alt="Chocolate cannolo" class="gallery-img" tabindex="0">
```

Tips:
- Use JPG or WEBP. Recommended width: 1200px (the site displays them smaller but keeps them crisp on retina screens).
- Keep file names simple (letters, numbers, dashes).

## Featured products
- Open `index.html`
- Find the section `<section id="products" class="products">`
- Each product card is a `<div class="product">` with an `<img>`, a `<h3>`, and a `<p>`.
- Replace the image `src`, product name, and description/price.

## Contact info and social links
- In `index.html`, go to the `<section id="contact">`
- Update address, phone, WhatsApp, email and the social media URLs.
- To hide WhatsApp FAB or welcome popup, remove the corresponding markup near the bottom of `index.html` (class `whatsapp-fab` and the element with id `whatsappPopup`).

## Blog posts
- Blog list is in `blog.html` and each post page uses `blog-post.html` as a template. Duplicate and edit as needed.

## Carousel behavior
The gallery converts into a carousel automatically when the page loads. You can tweak behavior in `script.js`:
- Items per view: controlled by `getVisible()` (1 item on small screens, 3 on larger)
- Autoplay: interval set to 5000 ms; change inside `startAutoplay()`
- Pause on hover/focus is enabled
- Keyboard: Left/Right arrow keys navigate when the carousel has focus
- Lightbox: clicking an image opens it larger; press Escape or click outside to close
- Swipe: drag left/right on mobile (or with a mouse) to navigate
- Thumbnails: small clickable previews under the carousel; the selected one is highlighted

## Image locations
- Place your images under `images/`.
- For the gallery: `images/gallery/`
- For the logo: `images/logo.png`
- For hero: `images/family-hero.jpg`

## Common pitfalls
- If images don’t show, check the `src` paths and file names (Windows is case-insensitive, but browsers are not when deployed).
- Large images slow things down. Optimize using free tools or export at ~1200px width.
- Always provide descriptive `alt` text for accessibility and SEO.

```note
If you’d like to manage content from an admin area or use Google Sheets/Firebase, we can wire that up later.
```

## Firebase-powered gallery
If Firebase is enabled (see `firebase-config.js` and `firebase-init.js`), the gallery prefers Firestore:
- Firestore collection: `gallery`
- Each document should have at least:
  - `url` (string): direct URL of the image (Storage download URL is fine)
  - Optional: `alt` (string)
  - Optional: `createdAt` (timestamp) used for ordering (fallback to `uploadedAt` or no order)

If Firestore is empty or fails, the code attempts to list files from Storage folder `gallery/`.
If both are empty/unavailable, the static fallback images in `index.html` are used.