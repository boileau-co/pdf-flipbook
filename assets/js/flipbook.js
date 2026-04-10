/**
 * PDF Flipbook — main application script.
 * Renders a PDF via pdf.js into a page-flip (StPageFlip) viewer with toolbar.
 */
import * as pdfjsLib from './vendor/pdf.min.mjs';

(function () {
	'use strict';

	// Configure pdf.js worker
	pdfjsLib.GlobalWorkerOptions.workerSrc = pfbData.workerUrl;

	/* ------------------------------------------------------------------ */
	/*  Icons (inline SVG strings — Material-style, 24×24 viewBox)        */
	/* ------------------------------------------------------------------ */
	const ICONS = {
		prevPage:    '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>',
		nextPage:    '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/></svg>',
		singlePage:  '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M4 6h6v12H4zm0-2c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2H4z"/></svg>',
		doublePage:  '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M4 6h6v12H4zm10 0h6v12h-6zM4 4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2H4zm10 0c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-6z"/></svg>',
		zoomIn:      '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zm.5-7H9v2H7v1h2v2h1v-2h2V9h-2z"/></svg>',
		zoomOut:     '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14zM7 9h5v1H7z"/></svg>',
		fullscreen:  '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>',
		exitFull:    '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>',
		download:    '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>',
		thumbnails:  '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M4 5h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4zM4 11h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4zM4 17h4v4H4zm6 0h4v4h-4zm6 0h4v4h-4z"/></svg>',
	};

	/* ------------------------------------------------------------------ */
	/*  Helpers                                                           */
	/* ------------------------------------------------------------------ */
	function el(tag, cls, attrs) {
		const e = document.createElement(tag);
		if (cls) e.className = cls;
		if (attrs) Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
		return e;
	}

	function btn(icon, title, onClick) {
		const b = el('button', 'pfb-btn', { type: 'button', title: title, 'aria-label': title });
		b.innerHTML = icon;
		b.addEventListener('click', onClick);
		return b;
	}

	/* ------------------------------------------------------------------ */
	/*  PFBViewer class                                                   */
	/* ------------------------------------------------------------------ */
	class PFBViewer {
		constructor(wrapper) {
			this.wrapper    = wrapper;
			this.pdfUrl     = wrapper.dataset.pdfUrl;
			this.pages      = [];       // canvas elements
			this.pageCount  = 0;
			this.zoom        = 1;
			this.minZoom     = 0.5;
			this.maxZoom     = 3;
			this.singleMode  = false;
			this.singleFocus = 'right'; // which side of the spread is shown in single mode
			this.currentSinglePage = 0; // tracks page index in single mode
			this.isFullscreen = false;
			this.thumbsOpen   = false;
			this.flipBook     = null;
			this.pdfDoc       = null;
			this.pageRatio    = 1;      // height / width of a single PDF page

			this.init();
		}

		async init() {
			try {
				await this.loadPdf();
				this.buildDOM();
				this.initFlipBook();
				this.buildToolbar();
				this.buildThumbnailPanel();
				this.bindKeyboard();
				this.updatePageDisplay();
			} catch (err) {
				console.error('PDF Flipbook error:', err);
				this.wrapper.innerHTML = '<p class="pfb-error">Unable to load PDF.</p>';
			}
		}

		/* ---------- PDF loading ---------- */
		async loadPdf() {
			this.pdfDoc = await pdfjsLib.getDocument(this.pdfUrl).promise;
			this.pageCount = this.pdfDoc.numPages;

			// Get page dimensions from the first page (at scale 1) for aspect ratio
			const firstPage = await this.pdfDoc.getPage(1);
			const baseVp = firstPage.getViewport({ scale: 1 });
			this.pageRatio = baseVp.height / baseVp.width;

			// Render all pages to canvas at 2× for crispness
			const scale = 2;
			for (let i = 1; i <= this.pageCount; i++) {
				const page = await this.pdfDoc.getPage(i);
				const vp = page.getViewport({ scale });
				const canvas = document.createElement('canvas');
				canvas.width = vp.width;
				canvas.height = vp.height;
				const ctx = canvas.getContext('2d');
				await page.render({ canvasContext: ctx, viewport: vp }).promise;
				this.pages.push(canvas);
			}
		}

		/* ---------- DOM structure ---------- */
		buildDOM() {
			this.wrapper.innerHTML = '';

			// Viewport container — scrollable when zoomed
			this.viewport = el('div', 'pfb-viewport');

			// Book container — StPageFlip mounts here
			this.bookEl = el('div', 'pfb-book');

			// Create page divs with canvases
			this.pages.forEach((canvas, idx) => {
				const pageDiv = el('div', 'pfb-page');
				pageDiv.dataset.pageIndex = idx;
				pageDiv.appendChild(canvas);
				this.bookEl.appendChild(pageDiv);
			});

			this.viewport.appendChild(this.bookEl);
			this.wrapper.appendChild(this.viewport);

			// Set initial size
			this.sizeToFit();
			this._resizeHandler = () => this.sizeToFit();
			window.addEventListener('resize', this._resizeHandler);
		}

		/**
		 * Size the viewport and book to fill the wrapper width, maintaining
		 * the PDF page aspect ratio.
		 * Double-page: spread = 2 pages wide, so each page = half the book width.
		 * Single-page: viewport height matches one full page at the book width / 2.
		 */
		sizeToFit() {
			const w = this.wrapper.clientWidth;
			const padding = 64; // 32px each side from CSS
			const bookW = w - padding;
			const singlePageW = bookW / 2;
			const spreadH = Math.round(singlePageW * this.pageRatio);

			// Book element always sized for the spread (StPageFlip needs this)
			this.bookEl.style.width = bookW + 'px';
			this.bookEl.style.height = spreadH + 'px';

			if (this.singleMode) {
				// In single mode, viewport shows one page's height at full zoom
				// We scale 2× so one page fills the width, so visible height = spreadH * 2
				const singleH = Math.round(bookW * this.pageRatio);
				this.baseHeight = singleH + 48;
			} else {
				this.baseHeight = spreadH + 48;
			}

			this.viewport.style.height = this.baseHeight + 'px';

			if (this.flipBook) {
				this.flipBook.update();
			}
		}

		/* ---------- StPageFlip init ---------- */
		initFlipBook() {
			// Use the PDF page's native aspect ratio for StPageFlip dimensions.
			// size:'stretch' will scale to fill the bookEl container.
			this.flipBook = new St.PageFlip(this.bookEl, {
				width: 100,
				height: Math.round(100 * this.pageRatio),
				size: 'stretch',
				maxShadowOpacity: 0.3,
				showCover: true,
				mobileScrollSupport: true,
				usePortrait: false,
				drawShadow: true,
				flippingTime: 600,
				startZIndex: 0,
			});

			this.flipBook.loadFromHTML(this.bookEl.querySelectorAll('.pfb-page'));

			this.flipBook.on('flip', () => {
				this.updatePageDisplay();
			});
		}

		/* ---------- Toolbar ---------- */
		buildToolbar() {
			this.toolbar = el('div', 'pfb-toolbar');

			// === LEFT GROUP: pagination, view toggle, thumbnails ===
			const left = el('div', 'pfb-toolbar-left');

			left.appendChild(btn(ICONS.prevPage, 'Previous page', () => this.prevPage()));

			this.pageInput = el('input', 'pfb-page-input', {
				type: 'number', min: '1', max: String(this.pageCount), value: '1',
				'aria-label': 'Page number',
			});
			this.pageInput.addEventListener('change', () => {
				let n = parseInt(this.pageInput.value, 10);
				if (n >= 1 && n <= this.pageCount) {
					this.flipBook.turnToPage(n - 1);
				}
			});
			this.pageInput.addEventListener('keydown', (e) => {
				if (e.key === 'Enter') this.pageInput.blur();
			});

			const pageWrap = el('span', 'pfb-page-indicator');
			pageWrap.appendChild(this.pageInput);
			this.pageTotal = document.createTextNode(' / ' + this.pageCount);
			pageWrap.appendChild(this.pageTotal);
			left.appendChild(pageWrap);

			left.appendChild(btn(ICONS.nextPage, 'Next page', () => this.nextPage()));
			left.appendChild(el('span', 'pfb-sep'));

			this.btnViewMode = btn(ICONS.singlePage, 'Single page view', () => this.toggleViewMode());
			left.appendChild(this.btnViewMode);
			left.appendChild(el('span', 'pfb-sep'));

			left.appendChild(btn(ICONS.thumbnails, 'Thumbnails', () => this.toggleThumbnails()));

			this.toolbar.appendChild(left);

			// === CENTER GROUP: zoom ===
			const center = el('div', 'pfb-toolbar-center');

			center.appendChild(btn(ICONS.zoomOut, 'Zoom out', () => this.setZoom(this.zoom - 0.25)));

			this.zoomSlider = el('input', 'pfb-zoom-slider', {
				type: 'range', min: '50', max: '300', value: '100', step: '5',
				'aria-label': 'Zoom level',
			});
			this.zoomSlider.addEventListener('input', () => {
				this.setZoom(parseInt(this.zoomSlider.value, 10) / 100);
			});
			center.appendChild(this.zoomSlider);

			center.appendChild(btn(ICONS.zoomIn, 'Zoom in', () => this.setZoom(this.zoom + 0.25)));

			this.zoomLabel = el('span', 'pfb-zoom-label');
			this.zoomLabel.textContent = '100%';
			center.appendChild(this.zoomLabel);

			this.toolbar.appendChild(center);

			// === RIGHT GROUP: fullscreen, download ===
			const right = el('div', 'pfb-toolbar-right');

			this.btnFullscreen = btn(ICONS.fullscreen, 'Fullscreen', () => this.toggleFullscreen());
			right.appendChild(this.btnFullscreen);

			right.appendChild(btn(ICONS.download, 'Download PDF', () => this.downloadPdf()));

			this.toolbar.appendChild(right);

			this.wrapper.appendChild(this.toolbar);
		}

		/* ---------- Thumbnail panel ---------- */
		buildThumbnailPanel() {
			this.thumbPanel = el('div', 'pfb-thumbnails');
			this.thumbPanel.classList.add('pfb-hidden');

			const grid = el('div', 'pfb-thumb-grid');
			this.pages.forEach((canvas, idx) => {
				const thumb = el('div', 'pfb-thumb');
				thumb.dataset.page = idx;
				const thumbCanvas = document.createElement('canvas');
				const scale = 120 / canvas.width;
				thumbCanvas.width = 120;
				thumbCanvas.height = canvas.height * scale;
				const ctx = thumbCanvas.getContext('2d');
				ctx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
				thumb.appendChild(thumbCanvas);

				const label = el('span', 'pfb-thumb-label');
				label.textContent = idx + 1;
				thumb.appendChild(label);

				thumb.addEventListener('click', () => {
					this.flipBook.flip(idx);
					this.toggleThumbnails();
				});

				grid.appendChild(thumb);
			});
			this.thumbPanel.appendChild(grid);
			this.viewport.appendChild(this.thumbPanel);
		}

		/* ---------- Keyboard navigation ---------- */
		bindKeyboard() {
			// Make wrapper focusable and focus on click
			this.wrapper.setAttribute('tabindex', '0');
			this.wrapper.style.outline = 'none';
			this.viewport.addEventListener('click', () => this.wrapper.focus());

			this.wrapper.addEventListener('keydown', (e) => {
				if (e.key === 'ArrowLeft') {
					e.preventDefault();
					this.prevPage();
				} else if (e.key === 'ArrowRight') {
					e.preventDefault();
					this.nextPage();
				}
			});
		}

		/* ---------- Navigation ---------- */
		prevPage() {
			if (this.singleMode) {
				this.goToSinglePage(this.currentSinglePage - 1);
				return;
			}
			this.flipBook.flipPrev();
		}

		nextPage() {
			if (this.singleMode) {
				this.goToSinglePage(this.currentSinglePage + 1);
				return;
			}
			this.flipBook.flipNext();
		}

		/**
		 * Get which side of the spread a page lives on.
		 * Cover (page 0) is alone — returns 'center' for single-page PDFs
		 * or 'right' for multi-page. After cover: odd=left, even=right.
		 * Last page alone on a spread also returns 'center'.
		 */
		getPageSide(pageIdx) {
			if (this.pageCount === 1) return 'center';
			if (pageIdx === 0) return 'right';
			// Last page, alone on its spread (odd page count means last is alone)
			if (pageIdx === this.pageCount - 1 && this.pageCount % 2 === 0) return 'left';
			return (pageIdx % 2 === 1) ? 'left' : 'right';
		}

		/**
		 * Get the spread index for a given page.
		 * Cover = spread 0, then [1,2]=spread 1, [3,4]=spread 2, etc.
		 */
		getSpreadIndex(pageIdx) {
			if (pageIdx === 0) return 0;
			return Math.ceil(pageIdx / 2);
		}

		/**
		 * Navigate to a specific page in single-page mode.
		 * Slides within a spread, flips when changing spreads.
		 */
		goToSinglePage(pageIdx) {
			if (pageIdx < 0 || pageIdx >= this.pageCount) return;

			const oldPage = this.currentSinglePage;
			const oldSpread = this.getSpreadIndex(oldPage);
			const newSpread = this.getSpreadIndex(pageIdx);
			const newSide = this.getPageSide(pageIdx);

			this.currentSinglePage = pageIdx;
			this.singleFocus = newSide;

			if (oldSpread !== newSpread) {
				// Different spread — use flip animation, then reposition after
				this.bookEl.classList.remove('pfb-animate-slide');
				if (pageIdx > oldPage) {
					this.flipBook.flipNext();
				} else {
					this.flipBook.flipPrev();
				}
				// After flip completes, ensure correct position
				const onFlip = () => {
					this.flipBook.off('flip', onFlip);
					this.applyZoom();
					this.updatePageDisplay();
				};
				this.flipBook.on('flip', onFlip);
			} else {
				// Same spread — animate the slide
				this.bookEl.classList.add('pfb-animate-slide');
				this.applyZoom();
				this.updatePageDisplay();
			}
		}

		/* ---------- View mode ---------- */
		toggleViewMode() {
			this.singleMode = !this.singleMode;
			if (this.singleMode) {
				this.btnViewMode.innerHTML = ICONS.doublePage;
				this.btnViewMode.title = 'Two page view';
				this.btnViewMode.setAttribute('aria-label', 'Two page view');
				// Start single mode on whatever page StPageFlip is currently showing
				this.currentSinglePage = this.flipBook.getCurrentPageIndex();
				this.singleFocus = this.getPageSide(this.currentSinglePage);
				this.sizeToFit();
			} else {
				this.btnViewMode.innerHTML = ICONS.singlePage;
				this.btnViewMode.title = 'Single page view';
				this.btnViewMode.setAttribute('aria-label', 'Single page view');
				this.sizeToFit();
			}
			this.applyZoom();
			this.updatePageDisplay();
		}

		/* ---------- Zoom ---------- */
		setZoom(level) {
			this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, level));
			this.zoomSlider.value = Math.round(this.zoom * 100);
			this.zoomLabel.textContent = Math.round(this.zoom * 100) + '%';
			this.applyZoom();
		}

		applyZoom() {
			const z = this.singleMode ? this.zoom * 2 : this.zoom;
			// Viewport height stays fixed at baseHeight — scroll for zoomed content
			this.bookEl.style.transform = 'scale(' + z + ')';
			this.bookEl.style.transformOrigin = 'top center';

			// In single mode, shift to show one page
			if (this.singleMode) {
				let shiftX = 0;
				if (this.singleFocus === 'left') shiftX = 25;
				else if (this.singleFocus === 'right') shiftX = -25;
				// 'center' = 0, no shift needed
				this.bookEl.style.transform = 'scale(' + z + ') translateX(' + shiftX + '%)';
			}

			// Allow scrolling when zoomed beyond fit
			this.viewport.style.overflow = z > 1 ? 'auto' : 'hidden';
		}

		/* ---------- Fullscreen ---------- */
		toggleFullscreen() {
			if (!document.fullscreenElement) {
				this.wrapper.requestFullscreen().then(() => {
					this.isFullscreen = true;
					this.wrapper.classList.add('pfb-fullscreen');
					this.btnFullscreen.innerHTML = ICONS.exitFull;
					this.btnFullscreen.title = 'Exit fullscreen';
				});
			} else {
				document.exitFullscreen().then(() => {
					this.isFullscreen = false;
					this.wrapper.classList.remove('pfb-fullscreen');
					this.btnFullscreen.innerHTML = ICONS.fullscreen;
					this.btnFullscreen.title = 'Fullscreen';
				});
			}
		}

		/* ---------- Download ---------- */
		downloadPdf() {
			const a = document.createElement('a');
			a.href = this.pdfUrl;
			a.download = '';
			a.click();
		}

		/* ---------- Thumbnails ---------- */
		toggleThumbnails() {
			this.thumbsOpen = !this.thumbsOpen;
			this.thumbPanel.classList.toggle('pfb-hidden', !this.thumbsOpen);
		}

		/* ---------- Page display ---------- */
		updatePageDisplay() {
			let current;
			if (this.singleMode) {
				current = this.currentSinglePage;
			} else {
				current = this.flipBook.getCurrentPageIndex();
			}
			this.pageInput.value = current + 1;
		}
	}

	/* ------------------------------------------------------------------ */
	/*  Bootstrap — find all wrappers on the page                         */
	/* ------------------------------------------------------------------ */
	function initAll() {
		document.querySelectorAll('.pfb-wrapper').forEach(wrapper => {
			if (!wrapper.dataset.initialized) {
				wrapper.dataset.initialized = '1';
				new PFBViewer(wrapper);
			}
		});
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initAll);
	} else {
		initAll();
	}
})();
