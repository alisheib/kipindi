/**
 * MUTATIONS for `npm run red:route-census` — the RED proof of `npm run test:route-census`.
 *
 * ⛔ WHY THIS FILE EXISTS. It was declared IMPOSSIBLE in writing, at
 * `scripts/red-anchors.test.mts` §4, and the claim was used to justify raising a ratchet:
 *
 *     "Its mutations are NOT source anchors and an anchors file for it would be a fiction:
 *      case 1 CREATES a page.tsx that does not exist, case 2 deletes a route's ruling from a
 *      MARKDOWN table, and case 3 renames a heading in that same document. red-anchor.mjs
 *      resolves a `from` string against a source file — there is no source file for 'a route
 *      that has not been written yet'."
 *
 * ⭐ TWO THIRDS OF THAT WAS NEVER TRUE, and it is worth naming because the wrong half is what
 * bought the bump. Cases 2 and 3 are ordinary exact-string anchors that happen to live in a
 * `.md` instead of a `.ts` — `resolveAnchor` neither knows nor cares which, and both resolve
 * exactly once today (measured, not assumed). Only case 1 was genuinely unanchorable, and it
 * needed **one** new resolver rather than a ceiling that goes up. `resolvePath` in
 * `red-anchor.mjs` now audits it; the reasoning lives in that file's header.
 *
 * ⚠️ CASE 1'S DECLARED PROPERTY IS *ABSENCE*, AND THAT IS THE WHOLE POINT. The harness writes
 * `__red_census_probe__/page.tsx` and undoes itself with a RECURSIVE DELETE of the directory. If
 * that path ever became real, the harness would overwrite a live route and then remove it — and
 * its own restore check, which compares the doc and looks for the probe dir's absence, would
 * report the tree perfectly clean. `presence: "absent"` is the assertion that stops that.
 *
 * ⛔ THESE ANCHORS POINT INTO `docs/PLAYER-QUERY-CAMPAIGN.md`, WHICH IS AN ACTIVELY EDITED BOARD.
 * If §4's heading is renamed or the `/agent/status` ruling is reworded, both this file and the
 * harness go with it in the SAME commit. That coupling is not a weakness of declaring them — it
 * is the coupling that already existed, now visible to `test:red-anchors` instead of discovered
 * the next time somebody runs the harness.
 *
 * ⚠️ `/agent/status` IS THE SUBJECT FOR A MEASURED REASON, kept here because it is the kind of
 * thing that gets "simplified" back: the first draft used `/help` and stayed GREEN, and the gate
 * was RIGHT — `/help` is named TWICE in §4, so deleting the table row left the real ruling
 * standing. `/agent/status` is named exactly once.
 */
export const MUTATIONS = [
  {
    /**
     * 🔴 A ROUTE SHIPS WITH NO RULING — the defect the census exists for. The path is
     * deliberately absurd so it cannot collide with a real route, and `presence: "absent"` is
     * what keeps that guarantee honest instead of merely intended.
     */
    name: "route-ships-without-a-ruling",
    kind: "path",
    presence: "absent",
    path: "src/app/__red_census_probe__/page.tsx",
    dir: "src/app/__red_census_probe__",
    content: "export default function Probe() { return null; }\n",
    expect: "NO RULING for: /__red_census_probe__",
  },
  {
    /**
     * 🔴 THE SAME DEFECT FROM THE OTHER SIDE — a ruling removed while the route stays on disk,
     * which is how a census goes stale during a refactor. See the header for why this is
     * `/agent/status` and not `/help`.
     */
    name: "ruling-deleted-from-the-census",
    file: "docs/PLAYER-QUERY-CAMPAIGN.md",
    from: "`/agent` · `/agent/apply` · `/agent/status`",
    to: "`/agent` · `/agent/apply`",
    expect: "NO RULING for: /agent/status",
  },
  {
    /**
     * 🔴 THE GATE'S OWN EYESIGHT. Rename the heading the gate slices on and every route reads as
     * undeclared — but the assertion that must fire FIRST is the CONTROL, because a gate that
     * cannot see its own subject has to say so rather than report 52 findings it invented.
     */
    name: "census-section-cannot-be-parsed",
    file: "docs/PLAYER-QUERY-CAMPAIGN.md",
    from: "## §4 — THE CENSUS",
    to: "## §4x — THE CENSUS",
    expect: "2.2 CONTROL",
  },
];
