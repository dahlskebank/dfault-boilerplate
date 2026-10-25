/*
 * ============================================================
 *  ELEVENTY CONFIGURATION  —  eleventy.config.js
 * ============================================================
 *
 *  This is the main config file for Eleventy (11ty).
 *  Think of it as the control center for how your site gets built.
 *
 *  KEY CONCEPTS:
 *  - Eleventy reads source files from `src/` and outputs static
 *    HTML to `_site/`.  No PHP, no server-side rendering — just
 *    plain HTML files that any web server can host.
 *  - Templates use Nunjucks (.njk), a templating language similar
 *    to PHP includes but with more features (inheritance, filters,
 *    macros, etc.).
 *  - Data files in `src/_data/` are automatically available in
 *    every template.  For example, `site.json` is accessible as
 *    `{{ site.name }}` in any .njk file.
 *  - Files in `src/_includes/` are layouts and partials — they
 *    are NOT rendered as pages, only pulled in by other templates.
 *
 *  COMMANDS:
 *    npm run watch  →  Rebuilds _site/ on every save (Laragon serves
 *                      _site/ on the project's local domain)
 *    npm run build  →  Full production build into _site/:
 *                      lint:css → lint:js → clean → eleventy →
 *                      html-validate → check-refs → minify
 *    npm start      →  Optional: Eleventy's own live-reload dev
 *                      server (localhost) instead of Laragon
 *
 * ============================================================
 */

// Node built-ins used by the JS bundling step and filters below.
// `fs` reads/writes files, `path` builds OS-safe file paths,
// `execFileSync` runs git (lastModified filter), `vm` parses JS
// without running it (bundle syntax check), `crypto` hashes file
// contents (`v` filter).
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const vm = require("vm");
const crypto = require("crypto");

// Reads src/_data/site.json fresh on each call (see the file for why
// config-side code can't just use the template data cascade).
const { loadSiteData } = require("./scripts/site-data");

/* ----------------------------------------------------------
 *  SITE-WIDE SCRIPTS  —  the ONE list of bundled JS files
 * ----------------------------------------------------------
 *  Every file here is concatenated into _site/assets/js/bundle.js
 *  (see JS BUNDLING below) in this order, and its standalone copy
 *  is removed from _site/. To add a site-wide script: drop it in
 *  src/assets/js/ and add ONE line here — nothing else to edit.
 *
 *  `when` (optional) decides from site.json whether the file goes
 *  into the bundle. A file whose `when` is false is still removed
 *  from _site/, since no page loads it on its own.
 *    - flat-toggle.js: unless site.flatToggle is false (`!== false`
 *      = a site.json without the key keeps it, like before).
 *    - bootswatch-switcher.js: only while site.bootswatchSwitcher
 *      is true (dev tool).
 *
 *  dd-lightbox.js comes before dfault.js, which calls it. All files
 *  share ONE classic-script scope once glued together, so each one
 *  keeps its names inside a function (IIFE or event listener).
 *
 *  Page-specific scripts (e.g. cheatsheet.js via `extraScripts:`
 *  front matter) do NOT belong here — they stay standalone files.
 * ---------------------------------------------------------- */
const SITE_WIDE_JS = [
	{ file: "dd-lightbox.js" },
	{ file: "dfault.js" },
	{ file: "theme-toggle.js" },
	{ file: "flat-toggle.js", when: (site) => site.flatToggle !== false },
	{ file: "bootswatch-switcher.js", when: (site) => site.bootswatchSwitcher },
	{ file: "offcanvas-init.js" },
	{ file: "dd-copy.js" },
];

module.exports = function (eleventyConfig) {
	/* ----------------------------------------------------------
	 *  PASSTHROUGH COPIES
	 * ----------------------------------------------------------
	 *  Static assets that Eleventy should copy as-is into _site/
	 *  without processing.  All static assets live under src/assets/
	 *  and are served at /assets/ in the built site.
	 *
	 *  Passthrough copy does NOT obey the IGNORES section below — it
	 *  copies everything it's pointed at — so it needs its own filter.
	 *  The filter (given each path relative to src/assets/) skips:
	 *    - README.md notes (e.g. a font-licence note in src/assets/fonts/);
	 *    - any folder or file whose name starts with "_" (src/assets/
	 *      img/_originals/, _notes.txt): the same safety net the IGNORES
	 *      give templates, because a scratch folder next to the images
	 *      would otherwise be uploaded with the site. (Checked 2026-10-25:
	 *      without this, src/assets/_probe/secret.txt reached _site/.)
	 * ---------------------------------------------------------- */
	eleventyConfig.addPassthroughCopy("src/assets", {
		filter: (relPath) => !/(^|[\\/])(_[^\\/]*|README\.md)([\\/]|$)/i.test(relPath),
	});

	// Copy favicon.ico to the site root  (src/favicon.ico → _site/favicon.ico)
	eleventyConfig.addPassthroughCopy({ "src/favicon.ico": "favicon.ico" });

	// .htaccess is now generated by src/htaccess.njk (not passthrough copy)

	/* ----------------------------------------------------------
	 *  WATCH TARGETS
	 * ----------------------------------------------------------
	 *  By default Eleventy watches .njk/.md files for changes.
	 *  We tell it to also watch CSS and JS so the dev server
	 *  reloads when you edit styles or scripts.
	 * ---------------------------------------------------------- */
	eleventyConfig.addWatchTarget("src/assets/");

	/* ----------------------------------------------------------
	 *  CACHE-BUSTING  —  lives in src/_data/build.js, not here
	 * ----------------------------------------------------------
	 *  Local CSS/JS URLs carry ?v=<build stamp> so browsers fetch
	 *  fresh files after each build: {{ build.cacheBust }}.
	 *
	 *  It used to be `addGlobalData("cacheBust", Date.now())` in this
	 *  file. That runs ONCE, when the config loads: `eleventy --watch`
	 *  re-reads the config only when the config file itself changes,
	 *  so every rebuild in a watch session kept the same stamp — and
	 *  with .htaccess caching CSS/JS for a year, Laragon served the
	 *  old style.css until a hard refresh (reproduced 2026-10-25). A
	 *  data FILE that exports a function (build.js) is re-run for
	 *  every build, watch rebuilds included, so the stamp moved there.
	 * ---------------------------------------------------------- */

	/* ----------------------------------------------------------
	 *  JS BUNDLING
	 * ----------------------------------------------------------
	 *  The site-wide scripts live as SEPARATE source files in
	 *  src/assets/js/ (easy to read, edit, and port between
	 *  projects), but one <script> tag per file means one HTTP
	 *  request per file on every page. So after every build (including
	 *  --watch rebuilds) we concatenate them into ONE file:
	 *
	 *      _site/assets/js/bundle.js   ← loaded by base.njk
	 *
	 *  and delete the individual copies that the passthrough
	 *  copy above placed in _site/, so the deploy stays clean.
	 *
	 *  NOTES:
	 *  - The file list is SITE_WIDE_JS at the top of this file.
	 *    Order matters and mirrors the old <script> tag order.
	 *  - Files with a `when` in SITE_WIDE_JS are only bundled
	 *    while it's true: flat-toggle.js is left out when
	 *    site.flatToggle is false, bootswatch-switcher.js unless
	 *    site.bootswatchSwitcher is true.
	 *  - Page-specific scripts (e.g. cheatsheet.js via the
	 *    `extraScripts:` frontmatter) are NOT bundled — they
	 *    stay as standalone files and are left untouched here.
	 *  - theme-init.njk stays inline in <head> — it must run
	 *    before any CSS loads to prevent theme flashing (FOUC).
	 *  - After writing, the bundle is PARSED (not run) with
	 *    Node's `vm` module — the same V8 engine as Chrome. One
	 *    syntax error stops the WHOLE bundle from running, and
	 *    gluing files together can create errors no single file
	 *    has (two files declaring the same top-level `const`).
	 *    `npm run build` fails on that; --watch only logs it.
	 *  - scripts/minify.js runs after this and minifies the
	 *    bundle like any other JS file in _site/assets/.
	 * ---------------------------------------------------------- */
	eleventyConfig.on("eleventy.after", ({ directories, runMode }) => {
		const srcJsDir = path.join(__dirname, "src", "assets", "js");
		// `directories.output` is the REAL output folder, including a
		// `--output=…` override on the command line. (The older `dir`
		// argument ignores that override and always says "_site".)
		const outJsDir = path.join(path.resolve(directories.output), "assets", "js");

		// Fresh read every build, so toggling site.bootswatchSwitcher
		// is picked up by the next --watch rebuild.
		const site = loadSiteData();

		// Files that go into the bundle this time: their `when` (if any)
		// is true for this site.json, and the source file exists.
		const bundleFiles = SITE_WIDE_JS.filter(({ file, when }) => {
			if (when && !when(site)) return false;
			const exists = fs.existsSync(path.join(srcJsDir, file));
			if (!exists) console.warn(`[js-bundle] Skipping missing file: ${file}`);
			return exists;
		}).map(({ file }) => file);

		// Concatenate with a banner per file (so you can still tell
		// where code came from when viewing source) and a `;` between
		// files (guards against a file missing its final semicolon).
		const bundle = bundleFiles
			.map((f) => `/* ===== ${f} ===== */\n` + fs.readFileSync(path.join(srcJsDir, f), "utf8"))
			.join("\n;\n");

		fs.mkdirSync(outJsDir, { recursive: true });
		fs.writeFileSync(path.join(outJsDir, "bundle.js"), bundle);

		// Remove the individual copies from _site/ — they're now inside
		// bundle.js. (Sources in src/assets/js/ are untouched.) A file
		// left out by its `when` is removed too, since nothing
		// references it in that case either.
		for (const { file } of SITE_WIDE_JS) {
			fs.rmSync(path.join(outJsDir, file), { force: true });
		}

		console.log(`[js-bundle] Wrote bundle.js (${bundleFiles.length} files)`);

		// Syntax check: compile the bundle as a classic <script>
		// without running it. The error names a bundle.js line; the
		// banners above tell us which source file that line came from.
		try {
			new vm.Script(bundle, { filename: "bundle.js" });
		} catch (err) {
			const line = Number((err.stack.match(/bundle\.js:(\d+)/) || [])[1]);
			let where = "";
			const lines = bundle.split("\n");
			for (let i = Math.min(line, lines.length) - 1; i >= 0; i--) {
				const banner = lines[i].match(/^\/\* ===== (.+) ===== \*\/$/);
				if (banner) {
					where = ` — src/assets/js/${banner[1]}, line ${line - i - 1}`;
					break;
				}
			}
			const msg = `[js-bundle] bundle.js does not parse${where}: ${err.message}`;
			// A plain `eleventy` / `npm run build` run stops here (exit 1).
			// --watch keeps running so you can fix the file and save.
			if (runMode === "build") throw new Error(msg);
			console.error(msg);
		}
	});

	/* ----------------------------------------------------------
	 *  CUSTOM FILTERS
	 * ----------------------------------------------------------
	 *  Filters transform data inside templates.
	 *  Usage in Nunjucks:  {{ someValue | filterName }}
	 * ---------------------------------------------------------- */

	// {% year %} shortcode — outputs the current year (for copyright notices)
	// Usage:  2014–{% year %}
	eleventyConfig.addShortcode("year", () => `${new Date().getFullYear()}`);

	// {{ "https://example.com/page" | hostname }}  →  "example.com"
	// Extracts the hostname from a full URL. Used by footer.njk (the
	// self-link guard: a network link to this same site renders as plain
	// text) and by llms.njk (labels for the author's other sites).
	eleventyConfig.addFilter("hostname", (url) => {
		try {
			return new URL(url).hostname;
		} catch {
			return url;
		}
	});

	// {{ page.date | isoDate }}  →  "2026-03-22"
	// Formats a date as YYYY-MM-DD. No boilerplate template uses it since
	// sitemap.xml switched to the lastModified filter below; kept as a
	// ready-made formatter for visible dates (e.g. a blog post's
	// "Published" line).
	eleventyConfig.addFilter("isoDate", (date) => {
		return (date instanceof Date ? date : new Date(date)).toISOString().split("T")[0];
	});

	// {{ "/assets/img/og-image.jpg" | v }}  →  "/assets/img/og-image.jpg?v=3f2a9c1e"
	// Content-hash version for a file under src/: the first 8 hex characters
	// of its md5. Unlike {{ build.cacheBust }} (a build timestamp that changes on
	// every build), the URL only changes when the file's CONTENT changes.
	// Used for og:image in head-meta.njk: Facebook, Telegram & co. cache a
	// share image by its URL, so a replaced picture now gets a new URL by
	// itself. Works for in-page images too:
	//   <img src="{{ '/assets/img/photo.jpg' | v }}" …>
	// Once every image is linked this way, the image ExpiresByType lines in
	// src/htaccess.njk (now 1 month) could go up to 1 year.
	//
	// Only for files that exist under src/. NOT for /assets/js/bundle.js: it
	// is written by the JS BUNDLING hook above and has no src/ file, so it
	// keeps {{ build.cacheBust }}. Full URLs (https://…) are returned unchanged; a
	// missing file is returned unchanged WITH a warning, so it can't slip
	// through unversioned unnoticed.
	// The hash is cached per file + modified time + size, so a --watch
	// rebuild picks up a replaced image.
	const versionCache = new Map();
	const versionWarned = new Set();
	eleventyConfig.addFilter("v", (urlPath) => {
		if (!urlPath || typeof urlPath !== "string" || /^([a-z]+:)?\/\//i.test(urlPath)) return urlPath;
		// "/img/sprite.svg?x=1#logo" → base "/img/sprite.svg?x=1" + fragment "#logo".
		// The version goes into the query; a fragment must stay LAST, or the
		// browser reads "logo?v=…" as the fragment id and never sends ?v=.
		const hashAt = urlPath.indexOf("#");
		const base = hashAt === -1 ? urlPath : urlPath.slice(0, hashAt);
		const fragment = hashAt === -1 ? "" : urlPath.slice(hashAt);
		const file = path.join(__dirname, "src", base.split("?")[0]);
		let stat;
		try {
			stat = fs.statSync(file);
		} catch {
			if (!versionWarned.has(urlPath)) console.warn(`[v filter] ${urlPath}: no such file in src/ — printed without ?v=`);
			versionWarned.add(urlPath);
			return urlPath;
		}
		const key = `${file}|${stat.mtimeMs}|${stat.size}`;
		if (!versionCache.has(key)) {
			versionCache.set(key, crypto.createHash("md5").update(fs.readFileSync(file)).digest("hex").slice(0, 8));
		}
		return `${base}${base.includes("?") ? "&" : "?"}v=${versionCache.get(key)}${fragment}`;
	});

	// {% for s in extraScripts | checkExtraScripts(page.inputPath) %}
	// Pass-through filter for base.njk's per-page scripts: returns the list
	// unchanged and WARNS (once per page + script) about a third-party script
	// that is not pinned. Every CDN file the boilerplate loads itself has an
	// `integrity` hash (SRI, src/_data/cdn.js), so the browser refuses a
	// tampered copy. `extraScripts` is the one place a page can add a script
	// from another domain, so it gets the same check — a warning, not a hard
	// stop, so an experiment still builds.
	//   { src: "https://…", cdn: true }                         → warned
	//   { src: "https://…", cdn: true, integrity, crossorigin }  → fine
	//   "https://…" (plain string)                              → warned: the
	//     string form is for LOCAL scripts and gets ?v= appended.
	const isFullUrl = (u) => typeof u === "string" && /^([a-z]+:)?\/\//i.test(u);
	const extraScriptsWarned = new Set();
	eleventyConfig.addFilter("checkExtraScripts", (scripts, inputPath) => {
		for (const s of scripts || []) {
			let problem = "";
			if (isFullUrl(s)) {
				problem = "is a plain string, the form for LOCAL scripts (it gets ?v= appended). Use { src, cdn: true, integrity, crossorigin }";
			} else if (s && typeof s === "object" && (s.cdn || isFullUrl(s.src)) && !s.integrity) {
				problem = 'is a third-party script without integrity — add integrity + crossorigin: "anonymous" (SRI), or the page runs whatever that server sends';
			}
			if (!problem) continue;
			const src = typeof s === "string" ? s : s.src;
			const key = `${inputPath}|${src}`;
			if (extraScriptsWarned.has(key)) continue;
			extraScriptsWarned.add(key);
			console.warn(`[extraScripts] ${inputPath}: ${src} ${problem}`);
		}
		return scripts;
	});

	// {{ entry.inputPath | lastModified }}  →  "2026-10-24T21:37:00+02:00"
	// When a source file was last really changed — used for <lastmod> in
	// sitemap.xml. Eleventy's own `page.date` is the file's creation time
	// (or front matter `date:`), which never moves when you edit a page.
	//
	//   1. File committed and unchanged since → date of the last git commit
	//      that touched it (`git log -1 --format=%cI -- <file>`). Survives a
	//      fresh `git clone`, where every file's mtime is "clone time".
	//   2. File new/edited but not committed yet (or no git at all) →
	//      the file's modified time (mtime).
	//
	// Output is ISO 8601 with time + timezone offset, which is what the
	// sitemap protocol asks for. Front matter `lastmod:` on a page beats
	// this (the sitemap checks `entry.data.lastmod` first).
	//
	// Speed: instead of running git twice PER PAGE (slow on Windows once a
	// blog has 100 posts), the first call asks git ONCE for the whole
	// project's history and status (getGitInfo below) — the same answer
	// `git log -1 --format=%cI -- <file>` gives, for every file at once.
	// Results are cached for the life of the process. Under --watch, a page
	// edited after the first build keeps its first value until you restart
	// — harmless, because only the production build's sitemap matters.
	let gitInfo; // undefined = not asked yet, null = no usable git
	const getGitInfo = () => {
		if (gitInfo !== undefined) return gitInfo;
		gitInfo = null;
		try {
			// Run git quietly (stderr ignored) inside the project folder.
			const git = (args) =>
				execFileSync("git", args, {
					cwd: __dirname,
					encoding: "utf8",
					stdio: ["ignore", "pipe", "ignore"],
					maxBuffer: 64 * 1024 * 1024,
				});
			const root = git(["rev-parse", "--show-toplevel"]).trim();
			// Map key = path relative to the repo root with "/" — the form git prints.
			const commitDates = new Map();
			// Newest commit first: "@@<date>" line, then the files it touched.
			// The first time a file shows up is therefore its LAST commit.
			// (core.quotepath=off keeps names like "blåbær.md" readable.)
			let date = "";
			const log = git(["-c", "core.quotepath=off", "log", "--format=@@%cI", "--name-only", "--", "."]);
			for (const line of log.split(/\r?\n/)) {
				if (line.startsWith("@@")) date = line.slice(2);
				else if (line && !commitDates.has(line)) commitDates.set(line, date);
			}
			// Files with uncommitted changes (staged, unstaged or untracked).
			// -z output: "XY path\0", and a rename adds the OLD path as an extra entry.
			const dirty = new Set();
			const entries = git(["status", "--porcelain", "-z", "--untracked-files=all", "--", "."]).split("\0");
			for (let i = 0; i < entries.length; i++) {
				if (entries[i].length < 4) continue;
				dirty.add(entries[i].slice(3));
				if (entries[i][0] === "R" || entries[i][0] === "C") i++; // skip the old path
			}
			gitInfo = { root, commitDates, dirty };
		} catch {
			// git not installed, or this folder isn't a repo yet → mtime for all.
		}
		return gitInfo;
	};

	const lastModifiedCache = new Map();
	eleventyConfig.addFilter("lastModified", (inputPath) => {
		if (!inputPath) return "";
		if (lastModifiedCache.has(inputPath)) return lastModifiedCache.get(inputPath);

		const file = path.resolve(inputPath);
		let stamp = "";
		const info = getGitInfo();
		if (info) {
			const key = path.relative(info.root, file).split(path.sep).join("/");
			// Committed and clean → its last commit date.
			if (!info.dirty.has(key)) stamp = info.commitDates.get(key) || "";
		}
		if (!stamp) {
			try {
				// toISOString() → "2026-10-25T08:15:42.123Z"; drop the milliseconds.
				stamp = fs.statSync(file).mtime.toISOString().replace(/\.\d{3}Z$/, "Z");
			} catch {
				stamp = ""; // no such file (e.g. a virtual template) → no <lastmod>
			}
		}
		lastModifiedCache.set(inputPath, stamp);
		return stamp;
	});

	// {{ page.url | breadcrumbs(nav, title, collections) }}
	// Returns an array of crumbs ({ label, url, isActive }) for the given page,
	// or null if the page is too shallow to need breadcrumbs (depth < 2).
	//
	// The render template is src/_includes/breadcrumb.njk — it walks the array
	// returned here and produces the Bootstrap breadcrumb markup. We do the
	// label-resolution in JS instead of Nunjucks because (a) Nunjucks `set`
	// inside `for` doesn't propagate cleanly, and (b) the lookup needs to
	// recognise four sources of truth in priority order:
	//
	//   1. nav.js top-level / hardcoded children
	//   2. nav.js `dynamicChildren` collections (if you adopt that pattern)
	//   3. The page's own `title:` frontmatter
	//   4. Title-cased URL slug fallback
	//
	// Currently handles depth-2 URLs only (e.g. /tools/foo/). Pages with deeper
	// paths fall back to a generic "TopSection > Page Title" pair.
	eleventyConfig.addFilter("breadcrumbs", function (url, nav, fallbackTitle, collections) {
		if (!url || typeof url !== "string") return null;

		// Filter out empty strings from leading/trailing slashes:
		// "/tools/rydde-varianter/" → ["tools", "rydde-varianter"]
		const parts = url.split("/").filter(Boolean);
		if (parts.length < 2) return null; // depth-1 pages get no breadcrumbs

		const topSlug = parts[0];
		const topUrl = "/" + topSlug + "/";

		const titleCase = (slug) =>
			slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

		// 1. Top-level label from nav.js
		const topItem = (nav || []).find((item) => item.url === topUrl);
		const topLabel = topItem ? topItem.label : titleCase(topSlug);

		// 2. Leaf label — try hardcoded children, then dynamic collection, then page title.
		let leafLabel;
		if (topItem && Array.isArray(topItem.children)) {
			const child = topItem.children.find((c) => c.url === url);
			if (child) leafLabel = child.label;
		}
		if (!leafLabel && topItem && topItem.dynamicChildren && collections) {
			const collection = collections[topItem.dynamicChildren] || [];
			const entry = collection.find((p) => p.url === url);
			// Same label the menus use (navbar.njk, offcanvas-menu.njk):
			// `navLabel:` front matter first, else `title:`.
			if (entry && entry.data) leafLabel = entry.data.navLabel || entry.data.title;
		}
		if (!leafLabel) leafLabel = fallbackTitle || titleCase(parts[parts.length - 1]);

		return [
			{ label: topLabel, url: topUrl, isActive: false },
			{ label: leafLabel, url: url, isActive: true },
		];
	});

	/* ----------------------------------------------------------
	 *  IGNORES  —  files inside src/ that must never become pages
	 * ----------------------------------------------------------
	 *  Eleventy does NOT skip folders just because their name starts
	 *  with "_" (that's a Jekyll rule, not an Eleventy one). Without
	 *  these lines, a note saved as src/_temp/plan.md is built into
	 *  /_temp/plan/index.html, listed in sitemap.xml, deployed, and
	 *  readable by search engines and AI crawlers. (This has happened
	 *  on a live site.)
	 *
	 *  Plans, handoffs and scratch files belong OUTSIDE src/ —
	 *  in docs/ and _temp/ at the project root. These ignores are
	 *  only the safety net for when something lands in src/ anyway.
	 *  Patterns are relative to the project root, ** = any depth.
	 * ---------------------------------------------------------- */
	eleventyConfig.ignores.add("src/**/_temp/**");
	eleventyConfig.ignores.add("src/**/_tmp/**");
	eleventyConfig.ignores.add("src/**/_notes/**");
	eleventyConfig.ignores.add("src/**/README.md");

	/* ----------------------------------------------------------
	 *  PLACEHOLDER WARNING  —  site.json still has template values?
	 * ----------------------------------------------------------
	 *  A new site that ships with site.url = "https://example.com"
	 *  tells Google every page is a copy of example.com (canonical,
	 *  og:url, sitemap, robots.txt all use site.url), and a stale
	 *  security.txt `Expires` makes the whole file invalid.
	 *
	 *  This only WARNS — the boilerplate itself is full of
	 *  placeholders on purpose and must keep building. deploy.sh
	 *  (and deploy-batch.mjs) refuse to upload while site.url is
	 *  still an example.* placeholder, check the BUILT
	 *  robots.txt / security.txt for leftovers, the footer copyright
	 *  values in site.json and the legal page's legalPlaceholder
	 *  marker; the rest
	 *  listed here is yours to clear before launch. `eleventy.before`
	 *  runs at the start of every build and --watch rebuild; the
	 *  same warning is printed only once per process.
	 * ---------------------------------------------------------- */
	let lastPlaceholderWarning = "";
	eleventyConfig.on("eleventy.before", () => {
		let site;
		try {
			site = loadSiteData();
		} catch {
			return; // broken site.json: Eleventy reports that itself
		}
		const PLACEHOLDER_URL = /example\.com|yoursite\.com/i;
		const found = [];
		if (PLACEHOLDER_URL.test(site.url || "")) found.push(`url is "${site.url}"`);
		if ((site.url || "").endsWith("/")) found.push(`url must not end with "/" (pages would get "//" URLs)`);
		if (site.name === "My Site") found.push(`name is "My Site"`);
		if (/^A short description/i.test(site.description || "")) found.push("description is still the template text");
		for (const [label, value] of [
			["author.name", site.author?.name],
			["footer.copyrightName", site.footer?.copyrightName],
		]) {
			if (value === "Your Name") found.push(`${label} is "Your Name"`);
		}
		for (const [label, value] of [
			["author.url", site.author?.url],
			["footer.copyrightUrl", site.footer?.copyrightUrl],
			["security.contact", site.security?.contact],
		]) {
			if (PLACEHOLDER_URL.test(value || "")) found.push(`${label} is "${value}"`);
		}
		const expires = site.security?.expires ? new Date(site.security.expires) : null;
		if (expires && !isNaN(expires)) {
			const daysLeft = Math.floor((expires - Date.now()) / 864e5);
			if (daysLeft < 30) {
				found.push(
					daysLeft < 0
						? `security.expires (${site.security.expires}) has PASSED — security.txt is invalid`
						: `security.expires is only ${daysLeft} days away — move it ~12 months ahead`
				);
			}
		}

		const warning = found.length
			? "[site.json] Placeholder/stale values (fine in the boilerplate, NOT on a real site):\n  - " +
				found.join("\n  - ")
			: "";
		if (warning && warning !== lastPlaceholderWarning) console.warn(warning);
		lastPlaceholderWarning = warning;
	});

	/* ----------------------------------------------------------
	 *  DIRECTORY STRUCTURE
	 * ----------------------------------------------------------
	 *  This tells Eleventy where to find things:
	 *
	 *  input:    "src"          →  All your source files live here
	 *  output:   "_site"        →  Built site ends up here (deploy this)
	 *  includes: "_includes"    →  Layouts & partials  (relative to input)
	 *  data:     "_data"        →  Global data files   (relative to input)
	 *
	 *  Only the configured includes/ and data/ folders are special:
	 *  their files are never turned into pages. Any OTHER folder in
	 *  src/ is built — even one starting with "_". Eleventy also
	 *  skips node_modules/, the output folder, and the paths listed
	 *  in .gitignore / .eleventyignore (read relative to the project
	 *  root) plus the IGNORES section above.
	 * ---------------------------------------------------------- */
	return {
		dir: {
			input: "src",
			output: "_site",
			includes: "_includes",
			data: "_data",
		},

		// Which template languages Eleventy should process.
		// - njk  = Nunjucks templates (our primary language)
		// - md   = Markdown files (great for blog posts or content pages)
		// - html = Plain HTML files (passed through with data processing)
		templateFormats: ["njk", "md", "html"],

		// Use Nunjucks as the engine for .html files too,
		// so you can use {{ variables }} even in plain .html files.
		htmlTemplateEngine: "njk",
		markdownTemplateEngine: "njk",
	};
};
