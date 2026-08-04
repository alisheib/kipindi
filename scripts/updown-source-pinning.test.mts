/**
 * Up & Down SOURCE PINNING — structural guards.
 *
 *   npx tsx scripts/updown-source-pinning.test.mts     (npm run test:updown-source)
 *
 * These read the SOURCE FILES AS TEXT and assert on the code, in the idiom of
 * `scripts/payout-observability.test.mts`. That is deliberate, and the rationale is the
 * same: the behaviour they protect is a NEGATIVE — that no path re-derives a live round's
 * line, moves its source link, or resolves against the asset row instead of the round's own
 * pin. A behavioural test can prove a path is right; only a structural one can prove a
 * WRONG path was never added. This repo has been bitten three times by a green suite over a
 * broken thing, most recently by an in-memory fake that was more permissive than production.
 *
 * ⚠️ HAZARDS THIS FILE HANDLES, because they have all bitten here before:
 *   · CRLF — this repo checks out CRLF, so a pattern anchored on "\n" matches nothing and
 *     `indexOf` returns -1, which `slice()` reads as an offset from the END. Every pattern
 *     below uses bounded `[\s\S]{0,N}` windows instead.
 *   · PREFIX COLLISION — `bodyOf(src, "function wireLog")` once matched `wireLogMode`. Every
 *     signature here carries its trailing "(".
 *   · SILENT EMPTY MATCH — a structural assertion that matches "" passes for the wrong
 *     reason, so every slice asserts it was FOUND before anything asserts on its contents.
 */
import { readFileSync } from "node:fs";
import { CONTROL_DOMAIN } from "../src/lib/server/control-gates.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; console.log(`PASS ${label}${extra ? ` — ${extra}` : ""}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}

const srv = (p: string) => readFileSync(new URL(`../src/lib/server/${p}`, import.meta.url), "utf8");
const service  = srv("updown-service.ts");
const dal      = srv("updown-dal.ts");
const config   = srv("updown-config.ts");
const feed     = srv("updown-feed.ts");
const oracle   = srv("updown-oracle.ts");
const polls    = srv("ai-poll-generation.ts");
const mkt      = srv("market-service.ts");
const schema   = readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
const events   = readFileSync(new URL("../src/app/admin/events/actions.ts", import.meta.url), "utf8");
const nav      = readFileSync(new URL("../src/components/admin/admin-nav-groups.ts", import.meta.url), "utf8");

/** Slice out one function body by its signature, up to the next top-level export. */
function bodyOf(src: string, signature: string): string {
  const start = src.indexOf(signature);
  if (start < 0) return "";
  const next = src.indexOf("\nexport ", start + signature.length);
  return src.slice(start, next < 0 ? src.length : next);
}

/**
 * "`a` appears before `b`" — and BOTH must actually appear.
 *
 * ⚠️ THE MUTATION CHECK CAUGHT THIS, WHICH IS THE ONLY REASON IT IS A FUNCTION. Four
 * assertions in this file were written as `hay.indexOf(a) < hay.indexOf(b)`. Delete `a`
 * entirely and `indexOf` returns **-1**, which is less than everything — so the assertion
 * PASSES on code where the gate it guards has been removed outright. That is the worst
 * possible failure for a structural test: green over the exact defect it exists to catch.
 * Requiring both needles makes a deleted gate a failure instead of a pass.
 */
function before(hay: string, a: string, b: string): boolean {
  const ia = hay.indexOf(a);
  const ib = hay.indexOf(b);
  return ia >= 0 && ib >= 0 && ia < ib;
}

// ── 1 · The round carries its own source ─────────────────────────────────────
console.log("\n── 1 · the round carries its own source ────────────────────────");
ok("UpDownRound declares BOTH captured columns",
  /model UpDownRound[\s\S]{0,4000}capturedSourceUrl\s+String\?[\s\S]{0,600}capturedSourceDomain\s+String\?/.test(schema));
ok("StoredRound carries both, so no read path can forget them",
  /capturedSourceUrl:\s*string \| null/.test(dal) && /capturedSourceDomain:\s*string \| null/.test(dal));
ok("toRound() maps both out of the row",
  /capturedSourceUrl:\s*r\.capturedSourceUrl/.test(dal) && /capturedSourceDomain:\s*r\.capturedSourceDomain/.test(dal));
ok("the create path persists both",
  /capturedSourceUrl:\s*r\.capturedSourceUrl,\s*capturedSourceDomain:\s*r\.capturedSourceDomain/.test(dal));
ok("VoidReason admits source-mismatch", /"source-mismatch"/.test(dal));

// ── 2 · A live round's line and link CANNOT be recomputed or moved ───────────
console.log("\n── 2 · a live round's terms cannot move under staked money ─────");
// NOT bodyOf(): this const is not exported, so slicing to the next top-level `export`
// swallows `prismaRounds.create`, which legitimately DOES name every frozen column — and
// the assertions below would then fail against perfectly correct code. Bound the window to
// the object literal itself.
const patchStart = dal.indexOf("const ROUND_PATCHABLE");
const patchable = patchStart < 0 ? "" : dal.slice(patchStart, dal.indexOf("};", patchStart));
ok("ROUND_PATCHABLE was found and bounded to its own literal",
  patchable.length > 0 && patchable.includes("openObservationId") && !patchable.includes("prismaRounds"));
for (const frozen of ["marginBps", "upTarget", "downTarget", "capturedSourceUrl", "capturedSourceDomain"]) {
  ok(`⛔ roundStore.patch cannot write ${frozen}`,
    !new RegExp(`\\b${frozen}\\s*:`).test(patchable),
    "a frozen column in the patch allowlist is a live round's terms moving under staked money");
}
ok("patch REFUSES an unknown column rather than dropping it silently",
  dal.includes("is not a patchable column"));
ok("⛔ the IN-MEMORY store enforces the SAME allowlist",
  (dal.match(/is not a patchable column/g) ?? []).length >= 2,
  "a fake more permissive than production makes a green suite prove nothing");

ok("computeTargets is called in exactly ONE place",
  (service.match(/computeTargets\(/g) ?? []).length === 1);
const open  = bodyOf(service, "export async function openRound(");
const close = bodyOf(service, "export async function closeRound(");
ok("openRound was found", open.length > 0);
ok("closeRound was found", close.length > 0);
ok("…and that one place is openRound", open.includes("computeTargets("));
ok("closeRound never recomputes the line — it reads the frozen targets",
  !close.includes("computeTargets(") && close.includes("round.upTarget") && close.includes("round.downTarget"));

// ── 3 · Resolution reads the ROUND's link, never the asset's live one ───────
console.log("\n── 3 · resolution reads the round's pin, not the asset row ─────");
ok("openRound captures the link ONCE into locals",
  /const capturedSourceUrl = asset\.priceSourceUrl;[\s\S]{0,200}const capturedSourceDomain = asset\.sourceDomain;/.test(open));
ok("openRound writes both onto the round",
  /capturedSourceUrl,[\s\S]{0,80}capturedSourceDomain,/.test(open));
ok("the MARKET row is stamped with the same captured link",
  /sourceUrl:\s*capturedSourceUrl/.test(open),
  "the money row and the price row must name ONE page, not two");
ok("the player-facing criterion names the CAPTURED domain",
  /resolutionCriterion[\s\S]{0,900}capturedSourceDomain/.test(open));
ok("⛔ openRound never reads the asset's live domain after the capture",
  (open.match(/asset\.sourceDomain/g) ?? []).length === 1,
  "exactly one reference: the capture itself");

ok("⛔ closeRound checks the reading against the round's pin BEFORE deciding",
  /observationMatchesRound[\s\S]{0,1200}(decideOutcomeByTargets|decideOutcome)\(/.test(close),
  "the check must GATE the verdict, not annotate it afterwards");
ok("a mismatch VOIDs rather than settling",
  close.includes('"source-mismatch"') && /sourceMismatch \? "VOID"/.test(close));
ok("the mismatch reason wins over the arithmetic's reason",
  /sourceMismatch \? "source-mismatch"/.test(close));
// ⚠️ NOT just `close.includes("round.capturedSourceDomain")`. That passed even with the
// check itself rewired to `asset.sourceDomain`, because the receipt line legitimately
// mentions the round's pin too. Assert on the CALL, which is the thing that decides money.
ok("⛔ the check is passed the ROUND's pin, not the asset's live domain",
  /observationMatchesRound\(\s*obs\.sourceUrl,\s*round\.capturedSourceDomain\s*\)/.test(close),
  "reading the asset row here is the exact bug this whole change closes");
ok("…and the ONLY `asset.sourceDomain` left in closeRound is the documented legacy receipt fallback",
  (close.match(/asset\.sourceDomain/g) ?? []).length <= 1 &&
  /round\.capturedSourceDomain \?\? asset\.sourceDomain/.test(close));

const matches = bodyOf(service, "export function observationMatchesRound(");
ok("observationMatchesRound was found", matches.length > 0);
ok("legacy is SKIP, never mismatch — an uncheckable round is not voided on suspicion",
  /if \(!roundSourceDomain \|\| !observationSourceUrl\) return \{ ok: true, checked: false \}/.test(matches));
ok("it uses the ONE shared host rule, not a private copy",
  matches.includes("hostMatchesDomain("));
ok("⛔ there is exactly ONE definition of the host rule on the platform",
  (feed.match(/export function hostMatchesDomain\(/g) ?? []).length === 1 &&
  !/function hostMatchesDomain\(/.test(service) && !/function hostMatchesDomain\(/.test(oracle),
  "two copies is two answers to a question that decides whether money settles");

// ── 4 · The asset's source cannot move under an unresolved round ────────────
console.log("\n── 4 · the source lock lives in the SERVICE, not the action ────");
const upd = bodyOf(config, "export async function updateAsset(");
ok("updateAsset was found", upd.length > 0);
ok("⛔ it refuses a source change while rounds are unresolved",
  /sourceChanged[\s\S]{0,400}unresolvedRoundsForAsset[\s\S]{0,300}return \{[\s\S]{0,80}ok: false/.test(upd),
  "in the service, because a hidden UI control is not a control");
ok("the refusal tells the operator the way out",
  /Pause this asset/.test(upd));
ok("the guard runs BEFORE the write",
  before(upd, "unresolvedRoundsForAsset", "assetStore.upsert"));

// ── 5 · The feed cannot fabricate, and cannot leak its key ──────────────────
console.log("\n── 5 · the feed refuses rather than inventing ──────────────────");
const mock = bodyOf(feed, "export class MockPriceFeed");
ok("MockPriceFeed was found", mock.length > 0);
ok("⛔ the simulated feed refuses in production",
  /process\.env\.NODE_ENV === "production"[\s\S]{0,300}mock-in-production/.test(mock),
  "a fabricated price would SETTLE money — A-5 is real data or nothing");
ok("⛔ …with no env flag that re-enables it",
  !/MOCK|ALLOW|OVERRIDE|FORCE/.test(mock.replace(/mock-in-production/g, "").replace(/MockPriceFeed/g, "")),
  "the refusal must not be operator-flippable");
const select = bodyOf(feed, "export function feedFromId(");
ok("feedFromId was found", select.length > 0);
ok("⛔ a missing key does NOT fall back to the mock",
  /if \(!key\) return new UnconfiguredFeed/.test(select) && !/if \(!key\) return new MockPriceFeed/.test(select),
  "silently swapping invented prices for real ones is the worst thing this file could do");
const td = bodyOf(feed, "export class TwelveDataFeed");
ok("TwelveDataFeed was found", td.length > 0);
ok("⛔ the API key never reaches the stored sourceUrl",
  /sourceUrl: `\$\{url\.origin\}\$\{url\.pathname\}/.test(td) && !/sourceUrl: url\.toString\(\)/.test(td),
  "sourceUrl is rendered in the player's proof panel and kept in the audit trail");
ok("an undated quote is refused", /no-timestamp/.test(td));
ok("the endpoint's host is checked before any call",
  /hostMatchesDomain\(req\.endpoint, req\.approvedDomain\)/.test(bodyOf(feed, "export async function quoteAsset(")));

// ── 6 · Ops states never burn a round's retry budget ───────────────────────
console.log("\n── 6 · an ops mistake never voids a live round ─────────────────");
const acquire = bodyOf(service, "export async function acquireObservation(");
ok("acquireObservation was found", acquire.length > 0);
// ⚠️ RE-POINTED 2026-08-04, AND THE REASON GENERALISES.
//
// This asserted the literal shape `if (!operatorState) await recordAttempt(...)`. That shape
// is gone: the decision moved into ONE pure function, `refusalCostsAnAttempt`, because a
// dated feed added a THIRD kind of refusal that must not burn the budget (`bar-not-published`
// — the bar for the boundary minute has not published yet, measured at up to +60s on SOL).
// Two copies of "does this cost an attempt" would be two answers to a question that voids
// real rounds.
//
// ⛔ So the guard now pins the DELEGATION rather than an inlined condition. That is not a
// weaker check — it is the same check at the right altitude: an unconditional
// `recordAttempt` still fails here, and the carve-out's actual behaviour is proven
// exhaustively in `test:updown-late-close` §1 (every reason × inside/outside the grace).
// A guard that pins an implementation SHAPE fails when the code is factored properly, which
// teaches the next session to inline rather than to share.
// ⚠️ ONE POSITIVE ASSERTION, NOT A POSITIVE PLUS A NEGATIVE. The first version also required
// that no bare `await observationStore.recordAttempt(obs.id, detail);` line existed — which is
// the very line that sits INSIDE the conditional, so the guard contradicted itself and failed
// on correct code. A "the bad shape is absent" check that cannot tell the bad shape from the
// good one is worse than no check: it fails the fix and passes nothing.
// The positive form is sufficient — an UNCONDITIONAL recordAttempt has no
// `refusalCostsAnAttempt(...) {` wrapping it, so it fails here.
ok("⛔ an operator-state refusal does NOT record an attempt",
  /refusalCostsAnAttempt\([\s\S]{0,160}\)\s*\{[\s\S]{0,160}observationStore\.recordAttempt/.test(acquire),
  "burning the budget here voids live rounds for an ops action, which is what the old code did");
// ⚠️ Asserts the CALL, not the field name. This used to match /retryBackoffSeconds/ against
// the function body — which a mere COMMENT satisfies, so the guard would have gone on passing
// over a ladder that had been ripped out and merely described. It now pins the one reader.
ok("the backoff ladder is actually climbed here",
  /retryDelaySeconds\(cfg,/.test(acquire),
  "it sat in the config unread for the life of the feature; a comment naming it is not a read");
ok("…and the gate is driven by an INJECTED clock, so the healer's simulated time reaches it",
  /now: number = Date\.now\(\)/.test(acquire.slice(0, 400)) || /acquireObservation\([\s\S]{0,300}now: number/.test(service),
  "a wall-clock read here makes the ladder untestable and silently un-climbable under a fake clock");

// ℹ️ MERGE NOTE (2026-08-01). These two assertions named `resolveOverdueRounds`, this
// branch's own heal sweep. It lost to `healStuckRounds` on the merge — see the merge note in
// updown-service.ts — so they are repointed rather than deleted: the PROPERTIES they pin
// (bounded work per tick, and independence from chain state) are exactly as load-bearing on
// the surviving sweep, and dropping them would quietly retire two real guards.
const heal = bodyOf(service, "export async function healStuckRounds(");
ok("the heal sweep exists and bounds its work per tick",
  heal.length > 0 && /limit\s*=\s*opts\?\.limit\s*\?\?\s*HEAL_BATCH/.test(heal),
  "an unbounded sweep turns one tick into a scan of the whole round history");
ok("⛔ the heal sweep is independent of chain state",
  /roundStore\.unresolvedBefore\(/.test(heal),
  "money already staked must terminate even on a PAUSED or STOPPED chain — filtering by chain state re-opens E-24");
ok("⭐ …and it terminates a round on a DEADLINE, not only on the attempt budget",
  /abandonAfterSeconds\(/.test(heal),
  "the ops-state carve-out above means the budget may never be spent; without the deadline that strands the stake forever");

// ── 7 · The polls half: one gate on both doors ──────────────────────────────
console.log("\n── 7 · the pause switch gates the generator itself ─────────────");
const gen = bodyOf(polls, "export async function generateAIPoll(");
ok("generateAIPoll was found", gen.length > 0);
ok("⛔ the pause switch is enforced inside the generator",
  /isPollGenEnabled\(\)/.test(gen), "a gate on one of two doors is not a gate");
ok("…before the budget gate — a disabled feature must not consult the meter",
  before(gen, "isPollGenEnabled", "assertAiBudget"));
ok("the event-calendar door refuses cleanly too",
  /isPollGenEnabled/.test(events));

// ── 8 · The sentinel's citation is a CONDITION on the auto path ─────────────
console.log("\n── 8 · auto-resolve requires the market's own source ───────────");
const decide = bodyOf(mkt, "export function decideAutoResolve(");
ok("decideAutoResolve was found", decide.length > 0);
// ⚠️ Anchored on the `&&` that joins it, not merely on the identifier appearing somewhere
// within 400 chars — the loose form passed while `sourceMatches` sat in dead code beside a
// `confident` that no longer used it.
ok("⛔ sourceMatches is a CONJUNCT of `confident`, not only of goAuto",
  /const confident =[\s\S]{0,400}&&\s*sourceMatches;/.test(decide),
  "so the early-recheck path refuses a mismatched read too");
ok("it stays PURE — the caller computes the match",
  !decide.includes("await ") && !decide.includes("marketStore"));
ok("the verdict helper is derived, not a stored column",
  /export function sentinelSourceVerdict\(/.test(srv("market-sentinel.ts")) &&
  !/sentinelSourceVerdict\s+String/.test(schema),
  "a derived value cannot go stale against an edited market");

// ── 9 · Nav ordering (a reversed prefix is unreachable) ─────────────────────
console.log("\n── 9 · admin nav prefixes stay reachable ───────────────────────");
const iRounds = nav.indexOf('["/admin/updown/rounds"');
const iProps  = nav.indexOf('["/admin/updown/proposals"');
const iBase   = nav.indexOf('["/admin/updown"');
ok("all three updown route prefixes are registered", iRounds > 0 && iProps > 0 && iBase > 0);
ok("⛔ the more specific prefixes come FIRST, or they are unreachable",
  iRounds < iBase && iProps < iBase, "the shorter prefix matches first and would swallow them");

// ── 10 · ⛔ A proposal cannot skip the officer and arm itself ────────────────
console.log("\n── 10 · the proposal officer gate ──────────────────────────────");
const prop = readFileSync(new URL("../src/lib/server/updown-proposal.ts", import.meta.url), "utf8");

const armBody = bodyOf(prop, "export async function armProposal(");
ok("armProposal was located", armBody.length > 200, `${armBody.length} chars`);
ok("⛔ armProposal refuses any state but APPROVED",
  /if \(p\.state !== "APPROVED"\)/.test(armBody),
  "without this a freshly-generated proposal could arm itself");
ok("…and the refusal precedes every write",
  before(armBody, 'p.state !== "APPROVED"', "updateAsset("),
  "a gate after the write is not a gate");

// The ONLY writer of armedChainId. A second writer means a chain could be attributed to a
// proposal that never went through review.
const armedWrites = (prop.match(/armedChainId = /g) ?? []).length;
ok("⛔ exactly ONE assignment of armedChainId in the module", armedWrites === 1, `found ${armedWrites}`);

// The generation path must not be able to reach the arm path, or the officer is decorative.
const genBody = bodyOf(prop, "export async function generateProposal(");
ok("generateProposal was located", genBody.length > 500, `${genBody.length} chars`);
ok("⛔ generateProposal never calls armProposal", !/armProposal\(/.test(genBody));
ok("⛔ …nor setChainState", !/setChainState\(/.test(genBody));
ok("⛔ …nor createChain", !/createChain\(/.test(genBody));
ok("⛔ …nor updateAsset — it cannot move a source either", !/updateAsset\(/.test(genBody));
ok("…and it never writes an APPROVED or ARMED state",
  !/state = "APPROVED"/.test(genBody) && !/state = "ARMED"/.test(genBody));

// Arming through the SERVICE functions is what makes the source lock apply to it.
ok("⛔ arming moves the source through updateAsset, not a store",
  /updateAsset\(asset\.id, \{ priceSourceUrl: p\.sourceUrl \}/.test(armBody),
  "a direct assetStore write would bypass the source lock entirely");
ok("⛔ the arm path touches no store directly", !/assetStore|chainStore|roundStore/.test(armBody),
  "every write must go through a service function that carries its refusals");
ok("…and it re-validates at the moment of arming",
  /validateProposal\(p\)/.test(armBody), "an approval minutes old may no longer be valid");

// Approve must re-validate too: the UI hides the button, but the action is reachable.
const apprBody = bodyOf(prop, "export async function approveProposal(");
ok("approveProposal re-validates rather than trusting the stored state",
  /validateProposal\(p\)/.test(apprBody) && /reasons\.length > 0/.test(apprBody));

// The pause switch, inside the generator, before the budget gate.
ok("⛔ generateProposal checks the AI pause switch", /isPollGenEnabled\(\)/.test(genBody));
ok("…BEFORE consulting the credit meter",
  before(genBody, "isPollGenEnabled()", "assertAiBudget("),
  "a disabled feature should not spend against the meter");
ok("…and it is the SAME switch the polls half uses (no second key)",
  !/updownGenEnabled|proposalGenEnabled/.test(prop), "one AI switch on the platform, not two");

// Reject reasons are a closed set, filtered server-side.
const rejBody = bodyOf(prop, "export async function rejectProposal(");
ok("⛔ reject filters the client's reasons against the closed set",
  /PROPOSAL_REJECT_REASONS\.includes\(r\)/.test(rejBody),
  "a free-text reason cannot be counted and still reaches reports");

// Arming is a money action, so it is gated like one.
const propActions = readFileSync(new URL("../src/app/admin/updown/proposals/actions.ts", import.meta.url), "utf8");
const armAction = bodyOf(propActions, "export async function armProposalAction(");
/**
 * ⛔ Assert the PROPERTY, not the spelling.
 *
 * This read `/requireStaff\("accounting"\)/` — the literal. E-27 then moved the domain
 * into `CONTROL_DOMAIN.armProposal` (so the PAGE can ask the same question before it
 * renders an armed button a MODERATOR can only bounce off), and this guard went red
 * against a tree where the gate was **unchanged and strictly better documented**.
 *
 * A guard that fails when a correct refactor keeps its property teaches the next session
 * to revert the refactor. So: check that the action gates on the control, and that the
 * control's registered domain IS `accounting`. Both halves matter — the first alone would
 * pass if the control were silently re-registered as `trading`.
 */
ok('⛔ armProposalAction is gated on "accounting", not "trading"',
  /requireStaff\(\s*CONTROL_DOMAIN\.armProposal\b/.test(armAction) && CONTROL_DOMAIN.armProposal === "accounting",
  `arming starts a chain that emits real-money rounds (registered domain: ${CONTROL_DOMAIN.armProposal})`);

const line = "─".repeat(70);
console.log(`\n${line}\n  UPDOWN SOURCE PINNING: ${pass} passed, ${fail} failed\n${line}`);
if (fail === 0) {
  console.log("  OK — no path recomputes a live round's line, moves its source link, or");
  console.log("       resolves against the asset row; the feed cannot fabricate or leak its");
  console.log("       key; and an ops mistake cannot void a round that holds money.");
}
process.exit(fail === 0 ? 0 : 1);
