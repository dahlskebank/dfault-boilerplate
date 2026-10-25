/*
 * ============================================================
 *  SITE DATA LOADER  —  scripts/site-data.js   (helper, not a command)
 * ============================================================
 *
 *  Templates get `site` for free from Eleventy's data cascade, but
 *  code OUTSIDE the templates can't: eleventy.config.js (the JS
 *  bundle and the placeholder warning), scripts/check-refs.js,
 *  deploy.sh and scripts/deploy-batch.mjs (the deploy gates)
 *  need a few site.* values too. They all call loadSiteData() so
 *  the file is read in exactly one place.
 *
 *  - Reads the file FRESH on every call (no require() cache), so an
 *    edit to site.json is picked up by the next --watch rebuild.
 *  - If a project ever converts src/_data/site.json to site.js (for
 *    example to read environment variables per deploy target), this
 *    loads site.js instead. An async site.js isn't supported here.
 * ============================================================
 */

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "src", "_data");

function loadSiteData() {
	const jsPath = path.join(DATA_DIR, "site.js");
	if (fs.existsSync(jsPath)) {
		delete require.cache[require.resolve(jsPath)];
		let data = require(jsPath);
		if (data && data.default) data = data.default; // `export default {…}`
		if (typeof data === "function") data = data();
		if (data && typeof data.then === "function") {
			throw new Error("scripts/site-data.js: an async site.js is not supported — return a plain object");
		}
		return data || {};
	}
	return JSON.parse(fs.readFileSync(path.join(DATA_DIR, "site.json"), "utf8"));
}

module.exports = { loadSiteData };
