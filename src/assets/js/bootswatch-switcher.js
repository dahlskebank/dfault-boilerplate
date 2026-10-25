/*
 * ============================================================
 *  BOOTSWATCH THEME SWITCHER  —  src/assets/js/bootswatch-switcher.js
 * ============================================================
 *
 *  Dynamically loads Bootswatch themes from CDN by swapping
 *  the <link> stylesheet in the <head>.
 *
 *  This is a dev/fun tool, switched by ONE flag:
 *  site.json → bootswatchSwitcher. While it is true, the
 *  eleventy.after bundle step (SITE_WIDE_JS in eleventy.config.js)
 *  adds this file to /assets/js/bundle.js, offcanvas-menu.njk
 *  includes bootswatch-switcher.njk, and base.njk writes the
 *  restore script into <head>. Set it to false on a finished site.
 *
 *  Buttons need class "dd-bootswatch-option" and a data-theme
 *  attribute (e.g. data-theme="darkly" or data-theme="default").
 *  URLs and SRI hashes are NOT in this file: they come from
 *  window.ddBootswatchSheets ({ name: [url, integrity] }), which
 *  base.njk renders from src/_data/cdn.js — so a version bump
 *  never needs an edit here.
 *
 *  Saved to localStorage under key "bootswatchTheme" (through
 *  window.ddStore, which never throws). "default" is saved too,
 *  so picking plain Bootstrap sticks even on a site whose
 *  site.defaultBootswatchTheme is a Bootswatch theme.
 *
 *  NO FLASH:
 *    - On page load the saved theme is already in place: base.njk's
 *      head script swapped the <link> before first paint. This file
 *      only marks the active button (and loads the theme itself if
 *      that early swap didn't happen).
 *    - On a click the NEW stylesheet is added first and the old one
 *      is removed only after the new one has loaded. Removing first
 *      (as before) left a moment with no Bootstrap CSS at all.
 *
 *  Every inserted <link> gets BOTH integrity and
 *  crossOrigin = "anonymous": SRI on a cross-origin file needs a
 *  CORS request, and without it the browser refuses the file.
 *
 * ============================================================
 */

document.addEventListener("DOMContentLoaded", () => {

  const options = document.querySelectorAll(".dd-bootswatch-option");
  const sheets = window.ddBootswatchSheets;
  if (!options.length) return;
  if (!sheets) {
    console.warn("[bootswatch-switcher] window.ddBootswatchSheets is missing (base.njk head script) — switcher disabled.");
    return;
  }

  // Fallback for a page without theme-init.njk: plain, unremembered switching.
  const store = window.ddStore || { get: () => null, set: () => {} };
  const has = (name) => Object.prototype.hasOwnProperty.call(sheets, name);

  // Insert new stylesheets BEFORE style.css so custom styles always win
  const customCSS = document.getElementById("site-css");

  function insertLink(link) {
    if (customCSS) {
      customCSS.parentNode.insertBefore(link, customCSS);
    } else {
      document.head.appendChild(link);
    }
  }

  // The theme on the page right now, read from whichever <link> exists:
  // #bootstrap-default = "default", #bootswatch-theme = the name in its URL.
  function currentTheme() {
    if (document.getElementById("bootstrap-default")) return "default";
    const link = document.getElementById("bootswatch-theme");
    const match = link && link.href.match(/bootswatch\/[\d.]+\/(\w+)\//);
    return match ? match[1] : null;
  }

  // .active for the eye, aria-pressed for screen readers.
  function markActive(theme) {
    options.forEach((opt) => {
      const on = opt.dataset.theme === theme;
      opt.classList.toggle("active", on);
      opt.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  // The link added by the most recent click while it is still loading
  // (null when nothing is loading). A slower, older request that
  // finishes later must not win.
  let latest = null;

  function loadBootswatchTheme(theme) {
    if (!has(theme)) return;
    const [href, integrity] = sheets[theme];

    // Retire the current theme link(s): they give up their id now (the
    // new link takes it) and are removed once the new one has loaded.
    // data-dd-retired remembers the id in case we have to put one back.
    document.querySelectorAll("#bootswatch-theme, #bootstrap-default").forEach((old) => {
      old.dataset.ddRetired = old.id;
      old.removeAttribute("id");
    });

    const link = document.createElement("link");
    link.id = theme === "default" ? "bootstrap-default" : "bootswatch-theme";
    link.rel = "stylesheet";
    link.crossOrigin = "anonymous";
    link.integrity = integrity;
    if (theme !== "default") link.referrerPolicy = "no-referrer"; // same as head-assets.njk
    link.href = href;
    latest = link;

    link.addEventListener("load", () => {
      if (link !== latest) {
        // Another theme was clicked while this one loaded.
        link.remove();
        return;
      }
      latest = null;
      document.querySelectorAll("link[data-dd-retired]").forEach((old) => old.remove());
      store.set("bootswatchTheme", theme);
      // Tells theme-init.njk whether the new theme is designed dark (print styles).
      if (window.ddTheme) window.ddTheme.setBootswatch(theme);
    });

    link.addEventListener("error", () => {
      link.remove();
      console.warn(`[bootswatch-switcher] Could not load "${theme}" (network or SRI mismatch) — kept the current theme.`);
      if (link !== latest) return;
      // Put the oldest retired link (the one still styling the page) back
      // in charge and drop any half-loaded ones.
      const retired = document.querySelectorAll("link[data-dd-retired]");
      retired.forEach((old, i) => {
        if (i === 0) {
          old.id = old.dataset.ddRetired;
          delete old.dataset.ddRetired;
        } else {
          old.remove();
        }
      });
      latest = null;
      markActive(currentTheme());
    });

    insertLink(link);
    markActive(theme);
  }

  // On page load: restore the saved Bootswatch theme if base.njk's head
  // script didn't (no saved pick, a name cdn.js doesn't know, or the swap
  // failed and fell back to the default).
  const current = currentTheme();
  let saved = store.get("bootswatchTheme");
  if (saved && !has(saved)) {
    store.set("bootswatchTheme", null); // stale name, e.g. a theme Bootswatch dropped
    saved = null;
  }

  if (saved && saved !== current) {
    loadBootswatchTheme(saved);
  } else {
    markActive(current);
  }

  // Click handlers
  options.forEach((option) => {
    option.addEventListener("click", () => {
      // Already showing that theme and nothing loading? Nothing to do.
      if (!latest && option.dataset.theme === currentTheme()) return;
      loadBootswatchTheme(option.dataset.theme);
    });
  });

});
