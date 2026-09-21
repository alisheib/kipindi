/**
 * COMMIT 5's MUTATION REGISTERS, CONVERTED INTO DECLARED ANCHORS (C5-8 · §2e's sanctioned route · DEFERRED-TESTS §1 row 93).
 *
 * ⛔ WHAT THIS FILE IS FOR. Four registers under `plans/house-bots/tools/` hold 262 id-bearing mutation entries in three
 * incompatible grammars (`c5-s4` 85, `c5-s5` 140, `c5-5b` 25, `c5-s7` 12). They were WRITE-ONLY BY CONSTRUCTION: no file
 * in the repository reads a `*-mutations.json`, and the only two that name the pattern instruct an agent to WRITE one. So
 * every from-text in them could rot — and 92 of the 262 had, silently, by the time anyone looked. §2e decided against
 * building a bespoke three-grammar runner and for CONVERSION into `scripts/anchors/`, because that puts the from-texts
 * under `test:red-anchors` §3, which re-resolves every declaration against the working tree every day and would have
 * reported all 92 as they rotted rather than years later.
 *
 * ⭐ THIS FILE IS THE INSTRUMENT, NOT THE CLAIM. What a declaration here buys is exactly two things and no more:
 *   1. `test:red-anchors` §3 insists the `from` still resolves EXACTLY ONCE against the tree, every run.
 *   2. `test:house-bot-reports` 0.505 walks `scripts/anchors/house*.anchors.mjs` from disk and insists every `suite`
 *      key found here either HAS an expect-drift roll-call or is recorded as owed with its reason.
 * ⛔ DECLARING STILL DOES NOT BUY THE RED — BUT SOMETHING NOW APPLIES THE `to`. Neither of the two instruments above
 * ever applies a replacement: both answer about the `from` and the `expect`, so a truncated `to`, or one whose second
 * site was never converted, passes them while proving nothing. `red:house-bot-c5` (`scripts/red-house-bot-c5.mjs`,
 * added 2026-09-21) is the third thing, and the only one in the repository that WRITES a declaration's `to` into the
 * real file, runs the suite it names, and reads that run's own FAIL lines. ⛔ A mutation that reddens *something else*
 * is reported WRONG-ASSERTION and fails the run — a defect caught by a neighbouring assertion is evidence about the
 * neighbour, never about the assertion this register named.
 * ⚠️ AND THE ANCHOR AUDIT'S COUNT WAS RE-DERIVED ACROSS THAT COMMIT RATHER THAN ASSUMED: `test:red-anchors` §4 reads
 * **66 undeclared at `78bc46ea` (the parent) AND 66 at `6688aed0` (the harness)**, because a harness "declares" when a
 * declaration file's name appears in its command and `house-bot-c5.anchors.mjs` is exactly that. ⛔ So this file and
 * its runner did NOT move the ratchet. §4 is nonetheless RED at 66 against `UNDECLARED_CEILING = 65`, and the break is
 * INHERITED FROM `origin/main`, not made here (DEFERRED-TESTS §1 row 4 records it on both sides, byte-identical):
 * `red:mobile-visual-plan` was added after `18b03e5f` as a file-writing `.mjs` with no anchors file of its own.
 * ⛔ It is not this file's to fix and the ceiling is not this file's to raise.
 *
 * ⚠️ HOW `expect` WAS CHOSEN, AND WHY IT IS NOT DECORATION. A register entry names its assertion by id ("0.187.1",
 * "4.259.3"). An id alone is not evidence, so no entry was ever given a plausible-looking label: every `expect` below
 * was taken from the label literal that assertion carries in its suite's source TODAY, cut before any `${}`
 * interpolation so it matches the line the run actually prints. An `expect` that matched no label would be classed
 * WRONG-ASSERTION by any drive.
 * 🔴 AND THE SENTENCE THAT USED TO STAND HERE WAS A COMPOSITE — REFUTED 2026-09-21, IN THIS FILE, BY MEASUREMENT.
 * It read "29 owed entries name ONLY assertions that no longer exist in the suite they name". That was derived from
 * each entry's FIRST-named assertion family and never from the whole `red` field, and it is FALSE for eight of the
 * 29 and misleading for five more: `S4-M11 M15 M16 M17 M18 M19 M32 M34` each name `0.191.1` AND `0.191.0`
 * explicitly, and both labels exist today in `test:house-bot-reports` — the same suite those entries name
 * (`scripts/lib/house-bot-reports-cases.mts:2547`, `:2551`); `S5-M53 M54 M55 M56 M65` each name
 * `test:house-bot-disclosure 2.v` / `4.c6`, which exist at `:186` and `:269`, and the claim was only literally true
 * because their `suite` FIELD says `test:house-bot-reports`. ⛔ A recorded figure that was never one measurement is
 * the third such composite this programme has found in its own numbers; the split below is re-derived, not inherited.
 *
 * ── THE HONEST SPLIT, re-derived 2026-09-21 against this tree rather than quoted from the previous phase ────────────
 *   262  id-bearing entries across the four registers
 *    -9  already declared and reachable before this phase (`S7-M01..M09`, in `house-bot-console.anchors.mjs`)
 *   -77  MOOT · their subject was deleted, and they are NEVER to be re-anchored:
 *          49 whose whole FILE the D20 un-build deleted in `7c754515` — `src/lib/server/house-bot/exposure.ts` (13),
 *             `src/lib/house-bot/exposure-copy.ts` (28), `src/components/admin/exposure-line.tsx` (6),
 *             `src/app/admin/kyc/[id]/bets-placed.tsx` (2)
 *          28 whose SUBJECT was struck while its file survived — `exposureSlot`, `exposureReadOf`, `ExposureLine`,
 *             `HOUSE_OWNED_AUDIT_ACTIONS`, `isHouseAuditRow`, `houseStakeForAudit`, `houseStakeByMarket`,
 *             `houseBetCount`, `houseStakedTzs`, `botLabels`, `UNGATED_HOUSE_READERS` and their neighbours, none of
 *             which occurs anywhere under `src/` or `prisma/` any more.
 *             ⚠️ AND `scripts/` IS NO LONGER TRUE OF ALL OF THEM, WHICH IS THIS FILE'S OWN DOING (C5-8, 2026-09-21):
 *             `houseBetCount` and `houseStakedTzs` now occur in `scripts/lib/house-bot-reports-cases.mts` as the
 *             NEEDLES of `0.197.2`, exactly as `houseStakeForAudit` and `houseStakeByMarket` already did as 0.191's.
 *             A struck name kept as a needle is how an absence is proved; it is not the subject coming back.
 *             ⭐ `S5-M46` JOINED THIS LIST 2026-09-21 and its count is why 76 became 77. It was filed among the 29
 *             because its `from` still resolves, but its `to` names `exposureSlot` — a STRUCK subject — so the 29's
 *             own rule put it here: ruling 196 is struck (`C5-SPEC.md:1247`, `:2918`; `C5-D20-REPLAN.md:31`) and
 *             `exposureSlot` survives only as an exemption NAME in `EXPOSURE_SLOT_PROPS`.
 *   -69  STILL OWED, and said so rather than padded:
 *          57 rotted from-texts whose subject is alive but whose site could not be identified to a single line (2 of
 *             them now match 5x, which is ambiguous, not resolved)
 *           2 (`S4-M03`, `S4-M51`) that name a SITE a declaration already occupies but an assertion family
 *             (`3.187.4/5/6`, `4.195.1/2/3`) that no longer exists — same site is not same assertion
 *          10 that name a suite no harness can drive: nine under four suites with NO red harness and no roll-call key
 *             (`test:dsar-secrets` 3, `test:house-bot-migrations` 3, `test:house-bot-rules` 2, `test:txn-search` 1),
 *             plus `5b-M11`, whose suite HAS a harness that cannot reach it — `dal-parity.test.mts` reads
 *             `prisma/schema.prisma` from ROOT at `:53` and `:274`, not through `KP_SRC`, so `red:dal-parity`'s
 *             scratch copy never sees it and a declaration there would report NOT CAUGHT.
 *             ⛔ `test:dal-parity` IS NOT ON THAT LIST ANY MORE: `red:dal-parity` exists and so does
 *             `scripts/anchors/dal-parity.anchors.mjs`. Six of its seven are declared THERE — not here, because 0.505
 *             walks `house*.anchors.mjs` and would have gone red on an unlisted key while `ROLL_CALL_OWED`'s pinned
 *             length of 7 may only SHRINK. All ten remaining are named in `DEFERRED-TESTS.md` row 97 with the
 *             measured reason, rather than left silent.
 *   ═══
 *   107  retired — 96 declarations below (97 entries; `S4-M73b` is applied with its primary) covering 99 register
 *          entries (3 pairs are the same edit written into two registers), plus `S4-M05` superseded, plus `S4-M65` in
 *          `officer-hold.anchors.mjs` and six in `dal-parity.anchors.mjs` — each declared where a harness already
 *          drives it rather than where it would only be counted
 *   ⛔ 9 + 77 + 69 + 107 = 262, and the columns move together or not at all.
 * ⚠️ WHAT IN THAT SPLIT THIS PHASE MEASURED, AND WHAT IT CARRIES. Measured here, 2026-09-21: the 29 and the 16 (every
 * `from` re-resolved against this tree, every `red` field read WHOLE rather than by its first family), and every
 * declaration count, read from `MUTATIONS.length` in the three anchors files. Carried from row 93's 2026-09-20
 * re-derivation and NOT re-measured here: the 57 rotted, the 9 already declared, and the 49 + 28 MOOT halves.
 * ⛔ Which is why they are named as carried — a column nobody re-derived is not a column this file measured.
 *
 * ⛔ FIVE OF THESE ARE RE-ANCHORS, MARKED `RE-ANCHORED` IN THEIR NAME. Their register from-text had rotted; the code had
 * moved under them (a binding renamed `n` -> `call`, a cursor renamed `at` -> `top`, a page signature destructured into
 * one `props`). Each names in its own text what it was for and what the new from-text is. ⛔ Where the site could NOT be
 * identified — `S5-M74` and `S5-M76`'s audience gate now matches five times — nothing was invented; they stay owed.
 *
 * ── ALL 96 PRIMARIES ARE DRIVEN, AND THE ELEVEN BELOW ARE WHY TWO OF THEM ARE RIGHT ─────────────────────────────
 * ⭐ THE WHOLE SET, IN ONE RUN: `npm run red:house-bot-c5` at `b4c05417` reported 96 caught, 0 wrong-assertion,
 * 0 missed, 0 stale, 0 files left dirty, across all 34 distinct assertions this file declares (re-derived from
 * `MUTATIONS` in the same pass: 97 entries, 96 primaries, `S4-M73b` applied with its own). ⛔ DO NOT QUOTE THAT
 * LINE — re-run the command; it is the only thing that can say it, and it moves whenever a declaration does.
 * ⚠️ Two figures preceded it and BOTH are on the record rather than overwritten. The first was a COMPOSITE
 * (65 caught + 4 wrong-assertion, then 7 repaired entries re-driven, summed to "69 of 69") — the sum was right; it
 * was never a run. The second WAS one run, of 69 primaries at `fc92867a`, and it went stale the moment C5-8's
 * disposition added 27 declarations. DEFERRED-TESTS §1 row 96 carries the first two, and the three controls —
 * WRONG-ASSERTION, MISSED and a true CAUGHT — that prove this harness still reports a failure.
 * ⭐ AND THE 0.505b ROLL-CALL WAS SEEN CATCHING A DRIFTED `expect` IN THIS VERY PASS, which is better evidence than
 * any claim made for it: correcting 0.m5.1's label (it had said "the emergency-void confirmation … at BOTH of its
 * sites", when the two `// audit M5` fan-outs are DIFFERENT notifications) left `S4-M61`'s `expect` matching no
 * label, and the memory child reported it `stale` by name on the next run, before any drive.
 *
 * ── THE ELEVEN THE FIRST SAMPLE DRIVE APPLIED, 2026-09-21, KEPT BECAUSE OF WHAT THEY FOUND ───────────────────────
 * ⛔ AN ANCHOR THAT RESOLVES IS NOT AN ASSERTION THAT WENT RED, so a sample was applied for real: the mutation
 * written into the file, `npx tsx scripts/lib/house-bot-reports-cases.mts` run on the memory child, the FAIL lines
 * read, `git checkout --` and `git diff --quiet` after every single one (the tree was verified clean at the close of
 * each batch). Eleven entries across eight assertion families:
 *
 *   5b-M1   -> 0.187.1  (+0.191.0, 0.187.c1)   S4-M73+M73b -> 0.191.1  (+0.191.0)   S5-M48  -> 0.198.1  (+2)
 *   5b-M4   -> 0.191.1  (+0.191.0)             S5-M70      -> 4.259.2  (+4.260.2)   S5-M105 -> 4.260.1  (+the 4.260 family)
 *   5b-M5   -> 0.191.2  ALONE                  S5-M111     -> 0.260.1  ALONE        S5-M128 -> 0.260.c1 (+0.260.c2)
 *   5b-M7   -> 0.198.2  (+2)                   S5-M132     -> 0.260.c2 (+0.260.1)
 *
 * Eleven of eleven reddened the assertion they name. Where a second assertion went red with it, the register had
 * already predicted the pair (`S5-M70` names 4.259.2 AND 4.260.2; `5b-M4` names 0.191.1 AND 0.191.0) or the second is
 * a CONTROL whose plant list is derived from the real files on disk, which the register also records.
 *
 * 🔴 AND THE TWO THE DRIVE CAUGHT, both of which had RESOLVED perfectly and proved nothing:
 *   · `5b-M4` had a replacement a THIRD of its real length. The register writes it as three parts joined by its own
 *     line-break marker and the extractor took only the first, so the declaration DELETED the notify call instead of
 *     inserting a guard above it. It went red on 0.191.0 alone — WRONG-ASSERTION. Whole, it reddens both.
 *   · `S4-M73` is written "(a) the call AND (b) the helper" and only (a) had been converted. A call to an undefined
 *     `choseStake` names no requester token, so it printed NO FAIL LINE AT ALL — MISSED. Its second site is now
 *     declared beside it with `combineInto`; together they redden 0.191.1.
 * ⭐ Both were invisible to `test:red-anchors` §3 and to the 0.505b roll-call, because both instruments answer about
 * the `from` and the `expect` and neither applies the `to`. ⛔ That is the size of the gap row 96 names.
 *
 * ⛔ A RED ANCHOR QUOTES SOURCE. Editing one of these lines must be paired with re-anchoring here — that is the whole
 * point of declaring, and `test:red-anchors` §3 will say so the same day.
 */

const HOUSE_BOT_DISCLOSURE_TEST = "scripts/house-bot-disclosure.test.mts";
const HOUSE_BOT_REPORTS_CASES = "scripts/lib/house-bot-reports-cases.mts";
const ID_PAGE = "src/app/admin/agents/[id]/page.tsx";
const APPROVALS_PAGE = "src/app/admin/approvals/page.tsx";
const AUDIT_PAGE = "src/app/admin/audit/page.tsx";
const COMPLIANCE_PAGE = "src/app/admin/compliance/page.tsx";
const CONFIG_PAGE = "src/app/admin/config/page.tsx";
const ID_PAGE_2 = "src/app/admin/kyc/[id]/page.tsx";
const LIVE_PAGE = "src/app/admin/live/page.tsx";
const MARKETS_EMERGENCY_VOID_CONTROL = "src/app/admin/markets/emergency-void-control.tsx";
const ADMIN_PAGE = "src/app/admin/page.tsx";
const ID_PAGE_3 = "src/app/admin/players/[id]/page.tsx";
const REPORTS_PAGE = "src/app/admin/reports/page.tsx";
const RESOLVER_QUEUE_BULK_RESOLVE_ACTION = "src/app/admin/resolver-queue/bulk-resolve-action.ts";
const RESOLVER_QUEUE_PAGE = "src/app/admin/resolver-queue/page.tsx";
const ID_PAGE_4 = "src/app/admin/resolver/[id]/page.tsx";
const RETENTION_PAGE = "src/app/admin/retention/page.tsx";
const ID_PAGE_5 = "src/app/admin/staff/[id]/page.tsx";
const SYSTEM_PAGE = "src/app/admin/system/page.tsx";
const MARKETS_RESOLUTION_PANEL = "src/components/markets/resolution-panel.tsx";
const EMAIL = "src/lib/server/email.ts";
const HOUSE_CONSOLE_READ = "src/lib/server/house-console-read.ts";
const MARKET_SERVICE = "src/lib/server/market-service.ts";
const NOTIFICATION_SERVICE = "src/lib/server/notification-service.ts";
const OBJECTIONS_SERVICE = "src/lib/server/objections-service.ts";
const USER_SERVICE = "src/lib/server/user-service.ts";
/* ── C5-8 · the files the 29 owed entries reach that no declaration here had named before ───────────────── */
const UPDOWN_SERVICE = "src/lib/server/updown-service.ts";
const HOUSE_BOT_VOCABULARY = "scripts/lib/house-bot-vocabulary.mjs";
const KYC_RISK = "src/lib/server/kyc-risk.ts";
const KYC_DECISION_RAIL = "src/app/admin/kyc/[id]/kyc-decision-rail.tsx";
const KYC_ACTIONS = "src/app/admin/kyc/[id]/kyc-actions.ts";

export const MUTATIONS = [
  /* ══ c5-5b ═══════════════════════════════════════════════════════════════════════════════════════════ */
  {
    name: "c5-5b:M1 · a new R9 audit site appears where D20 allows none.",
    file: MARKET_SERVICE,
    from: "      payload: { reason, refundedCount, refundedTzs, grossPoolBefore: grossPool, title: m.titleEn },",
    to: "      payload: { reason, refundedCount, refundedTzs, grossPoolBefore: grossPool, title: m.titleEn, houseStake: null },",
    expect: "0.187.1 · ⛔ OWNER RULING D20 · not one audit write in src/ carries houseStake or houseStakes — in its payload, outside it, or through a spread — and the reader is read over every audit call there is",
    suite: "reports-mem",
  },
  {
    name: "c5-5b:M2 · the bulk Batch row carries a house key again.",
    file: RESOLVER_QUEUE_BULK_RESOLVE_ACTION,
    from: "        note: \"Bulk resolve from /admin/resolver-queue. Every market was sealed through resolveMarket — the same path, locks, ceremony, objection window and settle timer as the per-market control. No money moved in this action.\",",
    to: "        note: \"Bulk resolve from /admin/resolver-queue. Every market was sealed through resolveMarket — the same path, locks, ceremony, objection window and settle timer as the per-market control. No money moved in this action.\",\n        houseStakes: {},",
    expect: "0.187.1 · ⛔ OWNER RULING D20 · not one audit write in src/ carries houseStake or houseStakes — in its payload, outside it, or through a spread — and the reader is read over every audit call there is",
    suite: "reports-mem",
  },
  {
    name: "c5-5b:M3 · a SECOND struck R9 site, in another of the 21 decision files. (Replaces the implementer's M3, which planted a whole new file under src/app/admin/: rev",
    file: OBJECTIONS_SERVICE,
    from: "  payload: { objectionId, objectorId: o.userId, reason: o.reason, note: reviewNote, effect: \"verdict stands; settlement released\" },",
    to: "  payload: { objectionId, objectorId: o.userId, reason: o.reason, note: reviewNote, effect: \"verdict stands; settlement released\", houseStake: null },",
    expect: "0.187.1 · ⛔ OWNER RULING D20 · not one audit write in src/ carries houseStake or houseStakes — in its payload, outside it, or through a spread — and the reader is read over every audit call there is",
    suite: "reports-mem",
  },
  {
    name: "c5-5b:M4 · a refusal branch in a decision service reads a requester, and a struck reader's name reappears in one of the 21 decision files",
    file: OBJECTIONS_SERVICE,
    from: "  notifyObjectionDecided(o.userId, { upheld: false, marketId: o.marketId, note: reviewNote }).catch(() => {});",
    to: "  const snap = await houseStakeForAudit(o.marketId);\n  if (snap?.staffChosen.requestedBy.includes(officerId)) return { ok: false as const, error: \"You chose a stake on this market.\", code: \"CONFLICT\" as const };\n  notifyObjectionDecided(o.userId, { upheld: false, marketId: o.marketId, note: reviewNote }).catch(() => {});",
    expect: "0.191.1 · ⛔ TGT-38 · in every service and action a requester token, a reader's binding or a carrier appears only as an import, the read, its binding, the bulk map, an audit payload value or the map write — never in a condition, a predicate, a helper's return, a result or another call",
    suite: "reports-mem",
  },
  {
    name: "c5-5b:M5 · RE-ANCHORED · the register anchored the destructured signature; the page now takes one `props` object",
    file: RESOLVER_QUEUE_PAGE,
    from: "export default async function ResolverQueuePage(props: ResolverQueuePageProps) {",
    to: "export default async function ResolverQueuePage(props: ResolverQueuePageProps) { const requestedBy = props;",
    expect: "0.191.2 · ⛔ no decision page names requestedBy or byRequester at all (I10: nothing on the page knows who chose a stake)",
    suite: "reports-mem",
  },
  {
    name: "c5-5b:M6 · the struck display reader's call count is no longer 0, and the audit read no longer goes through houseAuditForConsole. (Single-file replacement for th" /* (and c5-5b:M18, the same edit written twice) */,
    file: AUDIT_PAGE,
    from: "  const allEntries = await houseAuditForConsole(session?.userId ?? null, \"/admin/audit\", getAuditPage({ limit: 100_000 }));",
    to: "  const allEntries = await houseStakeForConsole(session?.userId ?? null, \"/admin/audit\", getAuditPage({ limit: 100_000 }));",
    expect: "0.260.1 · ⛔ D19 · every audit row a console file reads — every file under src/app/admin/, src/app/api/admin/ and src/components/admin/, read from disk, and every row reader the audit module exports, its exports classified to the last name — goes straight to houseAuditForConsole; EVERY call of every gate export names the signed-in viewer and the file's own console route; the three struck display readers (D20) are called NOWHERE; no console file reaches the audit module or the gate by import(), a namespace or a re-export, and none imports a house read module — or keeps what one returns — outside the system page's engine card (only the fire-and-forget holder and money hooks read nothing back); and every file OUTSIDE the console that calls a row reader is classified",
    suite: "reports-mem",
  },
  {
    name: "c5-5b:M7 · the ADMIN twin beside the player's notice carries ruling 195's house clause again.",
    file: NOTIFICATION_SERVICE,
    from: "    bodySw: `Soko limefutwa kwa dharura. ${formatTzs(opts.refundedTzs)} imerejeshwa.`,",
    to: "    bodySw: `Soko limefutwa kwa dharura. ${formatTzs(opts.refundedTzs)} imerejeshwa, ikiwemo dau la nyumba.`,",
    expect: "0.198.2 · ⛔ the player's cancellation notice, the objector's decision notice, both verdict notices and the player's refund letter name no house reader, carry no house word and keep the bodies measured before step 5 — and, since owner ruling D20 un-built ruling 195's clause, neither does the ADMIN twin beside them",
    suite: "reports-mem",
  },
  {
    name: "c5-5b:M24 · single store. NEW with the fixer's re-anchor (review d19-hunt-04): C5-5b had deleted 4.c7, leaving every control on a virtual tree.",
    file: HOUSE_BOT_DISCLOSURE_TEST,
    from: "  if (spec.startsWith(\"@/\")) base = P.join(srcRoot, spec.slice(2));",
    to: "  if (spec.startsWith(\"@/\")) return null;",
    expect: "4.c7 · CONTROL · over the REAL tree: a planted client file importing a real house copy module through the @/ alias reaches src/lib/house-bot/pause-reasons.ts on disk and its house words are reported — the resolver and the strip are proven on the tree §1 measures, not only on a virtual one",
    suite: "disclosure",
  },
  /* ══ c5-s4 ═══════════════════════════════════════════════════════════════════════════════════════════ */
  {
    name: "c5-s4:S4-M33 · seen red at c17fbb37",
    file: MARKET_SERVICE,
    from: "      payload: { reason: \"Sentinel/resolve-trigger closure overridden by admin — market back to LIVE\" },",
    to: "      payload: { reason: \"Sentinel/resolve-trigger closure overridden by admin — market back to LIVE\", houseStake: await houseStakeForAudit(m.id) },",
    expect: "0.187.1 · ⛔ OWNER RULING D20 · not one audit write in src/ carries houseStake or houseStakes — in its payload, outside it, or through a spread — and the reader is read over every audit call there is",
    suite: "reports-mem",
  },
  {
    name: "c5-s4:S4-M37 · a decision page names requestedBy",
    file: RESOLVER_QUEUE_PAGE,
    from: "export function humanDuration(ms: number): string {",
    to: "export const chosenByViewer = (v: { staffChosen: { requestedBy: string[] } }, me: string) => v.staffChosen.requestedBy.includes(me);\nexport function humanDuration(ms: number): string {",
    expect: "0.191.2 · ⛔ no decision page names requestedBy or byRequester at all (I10: nothing on the page knows who chose a stake)",
    suite: "reports-mem",
  },
  {
    name: "c5-s4:S4-M38 · a client control names houseStake",
    file: MARKETS_EMERGENCY_VOID_CONTROL,
    from: "export function EmergencyVoidControl({ marketId, title }: { marketId: string; title: string }) {",
    to: "export function EmergencyVoidControl({ marketId, title }: { marketId: string; title: string; houseStake?: number }) {",
    expect: "0.191.3 · ⛔ the four client controls and the ceremony name none of the requester tokens",
    suite: "reports-mem",
  },
  {
    name: "c5-s4:S4-M43 · ⛔ TGT-38 · in every service and action a requester token, a reader's binding or a carrier appears only as an import, the read,…",
    file: MARKET_SERVICE,
    from: "      notifyMarketCancelled(p.userId, { stake: p.stake, marketTitle: localizedText(m.titleEn, m.titleSw, m.titleZh), marketId: m.id, reason, positionId: p.id });",
    to: "      notifyMarketCancelled(p.userId, { stake: p.stake, marketTitle: localizedText(m.titleEn, m.titleSw, m.titleZh), marketId: m.id, reason: houseStake && houseStake.yes + houseStake.no > 0 ? `${reason}.` : reason, positionId: p.id });",
    expect: "0.191.1 · ⛔ TGT-38 · in every service and action a requester token, a reader's binding or a carrier appears only as an import, the read, its binding, the bulk map, an audit payload value or the map write — never in a condition, a predicate, a helper's return, a result or another call",
    suite: "reports-mem",
  },
  {
    name: "c5-s4:S4-M44 · ⛔ TGT-38 · in every service and action a requester token, a reader's binding or a carrier appears only as an import, the read,…",
    file: MARKET_SERVICE,
    from: "        html: marketCancelledRefundHtml({ title: m.titleEn, reason, amount: p.stake, reference: p.id }),",
    to: "        html: marketCancelledRefundHtml({ title: m.titleEn, reason: houseStake && houseStake.yes + houseStake.no > 0 ? `${reason}.` : reason, amount: p.stake, reference: p.id }),",
    expect: "0.191.1 · ⛔ TGT-38 · in every service and action a requester token, a reader's binding or a carrier appears only as an import, the read, its binding, the bulk map, an audit payload value or the map write — never in a condition, a predicate, a helper's return, a result or another call",
    suite: "reports-mem",
  },
  {
    name: "c5-s4:S4-M71 · conformance-04, seen red",
    file: MARKET_SERVICE,
    from: "      soloResolved,",
    to: "      soloResolved: soloResolved || (houseStake != null && houseStake.yes + houseStake.no > 0),",
    expect: "0.191.1 · ⛔ TGT-38 · in every service and action a requester token, a reader's binding or a carrier appears only as an import, the read, its binding, the bulk map, an audit payload value or the map write — never in a condition, a predicate, a helper's return, a result or another call",
    suite: "reports-mem",
  },
  {
    name: "c5-s4:S4-M72 · conformance-02, seen red",
    file: MARKET_SERVICE,
    from: "    return { ok: true as const, data: { refundedCount, refundedTzs } };",
    to: "    return { ok: true as const, data: { refundedCount, refundedTzs, houseStake } };",
    expect: "0.191.1 · ⛔ TGT-38 · in every service and action a requester token, a reader's binding or a carrier appears only as an import, the read, its binding, the bulk map, an audit payload value or the map write — never in a condition, a predicate, a helper's return, a result or another call",
    suite: "reports-mem",
  },
  {
    name: "c5-s4:S4-M73 · a decision service's refusal branch reads the requester (test-strength-01, seen red) · HALF (a): the call",
    file: OBJECTIONS_SERVICE,
    from: "  // Separation of duties — an officer cannot rule on their own objection.",
    to: "  if (await choseStake(o.marketId, officerId)) return { ok: false, error: \"You chose a stake on this market.\", code: \"CONFLICT\" };\n  // Separation of duties — an officer cannot rule on their own objection.",
    expect: "0.191.1 · ⛔ TGT-38 · in every service and action a requester token, a reader's binding or a carrier appears only as an import, the read, its binding, the bulk map, an audit payload value or the map write — never in a condition, a predicate, a helper's return, a result or another call",
    suite: "reports-mem",
  },
  {
    /* ⛔ HALF OF A TWO-SITE MUTATION REDDENS NOTHING, AND THIS ONE WAS MEASURED DOING IT. The register writes S4-M73
     * as "(a) … AND (b) …": the call, and the helper the call needs. Declared as half (a) alone it was driven on
     * 2026-09-21 and printed NO FAIL LINE AT ALL — `choseStake` is simply undefined, names no requester token, and
     * the scan has nothing to report. `combineInto` is what the drives apply a paired edit with, so the two halves
     * go in together or neither does. */
    name: "c5-s4:S4-M73b · HALF (b): the helper half (a) calls — the requester read itself",
    file: OBJECTIONS_SERVICE,
    from: "export async function rejectObjection(",
    to: "async function choseStake(marketId: string, officerId: string): Promise<boolean> {\n  const v = await houseStakeForAudit(marketId);\n  return (v?.staffChosen.requestedBy ?? []).includes(officerId);\n}\n\nexport async function rejectObjection(",
    combineInto: "c5-s4:S4-M73 · a decision service's refusal branch reads the requester (test-strength-01, seen red) · HALF (a): the call",
    expect: "0.191.1 · ⛔ TGT-38 · in every service and action a requester token, a reader's binding or a carrier appears only as an import, the read, its binding, the bulk map, an audit payload value or the map write — never in a condition, a predicate, a helper's return, a result or another call",
    suite: "reports-mem",
  },
  {
    name: "c5-s4:S4-M74 · conformance-01/test-strength-03, seen red",
    file: RESOLVER_QUEUE_PAGE,
    from: "export function humanDuration(ms: number): string {",
    to: "export function LockedIfMine({ view, me, canResolve, marketId }: { view: unknown; me: string; canResolve: boolean; marketId: string }) {\n  const mine = viewerClause(view, me);\n  return canResolve && !mine ? <ResolveControls marketId={marketId} /> : null;\n}\nexport function humanDuration(ms: number): string {",
    expect: "0.191.4 · ⛔ TGT-38 · no decision page's condition reads the house stake or the viewer's share of it to show, hide, lock or feed a decision control — and the pin sees each page's controls (a renamed control cannot blind it)",
    suite: "reports-mem",
  },
  {
    name: "c5-s4:S4-M77 · test-strength-09, seen red",
    file: MARKET_SERVICE,
    from: "      aiDetermined: !!a?.determined,",
    to: "      houseStake: null,\n      aiDetermined: !!a?.determined,",
    expect: "0.187.1 · ⛔ OWNER RULING D20 · not one audit write in src/ carries houseStake or houseStakes — in its payload, outside it, or through a spread — and the reader is read over every audit call there is",
    suite: "reports-mem",
  },
  {
    name: "c5-s4:S4-M78 · seen red together with M79",
    file: HOUSE_BOT_REPORTS_CASES,
    from: "    else if (ts.isConditionalExpression(n) && reads(n.condition)) say(\"a ternary reads a requester value:\", n.condition);",
    to: "",
    expect: "0.191.c5 · CONTROL · the ternary and the && / || detectors each answer on their own: a multi-line ternary with no ok:false is reported as exactly one ternary, and an && with no ok:false as exactly one && operand",
    suite: "reports-mem",
  },
  {
    name: "c5-s4:S4-M79 · seen red together with M78",
    file: HOUSE_BOT_REPORTS_CASES,
    from: "    else if (ts.isBinaryExpression(n) && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken].includes(n.operatorToken.kind) && (reads(n.left) || reads(n.right))) say(\"an && / || operand reads a requester value:\", n);",
    to: "",
    expect: "0.191.c5 · CONTROL · the ternary and the && / || detectors each answer on their own: a multi-line ternary with no ok:false is reported as exactly one ternary, and an && with no ok:false as exactly one && operand",
    suite: "reports-mem",
  },
  {
    name: "c5-s4:S4-M80 · seen red at 648ffe41 (the six branch removals ran together, each red on its own control)",
    file: HOUSE_BOT_REPORTS_CASES,
    from: "    if (inTypePosition(id)) return \"a type\";",
    to: "",
    expect: "0.191.c3 · CONTROL · a payload value read inside a lock whose result a refusal then checks is NOT reported, nor are the words in a comment, nor the reader named in a TYPE",
    suite: "reports-mem",
  },
  {
    name: "c5-s4:S4-M81 · seen red at 648ffe41 (the six branch removals ran together, each red on its own control)",
    file: HOUSE_BOT_REPORTS_CASES,
    from: "    } else if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && (REQUESTER_TOKENS as readonly string[]).includes(n.text) && !inTypePosition(n)) {",
    to: "    } else if (false) {",
    expect: "0.191.c4 · CONTROL · each lock shape a condition check alone missed is reported: a `function` helper answering \"did this officer choose?\", the same as an arrow and as an object method, a `filter` predicate dropping the chooser's markets, houseStakes handed to another call, and houseStake in emergencyVoidMarket's ok:true result",
    suite: "reports-mem",
  },
  {
    name: "c5-s4:S4-M82 · seen red at 648ffe41 (the six branch removals ran together, each red on its own control)",
    file: HOUSE_BOT_REPORTS_CASES,
    from: "        else if (readsIn(any, expr) && !(tag === \"BulkResolveBar\" && name === \"rows\")) say(`a decision control's prop reads the house stake: <${tag}>`, attr);",
    to: "        else if (readsIn(any, expr)) say(`a decision control's prop reads the house stake: <${tag}>`, attr);",
    expect: "0.191.c7 · CONTROL · display stays free: the viewer's line rendered on its own, the house line or its unread line, a control handed the line through its exposureSlot, and the bulk bar's rows carrying ruling 192's neutral house state are NOT reported",
    suite: "reports-mem",
  },
  {
    name: "c5-s4:S4-M83 · seen red at 648ffe41 (the six branch removals ran together, each red on its own control)",
    file: HOUSE_BOT_REPORTS_CASES,
    from: "    } else if (ts.isSwitchStatement(n) && readsIn(any, n.expression) && (holdsControl(n.caseBlock) || holdsControl(enclosingBody(n)))) say(\"a switch on house-stake data decides a control:\", n.expression);",
    to: "    }",
    expect: "0.191.c6 · CONTROL · a page lock that never names requestedBy is reported, each by its own rule: `canResolve && !viewerClause(…) ? <ResolveControls/>`, `canDecide={canDecide && !parts.viewerClause}`, `disabled={!!viewerClause(…)}`, an early return on the viewer's clause before a control, a void control hidden on a house-held market, `{!mine && <RecheckButton/>}`, a void control disabled on a house-held market, and a switch on the viewer's clause",
    suite: "reports-mem",
  },
  {
    name: "c5-s4:S4-M85 · seen red at 648ffe41 (the six branch removals ran together, each red on its own control)",
    file: HOUSE_BOT_REPORTS_CASES,
    from: "      if (payload && !payloadObject && namesToken(payload)) problems.push(`${rel}:${lineOf(sf, payload)}: a payload that is not an object literal names a requester token (${action})`);",
    to: "      if (false) problems.push(`${rel}:${lineOf(sf, payload)}: a payload that is not an object literal names a requester token (${action})`);",
    expect: "0.187.c1 · CONTROL · a house stake added to an audit the fixture never triggers (market.resolve_trigger.human, as a read or a null on the clawback), houseStakes moved onto the override row, a new file's audit carrying houseStake, the key outside the payload and inside a payload spread are each reported; the words in a comment are not",
    suite: "reports-mem",
  },
  /* ══ c5-s5 ═══════════════════════════════════════════════════════════════════════════════════════════ */
  {
    name: "c5-s5:S5-M48 · ⛔ no module a player can reach — every file under src/app/ and src/components/ outside their admin folders, route handlers…",
    file: MARKETS_RESOLUTION_PANEL,
    from: "import { ObjectionDialog } from \"./objection-dialog\";",
    to: "import { ObjectionDialog } from \"./objection-dialog\";\nimport { EXPOSURE_QUALIFIER } from \"@/lib/house-bot/exposure-copy\";",
    expect: "0.198.1 · ⛔ no module a player can reach — every file under src/app/ and src/components/ outside their admin folders, route handlers included, read from disk — imports exposure-copy.ts, exposure.ts, stake-snapshot.ts or the console readers, statically, by re-export, by import() or by require; the population holds both named player surfaces, read with their imports",
    suite: "reports-mem",
  },
  {
    name: "c5-s5:S5-M49 · ⛔ the player's cancellation notice, the objector's decision notice, both verdict notices and the player's refund letter name no…",
    file: NOTIFICATION_SERVICE,
    from: "    titleEn: opts.upheld ? \"Your objection was upheld\" : \"Your objection was reviewed\",",
    to: "    titleEn: opts.upheld ? \"Your objection was upheld\" : \"Your objection was reviewed (house stake held)\",",
    expect: "0.198.2 · ⛔ the player's cancellation notice, the objector's decision notice, both verdict notices and the player's refund letter name no house reader, carry no house word and keep the bodies measured before step 5 — and, since owner ruling D20 un-built ruling 195's clause, neither does the ADMIN twin beside them",
    suite: "reports-mem",
  },
  {
    name: "c5-s5:S5-M50 · ⛔ the player's cancellation notice, the objector's decision notice, both verdict notices and the player's refund letter name no…",
    file: EMAIL,
    from: "      { label: \"Refunded to wallet\", value: formatTzs(amount), tone: \"good\" },",
    to: "      { label: \"Refunded to wallet\", value: formatTzs(amount), tone: \"good\" },\n      { label: \"Of which house stakes\", value: formatTzs(amount) },",
    expect: "0.198.2 · ⛔ the player's cancellation notice, the objector's decision notice, both verdict notices and the player's refund letter name no house reader, carry no house word and keep the bodies measured before step 5 — and, since owner ruling D20 un-built ruling 195's clause, neither does the ADMIN twin beside them",
    suite: "reports-mem",
  },
  {
    name: "c5-s5:S5-M57 · CONTROL · a planted import of each R2 module into a player surface is reported — through the @/ alias, a relative path, import()…",
    file: HOUSE_BOT_REPORTS_CASES,
    from: ".filter((r) => (R2_MODULES as readonly string[]).includes(r));",
    to: ".filter((r) => r === \"src/lib/house-bot/exposure-copy\");",
    expect: "0.198.c1 · CONTROL · a planted import of each R2 module into a player surface is reported — through the @/ alias, a relative path, import() and a re-export — and the side vocabulary or a look-alike path is not; from disk, the house reader prepended to /positions and the console reader import()ed by a planted API route are each reported, and an admin page importing it is not",
    suite: "reports-mem",
  },
  {
    name: "c5-s5:S5-M58 · CONTROL · an un-built house reader called from the player's cancellation notice (a needle name), a house row planted in the…",
    file: HOUSE_BOT_REPORTS_CASES,
    from: "if (hash !== PLAYER_NOTIFIER_HASHES[name])",
    to: "if (false)",
    expect: "0.198.c2 · CONTROL · an un-built house reader called from the player's cancellation notice (a needle name), a house row planted in the refund letter (a house word), a one-word rewording (the bytes) and a stubbed notifier are each reported; an edit to the ADMIN twin beside it is not",
    suite: "reports-mem",
  },
  {
    name: "c5-s5:S5-M59 · CONTROL · an un-built house reader called from the player's cancellation notice (a needle name), a house row planted in the…",
    file: HOUSE_BOT_REPORTS_CASES,
    from: "if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n) || ts.isJsxText(n)) out.push(n.text);",
    to: "if (ts.isNoSubstitutionTemplateLiteral(n)) out.push(n.text);",
    expect: "0.198.c2 · CONTROL · an un-built house reader called from the player's cancellation notice (a needle name), a house row planted in the refund letter (a house word), a one-word rewording (the bytes) and a stubbed notifier are each reported; an edit to the ADMIN twin beside it is not",
    suite: "reports-mem",
  },
  {
    name: "c5-s5:S5-M63 · CONTROL · over the REAL tree: a planted client file importing a real house copy module through the @/ alias reaches…",
    file: HOUSE_BOT_DISCLOSURE_TEST,
    from: "if (spec.startsWith(\"@/\")) base = P.join(srcRoot, spec.slice(2));",
    to: "if (spec.startsWith(\"@/\")) return null;",
    expect: "4.c7 · CONTROL · over the REAL tree: a planted client file importing a real house copy module through the @/ alias reaches src/lib/house-bot/pause-reasons.ts on disk and its house words are reported — the resolver and the strip are proven on the tree §1 measures, not only on a virtual one",
    suite: "disclosure",
  },
  {
    name: "c5-s5:S5-M69 · CONTROL · a house line planted as JSX text in the public market page and as an attribute string in the resolution panel are each…",
    file: HOUSE_BOT_REPORTS_CASES,
    from: " || ts.isTemplateTail(n) || ts.isJsxText(n)) out.push(n.text);",
    to: " || ts.isTemplateTail(n)) out.push(n.text);",
    expect: "0.198.c3 · CONTROL · a house line planted as JSX text in the public market page and as an attribute string in the resolution panel are each ADDED to this file's live reading",
    suite: "reports-mem",
  },
  {
    name: "c5-s5:S5-M70 · the audience is the page's own view grant on the STORED role: COMPLIANCE sees the KYC case and the objections, the MODERATOR the…" /* (and c5-5b:M21, the same edit written twice) */,
    file: HOUSE_CONSOLE_READ,
    from: "    if (isOwnerOnlyPath(route)) return isAdmin(viewer.role);",
    to: "    if (isOwnerOnlyPath(route)) return true;",
    expect: "4.259.2 · the audience is the page's own view grant on the STORED role: COMPLIANCE sees the KYC case and the objections, the MODERATOR the Up and Down rounds and not the objections, an Owner-only path is ADMIN's alone, and the holder, a player, no session, an empty or unknown id and an ADMIN asking about a non-console route are all outside",
    suite: "reports-mem",
  },
  {
    name: "c5-s5:S5-M71 · the audience is the page's own view grant on the STORED role: COMPLIANCE sees the KYC case and the objections, the MODERATOR the…",
    file: HOUSE_CONSOLE_READ,
    from: "    return (await canView(viewer.role, domainForPath(route))) === true;",
    to: "    return true;",
    expect: "4.259.2 · the audience is the page's own view grant on the STORED role: COMPLIANCE sees the KYC case and the objections, the MODERATOR the Up and Down rounds and not the objections, an Owner-only path is ADMIN's alone, and the holder, a player, no session, an empty or unknown id and an ADMIN asking about a non-console route are all outside",
    suite: "reports-mem",
  },
  {
    name: "c5-s5:S5-M72 · ⛔ D19 · a console page's audit read gives NO row to a viewer outside the route's audience — a player, the holder and a trigger…",
    file: HOUSE_CONSOLE_READ,
    from: "if (typeof viewerUserId !== \"string\" || viewerUserId.length === 0 || !route.startsWith(\"/admin\")) return false;",
    to: "if (typeof viewerUserId !== \"string\" || viewerUserId.length === 0) return false;",
    expect: "4.260.1 · ⛔ D19 · a console page's audit read gives NO row to a viewer outside the route's audience — a player, the holder and a trigger player on the player page and on the audit log, no session, an unknown id and SUPPORT on the audit log, the holder on the overview, the MODERATOR on the player page and an ADMIN asking about a non-console route — so no house action, no row about a house bot, no house key and no platform row carrying a house VALUE (the deduped HOUSE_BOT notice, the provider-down alert's letter tag, a house error's stack, the owner's export) reaches them; CONTROL: the rows read carry the house words, the holder's marked-stake row and a stored Batch row's houseStakes key, and every value row, the dedupe written by the real notify()",
    suite: "reports-mem",
  },
  {
    name: "c5-s5:S5-M73 · ⛔ fail closed: while the viewer's own user read throws, even the ADMIN is outside the audience — CONTROL: the user read was…",
    file: HOUSE_CONSOLE_READ,
    from: "  } catch {\n    return false;\n  }",
    to: "  } catch {\n    return true;\n  }",
    expect: "4.259.3 · ⛔ fail closed: while the viewer's own user read throws, even the ADMIN is outside the audience — CONTROL: the user read was really asked, and restored it answers true again",
    suite: "reports-mem",
  },
  {
    name: "c5-s5:S5-M98 · ⛔ no module a player can reach — every file under src/app/ and src/components/ outside their admin folders, route handlers…",
    file: HOUSE_BOT_REPORTS_CASES,
    from: "(rel.startsWith(\"src/app/\") && !rel.startsWith(\"src/app/admin/\")) || (rel.startsWith(\"src/components/\") && !rel.startsWith(\"src/components/admin/\"));",
    to: "(rel.startsWith(\"src/components/\") && !rel.startsWith(\"src/components/admin/\"));",
    expect: "0.198.1 · ⛔ no module a player can reach — every file under src/app/ and src/components/ outside their admin folders, route handlers included, read from disk — imports exposure-copy.ts, exposure.ts, stake-snapshot.ts or the console readers, statically, by re-export, by import() or by require; the population holds both named player surfaces, read with their imports",
    suite: "reports-mem",
  },
  {
    name: "c5-s5:S5-M99 · CONTROL · a planted import of each R2 module into a player surface is reported — through the @/ alias, a relative path, import()…",
    file: HOUSE_BOT_REPORTS_CASES,
    from: "export const HOUSE_READ_MODULES = [...R2_MODULES, CONSOLE_READ_MODULE] as const;",
    to: "export const HOUSE_READ_MODULES = [...R2_MODULES] as const;",
    expect: "0.198.c1 · CONTROL · a planted import of each R2 module into a player surface is reported — through the @/ alias, a relative path, import() and a re-export — and the side vocabulary or a look-alike path is not; from disk, the house reader prepended to /positions and the console reader import()ed by a planted API route are each reported, and an admin page importing it is not",
    suite: "reports-mem",
  },
  {
    name: "c5-s5:S5-M105 · ⛔ D19 · a console page's audit read gives NO row to a viewer outside the route's audience — a player, the holder and a trigger…" /* (and c5-5b:M19, the same edit written twice) */,
    file: HOUSE_CONSOLE_READ,
    from: "  if (rows == null || (await houseConsoleAudience(viewerUserId, route))) return rows;",
    to: "  if (rows == null || (await houseConsoleAudience(viewerUserId, route)) || true) return rows;",
    expect: "4.260.1 · ⛔ D19 · a console page's audit read gives NO row to a viewer outside the route's audience — a player, the holder and a trigger player on the player page and on the audit log, no session, an unknown id and SUPPORT on the audit log, the holder on the overview, the MODERATOR on the player page and an ADMIN asking about a non-console route — so no house action, no row about a house bot, no house key and no platform row carrying a house VALUE (the deduped HOUSE_BOT notice, the provider-down alert's letter tag, a house error's stack, the owner's export) reaches them; CONTROL: the rows read carry the house words, the holder's marked-stake row and a stored Batch row's houseStakes key, and every value row, the dedupe written by the real notify()",
    suite: "reports-mem",
  },
  {
    name: "c5-s5:S5-M110 · 🔴 THE REGISTER'S PRIMARY CLAIM IS REFUTED — it names 4.260.1 first and \"also 3.x\" second; driven 2026-09-21, this mutation leaves 4.260.1 GREEN and reddens the DSAR export pair, so the second clause is the true one and the first is recorded as rotted, not repaired",
    file: USER_SERVICE,
    from: "[...Object.keys(HOUSE_AUDIT), ...HOUSE_REPORT_AUDIT_ACTIONS];",
    to: "[...Object.keys(HOUSE_AUDIT)];",
    expect: "3.2 · ⛔ D19 · the officer's own export keeps both DSAR rows (status and subject kept, the refusal's reason neutral) and names nothing at any depth",
    suite: "reports-mem",
  },
  {
    name: "c5-s5:S5-M111 · ⛔ D19 · every audit row a console file reads — every file under src/app/admin/, src/app/api/admin/ and src/components/admin/,…",
    file: ADMIN_PAGE,
    from: "await houseAuditForConsole(session?.userId ?? null, \"/admin\", getAuditPage({ limit: 12 }))",
    to: "getAuditPage({ limit: 12 })",
    expect: "0.260.1 · ⛔ D19 · every audit row a console file reads — every file under src/app/admin/, src/app/api/admin/ and src/components/admin/, read from disk, and every row reader the audit module exports, its exports classified to the last name — goes straight to houseAuditForConsole; EVERY call of every gate export names the signed-in viewer and the file's own console route; the three struck display readers (D20) are called NOWHERE; no console file reaches the audit module or the gate by import(), a namespace or a re-export, and none imports a house read module — or keeps what one returns — outside the system page's engine card (only the fire-and-forget holder and money hooks read nothing back); and every file OUTSIDE the console that calls a row reader is classified",
    suite: "reports-mem",
  },
  {
    name: "c5-s5:S5-M112 · ⛔ D19 · every audit row a console file reads — every file under src/app/admin/, src/app/api/admin/ and src/components/admin/,…",
    file: AUDIT_PAGE,
    from: "await houseAuditForConsole(session?.userId ?? null, \"/admin/audit\", getAuditPage({ limit: 100_000 }))",
    to: "getAuditPage({ limit: 100_000 })",
    expect: "0.260.1 · ⛔ D19 · every audit row a console file reads — every file under src/app/admin/, src/app/api/admin/ and src/components/admin/, read from disk, and every row reader the audit module exports, its exports classified to the last name — goes straight to houseAuditForConsole; EVERY call of every gate export names the signed-in viewer and the file's own console route; the three struck display readers (D20) are called NOWHERE; no console file reaches the audit module or the gate by import(), a namespace or a re-export, and none imports a house read module — or keeps what one returns — outside the system page's engine card (only the fire-and-forget holder and money hooks read nothing back); and every file OUTSIDE the console that calls a row reader is classified",
    suite: "reports-mem",
  },
  {
    name: "c5-s5:S5-M113 · ⛔ D19 · every audit row a console file reads — every file under src/app/admin/, src/app/api/admin/ and src/components/admin/,…",
    file: APPROVALS_PAGE,
    from: "await houseAuditForConsole(session?.userId ?? null, \"/admin/approvals\", getAuditPage({ category: \"ADMIN\", limit: 60 }))",
    to: "getAuditPage({ category: \"ADMIN\", limit: 60 })",
    expect: "0.260.1 · ⛔ D19 · every audit row a console file reads — every file under src/app/admin/, src/app/api/admin/ and src/components/admin/, read from disk, and every row reader the audit module exports, its exports classified to the last name — goes straight to houseAuditForConsole; EVERY call of every gate export names the signed-in viewer and the file's own console route; the three struck display readers (D20) are called NOWHERE; no console file reaches the audit module or the gate by import(), a namespace or a re-export, and none imports a house read module — or keeps what one returns — outside the system page's engine card (only the fire-and-forget holder and money hooks read nothing back); and every file OUTSIDE the console that calls a row reader is classified",
    suite: "reports-mem",
  },
  {
    name: "c5-s5:S5-M114 · ⛔ D19 · every audit row a console file reads — every file under src/app/admin/, src/app/api/admin/ and src/components/admin/,…",
    file: COMPLIANCE_PAGE,
    from: "await houseAuditForConsole(session?.userId ?? null, \"/admin/compliance\", getAuditPage({ category: \"COMPLIANCE\", limit: 200 }))",
    to: "getAuditPage({ category: \"COMPLIANCE\", limit: 200 })",
    expect: "0.260.1 · ⛔ D19 · every audit row a console file reads — every file under src/app/admin/, src/app/api/admin/ and src/components/admin/, read from disk, and every row reader the audit module exports, its exports classified to the last name — goes straight to houseAuditForConsole; EVERY call of every gate export names the signed-in viewer and the file's own console route; the three struck display readers (D20) are called NOWHERE; no console file reaches the audit module or the gate by import(), a namespace or a re-export, and none imports a house read module — or keeps what one returns — outside the system page's engine card (only the fire-and-forget holder and money hooks read nothing back); and every file OUTSIDE the console that calls a row reader is classified",
    suite: "reports-mem",
  },
  {
    name: "c5-s5:S5-M115 · ⛔ D19 · every audit row a console file reads — every file under src/app/admin/, src/app/api/admin/ and src/components/admin/,…",
    file: CONFIG_PAGE,
    from: "(await houseAuditForConsole(session?.userId ?? null, \"/admin/config\", getAuditPage({ category: \"ADMIN\", limit: 50 })))",
    to: "getAuditPage({ category: \"ADMIN\", limit: 50 })",
    expect: "0.260.1 · ⛔ D19 · every audit row a console file reads — every file under src/app/admin/, src/app/api/admin/ and src/components/admin/, read from disk, and every row reader the audit module exports, its exports classified to the last name — goes straight to houseAuditForConsole; EVERY call of every gate export names the signed-in viewer and the file's own console route; the three struck display readers (D20) are called NOWHERE; no console file reaches the audit module or the gate by import(), a namespace or a re-export, and none imports a house read module — or keeps what one returns — outside the system page's engine card (only the fire-and-forget holder and money hooks read nothing back); and every file OUTSIDE the console that calls a row reader is classified",
    suite: "reports-mem",
  },
  {
    name: "c5-s5:S5-M116 · ⛔ D19 · every audit row a console file reads — every file under src/app/admin/, src/app/api/admin/ and src/components/admin/,…",
    file: ID_PAGE_2,
    from: "await houseAuditForConsole(session?.userId ?? null, \"/admin/kyc\", getAuditForTargetDurable(\"User\", id, { limit: 500 }).catch(() => null))",
    to: "await getAuditForTargetDurable(\"User\", id, { limit: 500 }).catch(() => null)",
    expect: "0.260.1 · ⛔ D19 · every audit row a console file reads — every file under src/app/admin/, src/app/api/admin/ and src/components/admin/, read from disk, and every row reader the audit module exports, its exports classified to the last name — goes straight to houseAuditForConsole; EVERY call of every gate export names the signed-in viewer and the file's own console route; the three struck display readers (D20) are called NOWHERE; no console file reaches the audit module or the gate by import(), a namespace or a re-export, and none imports a house read module — or keeps what one returns — outside the system page's engine card (only the fire-and-forget holder and money hooks read nothing back); and every file OUTSIDE the console that calls a row reader is classified",
    suite: "reports-mem",
  },
  {
    name: "c5-s5:S5-M117 · ⛔ D19 · every audit row a console file reads — every file under src/app/admin/, src/app/api/admin/ and src/components/admin/,…",
    file: LIVE_PAGE,
    from: "await houseAuditForConsole(session?.userId ?? null, \"/admin/live\", getAuditPage({ category: \"BET\", limit: BET_FEED }))",
    to: "getAuditPage({ category: \"BET\", limit: BET_FEED })",
    expect: "0.260.1 · ⛔ D19 · every audit row a console file reads — every file under src/app/admin/, src/app/api/admin/ and src/components/admin/, read from disk, and every row reader the audit module exports, its exports classified to the last name — goes straight to houseAuditForConsole; EVERY call of every gate export names the signed-in viewer and the file's own console route; the three struck display readers (D20) are called NOWHERE; no console file reaches the audit module or the gate by import(), a namespace or a re-export, and none imports a house read module — or keeps what one returns — outside the system page's engine card (only the fire-and-forget holder and money hooks read nothing back); and every file OUTSIDE the console that calls a row reader is classified",
    suite: "reports-mem",
  },
  {
    name: "c5-s5:S5-M118 · ⛔ D19 · every audit row a console file reads — every file under src/app/admin/, src/app/api/admin/ and src/components/admin/,…",
    file: ID_PAGE_3,
    from: "(await houseAuditForConsole(viewer?.userId ?? null, \"/admin/players\", [...(getAuditForActor(id, 200) ?? []), ...(getAuditForTarget(\"User\", id, 200) ?? [])]))",
    to: "[...(getAuditForActor(id, 200) ?? []), ...(getAuditForTarget(\"User\", id, 200) ?? [])]",
    expect: "0.260.1 · ⛔ D19 · every audit row a console file reads — every file under src/app/admin/, src/app/api/admin/ and src/components/admin/, read from disk, and every row reader the audit module exports, its exports classified to the last name — goes straight to houseAuditForConsole; EVERY call of every gate export names the signed-in viewer and the file's own console route; the three struck display readers (D20) are called NOWHERE; no console file reaches the audit module or the gate by import(), a namespace or a re-export, and none imports a house read module — or keeps what one returns — outside the system page's engine card (only the fire-and-forget holder and money hooks read nothing back); and every file OUTSIDE the console that calls a row reader is classified",
    suite: "reports-mem",
  },
  {
    name: "c5-s5:S5-M119 · ⛔ D19 · every audit row a console file reads — every file under src/app/admin/, src/app/api/admin/ and src/components/admin/,…",
    file: REPORTS_PAGE,
    from: "(await houseAuditForConsole(session.userId, \"/admin/reports\", getAuditPage({ category: \"ADMIN\", limit: 10000 })))",
    to: "getAuditPage({ category: \"ADMIN\", limit: 10000 })",
    expect: "0.260.1 · ⛔ D19 · every audit row a console file reads — every file under src/app/admin/, src/app/api/admin/ and src/components/admin/, read from disk, and every row reader the audit module exports, its exports classified to the last name — goes straight to houseAuditForConsole; EVERY call of every gate export names the signed-in viewer and the file's own console route; the three struck display readers (D20) are called NOWHERE; no console file reaches the audit module or the gate by import(), a namespace or a re-export, and none imports a house read module — or keeps what one returns — outside the system page's engine card (only the fire-and-forget holder and money hooks read nothing back); and every file OUTSIDE the console that calls a row reader is classified",
    suite: "reports-mem",
  },
  {
    name: "c5-s5:S5-M120 · ⛔ D19 · every audit row a console file reads — every file under src/app/admin/, src/app/api/admin/ and src/components/admin/,…",
    file: ID_PAGE_4,
    from: "(await houseAuditForConsole(session?.userId ?? null, \"/admin/resolver\", getAuditPage({ category: \"ADMIN\", limit: 500 })))",
    to: "getAuditPage({ category: \"ADMIN\", limit: 500 })",
    expect: "0.260.1 · ⛔ D19 · every audit row a console file reads — every file under src/app/admin/, src/app/api/admin/ and src/components/admin/, read from disk, and every row reader the audit module exports, its exports classified to the last name — goes straight to houseAuditForConsole; EVERY call of every gate export names the signed-in viewer and the file's own console route; the three struck display readers (D20) are called NOWHERE; no console file reaches the audit module or the gate by import(), a namespace or a re-export, and none imports a house read module — or keeps what one returns — outside the system page's engine card (only the fire-and-forget holder and money hooks read nothing back); and every file OUTSIDE the console that calls a row reader is classified",
    suite: "reports-mem",
  },
  {
    name: "c5-s5:S5-M121 · ⛔ D19 · every audit row a console file reads — every file under src/app/admin/, src/app/api/admin/ and src/components/admin/,…",
    file: RETENTION_PAGE,
    from: "(await houseAuditForConsole(session?.userId ?? null, \"/admin/retention\", getAuditPage({ limit: 100_000 })))",
    to: "getAuditPage({ limit: 100_000 })",
    expect: "0.260.1 · ⛔ D19 · every audit row a console file reads — every file under src/app/admin/, src/app/api/admin/ and src/components/admin/, read from disk, and every row reader the audit module exports, its exports classified to the last name — goes straight to houseAuditForConsole; EVERY call of every gate export names the signed-in viewer and the file's own console route; the three struck display readers (D20) are called NOWHERE; no console file reaches the audit module or the gate by import(), a namespace or a re-export, and none imports a house read module — or keeps what one returns — outside the system page's engine card (only the fire-and-forget holder and money hooks read nothing back); and every file OUTSIDE the console that calls a row reader is classified",
    suite: "reports-mem",
  },
  {
    name: "c5-s5:S5-M122 · ⛔ D19 · every audit row a console file reads — every file under src/app/admin/, src/app/api/admin/ and src/components/admin/,…",
    file: ID_PAGE_5,
    from: "await houseAuditForConsole(session.userId, \"/admin/staff\", getAuditForTarget(\"User\", id, 100))",
    to: "getAuditForTarget(\"User\", id, 100)",
    expect: "0.260.1 · ⛔ D19 · every audit row a console file reads — every file under src/app/admin/, src/app/api/admin/ and src/components/admin/, read from disk, and every row reader the audit module exports, its exports classified to the last name — goes straight to houseAuditForConsole; EVERY call of every gate export names the signed-in viewer and the file's own console route; the three struck display readers (D20) are called NOWHERE; no console file reaches the audit module or the gate by import(), a namespace or a re-export, and none imports a house read module — or keeps what one returns — outside the system page's engine card (only the fire-and-forget holder and money hooks read nothing back); and every file OUTSIDE the console that calls a row reader is classified",
    suite: "reports-mem",
  },
  {
    name: "c5-s5:S5-M123 · ⛔ D19 · every audit row a console file reads — every file under src/app/admin/, src/app/api/admin/ and src/components/admin/,…",
    file: SYSTEM_PAGE,
    from: "(await houseAuditForConsole(session?.userId ?? null, \"/admin/system\", getAuditPage({ limit: 100_000 })))",
    to: "getAuditPage({ limit: 100_000 })",
    expect: "0.260.1 · ⛔ D19 · every audit row a console file reads — every file under src/app/admin/, src/app/api/admin/ and src/components/admin/, read from disk, and every row reader the audit module exports, its exports classified to the last name — goes straight to houseAuditForConsole; EVERY call of every gate export names the signed-in viewer and the file's own console route; the three struck display readers (D20) are called NOWHERE; no console file reaches the audit module or the gate by import(), a namespace or a re-export, and none imports a house read module — or keeps what one returns — outside the system page's engine card (only the fire-and-forget holder and money hooks read nothing back); and every file OUTSIDE the console that calls a row reader is classified",
    suite: "reports-mem",
  },
  {
    name: "c5-s5:S5-M124 · ⛔ D19 · every audit row a console file reads — every file under src/app/admin/, src/app/api/admin/ and src/components/admin/,…",
    file: ID_PAGE,
    from: "houseAuditForConsole(session?.userId ?? null, \"/admin/agents\", getAuditForTargetDurable(\"AgentApplication\", app.id, { limit: 40 }))",
    to: "getAuditForTargetDurable(\"AgentApplication\", app.id, { limit: 40 })",
    expect: "0.260.1 · ⛔ D19 · every audit row a console file reads — every file under src/app/admin/, src/app/api/admin/ and src/components/admin/, read from disk, and every row reader the audit module exports, its exports classified to the last name — goes straight to houseAuditForConsole; EVERY call of every gate export names the signed-in viewer and the file's own console route; the three struck display readers (D20) are called NOWHERE; no console file reaches the audit module or the gate by import(), a namespace or a re-export, and none imports a house read module — or keeps what one returns — outside the system page's engine card (only the fire-and-forget holder and money hooks read nothing back); and every file OUTSIDE the console that calls a row reader is classified",
    suite: "reports-mem",
  },
  {
    name: "c5-s5:S5-M125 · ⛔ D19 · every audit row a console file reads — every file under src/app/admin/, src/app/api/admin/ and src/components/admin/,…",
    file: AUDIT_PAGE,
    from: "houseAuditForConsole(session?.userId ?? null, \"/admin/audit\", getAuditPage",
    to: "houseAuditForConsole(\"usr_admin\", \"/admin/audit\", getAuditPage",
    expect: "0.260.1 · ⛔ D19 · every audit row a console file reads — every file under src/app/admin/, src/app/api/admin/ and src/components/admin/, read from disk, and every row reader the audit module exports, its exports classified to the last name — goes straight to houseAuditForConsole; EVERY call of every gate export names the signed-in viewer and the file's own console route; the three struck display readers (D20) are called NOWHERE; no console file reaches the audit module or the gate by import(), a namespace or a re-export, and none imports a house read module — or keeps what one returns — outside the system page's engine card (only the fire-and-forget holder and money hooks read nothing back); and every file OUTSIDE the console that calls a row reader is classified",
    suite: "reports-mem",
  },
  {
    name: "c5-s5:S5-M126 · ⛔ D19 · every audit row a console file reads — every file under src/app/admin/, src/app/api/admin/ and src/components/admin/,…",
    file: ID_PAGE_3,
    from: "houseAuditForConsole(viewer?.userId ?? null, \"/admin/players\", [",
    to: "houseAuditForConsole(viewer?.userId ?? null, \"/admin\", [",
    expect: "0.260.1 · ⛔ D19 · every audit row a console file reads — every file under src/app/admin/, src/app/api/admin/ and src/components/admin/, read from disk, and every row reader the audit module exports, its exports classified to the last name — goes straight to houseAuditForConsole; EVERY call of every gate export names the signed-in viewer and the file's own console route; the three struck display readers (D20) are called NOWHERE; no console file reaches the audit module or the gate by import(), a namespace or a re-export, and none imports a house read module — or keeps what one returns — outside the system page's engine card (only the fire-and-forget holder and money hooks read nothing back); and every file OUTSIDE the console that calls a row reader is classified",
    suite: "reports-mem",
  },
  {
    name: "c5-s5:S5-M127 · ⛔ D19 · every audit row a console file reads — every file under src/app/admin/, src/app/api/admin/ and src/components/admin/,…",
    file: COMPLIANCE_PAGE,
    from: "  const session = await currentSession();\n  const recentApprovals",
    to: "  const session = { userId: null as string | null };\n  const recentApprovals",
    expect: "0.260.1 · ⛔ D19 · every audit row a console file reads — every file under src/app/admin/, src/app/api/admin/ and src/components/admin/, read from disk, and every row reader the audit module exports, its exports classified to the last name — goes straight to houseAuditForConsole; EVERY call of every gate export names the signed-in viewer and the file's own console route; the three struck display readers (D20) are called NOWHERE; no console file reaches the audit module or the gate by import(), a namespace or a re-export, and none imports a house read module — or keeps what one returns — outside the system page's engine card (only the fire-and-forget holder and money hooks read nothing back); and every file OUTSIDE the console that calls a row reader is classified",
    suite: "reports-mem",
  },
  {
    name: "c5-s5:S5-M128 · RE-ANCHORED · the register anchored the same `say` on the local name `n`; the scan's binding was renamed to `call`",
    file: HOUSE_BOT_REPORTS_CASES,
    from: "      if (!gated) say(`${reader}(…) is not handed straight to houseAuditForConsole: ${snippet(sf, call)}`, call);",
    to: "      if (!gated) void 0;",
    expect: "0.260.c1 · CONTROL · the player page's measured leak restored (both readers ungated), a reader filtered before the gate, a literal viewer, a viewer that is not the session read from currentSession(), another domain's route, the overview's broader \"/admin\" prefix and another page of the same domain are each reported; so are, in console pages no list names, the audience asked for a literal viewer, the stake read for a session that is not currentSession()'s, the labels read for another domain's route, a session reassigned after it was read and the gate handed on as a value; the KYC page's read through await, .catch and the gate, and a const bound once to the session's id, are not",
    suite: "reports-mem",
  },
  {
    name: "c5-s5:S5-M130 · CONTROL · the player page's measured leak restored (both readers ungated), a reader filtered before the gate, a literal viewer, a…",
    file: HOUSE_BOT_REPORTS_CASES,
    from: " && (fileRoute === r || fileRoute.startsWith(`${r}/`))",
    to: "",
    expect: "0.260.c1 · CONTROL · the player page's measured leak restored (both readers ungated), a reader filtered before the gate, a literal viewer, a viewer that is not the session read from currentSession(), another domain's route, the overview's broader \"/admin\" prefix and another page of the same domain are each reported; so are, in console pages no list names, the audience asked for a literal viewer, the stake read for a session that is not currentSession()'s, the labels read for another domain's route, a session reassigned after it was read and the gate handed on as a value; the KYC page's read through await, .catch and the gate, and a const bound once to the session's id, are not",
    suite: "reports-mem",
  },
  {
    name: "c5-s5:S5-M131 · CONTROL · the player page's measured leak restored (both readers ungated), a reader filtered before the gate, a literal viewer, a…",
    file: HOUSE_BOT_REPORTS_CASES,
    from: "\n          && roles.domainForPath(r) === roles.domainForPath(fileRoute) && roles.isOwnerOnlyPath(r) === roles.isOwnerOnlyPath(fileRoute);",
    to: ";",
    expect: "0.260.c1 · CONTROL · the player page's measured leak restored (both readers ungated), a reader filtered before the gate, a literal viewer, a viewer that is not the session read from currentSession(), another domain's route, the overview's broader \"/admin\" prefix and another page of the same domain are each reported; so are, in console pages no list names, the audience asked for a literal viewer, the stake read for a session that is not currentSession()'s, the labels read for another domain's route, a session reassigned after it was read and the gate handed on as a value; the KYC page's read through await, .catch and the gate, and a const bound once to the session's id, are not",
    suite: "reports-mem",
  },
  {
    name: "c5-s5:S5-M132 · RE-ANCHORED · the register anchored `at.parent`; the walker's cursor was renamed to `top`",
    file: HOUSE_BOT_REPORTS_CASES,
    from: "      return ts.isVoidExpression(top.parent);",
    to: "      return true;",
    expect: "0.260.c2 · CONTROL · an aliased reader, a namespace reader, the audit module import()ed by an admin route handler, a shared console component that gates with a route it does not serve, the house store in a console page, a house module import()ed by a console action, a holder hook whose result an action returns, a fired-and-forgotten import of a module that is no officer hook with its read kept, a hook whose callback writes an outer binding, a re-export of the audit reader, of a house read module and of the gate, and the gate through a namespace are each reported; verifyChain, type-only imports and type-only re-exports of the audit and house modules, a reader named in a comment and a fire-and-forget hook (void import(…).then((m) => m.hook(…)).catch(() => {})) are not",
    suite: "reports-mem",
  },
  {
    name: "c5-s5:S5-M133 · RE-ANCHORED · same site as S5-M132, the other direction (every call reads as void-ed, so a real leak is excused)",
    file: HOUSE_BOT_REPORTS_CASES,
    from: "      return ts.isVoidExpression(top.parent);",
    to: "      return false;",
    expect: "0.260.1 · ⛔ D19 · every audit row a console file reads — every file under src/app/admin/, src/app/api/admin/ and src/components/admin/, read from disk, and every row reader the audit module exports, its exports classified to the last name — goes straight to houseAuditForConsole; EVERY call of every gate export names the signed-in viewer and the file's own console route; the three struck display readers (D20) are called NOWHERE; no console file reaches the audit module or the gate by import(), a namespace or a re-export, and none imports a house read module — or keeps what one returns — outside the system page's engine card (only the fire-and-forget holder and money hooks read nothing back); and every file OUTSIDE the console that calls a row reader is classified",
    suite: "reports-mem",
  },
  {
    name: "c5-s5:S5-M135 · RE-ANCHORED · the register carried the line at a deeper indent inside the older import walker",
    file: HOUSE_BOT_REPORTS_CASES,
    from: "    if (bindings && ts.isNamespaceImport(bindings)) namespaces.add(bindings.name.text);",
    to: "    if (false) namespaces.add(bindings.name.text);",
    expect: "0.260.c2 · CONTROL · an aliased reader, a namespace reader, the audit module import()ed by an admin route handler, a shared console component that gates with a route it does not serve, the house store in a console page, a house module import()ed by a console action, a holder hook whose result an action returns, a fired-and-forgotten import of a module that is no officer hook with its read kept, a hook whose callback writes an outer binding, a re-export of the audit reader, of a house read module and of the gate, and the gate through a namespace are each reported; verifyChain, type-only imports and type-only re-exports of the audit and house modules, a reader named in a comment and a fire-and-forget hook (void import(…).then((m) => m.hook(…)).catch(() => {})) are not",
    suite: "reports-mem",
  },
  {
    name: "c5-s5:S5-M136 · CONTROL · an aliased reader, a namespace reader, the audit module import()ed by an admin route handler, a shared console…",
    file: HOUSE_BOT_REPORTS_CASES,
    from: "readerLocals.set(e.name.text, imported);",
    to: "readerLocals.set(imported, imported);",
    expect: "0.260.c2 · CONTROL · an aliased reader, a namespace reader, the audit module import()ed by an admin route handler, a shared console component that gates with a route it does not serve, the house store in a console page, a house module import()ed by a console action, a holder hook whose result an action returns, a fired-and-forgotten import of a module that is no officer hook with its read kept, a hook whose callback writes an outer binding, a re-export of the audit reader, of a house read module and of the gate, and the gate through a namespace are each reported; verifyChain, type-only imports and type-only re-exports of the audit and house modules, a reader named in a comment and a fire-and-forget hook (void import(…).then((m) => m.hook(…)).catch(() => {})) are not",
    suite: "reports-mem",
  },
  {
    name: "c5-s5:S5-M137 · ⛔ D19 · every audit row a console file reads — every file under src/app/admin/, src/app/api/admin/ and src/components/admin/,…",
    file: HOUSE_BOT_REPORTS_CASES,
    from: "\"getAuditPage\", \"getAuditPageDurable\"] as const;",
    to: "\"getAuditPageDurable\"] as const;",
    expect: "0.260.1 · ⛔ D19 · every audit row a console file reads — every file under src/app/admin/, src/app/api/admin/ and src/components/admin/, read from disk, and every row reader the audit module exports, its exports classified to the last name — goes straight to houseAuditForConsole; EVERY call of every gate export names the signed-in viewer and the file's own console route; the three struck display readers (D20) are called NOWHERE; no console file reaches the audit module or the gate by import(), a namespace or a re-export, and none imports a house read module — or keeps what one returns — outside the system page's engine card (only the fire-and-forget holder and money hooks read nothing back); and every file OUTSIDE the console that calls a row reader is classified",
    suite: "reports-mem",
  },
  {
    name: "c5-s5:S5-M138 · CONTROL · an aliased reader, a namespace reader, the audit module import()ed by an admin route handler, a shared console…",
    file: HOUSE_BOT_REPORTS_CASES,
    from: "        if (isHouseReadModule(resolved) && !typeOnly && !houseAllowed(resolved)) houseSays(resolved, \"imports\", n);",
    to: "        if (false) houseSays(resolved, \"imports\", n);",
    expect: "0.260.c2 · CONTROL · an aliased reader, a namespace reader, the audit module import()ed by an admin route handler, a shared console component that gates with a route it does not serve, the house store in a console page, a house module import()ed by a console action, a holder hook whose result an action returns, a fired-and-forgotten import of a module that is no officer hook with its read kept, a hook whose callback writes an outer binding, a re-export of the audit reader, of a house read module and of the gate, and the gate through a namespace are each reported; verifyChain, type-only imports and type-only re-exports of the audit and house modules, a reader named in a comment and a fire-and-forget hook (void import(…).then((m) => m.hook(…)).catch(() => {})) are not",
    suite: "reports-mem",
  },
  {
    name: "c5-s5:S5-M139 · ⛔ D19 · every audit row a console file reads — every file under src/app/admin/, src/app/api/admin/ and src/components/admin/,…",
    file: HOUSE_BOT_REPORTS_CASES,
    from: "  \"src/app/admin/system/page.tsx\": [\"src/lib/server/house-bot/engine-health\"],\n",
    to: "",
    expect: "0.260.1 · ⛔ D19 · every audit row a console file reads — every file under src/app/admin/, src/app/api/admin/ and src/components/admin/, read from disk, and every row reader the audit module exports, its exports classified to the last name — goes straight to houseAuditForConsole; EVERY call of every gate export names the signed-in viewer and the file's own console route; the three struck display readers (D20) are called NOWHERE; no console file reaches the audit module or the gate by import(), a namespace or a re-export, and none imports a house read module — or keeps what one returns — outside the system page's engine card (only the fire-and-forget holder and money hooks read nothing back); and every file OUTSIDE the console that calls a row reader is classified",
    suite: "reports-mem",
  },
  {
    name: "c5-s5:S5-M140 · CONTROL · an aliased reader, a namespace reader, the audit module import()ed by an admin route handler, a shared console…",
    file: HOUSE_BOT_REPORTS_CASES,
    from: "  rel.startsWith(\"src/app/admin/\") || rel.startsWith(\"src/app/api/admin/\") || rel.startsWith(\"src/components/admin/\");",
    to: "  rel.startsWith(\"src/app/admin/\");",
    expect: "0.260.c2 · CONTROL · an aliased reader, a namespace reader, the audit module import()ed by an admin route handler, a shared console component that gates with a route it does not serve, the house store in a console page, a house module import()ed by a console action, a holder hook whose result an action returns, a fired-and-forgotten import of a module that is no officer hook with its read kept, a hook whose callback writes an outer binding, a re-export of the audit reader, of a house read module and of the gate, and the gate through a namespace are each reported; verifyChain, type-only imports and type-only re-exports of the audit and house modules, a reader named in a comment and a fire-and-forget hook (void import(…).then((m) => m.hook(…)).catch(() => {})) are not",
    suite: "reports-mem",
  },
  /* ══ C5-8 · THE 29 OWED ENTRIES, DISPOSED OF ONE BY ONE ══════════════════════════════════════════════
   *
   * ⛔ EACH OF THESE 29 RESOLVES EXACTLY ONCE AND NAMES AN ASSERTION THAT NO LONGER EXISTS. That is not one
   * condition, it is three, and they are not the same: (a) the BEHAVIOUR was struck and its assertion went with it
   * — RETIRE; (b) the assertion was renamed or absorbed — RE-POINT and DRIVE to prove the pairing; (c) ⛔ THE
   * BEHAVIOUR IS STILL SHIPPED AND THE ASSERTION SIMPLY VANISHED — an unguarded behaviour with a ready-made
   * mutation, which is the most valuable thing in the set. Measured 2026-09-21 against this tree: 17 re-point,
   * 1 retires, 11 were (c).
   *
   * ⭐ THE ELEVEN (c)s HAVE ASSERTIONS NOW, WRITTEN IN THE SAME COMMIT: 0.197.1/.2/.3 (the KYC case is house-blind
   * and stays so under D20), 0.170.5 (the DSAR strip list), 0.m5.1/.2 (⚠️ `main`'s OWN emergency-void audience and
   * the fixed row set of its letter, guarded only by a house case D20 struck) and 0.175.samples (the planted-control
   * population, which every consumer measured by PRINTING its length). Each has a planted control beside it.
   *
   * ⛔ ONE ENTRY IS RETIRED AND IS NOT DECLARED BELOW. `S5-M46` prefills the emergency-void reason from
   * `exposureSlot`. Its assertion 0.196.1 pinned ruling 196's prefill; `C5-SPEC.md:1247` (ruling 196) and `:2918`
   * (ruling 262) both read "⛔ STRUCK by D20 — never build; un-built in C5-5b", and `C5-D20-REPLAN.md:31` is the
   * row. `exposureSlot` occurs 0× under `src/` and survives only as an EXEMPTION NAME in `EXPOSURE_SLOT_PROPS`.
   * ⚠️ CLASSIFICATION CORRECTION: its `to` names a struck subject, so it belongs in the 76 MOOT, not the 29.
   *
   * ⛔ AND ONE MORE IS DECLARED ELSEWHERE, ON PURPOSE. `S4-M65` (`mine.length > 0` → `>= 0`, which refuses EVERY
   * officer hold) belongs to `test:settlement-gate` §14, which has no roll-call key — so it is declared in
   * `scripts/anchors/officer-hold.anchors.mjs`, which 0.505 does not walk and `red:officer-hold` already drives,
   * beside the INVERSE mutation that sits on the byte-identical `from` block.
   */
  {
    name: "c5-s4:S4-M11 · RE-POINTED · a read before the seal, outside `if (r.ok)` — the register named 3.188.8, which is gone; 0.191.0 (which the entry ALSO named) counts the reader over all 21 decision files and reads 0",
    file: RESOLVER_QUEUE_BULK_RESOLVE_ACTION,
    from: "        const r = await resolveMarket({ marketId: id, outcome, officerId: g.userId });",
    to: "        houseStakes[id] = await houseStakeForAudit(id, \"market.resolve.bulk\"); const r = await resolveMarket({ marketId: id, outcome, officerId: g.userId });",
    expect: "0.191.0 · ⛔ D20's un-build, measured: all 21 decision files are read, and NOT ONE names a house-stake reader or carries a single allowed requester occurrence — so every problem the scan can report below is a new one",
    suite: "reports-mem",
  },
  {
    name: "c5-s4:S4-M15 · RE-POINTED · stage 1 makes a house read — 3.188.3/3.189.3 are gone; the absence pin that replaced them counts the call",
    file: MARKET_SERVICE,
    from: "    return { ok: true, data: { stage: \"stage1\" } };",
    to: "    await houseStakeForAudit(m.id, \"market.adjudicated\"); return { ok: true, data: { stage: \"stage1\" } };",
    expect: "0.191.0 · ⛔ D20's un-build, measured: all 21 decision files are read, and NOT ONE names a house-stake reader or carries a single allowed requester occurrence — so every problem the scan can report below is a new one",
    suite: "reports-mem",
  },
  {
    name: "c5-s4:S4-M16 · RE-POINTED · a REFUSED adjudication makes a house read — the 3.188.* family is gone",
    file: MARKET_SERVICE,
    from: "  if (m.status === \"RESOLVED\" || m.status === \"VOIDED\") return { ok: false, error: \"Market already resolved.\", code: \"INVALID\" };",
    to: "  await houseStakeForAudit(opts.marketId, \"market.adjudicated\"); if (m.status === \"RESOLVED\" || m.status === \"VOIDED\") return { ok: false, error: \"Market already resolved.\", code: \"INVALID\" };",
    expect: "0.191.0 · ⛔ D20's un-build, measured: all 21 decision files are read, and NOT ONE names a house-stake reader or carries a single allowed requester occurrence — so every problem the scan can report below is a new one",
    suite: "reports-mem",
  },
  {
    name: "c5-s4:S4-M17 · RE-POINTED · a REFUSED emergency void makes a house read — 3.188.5/3.188.6 are gone",
    file: MARKET_SERVICE,
    from: "  const officer = await db.user.findById(opts.officerId);",
    to: "  await houseStakeForAudit(opts.marketId, \"market.emergency_void\"); const officer = await db.user.findById(opts.officerId);",
    expect: "0.191.0 · ⛔ D20's un-build, measured: all 21 decision files are read, and NOT ONE names a house-stake reader or carries a single allowed requester occurrence — so every problem the scan can report below is a new one",
    suite: "reports-mem",
  },
  {
    name: "c5-s4:S4-M18 · RE-POINTED · a REFUSED objection rejection makes a house read — 3.188.7/3.187.7 are gone",
    file: OBJECTIONS_SERVICE,
    from: "  if (!(await requireRulingOfficer(officerId, \"objection.reject\"))) {",
    to: "  await houseStakeForAudit((await db.objection.findById(objectionId))?.marketId ?? \"none\", \"objection.rejected\"); if (!(await requireRulingOfficer(officerId, \"objection.reject\"))) {",
    expect: "0.191.0 · ⛔ D20's un-build, measured: all 21 decision files are read, and NOT ONE names a house-stake reader or carries a single allowed requester occurrence — so every problem the scan can report below is a new one",
    suite: "reports-mem",
  },
  {
    name: "c5-s4:S4-M19 · RE-POINTED · a REFUSED objection uphold makes a house read — 3.188.7/3.187.8 are gone",
    file: OBJECTIONS_SERVICE,
    from: "  if (!(await requireRulingOfficer(officerId, \"objection.uphold\"))) {",
    to: "  await houseStakeForAudit((await db.objection.findById(objectionId))?.marketId ?? \"none\", \"objection.upheld\"); if (!(await requireRulingOfficer(officerId, \"objection.uphold\"))) {",
    expect: "0.191.0 · ⛔ D20's un-build, measured: all 21 decision files are read, and NOT ONE names a house-stake reader or carries a single allowed requester occurrence — so every problem the scan can report below is a new one",
    suite: "reports-mem",
  },
  {
    name: "c5-s4:S4-M32 · RE-POINTED · R9 on a market.resolve.stage1 payload — the 3.187.* family is gone; 0.187.1 (which the entry ALSO named) walks every audit write under src/",
    file: MARKET_SERVICE,
    from: "      payload: { outcome: opts.outcome, evidence },",
    to: "      payload: { outcome: opts.outcome, evidence, houseStake: await houseStakeForAudit(m.id, \"market.resolve.stage1\") },",
    expect: "0.187.1 · ⛔ OWNER RULING D20 · not one audit write in src/ carries houseStake or houseStakes — in its payload, outside it, or through a spread — and the reader is read over every audit call there is",
    suite: "reports-mem",
  },
  {
    name: "c5-s4:S4-M34 · RE-POINTED · R9 on the operator's round void, through a dynamic import — 3.187.9/3.187.10 are gone; the spelling still carries the literal `houseStakeForAudit(` both scans split on",
    file: UPDOWN_SERVICE,
    from: "    payload: { reason, marketId: round.marketId },",
    to: "    payload: { reason, marketId: round.marketId, houseStakes: { [round.marketId]: await (await import(\"./house-bot/exposure\")).houseStakeForAudit(round.marketId) } },",
    expect: "0.187.1 · ⛔ OWNER RULING D20 · not one audit write in src/ carries houseStake or houseStakes — in its payload, outside it, or through a spread — and the reader is read over every audit call there is",
    suite: "reports-mem",
  },
  {
    name: "c5-s5:S5-M51 · RE-POINTED · a decision service's player notice reads the house stake — 4.196.1 is gone (ruling 196 struck by D20)",
    file: OBJECTIONS_SERVICE,
    from: "notifyObjectionDecided(o.userId, { upheld: false, marketId: o.marketId, note: reviewNote })",
    to: "notifyObjectionDecided(o.userId, { upheld: false, marketId: o.marketId, note: `${reviewNote}${(await houseStakeForAudit(o.marketId, \"objection.rejected\"))?.no ? \" · house stake NO\" : \"\"}` })",
    expect: "0.191.0 · ⛔ D20's un-build, measured: all 21 decision files are read, and NOT ONE names a house-stake reader or carries a single allowed requester occurrence — so every problem the scan can report below is a new one",
    suite: "reports-mem",
  },
  {
    name: "c5-s5:S5-M52 · RE-POINTED · the same read inside a TERNARY CONDITION — 4.196.2 is gone; 0.191.1 names the condition shape by rule and 0.191.0 counts the call",
    file: OBJECTIONS_SERVICE,
    from: "note: `The market was voided and your stake was refunded in full. ${reason}` }",
    to: "note: `The market was voided and your stake was refunded in full. ${reason}${(await houseStakeForAudit(marketId, \"market.emergency_void\"))?.no ? \" · house stake\" : \"\"}` }",
    expect: "0.191.0 · ⛔ D20's un-build, measured: all 21 decision files are read, and NOT ONE names a house-stake reader or carries a single allowed requester occurrence — so every problem the scan can report below is a new one",
    suite: "reports-mem",
  },
  {
    name: "c5-s5:S5-M53 · RE-POINTED · the vocabulary loses `house[ -]?stakes?` — the 0.175.r2* family is gone; the entry's OWN text named test:house-bot-disclosure 2.v, which exists",
    file: HOUSE_BOT_VOCABULARY,
    from: "|house[ -]?stakes?|dau la nyumba|平台投注|staff[- ]?chosen|chosen by (?:staff|you)|including house\\b`;",
    to: "|dau la nyumba|平台投注|staff[- ]?chosen|chosen by (?:staff|you)|including house\\b`;",
    expect: "2.v · ruling 175 · CONTROL · every planted ",
    suite: "disclosure",
  },
  {
    name: "c5-s5:S5-M54 · RE-POINTED · the vocabulary loses `dau la nyumba` — nothing else matches the Swahili house share",
    file: HOUSE_BOT_VOCABULARY,
    from: "|house[ -]?stakes?|dau la nyumba|平台投注|staff[- ]?chosen|chosen by (?:staff|you)|including house\\b`;",
    to: "|house[ -]?stakes?|平台投注|staff[- ]?chosen|chosen by (?:staff|you)|including house\\b`;",
    expect: "2.v · ruling 175 · CONTROL · every planted ",
    suite: "disclosure",
  },
  {
    name: "c5-s5:S5-M55 · RE-POINTED · the vocabulary loses 平台投注 (平台机器人 is a different alternative and does not cover it)",
    file: HOUSE_BOT_VOCABULARY,
    from: "|house[ -]?stakes?|dau la nyumba|平台投注|staff[- ]?chosen|chosen by (?:staff|you)|including house\\b`;",
    to: "|house[ -]?stakes?|dau la nyumba|staff[- ]?chosen|chosen by (?:staff|you)|including house\\b`;",
    expect: "2.v · ruling 175 · CONTROL · every planted ",
    suite: "disclosure",
  },
  {
    name: "c5-s5:S5-M56 · RE-POINTED · the vocabulary loses `staff[- ]?chosen` — `chosen by (?:staff|you)` matches neither \"staff-chosen\" nor \"staff chosen\"",
    file: HOUSE_BOT_VOCABULARY,
    from: "|house[ -]?stakes?|dau la nyumba|平台投注|staff[- ]?chosen|chosen by (?:staff|you)|including house\\b`;",
    to: "|house[ -]?stakes?|dau la nyumba|平台投注|chosen by (?:staff|you)|including house\\b`;",
    expect: "2.v · ruling 175 · CONTROL · every planted ",
    suite: "disclosure",
  },
  {
    name: "c5-s5:S5-M65 · RE-POINTED · the vocabulary loses `chosen by (?:staff|you)` — `staff[- ]?chosen` matches neither phrasing",
    file: HOUSE_BOT_VOCABULARY,
    from: "|house[ -]?stakes?|dau la nyumba|平台投注|staff[- ]?chosen|chosen by (?:staff|you)|including house\\b`;",
    to: "|house[ -]?stakes?|dau la nyumba|平台投注|staff[- ]?chosen|including house\\b`;",
    expect: "2.v · ruling 175 · CONTROL · every planted ",
    suite: "disclosure",
  },
  {
    name: "c5-s5:S5-M66 · 🔴 UNGUARDED UNTIL NOW · the word bound comes off `including house`, so \"household\" becomes a hit. 2.v stays green (the sample still matches), 0.175.subset.module stays green, the console lexicon stays green — the claim lived only in the module's docblock. HOUSE_BENIGN_SAMPLES now carries \"including household costs\" and 2.v.b owns it",
    file: HOUSE_BOT_VOCABULARY,
    from: "|house[ -]?stakes?|dau la nyumba|平台投注|staff[- ]?chosen|chosen by (?:staff|you)|including house\\b`;",
    to: "|house[ -]?stakes?|dau la nyumba|平台投注|staff[- ]?chosen|chosen by (?:staff|you)|including house`;",
    expect: "2.v.b · ruling 175 · CONTROL · the benign look-alikes",
    suite: "disclosure",
  },
  {
    name: "c5-s5:S5-M67 · RE-POINTED · the vocabulary loses `including house\\b` — the held chip's own phrasing is orphaned. ⚠️ the console lexicon stays GREEN here (NEUTRAL carries bare `\\bhouse\\b`), so 2.v is the one that fires",
    file: HOUSE_BOT_VOCABULARY,
    from: "|house[ -]?stakes?|dau la nyumba|平台投注|staff[- ]?chosen|chosen by (?:staff|you)|including house\\b`;",
    to: "|house[ -]?stakes?|dau la nyumba|平台投注|staff[- ]?chosen|chosen by (?:staff|you)`;",
    expect: "2.v · ruling 175 · CONTROL · every planted ",
    suite: "disclosure",
  },
  {
    name: "c5-s5:S5-M68 · 🔴 UNGUARDED UNTIL NOW · the three samples every consumer's planted control uses are deleted, and EVERY consumer then passes vacuously over a shorter list — 2.v asserts `missed.length === 0` and merely prints the count, verify-house-bot-bundle has the identical shape, 0.175.subset.module filters a now-shorter list. No assertion anywhere pinned the population; 0.175.samples derives it from HOUSE_WORD_SOURCE",
    file: HOUSE_BOT_VOCABULARY,
    from: "  \"chosen by staff\", \"chosen by you\", \"including house\",",
    to: "",
    expect: "0.175.samples · ⛔ the planted-control population is DERIVED from the vocabulary, never maintained beside it: every top-level alternative of HOUSE_WORD_SOURCE is covered by at least one HOUSE_WORD_SAMPLES entry, and every sample is matched by an alternative",
    suite: "reports-mem",
  },
  {
    name: "c5-s4:S4-M54 · 🔴 UNGUARDED UNTIL NOW · the KYC bet count stops being house-blind. 4.197.1/4.197.4 went out with ruling 197's strike; `betCount`, `kycRiskScore` and `kycMoneyFacts` occur 0× across scripts/ outside this file, and report-parity reads kyc-risk.ts only for db.txn.listAll()",
    file: KYC_RISK,
    from: "      out.betCount += 1;",
    to: "      if (t.houseBotId == null) out.betCount += 1;",
    expect: "0.197.1 · ⛔ OWNER RULING D20 · ruling 197 is STRUCK, so the KYC READ is house-blind: src/lib/server/kyc-risk.ts, decommented, carries no vocabulary word, no house identifier and neither struck kycMoneyFacts.house* field",
    suite: "reports-mem",
  },
  {
    name: "c5-s4:S4-M55 · 🔴 UNGUARDED UNTIL NOW · a house-derived factor enters the KYC risk score and paints the word \"Liquidity\" on an officer's card. 4.197.3 is gone; 0.198.3's word scan is PLAYER surfaces only and ruling 453's lexicon is the console subtree only — /admin/kyc is neither",
    file: KYC_RISK,
    from: "  // 4 · Brand-new account.",
    to: "  if (txns.some((t) => t.houseBotId != null)) factors.push({ label: \"Liquidity\", points: 5, detail: \"marked stakes\" }); // 4 · Brand-new account.",
    expect: "0.197.1 · ⛔ OWNER RULING D20 · ruling 197 is STRUCK, so the KYC READ is house-blind: src/lib/server/kyc-risk.ts, decommented, carries no vocabulary word, no house identifier and neither struck kycMoneyFacts.house* field",
    suite: "reports-mem",
  },
  {
    name: "c5-s4:S4-M56 · 🔴 UNGUARDED UNTIL NOW · a CLIENT module under /admin/kyc/[id] reads a KYC house figure. 0.197.1 (the step-5 one) is gone, and `houseBetCount` matches NO alternative of HOUSE_IDENTIFIER_SOURCE — the vocabulary alone could not have seen this",
    file: KYC_DECISION_RAIL,
    from: "export function KycDecisionRail({",
    to: "export const railHouseBetCount = (f: { houseBetCount: number }) => f.houseBetCount;\nexport function KycDecisionRail({",
    expect: "0.197.2 · ⛔ OWNER RULING D20 · not one module under src/app/admin/kyc/ — every file walked from disk, client component, \"use server\" action and page alike — names a house figure",
    suite: "reports-mem",
  },
  {
    name: "c5-s4:S4-M76 · 🔴 UNGUARDED UNTIL NOW · a \"use server\" module under /admin/kyc/[id] exports a house figure reader",
    file: KYC_ACTIONS,
    from: "import { kycRiskScore, getApprovalRecommendation, KYC_MAKER_CHECKER_THRESHOLD } from \"@/lib/server/kyc-risk\";",
    to: "import { kycRiskScore, getApprovalRecommendation, KYC_MAKER_CHECKER_THRESHOLD } from \"@/lib/server/kyc-risk\";\nexport async function houseFigures(f: { houseBetCount: number }) { return f.houseBetCount; }",
    expect: "0.197.2 · ⛔ OWNER RULING D20 · not one module under src/app/admin/kyc/ — every file walked from disk, client component, \"use server\" action and page alike — names a house figure",
    suite: "reports-mem",
  },
  {
    name: "c5-s4:S4-M57 · 🔴 UNGUARDED UNTIL NOW · RE-ANCHORED · the case page hands `moneyFacts` WHOLE to a client rail, serialising it into the flight payload. ⚠️ the register anchored `                <KycDecisionRail`, byte-identical to S4-M75's; the anchor is extended by the line below it so the two resolve separately rather than riding one combineInto",
    file: ID_PAGE_2,
    from: "                <KycDecisionRail\n                  userId={id}",
    to: "                <KycDecisionRail\n                  moneyFacts={moneyFacts}\n                  userId={id}",
    expect: "0.197.3 · ⛔ OWNER RULING D20 · the KYC case page hands its CLIENT decision rail exactly the six judgement props it takes today and nothing a money object could ride in on",
    suite: "reports-mem",
  },
  {
    name: "c5-s4:S4-M75 · 🔴 UNGUARDED UNTIL NOW · RE-ANCHORED · the same facts SPREAD into the tag. ⚠️ re-anchored to the first two props for the reason above; 0.434's W25_OWED already reports this page, so the reported set is unchanged and that case stays green",
    file: ID_PAGE_2,
    from: "                  userId={id}\n                  autoChecks={autoChecks}",
    to: "                  {...kycMoneyFacts(txns)}\n                  userId={id}\n                  autoChecks={autoChecks}",
    expect: "0.197.3 · ⛔ OWNER RULING D20 · the KYC case page hands its CLIENT decision rail exactly the six judgement props it takes today and nothing a money object could ride in on",
    suite: "reports-mem",
  },
  {
    name: "c5-s4:S4-M58 · 🔴 UNGUARDED UNTIL NOW · the two stake keys leave the DSAR strip list, leaving a door open in a subject's own export. 3.170.2 is gone. ⚠️ WHEN THIS WAS DECLARED, `dsar-export-secrets.test.mts` planted only houseBotId and intentId and asserted only those two, so its houseHits(json) had nothing to find and the whole suite stayed green on this defect — THAT IS NO LONGER TRUE and the sentence is corrected rather than left to be read again: the fixture plants all four keys and the assertion names all four (hand-driven 2026-09-21, 43/0 → 41/2). 0.170.5 pins the LIST; that suite is the runtime door behind it",
    file: USER_SERVICE,
    from: "const HOUSE_AUDIT_PAYLOAD_KEYS_STRIPPED = [\"houseBotId\", \"intentId\", \"houseStake\", \"houseStakes\", \"houseBots\", \"houseBotNotificationsRedacted\"] as const;",
    to: "const HOUSE_AUDIT_PAYLOAD_KEYS_STRIPPED = [\"houseBotId\", \"intentId\", \"houseBots\", \"houseBotNotificationsRedacted\"] as const;",
    expect: "0.170.5 · ⛔ RULING 170 · the DSAR export's house strip names EVERY house key an audit payload can carry — houseBotId, intentId, houseStake, houseStakes, houseBots, houseBotNotificationsRedacted",
    suite: "reports-mem",
  },
  {
    name: "c5-s4:S4-M61 · 🔴 UNGUARDED UNTIL NOW · ⚠️ `main`'s OWN behaviour · the emergency-void confirmation stops reaching COMPLIANCE. 4.195.* went out with ruling 195's strike; no file under scripts/ names the role triple and emergency-void.test.mts contains no occurrence of COMPLIANCE at all",
    file: MARKET_SERVICE,
    from: "    const officers = await db.user.listByRoles([\"ADMIN\", \"COMPLIANCE\", \"MODERATOR\"]); // audit M5",
    to: "    const officers = await db.user.listByRoles([\"ADMIN\", \"MODERATOR\"]); // audit M5",
    expect: "0.m5.1 · ⛔ BOTH officer fan-outs in market-service.ts are addressed to ADMIN, COMPLIANCE and MODERATOR",
    suite: "reports-mem",
  },
  {
    name: "c5-s4:S4-M67 · 🔴 UNGUARDED UNTIL NOW · ⚠️ `main`'s OWN behaviour · REWRITTEN · the officer's letter gains a label conditional on a money figure. 4.195.6 is gone; PLAYER_NOTIFIERS cover marketCancelledRefundHtml, not the ADMIN letter. ⛔ the register's `to` named `houseRow`, which occurs 0× in email.ts — an undefined identifier is a crash, not a defect, so the condition is re-written onto `refundedTzs`, which the function really takes",
    file: EMAIL,
    from: "      { label: \"Players refunded\", value: String(refundedCount) },",
    to: "      { label: refundedTzs > 0 ? \"Players refunded (incl. positions held)\" : \"Players refunded\", value: String(refundedCount) },",
    expect: "0.m5.2 · ⛔ the officer's cancellation confirmation states the same four things whatever the house held: marketCancelledAdminHtml's rows are exactly Market, Reason, Players refunded, Total refunded, and every label is a PLAIN string literal",
    suite: "reports-mem",
  },
];
