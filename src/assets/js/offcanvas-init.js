/*
 * ============================================================
 *  OFFCANVAS INIT  —  src/assets/js/offcanvas-init.js
 * ============================================================
 *
 *  Lightweight companion to Bootstrap's Offcanvas component.
 *  Bootstrap handles: open/close, backdrop, Escape key,
 *  scroll lock, and ARIA attributes.
 *
 *  This script adds:
 *    1. Auto-close when a nav link is tapped
 *    2. (Disabled) auto-close when the viewport crosses into
 *       desktop width (992px+) — see CLOSE_ON_DESKTOP below
 *    3. A no-Bootstrap fallback, so the menu still opens when
 *       Bootstrap's JS didn't load
 *
 *  WHY THE FALLBACK: below 992px the offcanvas is the ONLY way to
 *  reach the other pages (the navbar links are d-none d-lg-flex),
 *  and opening it is Bootstrap's job. Bootstrap's JS comes from
 *  jsDelivr; if that request is blocked (filtering network,
 *  extension), times out or fails its SRI check, the hamburger
 *  used to do nothing — and this script threw a ReferenceError
 *  on `bootstrap`. The fallback toggles Bootstrap's own .show
 *  class (the CSS still comes from bootstrap.min.css), with
 *  Escape and the X button to close. No backdrop, no focus trap:
 *  a plain, working menu, not a copy of Bootstrap.
 *  (If the Bootstrap CSS failed too, the menu is plain visible
 *  HTML anyway.)
 *
 * ============================================================
 */

document.addEventListener("DOMContentLoaded", () => {

  const offcanvasEl = document.getElementById("dd-offcanvas");
  if (!offcanvasEl) return;

  if (!window.bootstrap) {
    console.warn("[offcanvas-init] Bootstrap JS not loaded — using the plain menu fallback.");
    wireFallback(offcanvasEl);
    return;
  }

  const bsOffcanvas = bootstrap.Offcanvas.getOrCreateInstance(offcanvasEl);

  // Close offcanvas when a menu link is tapped
  offcanvasEl.querySelectorAll("a.nav-link:not(.disabled)").forEach((link) => {
    link.addEventListener("click", () => {
      bsOffcanvas.hide();
    });
  });

  // Close offcanvas when crossing the desktop breakpoint (e.g. rotate to landscape).
  // Fires once at the breakpoint crossover instead of on every pixel of resize.
  //
  // Disabled (false): this dates from when the offcanvas was a mobile-only
  // menu. The hamburger now opens it at EVERY width (navbar.njk), so closing
  // it when a tablet is turned to landscape or a desktop window is widened
  // only takes away a menu the visitor just opened. Set to true to bring the
  // old behaviour back.
  const CLOSE_ON_DESKTOP = false;
  if (CLOSE_ON_DESKTOP) {
    const desktopMQ = window.matchMedia("(min-width: 992px)");
    desktopMQ.addEventListener("change", (e) => {
      if (e.matches && offcanvasEl.classList.contains("show")) {
        bsOffcanvas.hide();
      }
    });
  }

  // Minimal stand-in for Bootstrap's offcanvas (see the header comment).
  function wireFallback(panel) {
    const togglers = document.querySelectorAll(`[data-bs-toggle="offcanvas"][data-bs-target="#${panel.id}"]`);
    let opener = null;

    function open(from) {
      opener = from;
      panel.classList.add("show");
      togglers.forEach((t) => t.setAttribute("aria-expanded", "true"));
      // Move focus into the panel (Bootstrap does the same) so keyboard and
      // screen-reader users land in the menu they just opened.
      (panel.querySelector('[data-bs-dismiss="offcanvas"]') || panel).focus();
    }

    function close() {
      panel.classList.remove("show");
      togglers.forEach((t) => t.setAttribute("aria-expanded", "false"));
      if (opener) opener.focus();
    }

    togglers.forEach((t) => {
      t.addEventListener("click", () => (panel.classList.contains("show") ? close() : open(t)));
    });
    panel.querySelectorAll('[data-bs-dismiss="offcanvas"]').forEach((b) => b.addEventListener("click", close));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && panel.classList.contains("show")) close();
    });
  }

});
