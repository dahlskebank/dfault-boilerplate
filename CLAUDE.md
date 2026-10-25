# CLAUDE.md

## This project

<!-- BOILERPLATE BLOCK: a derived site rewrites this section (what the site is, its domain, its quirks) and deletes this line. -->

**dfault boilerplate**: Daniel Dahl's Eleventy 3 + Bootstrap 5.3 starter. Every new site is a clone of it, detached from this
repo (README.md → "Starting a new site"). Fixes made in a derived site are ported back here by hand, so everything stays generic.

- Public repo (github.com/dahlskebank/dfault-boilerplate), branch `dfault`. Tracked files must never hold server users,
  server paths, credentials or client data.
- Local: Laragon serves `_site/` at `https://bp.test`. The boilerplate itself is never deployed.
- Features, every `site.json` switch, front matter, project layout: README.md. Deploy: docs/deploy.md.

## Commands

- Dev loop: `npm run watch` (`eleventy --watch`), then open the project's local domain. Laragon (Apache) serves `_site/`,
  so the generated `.htaccess` applies as on the live host. Don't point Daniel at `npm start` or localhost:8080.
- `npm run build`: lint:css → lint:js → clean (deletes `_site/`) → eleventy → html-validate → check:refs → minify.
  Any failure exits non-zero (stylelint uses 2). It rewrites `_site/`, so while another session is working, build into a scratch folder instead:
  `npx @11ty/eleventy --output=_temp/build-<name>`, then `npx html-validate "_temp/build-<name>/**/*.html"` and
  `node scripts/check-refs.js _temp/build-<name>`. Keep that folder inside the project: html-validate finds
  `.htmlvalidate.json` / `.htmlvalidateignore` from the checked files' folders, so a folder outside it is validated
  with the default rules (hundreds of false errors).
- Single checks: `npm run lint:css`, `npm run lint:js`, `npm run validate` (html-validate on `_site/`), `npm run check:refs`.
- `npm run bump:patch|minor|major`: bumps the footer version in site.json, plus package.json and package-lock.json.
- Deploy only when Daniel asks. `npm run deploy` = build + `deploy.sh` (lftp `mirror --delete` to production);
  `DRY_RUN=1 ./deploy.sh _site` previews it. lftp hangs in a shell without a terminal (Claude's): use the additive
  `npm run deploy:batch` (`node scripts/deploy-batch.mjs`) and its printed sftp command. See docs/deploy.md.

## Boilerplate conventions

- **High-contrast mode is custom and still in progress.** Don't edit `src/assets/css/high-contrast.css`, or change HC class
  names, logic or behaviour (film grain vs HC included), unless Daniel asks. Other changes must not break HC.
- **CDNs stay** (jsDelivr, cdnjs) with SRI. Versions, URLs and hashes live only in `src/_data/cdn.js`. Self-host a file
  only if we change its contents.
- **Educational comments.** Daniel is learning Eleventy: explain non-obvious Eleventy/Nunjucks/Apache/Bootstrap choices
  where they're made, in the style of the existing comment blocks. Keep comments true when the code changes.
- Bootstrap 5.3 idioms: component CSS variables (`--bs-navbar-*`, `--bs-btn-*` …), `data-bs-theme`, utilities. No Sass.
  Own classes and hooks start with `dd-`.
- `src/_data/site.json` is the one config file. A new switch gets a `_comment_<key>` beside it and a row in the README.
- Site-wide JS: one line in `SITE_WIDE_JS` (eleventy.config.js). Bundled scripts use `window.ddStore`, not `localStorage`.
- Tabs for indentation (.editorconfig). Prettier never formats `.njk` (many aren't HTML: `.htaccess`, robots.txt).

## Where files go

Top-level folders: `src/` (the only Eleventy input), `scripts/`, `docs/`, `tests/`, `archive/`, `_temp/`,
plus tool dirs (`.vscode/`, `.claude/`, `.superpowers/`). Create these when needed. Root files are config,
entry points, README.md, CLAUDE.md and LICENSE only. Ask before adding anything else to the root.

| What | Where |
|---|---|
| Scratch: downloads, unzipped exports, mockups, screenshots, test output, one-off scripts | `_temp/<topic>/` (ignored) |
| Deploy batch file and deploy logs | `_temp/deploy/` (ignored) |
| Brief: the ask, incl. incoming SPEC / `*-handoff.md` from Claude App or Claude Design | `docs/briefs/<topic>.md` (living) |
| Spec / design doc · implementation plan | `docs/superpowers/specs/…` · `docs/superpowers/plans/…` (superpowers defaults) |
| Review or audit | `docs/reviews/YYYY-MM-DD-<subject>.md` |
| Handoff to a later session (snapshot) · living explainer for another reader | `docs/handoffs/YYYY-MM-DD-<topic>.md` · `docs/handoffs/<subject>.md` |
| Living topic doc (deploy guide, how X works) | `docs/<topic>.md` |
| Design export (Claude Design `design_handoff_*`) | `docs/design/<export-name>/`, unchanged |
| Reference: third-party docs, API notes, client copy | `docs/reference/<source>/` |
| Script whose output is committed | `scripts/<verb-noun>.mjs` |
| Decisions · ideas | `docs/decisions.md` (`## YYYY-MM-DD — decision`, newest first) · `docs/ideas.md` |

- Never put docs, plans or scratch inside `src/`: Eleventy builds and publishes almost everything there.
- `_temp/` is disposable. Project-wide Grep/Glob skip it (it's gitignored), so name the path to search it.
  Before a tracked file cites something in `_temp/`, move that thing into `docs/`.
- Move incoming files; don't copy them.
- `docs/` is pushed with the repo. If `git remote -v` points at a public repo, never write server users,
  server paths, credentials or customer data into `docs/`; keep such material in `_temp/` (ignored).
- Orientation for a new session belongs in this file, not in a HANDOFF.md.
- A finished review is saved in `docs/reviews/` (or in the ignored `_temp/reviews/` when it holds material that must not be public); memory may point to it but never replaces it.
- Backups, runtime data and heavy binary masters live outside the project in `.data/<project>/` beside the project folders (on Daniel's machine: `E:/www/.data/<project>/`; see README → Runtime data).
