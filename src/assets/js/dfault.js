/*
 * ============================================================
 *  Main JavaScript  (src/assets/js/dfault.js)
 * ============================================================
 *
 *  This is the main JS file loaded on every page.
 *  Add your site-wide JavaScript here.
 *
 *  Theme toggle, flat toggle, Bootswatch switcher, lightbox and
 *  copy buttons have their own files (theme-toggle.js,
 *  flat-toggle.js, bootswatch-switcher.js, dd-lightbox.js,
 *  dd-copy.js) so they're easy to find and port. All of them are
 *  glued into /assets/js/bundle.js — the list is SITE_WIDE_JS at
 *  the top of eleventy.config.js.
 *
 *  Each block below has its OWN DOMContentLoaded listener: if one
 *  throws, the others still run (an error inside a listener only
 *  stops that listener).
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
	 *  PhotoSwipe Lightbox — site-wide auto-init
	 * -------------------------------------------------------
	 *  Every .pswp-gallery container on the page gets a lightbox.
	 *  The setup itself (tap/wheel zoom, back button closes it,
	 *  automatic image dimensions) lives in dd-lightbox.js.
	 *
	 *  Gallery markup — note the REQUIRED dd-pswp class on each
	 *  item; other links in the container stay normal links:
	 *    <div class="pswp-gallery">
	 *      <a class="dd-pswp" href="large.jpg"
	 *         data-pswp-width="1600"
	 *         data-pswp-height="900"
	 *         target="_blank" rel="noopener">
	 *        <img src="thumb.jpg" alt="Description">
	 *      </a>
	 *    </div>
	 *  (width/height are optional — dd-lightbox.js measures the
	 *  thumbnail when they're missing.)
	 *
	 *  PhotoSwipe's own scripts/CSS only load on pages whose
	 *  content contains "dd-pswp" or that set `gallery: true` in
	 *  front matter (base.njk). Elsewhere ddLightbox() returns null.
	 * ------------------------------------------------------- */
	if (window.ddLightbox) {
		window.ddLightbox({ gallery: ".pswp-gallery" });
	}
});

/* -------------------------------------------------------
 *  Cookie / storage notice (#dd-cookie-toast in base.njk)
 * -------------------------------------------------------
 *  Two modes, picked by site.json → gaConsent:
 *
 *  "implied" (default) — informational. The toast shows once
 *    per browser; closing it sets "cookieConsent" so returning
 *    visitors aren't pestered. Analytics (if site.gaId is set)
 *    load regardless, as before.
 *
 *  "required" (+ a site.gaId) — opt-in. The toast has Accept /
 *    Decline buttons ([data-dd-consent-choice]) and no X. GA is
 *    NOT loaded until Accept: head-assets.njk only defines
 *    window.ddLoadAnalytics(), and runs it on load once
 *    "analyticsConsent" is "granted". Decline stores "denied"
 *    and calls window.ddStopAnalytics() (switches GA off and
 *    deletes its _ga cookies if it had been accepted before).
 *
 *  Any element with [data-dd-cookie-settings] re-opens the toast,
 *  so a choice can be changed or withdrawn as easily as it was
 *  given. legal.njk's Cookie Policy has one in "required" mode.
 *
 *  Storage goes through window.ddStore (theme-init.njk), which
 *  never throws — with site data blocked the toast simply shows
 *  again on the next page.
 * ------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
	const toastEl = document.getElementById("dd-cookie-toast");
	if (!toastEl || !window.bootstrap) return;

	const store = window.ddStore || { get: () => null, set: () => {} };
	const toast = bootstrap.Toast.getOrCreateInstance(toastEl);

	if (toastEl.dataset.ddConsent === "required") {
		toastEl.querySelectorAll("[data-dd-consent-choice]").forEach((btn) => {
			// The button also has data-bs-dismiss="toast", so Bootstrap hides it.
			btn.addEventListener("click", () => {
				const choice = btn.dataset.ddConsentChoice; // "granted" | "denied"
				store.set("analyticsConsent", choice);
				if (choice === "granted" && window.ddLoadAnalytics) window.ddLoadAnalytics();
				if (choice === "denied" && window.ddStopAnalytics) window.ddStopAnalytics();
			});
		});
		if (!store.get("analyticsConsent")) toast.show();
	} else {
		if (!store.get("cookieConsent")) {
			toast.show();
			toastEl.addEventListener("hidden.bs.toast", () => store.set("cookieConsent", "1"), { once: true });
		}
	}

	document.querySelectorAll("[data-dd-cookie-settings]").forEach((btn) => {
		btn.addEventListener("click", () => toast.show());
	});
});

/* -------------------------------------------------------
 *  Print dark mode as light
 * -------------------------------------------------------
 *  style.css §9.0 already re-points the core colour tokens to
 *  light values in @media print. That doesn't reach every
 *  component's own dark-mode tokens (tables, alerts, cards…),
 *  so for the print run we switch the whole page to light and
 *  put dark back afterwards. Chrome fires beforeprint/afterprint
 *  for Ctrl+P and for "Save as PDF".
 *
 *  High-contrast modes have no data-bs-theme and keep their own
 *  print fallback (high-contrast.css §15.0), so they're skipped.
 *
 *  Dark-only Bootswatch themes (window.ddTheme.darkOnly, see
 *  theme-init.njk) are skipped too: there "light" still selects
 *  the theme's DARK default palette (Darkly prints white text on
 *  white paper), so they're left to the print tokens in
 *  style.css §9.0, which do win over the theme's dark block.
 * ------------------------------------------------------- */
(function () {
	const html = document.documentElement;
	let restoreTheme = null;

	window.addEventListener("beforeprint", () => {
		if (html.getAttribute("data-bs-theme") === "dark" && !(window.ddTheme && window.ddTheme.darkOnly)) {
			restoreTheme = "dark";
			html.setAttribute("data-bs-theme", "light");
		}
	});

	window.addEventListener("afterprint", () => {
		if (restoreTheme) {
			html.setAttribute("data-bs-theme", restoreTheme);
			restoreTheme = null;
		}
	});
})();
