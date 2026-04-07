// Navigation menu items — used by navbar.njk (and available to footer, offcanvas, etc.)
// This is a .js data file instead of .json so Eleventy handles save-reload gracefully.
//
// Item properties:
//   label     — display text (required)
//   url       — link href (required for plain links)
//   icon      — Bootstrap Icon class, e.g. "bi-folder2-open"
//   external  — true → opens in new tab with rel="noopener"
//   disabled  — true → renders greyed out
//   children  — array of sub-items (makes this a dropdown)
//
//   For items with children:
//   If the parent has a `url`, it shows as a clickable link
//   in the dropdown ("All Tools") and in the offcanvas menu.
//   Set `disabled: true` on the parent to grey out that link.

module.exports = [
	{
		label: "About",
		url: "/about/",
		icon: "bi-info-circle",
	},
	{
		label: "Contact",
		url: "/contact/",
		icon: "bi-envelope",
	},
];
