// Build-time values — available in every template as {{ build.xxx }}.
//
// Exported as a FUNCTION (not a plain object): Eleventy calls a data
// function each time it builds the data, so the dates below are fresh on
// every `eleventy` run and every `eleventy --watch` rebuild instead of
// being frozen at the moment the file was first loaded.
//
//   build.time             "2026-10-25T09:12:00.000Z"  (when this build ran)
//   build.cacheBust        1792919520000               (the same moment, as a number)
//   build.securityExpires  build.time + 1 year         (security.txt Expires)
//
// cacheBust is appended to local CSS/JS URLs as ?v=… (head-assets.njk,
// base.njk), so browsers fetch fresh files after every build — every
// --watch rebuild included. That is exactly why it lives in this per-build
// data file and not in eleventy.config.js (see CACHE-BUSTING there).
//
// security.txt uses securityExpires only while site.json →
// security.expires is "". Trade-off of a rolling date: the file never goes
// stale, but it also never nags you to re-check the Contact address — set a
// fixed date in site.json if you want that reminder.

module.exports = function () {
	const now = new Date();
	const securityExpires = new Date(now);
	securityExpires.setUTCFullYear(securityExpires.getUTCFullYear() + 1);

	return {
		time: now.toISOString(),
		cacheBust: now.getTime(),
		securityExpires: securityExpires.toISOString(),
	};
};
