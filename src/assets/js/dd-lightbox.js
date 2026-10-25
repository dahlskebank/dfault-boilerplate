/*
 * ============================================================
 *  DD LIGHTBOX  —  src/assets/js/dd-lightbox.js
 * ============================================================
 *
 *  ONE PhotoSwipe 5 setup for the whole site. Bundled into
 *  /assets/js/bundle.js just before dfault.js, which calls it for
 *  the site-wide .pswp-gallery auto-init. Ported from the fg
 *  project's fg-lightbox.js (fg-pswp → dd-pswp,
 *  window.fgLightbox → window.ddLightbox).
 *
 *  PhotoSwipe itself (two UMD scripts + one stylesheet from
 *  jsDelivr) is only loaded on pages that need it — see
 *  `loadPhotoswipe` in base.njk. On every other page this file
 *  costs a few hundred bytes and ddLightbox() returns null.
 *
 *  THE MARKUP CONTRACT
 *  -------------------
 *      <div class="pswp-gallery">                  <- or any container
 *        <a class="dd-pswp" href="<full-size>"     <- REQUIRED marker
 *           data-pswp-width="1600"                 <- optional, see below
 *           data-pswp-height="900"
 *           target="_blank" rel="noopener">
 *          <img src="<thumbnail>" alt="…">
 *        </a>
 *      </div>
 *
 *  `a.dd-pswp` is the marker, and it is not optional. PhotoSwipe's
 *  `children` option used to be plain "a" here, which made EVERY
 *  anchor inside a gallery container a slide — so a caption or
 *  credit link sitting next to an image became a "photo" that
 *  opened as a broken image. Marking items explicitly means a
 *  container can hold whatever else it likes. (The class in the
 *  markup is also what tells base.njk to load PhotoSwipe.)
 *
 *  MIGRATING AN OLDER SITE: galleries written for the old
 *  `children: "a"` setup (plain <a data-pswp-width…> links in a
 *  .pswp-gallery, e.g. reservedekk.no's contact sheet) lose their
 *  lightbox SILENTLY once these files are ported: PhotoSwipe isn't
 *  loaded and the links just open the image in a new tab. Add
 *  class="dd-pswp" to every gallery <a>, or set `gallery: true` in
 *  that page's front matter and call
 *  window.ddLightbox({ gallery: "…", children: "a" }) yourself.
 *
 *  HOW DIMENSIONS ARE RESOLVED
 *  ---------------------------
 *  PhotoSwipe needs width/height BEFORE it opens, to lay the slide
 *  out and animate the zoom. In this order:
 *
 *    1. data-pswp-width + data-pswp-height on the <a> — exact, you
 *       know your files. Always wins.
 *    2. Nothing declared: measure the loaded thumbnail.
 *       - Thumbnail and full-size are the SAME url: its natural
 *         size is the real size. Exact.
 *       - Thumbnail is a smaller render: it still carries the true
 *         ASPECT RATIO, so scale it up until its longest side hits
 *         data-pswp-max (e.g. data-pswp-max="1600"), or use it as
 *         is when there's no data-pswp-max. That's how fg got
 *         non-square photos right where hand-typed sizes were
 *         wrong and stretched them.
 *    3. Nothing to measure (thumbnail not decoded, nothing
 *       declared): 1600x1200, so the slide isn't a broken 0x0.
 *
 *  PhotoSwipe 5 reads `w`/`h` first and `width`/`height` second,
 *  so both spellings work. We set `width`/`height` — the v5 names —
 *  in ONE place so no page has to remember this.
 *
 *  USAGE
 *  -----
 *      var lb = window.ddLightbox({ gallery: "#my-gallery" });
 *
 *  Returns the PhotoSwipeLightbox instance (already `.init()`ed), or
 *  null when PhotoSwipe isn't loaded. Callers needing extras — a
 *  caption UI, say — attach them to the returned instance; this
 *  module deliberately stays out of presentation.
 *
 *  Options:
 *    gallery    (required) selector or element for the gallery root
 *    children   (optional) item selector, default "a.dd-pswp".
 *               Override to scope further (e.g. only the active tab).
 *    backButton (optional, default true) — the back button (and
 *               Android's back gesture) closes the viewer instead
 *               of leaving the page.
 *    …plus any PhotoSwipe option, passed straight through.
 *
 *  Written as an IIFE (function wrapped in parentheses and called at
 *  once) because bundle.js glues the site-wide files together into
 *  ONE classic script: top-level names would be shared with every
 *  other file in the bundle.
 * ============================================================
 */

(function () {
	"use strict";

	// The one marker. Anything else in a gallery container is ignored.
	var ITEM_SELECTOR = "a.dd-pswp";

	// House defaults:
	//  - tapAction "zoom": a single tap zooms in/out on touch screens
	//    (double-tap still zooms too)
	//  - wheelToZoom: the mouse wheel zooms on desktop
	//  - closeOnVerticalDrag: swipe up/down to close (PhotoSwipe default)
	var DEFAULTS = {
		tapAction: "zoom",
		wheelToZoom: true,
		closeOnVerticalDrag: true,
	};

	// Last-resort shape when there is nothing to measure at all.
	var FALLBACK = { width: 1600, height: 1200 };

	// Our own keys, stripped before the rest is handed to PhotoSwipe.
	var OWN_KEYS = ["backButton"];

	/* --------------------------------------------------------
	 *  Dimension resolution
	 * -------------------------------------------------------- */
	function resolveSize(anchor) {
		// 1. Declared in the markup: trust it.
		var w = Number(anchor.dataset.pswpWidth) || 0;
		var h = Number(anchor.dataset.pswpHeight) || 0;
		if (w && h) return { width: w, height: h };

		// 2. Measure the thumbnail.
		var img = anchor.querySelector("img");
		var natW = img ? img.naturalWidth : 0;
		var natH = img ? img.naturalHeight : 0;

		// 3. Nothing to measure.
		if (!natW || !natH) return { width: FALLBACK.width, height: FALLBACK.height };

		// Is the thumbnail actually the full-size image? Then it's exact.
		// currentSrc resolves srcset/relative urls the same way anchor.href does.
		var thumbUrl = img.currentSrc || img.src;
		if (thumbUrl && thumbUrl === anchor.href) return { width: natW, height: natH };

		// Otherwise: keep the thumbnail's aspect, scale to the declared bound.
		var max = Number(anchor.dataset.pswpMax) || 0;
		if (!max) return { width: natW, height: natH };

		var scale = max / Math.max(natW, natH);
		return {
			width: Math.round(natW * scale),
			height: Math.round(natH * scale),
		};
	}

	/* --------------------------------------------------------
	 *  Back button closes the viewer
	 * --------------------------------------------------------
	 *  A history entry is pushed when the lightbox opens, so
	 *  pressing back (or Android's back gesture) closes it instead
	 *  of leaving the page. pushState with no url change, so it
	 *  never fires hashchange and can't collide with a page's own
	 *  #anchor handling.
	 * -------------------------------------------------------- */
	function wireBackButton(lightbox) {
		var pushed = false;

		lightbox.on("openingAnimationStart", function () {
			window.history.pushState({ ddPswp: true }, "");
			pushed = true;
		});

		window.addEventListener("popstate", function () {
			if (pushed && lightbox.pswp) {
				pushed = false;
				lightbox.pswp.close();
			}
		});

		lightbox.on("close", function () {
			if (pushed) {
				pushed = false;
				window.history.back();
			}
		});
	}

	/* --------------------------------------------------------
	 *  Factory
	 * -------------------------------------------------------- */
	window.ddLightbox = function (config) {
		// BOTH globals: the lightbox script can load while the core one
		// failed (or the other way round). Checking only the lightbox used
		// to end in a ReferenceError on `PhotoSwipe`.
		if (!window.PhotoSwipeLightbox || !window.PhotoSwipe) return null;

		config = config || {};
		if (!config.gallery) return null;

		var options = {};
		var key;
		for (key in DEFAULTS) {
			if (Object.prototype.hasOwnProperty.call(DEFAULTS, key)) options[key] = DEFAULTS[key];
		}
		for (key in config) {
			if (Object.prototype.hasOwnProperty.call(config, key) && OWN_KEYS.indexOf(key) === -1) {
				options[key] = config[key];
			}
		}
		options.children = config.children || ITEM_SELECTOR;
		options.pswpModule = window.PhotoSwipe;

		var lightbox = new window.PhotoSwipeLightbox(options);

		// Single source of truth for dimensions. domItemData runs when an item
		// is built from its DOM element — i.e. at click time, by which point the
		// thumbnail has long since decoded.
		lightbox.addFilter("domItemData", function (itemData, element) {
			var size = resolveSize(element);
			itemData.width = size.width;
			itemData.height = size.height;
			return itemData;
		});

		if (config.backButton !== false) wireBackButton(lightbox);

		lightbox.init();
		return lightbox;
	};

	// Exposed for scripts that build gallery markup and want the canonical
	// marker rather than hardcoding the string.
	window.ddLightbox.ITEM_CLASS = "dd-pswp";
	window.ddLightbox.ITEM_SELECTOR = ITEM_SELECTOR;
})();
