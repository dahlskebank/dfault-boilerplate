/*
 * ============================================================
 *  Main JavaScript  (src/assets/js/dfault.js)
 * ============================================================
 *
 *  This is the main JS file loaded on every page.
 *  Add your site-wide JavaScript here.
 *
 *  Theme toggle and Bootswatch switcher have their own files
 *  (theme-toggle.js, bootswatch-switcher.js) so they can be
 *  included or excluded per project.
 *
 * ============================================================
 */

document.addEventListener("DOMContentLoaded", () => {
	// Your site-wide JavaScript goes here.
	// Example: auto-initialize Bootstrap tooltips:
	//
	// const tooltipTriggers = document.querySelectorAll('[data-bs-toggle="tooltip"]');
	// tooltipTriggers.forEach(el => new bootstrap.Tooltip(el));

	/* -------------------------------------------------------
	 *  PhotoSwipe Lightbox
	 * -------------------------------------------------------
	 *  Initializes PhotoSwipe 5 on all .pswp-gallery elements.
	 *
	 *  - tapAction: "zoom" — single tap zooms in/out on mobile
	 *    (double-tap also still zooms)
	 *  - wheelToZoom — mouse wheel zooms in/out on desktop
	 *  - Back button closes lightbox — a history state is pushed
	 *    when the lightbox opens, so pressing back (or swipe-back
	 *    on iOS/Android) closes it instead of leaving the page
	 *  - Swipe down to close (PhotoSwipe default)
	 *
	 *  Gallery markup:
	 *    <div class="pswp-gallery">
	 *      <a href="large.jpg"
	 *         data-pswp-width="1600"
	 *         data-pswp-height="900"
	 *         target="_blank">
	 *        <img src="thumb.jpg" alt="Description">
	 *      </a>
	 *    </div>
	 * ------------------------------------------------------- */
	if (window.PhotoSwipeLightbox) {
		const lightbox = new PhotoSwipeLightbox({
			gallery: ".pswp-gallery",
			children: "a",
			pswpModule: PhotoSwipe,
			tapAction: "zoom",
			wheelToZoom: true,
			closeOnVerticalDrag: true,
		});

		// Back-button history management
		let historyPushed = false;

		lightbox.on("openingAnimationStart", () => {
			history.pushState({ pswpOpen: true }, "");
			historyPushed = true;
		});

		window.addEventListener("popstate", () => {
			if (historyPushed && lightbox.pswp) {
				historyPushed = false;
				lightbox.pswp.close();
			}
		});

		lightbox.on("close", () => {
			if (historyPushed) {
				historyPushed = false;
				history.back();
			}
		});

		lightbox.init();
	}
});
