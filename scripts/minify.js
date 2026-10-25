/*
 * ============================================================
 *  POST-BUILD MINIFIER  —  scripts/minify.js
 * ============================================================
 *
 *  Minifies all CSS and JS files in _site/assets/ after
 *  Eleventy builds.  Run via: npm run build
 *
 *  Uses:
 *    - clean-css  for CSS
 *    - terser     for JS
 *
 *  It is also the LAST GATE of the build: terser has to parse
 *  every JS file to minify it, so a syntax error anywhere in
 *  _site/assets/ (including the concatenated bundle.js) makes
 *  this script exit 1 — and `npm run deploy` stops there
 *  instead of uploading a broken bundle.
 *
 *  Optional argument: the build folder to minify (default _site),
 *  e.g. `node scripts/minify.js some/other/_site`.
 *
 * ============================================================
 */

const fs = require("fs");
const path = require("path");
const CleanCSS = require("clean-css");
const { minify } = require("terser");

const OUT_DIR = process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, "..", "_site");
const SITE_DIR = path.join(OUT_DIR, "assets");

// Per-build cache-bust token for relative ES-module imports (ported from the
// fg project). .htaccess caches JS for a year, and the entry
// <script src="…?v={{ build.cacheBust }}"> gets a new URL on every build, but the
// files it IMPORTS (`import "./x.js"`) did not: after a change to an imported
// module, a returning visitor kept the old copy for up to a year. A new value
// each build means every module import is fetched fresh after a deploy.
//
// NOTE: this only runs in `npm run build` (and so in `npm run deploy`), not
// under `eleventy --watch` — fine, because only a built site is deployed.
const BUILD_VER = Date.now();

// Appends ?v=<BUILD_VER> to relative ./ or ../ specifiers ending in .js/.mjs
// that follow `from` / `import`: named and side-effect imports, dynamic
// import() and re-exports (`export … from "./x.js"`). Bare/npm specifiers,
// absolute URLs and specifiers that already have a ?query are left alone.
// (?<!\.) skips member calls such as `Array.from(` / `foo.import(`.
function versionImports(code, ver) {
  return code.replace(
    /(?<!\.)\b(from|import)(\s*\(?\s*)(["'])(\.\.?\/[^"'?]+?\.m?js)\3/g,
    (_m, kw, mid, q, spec) => `${kw}${mid}${q}${spec}?v=${ver}${q}`,
  );
}

// Files under `dir` whose name matches `re`, skipping anything already
// minified (*.min.css, *.min.js, *.min.mjs). A regex rather than a plain
// extension string so .js AND .mjs page modules are both picked up: matching
// endsWith(".js") silently skipped every .mjs file, which then shipped
// unminified and without the import versioning below.
function walk(dir, re) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(walk(full, re));
    } else if (re.test(entry.name) && !/\.min\.[a-z]+$/i.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

// Short path for log lines: "_site/assets/js/bundle.js" instead of the full
// absolute Windows path.
const rel = (file) => path.relative(process.cwd(), file).split(path.sep).join("/");

async function run() {
  let cssCount = 0;
  let jsCount = 0;
  // Set when ANY file fails. We keep going so one run lists every broken
  // file, then exit 1 at the end (see the bottom of this file).
  let failed = false;

  // Minify CSS
  for (const file of walk(SITE_DIR, /\.css$/i)) {
    const src = fs.readFileSync(file, "utf8");
    const result = new CleanCSS({ level: 1 }).minify(src);
    // clean-css reports most problems (e.g. "Missing '}'") as warnings, not
    // errors. Show them; only real errors fail the build. stylelint already
    // blocks broken CSS in src/assets/css/ before Eleventy runs.
    for (const warning of result.warnings) console.warn(`CSS warning in ${rel(file)}: ${warning}`);
    if (result.errors.length === 0) {
      fs.writeFileSync(file, result.styles);
      cssCount++;
    } else {
      console.error(`CSS minify FAILED in ${rel(file)}:`, result.errors);
      failed = true;
    }
  }

  // Minify JS
  //
  // Each file gets its own try/catch. terser 5 does not return an error
  // object, it THROWS (rejects) on a parse error. Without the per-file
  // catch, one bad file aborted the whole loop: every file after it stayed
  // unminified, and the bare `run().catch(console.error)` exited 0, so
  // `npm run deploy` uploaded a bundle.js that could not even parse — which
  // kills the theme toggle, offcanvas, copy buttons and cookie toast on
  // every page at once.
  //
  // `module` must match how the browser LOADS the file (ported from the fg
  // project). `module: true` tells terser "top level is private", which lets
  // it unwrap IIFEs and rename top-level names to single letters. Right for
  // an ES module, destructive for a classic <script>: its top-level names
  // share ONE global scope with every other classic script, so two minified
  // files that both got `t` collide ("Identifier 't' has already been
  // declared") and the second one silently never runs.
  //
  // So: try the safe classic-script mode first and fall back to module mode
  // only when the file genuinely needs it (import/export or top-level await,
  // e.g. an `extraScripts: [{ src, type: "module" }]` page script). A module
  // minified as a script is merely less compact; a script minified as a
  // module is broken. `ecma: 2020` keeps modern syntax (??, ?.) as-is.
  for (const file of walk(SITE_DIR, /\.m?js$/i)) {
    const src = fs.readFileSync(file, "utf8");
    let result;
    try {
      result = await minify(src, { compress: true, mangle: true, module: false, ecma: 2020 });
    } catch {
      // Didn't parse as a classic script — retry as an ES module.
      try {
        result = await minify(src, { compress: true, mangle: true, module: true, ecma: 2020 });
      } catch (err) {
        // terser's own error says `filename: '0'`, so name the file here.
        console.error(`JS minify FAILED in ${rel(file)} (line ${err.line}, col ${err.col}): ${err.message}`);
        failed = true;
        continue;
      }
    }
    if (result.code) {
      fs.writeFileSync(file, versionImports(result.code, BUILD_VER));
      jsCount++;
    } else if (src.trim()) {
      // Parsed fine but produced no code (e.g. a file that is only comments).
      // Not an error: leave the original in place.
      console.warn(`JS minify produced no code for ${rel(file)} — left as-is`);
    }
  }

  console.log(`Minified ${cssCount} CSS + ${jsCount} JS files`);

  if (failed) {
    console.error("minify: one or more files FAILED (see above). _site is NOT safe to deploy.");
    // exitCode (not process.exit) lets the log lines above finish printing.
    process.exitCode = 1;
  }
}

// Exit 1 on any unexpected failure too. minify is the last step of
// `npm run build`, so the old bare `run().catch(console.error)` exited 0 and
// `npm run deploy` shipped a half-minified _site anyway.
run().catch((e) => {
  console.error(e);
  process.exit(1);
});
