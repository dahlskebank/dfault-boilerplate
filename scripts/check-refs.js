/*
 * ============================================================
 *  LOCAL REFERENCE CHECKER  —  scripts/check-refs.js   (npm run check:refs)
 * ============================================================
 *
 *  Runs after html-validate in `npm run build`. html-validate checks
 *  the MARKUP, but never whether a linked file actually exists — so
 *  a missing favicon, a renamed og-image.jpg or a typo'd /assets/ path
 *  sailed through a green build and 404'd in production.
 *
 *  This scans the built site and exits 1, listing every local
 *  reference that points at a file that isn't in _site/:
 *
 *    *.html         href, src, srcset, imagesrcset, poster, and any
 *                   attribute holding a full URL on site.url
 *                   (canonical, og:image, twitter:image, og:url …),
 *                   url(…) inside <style> blocks and style="…",
 *                   URLs on site.url inside JSON-LD blocks
 *    *.css          url(…) and @import
 *    *.webmanifest  must be valid JSON; icons/screenshots "src",
 *                   start_url, shortcut urls
 *    *.xml, *.txt   full URLs on site.url (sitemap <loc>, robots.txt
 *                   Sitemap:, security.txt Canonical:, llms.txt links)
 *    .htaccess      ErrorDocument targets
 *
 *  "Local" = root-relative (/about/), relative (../img/x.png) or a full
 *  URL that starts with site.url. Other domains (CDNs, the footer's
 *  network links) are not checked. A URL ending in / must have an
 *  index.html in that folder. Upper/lower case must match exactly:
 *  Windows doesn't care, the Linux web host does.
 *
 *  HTML comments and inline <script> code are skipped, so a commented-out
 *  <link> or a URL built in JavaScript doesn't count.
 *
 *  Optional argument: the build folder to check (default _site),
 *  e.g. `node scripts/check-refs.js some/other/_site`.
 * ============================================================
 */

const fs = require("fs");
const path = require("path");
const { loadSiteData } = require("./site-data");

const OUT_DIR = process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, "..", "_site");

// Paths that exist on the server but are NOT produced by the build (for
// example a folder you upload by hand and exclude from deploy.sh's mirror).
// Prefix match against the URL path. Empty in the boilerplate.
const IGNORE_PREFIXES = [
	// "/downloads/",
];

if (!fs.existsSync(OUT_DIR)) {
	console.error(`check-refs: ${OUT_DIR} does not exist — run Eleventy first`);
	process.exit(1);
}

// site.url decides which full URLs count as "ours". Fall back to a dummy
// origin if it's missing so the root-relative checks still run.
let siteOrigin = "https://site.invalid";
try {
	const url = loadSiteData().url;
	if (url) siteOrigin = new URL(url).origin;
} catch (err) {
	console.warn(`check-refs: could not read site.url (${err.message}) — only checking relative/root-relative refs`);
}
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// A full URL on our own origin, ending at whitespace, a quote, <, >, ) or ].
const SITE_URL_RE = new RegExp(`${escapeRe(siteOrigin)}(?=[/\\s"'<>)\\]]|$)[^\\s"'<>)\\]]*`, "g");
// …minus sentence punctuation a plain-text file may put right after a URL.
const trimUrl = (u) => u.replace(/[.,;:!?]+$/, "");

// missing: url path -> Set of files that reference it
const missing = new Map();
const problems = [];
let checked = 0;

function walk(dir) {
	let results = [];
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) results = results.concat(walk(full));
		else results.push(full);
	}
	return results;
}

// The URL path a built file is served at: _site/about/index.html -> /about/index.html
const urlPathOf = (file) => "/" + path.relative(OUT_DIR, file).split(path.sep).join("/");

// Windows ignores upper/lower case in file names — the Linux web host does
// NOT. /assets/img/Logo.png for a file named logo.png works in Laragon and
// 404s in production. So every path segment is compared, case and all,
// against the real folder listing (cached per folder).
const dirListings = new Map();
function existsExact(p) {
	const rel = path.relative(OUT_DIR, p);
	if (rel === "") return true;
	let dir = OUT_DIR;
	for (const segment of rel.split(path.sep)) {
		if (!dirListings.has(dir)) {
			let names = [];
			try {
				names = fs.readdirSync(dir);
			} catch {
				// not a folder (or unreadable) → nothing inside it exists
			}
			dirListings.set(dir, new Set(names));
		}
		if (!dirListings.get(dir).has(segment)) return false;
		dir = path.join(dir, segment);
	}
	return true;
}

// Does this URL path exist in the build output? /about/ -> about/index.html
// Returns true, or the reason it doesn't resolve.
function existsInBuild(urlPath) {
	let decoded;
	try {
		decoded = decodeURIComponent(urlPath);
	} catch {
		decoded = urlPath;
	}
	let p = path.join(OUT_DIR, decoded);
	if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, "index.html");
	if (existsExact(p)) return true;
	return fs.existsSync(p) ? "wrong upper/lower case — works on Windows, 404 on the Linux host" : "missing";
}

// Check one reference found in `file`. Relative refs resolve against the
// file's own URL, exactly as a browser would.
function check(ref, file) {
	if (!ref) return;
	ref = ref.trim().replace(/&amp;/g, "&");
	// Not a file reference: fragments, other schemes, unrendered template code.
	if (!ref || ref.startsWith("#") || /^(mailto|tel|data|javascript|blob|about|sms):/i.test(ref)) return;
	if (/\{\{|\{%|\$\{/.test(ref)) return;
	let url;
	try {
		url = new URL(ref, siteOrigin + urlPathOf(file));
	} catch {
		return;
	}
	if (url.origin !== siteOrigin) return; // another domain: not ours to check
	if (IGNORE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) return;
	checked++;
	const result = existsInBuild(url.pathname);
	if (result !== true) {
		const key = result === "missing" ? url.pathname : `${url.pathname}  (${result})`;
		if (!missing.has(key)) missing.set(key, new Set());
		missing.get(key).add(path.relative(OUT_DIR, file).split(path.sep).join("/"));
	}
}

function checkCss(css, file) {
	// Drop inline data: URIs first — an SVG inside one can contain its own
	// url(%23id) (= url(#id)), which is not a file.
	css = css.replace(/url\(\s*(["'])data:[\s\S]*?\1\s*\)|url\(\s*data:[^)]*\)/gi, "");
	for (const m of css.matchAll(/url\(\s*(?:&quot;|["'])?([^"')]*?)(?:&quot;|["'])?\s*\)/gi)) check(m[1], file);
	for (const m of css.matchAll(/@import\s+["']([^"']+)["']/gi)) check(m[1], file);
}

function checkHtml(html, file) {
	// Drop HTML comments, then pull JSON-LD out before blanking inline scripts.
	html = html.replace(/<!--[\s\S]*?-->/g, "");
	for (const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
		for (const u of m[1].matchAll(SITE_URL_RE)) check(trimUrl(u[0]), file);
	}
	// Keep the <script …> tag itself (its src= is a real reference), drop its code.
	html = html.replace(/(<script\b[^>]*>)[\s\S]*?(<\/script>)/gi, "$1$2");

	for (const m of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) checkCss(m[1], file);
	for (const m of html.matchAll(/\sstyle\s*=\s*(["'])([\s\S]*?)\1/gi)) checkCss(m[2], file);

	// Attributes that always hold a URL.
	for (const m of html.matchAll(/\s(?:href|src|poster)\s*=\s*(["'])([\s\S]*?)\1/gi)) check(m[2], file);
	// srcset="a.jpg 1x, b.jpg 2x" -> check a.jpg and b.jpg
	for (const m of html.matchAll(/\s(?:srcset|imagesrcset)\s*=\s*(["'])([\s\S]*?)\1/gi)) {
		for (const candidate of m[2].split(",")) check(candidate.trim().split(/\s+/)[0], file);
	}
	// Any other attribute whose value is a full URL on site.url — this is how
	// og:image / twitter:image / og:url (<meta content="https://…">) get checked.
	for (const m of html.matchAll(/\s(?!href|src|poster)[\w:-]+\s*=\s*(["'])([\s\S]*?)\1/gi)) {
		if (m[2].startsWith(siteOrigin)) check(m[2], file);
	}
}

function checkManifest(text, file) {
	let manifest;
	try {
		manifest = JSON.parse(text);
	} catch (err) {
		problems.push(`${path.relative(OUT_DIR, file)} is not valid JSON: ${err.message}`);
		return;
	}
	if (manifest.start_url) check(manifest.start_url, file);
	for (const list of [manifest.icons, manifest.screenshots]) {
		for (const item of list || []) check(item.src, file);
	}
	for (const shortcut of manifest.shortcuts || []) {
		check(shortcut.url, file);
		for (const icon of shortcut.icons || []) check(icon.src, file);
	}
}

for (const file of walk(OUT_DIR)) {
	const name = path.basename(file);
	const ext = path.extname(file).toLowerCase();
	if (![".html", ".css", ".webmanifest", ".xml", ".txt"].includes(ext) && name !== ".htaccess") continue;
	const text = fs.readFileSync(file, "utf8");

	if (ext === ".html") checkHtml(text, file);
	else if (ext === ".css") checkCss(text, file);
	else if (ext === ".webmanifest") checkManifest(text, file);
	else if (name === ".htaccess") {
		for (const m of text.matchAll(/^\s*ErrorDocument\s+\d{3}\s+(\/\S*)/gm)) check(m[1], file);
	} else {
		for (const m of text.matchAll(SITE_URL_RE)) check(trimUrl(m[0]), file);
	}
}

if (missing.size || problems.length) {
	for (const p of problems) console.error(`check-refs: ${p}`);
	if (missing.size) {
		console.error(`check-refs: ${missing.size} local reference(s) point at files that are not in the build:`);
		for (const [urlPath, files] of [...missing].sort()) {
			const list = [...files].sort();
			const shown = list.slice(0, 3).join(", ") + (list.length > 3 ? ` (+${list.length - 3} more)` : "");
			console.error(`  ${urlPath}   <- ${shown}`);
		}
	}
	process.exit(1);
}
console.log(`check-refs: all ${checked} local references resolve`);
