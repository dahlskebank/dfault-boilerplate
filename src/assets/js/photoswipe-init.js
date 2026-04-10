/*
 * ============================================================
 *  PhotoSwipe Lightbox Init  (src/assets/js/photoswipe-init.js)
 * ============================================================
 *
 *  Initializes PhotoSwipe 5 on all .pswp-gallery elements.
 *
 *  FEATURES:
 *  - tapAction: "zoom" — single tap zooms in/out on mobile
 *    (double-tap also still zooms)
 *  - Back button closes lightbox — a history state is pushed
 *    when the lightbox opens, so pressing back (or swipe-back
 *    on iOS/Android) closes it instead of leaving the page
 *  - Swipe down to close (PhotoSwipe default closeOnVerticalDrag)
 *
 *  GALLERY MARKUP:
 *  ---------------
 *  Wrap image links in a container with class "pswp-gallery".
 *  Each <a> must point to the full-size image and include
 *  data-pswp-width / data-pswp-height attributes.
 *
 *    <div class="pswp-gallery">
 *      <a href="large.jpg"
 *         data-pswp-width="1600"
 *         data-pswp-height="900"
 *         target="_blank">
 *        <img src="thumb.jpg" alt="Description">
 *      </a>
 *    </div>
 *
 * ============================================================
 */

document.addEventListener("DOMContentLoaded", () => {
	if (!window.PhotoSwipeLightbox) return;

	const lightbox = new PhotoSwipeLightbox({
		gallery: ".pswp-gallery",
		children: "a",
		pswpModule: PhotoSwipe,

		// Single tap on the image zooms in/out on mobile
		tapAction: "zoom",

		// Mouse wheel zooms in/out (desktop)
		wheelToZoom: true,

		// Swipe down to close (PhotoSwipe default)
		closeOnVerticalDrag: true,
	});

	/* -------------------------------------------------------
	 *  Back-button history management
	 * -------------------------------------------------------
	 *  When the lightbox opens we push a history state.
	 *  - Pressing back (or swipe-back gesture) pops that state
	 *    and closes the lightbox instead of navigating away.
	 *  - Closing via UI (X button, swipe down, tap background)
	 *    pops the state we pushed so history stays clean.
	 * ------------------------------------------------------- */
	let historyPushed = false;

	lightbox.on("openingAnimationStart", () => {
		history.pushState({ pswpOpen: true }, "");
		historyPushed = true;
	});

	// Back button / swipe-back → close the lightbox
	window.addEventListener("popstate", () => {
		if (historyPushed && lightbox.pswp) {
			historyPushed = false;
			lightbox.pswp.close();
		}
	});

	// UI close (X, swipe down, tap, Escape) → pop the history state
	lightbox.on("close", () => {
		if (historyPushed) {
			historyPushed = false;
			history.back();
		}
	});

	lightbox.init();
});
