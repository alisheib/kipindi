/**
 * WHERE THE CURRENT HANDOFF IS — ONE locator, because three copies of it drifted apart.
 *
 * ── THE HISTORY THIS FILE EXISTS TO END ─────────────────────────────────────
 * `docs/LIVE-QA-CAMPAIGN.md` §6b is append-at-the-top, so "the handoff a next session will act
 * on" is the FIRST one in the file. Two guards (`test:tracker-hygiene` §2 and
 * `test:settlement-expectation` §5) and one RED harness (`tracker-hygiene-red.mjs`) each carried
 * their OWN copy of the pattern that finds it, and it has now drifted FOUR times:
 *
 *  1. `/RESUME AT:/` matched §0.1a's *prose about this very rule*, which sits in §0 and so comes
 *     first — one guard failed on a correct document, the other stayed green while its check
 *     count silently fell from 14 to 8.
 *  2. Re-anchoring on the literal marker text broke it again **in the same edit**, because the
 *     note explaining the fix *quoted* the marker.
 *  3. `^⏭️ \*\*RESUME AT:` could not match the marker once it began being written as a HEADING
 *     (`#### ⏭️ …`), so both guards validated a SUPERSEDED handoff for two sessions.
 *  4. 🔴 **AND IT DRIFTED A FOURTH TIME, FOUND 2026-08-06.** From session 23 the marker carries
 *     its session number — `⏭️ **RESUME AT (session 32):**` — which `RESUME AT:` cannot match.
 *     All **eight** most recent handoffs were invisible to both guards, which fell through to a
 *     block from **session ~16** about a market settled days earlier. Measured, not inferred:
 *     the pattern's first match was `⏭️ **RESUME AT:** ⓪ THE MONEY ALREADY IN FLIGHT…`, and the
 *     RED harness "proving" §2 was mutating that same dead block — so the proof was as stale as
 *     the check. **A guard and its own RED proof can agree with each other and both be wrong.**
 *
 * ⭐ THE TWO RULES THAT COME OUT OF IT, and they outrank the pattern itself:
 *  · **Anchor on the STRUCTURE, and admit every form the structure legitimately takes.** The
 *    marker is `⏭️ **RESUME AT` at the start of a line. Whether it is also a heading, and
 *    whatever it says after those words, it is the same marker. Prose can mention any string but
 *    cannot begin a line with it. Nothing here matches on the punctuation that follows.
 *  · **ONE definition, imported.** Every previous fix was applied to one copy and propagated the
 *    *next* bug to the others by copy-paste. Both suites and the RED harness now import this.
 *
 * ⛔ AND IT NO LONGER READS A FIXED NUMBER OF CHARACTERS. The old guards took the first 600/900
 * characters after the marker; the current handoff is ~9,000, so ~90% of the instruction a
 * session is told to act on was never checked by anything. The window is now the whole block —
 * marker to the next heading.
 */

/**
 * The marker, as a structural fact: line start, optional heading hashes, the arrow, `**RESUME AT`.
 * ⛔ Nothing after `AT` is part of the anchor — that is where every previous version broke.
 */
export const HANDOFF_MARKER = /^#{0,4} ?⏭️ \*\*RESUME AT\b/m;

/**
 * The CURRENT handoff, plus the evidence that it really is the current one.
 *
 * @returns {{ text: string, marker: string, index: number, found: boolean, stale: boolean, total: number }}
 *   · `text`   the whole block, marker → the next heading (never a fixed character count)
 *   · `found`  false ⇒ the marker format changed. A hard failure, never a silent "".
 *   · `stale`  true ⇒ the marker matched, but NOT inside §6b's topmost block — i.e. exactly the
 *              failure that happened three times. Callers must treat it as a failure.
 *   · `total`  how many line-initial markers the document holds, for diagnostics.
 */
export function locateHandoff(doc) {
  const empty = { text: "", marker: "", index: -1, found: false, stale: false, total: 0 };
  const total = (doc.match(/^#{0,4} ?⏭️ \*\*RESUME AT\b/gm) ?? []).length;
  const m = doc.match(HANDOFF_MARKER);
  if (!m || m.index == null) return { ...empty, total };

  const start = m.index;
  const after = start + m[0].length;
  // The block runs to the next heading of any depth. A handoff's instruction list is the last
  // thing in its block; anything under a further heading belongs to the next session's entry.
  const rel = doc.slice(after).search(/\n#{2,4} /);
  const text = rel < 0 ? doc.slice(start) : doc.slice(start, after + rel);

  // ⭐ IS IT THE TOPMOST BLOCK? §6b's own rule is that only the first block is current truth, so
  // a locator that finds a marker somewhere further down has failed even though it "found" one.
  // This is the check that would have caught all four drifts above on the day they happened.
  const sectionAt = doc.search(/^## 6b\./m);
  let stale = sectionAt < 0 || start < sectionAt;
  if (!stale) {
    const rest = doc.slice(sectionAt);
    const heads = [...rest.matchAll(/^### /gm)].map((h) => sectionAt + (h.index ?? 0));
    // The marker must sit inside the FIRST `###` block of §6b: after the first heading and
    // before the second. With fewer than two headings there is only one block, so any hit is it.
    if (heads.length >= 2 && !(start > heads[0] && start < heads[1])) stale = true;
  }

  return { text, marker: m[0], index: start, found: true, stale, total };
}
