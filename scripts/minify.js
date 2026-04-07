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
 * ============================================================
 */

const fs = require("fs");
const path = require("path");
const CleanCSS = require("clean-css");
const { minify } = require("terser");

const SITE_DIR = path.join(__dirname, "..", "_site", "assets");

function walk(dir, ext) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(walk(full, ext));
    } else if (entry.name.endsWith(ext) && !entry.name.endsWith(".min" + ext)) {
      results.push(full);
    }
  }
  return results;
}

async function run() {
  let cssCount = 0;
  let jsCount = 0;

  // Minify CSS
  for (const file of walk(SITE_DIR, ".css")) {
    const src = fs.readFileSync(file, "utf8");
    const result = new CleanCSS({ level: 1 }).minify(src);
    if (result.errors.length === 0) {
      fs.writeFileSync(file, result.styles);
      cssCount++;
    } else {
      console.error(`CSS error in ${file}:`, result.errors);
    }
  }

  // Minify JS
  for (const file of walk(SITE_DIR, ".js")) {
    const src = fs.readFileSync(file, "utf8");
    const result = await minify(src, { compress: true, mangle: true });
    if (result.code) {
      fs.writeFileSync(file, result.code);
      jsCount++;
    } else {
      console.error(`JS error in ${file}:`, result.error);
    }
  }

  console.log(`Minified ${cssCount} CSS + ${jsCount} JS files`);
}

run().catch(console.error);
