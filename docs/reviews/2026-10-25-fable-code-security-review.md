# Code and security review — 2026-10-25 (Claude Fable 5.1)

> **Status, 2026-10-25 (v1.2.1):** N1–N13, the deploy-batch debug lines, the footer `www.` anchoring and the
> `v`-filter fragment fix are implemented. N13 is a build warning, not a block; N5 fixes the redirect target to
> `site.url`; N3 ties `robots` to `legalPlaceholder` through `eleventyComputed` and adds a deploy gate on an HTML
> comment the placeholder page emits; N12 reads the footer values from `site.json`. Left as documented: the
> merge-commit `git log` edge case, the `walk()` duplication, `check-js` process-per-file, the indentation nits, the
> `securityExpires` 366-day edge, the GA `</script>` nit, the HTTP→HTTPS rule's `%{HTTP_HOST}` target (N5), the
> protocol-relative `ogImage` test and the `--dryrun` bundle write (section 4), and the nav dropdown `<a href="#">`
> toggles (TPL-23, section 3). Verified with a scratch build through html-validate,
> check-refs and minify (plus an `.mjs` probe), filter unit tests, a deploy.sh / deploy-batch sandbox with a fake
> lftp (key allowlist, footer gate, legal gate, clean run), and two live `--watch` rebuilds (stamp now changes).

**Scope:** the whole boilerplate at commit `5cb5d34` (v1.2.0): build pipeline, deploy scripts, generated `.htaccess`,
templates, data files and client-side JS. Code and security only, no design or UX.

**Why this review exists:** a full review ran on 2026-10-24 (Claude Opus 5.5) and its fixes landed in v1.2.0. This pass
asks one question: what did that review miss, or what did the fixes leave open? Findings already in the 2026-10-24
report are listed only where the fix is incomplete. That report is kept outside the repo (it covers private projects).

**Method:** every file read in full; a scratch build (`npx @11ty/eleventy --output=_temp/…`) checked with
html-validate and `check-refs`; the `v` and `hostname` filters exercised directly; a passthrough-copy probe; a
`--dryrun`; the four jsDelivr SRI hashes recomputed; `npm audit`; grep of tracked files for personal data. The
automated diff review (`/code-review`, high effort) ran first and its 20 findings were re-verified by hand — three were
wrong or already known (section 4).

## Verdict

The security posture is good for what this is: a static site with no forms, no logins and no server code. Every
third-party asset is pinned with SRI, inline JSON-LD is escaped against `</script>`, saved preferences are validated
against allowlists before they touch the DOM, `.env` is parsed instead of sourced, the mirror target is sanity-checked
before `--delete`, and the tracked files hold no account names, server paths or credentials. `npm audit` is clean.

Nothing found is high severity. The two findings worth fixing first are not exploits but **publishing mistakes the
build can't catch**: passthrough copy ships anything under `src/assets/` (including `_scratch/` folders the template
ignores were written to stop), and the `?v=` cache-bust stays constant for a whole `--watch` session.

## 1. What holds (verified, no action)

- **SRI everywhere.** Bootstrap CSS/JS, Icons, PhotoSwipe and all 26 Bootswatch sheets carry `integrity` +
  `crossorigin`. The four jsDelivr hashes were recomputed from the live files today and match `src/_data/cdn.js`.
  The Bootswatch map in `<head>` is read with `hasOwnProperty`, and a saved theme name not in the map is dropped.
- **Inline scripts.** JSON-LD is `dump`ed and `<` is rewritten to `<`; theme ids and the `darkPalette` list are
  `dump`ed; the GA id is `dump`ed in script and `urlencode`d in the URL. No `innerHTML`, `eval`, inline event handlers
  or `javascript:` URLs anywhere in `src/`. Bootstrap tooltips get text, never HTML.
- **Storage.** `ddStore` wraps every `localStorage` call in try/catch; the saved theme is checked against
  `themes.js` ids and the saved Bootswatch theme against `cdn.js` before either is applied.
- **Deploy.** `.env` is read line by line, only the six `DEPLOY_*` keys are accepted, host/user/remote are allowlisted
  before they reach the lftp heredoc, ssh runs with `BatchMode` + `IdentitiesOnly`, the remote path must look like this
  site's folder, and placeholders in the built output stop the upload. `deploy-batch.mjs` mirrors all of it.
- **Apache.** `nosniff`, `SAMEORIGIN`, `Referrer-Policy`, `Permissions-Policy` with `Header always`; `.ht*` denied;
  indexes off; TRACE blocked; HSTS staged with a sensible rollout note. Skipping CSP is a documented decision and the
  right one here: the inline scripts can't be nonced on static hosting and hashes would churn with every
  `site.json` edit. (If you ever want a CSP that needs no CDN allowlist: `frame-ancestors 'self'; base-uri 'self';
  form-action 'self'` is safe to add as-is.)
- **Repo hygiene.** `.claude/`, `.env`, `.htpasswd*`, `_temp/` ignored; no user paths, account names or e-mail
  addresses in tracked files; `.vscode/tasks.json` holds no paths. `npm audit`: 0 vulnerabilities (Node 24.14,
  Eleventy 3.1.7). The scratch build passes html-validate and `check-refs` (238 references), `<meta charset>` sits at
  byte 63, and robots.txt, sitemap.xml and security.txt are well-formed.

## 2. New findings (not in the 2026-10-24 review)

| # | Severity | Finding | Where |
|---|---|---|---|
| N1 | medium | Passthrough copy publishes every file under `src/assets/`, `_`-prefixed scratch folders included | `eleventy.config.js:96` |
| N2 | medium | `cacheBust` is frozen for a whole `--watch` session, so Laragon's 1-year CSS/JS cache serves stale files | `eleventy.config.js:121` |
| N3 | medium | `legal.njk` ships `noindex` and no gate notices when a real site forgets to remove it | `src/legal.njk:30` |
| N4 | medium | `minify.js` never sees `.mjs`: no minify, no import versioning, stale modules for a year | `scripts/minify.js:121` |
| N5 | low | www→bare redirect targets whatever `Host` the request carried, though `site.url` is known | `src/htaccess.njk:41` |
| N6 | low | `DEPLOY_KEY` is the one `.env` value without an allowlist, and it ends up in a shell command | `deploy.sh:61`, `scripts/deploy-batch.mjs:91` |
| N7 | low | Both deploy paths read `site.json` directly; a project on `site.js` builds but can't deploy | `deploy.sh:94`, `scripts/deploy-batch.mjs:134` |
| N8 | low | `noindexSite` header uses `Header set` while the block above was changed to `Header always set` | `src/htaccess.njk:160` |
| N9 | low | `v` filter puts `?v=` after a `#fragment` | `eleventy.config.js:289` |
| N10 | low | Empty `og:image` / `<lastmod></lastmod>` are printed when the value is `""` | `head-meta.njk:134`, `sitemap.njk:42` |
| N11 | low | Breadcrumb trail and JSON-LD ignore `navLabel`, unlike the menus | `eleventy.config.js:424` |
| N12 | low | The "Your Name" deploy gate greps rendered HTML, so legitimate page copy can block a deploy | `deploy.sh:166`, `deploy-batch.mjs:183` |
| N13 | low | `extraScripts` accepts a CDN script without `integrity`, silently | `src/_includes/base.njk:251` |

### N1 · Passthrough copy publishes `_`-folders under `src/assets/`

- **Problem.** The IGNORES section (lines 449–452) keeps `src/**/_temp/**`, `_tmp`, `_notes` and `README.md` out of
  the build because "this has happened on a live site". Those ignores only apply to templates. `addPassthroughCopy("src/assets", …)`
  copies the whole tree and its filter (line 97) removes only `README.md`.
- **Evidence.** Probe: `src/assets/_fable-probe/secret-plan.txt` + `README.md`, then a scratch build. Output contained
  `assets/_fable-probe/secret-plan.txt`; the README was filtered. (Probe folder removed afterwards.) `check-refs`
  can't catch this: it checks references, not orphan files.
- **Why it matters.** Original PSD/AI masters, `_old/` image folders and `_notes.txt` next to the pictures are exactly
  what lands in `src/assets/img/` on a real project, and `mirror --delete` puts them on the server.
- **Fix (S).** Extend the filter so the two safety nets agree:
  ```js
  // Skip README.md and any _underscore folder or file, like the IGNORES below.
  filter: (relPath) => !/(^|[\\/])(_[^\\/]*|README\.md)($|[\\/])/i.test(relPath),
  ```
  and say so in the IGNORES comment (it currently claims passthrough "needs its own filter" but only names README).
  Optional: also drop `.psd|.ai|.xcf|.sketch|.fig` masters.

### N2 · `cacheBust` is constant across `--watch` rebuilds

- **Problem.** `eleventyConfig.addGlobalData("cacheBust", Date.now())` evaluates once, when the config file loads.
  In watch mode Eleventy's `restart()` resets files and passthrough but re-reads the config only when the config file
  itself changes (`resetConfig()` is gated on the config glob; `node_modules/@11ty/eleventy/src/Eleventy.js:866, 907–968`).
  Every rebuild in a session therefore emits the same `style.css?v=…` and `bundle.js?v=…`.
- **Why it matters.** Laragon serves the generated `.htaccess`, which caches CSS and JS for a year. After the first
  page load in a watch session, an edit to `style.css` or any bundled script is rebuilt on disk but the browser keeps
  the old copy until a hard refresh. (Chrome DevTools "Disable cache" hides this; a phone on the LAN doesn't.)
- **Confidence.** Confirmed from Eleventy's source; not reproduced in a live watch session.
- **Fix (S).** Move the stamp into `src/_data/build.js`, which is already a per-build data function
  (`build.time` exists for the same reason), and reference `build.cacheBust` where `cacheBust` is used (base.njk,
  head-assets.njk). Keep `addGlobalData("cacheBust", …)` for one release as an alias if derived sites use it. Verify
  with two watch rebuilds: the `?v=` in `_site/index.html` must change.

### N3 · `legal.njk` is noindex by default and nothing checks it before launch

- **Problem.** The 2026-10-24 review recommended `robots: "noindex, follow"` on the satirical legal page, and v1.2.0
  added it with a watch-only "placeholder" alert. But the launch checks (`eleventy.before` placeholder list, lines
  472–516; `deploy.sh:153–169`; `deploy-batch.mjs:168–185`) never look at it.
- **Failure.** A derived site rewrites the legal copy, sets `legalPlaceholder: false`, forgets line 30 → the
  Privacy/Cookie/Terms page every footer links to is deindexed and absent from sitemap.xml and llms.txt, forever, with
  no warning anywhere.
- **Fix (S).** Tie the two switches together so one edit does both: in legal.njk's front matter (JS front matter, as
  the cheatsheet does) `robots: legalPlaceholder ? "noindex, follow" : undefined`; or add to the deploy gates
  `grep -q 'name="robots" content="noindex' "$LOCAL_DIR/legal/index.html"` → refuse with a message naming line 30.

### N4 · `minify.js` skips `.mjs`

- **Problem.** `walk(SITE_DIR, ".js")` matches with `entry.name.endsWith(".js")`, so `app.mjs` is never visited:
  not minified and, more important, `versionImports()` never runs on it. `check-js.js` and the README both say
  `.js`/`.mjs` are handled.
- **Failure.** `extraScripts: [{ src: "/assets/js/app.mjs", type: "module" }]` importing `./lib.mjs`: after a deploy
  the entry gets a new `?v=` but `lib.mjs` is still fetched from the 1-year cache — the exact bug the import
  versioning was added to fix (2026-10-24 review BLD-17).
- **Fix (S).** Match `/\.m?js$/` in `walk` (and skip `.min.js`/`.min.mjs`), or share one `walk(dir, { ext })` helper
  with `check-js.js`, `check-refs.js` and `deploy-batch.mjs`, which each carry their own copy today.

### N5 · Redirect target comes from the `Host` header

- **Problem.** `RewriteCond %{HTTP_HOST} ^www\.(.+)$` / `RewriteRule ^ https://%1%{REQUEST_URI}` (lines 41–42) and
  the HTTPS rule (line 35) build the redirect target from the request's `Host`. If a request with an arbitrary
  `Host` reaches this vhost (it is the default vhost, or a wildcard alias), `Host: www.evil.example` → 301 to
  `https://evil.example/…`: a classic Host-header open redirect.
- **Context.** On shared hosts with name-based vhosts an unknown `Host` normally never reaches this `.htaccess`, and
  on Domeneshop the proxy does the www redirect before Apache (the file says so). So the exposure is small, but the
  template knows the canonical host and doesn't need `Host` at all.
- **Fix (S).** Keep the condition, fix the destination:
  ```apache
  RewriteCond %{HTTP_HOST} ^www\. [NC]
  RewriteRule ^ {{ site.url | safe }}%{REQUEST_URI} [R=301,L]
  ```
  Local dev is unaffected: `bp.test` and hosts-file domains don't start with `www.`. Leave the HTTPS rule as it is
  (it must work for the local domain too) or give it the same target behind an `{% if %}` on the production host.

### N6 · `DEPLOY_KEY` has no allowlist

- **Problem.** Host, user and remote path are allowlisted (deploy.sh:58–60) because they are interpolated into the
  unquoted lftp heredoc. `DEPLOY_KEY` only rejects `"` (line 61) and `deploy-batch.mjs:91` does the same, yet it is
  interpolated into `sftp:connect-program "ssh … -i \"$DEPLOY_KEY\""` (line 266), which lftp hands to `/bin/sh -c`,
  and into the printed `sftp -i "…"` command (deploy-batch.mjs:331). `$(…)` and backticks survive both checks and
  are expanded by that shell.
- **Context.** The value must also pass `[ -f "$DEPLOY_KEY" ]`, so a file with that literal name has to exist, and
  anyone who can write `.env` can edit `deploy.sh` instead. This is consistency, not a boundary — but the script's
  own comment (lines 26–33) says the allowlists exist for exactly this reason.
- **Fix (S).** `[[ "$DEPLOY_KEY" =~ ^[A-Za-z0-9\ ._/~:-]+$ ]]` (space allowed: the default key lives under
  `/c/Users/<name with space>/.ssh/`), same regex in deploy-batch.mjs.

### N7 · Deploy paths bypass `scripts/site-data.js`

`site-data.js` was added so a project that converts `site.json` → `site.js` keeps building (used by the config and
`check-refs.js`). `deploy.sh:94` and `deploy-batch.mjs:134` still `require('./src/_data/site.json')` and die with
"could not read a valid url" on such a project. Fix: `node -e "…require('./scripts/site-data').loadSiteData().url…"`
in deploy.sh; `import { loadSiteData } from "./site-data.js"` (via `createRequire`, the helper is CJS) in the batch
script.

### N8 · `X-Robots-Tag` is `Header set`

Line 160 inside the same `<IfModule mod_headers.c>` whose comment (lines 124–127) explains why the other four headers
use `Header always set`: plain `set` misses Apache's own redirects and error responses. A staging site's 301s and
404s go out without `noindex`. One word: `Header always set X-Robots-Tag "noindex, nofollow"`.

### N9 · `v` filter and fragments

Verified: `{{ '/assets/img/favicon.svg#logo' | v }}` → `/assets/img/favicon.svg#logo?v=6d395a7e`. The filter
strips `?`/`#` to find the file (line 276) but appends to the original string (line 289), so the query lands inside
the fragment: the sprite symbol isn't found and the cache-bust never reaches the server. Fix: split once into
`[path, query, hash]`, append `?v=`/`&v=` to `path+query`, re-attach the hash. The comment documents the filter for
in-page images, where SVG sprites are common.

### N10 · Empty values printed as tags

- `head-meta.njk:134/154/290`: `og:image`, `twitter:image` and `BlogPosting.image` are unconditional. With
  `site.ogImage: ""` (and no page `ogImage`) every page carries `content=""`, which share debuggers report as an
  invalid image rather than "no image". Wrap in `{% if shareImg %}`.
- `sitemap.njk:42`: `<lastmod>` is printed even when `lastModified` returns `""` (a virtual template via
  `addTemplate`, or an unreadable `inputPath` — the filter's own comment anticipates this). `<lastmod></lastmod>`
  is an invalid date in Search Console. Wrap in `{% if lastmod %}`.

### N11 · Breadcrumbs ignore `navLabel`

`navbar.njk:112` and `offcanvas-menu.njk:88` label a collection page `navLabel or title`; the `breadcrumbs` filter
(`eleventy.config.js:424`) uses `entry.data.title` only. A page with a short `navLabel` shows one name in the menu
and another in the trail and in the `BreadcrumbList` JSON-LD. Use `entry.data.navLabel || entry.data.title`.

### N12 · "Your Name" gate on rendered HTML

`deploy.sh:166` and `deploy-batch.mjs:183` grep the built home page for the literal `Your Name`. A legitimate
`<label>Your Name</label>` on a contact form blocks every deploy with a message about `footer.copyrightName`, which
is already correct. Both scripts parse `site.json` a few lines earlier; test `footer.copyrightName === "Your Name"`
and `footer.copyrightUrl` there instead (keep the robots.txt / security.txt greps, those files are generated).

### N13 · Unpinned CDN scripts via `extraScripts`

`{ src: "https://…", cdn: true }` renders a `<script>` with no `integrity` and no warning (base.njk:251). Every
boilerplate-owned CDN asset is pinned; this is the one door left open for a derived site. Either document that
`cdn: true` requires `integrity` + `crossorigin`, or print an HTML comment / `console.warn` at build time when a
`cdn: true` entry lacks `integrity` (the `eleventy.before` warning pattern fits).

## 3. Known findings whose fix is incomplete

| Ref (2026-10-24) | What's still open |
|---|---|
| BLD-17 import versioning | Fixed for `.js`; `.mjs` not covered (N4). |
| TPL-19 / UX-16 legal noindex | Applied; no launch check (N3). |
| JS-19 site.js support | Config and `check-refs` use `site-data.js`; deploy paths don't (N7). |
| TPL-23 dropdown toggles `<a href="#" role="button">` | Theme trigger became a `<button>`; the nav dropdown toggles in `navbar.njk:90` still use the anchor pattern (middle-click opens a `#` tab). Nit. |

## 4. Diff-review findings rejected or corrected

The automated `/code-review` pass reported these; re-checking showed:

- **"`eleventy.after` throws ENOENT on `--dryrun` because the folder isn't created."** Wrong: `fs.mkdirSync(outJsDir,
  { recursive: true })` is on line 185. A real `--dryrun` exits 0. The actual nit is the opposite: the hook still
  **writes** `assets/js/bundle.js` during a dry run (observed in `_temp/build-fable-dryrun/`). Low; skip the hook when
  Eleventy's dry-run flag is set if that ever matters.
- **"`hostname` returns `""` for an unparsable URL, so the footer self-link guard hides typos."** Partly wrong: the
  filter returns its input unchanged for an invalid URL (`"not a url"` → `"not a url"`); only an empty string gives
  `""`. The real nit stands: `replace("www.", "")` is unanchored (`awww.no` → `ano`, verified with Nunjucks), and an
  empty `site.url` matches an empty link URL. Anchor it: `replace(r/^www\./, "")`.
- **"A protocol-relative `ogImage` also triggers the `v` filter's missing-file warning."** Wrong: the filter returns
  `//…` unchanged with no warning (its regex treats `//` as a full URL). The first half is right: head-meta.njk:86
  tests `indexOf("http") != 0`, so `//cdn.example/og.jpg` becomes `https://site.tld//cdn.example/og.jpg`. Use the
  same `/^([a-z]+:)?\/\//i` test the filter uses.

## 5. Small stuff

- `scripts/deploy-batch.mjs:313, 320`: leftover tracing (`console.error("files", files.length, "leak? YES-ABORT")`,
  `console.log("files", files.length, "leak? clean")`) duplicates the human lines above them. Delete.
- `src/_data/build.js:19`: `securityExpires` is build time + exactly one calendar year (366 days across a leap day).
  RFC 9116 recommends "less than a year"; validators warn at a year. Use +11 months or +364 days.
- `eleventy.config.js:334`: `git log --name-only` lists no files for merge commits, so a page last changed inside a
  conflict resolution keeps the pre-merge date in `<lastmod>`/`dateModified`. Add `-m --first-parent` if the blog
  ever merges branches.
- `scripts/check-js.js:56`: one `node --check` process per file; `new vm.Script(src, { filename })` in-process (as
  the bundle check already does) is the same parser with no process start-up. Matters once a site has dozens of page
  scripts on Windows.
- Four copies of a recursive `walk()` (check-refs, check-js, minify, deploy-batch) and two of `escapeRe`. N4 is a
  direct result of the copies drifting. One `scripts/lib/fs-walk.js` would do.
- `.vscode/tasks.json` is 2-space indented; `.editorconfig` says tabs for `[*]`. Also `scripts/minify.js` and
  `scripts/bump-version.js` (pre-existing style). Editors honouring `.editorconfig` will produce whitespace-only
  diffs.
- `head-assets.njk:182, 225`: the GA id goes through `dump | safe` inside `<script>` without the `</script>`
  escape JSON-LD got. Author-controlled, so a nit; the same `replace("<", "\\u003c")` would make the two consistent.

## 6. Side notes

- During this review two programmatic Eleventy runs wrote into `_site/` (Eleventy's config `dir.output` overrides the
  constructor's output argument). `_site/` was already a plain `eleventy` (unminified) build; it now holds the same
  kind of build with a newer `?v=` stamp. No tracked file changed (`git status` clean). Scratch output in
  `_temp/build-fable-*` and `_temp/fable-review/` was deleted.
