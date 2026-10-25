/* ============================================================
 *  CHEATSHEET  —  src/assets/js/cheatsheet.js
 * ============================================================
 *
 *  Page-specific JS for /cheatsheet/. Ported from Bootstrap's own
 *  cheatsheet example (v5.3.8, MIT) and scoped to the cheatsheet:
 *
 *    1. Body-level scrollspy that highlights matching links inside
 *       #toc as the page scrolls, and auto-expands the TOC collapse
 *       group containing the currently-active anchor.
 *    2. Tooltip, popover and toast demos switched ON. Bootstrap
 *       never initialises tooltips/popovers by itself (they're
 *       opt-in for performance), and a toast is display:none until
 *       shown — so without this those three sections couldn't be
 *       checked against light/dark/HC/Bootswatch at all.
 *    3. The demo links (href="#") and submit buttons do nothing,
 *       instead of jumping back to the top of this long page or
 *       reloading it.
 *
 *  Everything outside the TOC is limited to #cheatsheet-content.
 *  A bare document-wide ".toast" (as upstream has it) would also
 *  pop up the site's cookie toast (#dd-cookie-toast, base.njk).
 *
 *  (Tooltips stay hidden on touch screens — style.css §3.5 hides
 *  hover tooltips where there's no hover. Check them on desktop.)
 *
 *  Loaded via `extraScripts` frontmatter in src/cheatsheet.njk.
 *  Runs at end of <body>, after Bootstrap is loaded — so
 *  `window.bootstrap` is present unless the CDN failed.
 * ============================================================ */

(function () {
	"use strict";
	if (!window.bootstrap) return;

	// Body-level scrollspy: highlights matching links inside #toc as the
	// page scrolls.
	new bootstrap.ScrollSpy(document.body, {
		target: "#toc",
		rootMargin: "0px 0px -40%",
	});

	// Auto-expand the TOC group containing the currently-active anchor
	// (matches the docs' behavior: groups stay collapsed until scrollspy
	// flags a link inside them).
	document.body.addEventListener("activate.bs.scrollspy", function () {
		const active = document.querySelector("#toc a.active");
		if (!active) return;
		const parentList = active.closest(".collapse");
		if (parentList && !parentList.classList.contains("show")) {
			bootstrap.Collapse.getOrCreateInstance(parentList).show();
		}
	});

	const root = document.getElementById("cheatsheet-content");
	if (!root) return;

	// Tooltip + popover demos (opt-in components in Bootstrap 5).
	root.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((el) => new bootstrap.Tooltip(el));
	root.querySelectorAll('[data-bs-toggle="popover"]').forEach((el) => new bootstrap.Popover(el));

	// Toast demo: shown straight away and kept open (autohide off).
	root.querySelectorAll(".toast").forEach((el) => new bootstrap.Toast(el, { autohide: false }).show());

	// Demo links and submit buttons: no jump to the top, no reload.
	root.querySelectorAll('[href="#"], [type="submit"]').forEach((el) => {
		el.addEventListener("click", (e) => e.preventDefault());
	});
})();
