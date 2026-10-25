/*
 * ============================================================
 *  CLEAN BUILD OUTPUT  —  scripts/clean.js   (npm run clean)
 * ============================================================
 *
 *  Deletes _site/ so every `npm run build` starts from nothing.
 *
 *  Why: Eleventy 3 never empties its output folder. Rename or delete
 *  a page (say /contact/ → /showcase/) and the old
 *  _site/contact/index.html stays behind. deploy.sh mirrors _site
 *  with `--delete`, so the stale local copy keeps the stale REMOTE
 *  copy alive too: old nav, old copy, still indexed by Google.
 *
 *  Side effect: while a build runs, Laragon serves 404s for a
 *  second or two. `eleventy --watch` does not run this — only the
 *  full `npm run build` does.
 *
 *  Optional argument: the folder to delete (default _site),
 *  e.g. `node scripts/clean.js some/other/_site`.
 * ============================================================
 */

const fs = require("fs");
const path = require("path");

const projectRoot = path.join(__dirname, "..");
const target = process.argv[2] ? path.resolve(process.argv[2]) : path.join(projectRoot, "_site");

// Safety net against a typo'd argument: never delete the project itself
// (or a folder that contains it), and never anything inside src/.
// isInside(a, b): is b the same folder as a, or somewhere below it?
// (path.relative returns an absolute path when a and b are on different
// drives, e.g. C: vs E:, which means "not inside".)
const isInside = (a, b) => {
	const r = path.relative(a, b);
	return !r.startsWith("..") && !path.isAbsolute(r);
};
if (isInside(target, projectRoot) || isInside(path.join(projectRoot, "src"), target)) {
	console.error(`clean: refusing to delete ${target}`);
	process.exit(1);
}

// maxRetries: on Windows a file can be briefly locked (antivirus, an
// editor preview, Laragon reading it); retry instead of failing the build.
fs.rmSync(target, { recursive: true, force: true, maxRetries: 3 });
console.log(`clean: removed ${path.relative(process.cwd(), target) || target}`);
