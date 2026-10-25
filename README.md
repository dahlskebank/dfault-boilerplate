# Eleventy + Bootstrap 5 Boilerplate

A production-ready static site boilerplate built with [Eleventy 3](https://www.11ty.dev/) and [Bootstrap 5.3](https://getbootstrap.com/). Designed for 5-10 page websites with dark mode, theme switching, SEO, accessibility, and Apache hosting out of the box. Every file explains what it does and why, so the boilerplate doubles as an Eleventy learning project.

## Quick start

```bash
git clone https://github.com/dahlskebank/dfault-boilerplate.git mysite
cd mysite
npm install
npm run build        # full build into _site/, every check included
```

Needs Node.js `^22.22.0 || >=24.8.0`. On Linux or macOS, run `export NPM_CONFIG_SCRIPT_SHELL=/bin/bash` first: `.npmrc` points npm at Git for Windows' bash ([Requirements](#requirements)). Serve `_site/` with Apache (Laragon locally), or run `npm start` for Eleventy's own dev server. To turn the clone into a real site, follow [Starting a new site](#starting-a-new-site).

## Starting a new site

There is one way to start a site: **clone, then detach.** A clone brings only what git tracks. `node_modules/`, `_site/`, `.env`, `_temp/` scratch and `.claude/` permissions all stay behind. A folder copy brings all of them along, and its `.git` folder still points at this public repo, so one VS Code "Sync" would publish the new site's history to the boilerplate.

1. **Clone** (`mysite.no` = the new project folder):
   ```bash
   git clone https://github.com/dahlskebank/dfault-boilerplate.git mysite.no
   cd mysite.no
   ```
   Cloning a local copy works too (on Daniel's machine: `git clone e:/www/dev/__boilerplate mysite.no`). It brings committed work only, including commits that aren't pushed yet.
2. **Detach from the boilerplate remote.** This is reversible, and fetching still works, so you can compare with the boilerplate later or pick up a fix from it:
   ```bash
   git remote rename origin boilerplate
   git remote set-url --push boilerplate DISABLED
   git branch --unset-upstream dfault   # repeat for each branch tracking boilerplate/…
   git remote -v                        # the (push) line must say DISABLED
   ```
   `git remote rename` carries each branch's upstream over to the renamed remote (`git branch -vv` lists them). Without `--unset-upstream`, a VS Code Sync or `git pull` would still merge boilerplate commits into the new site (only the push would fail). Add the site's own repo as `origin` whenever it gets one. Undo: `git remote set-url --push boilerplate https://github.com/dahlskebank/dfault-boilerplate.git` and `git branch -u boilerplate/dfault`.
3. **Rename the package.** In `package.json`, set `"name"` (e.g. `"mysite-no"`) and `"version": "0.1.0"`. Then run `npm install`, which also writes the new name and version into `package-lock.json`.
4. **Fill in `src/_data/site.json`** (all keys: [site.json reference](#sitejson-reference)):
   - `version` → `"v0.1.0"`.
   - The placeholders: `name`, `url` (no trailing slash), `description`, `lang` / `locale`, `security.contact`, `footer.copyrightName` / `copyrightUrl`, `ogImage` / `ogImageAlt`, and `publisher` for a client or company site. Every build prints a `[site.json] Placeholder/stale values` warning while `name`, `url`, `description`, `security.contact` or the footer copyright still hold template values (`lang`, `ogImage` and `publisher` aren't checked), and `deploy.sh` refuses to deploy while `url` is still `example.com`.
   - `demoPages` and `bootswatchSwitcher` → `false`. Do it now, or at the latest before launch if you still want the switcher while you choose a theme.
5. **New Peacock colour:** change `"peacock.color"` in `.vscode/settings.json` (or run *Peacock: Change to a Favorite Color*), so the window no longer looks like the template.
6. **CLAUDE.md:** rewrite the `## This project` block for the new site and delete its marker line. Keep the rest.
7. **Deploy config:** copy `.env.example` to `.env` and fill it in (see [docs/deploy.md](docs/deploy.md#setup-checklist-for-a-new-project-derived-from-this-boilerplate)).
8. **Local Apache (Daniel: Laragon):** add a vhost whose DocumentRoot is the new project's `_site/`, and a hosts-file line for the domain. Then `npm run watch` and open the site at that domain.
9. **Replace the placeholder content:** the [favicon set and share image](#favicons-and-share-image), the legal text in `src/legal.njk` (then set `legalPlaceholder: false`, which also lifts its noindex), and the home, about and showcase copy.
10. **First commit** of the new site. From here on, bump versions with `npm run bump:patch|minor|major`.

**Don't copy `.claude/`** from the boilerplate or from another project. Its `settings.local.json` holds approvals granted once for unrelated tasks (`npm run *`, for example, which includes `npm run deploy`). Let each project collect its own. A clone never brings it, because `.claude/` is gitignored.

## Features

- **Eleventy 3** — Fast static site generator with Nunjucks templates
- **Bootstrap 5.3.8 + Bootstrap Icons 1.13.1** — loaded from jsDelivr with SRI. Versions, URLs and hashes live in one file, `src/_data/cdn.js`
- **26 Bootswatch themes** — a dev-tool switcher in a collapsible list in the offcanvas menu, generated from `cdn.js`. The saved theme is applied before first paint. Light, Dark and Auto work on every theme, like the toggle on bootswatch.com; on themes designed dark (cyborg, darkly, quartz, slate, solar, superhero, vapor) Light is the designed look and Dark the theme's alternative dark palette
- **Theme picker** — Dark, Light, Auto (follows the OS) and 3 high-contrast modes, as toggle buttons with `aria-pressed`. The choice is saved in localStorage and applied before any CSS loads, so nothing flashes
- **Flat mode** — square corners and no shadows, with its own focus ring (`flatToggle` switch)
- **SEO** — title and description, canonical, Open Graph, X card, one JSON-LD `@graph` per page (Person, WebSite, the page node, BlogPosting, BreadcrumbList), sitemap.xml with git-based `<lastmod>`, robots.txt, security.txt, humans.txt
- **AI crawlers and LLMs** — robots.txt AI policy (`aiPolicy`; all crawlers allowed by default, training included) and a generated `/llms.txt`
- **Staging switch** — `noindexSite` keeps a whole site out of search engines
- **Accessibility** — skip link, ARIA labels, semantic HTML, visible focus rings, high-contrast modes, print styles
- **PWA installable** — webmanifest with `id`/`start_url` and 192 + 512 + 512 maskable icons (no service worker yet)
- **PhotoSwipe lightbox** — loads only on pages that have a gallery
- **Apache hardened** — .htaccess with HTTPS redirect, security headers, gzip, caching, and a staged HSTS block (commented out until HTTPS is verified)
- **Build gates** — stylelint, JS syntax check, html-validate, a local reference checker and the minifier. Any failure stops the build, and with it `npm run deploy`
- **Cache busting** — Automatic `?v=timestamp` on CSS/JS assets
- **Cookie toast** — informational by default. `gaConsent: "required"` turns it into an opt-in (Accept / Decline) that gates Google Analytics
- **Google Analytics** — Configurable via site.json (disabled by default)
- **SFTP deploy** — `deploy.sh` (lftp `mirror --delete`) with target checks and a list of remote-only files it never touches
- **Educational comments** — Every file explains what it does and why

## Requirements

- **Node.js `^22.22.0 || >=24.8.0`** (`engines` in package.json; html-validate 11 needs it).
- **Windows: Git for Windows in its default folder.** `.npmrc` runs every npm script in Git Bash (`script-shell`). On Linux, macOS or a CI host, see [Other hosts](#other-hosts-netlify-vercel-ci).
- **Laragon** (or any Apache) serving `_site/` at the project's local domain.
- **lftp** for `npm run deploy` (`choco install lftp -y`).

package.json is `"private": true`, so npm refuses to publish the project to the npm registry by accident.

## Daily workflow

```bash
npm install          # once per clone
npm run watch        # eleventy --watch: rebuilds _site/ on every save
```

Laragon serves `_site/` at the project's own local domain (the boilerplate itself: `bp.test`). Pages go through Apache and the generated `.htaccess`, just like on the live host. `--watch` doesn't reload the browser for you; reload after a save.

`npm start` (`eleventy --serve`) is optional: Eleventy's own dev server on localhost, with live reload. It has no Apache, so `.htaccess` rules (redirects, headers, error pages) don't apply there.

Run `npm run build` before a deploy, or whenever you want every check at once. It deletes `_site/` first, so Laragon answers 404 for a second or two while it runs.

## npm scripts

| Script | What it does |
|--------|--------------|
| `npm run watch` | `eleventy --watch`: rebuild on every save (the dev loop) |
| `npm start` | `eleventy --serve`: Eleventy's dev server on localhost (optional) |
| `npm run build` | The full production build: lint:css → lint:js → clean → eleventy → html-validate → check:refs → minify |
| `npm run clean` | Deletes `_site/` (`scripts/clean.js`). Optional folder argument; it refuses the project root, its parents and `src/` |
| `npm run lint:css` | stylelint on `src/assets/css/*.css` |
| `npm run lint:js` | `node --check` on every `.js`/`.mjs` in `src/assets/js/` (`scripts/check-js.js`) |
| `npm run validate` | html-validate on `_site/**/*.html` (no rebuild, no minify) |
| `npm run check:refs` | Local reference checker on `_site/` (`scripts/check-refs.js`; optional folder argument) |
| `npm run deploy` | `npm run build`, then `./deploy.sh _site` ([Deployment](#deployment)) |
| `npm run deploy:batch` | Additive sftp batch for shells without a terminal (`scripts/deploy-batch.mjs`) |
| `npm run bump:patch` / `bump:minor` / `bump:major` | Bumps site.json `version` (shown in the footer) and keeps package.json and package-lock.json in step |

## Build pipeline

`npm run build` runs lint:css → lint:js → clean → eleventy → html-validate → check:refs → minify. Every step exits non-zero on failure, which stops the build, and `npm run deploy` with it. The build fails on:

- a CSS parse error (stylelint);
- a JS syntax error, first per file (`lint:js`), then in the finished `bundle.js`, which Eleventy parses with Node's `vm` module (`--watch` only logs that one);
- an html-validate error;
- a local file that is missing or has the wrong upper/lower case (`check:refs`);
- a minify failure (the error names the file, line and column).

**Placeholder warning:** every build prints a warn-only `[site.json] Placeholder/stale values` list (template `url`, `name`, `description`, "Your Name", `example.com` / `yoursite.com` in `security.contact`, `author.url` or `footer.copyrightUrl`, a trailing slash on `url`, a `security.expires` date that has passed or is close). In the boilerplate itself these are expected; on a real site, clear them.

**Reference checker** (`scripts/check-refs.js`): every local `href`, `src`, `srcset` and `poster`, every URL on `site.url` (canonical, og:image, JSON-LD, sitemap, robots.txt, security.txt, llms.txt), CSS `url()` and `@import`, the webmanifest icons and the `.htaccess` ErrorDocument targets must point at a file in `_site/` with exactly the same upper/lower case. Windows doesn't care about case; the Linux web host does. The webmanifest must also be valid JSON. Paths that exist only on the server go in `IGNORE_PREFIXES` at the top of the script.

The minifier walks `_site/assets/`, compresses `.css` with clean-css and `.js` / `.mjs` with terser, skipping files already named `.min.*`. A file with `import`/`export` or top-level `await` is retried in terser's ES-module mode.

**JS bundling:** the site-wide scripts stay as separate source files in `src/assets/js/`, but every build concatenates them into a single `_site/assets/js/bundle.js` — one HTTP request per page. The list of bundled files is `SITE_WIDE_JS` at the top of `eleventy.config.js`; to add a site-wide script, add one line there (some entries are bundled only while a site.json switch is on). The files share one scope once glued together, so bundled scripts read and write localStorage through `window.ddStore`, which never throws, and change the theme through `window.ddTheme` (both from `theme-init.njk`). Page-specific scripts loaded via `extraScripts:` frontmatter are not bundled.

**PhotoSwipe** (the image lightbox, ~21 KB over the wire) loads only on pages whose content contains an item with the `dd-pswp` class, or that set `gallery: true` in front matter. The markup contract is at the top of `src/assets/js/dd-lightbox.js`. Migrating an older site: gallery links without the class (the old `children: "a"` setup, e.g. reservedekk.no's contact sheet) silently lose the lightbox. Add `class="dd-pswp"` to every gallery `<a>`, or set `gallery: true` and call `ddLightbox({ gallery: "…", children: "a" })` yourself.

The HTML validator runs against `_site/**/*.html` after Eleventy renders and before minification, so any markup errors fail the build before the output gets compressed. Configuration lives in `.htmlvalidate.json`; `.htmlvalidateignore` skips `/cheatsheet/`, because its Bootstrap demo markup, copied as-is, trips some a11y rules. To bypass temporarily during a migration, remove the `html-validate` step from the `build` script in `package.json`.

The CSS linter runs *before* Eleventy, so a broken stylesheet fails fast: `stylelint` checks `src/assets/css/*.css` against `stylelint-config-recommended` — possible errors only (parse errors, duplicate selectors, unknown properties and units), not formatting, which is Prettier's job. A parse error fails the build instead of shipping silently. Configuration lives in `stylelint.config.mjs` (`no-descending-specificity` is off there — it false-positives on the deliberately last-ordered theme overrides); `.stylelintignore` keeps the minified `_site/` output (and `_temp/`, `docs/`, `archive/`) out of it. In particular, never write `*/` inside a CSS comment — a path glob like `/order/*/` closes the comment early and silently kills every rule below it until the next `*/`.

**Prettier** never formats `.njk` files (`.prettierignore`): many of them aren't HTML at all (`.htaccess`, robots.txt), and the HTML parser would wreck them. It skips `.md` files too: README, CLAUDE.md and `docs/` are hand-formatted, and Prettier would re-indent lists, turn `*italic*` into `_italic_` and re-pad every table (`.vscode/settings.json` also turns Markdown format-on-save off). It uses tabs, width 4, like `.editorconfig`.

**Notes inside `src/`:** Eleventy builds and publishes almost everything in `src/`. Folders starting with `_` are NOT skipped by default (that's a Jekyll rule). As a safety net, `eleventy.config.js` ignores `src/**/_temp/**`, `src/**/_tmp/**`, `src/**/_notes/**` and `src/**/README.md`, and neither README.md files nor anything whose name starts with `_` (a folder like `img/_originals/`, a file like `_notes.txt`) is copied out of `src/assets/`. But scratch, plans and notes belong in `/_temp` and `/docs` at the project root (see "Where files go" in CLAUDE.md).

## Customization

### site.json reference

`src/_data/site.json` is the single source of truth for the whole site; every value is available in templates as `{{ site.xxx }}`. The `_comment_…` entries in the file explain each group of keys in more detail.

**Identity**

| Key | Default | Purpose |
|-----|---------|---------|
| `name` | `"My Site"` | Site name: navbar, footer, `<title>`, manifest |
| `url` | `"https://example.com"` | Production URL, **no trailing slash**: canonical, og:url, sitemap, robots.txt, JSON-LD. `deploy.sh` refuses to deploy while it is still `example.com` |
| `description` | template text | Default meta description |
| `lang` | `"en"` | BCP 47 tag with a hyphen (`nb`, `nb-NO`): `<html lang>`, JSON-LD `inLanguage`, manifest, humans.txt |
| `locale` | `"en_US"` | `og:locale`, language_TERRITORY with an underscore (`nb_NO`). A page can set its own `locale:` |
| `alternateName` | `[]` | Other names for Google's site-name display (an acronym, the domain). Home page WebSite JSON-LD only |
| `version` | the boilerplate's own (a new site starts at `"v0.1.0"`) | Shown in the footer. Change it with `npm run bump:*` |

**People**

| Key | Default | Purpose |
|-----|---------|---------|
| `author` | Daniel Dahl | Who **built** the website, on every site, also when the site is about someone else (credit the subject in the page content). `name`, `url` (`https://danieldahl.com`), `id` (`https://danieldahl.com/#person`, the stable JSON-LD `@id` shared by every site) and `sameAs` (Daniel's site network). Used by `<meta name="author">`, humans.txt, llms.txt, the JSON-LD Person and `article:author` |
| `publisher` | empty | Who **owns** the site, for JSON-LD. `id: ""` = the author is the publisher (no extra node). For a client or company: `type: "Organization"`, its own `id`, `name`, `url`, `logo` (square, at least 112x112) and `sameAs`. A `Person` publisher uses `image` instead (`logo` is only valid on an Organization) |
| `footer` | placeholders | `copyrightName` / `copyrightUrl` (still `"Your Name"` / `"https://yoursite.com"`), `startYear`, and `links`: the network links, any number, shown in pairs on mobile. A link whose host matches `site.url` renders as plain text, so a hub site never links to itself |

**Search engines and AI**

| Key | Default | Purpose |
|-----|---------|---------|
| `robots` | `"index, follow, max-image-preview:large"` | Default `<meta name="robots">`; a page's own `robots:` replaces it. Any value containing `noindex` also keeps the page out of sitemap.xml and llms.txt |
| `noindexSite` | `false` | Staging/private switch: `noindex, nofollow` on every page (meta tag + `X-Robots-Tag` header from .htaccess), empty sitemap, no llms.txt. robots.txt keeps crawling **allowed** on purpose: a blocked crawler never sees the noindex |
| `aiPolicy` | all `true` | robots.txt AI policy: `train` (GPTBot, ClaudeBot, Google-Extended …), `search` (OAI-SearchBot, PerplexityBot …), `userFetch` (ChatGPT-User, Claude-User …), `contentSignal` (prints Cloudflare's `Content-Signal` line). `false` blocks that category. Bot names live in `src/_data/aiBots.js`. Googlebot, Bingbot, Applebot and facebookexternalhit are never blocked. `Google-Extended` also controls Gemini-app grounding |
| `llmsTxt` | `true` | Builds `/llms.txt` (`src/llms.njk`, [llmstxt.org](https://llmstxt.org) format). `false` = not built |
| `security` | contact placeholder | `/.well-known/security.txt` (RFC 9116). `contact` is required. `expires: ""` = build date + 1 year, recomputed every build (`src/_data/build.js`); a fixed ISO date makes the file go stale as a reminder. Optional: `preferredLanguages` (default `"en, no"`) and `policy` (a URL; `""` = line left out) |

**Sharing and appearance**

| Key | Default | Purpose |
|-----|---------|---------|
| `themeColor` | `"#0d6efd"` | `<meta name="theme-color">` and the manifest's `theme_color`. Matches the `bg-primary` navbar: change both together |
| `ogImage` | `/assets/img/og-image.jpg` | Site-wide share image, 1200x630, under ~300 KB. Its URL gets `?v=` plus a hash of the file's content (the `v` filter in eleventy.config.js), so share caches, which key on the URL, see a new picture as new |
| `ogImageAlt` / `ogImageWidth` / `ogImageHeight` / `ogImageType` | the shipped image | Describe the share image (the picture, not the page) and must match the real file. A page with its own `ogImage` sets these in front matter |
| `social` | `{ "x": "", "fediverse": "" }` | `twitter:site` (handle without @) and `fediverse:creator` (`@user@instance`). `""` = tag left out |
| `webmanifest` | `name`/`shortName` `""` | PWA manifest. `""` = use `site.name`. `backgroundColor` = splash screen. `theme_color` comes from `themeColor` (an optional `webmanifest.themeColor` overrides it) |
| `defaultBootswatchTheme` | `"default"` | `"default"` = plain Bootstrap, or a Bootswatch theme name from `cdn.js` |
| `googleFontsUrl` | `""` | Google Fonts stylesheet URL. `""` = the theme's own fonts |
| `fontOverride` | `false` | `true` adds `.dd-font-override` to `<html>`, which switches on the custom font stack in style.css §1.0. Set it together with `googleFontsUrl`. A missing key counts as `false` |
| `navbar` | `{ "bg": "bg-primary", "theme": "dark" }` | The navbar's background utility and its own `data-bs-theme`. For a light-primary Bootswatch theme where white text fails, use `{ "bg": "bg-body-tertiary", "theme": "light" }` or `bg-dark`. A missing key gets the default |

**Features and dev tools**

| Key | Default | Purpose |
|-----|---------|---------|
| `gaId` | `""` | Google Analytics measurement ID. `""` = off |
| `gaConsent` | `"implied"` | Only matters when `gaId` is set. `"implied"`: GA loads at once and the cookie toast only informs. `"required"`: opt-in, GA loads only after Accept (Accept / Decline, no X); Decline after an earlier Accept switches GA off and deletes the `_ga` cookies. For Norwegian/EU visitors, `"required"` is the safe choice |
| `flatToggle` | `true` | The Flat mode button and its JS. `false` hides the button, leaves `flat-toggle.js` out of the bundle, and ignores a visitor's saved Flat choice. A missing key counts as `true` |
| `bootswatchSwitcher` | `true` | Dev tool: the Bootswatch picker in the offcanvas menu (and its JS). Set to `false` on a derived site |
| `demoPages` | `true` | Demo pages (today `/cheatsheet/`) and the nav.js items marked `demo: true`. `false` = the pages aren't built and the nav items are hidden. Set to `false` on a derived site |

### Navigation

Edit `src/_data/nav.js` to add, remove, or reorder menu items. Item keys: `label`, `url`, `icon` (a Bootstrap Icons class, with or without the `bi ` prefix), `external`, `disabled` (rendered without an `href`, with `aria-disabled`), `demo` and `children` (makes a dropdown). Instead of `children`, `dynamicChildren` names an Eleventy collection whose pages become the dropdown items (labelled by their `navLabel` or `title` front matter); `indexLabel` renames the parent's "All …" link, and a child's `group` draws a divider where the group changes. Details at the top of `src/_data/nav.js`. The current page is underlined; on a sub-page its parent item is marked active with `aria-current="true"`. The offcanvas menu (opens from the right) lists the same items.

### Pages and front matter

Create new `.njk` files in `src/`. Use this template:

```njk
---
layout: base.njk
title: My New Page
description: One sentence for search results and share cards.
mainClass: pb-5 mt-0 mt-md-4
---

<h1>My New Page</h1>
<p>Your content here.</p>
```

Don't forget to add the page to `src/_data/nav.js` for navigation.

Optional front matter, documented at the top of the file that reads it:

- **Layout** (`src/_includes/base.njk`): `bodyClass` (default `d-flex flex-column`; a page's value replaces the default, so keep those two classes if the footer should still sit at the bottom of short pages), `mainClass` (default none), `containerClass` (default `container`), `cover: true` (content centred vertically between navbar and footer, used by the home page; good for splash pages like 404/403), `extraCss`, `extraScripts`, `gallery: true` (load PhotoSwipe).
- **Meta and structured data** (`src/_includes/head-meta.njk`): `title`, `description`, `robots`, `locale`, `ogImage` + `ogImageAlt` / `ogImageWidth` / `ogImageHeight` / `ogImageType`, `ogType: article` (blog post; set `date:` too), `schemaType` (e.g. `ProfilePage`), `lastmod` (a quoted date), `jsonLd` (extra schema.org nodes), `breadcrumbSchema: false`.
- **llms.txt:** `llms: false` leaves the page out.

Inner pages get the title `Page | Site`; the home page gets `Site – Description`. Pages two levels deep (`/section/page/`) can show a breadcrumb trail: put `{% include "breadcrumb.njk" %}` in the page. Only a page that shows the trail also gets a BreadcrumbList node in its JSON-LD (Google: no markup for content that isn't visible); `breadcrumbSchema: false` leaves the node out anyway.

### Favicons and share image

The boilerplate ships a working placeholder set (a dfault floppy disk). Replace every file for a real site and keep the names. [RealFaviconGenerator](https://realfavicongenerator.net/) produces exactly this set; test the maskable icon at [maskable.app](https://maskable.app/).

| File | Used for |
|------|----------|
| `src/favicon.ico` | `/favicon.ico`, 48/32/16 px in one file |
| `src/assets/img/favicon-96x96.png` | PNG tab icon; the one Google Search uses |
| `src/assets/img/favicon.svg` | Crisp tab icon in modern browsers |
| `src/assets/img/apple-touch-icon.png` | 180x180 home-screen icon |
| `src/assets/img/web-app-manifest-192x192.png`, `-512x512.png` | Manifest icons (`any`) |
| `src/assets/img/web-app-manifest-512x512-maskable.png` | Manifest icon (`maskable`, keep the logo inside the safe zone) |
| `src/assets/img/og-image.jpg` | Share image (1200x630). Update `ogImageAlt` and the size keys in site.json with it |

### Styles

Edit `src/assets/css/style.css`. The file is organized in numbered sections with a table of contents at the top. Where Bootstrap exposes a component token (`--bs-navbar-*`, `--bs-btn-*` …) it sets the token, not the property, so Bootswatch themes keep working. Hooks you can use in pages:

- `--dd-navbar-offset`: clearance for things outside the page flow — `scroll-padding-top` (anchor jumps) and the cheatsheet's sticky TOC. The navbar itself is `sticky-top`, so page content needs no offset; 5rem covers the tallest Bootswatch navbar (Lux).
- `.dd-prose`: a 70ch reading column (add `mx-auto` to centre it).
- `.dd-btn-ghost`: a quiet outline button driven by theme tokens (use with `.btn`).
- `.dd-skip-link`, `.dd-copy-tip`: the skip link and the copy-button feedback tooltips.

Buttons: `btn-primary` / `btn-outline-primary` for main actions, `btn-success` only for confirmations. Print styles are in §9.0 (navbar, offcanvas, toast and skip link hidden; a dark-mode page prints light). Custom fonts: set `googleFontsUrl` and `fontOverride: true` in site.json, then put your font first in the stack in §1.0.

`flat.css` holds Flat mode. `high-contrast.css` holds the three HC modes; they are custom and still in progress.

### CDN versions

`src/_data/cdn.js` is the only place for CDN versions, URLs and SRI hashes: Bootstrap (CSS and JS bundle), Bootstrap Icons, PhotoSwipe and all 26 Bootswatch themes. To bump a version, change its constant and recompute the hash of every file of that package. A stale hash makes the browser **block** the file.

```bash
curl -s <url> | openssl dgst -sha384 -binary | openssl base64 -A
```

Prefix the result with `sha384-`. Bootstrap and Bootswatch must stay on the same version and change together. After a Bootswatch bump, also re-check the two name lists in `cdn.js`: `darkPalette` (themes designed dark; the print styles read it) and `noGoogleFonts` (themes whose CSS doesn't `@import` Google Fonts; legal.njk's Google Fonts disclosure reads it).

### Cookie toast and legal page

The toast's copy depends on `site.gaId` and `gaConsent` and says what the site really does: no cookies of its own, the theme choice saved in localStorage, files from public CDNs. Keep it (base.njk) in sync with `src/legal.njk`, whose Cookie Policy and "Third-party services" sections are generated from site.json (`gaId`, `gaConsent`, `flatToggle`, `bootswatchSwitcher`, `defaultBootswatchTheme`, `googleFontsUrl`) and from `bootswatch.noGoogleFonts` in `cdn.js` (jsDelivr, cdnjs, Google Fonts, GA, host logs). Any element with `data-dd-cookie-settings` re-opens the toast; with `gaConsent: "required"` the Cookie Policy shows one ("Change my cookie choice").

`legal.njk` ships with `legalPlaceholder: true`. While it is set, the page is noindex (and out of sitemap.xml and llms.txt; `robots` follows the switch through `eleventyComputed` in its front matter), a reminder box shows under `eleventy --watch` only, and the built page carries an HTML comment that `deploy.sh` and `deploy:batch` refuse to upload. Once the text is real (or the satire is kept on purpose), set it to `false`.

localStorage keys the site uses: `theme`, `flat`, `bootswatchTheme`, `cookieConsent`, and `analyticsConsent` (only with `gaConsent: "required"`).

## Directory structure

```
<project>/
├── CLAUDE.md               Claude Code instructions: this project, commands, "Where files go"
├── README.md  LICENSE
├── package.json  package-lock.json
├── eleventy.config.js      Eleventy config: filters, JS bundle (SITE_WIDE_JS), ignores, placeholder warning
├── stylelint.config.mjs
├── deploy.sh               SFTP deploy (lftp mirror --delete), see docs/deploy.md
├── .editorconfig  .gitignore  .npmrc  .prettierrc.json  .prettierignore
│   .stylelintignore  .htmlvalidate.json  .htmlvalidateignore  .env.example
├── .env                    deploy settings (ignored; copied from .env.example)
├── .vscode/                settings.json (Peacock colour), tasks.json (Deploy task)
├── .claude/                Claude Code's own settings (ignored; never copy it to a new site)
├── src/                    the ONLY Eleventy input, built into _site/ (tree below)
├── scripts/
│   ├── bump-version.js     npm run bump:*
│   ├── check-js.js         npm run lint:js
│   ├── check-refs.js       npm run check:refs
│   ├── clean.js            npm run clean
│   ├── deploy-batch.mjs    npm run deploy:batch (additive sftp batch)
│   ├── minify.js           last step of npm run build
│   └── site-data.js        reads site.json (or site.js) for eleventy.config.js, check-refs.js and both deploy paths
├── docs/                   docs written to be read later (pushed with the repo)
│   └── deploy.md           deploy setup, safety notes, troubleshooting
├── _temp/                  disposable scratch (ignored, except _temp/README.md)
└── _site/  node_modules/   build output and dependencies (ignored)
```

Everything above is tracked in git except `.env`, `.claude/`, `_site/`, `node_modules/` and the contents of `_temp/`. `.gitignore` also ignores `.superpowers/`, `.worktrees/`, `CLAUDE.local.md`, `deploy.batch` and `*.log`. Folders such as `docs/briefs/`, `docs/reviews/`, `tests/` and `archive/` are created when needed; the table in CLAUDE.md says what goes where.

```
src/
├── _data/                  Global data, available in every template
│   ├── site.json           Master config — edit this first
│   ├── nav.js              Navigation menu structure
│   ├── themes.js           Theme list (dark/light/auto/HC), the one source for the pickers
│   ├── cdn.js              CDN versions, URLs and SRI hashes
│   ├── aiBots.js           AI crawler names for robots.txt
│   └── build.js            Build-time values (the ?v= cache-bust stamp, security.txt Expires)
├── _includes/              Layouts and partials (never built as pages)
│   ├── base.njk            Master layout (wraps all pages)
│   ├── head-meta.njk       SEO, Open Graph and JSON-LD
│   ├── theme-init.njk      Inline script: applies the saved theme before CSS loads
│   ├── head-assets.njk     CSS, fonts, favicons, analytics
│   ├── navbar.njk          Top navigation bar
│   ├── offcanvas-menu.njk  Slide-out menu
│   ├── breadcrumb.njk      Breadcrumb trail for depth-2 pages (a page includes it)
│   ├── footer.njk          Page footer
│   ├── theme-toggle.njk    Dark/light/auto/HC theme dropdown (navbar)
│   ├── theme-toggle-offcanvas.njk   The same picker in the offcanvas menu
│   ├── flat-toggle-offcanvas.njk    Flat mode button
│   ├── bootswatch-switcher.njk      26-theme collapsible switcher (dev tool)
│   └── hc-svg-filters.njk  SVG filters used by the high-contrast modes
├── assets/
│   ├── css/                style.css (your styles), flat.css, high-contrast.css
│   ├── js/                 JS sources — site-wide files are bundled at build time
│   └── img/                Images, favicons, OG image
├── index.njk               Home page
├── about.njk               About page
├── showcase.njk            Component showcase page
├── cheatsheet.njk          Every Bootstrap component on one page (demo page)
├── legal.njk               Privacy, cookies, terms
├── 404.njk                 Error page
├── 403.njk                 Forbidden page
├── robots.njk              robots.txt generator
├── sitemap.njk             sitemap.xml generator
├── llms.njk                llms.txt generator
├── htaccess.njk            .htaccess generator
├── security.txt.njk        /.well-known/security.txt
├── site.webmanifest.njk    PWA manifest
├── humans.njk              humans.txt
└── favicon.ico             copied to /favicon.ico
```

## Runtime data — `.data/<project>/` convention

If a project ever needs to persist data (SQLite databases, user-uploaded files, generated reports, application logs, runtime caches) that must survive both local `_site/` rebuilds AND `lftp mirror --delete` deploys, **don't** put it inside the project tree. Park it at the workspace/home root, parallel to your project folders:

```
LOCAL                           PROD (Domeneshop, etc.)
E:\www\                         /home/<user>/
├── .data\                      ├── .data/
│   ├── <project-1>\            │   ├── <project-1>/
│   └── <project-2>\            │   └── <project-2>/
└── sub\                        └── <subdomains>/
    └── <project>\                  └── <project>/   ← docroot
```

PHP / Node references the absolute path through a per-environment, gitignored `src/_config/paths.php`. That file lives only on the server, so `mirror --delete` would remove it: `deploy.sh`'s `EXCLUDES` list protects remote-only files like it. `_config/paths.php` ships there as a commented-out `EXCLUDES+=` line; switch it on in the project that needs it (see [docs/deploy.md](docs/deploy.md#remote-only-files-excludes)). Prod values are then set once and never overwritten.

**Mental test for what belongs in `.data/`:**

> "If I `rm -rf` the project tomorrow, do I want this back?" → yes → `.data/`
>
> "If I deploy with `--delete` tomorrow, must this survive?" → yes → `.data/`

**What does NOT belong:**

- Source code, build output (`_site/`)
- Public assets (must be web-accessible)
- Apache `.htpasswd` files (Apache reads them at request time, not your project)
- `.env` for `deploy.sh` (used at deploy time, not runtime)
- SSH keys (their own concern)

The boilerplate doesn't ship code for this — most static sites don't need it. The first dynamic project (e.g. one with a SQLite-backed admin) introduces the pattern; subsequent projects copy it.

## Deployment

One-command deploy via SFTP key auth + `lftp mirror --delete`. See [docs/deploy.md](docs/deploy.md) for full setup and safety notes.

Quick version, after SSH key + `.env` are set up:

```bash
npm run deploy                # build + sync _site/ to remote
DRY_RUN=1 ./deploy.sh _site   # preview only, no changes
```

Before lftp runs (dry-runs included), `deploy.sh` refuses:

- an empty build: `_site/index.html` is missing (catches the "empty build wipes the live site" disaster);
- a `site.json` `url` that is still `example.com`;
- a `DEPLOY_REMOTE` whose last folder is neither the site's host nor its first label (`/…/mysite.no` for `https://mysite.no`, `/…/app` for `https://app.example.com`). Override with `DEPLOY_ALLOW_PATH_MISMATCH=1` in `.env` when the docroot really has another name;
- a `DEPLOY_REMOTE` with a trailing `/`, `//`, `~`, `.` or `..`, or an absolute path fewer than 3 folders deep (an account root, not a site folder);
- built files that still hold template values: `example.com` / `yoursite.com` in robots.txt or security.txt, a security.txt `Expires` under 30 days away, `footer.copyrightName` / `copyrightUrl` still the template values in `site.json`, or the legal page still marked `legalPlaceholder: true` ([details](docs/deploy.md#target-checks)).

`.env` may only hold the six `DEPLOY_*` keys from `.env.example`; any other line is skipped with a warning. Files on the `EXCLUDES` list in `deploy.sh` (`.htpasswd*`, `google*.html`, `BingSiteAuth.xml`, `.well-known/acme-challenge/*`) are neither uploaded nor deleted. The concurrency guard only works where `flock` exists (Linux, WSL); Git for Windows doesn't ship it, so in Git Bash the guard is skipped.

In a shell without a terminal (Claude Code's, for one) lftp hangs. There, `npm run deploy:batch` writes an **additive** sftp batch to `_temp/deploy/deploy.batch` (it never deletes) from the same exclude list. Use it only when the script exits 0 and prints `leak check: clean`, and run the printed `sftp` command from the project root.

### Other hosts (Netlify, Vercel, CI)

Set the build command to `npm run build` and the publish directory to `_site`. `.npmrc`'s `script-shell` is a Windows Git Bash path that doesn't exist on Linux, so every npm script would fail to start: set the environment variable `NPM_CONFIG_SCRIPT_SHELL=/bin/bash` on the host (or delete that `.npmrc` line in that project). The `.htaccess` file only works on Apache.

## License

[WTFPL](http://www.wtfpl.net/) — Do What The Fuck You Want To Public License. That covers Daniel Dahl's own code in this repository.

**Third-party code.** Some files contain or adapt [Bootstrap](https://getbootstrap.com/) example code, which is MIT-licensed, Copyright (c) 2011-present The Bootstrap Authors ([license](https://github.com/twbs/bootstrap/blob/main/LICENSE)). Those parts stay under MIT, and their attribution must be kept when you copy or change them:

- `src/cheatsheet.njk`: markup from Bootstrap's cheatsheet example;
- `src/assets/js/cheatsheet.js`: ported from the same example;
- `src/assets/css/style.css` §8.0: adapted from Bootstrap's docs SCSS;
- `src/showcase.njk`: the hero adapted from Bootstrap's heroes example.

Bootstrap, Bootstrap Icons, Bootswatch and PhotoSwipe themselves load from CDNs under their own (MIT) licenses.
