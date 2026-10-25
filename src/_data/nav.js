// Navigation menu items — used by navbar.njk (and available to footer, offcanvas, etc.)
// This is a .js data file instead of .json so Eleventy handles save-reload gracefully.
//
// Item properties:
//   label     — display text (required)
//   url       — link href (required for plain links)
//   icon      — Bootstrap Icon class, e.g. "bi-folder2-open"
//   external  — true → opens in new tab with rel="noopener"
//   disabled  — true → renders greyed out
//   demo      — true → a dev/demo page; hidden when site.json → demoPages
//               is false (the page itself then isn't built either)
//   children  — array of sub-items (makes this a dropdown). A child takes
//               label, url, icon, external, disabled, demo and group.
//   dynamicChildren — instead of `children`: the NAME of an Eleventy
//               collection, e.g. "tools" for pages with `tags: tools` in
//               their front matter. Each page becomes a dropdown item,
//               labelled by its `navLabel:` front matter, else `title:`
//               (optional `icon:` and `group:` there too). New page =
//               new menu item, nothing to edit here. Wins over `children`.
//               The breadcrumbs filter (eleventy.config.js) reads it too.
//   indexLabel — text for the parent's own link at the top of the
//               dropdown; default "All <label>".
//   group     — on a child (or a collection page's front matter): any
//               short id, never shown. Where two neighbouring children
//               have a different group, a divider splits the dropdown
//               (inset in the offcanvas menu). Keep same-group children
//               next to each other; nothing is re-sorted.
//
//   For items with children:
//   If the parent has a `url`, it shows as a clickable link
//   in the dropdown ("All Tools") and in the offcanvas menu.
//   Set `disabled: true` on the parent to grey out that link.
//
//   Example with a collection:
//     { label: "Tools", url: "/tools/", icon: "bi-tools",
//       dynamicChildren: "tools", indexLabel: "Tool overview" },
//
// WHY module.exports IS A FUNCTION: Eleventy calls an exported function
// each time it builds the data, and templates receive what it returns
// (the filtered array). Reading site.json from disk inside it — rather
// than require("./site.json"), which Node caches — keeps the demoPages
// switch current during `eleventy --watch`.

const fs = require("fs");
const path = require("path");

const items = [
	{
		label: "About",
		url: "/about/",
		icon: "bi-info-circle",
	},
	{
		label: "Showcase",
		url: "/showcase/",
		icon: "bi-stars",
	},
	{
		label: "Cheatsheet",
		url: "/cheatsheet/",
		icon: "bi-grid-3x3-gap",
		demo: true,
	},
];

module.exports = function () {
	const site = JSON.parse(fs.readFileSync(path.join(__dirname, "site.json"), "utf8"));
	const visible = (item) => !item.demo || site.demoPages;

	return items
		.filter(visible)
		.map((item) => (item.children ? { ...item, children: item.children.filter(visible) } : item));
};
