# Eleventy + Bootstrap 5 Boilerplate

A production-ready static site boilerplate built with [Eleventy 3.0](https://www.11ty.dev/) and [Bootstrap 5.3](https://getbootstrap.com/). Designed for 5-10 page websites with dark mode, theme switching, SEO, accessibility, and Apache hosting out of the box.

## Features

- **Eleventy 3.0** — Fast static site generator with Nunjucks templates
- **Bootstrap 5.3** — Responsive CSS framework loaded from CDN
- **25 Bootswatch themes** — Runtime theme switcher with localStorage persistence
- **5 built-in themes** — Dark, Light, and 3 High-Contrast accessibility modes
- **SEO complete** — Open Graph, Twitter Cards, JSON-LD structured data, sitemap, robots.txt
- **Accessibility** — Skip-to-content, ARIA labels, semantic HTML, high-contrast modes
- **PWA installable** — Manifest + icons with maskable support (no service worker yet)
- **Apache hardened** — .htaccess with HTTPS redirect, security headers, gzip, caching
- **CSS/JS minification** — Post-build minification via clean-css and terser
- **Cache busting** — Automatic `?v=timestamp` on CSS/JS assets
- **Cookie consent** — Non-blocking toast (localStorage-based)
- **Google Analytics** — Configurable via site.json (disabled by default)
- **Educational comments** — Every file explains what it does and why

## Quick Start

```bash
# 1. Clone or copy this boilerplate
# 2. Install dependencies
npm install

# 3. Start development server (live reload)
npm start

# 4. Build for production (with minification)
npm run build
```

The dev server runs at `http://localhost:8080`. The production build outputs to `_site/`.

## Customization

### 1. Edit `src/_data/site.json`

This is the single source of truth for your entire site. Update these values and the whole site adapts:

| Field | Purpose |
|-------|---------|
| `name` | Site name (shown in navbar, footer, title tags) |
| `url` | Production URL (used for canonical links, sitemap) |
| `description` | Default meta description for SEO |
| `author` | Your name and URL |
| `gaId` | Google Analytics ID (leave `""` to disable) |
| `googleFontsUrl` | Google Fonts URL (leave `""` for system fonts) |
| `defaultBootswatchTheme` | `"default"` for plain Bootstrap, or any Bootswatch theme name |
| `webmanifest` | PWA app name and colors |
| `footer` | Copyright, version, hub link |

> Update `site.security.contact` and `site.security.expires` in `site.json` before going live — they ship a `/.well-known/security.txt` (RFC 9116).

### 2. Update navigation

Edit `src/_data/nav.js` to add, remove, or reorder menu items. Supports icons, external links, dropdowns, and disabled states.

### 3. Replace favicons

Replace the placeholder images in `src/assets/img/` with your own. Generate a full favicon set at [realfavicongenerator.net](https://realfavicongenerator.net/).

### 4. Customize styles

Edit `src/assets/css/style.css`. The file is organized in sections with clear headers. To use custom fonts, set `googleFontsUrl` in `site.json` and update the `font-family` declarations in the CSS.

### 5. Add pages

Create new `.njk` files in `src/`. Use this template:

```njk
---
layout: base.njk
title: My New Page
mainClass: pb-5 mt-4
---

<h1>My New Page</h1>
<p>Your content here.</p>
```

Don't forget to add the page to `src/_data/nav.js` for navigation.

## Directory Structure

```
src/
├── _data/              # Global data (site config, nav, themes)
│   ├── site.json       # Master config — edit this first
│   ├── nav.js          # Navigation menu structure
│   └── themes.js       # Theme definitions (dark/light/HC)
├── _includes/          # Layouts and partials
│   ├── base.njk        # Master layout (wraps all pages)
│   ├── head-meta.njk   # SEO and Open Graph meta tags
│   ├── head-assets.njk # CSS, fonts, favicons, analytics
│   ├── navbar.njk      # Top navigation bar
│   ├── offcanvas-menu.njk  # Slide-out sidebar menu
│   ├── footer.njk      # Page footer
│   ├── theme-toggle.njk    # Dark/light/HC theme dropdown
│   └── bootswatch-switcher.njk  # 25-theme floating switcher
├── assets/
│   ├── css/style.css   # Your custom styles
│   ├── js/             # JavaScript files
│   └── img/            # Images, favicons, OG image
├── index.njk           # Home page
├── about.njk           # About page
├── contact.njk         # Contact page
├── legal.njk           # Privacy, cookies, terms
├── 404.njk             # Error page
├── 403.njk             # Forbidden page
├── robots.njk          # robots.txt generator
├── sitemap.njk         # sitemap.xml generator
├── htaccess.njk        # .htaccess generator
├── site.webmanifest.njk # PWA manifest
└── humans.njk          # humans.txt
```

## Build Pipeline

- `npm start` — Eleventy dev server with live reload and file watching
- `npm run build` — Eleventy build + CSS/JS minification (`scripts/minify.js`)

The minifier walks `_site/assets/`, compresses `.css` with clean-css and `.js` with terser, skipping files already named `.min.*`.

## Deployment

The build output (`_site/`) is ready to deploy to any static host:

- **Apache** — Upload `_site/` contents. The generated `.htaccess` handles HTTPS redirect, security headers, gzip, and caching.
- **Netlify/Vercel** — Set build command to `npm run build` and publish directory to `_site`.

## License

[WTFPL](http://www.wtfpl.net/) — Do What The Fuck You Want To Public License.
