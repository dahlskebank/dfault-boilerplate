// Stylelint — the CSS half of the build gate (html-validate is the HTML half).
// Runs on `npm run build` via `lint:css`, BEFORE eleventy, so a broken
// stylesheet fails the deploy instead of shipping silently.
//
// Preset: config-recommended = "possible errors" only (parse errors, duplicate
// selectors, unknown units/properties, invalid hex, …). NOT config-standard:
// that adds ~250 formatting opinions on this codebase and formatting is
// Prettier's job.
//
// Origin: 2026-08-27 — a `*/` inside a header comment ("/order/*/") closed the
// comment early and silently killed 5 rules in order-tool.css for 3 months.
export default {
	extends: ["stylelint-config-recommended"],
	rules: {
		// Fires on every .high-contrast-* override in style.css. Those are
		// deliberately ordered (theme overrides come last) and the rule is
		// notorious for false positives. Off.
		"no-descending-specificity": null,
	},
};
