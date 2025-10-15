// WhatsApp popup logic
document.addEventListener('DOMContentLoaded', () => {
	const popup = document.getElementById('whatsappPopup');
	const closeBtn = document.getElementById('closeWhatsappPopup');

	// Contact form success message handler (for FormSubmit redirect)
	const params = new URLSearchParams(window.location.search);
	const success = params.get('success');
	const formStatus = document.getElementById('formStatus');
	if (success === 'true' && formStatus) {
		formStatus.hidden = false;
		formStatus.textContent = 'Grazie! Il tuo messaggio è stato inviato.';
		// Clean the URL to remove query params
		const url = new URL(window.location.href);
		url.searchParams.delete('success');
		window.history.replaceState({}, '', url.toString());
	}

	if (popup) {
		// Show popup after a short delay once per session
		const key = 'whatsappPopupShown';
		const shown = sessionStorage.getItem(key);
		if (!shown) {
			setTimeout(() => {
				popup.classList.add('show');
				sessionStorage.setItem(key, '1');
			}, 1200);
		}

		closeBtn && closeBtn.addEventListener('click', () => {
			popup.classList.remove('show');
		});

		// Hide popup if user clicks outside of it
		document.addEventListener('click', (e) => {
			if (!popup.contains(e.target) && !e.target.closest('.whatsapp-fab')) {
				popup.classList.remove('show');
			}
		});
		// Map now loads by default via iframe in index.html
	}
});
// Scroll-based fade-in for sections, nav underline, parallax, lightbox, and smooth scroll
document.addEventListener('DOMContentLoaded', function () {
	// Fade-in on scroll
	const faders = document.querySelectorAll('.fade-in-section');
	const appearOptions = {
		threshold: 0.15,
		rootMargin: '0px 0px -40px 0px'
	};
	const appearOnScroll = new IntersectionObserver(function (entries, observer) {
		entries.forEach(entry => {
			if (!entry.isIntersecting) return;
			entry.target.classList.add('visible');
			observer.unobserve(entry.target);
		});
	}, appearOptions);
	faders.forEach(fader => {
		appearOnScroll.observe(fader);
	});


	function initHeaderUI() {
		// Animated nav underline
		const nav = document.querySelector('nav');
		const underline = document.querySelector('.nav-underline');
		const links = document.querySelectorAll('.nav-link');
		if (nav && underline && links.length && !nav.dataset.underlineBound) {
			function moveUnderline(link) {
				const rect = link.getBoundingClientRect();
				const navRect = nav.getBoundingClientRect();
				underline.style.left = (rect.left - navRect.left) + 'px';
				underline.style.width = rect.width + 'px';
			}
			links.forEach(link => {
				link.addEventListener('mouseenter', () => moveUnderline(link));
				link.addEventListener('focus', () => moveUnderline(link));
				link.addEventListener('mouseleave', () => { underline.style.width = 0; });
				link.addEventListener('blur', () => { underline.style.width = 0; });
			});
			nav.dataset.underlineBound = 'true';
		}

		// Redesigned burger: toggle full-screen overlay via body.menu-open
		if (!document.body.dataset.navDelegated) {
			document.addEventListener('click', (e) => {
				const btn = e.target.closest('.nav-toggle');
				if (btn) {
					const isOpen = document.body.classList.contains('menu-open');
					document.body.classList.toggle('menu-open', !isOpen);
					btn.setAttribute('aria-expanded', String(!isOpen));
					return;
				}
				// Close via explicit X button inside overlay
				const closeBtn = e.target.closest('#primary-nav .nav-close');
				if (closeBtn && window.matchMedia('(max-width: 900px)').matches) {
					document.body.classList.remove('menu-open');
					const toggle = document.querySelector('.nav-toggle');
					if (toggle) toggle.setAttribute('aria-expanded', 'false');
					return;
				}
				// close when a nav link is clicked (mobile overlay)
				const navLink = e.target.closest('#primary-nav .nav-link');
				if (navLink && window.matchMedia('(max-width: 900px)').matches) {
					document.body.classList.remove('menu-open');
					const toggle = document.querySelector('.nav-toggle');
					if (toggle) toggle.setAttribute('aria-expanded', 'false');
					return;
				}
				// outside click to close on mobile
				if (window.matchMedia('(max-width: 900px)').matches) {
					if (document.body.classList.contains('menu-open')) {
						const within = e.target.closest('#primary-nav') || e.target.closest('.nav-toggle');
						if (!within) {
							document.body.classList.remove('menu-open');
							const toggle = document.querySelector('.nav-toggle');
							if (toggle) toggle.setAttribute('aria-expanded', 'false');
						}
					}
				}
			});
			// Escape to close
			document.addEventListener('keydown', (e) => {
				if (e.key === 'Escape') {
					if (document.body.classList.contains('menu-open')) {
						document.body.classList.remove('menu-open');
						const toggle = document.querySelector('.nav-toggle');
						if (toggle) toggle.setAttribute('aria-expanded', 'false');
					}
				}
			});
			// On resize to desktop, clear mobile open state
			window.addEventListener('resize', () => {
				if (!window.matchMedia('(max-width: 900px)').matches) {
					document.body.classList.remove('menu-open');
					const toggle = document.querySelector('.nav-toggle');
					if (toggle) toggle.setAttribute('aria-expanded', 'false');
				}
			});
			document.body.dataset.navDelegated = 'true';
		}
	}

	initHeaderUI();
	document.addEventListener('partials:loaded', initHeaderUI, { once: false });

	// Parallax disabled: keep hero image static so it's fully visible without cropping
	const heroImg = document.querySelector('.hero-img');
	if (heroImg) {
		// Ensure no residual transform
		heroImg.style.transform = '';
	}

	// Build Gallery Carousel pulling images from Firebase when available
	const gallerySection = document.getElementById('gallery');
	const galleryGrid = document.querySelector('.gallery-grid');
	if (gallerySection && galleryGrid) {
		(async () => {
			async function loadFromFirestore() {
				try {
					if (!window.firebase || !firebase.firestore) return [];
					const db = firebase.firestore();
					let q = db.collection('gallery');
					try { q = q.orderBy('createdAt', 'desc'); } catch (_) {}
					const snap = await q.get();
					return snap.docs.map(doc => {
						const d = doc.data() || {};
						return { src: d.url || d.image || d.downloadURL || '', alt: d.alt || 'Foto galleria' };
					}).filter(x => x.src);
				} catch (e) { console.warn('Firestore gallery load failed', e); return []; }
			}
			async function loadFromStorage() {
				try {
					if (!window.firebase || !firebase.storage) return [];
					const storage = firebase.storage();
					const ref = storage.ref('gallery');
					const list = await ref.listAll();
					const urls = await Promise.all(list.items.map(i => i.getDownloadURL().catch(() => '')));
					return urls.filter(Boolean).map(u => ({ src: u, alt: 'Foto galleria' }));
				} catch (e) { console.warn('Storage gallery load failed', e); return []; }
			}
			function loadFromDOM() {
				return Array.from(galleryGrid.querySelectorAll('img')).map(img => ({
					src: img.getAttribute('src'),
					alt: img.getAttribute('alt') || 'Foto galleria'
				})).filter(x => x.src);
			}

			let imgs = await loadFromFirestore();
			if (!imgs.length) imgs = await loadFromStorage();
			if (!imgs.length) imgs = loadFromDOM();
			if (!imgs.length) return;

			// Create carousel elements
			const carousel = document.createElement('div');
			carousel.className = 'gallery-carousel';
			carousel.setAttribute('role', 'region');
			carousel.setAttribute('aria-label', 'Galleria fotografica');
			const list = document.createElement('div');
			list.className = 'gallery-track';
			list.setAttribute('role', 'list');
			// Inline styles to guarantee horizontal alignment even if CSS is cached
			list.style.display = 'flex';
			list.style.flexWrap = 'nowrap';
			list.style.justifyContent = 'center';
			list.style.alignItems = 'stretch';
			list.style.gap = '2rem';
			carousel.appendChild(list);
			const nav = document.createElement('div');
			nav.className = 'gallery-nav';
			nav.setAttribute('role', 'group');
			nav.setAttribute('aria-label', 'Controlli galleria');
			const prevBtn = document.createElement('button');
			prevBtn.className = 'gallery-prev leave-review-btn';
			prevBtn.setAttribute('aria-label', 'Foto precedenti');
			prevBtn.textContent = '\u2039';
			const nextBtn = document.createElement('button');
			nextBtn.className = 'gallery-next leave-review-btn';
			nextBtn.setAttribute('aria-label', 'Altre foto');
			nextBtn.textContent = '\u203a';
			nav.appendChild(prevBtn);
			nav.appendChild(nextBtn);
			// Thumbnails strip
			const thumbs = document.createElement('div');
			thumbs.className = 'gallery-thumbs';
			thumbs.setAttribute('role', 'tablist');
			// Insert carousel, thumbs and nav after grid, then hide grid
			galleryGrid.insertAdjacentElement('afterend', nav);
			galleryGrid.insertAdjacentElement('afterend', thumbs);
			galleryGrid.insertAdjacentElement('afterend', carousel);
			galleryGrid.style.display = 'none';

			let index = 0;
			const getVisible = () => (window.innerWidth <= 480 ? 1 : 3);
			function renderWindow() {
				const visible = Math.min(getVisible(), imgs.length);
				list.innerHTML = '';
				for (let i = 0; i < visible; i++) {
					const item = imgs[(index + i) % imgs.length];
					const card = document.createElement('div');
					card.className = 'gallery-card';
					card.style.width = '320px';
					card.style.flex = '0 0 320px';
					const image = document.createElement('img');
					image.className = 'gallery-img';
					image.src = item.src;
					image.alt = item.alt;
					image.tabIndex = 0;
					image.title = 'Clicca per ingrandire';
					image.setAttribute('role', 'listitem');
					card.appendChild(image);
					list.appendChild(card);
				}
				// Hide nav if not needed
				const needNav = imgs.length > getVisible();
				prevBtn.style.display = needNav ? '' : 'none';
				nextBtn.style.display = needNav ? '' : 'none';
				carousel.setAttribute('aria-live', needNav ? 'polite' : 'off');

				// Render thumbs
				thumbs.innerHTML = '';
				imgs.forEach((it, i) => {
					const b = document.createElement('button');
					b.className = 'gallery-thumb';
					b.setAttribute('role', 'tab');
					b.setAttribute('aria-selected', i === index ? 'true' : 'false');
					b.setAttribute('aria-label', `Mostra immagine ${i+1}`);
					const thumbImg = document.createElement('img');
					thumbImg.src = it.src;
					thumbImg.alt = '';
					thumbImg.decoding = 'async';
					thumbImg.loading = 'lazy';
					b.appendChild(thumbImg);
					b.addEventListener('click', () => {
						index = i;
						renderWindow();
					});
					thumbs.appendChild(b);
				});
			}

			// Initial render
			renderWindow();

			// Nav handlers
			prevBtn.addEventListener('click', () => {
				const step = getVisible();
				index = (index - step + imgs.length) % imgs.length;
				renderWindow();
			});
			nextBtn.addEventListener('click', () => {
				const step = getVisible();
				index = (index + step) % imgs.length;
				renderWindow();
			});

			// Keyboard controls (Left/Right arrows)
			carousel.tabIndex = 0;
			carousel.addEventListener('keydown', (e) => {
				if (e.key === 'ArrowLeft') { prevBtn.click(); }
				if (e.key === 'ArrowRight') { nextBtn.click(); }
			});

			// Responsive recalculation
			let resizeTimer;
			window.addEventListener('resize', () => {
				clearTimeout(resizeTimer);
				resizeTimer = setTimeout(() => {
					const step = getVisible();
					index = Math.floor(index / step) * step % imgs.length;
					renderWindow();
				}, 120);
			});

			// Optional autoplay (paused on hover/focus)
			let autoplayId = null;
			function startAutoplay() {
				stopAutoplay();
				autoplayId = setInterval(() => {
					const step = getVisible();
					index = (index + step) % imgs.length;
					renderWindow();
				}, 5000);
			}
			function stopAutoplay() { if (autoplayId) { clearInterval(autoplayId); autoplayId = null; } }
			startAutoplay();
			[carousel, prevBtn, nextBtn, thumbs].forEach(el => {
				el.addEventListener('mouseenter', stopAutoplay);
				el.addEventListener('mouseleave', startAutoplay);
				el.addEventListener('focusin', stopAutoplay);
				el.addEventListener('focusout', startAutoplay);
			});

			// Swipe gestures (pointer/touch)
			let isPointer = false;
			let startX = 0;
			let deltaX = 0;
			const threshold = 40; // px to consider a swipe
			function onDown(e) {
				isPointer = true;
				startX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
				deltaX = 0;
				stopAutoplay();
			}
			function onMove(e) {
				if (!isPointer) return;
				const x = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
				deltaX = x - startX;
			}
			function onUp() {
				if (!isPointer) return;
				isPointer = false;
				if (Math.abs(deltaX) > threshold) {
					if (deltaX < 0) { nextBtn.click(); } else { prevBtn.click(); }
				}
				startAutoplay();
			}
			list.addEventListener('mousedown', onDown);
			list.addEventListener('mousemove', onMove);
			window.addEventListener('mouseup', onUp);
			list.addEventListener('touchstart', onDown, { passive: true });
			list.addEventListener('touchmove', onMove, { passive: true });
			list.addEventListener('touchend', onUp);
		})();
	}

	// Lightbox for gallery (event delegation so it works for dynamic images)
	const lightbox = document.getElementById('lightbox-modal');
	const lightboxImg = document.querySelector('.lightbox-img');
	const lightboxClose = document.querySelector('.lightbox-close');
	function openLightbox(src, alt) {
		// Ensure modal is attached to body to avoid being clipped by section overflow
		if (lightbox.parentElement !== document.body) {
			document.body.appendChild(lightbox);
		}
		lightboxImg.src = src;
		lightboxImg.alt = alt;
		lightbox.style.display = 'grid';
		// Force a reflow to apply transitions correctly on some browsers
		void lightbox.offsetHeight;
		document.body.style.overflow = 'hidden';
		lightbox.focus();
	}
	function closeLightbox() {
		lightbox.style.display = 'none';
		document.body.style.overflow = '';
		lightboxImg.src = '';
	}
	const galleryRoot = document.querySelector('.gallery');
	if (galleryRoot) {
		galleryRoot.addEventListener('click', (e) => {
			const target = e.target.closest('.gallery-img');
			if (target) openLightbox(target.src, target.alt || 'Foto galleria');
		});
		galleryRoot.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				const target = e.target.closest('.gallery-img');
				if (target) { e.preventDefault(); openLightbox(target.src, target.alt || 'Foto galleria'); }
			}
		});
	}
	if (lightboxClose) {
		lightboxClose.addEventListener('click', closeLightbox);
		lightboxClose.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' || e.key === ' ') closeLightbox();
		});
	}
	if (lightbox) {
		lightbox.addEventListener('click', (e) => {
			if (e.target === lightbox) closeLightbox();
		});
		document.addEventListener('keydown', (e) => {
			const visible = lightbox.style.display && lightbox.style.display !== 'none';
			if (visible && e.key === 'Escape') closeLightbox();
		});
	}

	// Hero section animated overlay and heading glow
	// Add animated gold shimmer overlay to hero image (only on pages that have hero)
	const hero = document.querySelector('.parallax-hero');
	if (hero && !document.querySelector('.hero-shimmer')) {
		const shimmer = document.createElement('div');
		shimmer.className = 'hero-shimmer';
		hero.appendChild(shimmer);
	}
	// Add heading glow
	const heroHeading = document.querySelector('.hero h1');
	if (heroHeading) {
		heroHeading.classList.add('hero-heading-glow');
	}

	// Button ripple effect

	// Equalize contact card & form heights (robust against dynamic content changes)
	(function equalizeContactPanels(){
		const container = document.querySelector('.contact-flex');
		if(!container) return;
		// If using CSS grid, heights are handled by grid row sizing; do nothing.
		if(getComputedStyle(container).display === 'grid') return;
		const card = container.querySelector('.contact-info-card');
		const form = container.querySelector('.contact-form');
		if(!card || !form) return;
		let rafId = null;
		let lastH = 0;
		function apply(){
			card.style.removeProperty('min-height');
			form.style.removeProperty('min-height');
			const h = Math.max(card.offsetHeight, form.offsetHeight);
			if(Math.abs(h - lastH) < 1) return; // prevent micro-growth loops
			lastH = h;
			card.style.minHeight = form.style.minHeight = h+'px';
		}
		function schedule(){
			if(rafId) cancelAnimationFrame(rafId);
			rafId = requestAnimationFrame(apply);
		}
		const ro = new ResizeObserver(schedule);
		[card, form].forEach(el => ro.observe(el));
		window.addEventListener('orientationchange', schedule);
		window.addEventListener('resize', schedule);
		document.addEventListener('hours-updated', schedule, { once:false });
		schedule();
	})();
	function addRippleEffect(btn) {
		btn.addEventListener('click', function(e) {
			const rect = btn.getBoundingClientRect();
			const ripple = document.createElement('span');
			ripple.className = 'ripple';
			ripple.style.left = (e.clientX - rect.left) + 'px';
			ripple.style.top = (e.clientY - rect.top) + 'px';
			ripple.style.width = ripple.style.height = Math.max(rect.width, rect.height) + 'px';
			btn.appendChild(ripple);
			ripple.addEventListener('animationend', () => ripple.remove());
		});
	}
	const rippleSelector = '.submit-btn, .leave-review-btn, .blog-readmore, .gallery-prev, .gallery-next, .cta-phones a, .call-btn, .whatsapp-btn';
	// Delegate to catch dynamically inserted buttons too
	document.addEventListener('click', function(e){
		const btn = e.target.closest(rippleSelector);
		if(!btn) return;
		const rect = btn.getBoundingClientRect();
		const ripple = document.createElement('span');
		ripple.className = 'ripple';
		ripple.style.left = (e.clientX - rect.left) + 'px';
		ripple.style.top = (e.clientY - rect.top) + 'px';
		ripple.style.width = ripple.style.height = Math.max(rect.width, rect.height) + 'px';
		btn.appendChild(ripple);
		ripple.addEventListener('animationend', () => ripple.remove());
	}, true);

	// Add gold SVG icons to social links
	function addSocialIcons() {
		const icons = {
				Instagram: '<svg class="social-icon" viewBox="0 0 24 24" width="1em" height="1em" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2"/><rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" stroke-width="2"/><circle cx="18" cy="6" r="1" fill="currentColor"/></svg>',
				Facebook: '<svg class="social-icon" viewBox="0 0 24 24" width="1em" height="1em" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" stroke-width="2"/><path d="M16 8h-2a2 2 0 0 0-2 2v2h4l-.5 3H12v7" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
				TikTok: '<svg class="social-icon" viewBox="0 0 24 24" width="1em" height="1em" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" stroke-width="2"/><path d="M16 10.5c-1.5 0-2.5-1-2.5-2.5V7h-2v7a2 2 0 1 1-2-2" stroke="currentColor" stroke-width="2" fill="none"/></svg>'
			};
		document.querySelectorAll('.social-links a').forEach(a => {
			const name = a.textContent.trim();
			if (icons[name] && !a.querySelector('.social-icon')) {
				a.insertAdjacentHTML('afterbegin', icons[name]);
			}
		});
	}
	document.addEventListener('DOMContentLoaded', addSocialIcons);

	// Scroll-to-top button logic
	const scrollBtn = document.getElementById('scrollToTopBtn');
	if (scrollBtn) {
		window.addEventListener('scroll', function() {
		  if (window.scrollY > 300) {
		    scrollBtn.classList.add('show');
		  } else {
		    scrollBtn.classList.remove('show');
		  }
		});
		scrollBtn.addEventListener('click', function() {
		  window.scrollTo({ top: 0, behavior: 'smooth' });
		});
	}
});
