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
 *    - Persisted in localStorage under key "flat" with value "on".
 *    - Absence of the key means off (default).
 *
 *  FOUC PREVENTION
 *    The class is applied synchronously by theme-init.njk
 *    BEFORE any CSS loads. This script just wires up clicks
 *    and syncs the UI to whatever the init script decided.
 *
 *  USAGE
 *    Any element with [data-flat-toggle] becomes a toggle
 *    button. The script updates aria-pressed, swaps the
 *    icon (bi-square ⇄ bi-square-fill) inside the button,
 *    and updates any .dd-flat-label text.
 *
 * ============================================================
 */

document.addEventListener("DOMContentLoaded", () => {
	const html = document.documentElement;

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

			// Update the label text if the button uses one
			const label = btn.querySelector(".dd-flat-label");
			if (label) {
				label.textContent = isOn ? "Flat: On" : "Flat: Off";
			}
		});
	}

	function setFlat(isOn) {
		if (isOn) {
			html.classList.add("flat");
			localStorage.setItem("flat", "on");
		} else {
			html.classList.remove("flat");
			localStorage.removeItem("flat");
		}
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
