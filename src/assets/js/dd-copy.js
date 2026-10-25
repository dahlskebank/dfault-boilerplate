/* ============================================================
 *  DD-COPY  —  src/assets/js/dd-copy.js
 * ============================================================
 *
 *  Unified "copy to clipboard" handler for every page on the site.
 *  Loaded once globally (part of /assets/js/bundle.js); works via
 *  event delegation on document so it picks up dynamically-rendered
 *  buttons too.
 *
 *  USAGE:
 *  ------
 *  Add the class `dd-copy-btn` to any <button>, then declare what
 *  it should copy via one of two data-attributes:
 *
 *    Static value (the same string every time):
 *      <button class="dd-copy-btn" data-copy-value="ABC-123">
 *        <i class="bi bi-clipboard" aria-hidden="true"></i> Copy
 *      </button>
 *
 *    Live value from another element (input, textarea, etc.):
 *      <button class="dd-copy-btn" data-copy-target="#output">
 *        Copy
 *      </button>
 *    Form fields (<input>, <textarea>, <select>) give their value;
 *    any other element gives its text. A selector that matches
 *    nothing (or isn't valid CSS), or an empty value, shows the
 *    error feedback instead of failing silently.
 *
 *  Optional overrides for the feedback text:
 *    data-copy-success-text="Copied!"     (default: Copied!)
 *    data-copy-error-text="Copy failed"   (default: Copy failed)
 *
 *  A .dd-copy-btn with NEITHER attribute is left alone by the click
 *  handler — that's a button whose page script calls ddCopy() itself.
 *
 *  PROGRAMMATIC API (window globals, for buttons the page owns):
 *  ------------------------------------------------------------
 *    window.ddCopy(text, btn, opts?)   → copies + flashes; Promise<boolean>
 *    window.ddCopyError(btn, msg?)     → flashes failure, copies nothing
 *    window.ddCopySuccess(btn, msg?)   → flashes success, copies nothing
 *                                        (for callers that did their own
 *                                        clipboard write, e.g. rich text)
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
 *  Two extras so EVERYONE gets the message:
 *    - Touch screens: style.css §3.5 hides tooltips where there is no
 *      hover (phones), except ones with the class .dd-copy-tip. Every
 *      feedback tooltip gets that class, so "Copied!" shows on a Pixel.
 *    - Screen readers: a Bootstrap tooltip is only an
 *      aria-describedby, which isn't read out when it appears. The
 *      same message is also written into one visually hidden
 *      aria-live="polite" region, which IS announced.
 *
 *  WHY EVENT DELEGATION:
 *  ---------------------
 *  Some buttons may be rendered after page load (e.g. result rows
 *  built by JS). A direct attach-on-DOMContentLoaded would miss those.
 *  Listening on document and matching `.closest(".dd-copy-btn")` covers
 *  both static markup and JS-injected buttons with no extra wiring.
 * ============================================================
 */

(function () {
	"use strict";

	const SUCCESS_REVERT_MS = 1200;
	const ERROR_REVERT_MS = 1800;
	const DEFAULT_SUCCESS = "Copied!";
	const DEFAULT_ERROR = "Copy failed";
	const DEFAULT_EMPTY = "Nothing to copy";

	// The class style.css §3.5 exempts from "no tooltips on touch screens".
	const TIP_CLASS = "dd-copy-tip";

	document.addEventListener("click", function (e) {
		const btn = e.target.closest(".dd-copy-btn");
		if (!btn || btn.disabled) return;

		const errorMsg = btn.dataset.copyErrorText || DEFAULT_ERROR;

		// Resolve the value to copy. data-copy-value wins if both are set.
		let value = btn.dataset.copyValue;
		if (value == null && btn.dataset.copyTarget) {
			let target = null;
			try {
				target = document.querySelector(btn.dataset.copyTarget);
			} catch (err) {
				// Not a valid CSS selector (SyntaxError) — same as "not found".
			}
			if (!target) {
				flash(btn, errorMsg, false);
				return;
			}
			// Form fields have a real .value. Don't test `"value" in target`:
			// <li>, <button>, <meter>, <progress> and <data> have a .value
			// property too, and an <li>'s is the number 0.
			const isField =
				target instanceof HTMLInputElement ||
				target instanceof HTMLTextAreaElement ||
				target instanceof HTMLSelectElement;
			value = isField ? target.value : target.textContent;
		}

		// Neither attribute: a button wired by its page's own script.
		if (value == null) return;
		if (value === "") {
			flash(btn, DEFAULT_EMPTY, false);
			return;
		}

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

	/**
	 * Show the success-state feedback (green bi-check-lg + tooltip) WITHOUT
	 * attempting a copy. Mirror of ddCopyError, for callers that performed
	 * their own clipboard write — e.g. a rich-text
	 * `navigator.clipboard.write([new ClipboardItem({...})])`, which the
	 * writeText path above cannot express. Calling ddCopy afterwards just to
	 * get the checkmark would overwrite the rich payload with plain text.
	 *
	 *   const ok = await copyFormatted(html, plain);
	 *   if (ok) window.ddCopySuccess(btn, "Copied with formatting");
	 *   else    window.ddCopyError(btn, "Copy was blocked");
	 *
	 * (Ported from the fg project, where the first caller copies an Outlook
	 * mail body with formatting.)
	 */
	window.ddCopySuccess = function (btn, msg) {
		if (!btn) return;
		flash(btn, msg || DEFAULT_SUCCESS, true);
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

	/* --- Screen-reader announcement ---------------------------------
	 * ONE visually hidden live region for every copy button. It has to
	 * exist BEFORE the message is written (screen readers only announce
	 * changes inside a live region they already know about), so it's
	 * created as soon as this script runs. bundle.js loads at the end of
	 * <body>, so document.body is there; the fallback covers a page that
	 * loads dd-copy.js earlier.
	 * ---------------------------------------------------------------- */
	let live = null;

	function createLiveRegion() {
		if (live) return;
		live = document.createElement("div");
		live.className = "visually-hidden";
		live.setAttribute("aria-live", "polite");
		live.setAttribute("aria-atomic", "true");
		document.body.appendChild(live);
	}

	if (document.body) {
		createLiveRegion();
	} else {
		document.addEventListener("DOMContentLoaded", createLiveRegion);
	}

	function announce(msg) {
		if (!live) createLiveRegion();
		// Clear first, write on the next frame: the same text twice in a row
		// (a second "Copied!") is otherwise not a change, and not read out.
		live.textContent = "";
		requestAnimationFrame(() => {
			live.textContent = msg;
		});
	}

	// The PRISTINE class string of each icon we have ever flashed, and the
	// pending revert timer for each button. (Ported from the fg project.)
	//
	// Both exist to survive OVERLAPPING flashes. Snapshotting icon.className
	// at call time is wrong: a second click inside the revert window snapshots
	// the already-swapped "bi-check-lg text-success" string, and because the
	// two timers fire in order the LATER one wins — the button is left stuck
	// on the checkmark for the rest of the page's life, and since every
	// subsequent flash re-snapshots the corrupted value it can never heal.
	// (Reproduced in fg 2026-09-09: double-click any copy button inside 1.2 s.)
	//
	// WeakMaps rather than a data-* attribute so nothing leaks into the DOM
	// and detached buttons stay collectable.
	const pristineIcon = new WeakMap();
	const pendingRevert = new WeakMap();
	const pendingTooltip = new WeakMap();

	function flash(btn, msg, isSuccess) {
		const icon = btn.querySelector("i.bi");

		// Remember the true original once; every later flash reuses it.
		if (icon && !pristineIcon.has(icon)) pristineIcon.set(icon, icon.className);
		const iconSnapshot = icon ? pristineIcon.get(icon) : null;

		// Only the most recent click owns the revert.
		clearTimeout(pendingRevert.get(btn));

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
		announce(msg);

		const revertMs = isSuccess ? SUCCESS_REVERT_MS : ERROR_REVERT_MS;
		pendingRevert.set(
			btn,
			setTimeout(() => {
				pendingRevert.delete(btn);
				if (icon && iconSnapshot != null) icon.className = iconSnapshot;
			}, revertMs),
		);
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
		// builds a manual-trigger one for our feedback window. customClass
		// only reaches a tooltip created HERE — an existing instance keeps
		// its own config — so the class is also added to the tip element
		// right after show() below.
		const tip = bootstrap.Tooltip.getOrCreateInstance(btn, {
			trigger: "manual",
			placement: "top",
			title: msg,
			customClass: TIP_CLASS,
		});

		tip.setContent({ ".tooltip-inner": msg });
		tip.show();
		// show() builds a fresh tip element every time (Bootstrap 5.3), and
		// does it synchronously — so the class is there before the next paint.
		if (tip.tip) tip.tip.classList.add(TIP_CLASS);

		// Same overlap problem as the icon revert above: without cancelling the
		// previous timer, a first click's hide() fires in the middle of a second
		// click's feedback window and the tooltip vanishes early.
		clearTimeout(pendingTooltip.get(btn));

		const revertMs = isSuccess ? SUCCESS_REVERT_MS : ERROR_REVERT_MS;
		pendingTooltip.set(
			btn,
			setTimeout(() => {
				pendingTooltip.delete(btn);
				tip.hide();
				// Restore the previous title text so subsequent hovers don't show
				// "Copied!" forever. (setContent persists otherwise.)
				tip.setContent({ ".tooltip-inner": originalTitle });
			}, revertMs),
		);
	}
})();
