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
