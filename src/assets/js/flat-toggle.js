/*
 * ============================================================
 *  FLAT TOGGLE  —  src/assets/js/flat-toggle.js
 * ============================================================
 *
 *  Binary toggle for the .flat utility (flat.css).
 *  Composes with any theme — light, dark, or any HC mode.
 *
 *  STATE
 *    - Class "flat" on <html> when on, absent when off.
 *    - Persisted in localStorage under key "flat" with value "on"
 *      (through window.ddStore from theme-init.njk, which never
 *      throws — with site data blocked the toggle still works
 *      for the current page, it just isn't remembered).
 *    - Absence of the key means off (default).
 *
 *  FOUC PREVENTION
 *    The class is applied synchronously by theme-init.njk
 *    BEFORE any CSS loads. This script just wires up clicks
 *    and syncs the UI to whatever the init script decided.
 *
 *  USAGE
 *    Any element with [data-flat-toggle] becomes a toggle
 *    button. The script updates aria-pressed (+ .active) and
 *    swaps the icon (bi-square ⇄ bi-square-fill) inside the
 *    button. The label text is left alone on purpose: the state
 *    is in aria-pressed, so the name stays the same
 *    ("Flat mode") in both states.
 *
 *    Bundled only while site.flatToggle isn't false (the `when`
 *    in SITE_WIDE_JS, eleventy.config.js).
 *
 * ============================================================
 */

document.addEventListener("DOMContentLoaded", () => {
	const html = document.documentElement;
	// Fallback for a page without theme-init.njk: plain, unremembered toggling.
	const store = window.ddStore || { get: () => null, set: () => {} };

	function syncUI(isOn) {
		document.querySelectorAll("[data-flat-toggle]").forEach((btn) => {
			btn.setAttribute("aria-pressed", isOn ? "true" : "false");
			btn.classList.toggle("active", isOn);

			// Swap the icon class (bi-square ⇄ bi-square-fill)
			const icon = btn.querySelector("i.bi");
			if (icon) {
				icon.classList.toggle("bi-square", !isOn);
				icon.classList.toggle("bi-square-fill", isOn);
			}
		});
	}

	function setFlat(isOn) {
		html.classList.toggle("flat", isOn);
		// null removes the key: absent = off.
		store.set("flat", isOn ? "on" : null);
		syncUI(isOn);
	}

	// Initial sync — class state was already decided by theme-init.njk
	syncUI(html.classList.contains("flat"));

	// Click handlers — works wherever the buttons appear
	document.querySelectorAll("[data-flat-toggle]").forEach((btn) => {
		btn.addEventListener("click", () => {
			setFlat(!html.classList.contains("flat"));
		});
	});
});
