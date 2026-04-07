/*
 * ============================================================
 *  THEME TOGGLE  —  src/js/theme-toggle.js
 * ============================================================
 *
 *  Switches between 5 appearance themes:
 *    - Bootstrap Light   (data-bs-theme="light")
 *    - Bootstrap Dark    (data-bs-theme="dark")
 *    - HC Dark           (class "high-contrast-dark")
 *    - HC Light          (class "high-contrast-light")
 *    - HC Custom/Yellow  (class "high-contrast-custom")
 *
 *  Bootstrap's data-bs-theme handles light/dark natively.
 *  High-contrast themes are applied via CSS classes on <html>
 *  that override everything with !important.
 *
 *  Saved to localStorage under key "theme".
 *
 *  USAGE:
 *  Include theme-toggle.njk in your navbar or offcanvas,
 *  then load this script.  Buttons need class "dd-theme-option"
 *  and a data-theme attribute matching one of the theme names.
 *
 * ============================================================
 */

document.addEventListener("DOMContentLoaded", () => {
	const html = document.documentElement;
	const HC_CLASSES = ["high-contrast-dark", "high-contrast-light", "high-contrast-custom"];

	function applyTheme(theme) {
		// Remove all high-contrast classes
		html.classList.remove(...HC_CLASSES);
		// Remove Bootstrap's data-bs-theme attribute
		html.removeAttribute("data-bs-theme");

		if (theme === "dark" || theme === "light") {
			// Native Bootstrap mode
			html.setAttribute("data-bs-theme", theme);
		} else {
			// High-contrast: applied via class
			html.classList.add(theme);
		}

		localStorage.setItem("theme", theme);

		// Highlight the active option in any toggle UI
		document.querySelectorAll(".dd-theme-option").forEach((opt) => {
			opt.classList.toggle("active", opt.dataset.theme === theme);
		});

		// Update the dropdown trigger icon (if it exists)
		const icon = document.getElementById("dd-theme-icon");
		if (icon) {
			if (theme === "dark") {
				icon.className = "bi bi-moon-stars-fill";
			} else if (theme === "light") {
				icon.className = "bi bi-sun-fill";
			} else {
				icon.className = "bi bi-circle-half";
			}
		}
	}

	// Load saved theme or respect OS preference
	const saved = localStorage.getItem("theme");
	applyTheme(saved || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));

	// Click handlers — works wherever the buttons appear (navbar, offcanvas, etc.)
	document.querySelectorAll(".dd-theme-option").forEach((btn) => {
		btn.addEventListener("click", () => applyTheme(btn.dataset.theme));
	});
});
