/*
 * ============================================================
 *  ADDITIVE DEPLOY BATCH  —  scripts/deploy-batch.mjs
 * ============================================================
 *
 *  Writes _temp/deploy/deploy.batch: an explicit sftp batch, one
 *  `-mkdir` per folder and one `put` per file, that uploads the
 *  built site WITHOUT deleting anything on the server.
 *
 *  Run via:  npm run deploy:batch
 *       or:  node scripts/deploy-batch.mjs [LOCAL_DIR]   (default _site)
 *  then upload with the sftp command it prints at the end.
 *
 *  Why it exists: deploy.sh (lftp mirror --delete) is the real, full
 *  deploy, run from an interactive Git Bash. lftp hangs in a shell
 *  without a terminal (Claude's, for one), so those use this ADDITIVE
 *  path instead: it overwrites and adds, never deletes. A file removed
 *  from the build stays on the server until the next `npm run deploy`.
 *
 *  SINGLE SOURCE OF TRUTH: the active `EXCLUDES+=" --exclude-glob '…'"`
 *  lines in deploy.sh. This file keeps NO list of its own. It parses
 *  deploy.sh and applies lftp's own matching rules, so both deploy
 *  paths skip exactly the same remote-only files. (Lesson from a
 *  derived project: one exclude list had been copied into four
 *  places and only two got updated, so a deploy overwrote a file
 *  the server owned.)
 *
 *  It also refuses the same targets deploy.sh refuses (placeholder
 *  site.json url, a DEPLOY_REMOTE that isn't this site's folder):
 *  an additive upload can't delete, but it can still overwrite
 *  ANOTHER site's index.html. And the same leftovers in the built
 *  files (example.com / yoursite.com in robots.txt or security.txt,
 *  a security.txt about to expire, "Your Name" on the home page).
 *
 *  Order of operations: checks → walk → build lines → LEAK CHECK →
 *  only then write. Any failure exits 1 without writing a batch, and
 *  the batch from an earlier run is removed first, so a failed run
 *  never leaves a batch behind that someone could still feed to sftp.
 *  The batch is a build artefact (in the gitignored _temp/): regenerate
 *  it, never edit or commit it.
 *
 * ============================================================
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Project root = the folder above scripts/, wherever this is run from.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOCAL_DIR = path.resolve(ROOT, process.argv[2] || "_site");
const OUT_FILE = path.join(ROOT, "_temp", "deploy", "deploy.batch");

// Forward-slash path relative to the project root, for log lines and the batch.
const rel = (p) => path.relative(ROOT, p).split(path.sep).join("/");

const die = (msg) => {
	console.error("deploy-batch: " + msg);
	console.error("deploy-batch: no batch written. Do not deploy.");
	process.exit(1);
};

// A stale batch from an earlier run must not survive a failed one.
rmSync(OUT_FILE, { force: true });

// --- .env: the same file deploy.sh reads --------------------------------------
// Only DEPLOY_* keys, parsed as plain KEY=value text (never executed), CRLF-safe.
// The environment is a fallback, so the script can be tried without a .env.
const fileEnv = {};
const envPath = path.join(ROOT, ".env");
if (existsSync(envPath)) {
	for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
		if (/^\s*#/.test(line)) continue;
		const m = line.match(/^(DEPLOY_[A-Z_]+)=(.*)$/);
		if (m) fileEnv[m[1]] = m[2].trim();
	}
}
const env = (key) => fileEnv[key] || process.env[key] || "";

const remote = env("DEPLOY_REMOTE");
const host = env("DEPLOY_HOST");
const user = env("DEPLOY_USER");
const key = env("DEPLOY_KEY");

// Same allowlists as deploy.sh. They also keep every value safe inside the
// double-quoted batch lines and the printed sftp command.
if (!remote) die("DEPLOY_REMOTE not set in .env or the environment.");
if (!/^[A-Za-z0-9._/~-]+$/.test(remote)) die("DEPLOY_REMOTE contains invalid characters.");
if (host && !/^[A-Za-z0-9.-]+$/.test(host)) die("DEPLOY_HOST contains invalid characters.");
if (user && !/^[A-Za-z0-9._-]+$/.test(user)) die("DEPLOY_USER contains invalid characters.");
if (key.includes('"')) die("DEPLOY_KEY may not contain quotes.");

// --- deploy.sh: read it once, minus its comments --------------------------------
const deployShPath = path.join(ROOT, "deploy.sh");
if (!existsSync(deployShPath)) die("deploy.sh not found. It carries the exclude list this script depends on.");

// Bash treats an unquoted '#' at the start of a word as the start of a comment.
// Strip those, so a commented-out `# EXCLUDES+=…` line counts for nothing,
// exactly as it does when bash runs deploy.sh.
function stripComment(line) {
	let quote = null;
	for (let i = 0; i < line.length; i++) {
		const c = line[i];
		if (quote) {
			if (c === quote) quote = null;
			else if (c === "\\" && quote === '"') i++;
			continue;
		}
		if (c === "'" || c === '"') quote = c;
		else if (c === "\\") i++;
		else if (c === "#" && (i === 0 || /\s/.test(line[i - 1]))) return line.slice(0, i);
	}
	return line;
}
const code = readFileSync(deployShPath, "utf8").split(/\r?\n/).map(stripComment);
const codeText = code.join("\n");

// --- Target checks (the same rules as deploy.sh's "Target sanity checks") -----
const minMatch = codeText.match(/^MIN_REMOTE_SEGMENTS=(\d+)\s*$/m);
const MIN_REMOTE_SEGMENTS = minMatch ? Number(minMatch[1]) : 3;
if (!minMatch) console.log("deploy-batch: MIN_REMOTE_SEGMENTS not found in deploy.sh, using 3.");

if (remote.endsWith("/")) die(`DEPLOY_REMOTE must not end in '/' (got '${remote}').`);
const segs = remote.replace(/^\//, "").split("/");
if (segs.some((s) => s === "" || s === "." || s === ".." || s.startsWith("~"))) {
	die(`DEPLOY_REMOTE '${remote}' contains an empty, '.', '..' or '~' folder. Write the plain full path.`);
}
if (remote.startsWith("/") && segs.length < MIN_REMOTE_SEGMENTS) {
	die(`DEPLOY_REMOTE '${remote}' is only ${segs.length} folder(s) deep. That looks like an account root, not a site folder.`);
}

let siteHost = "";
try {
	siteHost = new URL(JSON.parse(readFileSync(path.join(ROOT, "src", "_data", "site.json"), "utf8")).url).hostname;
} catch {
	die('could not read a valid "url" from src/_data/site.json.');
}
if (/(^|\.)example\.(com|org|net)$/.test(siteHost)) {
	die(`src/_data/site.json "url" is still the placeholder (${siteHost}). Set the real domain first.`);
}
const bareHost = siteHost.replace(/^www\./, "");
const remoteLast = segs[segs.length - 1].toLowerCase();
if (![bareHost, siteHost, bareHost.split(".")[0]].includes(remoteLast)) {
	if (env("DEPLOY_ALLOW_PATH_MISMATCH") === "1") {
		console.log(`deploy-batch: note: DEPLOY_REMOTE ends in '/${remoteLast}', not '/${bareHost}' (allowed by DEPLOY_ALLOW_PATH_MISMATCH=1).`);
	} else {
		die(
			`DEPLOY_REMOTE ends in '/${remoteLast}', but site.json says this site is ${siteHost}. ` +
				`Expected '${bareHost}' (or '${bareHost.split(".")[0]}'). If '${remoteLast}' really is this ` +
				"site's docroot, set DEPLOY_ALLOW_PATH_MISMATCH=1 in .env.",
		);
	}
}

// --- Sentinel, mirroring deploy.sh's own ---------------------------------------
// An additive batch can't delete anything, but a batch built from an empty or
// half-built folder "succeeds" while uploading nothing useful.
if (!existsSync(path.join(LOCAL_DIR, "index.html"))) {
	die(`${rel(LOCAL_DIR)}/index.html missing. Run \`npm run build\` first.`);
}

// --- Placeholders in the BUILT files (same checks as deploy.sh) ----------------
// The build only warns about site.json template values; this stops them going live.
const builtText = (f) => {
	const p = path.join(LOCAL_DIR, f);
	return existsSync(p) ? readFileSync(p, "utf8") : "";
};
for (const f of ["robots.txt", ".well-known/security.txt"]) {
	if (/example\.(com|org|net)|yoursite\.com/i.test(builtText(f))) {
		die(`${rel(LOCAL_DIR)}/${f} still contains example.com / yoursite.com. Fix src/_data/site.json (url, security.contact) and rebuild.`);
	}
}
const expiresMatch = builtText(".well-known/security.txt").match(/^Expires:\s*(\S+)/im);
if (expiresMatch) {
	const daysLeft = Math.floor((new Date(expiresMatch[1]) - Date.now()) / 864e5);
	if (daysLeft < 30) {
		die(
			`security.txt Expires is ${daysLeft} day(s) away (under 30, or already passed). Set site.json ` +
				'security.expires to "" (build date + 1 year) or a date ~12 months ahead, and rebuild.',
		);
	}
}
if (/Your Name|yoursite\.com/.test(builtText("index.html"))) {
	die(`${rel(LOCAL_DIR)}/index.html still says 'Your Name' or yoursite.com (site.json footer.copyrightName / copyrightUrl).`);
}

// --- The exclude list, read straight out of deploy.sh ---------------------------
// The list = the active EXCLUDES= / EXCLUDES+= lines, plus any --exclude-glob
// written straight onto the mirror line (some derived projects' deploy.sh do that).
const mirrorLine = code.find((l) => /\bmirror\b.*--reverse/.test(l));
if (!mirrorLine) die("no `mirror --reverse` line found in deploy.sh. Its shape changed; refusing to guess.");
const isExcludesLine = (l) => /^\s*EXCLUDES\+?=/.test(l);
const listText = [...code.filter(isExcludesLine), mirrorLine].join("\n");
const patterns = [...listText.matchAll(/--exclude-glob\s+'([^']+)'/g)].map((m) => m[1]);
const flagCount = (listText.match(/--exclude-glob\b/g) || []).length;
if (flagCount !== patterns.length) {
	die("deploy.sh has an --exclude-glob that isn't followed by a 'single-quoted' pattern. Quote it the same way as the others.");
}
const usesVariable = code.some(isExcludesLine);
if (usesVariable && !/\$\{?EXCLUDES\}?/.test(mirrorLine)) {
	die("deploy.sh defines EXCLUDES but its mirror line doesn't pass $EXCLUDES to lftp. The two deploy paths would disagree.");
}
if (!patterns.length) {
	if (!usesVariable) die("no EXCLUDES list or --exclude-glob flags found in deploy.sh. Its shape changed; refusing to guess.");
	console.log("deploy-batch: deploy.sh has no active excludes; every file in the build will be uploaded.");
}

// lftp's matching rules (its PatternSet::Glob, checked against lftp 4.9.2):
//   - the pattern is compared with as many trailing parts of the path as it has
//     '/' characters: no '/' = the name alone, in any folder; 'a/b' = the last
//     two parts; and so on.
//   - '*' matches any run of characters except '/'. A leading dot is NOT
//     special, so '*' also matches '.htaccess'.
//   - a folder is compared with a '/' on the end ("assets/"), so 'dir/*'
//     matches the folder itself as well as everything in it.
// Only '*' and literal characters are supported here. Anything fancier aborts,
// rather than letting an excluded file slip into the batch unnoticed.
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const rules = patterns.map((p) => {
	if (p.startsWith("/")) {
		die(`exclude '${p}' starts with '/'. lftp then matches nothing at all; drop the leading slash in deploy.sh.`);
	}
	if (/[?[\]\\]/.test(p)) {
		die(`exclude '${p}' uses ?, [ ] or \\. Teach scripts/deploy-batch.mjs that shape before relying on it.`);
	}
	return {
		pattern: p,
		slashes: (p.match(/\//g) || []).length,
		re: new RegExp("^" + p.split("*").map(escapeRe).join("[^/]*") + "$"),
	};
});

function matches(rule, relPath) {
	// Walk back from the end of the path, past as many '/' as the pattern has.
	let start = 0;
	let countdown = rule.slashes;
	for (let i = relPath.length - 1; i >= 0; i--) {
		if (relPath[i] !== "/") continue;
		if (countdown === 0) {
			start = i + 1;
			break;
		}
		countdown--;
	}
	return rule.re.test(relPath.slice(start));
}
// relPath: "about/index.html" for a file, "about/" (trailing slash) for a folder.
const excluded = (relPath) => rules.some((rule) => matches(rule, relPath));

// --- Walk the build output --------------------------------------------------------
const dirs = [];
const files = [];
const skipped = [];
(function walk(absDir, relDir) {
	const names = readdirSync(absDir).sort();
	for (const name of names) {
		const r = relDir ? relDir + "/" + name : name;
		const abs = path.join(absDir, name);
		const st = statSync(abs);
		if (st.isDirectory()) {
			if (excluded(r + "/")) {
				skipped.push(r + "/");
				continue;
			}
			dirs.push(r);
			walk(abs, r);
		} else if (st.isFile()) {
			if (excluded(r)) {
				skipped.push(r);
				continue;
			}
			files.push(r);
		}
	}
})(LOCAL_DIR, "");

// sftp expands * ? [ in a put's LOCAL path as a wildcard, and a quote or
// backslash would break the quoting. Eleventy never writes such names, so
// one showing up means something odd: stop rather than upload the wrong file.
const odd = [...dirs, ...files].filter((r) => /["\\*?[\]\r\n]/.test(r));
if (odd.length) die("file names sftp can't take literally: " + odd.slice(0, 5).join(", "));

const localPrefix = rel(LOCAL_DIR);
const lines = [
	// '-' prefix: an existing folder makes mkdir fail; '-' tells sftp to carry on.
	...dirs.map((d) => `-mkdir "${remote}/${d}"`),
	...files.map((f) => `put "${localPrefix}/${f}" "${remote}/${f}"`),
];

// --- Leak check, BEFORE the write -------------------------------------------------
// A second, independent pass: every uploaded path AND every folder above it is
// re-tested against every rule. The walk above should already have skipped
// them, so any hit here means a bug, and the batch is not written.
const ancestorsAndSelf = (r, isDir) => {
	const parts = r.split("/");
	const out = [];
	for (let i = 1; i < parts.length; i++) out.push(parts.slice(0, i).join("/") + "/");
	out.push(isDir ? r + "/" : r);
	return out;
};
const leaks = [
	...dirs.filter((d) => ancestorsAndSelf(d, true).some(excluded)),
	...files.filter((f) => ancestorsAndSelf(f, false).some(excluded)),
];

console.log("deploy-batch: excludes (from deploy.sh): " + (patterns.length ? patterns.join(", ") : "none"));
if (skipped.length) {
	console.log(`deploy-batch: present in ${localPrefix}/ but excluded, so NOT uploaded: ` + skipped.join(", "));
}
if (leaks.length) {
	console.error(`deploy-batch: ABORT. ${leaks.length} batch path(s) match an exclude:`);
	for (const l of leaks.slice(0, 20)) console.error("  " + l);
	console.error("files", files.length, "leak? YES-ABORT");
	die("leak check failed.");
}

mkdirSync(path.dirname(OUT_FILE), { recursive: true });
writeFileSync(OUT_FILE, lines.join("\n") + "\n");
console.log(`deploy-batch: ${dirs.length} folders, ${files.length} files → ${rel(OUT_FILE)}`);
console.log("files", files.length, "leak? clean");

// --- How to upload it ---------------------------------------------------------------
// Run from the project root: the put lines use paths relative to it. Same ssh
// options as deploy.sh, so it fails fast instead of waiting at a prompt.
const keyArg = key ? `"${key}"` : "~/.ssh/id_ed25519";
const hostKey = env("DEPLOY_STRICT_HOSTKEY") === "1" ? "yes" : "accept-new";
const target = user && host ? `${user}@${host}` : "$DEPLOY_USER@$DEPLOY_HOST";
console.log("");
console.log("Upload it (additive: overwrites + adds, never deletes), from the project root:");
console.log(
	`  sftp -i ${keyArg} -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=${hostKey} -b ${rel(OUT_FILE)} ${target}`,
);
console.log('"Failure" lines from -mkdir on folders that already exist are expected and harmless.');
