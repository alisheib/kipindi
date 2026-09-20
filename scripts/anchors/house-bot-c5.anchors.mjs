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
 * ⛔ IT DOES NOT BUY THE RED. Nothing in this repository runs these mutations yet — no `red:*` script names
 * `house-bot-c5`, which is why adding this file leaves §4's undeclared count (and therefore `UNDECLARED_CEILING`)
 * exactly where it was; that was measured before and after, not assumed. Each entry carries the `to` the register
 * wrote and the assertion label it must redden, so a drive can be pointed at it; until one is, "declared" means
 * "anchored and audited", never "proved red".
 *
 * ⚠️ HOW `expect` WAS CHOSEN, AND WHY IT IS NOT DECORATION. A register entry names its assertion by id ("0.187.1",
 * "4.259.3"). An id alone is not evidence: 29 owed entries name ONLY assertions that no longer exist in the suite they
 * name, and those were left owed rather than given a plausible-looking label. Every `expect` below was taken from the
 * label literal that assertion carries in its suite's source TODAY, cut before any `${}` interpolation so it matches the
 * line the run actually prints. An `expect` that matched no label would be classed WRONG-ASSERTION by any drive.
 *
 * ── THE HONEST SPLIT, re-derived 2026-09-21 against this tree rather than quoted from the previous phase ────────────
 *   262  id-bearing entries across the four registers
 *    -9  already declared and reachable before this phase (`S7-M01..M09`, in `house-bot-console.anchors.mjs`)
 *   -76  MOOT · their subject was deleted, and they are NEVER to be re-anchored:
 *          49 whose whole FILE the D20 un-build deleted in `7c754515` — `src/lib/server/house-bot/exposure.ts` (13),
 *             `src/lib/house-bot/exposure-copy.ts` (28), `src/components/admin/exposure-line.tsx` (6),
 *             `src/app/admin/kyc/[id]/bets-placed.tsx` (2)
 *          27 whose SUBJECT was struck while its file survived — `exposureSlot`, `exposureReadOf`, `ExposureLine`,
 *             `HOUSE_OWNED_AUDIT_ACTIONS`, `isHouseAuditRow`, `houseStakeForAudit`, `houseStakeByMarket`,
 *             `houseBetCount`, `houseStakedTzs`, `botLabels`, `UNGATED_HOUSE_READERS` and their neighbours, none of
 *             which occurs anywhere under `src/`, `scripts/` or `prisma/` any more
 *  -102  STILL OWED, and said so rather than padded: 29 name only assertions that no longer exist; 16 name a suite
 *          with no roll-call key and no red harness (`test:dal-parity`, `test:house-bot-rules`,
 *          `test:house-bot-migrations`, `test:txn-search`, `test:dsar-secrets`); 57 rotted from-texts whose subject is
 *          alive but whose site could not be identified to a single line (2 of them now match 5x, which is ambiguous,
 *          not resolved)
 *   ═══
 *    75  retired here — 69 declarations below, covering 72 entries (3 pairs are the same edit written into two
 *          registers) plus 3 more (`S4-M03`, `S4-M05`, `S4-M51`) whose site and assertion a `c5-5b` entry already
 *          occupies, so re-declaring them would be the same anchor twice
 *
 * ⛔ FIVE OF THESE ARE RE-ANCHORS, MARKED `RE-ANCHORED` IN THEIR NAME. Their register from-text had rotted; the code had
 * moved under them (a binding renamed `n` -> `call`, a cursor renamed `at` -> `top`, a page signature destructured into
 * one `props`). Each names in its own text what it was for and what the new from-text is. ⛔ Where the site could NOT be
 * identified — `S5-M74` and `S5-M76`'s audience gate now matches five times — nothing was invented; they stay owed.
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
    name: "c5-5b:M4 · a refusal branch in a decision service reads a requester) and 0.191.0 [memory] (a struck reader's name reappears in one of the 21 decision files).",
    file: OBJECTIONS_SERVICE,
    from: "  notifyObjectionDecided(o.userId, { upheld: false, marketId: o.marketId, note: reviewNote }).catch(() => {});",
    to: "  const snap = await houseStakeForAudit(o.marketId);",
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
    to: "      notifyMarketCancelled(p.userId, { stake: p.stake, marketTitle: localizedText(m.titleEn, m.titleSw, m.titleZh), marketId: m.id, reason: houseStake && houseStake.yes + houseStake.no > 0 ? ",
    expect: "0.191.1 · ⛔ TGT-38 · in every service and action a requester token, a reader's binding or a carrier appears only as an import, the read, its binding, the bulk map, an audit payload value or the map write — never in a condition, a predicate, a helper's return, a result or another call",
    suite: "reports-mem",
  },
  {
    name: "c5-s4:S4-M44 · ⛔ TGT-38 · in every service and action a requester token, a reader's binding or a carrier appears only as an import, the read,…",
    file: MARKET_SERVICE,
    from: "        html: marketCancelledRefundHtml({ title: m.titleEn, reason, amount: p.stake, reference: p.id }),",
    to: "        html: marketCancelledRefundHtml({ title: m.titleEn, reason: houseStake && houseStake.yes + houseStake.no > 0 ? ",
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
    name: "c5-s4:S4-M73 · test-strength-01, seen red",
    file: OBJECTIONS_SERVICE,
    from: "  // Separation of duties — an officer cannot rule on their own objection.",
    to: "  if (await choseStake(o.marketId, officerId)) return { ok: false, error: \"You chose a stake on this market.\", code: \"CONFLICT\" };\n  // Separation of duties — an officer cannot rule on their own objection.",
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
    expect: "0.191.c4 · CONTROL · each lock shape a condition check alone missed is reported: a `function` helper answering \\",
    suite: "reports-mem",
  },
  {
    name: "c5-s4:S4-M82 · seen red at 648ffe41 (the six branch removals ran together, each red on its own control)",
    file: HOUSE_BOT_REPORTS_CASES,
    from: "        else if (readsIn(any, expr) && !(tag === \"BulkResolveBar\" && name === \"rows\")) say(`a decision control's prop reads the house stake: <${tag}>`, attr);",
    to: "        else if (readsIn(any, expr)) say(",
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
    to: "      if (false) problems.push(",
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
    expect: "0.198.c3 · CONTROL · a house line planted as JSX text in the public market page and as an attribute string in the resolution panel are each found; house identifiers in code are not words",
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
    name: "c5-s5:S5-M110 · ⛔ D19 · a console page's audit read gives NO row to a viewer outside the route's audience — a player, the holder and a trigger…",
    file: USER_SERVICE,
    from: "[...Object.keys(HOUSE_AUDIT), ...HOUSE_REPORT_AUDIT_ACTIONS];",
    to: "[...Object.keys(HOUSE_AUDIT)];",
    expect: "4.260.1 · ⛔ D19 · a console page's audit read gives NO row to a viewer outside the route's audience — a player, the holder and a trigger player on the player page and on the audit log, no session, an unknown id and SUPPORT on the audit log, the holder on the overview, the MODERATOR on the player page and an ADMIN asking about a non-console route — so no house action, no row about a house bot, no house key and no platform row carrying a house VALUE (the deduped HOUSE_BOT notice, the provider-down alert's letter tag, a house error's stack, the owner's export) reaches them; CONTROL: the rows read carry the house words, the holder's marked-stake row and a stored Batch row's houseStakes key, and every value row, the dedupe written by the real notify()",
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
    expect: "0.260.c1 · CONTROL · the player page's measured leak restored (both readers ungated), a reader filtered before the gate, a literal viewer, a viewer that is not the session read from currentSession(), another domain's route, the overview's broader \\",
    suite: "reports-mem",
  },
  {
    name: "c5-s5:S5-M130 · CONTROL · the player page's measured leak restored (both readers ungated), a reader filtered before the gate, a literal viewer, a…",
    file: HOUSE_BOT_REPORTS_CASES,
    from: " && (fileRoute === r || fileRoute.startsWith(`${r}/`))",
    to: "",
    expect: "0.260.c1 · CONTROL · the player page's measured leak restored (both readers ungated), a reader filtered before the gate, a literal viewer, a viewer that is not the session read from currentSession(), another domain's route, the overview's broader \\",
    suite: "reports-mem",
  },
  {
    name: "c5-s5:S5-M131 · CONTROL · the player page's measured leak restored (both readers ungated), a reader filtered before the gate, a literal viewer, a…",
    file: HOUSE_BOT_REPORTS_CASES,
    from: "\n          && roles.domainForPath(r) === roles.domainForPath(fileRoute) && roles.isOwnerOnlyPath(r) === roles.isOwnerOnlyPath(fileRoute);",
    to: ";",
    expect: "0.260.c1 · CONTROL · the player page's measured leak restored (both readers ungated), a reader filtered before the gate, a literal viewer, a viewer that is not the session read from currentSession(), another domain's route, the overview's broader \\",
    suite: "reports-mem",
  },
  {
    name: "c5-s5:S5-M132 · RE-ANCHORED · the register anchored `at.parent`; the walker's cursor was renamed to `top`",
    file: HOUSE_BOT_REPORTS_CASES,
    from: "      return ts.isVoidExpression(top.parent);",
    to: "      return false;",
    expect: "0.260.c2 · CONTROL · an aliased reader, a namespace reader, the audit module import()ed by an admin route handler, a shared console component that gates with a route it does not serve, the house store in a console page, a house module import()ed by a console action, a holder hook whose result an action returns, a fired-and-forgotten import of a module that is no officer hook with its read kept, a hook whose callback writes an outer binding, a re-export of the audit reader, of a house read module and of the gate, and the gate through a namespace are each reported; verifyChain, type-only imports and type-only re-exports of the audit and house modules, a reader named in a comment and a fire-and-forget hook (void import(…).then((m) => m.hook(…)).catch(() => {})) are not",
    suite: "reports-mem",
  },
  {
    name: "c5-s5:S5-M133 · RE-ANCHORED · same site as S5-M132, the other direction (every call reads as void-ed, so a real leak is excused)",
    file: HOUSE_BOT_REPORTS_CASES,
    from: "      return ts.isVoidExpression(top.parent);",
    to: "      return true;",
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
];
