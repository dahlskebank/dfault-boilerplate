/* ============================================================
 *  CHEATSHEET  —  src/assets/js/cheatsheet.js
 * ============================================================
 *
 *  Page-specific JS for /cheatsheet/. Body-level Bootstrap
 *  scrollspy that highlights matching links inside #toc as the
 *  page scrolls, and auto-expands the TOC collapse group
 *  containing the currently-active anchor.
 *
 *  Loaded via `extraScripts` frontmatter in src/cheatsheet.njk.
 *  Runs at end of <body>, after Bootstrap is loaded — so
 *  `window.bootstrap` is guaranteed present.
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
})();
