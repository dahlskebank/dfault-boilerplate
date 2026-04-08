// Theme options — shared between theme-toggle.njk (navbar) and offcanvas-menu.njk
// Each theme has an id (matches CSS/localStorage), label, icon, and group.
// Groups: "standard" for Bootstrap modes, "hc" for high-contrast.

module.exports = [
	{ id: "dark", label: "Dark", icon: "bi-moon-stars-fill", group: "standard" },
	{ id: "light", label: "Light", icon: "bi-sun-fill", group: "standard" },
	{ id: "high-contrast-dark", label: "High Contrast: Dark", icon: "bi-circle-fill", group: "hc" },
	{ id: "high-contrast-light", label: "High Contrast: Bright Light", icon: "bi-circle", group: "hc" },
	{ id: "high-contrast-custom", label: "High Contrast: Dark Yellow", icon: "bi-circle-half", group: "hc" },
];
