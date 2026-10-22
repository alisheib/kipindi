/**
 * The Maswali Millionea rules' version — ONE module, imported by `/legal/rules/millionea` (which prints it), so the
 * version a player reads and the version a ticket records cannot diverge (`terms-version.ts`'s lesson: two literals in two
 * files drifted twice, once live).
 *
 * ⭐ WHAT A TICKET RECORDS. OD-18: the Millionea rules bind only on purchase, with the version stamped on each ticket.
 *    `MaswaliTicket.rulesVersion` is written by the purchase (`maswali-money-service.ts`) as the week's code and the instant
 *    its figures froze; the binding text a ticket was bought under is the version printed here at that instant. ⏳ The
 *    stamp takes this constant beside the week's mark when the lead wires it (MASWALI-BUILD S6, the lane's report).
 * ⭐ `MILLIONEA_RULES_TEXT_SHA` pins a hash of the binding bodies (`millioneaContent` in
 *    `src/app/legal/rules/_content-millionea.tsx`, all three locales) and of `LEGAL_BINDING_LANGUAGE`: the text cannot move
 *    without the hash moving, and the hash cannot be updated without the editor being in THIS file, with the version in
 *    front of them. `npm run test:maswali-fairness` §L — the control `terms-version.ts` carries for the Terms.
 * ⚠️ NOT covered, by design: the figures filled in at render time from the week's own record or the config (the price,
 *    the floor, the fee, the cap from its `rulesSnapshot`; the times from its row; the void hours from its questions —
 *    `millionea-legal.ts`). They are rebuilt for any week from those rows and the config audit.
 * ⛔ IT MOVES ONLY TOGETHER WITH `MILLIONEA_RULES_VERSION`. If §L fails, do NOT paste the new hash and move on: a failure
 *    means the binding text changed, which is exactly the event the version exists to record. Change both in one commit —
 *    or, for a same-day correction inside a version published that day, record it in `COMPLIANCE-DECISIONS.md` and move
 *    only the hash.
 * ⛔ PURE AND IMPORT-FREE: a server component (the page), the purchase and the suites all read it.
 */
// ⭐ 2026-10-23 · PUBLISHED. The version moves at publication, as the entry of 2026-10-18 said: the S6 release carries the
//    rules page to production, where Millionea has been ACTIVE since 2026-10-22 23:32 UTC (the lead's order of 2026-10-23).
//    Version 2026-10-18 was read by staff only and bound no ticket. COMPLIANCE-DECISIONS § "2026-10-23 · The Maswali
//    Millionea rules are published as version 2026-10-23 …".
export const MILLIONEA_RULES_VERSION = "2026-10-23";

/** The first 12 hex of `sha256` over the whitespace-normalised `millioneaContent` bodies, then `LEGAL_BINDING_LANGUAGE`. */
// 2026-10-18 · the hash's history under version 2026-10-18, every value with the lane round that made it and what its move
// gained (every round carried by the legal lane's squash 902afae56, merged at 8620862fc — the round commits left with the
// lane's branch) (a gain a later round reworded is marked so), all of it before anything was served (the product is WITHDRAWN, so
// no player has read 2026-10-18); each move went alone for that reason, and COMPLIANCE-DECISIONS.md records them
// (§ "2026-10-18 · The Maswali Millionea rules' text hash moved four times inside version 2026-10-18"). The version moves
// at publication.
//   707c9f634d7c · first · the binding text as first written (MASWALI-BUILD S6);
//   2c3c95afeeb9 · round 2: only what is built — the check window as built, the final week's exception, the
//                  remainder of a topped-up week ("there is none", revised in rounds 3-5), the open's default time, the
//                  sunset's cases with no regulator refund and no fault void, the week's own times and its questions'
//                  void hours (the void hours revised in round 4), "week id / ticket id", a forfeited share;
//   9f864924a75e · round 3: the stop as `sunsetMaswali` accepts it, the jackpot account after the last week,
//                  the floor-raised remainder ("none of it", revised in round 4), the floor of a 10 of 10 week, a
//                  correction's evidence and second officer ("needs it again", revised in round 4), the counted set,
//                  MR-5 under MR-15's ground, today's settings with a drafted week's caveat (revised in round 4);
//   0812ab00056f · round 4: the remainder as the money moves, today's settings and a week's own figures fixed
//                  at its open, no public week after the last, the withdrawal fee as the current one, a corrected
//                  result's second officer by its original seal;
//   4ed78ea80417 · round 5: the top-up covers only the fee and the shares, a final week's remainder in the
//                  jackpot account, a week's own figures fixed at its open, its close excepted.
//   d5a5e9e3e680 · 2026-10-22, MASWALI-BUILD S6-INT 11 (the lead's ruling D2): the Chinese text names an event 事件, the
//                  decided word, in three places; the English and the Swahili are unchanged. Recorded in
//                  COMPLIANCE-DECISIONS § "2026-10-22 · The Maswali Millionea rules' Chinese text names an event 事件 …".
//   46f7b1b18732 · 2026-10-22, MASWALI-BUILD S6-DOCS 8 (the S6-DOCS brief's open list): §11 states the stale-form rule —
//                  once a week is final, a ticket cannot be bought from a form opened before — in the decided words
//                  `ruleSunset` carries in en/sw/zh. Recorded in COMPLIANCE-DECISIONS § "2026-10-22 · The Maswali
//                  Millionea rules' §11 states the stale-form rule …".
// (`b0bf9a6fa080`, named here for a while, was never held by a commit: a working copy between the first two.)
// 2026-10-23 · VERSION 2026-10-23, the published text (MASWALI-BUILD S6-INT 30; the lead's order of 2026-10-23):
//   8375d7809e2f · §6 states the objection door as S7-OB built it (MR-16) — an uncancelled holder objects to one question from
//                  the ticket's page; an officer with no hand in that result and no ticket in the week rules; the decision
//                  and its note on the ticket; no payout or void while one is undecided; the window restarted by the first
//                  changing ruling only — and §12 points disputes at it; §12 states the hold a reversed payment places on
//                  the shares of the tickets bought with it (MB-74); §11 states the final week's rule in its one wording,
//                  `finalWeekRule`'s, in en/sw/zh. Recorded in COMPLIANCE-DECISIONS § "2026-10-23 · The Maswali Millionea
//                  rules are published as version 2026-10-23 …".
export const MILLIONEA_RULES_TEXT_SHA = "8375d7809e2f";
