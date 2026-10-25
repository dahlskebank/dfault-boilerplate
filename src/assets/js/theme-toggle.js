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
 *  Light / Dark / Auto work on every Bootswatch theme, like the
 *  toggle on bootswatch.com. On themes designed dark (Cyborg,
 *  Quartz, Vapor …) "Light" is the theme's designed look and
 *  "Dark" its alternative dark palette (see src/_data/cdn.js).
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

	function syncUI() {
		let currentLabel = "";

		options.forEach((opt) => {
			const id = opt.dataset.theme;
			const on = id === ddTheme.choice;
			opt.classList.toggle("active", on);
			opt.setAttribute("aria-pressed", on ? "true" : "false");
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
