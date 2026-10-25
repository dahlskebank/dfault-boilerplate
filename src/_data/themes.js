// Theme options — the ONE list of appearance themes.
// Rendered by theme-toggle.njk (navbar) and theme-toggle-offcanvas.njk, and
// inlined (ids + groups only) into theme-init.njk, which validates the saved
// choice against it and paints <html> before any CSS loads. theme-toggle.js
// reads the rendered buttons, so it needs no list of its own.
//
// Each theme has an id (matches CSS/localStorage), label, icon, and group.
// Groups:
//   "standard" → a Bootstrap colour mode, applied as data-bs-theme="<id>"
//                on <html>. "dark" and "light" ship with Bootstrap; a new
//                id here (e.g. "sepia") needs its own [data-bs-theme="sepia"]
//                token block in CSS (Bootstrap's "custom color modes").
//   "hc"       → a high-contrast mode, applied as a CLASS on <html>
//                (high-contrast.css). data-bs-theme is removed meanwhile.
//
// "auto" is special: it is never stored. Choosing it REMOVES the saved
// theme, so the page follows the OS (prefers-color-scheme) again — the same
// light / dark / auto model as Bootstrap's own docs toggler.

module.exports = [
	{ id: "dark", label: "Dark", icon: "bi-moon-stars-fill", group: "standard" },
	{ id: "light", label: "Light", icon: "bi-sun-fill", group: "standard" },
	{ id: "auto", label: "Auto (system)", icon: "bi-display", group: "standard" },
	{ id: "high-contrast-dark", label: "High Contrast: Dark", icon: "bi-circle-fill", group: "hc" },
	{ id: "high-contrast-light", label: "High Contrast: Bright Light", icon: "bi-circle", group: "hc" },
	{ id: "high-contrast-custom", label: "High Contrast: Dark Blue", icon: "bi-circle-half", group: "hc" },
];
