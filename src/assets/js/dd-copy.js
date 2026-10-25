/* ============================================================
 *  DD-COPY  —  src/assets/js/dd-copy.js
 * ============================================================
 *
 *  Unified "copy to clipboard" handler for every page on the site.
 *  Loaded once globally from base.njk; works via event delegation
 *  on document so it picks up dynamically-rendered buttons too.
 *
 *  USAGE:
 *  ------
 *  Add the class `dd-copy-btn` to any <button>, then declare what
 *  it should copy via one of two data-attributes:
 *
 *    Static value (the same string every time):
 *      <button class="dd-copy-btn" data-copy-value="ABC-123">
 *        <i class="bi bi-clipboard"></i> Copy
 *      </button>
 *
 *    Live value from another element (input, textarea, etc.):
 *      <button class="dd-copy-btn" data-copy-target="#output">
 *        Copy
 *      </button>
 *
 *  Optional overrides for the tooltip text:
 *    data-copy-success-text="Copied!"     (default: Copied!)
 *    data-copy-error-text="Copy failed"   (default: Copy failed)
 *
 *  FEEDBACK PATTERN:
 *  -----------------
 *  Same as Bootstrap's own docs, GitHub, MDN, Stripe, etc.:
 *    - Success → icon swap to bi-check-lg (text-success) + tooltip,
 *      reverts after 1200ms.
 *    - Failure → icon swap to bi-x-lg (text-danger) + tooltip,
 *      reverts after 1800ms.
 *  Buttons without a leading <i> still get the tooltip; we just skip
 *  the icon swap.
 *
 *  WHY EVENT DELEGATION:
 *  ---------------------
 *  Some buttons may be rendered after page load (e.g. result rows
 *  built by JS). A direct attach-on-DOMContentLoaded would miss those.
 *  Listening on document and matching `.closest(".dd-copy-btn")` covers
 *  both static markup and JS-injected buttons with no extra wiring.
 *
 *  PROGRAMMATIC API:
 *  -----------------
 *  For values built at click-time (e.g. assembled from a table), call
 *  window.ddCopy(text, btn) — same icon-swap + tooltip feedback as the
 *  declarative path. Returns a Promise<boolean>.
 * ============================================================
 */

(function () {
	"use strict";

	const SUCCESS_REVERT_MS = 1200;
	const ERROR_REVERT_MS = 1800;
	const DEFAULT_SUCCESS = "Copied!";
	const DEFAULT_ERROR = "Copy failed";

	document.addEventListener("click", function (e) {
		const btn = e.target.closest(".dd-copy-btn");
		if (!btn || btn.disabled) return;

		// Resolve the value to copy. data-copy-value wins if both are set.
		let value = btn.dataset.copyValue;
		if (value == null && btn.dataset.copyTarget) {
			const target = document.querySelector(btn.dataset.copyTarget);
			if (target) {
				// Inputs/textareas have .value; everything else uses textContent.
				value = "value" in target ? target.value : target.textContent;
			}
		}
		if (value == null || value === "") return;

		copyAndFlash(btn, String(value), {});
	});

	/**
	 * Programmatic API for callers that build the value at click-time.
	 *
	 *   window.ddCopy(buildString(), btn);
	 *   window.ddCopy(text, btn, { successText: "Copied 12 rows (3 skipped)" });
	 *   window.ddCopy(text, btn, { errorText: "Custom failure message" });
	 *
	 * Use this — not toasts — for any copy-action feedback so every copy
	 * button on the site behaves the same way.
	 */
	window.ddCopy = function (text, btn, opts) {
		if (!btn) return Promise.resolve(false);
		return copyAndFlash(btn, String(text || ""), opts || {});
	};

	/**
	 * Show the error-state feedback (red bi-x-lg + tooltip) without attempting
	 * a copy. For "nothing to copy" / precondition-failed cases where the
	 * button was clicked but there's no payload yet — keeps the feedback
	 * channel uniform with successful copies instead of falling back to toasts.
	 *
	 *   if (lines.length === 0) {
	 *     window.ddCopyError(btn, "Nothing to copy — fill the form first");
	 *     return;
	 *   }
	 */
	window.ddCopyError = function (btn, msg) {
		if (!btn) return;
		flash(btn, msg || DEFAULT_ERROR, false);
	};

	async function copyAndFlash(btn, text, opts) {
		const successMsg = opts.successText || btn.dataset.copySuccessText || DEFAULT_SUCCESS;
		const errorMsg = opts.errorText || btn.dataset.copyErrorText || DEFAULT_ERROR;

		let ok = true;
		try {
			await navigator.clipboard.writeText(text);
		} catch (err) {
			// Fallback for non-secure contexts (http://) or blocked permissions:
			// drop the text in a temporary <textarea> and use the legacy API.
			ok = legacyCopy(text);
		}

		flash(btn, ok ? successMsg : errorMsg, ok);
		return ok;
	}

	function legacyCopy(text) {
		try {
			const ta = document.createElement("textarea");
			ta.value = text;
			ta.setAttribute("readonly", "");
			// Position offscreen so it doesn't cause a visible flash or scroll.
			ta.style.position = "fixed";
			ta.style.top = "-1000px";
			ta.style.opacity = "0";
			document.body.appendChild(ta);
			ta.select();
			const ok = document.execCommand("copy");
			document.body.removeChild(ta);
			return ok;
		} catch (e) {
			return false;
		}
	}

	function flash(btn, msg, isSuccess) {
		const icon = btn.querySelector("i.bi");
		const iconSnapshot = icon ? icon.className : null;

		if (icon) {
			// Strip every existing bi-* class (so any clipboard variant works:
			// bi-clipboard, bi-clipboard-check, bi-clipboard-plus, etc.) and any
			// stale text-success/text-danger we may have added on a prior click.
			icon.className = icon.className
				.split(/\s+/)
				.filter((c) => !c.startsWith("bi-") && c !== "text-success" && c !== "text-danger")
				.join(" ");
			icon.classList.add("bi", isSuccess ? "bi-check-lg" : "bi-x-lg");
			icon.classList.add(isSuccess ? "text-success" : "text-danger");
		}

		showTransientTooltip(btn, msg, isSuccess);

		const revertMs = isSuccess ? SUCCESS_REVERT_MS : ERROR_REVERT_MS;
		setTimeout(() => {
			if (icon && iconSnapshot != null) icon.className = iconSnapshot;
		}, revertMs);
	}

	/**
	 * Show a Bootstrap tooltip on the button for a short time, then hide it.
	 * Snapshots and restores the original title so buttons that already have
	 * a hover-tooltip (e.g. data-bs-toggle="tooltip" with title="Click to copy")
	 * keep working afterwards.
	 */
	function showTransientTooltip(btn, msg, isSuccess) {
		if (typeof bootstrap === "undefined" || !bootstrap.Tooltip) return;

		const originalTitle =
			btn.getAttribute("data-bs-original-title") ||
			btn.getAttribute("title") ||
			"";

		// getOrCreateInstance returns an existing tooltip if one is bound, else
		// builds a manual-trigger one for our feedback window.
		const tip = bootstrap.Tooltip.getOrCreateInstance(btn, {
			trigger: "manual",
			placement: "top",
			title: msg,
		});

		tip.setContent({ ".tooltip-inner": msg });
		tip.show();

		const revertMs = isSuccess ? SUCCESS_REVERT_MS : ERROR_REVERT_MS;
		setTimeout(() => {
			tip.hide();
			// Restore the previous title text so subsequent hovers don't show
			// "Copied!" forever. (setContent persists otherwise.)
			tip.setContent({ ".tooltip-inner": originalTitle });
		}, revertMs);
	}
})();
