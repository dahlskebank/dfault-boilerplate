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
 *    2. Auto-close when viewport resizes to desktop (992px+)
 *
 * ============================================================
 */

document.addEventListener("DOMContentLoaded", () => {

  const offcanvasEl = document.getElementById("dd-offcanvas");
  if (!offcanvasEl) return;

  const bsOffcanvas = bootstrap.Offcanvas.getOrCreateInstance(offcanvasEl);

  // Close offcanvas when a menu link is tapped
  offcanvasEl.querySelectorAll("a.nav-link:not(.disabled)").forEach((link) => {
    link.addEventListener("click", () => {
      bsOffcanvas.hide();
    });
  });

  // Close offcanvas if viewport resizes to desktop (e.g. rotate to landscape)
  window.addEventListener("resize", () => {
    if (window.innerWidth >= 992 && offcanvasEl.classList.contains("show")) {
      bsOffcanvas.hide();
    }
  });

});
