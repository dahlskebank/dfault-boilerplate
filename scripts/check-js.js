/*
 * ============================================================
 *  JS SYNTAX GATE  —  scripts/check-js.js   (npm run lint:js)
 * ============================================================
 *
 *  The JS half of the pre-build lint (stylelint is the CSS half).
 *  Runs `node --check` on every .js/.mjs file in src/assets/js/
 *  and exits 1 if any of them does not parse.
 *
 *  Why bother: Eleventy only COPIES these files, and html-validate
 *  never looks at JS. Without this gate, the first thing to notice a
 *  typo was terser at the very end of the build — after Eleventy had
 *  already concatenated the site-wide scripts into one bundle.js, where
 *  a single stray `)` stops ALL site-wide JS from running.
 *
 *  `node --check` = "parse this file, don't run it". It is V8, the same
 *  engine Chrome uses, so a file that passes here parses in Chrome too.
 *  Node auto-detects ES modules (import/export, top-level await), so
 *  `type: "module"` page scripts are checked correctly as well.
 *
 *  This checks each file ON ITS OWN. Problems that only appear once
 *  files are glued together (two files declaring the same top-level
 *  `const`) are caught by the bundle check in eleventy.config.js and
 *  again by terser in scripts/minify.js.
 *
 *  Optional argument: a different folder to check,
 *  e.g. `node scripts/check-js.js src/assets/js/tools`.
 * ============================================================
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const JS_DIR = process.argv[2]
	? path.resolve(process.argv[2])
	: path.join(__dirname, "..", "src", "assets", "js");

function walk(dir) {
	let results = [];
	if (!fs.existsSync(dir)) return results;
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) results = results.concat(walk(full));
		else if (/\.m?js$/.test(entry.name)) results.push(full);
	}
	return results;
}

const files = walk(JS_DIR);
const failures = [];

for (const file of files) {
	// process.execPath = the node.exe running this script, so we never
	// depend on which `node` happens to be first on PATH.
	const r = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
	if (r.status !== 0) {
		failures.push(file);
		// Node prints file:line, the offending line, a ^ marker and the
		// message. The first 5 lines are the useful part; the rest is a
		// stack trace into Node's own internals.
		console.error((r.stderr || r.error?.message || "").split("\n").slice(0, 5).join("\n"));
	}
}

if (failures.length) {
	console.error(`lint:js: ${failures.length} of ${files.length} file(s) have syntax errors (see above).`);
	process.exit(1);
}
console.log(`lint:js: ${files.length} file(s) parse OK`);
