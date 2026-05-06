/*
 * ============================================================
 *  BOOTSWATCH THEME SWITCHER  —  src/js/bootswatch-switcher.js
 * ============================================================
 *
 *  Dynamically loads Bootswatch themes from CDN by swapping
 *  the <link> stylesheet in the <head>.
 *
 *  This is a dev/fun tool — include bootswatch-switcher.njk
 *  and this script when you want it.  Leave them out in
 *  production if you don't need runtime theme switching.
 *
 *  Buttons need class "dd-bootswatch-option" and a data-theme
 *  attribute (e.g. data-theme="darkly" or data-theme="default").
 *
 *  Saved to localStorage under key "bootswatchTheme".
 *
 * ============================================================
 */

document.addEventListener("DOMContentLoaded", () => {

  const options = document.querySelectorAll(".dd-bootswatch-option");

  // Insert new stylesheets BEFORE style.css so custom styles always win
  const customCSS = document.getElementById("site-css");

  function insertLink(link) {
    if (customCSS) {
      customCSS.parentNode.insertBefore(link, customCSS);
    } else {
      document.head.appendChild(link);
    }
  }

  function loadBootswatchTheme(theme) {
    // Remove any existing theme stylesheets (both Bootswatch and plain Bootstrap)
    const oldBootswatch = document.getElementById("bootswatch-theme");
    const oldDefault = document.getElementById("bootstrap-default");
    if (oldBootswatch) oldBootswatch.remove();
    if (oldDefault) oldDefault.remove();

    // Clear active state on all theme buttons
    options.forEach((opt) => opt.classList.remove("active"));

    if (theme === "default") {
      // Load plain Bootstrap (no Bootswatch styling)
      const link = document.createElement("link");
      link.id = "bootstrap-default";
      link.rel = "stylesheet";
      link.href = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css";
      link.integrity = "sha384-sRIl4kxILFvY47J16cr9ZwB07vP4J8+LH7qKQnuqkuIAvNWLzeN8tE5YBujZqJLB";
      link.crossOrigin = "anonymous";
      insertLink(link);

      localStorage.removeItem("bootswatchTheme");
      document.querySelector('.dd-bootswatch-option[data-theme="default"]')?.classList.add("active");
      return;
    }

    // Load a Bootswatch theme
    const link = document.createElement("link");
    link.id = "bootswatch-theme";
    link.rel = "stylesheet";
    link.href = `https://cdnjs.cloudflare.com/ajax/libs/bootswatch/5.3.8/${theme}/bootstrap.min.css`;
    insertLink(link);

    localStorage.setItem("bootswatchTheme", theme);
    document.querySelector(`.dd-bootswatch-option[data-theme="${theme}"]`)?.classList.add("active");
  }

  // On page load: restore saved Bootswatch theme
  const savedBootswatch = localStorage.getItem("bootswatchTheme");
  const currentLink = document.getElementById("bootswatch-theme");
  const currentHref = currentLink ? currentLink.href : "";

  if (savedBootswatch) {
    if (!currentHref.includes(`/${savedBootswatch}/`)) {
      loadBootswatchTheme(savedBootswatch);
    } else {
      document.querySelector(`.dd-bootswatch-option[data-theme="${savedBootswatch}"]`)?.classList.add("active");
    }
  } else if (currentLink) {
    const match = currentHref.match(/bootswatch\/[\d.]+\/(\w+)\//);
    if (match) {
      document.querySelector(`.dd-bootswatch-option[data-theme="${match[1]}"]`)?.classList.add("active");
    }
  }

  // Click handlers
  options.forEach((option) => {
    option.addEventListener("click", () => {
      loadBootswatchTheme(option.dataset.theme);
    });
  });

});
