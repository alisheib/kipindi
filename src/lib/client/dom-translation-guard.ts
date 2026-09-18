/**
 * SURVIVING A TRANSLATOR THAT REWRITES THE DOM UNDER REACT.
 *
 * 🔴 THE DEFECT, CAPTURED OFF THE PLAYER'S OWN HANDSET 2026-09-18 (Android 10, Chrome 152):
 *
 *   NotFoundError: Failed to execute 'removeChild' on 'Node':
 *   The node to be removed is not a child of this node.
 *
 * Google Translate does not edit text in place. It **replaces each text node**, wrapping the
 * translation in its own `<font>` element. React is still holding references to the ORIGINAL
 * nodes, so the next re-render — for this player, the board repainting after a bet that had
 * already succeeded — asks a parent to remove a child that is no longer its child. The DOM
 * throws, the throw escapes render, and the route's error boundary replaces the whole page with
 * *"Ukurasa huu umekumbana na tatizo"*.
 *
 * ⭐ IT PRESENTED AS "ONLY ON ONE PHONE" FOR TWO SESSIONS because auto-translate is a **per-device
 * browser setting**. Nothing in our data, our HTTP status codes, our server logs or any test
 * suite can see it; the page is served 200 and the throw never reaches the server. It was found
 * only once the boundary started reporting itself (`/api/client-error`).
 *
 * ── WHY THIS EXISTS WHEN THE PAGE ALREADY SAYS `notranslate` ─────────────────────────────────
 * ⛔ **`translate="no"` AND THE `notranslate` META ARE ADVISORY.** Google honours them. An in-app
 * webview (Facebook, Instagram — a large share of this product's traffic), a browser extension,
 * a vendor ROM's built-in translator, or any accessibility tool that rewrites text need not.
 * Prevention removes the common trigger; this removes the crash.
 *
 * ── WHY SWALLOWING IS SAFE HERE, AND NOT A MASKED BUG ────────────────────────────────────────
 * ⭐ The guard fires on exactly the condition the DOM itself rejects: the node is **already not a
 * child of this parent**. "Remove this child" whose answer is "it is not here" is a no-op by
 * definition — the caller's intent is already satisfied. We are not hiding a failed removal; we
 * are declining to throw about one that has already happened.
 * ⛔ AND IT IS NEVER SILENT. Every interception is reported to `/api/client-error`, so a
 * mis-scoped guard shows up as a log line instead of as a mystery. Downgrading a fatal crash on
 * a money surface to a reported, survivable event is the whole point; hiding it is not.
 * ⚠️ Throttled to ONE report per page load: a translated page re-renders constantly and would
 * otherwise beacon on every frame.
 */

let installed = false;
let reported = false;

/** Fire-and-forget, once per load. Same endpoint and scrubbing as the error boundary. */
function reportOnce(api: string, detail: string): void {
  if (reported) return;
  reported = true;
  try {
    const body = JSON.stringify({
      message: `[dom-translation-guard] intercepted ${api} — ${detail}`,
      stack: new Error("dom-translation-guard").stack ?? "",
      path: window.location.pathname,
      digest: null,
      build: String((globalThis as { NEXT_DEPLOYMENT_ID?: string }).NEXT_DEPLOYMENT_ID ?? "") || null,
    });
    if (typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon("/api/client-error", new Blob([body], { type: "application/json" }));
    }
  } catch {
    /* reporting must never be the thing that breaks the page */
  }
}

/**
 * Make `removeChild` and `insertBefore` tolerant of a node another agent has already moved.
 *
 * ⛔ IDEMPOTENT AND SELF-DISARMING. Called from a module-scope side effect that can run more than
 * once under Fast Refresh; double-patching would nest the originals and make a real DOM error
 * unreadable.
 */
export function installDomTranslationGuard(): void {
  if (installed) return;
  if (typeof window === "undefined" || typeof Node !== "function" || !Node.prototype) return;
  installed = true;

  try {
    const nativeRemoveChild = Node.prototype.removeChild;
    Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
      if (child.parentNode !== this) {
        // Already detached or re-parented by the translator — the caller's intent is satisfied.
        reportOnce("removeChild", "node was re-parented by a page translator");
        return child;
      }
      return nativeRemoveChild.call(this, child) as T;
    };

    const nativeInsertBefore = Node.prototype.insertBefore;
    Node.prototype.insertBefore = function <T extends Node>(this: Node, newNode: T, referenceNode: Node | null): T {
      if (referenceNode && referenceNode.parentNode !== this) {
        // ⭐ APPEND RATHER THAN DROP. The reference point is stale, but the new node is real
        // content React means to show — losing it would blank part of a money surface, which is
        // worse than placing it at the end of the same parent.
        reportOnce("insertBefore", "reference node was re-parented by a page translator");
        return nativeInsertBefore.call(this, newNode, null) as T;
      }
      return nativeInsertBefore.call(this, newNode, referenceNode) as T;
    };
  } catch {
    /* a browser that refuses the patch keeps native behaviour — no worse than before */
  }
}
