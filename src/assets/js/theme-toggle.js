/*
 * ============================================================
 *  THEME TOGGLE  —  src/assets/js/theme-toggle.js
 * ============================================================
 *
 *  The BUTTON half of the theme switcher. The STATE half lives
 *  in theme-init.njk (inline in <head>, so it runs before any
 *  CSS): window.ddTheme holds the visitor's choice and the one
 *  function that paints <html>. This file only wires the buttons
 *  to it and keeps them in sync.
 *
 *  Choices come from src/_data/themes.js:
 *    - Dark / Light     (data-bs-theme="dark" / "light")
 *    - Auto (system)    nothing saved — follows the OS setting,
 *                       live (prefers-color-scheme)
 *    - HC Dark / Light / Custom  (class "high-contrast-*" on
 *                       <html>, overrides everything with !important)
 *
 *  Saved to localStorage under key "theme" (through
 *  window.ddStore, which never throws). Auto removes the key.
 *
 *  ACCESSIBILITY — mirrors Bootstrap's own docs toggler
 *  (color-modes.js):
 *    - every option is a toggle button: aria-pressed="true" on the
 *      selected one, "false" on the rest (next to the .active
 *      class), so screen readers hear which theme is on;
 *    - the navbar trigger (#dd-theme-trigger) gets
 *      "Change theme (current: Dark)" as its aria-label. Its icon
 *      is picked by CSS (style.css §4.4) from the state theme-init
 *      already put on <html>, so it's right on first paint.
 *
 *  DARK-ONLY BOOTSWATCH THEMES (Darkly, Vapor, … — the list is in
 *  src/_data/cdn.js): Light and Auto can't take effect there, so
 *  they are disabled while one is active and Dark shows as
 *  selected. The saved choice is kept, so switching back to a
 *  light Bootswatch theme brings it back.
 *
 *  USAGE:
 *  Loaded on every page through /assets/js/bundle.js (the
 *  SITE_WIDE_JS list in eleventy.config.js). Buttons need class
 *  "dd-theme-option" and a data-theme attribute matching an id in
 *  themes.js — theme-toggle.njk and theme-toggle-offcanvas.njk
 *  render them from that file.
 *
 * ============================================================
 */

document.addEventListener("DOMContentLoaded", () => {
	const ddTheme = window.ddTheme;
	// No theme-init.njk on this page (e.g. a layout without it): nothing to drive.
	if (!ddTheme) return;

	const options = document.querySelectorAll(".dd-theme-option");
	const trigger = document.getElementById("dd-theme-trigger");
	// The template's label ("Change theme") — the current theme is appended to it.
	const triggerLabel = trigger ? trigger.getAttribute("aria-label") : "";

	const isHC = (id) => ddTheme.hcClasses.includes(id);

	function syncUI() {
		// On a dark-only Bootswatch theme every non-HC choice looks like Dark.
		const shown = ddTheme.darkOnly && !isHC(ddTheme.choice) ? "dark" : ddTheme.choice;
		let currentLabel = "";

		options.forEach((opt) => {
			const id = opt.dataset.theme;
			const on = id === shown;
			opt.classList.toggle("active", on);
			opt.setAttribute("aria-pressed", on ? "true" : "false");
			opt.disabled = ddTheme.darkOnly && id !== "dark" && !isHC(id);
			if (on) currentLabel = opt.textContent.trim();
		});

		if (trigger && currentLabel) {
			trigger.setAttribute("aria-label", `${triggerLabel} (current: ${currentLabel})`);
		}
	}

	// Click handlers — works wherever the buttons appear (navbar, offcanvas, etc.)
	options.forEach((btn) => {
		btn.addEventListener("click", () => ddTheme.choose(btn.dataset.theme));
	});

	// ddTheme.apply() fires this after EVERY change: a click here, the OS
	// switching while the choice is Auto, or the Bootswatch switcher.
	document.addEventListener("dd:themechange", syncUI);
	syncUI();
});
