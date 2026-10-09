/**
 * ONE anchor resolver for the RED harnesses that mutate source by exact string match.
 *
 * ⛔ WHY THIS IS A SHARED MODULE AND NOT A HELPER IN EACH HARNESS. Two separate bugs have now
 * been paid for in this exact place, and both were "the harness stopped proving anything while
 * the gate above it still printed green":
 *
 *   1. 2026-08-13 — `board-discovery-red.mjs` kept anchors on a rail the discovery work had
 *      deleted. Five of six cases could not find their anchor. It was re-anchored, and it fails
 *      loudly now (see its header).
 *   2. 2026-08-13, later — `discovery-contract-red.mjs` reported 2 of 7 defects unprovable on a
 *      normal Windows clone. **The two failing anchors were the only two that spanned a line
 *      break.** `core.autocrlf=true` and there is no `.gitattributes`, so the working tree holds
 *      CRLF while the anchors were written with `\n`. The harness's verdict depended on how the
 *      tree had been checked out rather than on the code — RED here, GREEN on a LF checkout —
 *      which is the shape that makes a guard cry wolf and then get ignored.
 *
 * Fixing one copy hands the same trap to the next harness by copy-paste, which is how the
 * campaign-handoff locator got broken four times. So the rule lives here, once.
 *
 * `resolveAnchor` also insists the anchor is UNIQUE. A `from` that matches twice would inject the
 * defect into whichever site came first and leave the other intact — the gate might then go red
 * for a different reason than the case claims, and the harness would print PASS.
 */

/** The file's own line ending. A mixed file is treated as CRLF: that is what a Windows checkout of
 *  an LF-committed file looks like, and normalising toward it keeps the mutation consistent. */
export function eolOf(src) {
  return src.includes("\r\n") ? "\r\n" : "\n";
}

/** Rewrite a snippet's line breaks into the target convention, whatever it was authored in. */
export function toEol(text, eol) {
  return text.replace(/\r\n|\n/g, eol);
}

/**
 * Locate `from` inside `src` regardless of line-ending convention.
 * @returns {{ok: true, needle: string, eol: string} | {ok: false, reason: string, count: number}}
 */
export function resolveAnchor(src, from) {
  const eol = eolOf(src);
  const needle = toEol(from, eol);
  const count = needle.length === 0 ? 0 : src.split(needle).length - 1;
  if (count === 1) return { ok: true, needle, eol };
  return {
    ok: false,
    count,
    reason: count === 0 ? "anchor missing — cannot inject" : `anchor matches ${count}× — ambiguous, refusing to inject`,
  };
}

/**
 * ── THE SECOND RESOLVER ────────────────────────────────────────────────────────────────────
 *
 * ⛔ WHY A SECOND ONE EXISTS, AND WHY THE ANSWER WAS NOT "RAISE THE CEILING". `resolveAnchor`
 * answers one question — *does this exact string sit in this file exactly once?* A harness whose
 * subject is a PATH rather than a string in a file cannot be audited by it at all, and on
 * 2026-09-08 that gap was paid for the wrong way: `test:red-anchors` §4's ratchet was raised
 * 65 → 66 to make room for `red-route-census.mjs`, whose case 1 creates a `page.tsx` that does not
 * exist yet. A ratchet that gets raised is not a ratchet.
 *
 * ⚠️ AND THE BUMP WAS WRONG ON ITS OWN TERMS. Re-derived from history, not from the comment that
 * was left at the constant:
 *
 *     37f8ed2e   ceiling 65 · real 65     ← the last legitimately green state
 *     adc3718f   ceiling 66 · real 67     ← RED the moment it merged, and red ever since
 *
 * TWO harnesses landed in that merge, from two sessions working the same day: `red:route-census`
 * and `red:lipa-qr`. The bump counted only the one its author could see, and the note beside it
 * still claims "the one addition is red-route-census.mjs" — false from the instant the other
 * branch merged. 🎯 **A ratchet constant bumped by one session is wrong as soon as a second
 * session merges its own addition.** Neither session can see the other's at bump time, which is
 * the argument for never bumping: the count comes DOWN to the constant, never the reverse.
 *
 * ⭐ WHAT THIS RESOLVER ACTUALLY CATCHES, so it is not ceremony. A path-mutation fails in two
 * directions and BOTH of them fail silently:
 *
 *   · a CREATION whose target already exists — `red-route-census.mjs` writes
 *     `src/app/__red_census_probe__/page.tsx` and undoes itself with a recursive delete of the
 *     directory. If that path were ever real, the harness would overwrite a live file and then
 *     remove it, and its own restore check would report the tree clean.
 *   · a mutation on an asset that has MOVED — `lipa-qr-red.mjs` finds its QR with
 *     `readdirSync(dir).find(/^selcom-lipa-qr\./)` and returns a string when it finds nothing.
 *     Rename the asset and the case stops planting its defect while the harness still runs.
 *
 * Both are the same disease as a rotted string anchor: the harness keeps reporting, and what it
 * reports stops being about the product.
 *
 * @param {(rel: string) => boolean} exists  a path predicate, injected so this stays pure and the
 *                                           auditor above it can keep its "never touches disk in
 *                                           anger" property and be unit-tested against a fixture.
 * @param {{path: string, presence: "present" | "absent"}} claim
 * @returns {{ok: true, path: string} | {ok: false, reason: string}}
 */
export function resolvePath(exists, claim) {
  const { path, presence } = claim ?? {};
  if (typeof path !== "string" || path.length === 0) {
    return { ok: false, reason: "path-mutation declares no path — nothing to audit" };
  }
  if (presence !== "present" && presence !== "absent") {
    // ⛔ NOT A DEFAULT. Guessing "present" would silently pass every creation-mutation, which is
    // the exact case this resolver was written for.
    return { ok: false, reason: `${path}: presence must be declared "present" or "absent", got ${JSON.stringify(presence)}` };
  }
  const here = exists(path);
  if (presence === "present") {
    return here
      ? { ok: true, path }
      : { ok: false, reason: `${path} is missing — the mutation cannot plant its defect, and it fails by returning a string rather than throwing` };
  }
  return here
    ? { ok: false, reason: `${path} already exists — a creation-mutation would overwrite it and its undo would delete it` }
    : { ok: true, path };
}

/**
 * The whole mutation in one call: returns the mutated source, or throws with a reason the caller
 * can print as a FAILURE. Never returns the source unchanged — a silent no-op is the bug this
 * module exists to prevent.
 */
export function injectDefect(src, from, to) {
  const a = resolveAnchor(src, from);
  if (!a.ok) throw new Error(a.reason);
  const mutated = src.replace(a.needle, toEol(to, a.eol));
  if (mutated === src) throw new Error("mutation produced an identical file — the defect was not injected");
  return mutated;
}
