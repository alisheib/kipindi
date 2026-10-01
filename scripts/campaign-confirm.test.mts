/**
 * test:campaign-confirm — U40's pure rule (`src/lib/marketing/campaign-confirm.ts`): which confirmation an audience
 * needs, what a typed number reads as, what the signed fence claim may hold (X9, X13), whether a confirmation may
 * freeze (OD27), and whether Start may go ahead (OD28).
 *
 * ⭐ DRIVEN, NOT READ. Every exported function is EXECUTED over named fixtures, and the gate over a grid of every
 * (fresh claim × view × typed text) combination. The source is read only for what only the source can show: that it
 * imports nothing from the server, that the gate's input has no posted count, and that the threshold is written once.
 * Two wiring files are read as well (7.4, 7.5): `test:client-graph-safe`'s PINNED list, because the confirm modal
 * imports this module in the browser, and package.json, because a suite that no deploy runs gates nothing.
 *
 * 🔴 THE PLAN'S OWN RED (§9 U40): "compare against the posted count → the stale-client fixture must be refused and
 * the suite must fail without the fix." That is 4.4 here, and plant R1 is exactly that defect.
 *
 * ⚠️ WHAT THIS SUITE DOES NOT HOLD. The keyed HMAC, the signed token, the service on the memory twin, the conditional
 * write and "nothing is sent" belong to U40a's `test:campaign-gates`, which drives the server half. This suite holds
 * the rule those all call, so it can never drift between the modal and the server.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION. `--prove-red` plants each defect IN MEMORY (a replacement function, or a copied
 * source string) and requires the MATCHING assertion to fail; red on some other line is reported, never counted as a
 * catch. Before any plant runs, the plants' own stand-in gate and Start, with no flaw switched on, must pass every
 * assertion they replace: a plant that is red for a reason other than its flaw proves nothing. This file makes no
 * file-writing call.
 *
 * Run:  npm run test:campaign-confirm
 * Red:  npm run red:campaign-confirm
 */
process.exitCode = 1;

import { readFileSync } from "node:fs";
import { decomment } from "./lib/decomment.mts";
import {
  CONFIRM_ENUMERATE_MAX,
  CONFIRM_REFUSAL_REASONS,
  CONFIRM_REFUSAL_COPY,
  CONFIRM_TIER_COLUMN,
  MEMBERS_KEY_HEX_CHARS,
  confirmTier,
  parseTypedCount,
  confirmTypedWord,
  canonicalMembers,
  buildFenceClaim,
  parseFenceClaim,
  decideConfirm,
  confirmWriteRefusal,
  startAudienceVerdict,
  confirmTierFromColumn,
  type ConfirmTier,
  type FenceClaim,
  type ConfirmDecision,
  type DecideRefusalReason,
  type StartAudienceVerdict,
} from "../src/lib/marketing/campaign-confirm.ts";

const PROVE_RED = process.argv.includes("--prove-red");

const SOURCE = decomment(readFileSync(new URL("../src/lib/marketing/campaign-confirm.ts", import.meta.url), "utf8")).replace(/\r\n/g, "\n");

/** `test:client-graph-safe`'s PINNED list, as text — or "" when it cannot be found, which fails 7.4 by name. */
function readPinned(): string {
  try {
    const cgs = decomment(readFileSync(new URL("./client-graph-safe.test.mjs", import.meta.url), "utf8"));
    const at = cgs.indexOf("const PINNED = [");
    const end = at < 0 ? -1 : cgs.indexOf("];", at);
    return at < 0 || end < 0 ? "" : cgs.slice(at, end + 2);
  } catch { return ""; }
}

type Wiring = { predeploy: string; test: string | null; red: string | null };
/** The suite's own keys in package.json — or blanks when it cannot be read, which fails 7.5 by name. */
function readWiring(): Wiring {
  try {
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { scripts?: Record<string, string> };
    const s = pkg.scripts ?? {};
    return { predeploy: s.predeploy ?? "", test: s["test:campaign-confirm"] ?? null, red: s["red:campaign-confirm"] ?? null };
  } catch { return { predeploy: "", test: null, red: null }; }
}

/* ══ THE BUNDLE UNDER TEST ═════════════════════════════════════════════════════════════════════════ */

type Impl = {
  max: number;
  tier: typeof confirmTier;
  parse: typeof parseTypedCount;
  word: typeof confirmTypedWord;
  members: typeof canonicalMembers;
  build: typeof buildFenceClaim;
  parseClaim: typeof parseFenceClaim;
  decide: typeof decideConfirm;
  writeRefusal: typeof confirmWriteRefusal;
  start: typeof startAudienceVerdict;
  copy: typeof CONFIRM_REFUSAL_COPY;
  column: typeof CONFIRM_TIER_COLUMN;
  fromColumn: typeof confirmTierFromColumn;
  /** The module's decommented source. */
  source: string;
  /** `test:client-graph-safe`'s PINNED list. */
  pinned: string;
  /** This suite's keys in package.json. */
  wiring: Wiring;
};

const REAL: Impl = {
  max: CONFIRM_ENUMERATE_MAX,
  tier: confirmTier,
  parse: parseTypedCount,
  word: confirmTypedWord,
  members: canonicalMembers,
  build: buildFenceClaim,
  parseClaim: parseFenceClaim,
  decide: decideConfirm,
  writeRefusal: confirmWriteRefusal,
  start: startAudienceVerdict,
  copy: CONFIRM_REFUSAL_COPY,
  column: CONFIRM_TIER_COLUMN,
  fromColumn: confirmTierFromColumn,
  source: SOURCE,
  pinned: readPinned(),
  wiring: readWiring(),
};

/* ══ THE RECORDER ══════════════════════════════════════════════════════════════════════════════════ */

let pass = 0, fail = 0, quiet = false;
const failed: string[] = [];
/** ⛔ A THROW IS A FAIL, NEVER A CRASH: one broken function cannot hide the other results. */
const ok = (label: string, cond: () => boolean, detail?: () => string) => {
  let c = false, why = "";
  try { c = cond() === true; } catch (e) { why = `threw: ${e instanceof Error ? e.message : String(e)}`; }
  if (!c && why === "" && detail) { try { why = detail(); } catch { why = "(the detail threw)"; } }
  if (c) pass++; else { fail++; failed.push(label); }
  if (!c || !quiet) console.log(`${c ? "PASS" : "FAIL"} ${label}${!c && why ? ` — ${why}` : ""}`);
};

/* ══ FIXTURES ══════════════════════════════════════════════════════════════════════════════════════ */

const NBSP = String.fromCharCode(0x00a0);
const NNBSP = String.fromCharCode(0x202f);
/** The same digits written in another script: what the gate must never read. */
const inScript = (digits: string, zero: number) => [...digits].map((d) => String.fromCharCode(zero + Number(d))).join("");
const ARABIC_INDIC_ZERO = 0x0660;
const FULLWIDTH_ZERO = 0xff10;

/** Two well-formed members keys (the shape `audience-fence.ts` makes), and the bare keys of seven people. */
const K1 = "0123456789abcdef0123456789abcdef";
const K2 = "fedcba9876543210fedcba9876543210";
const P = ["255712345678", "255754000111", "255621000222", "255713000333", "255765000444", "255688000555", "255744000666"];

const CAMPAIGN = "sc_t1";
const REV = 2;
/** A claim written out by hand, so a malformed one can be built on purpose. */
const claim = (count: number, tier: ConfirmTier, membersKey: string | null, o: { campaignId?: string; draftRevision?: number } = {}): FenceClaim => ({
  v: 1, campaignId: o.campaignId ?? CAMPAIGN, draftRevision: o.draftRevision ?? REV, count, tier, membersKey,
});
/** A claim in a format version this module has never written. */
const otherVersion = (c: FenceClaim) => ({ ...c, v: 2 }) as unknown as FenceClaim;

const DECIDE_REASONS: ReadonlySet<string> = new Set<DecideRefusalReason>([
  "audience_moved", "typed_mismatch", "typed_required", "audience_empty", "stale_view", "draft_changed",
]);
const HEX = new RegExp(`^[0-9a-f]{${MEMBERS_KEY_HEX_CHARS}}$`);
/** The tier a claim must be HELD to, written from the rule rather than read from the module. */
const heldTier = (c: FenceClaim): ConfirmTier =>
  c.tier === "enumerate" && Number.isSafeInteger(c.count) && c.count >= 1 && c.count <= CONFIRM_ENUMERATE_MAX
    && typeof c.membersKey === "string" && HEX.test(c.membersKey) ? "enumerate" : "typed";

const refusedAs = (d: ConfirmDecision, reason: DecideRefusalReason) => d.ok === false && d.reason === reason;
const show = (d: ConfirmDecision) =>
  d.ok ? `ok ${JSON.stringify(d.freeze)}` : `refused ${d.reason} (fresh ${d.freshCount}, tier ${d.freshTier}, shown ${d.shownCount})`;
const showStart = (v: StartAudienceVerdict) => (v.ok ? `ok shrunkBy ${v.shrunkBy}` : `refused ${v.reason}`);

/* ══ THE LABELS — a plant names the ONE label it must turn red ═════════════════════════════════════ */

const L = {
  c0: "0 · CONTROL · the seven refusal reasons are the spec's seven, and the threshold is a number",
  t1: "1.1 · ⭐ a FILTERED audience of 1–5 people is listed one by one; 6 and more are typed",
  t2: "1.2 · ⭐ an UNFILTERED audience is always typed, even one person — \"everybody\" is never confirmed at a glance",
  t3: "1.3 · the threshold is CONFIRM_ENUMERATE_MAX, and it is 5",
  t4: "1.4 · ⛔ a count that is not a whole number of 0 or more is typed — the tier fails closed",
  n1: "2.1 · ⭐ the typed number reads with or without grouping — '5912', ' 5,912 ', '5 912', a no-break and a narrow no-break space all read 5912",
  n2: "2.2 · ⛔ no Number() leniency — blank, a leading zero, a decimal, a sign, a letter, hex, an exponent, a tab, Arabic-Indic or full-width digits and 8 digits all read as nothing",
  n3: "2.3 · the largest readable count is 9,999,999 (seven digits), and 0 reads as 0",
  n4: "2.4 · ⭐ the word the modal arms on is bare ASCII digits and reads back to exactly its count, at every size up to the cap",
  f1: "3.1 · ⭐ X13 · a TYPED claim never carries a members key, even when one is handed in; an enumerate claim keeps it",
  f2: "3.2 · ⛔ a fence that could not name its members is TYPED — no list is shown for people nobody listed",
  f3: "3.3 · a claim survives its own JSON round trip, and only its six fields come back",
  f4: "3.4 · ⛔ a malformed claim is refused — another version, no campaign, a negative or fractional figure, an unknown tier, an enumerate claim above 5 or without a key, a typed claim with one",
  f5: "3.5 · ⭐ X9 · the members key's input ignores order and counts a person ONCE — a number in the book and on a player account is one person",
  f6: "3.6 · ⛔ the members key names EXACTLY the people counted — a walk that disagrees with the count, a sixth person, nobody, or a number that is not a bare key gives NO key",
  d1: "4.1 · nobody in the audience is audience_empty, before anything else — even with a typed 0",
  d2: "4.2 · ⛔ no view, another campaign's view, or a claim in another format version is stale_view — never accepted",
  d3: "4.3 · ⭐ a view of an earlier draft revision is draft_changed — even when the count, the members and the typed number all match",
  d4: "4.4 · ⭐ OD27 · THE STALE CLIENT — a view taken at 7, one person added, '7' typed: refused audience_moved with the new number; a fresh view and '8' then confirm 8",
  d5: "4.5 · confirmation is EQUALITY — a shrink (7 → 6) with '7' typed is audience_moved; OD28's \"fewer goes ahead\" belongs to Start",
  d6: "4.6 · the wrong number typed on a current view is typed_mismatch",
  d7: "4.7 · nothing readable typed on a current view is typed_required",
  d8: "4.8 · ⭐ a list of the same 3 people confirms with nothing typed, and the freeze carries the members key as the watermark (X13)",
  d9: "4.9 · ⭐ a list where one person was SWAPPED (still 3) is audience_moved — the list approved THOSE people, and a typed number cannot override it",
  d10: "4.10 · an unfiltered 2-contact book is typed — nothing typed is typed_required, and '2' confirms TYPED with no watermark",
  d11: "4.11 · crossing 5 → 6 while the list was open is audience_moved, and the answer says the tier is now typed",
  d12: "4.12 · ⭐ the freeze is the FRESH count — an old view of 3 with the fresh 7 typed confirms 7, never 3",
  d13: "4.13 · ⛔ X13 · a typed confirmation freezes NO watermark, even from a claim that carries a key",
  d14: "4.14 · ⛔ the tier is only ever RAISED — a claim saying 'enumerate' for 7 people, or for 3 with no members key, is held to the typed test",
  d15: "4.15 · ⭐ THE GRID — over every (fresh × view × typed) combination: accepted exactly when the held tier's test passes, the freeze is always the fresh count, revision and tier, every refusal carries the fresh figures, and all six refusals are reached",
  s1: "5.1 · ⭐ OD28 · MORE people at Start than were confirmed is refused audience_moved — money nobody approved",
  s2: "5.2 · the SAME count at Start goes ahead, shrunk by 0",
  s3: "5.3 · FEWER people at Start goes ahead and reports how many fewer; a typed confirmation ignores who they are",
  s4: "5.4 · ⭐ an ENUMERATED confirmation refuses ANY change of people at Start, even to fewer — a keyed set cannot prove a subset",
  s5: "5.5 · ⛔ Start fails closed — an unreadable count, an enumerated confirmation stored without its watermark, or an unknown tier refuses",
  w1: "6.1 · a refused write is read back — no row is not_found, a row no longer DRAFT is not_draft, a DRAFT row means its revision moved",
  w2: "6.2 · ⭐ every refusal has ONE sentence, and every sentence says that nothing was confirmed, sent or changed",
  w3: "6.3 · ⭐ audience_moved names the NEW number and the old one, grouped (6,104 people, was 5,912), and one person in the singular",
  w4: "6.4 · typed_mismatch and typed_required name the number to type as the modal arms on it — bare digits (5912), never grouped",
  w5: "6.5 · the stored tier column is ENUMERATE | TYPED and reads back; anything else is no tier",
  x1: "7.1 · ⛔ client-safe — the module imports nothing but @/lib/utils (pinned client-safe) and names no server, node or env",
  x2: "7.2 · ⛔ OD27 tripwire — decideConfirm's input is exactly { fresh, shown, typed }: no posted count can reach the gate",
  x3: "7.3 · the threshold is written ONCE — no other literal 5 compares a count in the module",
  x4: "7.4 · ⭐ the module is in test:client-graph-safe's PINNED list — the confirm modal imports it in the browser",
  x5: "7.5 · ⭐ test:campaign-confirm runs in predeploy, and red:campaign-confirm runs this file with --prove-red — a gate outside the pipeline is not a gate",
} as const;

/* ══ THE ASSERTIONS ════════════════════════════════════════════════════════════════════════════════ */

function runAssertions(impl: Impl, tag: string): void {
  const p = (n: string) => `${tag}${n}`;

  ok(p(L.c0), () =>
    [...CONFIRM_REFUSAL_REASONS].sort().join(",") === "audience_empty,audience_moved,draft_changed,not_draft,stale_view,typed_mismatch,typed_required"
      && Number.isSafeInteger(impl.max),
  () => CONFIRM_REFUSAL_REASONS.join(","));

  // ── §1 · THE TIER ───────────────────────────────────────────────────────────────────────────────
  ok(p(L.t1), () =>
    [1, 2, 3, 4, 5].every((n) => impl.tier(n, false) === "enumerate")
      && [6, 7, 8, 50, 150_000].every((n) => impl.tier(n, false) === "typed"),
  () => [1, 5, 6, 7].map((n) => `${n}→${impl.tier(n, false)}`).join(" "));
  ok(p(L.t2), () => [0, 1, 2, 3, 4, 5, 6, 7].every((n) => impl.tier(n, true) === "typed"),
    () => [1, 2, 5].map((n) => `${n}→${impl.tier(n, true)}`).join(" "));
  ok(p(L.t3), () => impl.max === 5 && impl.tier(impl.max, false) === "enumerate" && impl.tier(impl.max + 1, false) === "typed",
    () => `max ${impl.max}`);
  ok(p(L.t4), () => [Number.NaN, -1, 2.5, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY].every((n) => impl.tier(n, false) === "typed"),
    () => [Number.NaN, -1, 2.5].map((n) => `${n}→${impl.tier(n, false)}`).join(" "));

  // ── §2 · THE TYPED NUMBER ───────────────────────────────────────────────────────────────────────
  const grouped = ["5912", " 5,912 ", "5 912", `5${NBSP}912`, `5${NNBSP}912`, `${NBSP}5912${NBSP}`, "5,912\n"];
  ok(p(L.n1), () => grouped.every((s) => impl.parse(s) === 5912),
    () => grouped.map((s) => `${JSON.stringify(s)}→${impl.parse(s)}`).join(" "));
  const unreadable: Array<string | null | undefined> = [
    "", "   ", null, undefined, "05912", "5912.0", "5.912", "-5912", "+5912", "5912a", "0x10", "1e3", "59\t12",
    "Infinity", "NaN", "5_912", inScript("5912", ARABIC_INDIC_ZERO), inScript("5912", FULLWIDTH_ZERO), "12345678",
  ];
  ok(p(L.n2), () => unreadable.every((s) => impl.parse(s) === null),
    () => unreadable.filter((s) => impl.parse(s) !== null).map((s) => `${JSON.stringify(s)}→${impl.parse(s)}`).join(" "));
  ok(p(L.n3), () => impl.parse("9999999") === 9_999_999 && impl.parse("9,999,999") === 9_999_999 && impl.parse("0") === 0,
    () => `${impl.parse("9999999")} ${impl.parse("9,999,999")} ${impl.parse("0")}`);
  const sizes = [0, 1, 5, 6, 42, 999, 1000, 5912, 150_000, 9_999_999];
  ok(p(L.n4), () => sizes.every((n) => /^[0-9]+$/.test(impl.word(n)) && impl.parse(impl.word(n)) === n),
    () => sizes.map((n) => impl.word(n)).join(" "));

  // ── §3 · THE FENCE CLAIM (X9 · X13) ─────────────────────────────────────────────────────────────
  const base = { campaignId: CAMPAIGN, draftRevision: REV };
  ok(p(L.f1), () => {
    const big = impl.build({ ...base, count: 7, unfiltered: false, membersKey: K1 });
    const whole = impl.build({ ...base, count: 3, unfiltered: true, membersKey: K1 });
    const listed = impl.build({ ...base, count: 3, unfiltered: false, membersKey: K1 });
    return big.tier === "typed" && big.membersKey === null && whole.tier === "typed" && whole.membersKey === null
      && listed.tier === "enumerate" && listed.membersKey === K1 && listed.count === 3 && listed.v === 1
      && listed.campaignId === CAMPAIGN && listed.draftRevision === REV;
  }, () => JSON.stringify(impl.build({ ...base, count: 7, unfiltered: false, membersKey: K1 })));
  ok(p(L.f2), () =>
    [null, "not-a-key", K1.toUpperCase(), K1.slice(1)].every((k) => impl.build({ ...base, count: 3, unfiltered: false, membersKey: k }).tier === "typed")
      && impl.build({ ...base, count: 0, unfiltered: false, membersKey: K1 }).tier === "typed",
  () => JSON.stringify(impl.build({ ...base, count: 3, unfiltered: false, membersKey: null })));
  ok(p(L.f3), () => {
    const built = [
      impl.build({ ...base, count: 3, unfiltered: false, membersKey: K1 }),
      impl.build({ ...base, count: 5912, unfiltered: false, membersKey: null }),
      impl.build({ ...base, count: 2, unfiltered: true, membersKey: null }),
    ];
    return built.every((c) => {
      const back = impl.parseClaim(JSON.parse(JSON.stringify({ ...c, extra: "smuggled", count2: 1 })));
      return back !== null && Object.keys(back).sort().join(",") === "campaignId,count,draftRevision,membersKey,tier,v"
        && back.v === c.v && back.campaignId === c.campaignId && back.draftRevision === c.draftRevision
        && back.count === c.count && back.tier === c.tier && back.membersKey === c.membersKey;
    });
  }, () => JSON.stringify(impl.parseClaim({ ...claim(3, "enumerate", K1), extra: "smuggled" })));
  const malformed: unknown[] = [
    null, "claim", [claim(3, "enumerate", K1)], otherVersion(claim(7, "typed", null)), { ...claim(7, "typed", null), v: 0 },
    { ...claim(7, "typed", null), campaignId: "" }, { ...claim(7, "typed", null), campaignId: 7 },
    claim(-1, "typed", null), claim(2.5, "typed", null), claim(7, "typed", null, { draftRevision: -1 }),
    claim(7, "typed", null, { draftRevision: 1.5 }), { ...claim(7, "typed", null), tier: "hard" },
    claim(6, "enumerate", K1), claim(0, "enumerate", K1), claim(3, "enumerate", null), claim(3, "enumerate", "not-a-key"),
    claim(7, "typed", K1), { ...claim(7, "typed", null), membersKey: undefined }, { ...claim(7, "typed", null), count: "7" },
  ];
  ok(p(L.f4), () => malformed.every((m) => impl.parseClaim(m) === null),
    () => malformed.filter((m) => impl.parseClaim(m) !== null).map((m) => JSON.stringify(m)).join(" | "));
  ok(p(L.f5), () => {
    const ab = impl.members([P[0], P[1]], 2);
    return ab !== null && ab === impl.members([P[1], P[0]], 2) && ab === impl.members([P[0], P[1], P[0]], 2)
      && impl.members([P[4], P[2], P[0]], 3) === impl.members([P[0], P[4], P[2]], 3);
  }, () => `${impl.members([P[0], P[1]], 2)} / ${impl.members([P[1], P[0]], 2)} / ${impl.members([P[0], P[1], P[0]], 2)}`);
  ok(p(L.f6), () =>
    impl.members([P[0], P[1]], 3) === null && impl.members([P[0], P[1], P[2]], 2) === null
      && impl.members(P.slice(0, 6), 6) === null && impl.members([], 0) === null
      && impl.members([`+${P[0]}`], 1) === null && impl.members(["0712345678"], 1) === null
      && impl.members(["255212345678"], 1) === null && impl.members([P[0]], 1) !== null,
  () => `${impl.members([P[0], P[1]], 3)} ${impl.members([`+${P[0]}`], 1)} ${impl.members(P.slice(0, 6), 6)}`);

  // ── §4 · THE GATE (OD27) ────────────────────────────────────────────────────────────────────────
  const d = impl.decide;
  ok(p(L.d1), () => {
    const a = d({ fresh: claim(0, "typed", null), shown: null, typed: null });
    const b = d({ fresh: claim(0, "typed", null), shown: claim(0, "typed", null), typed: "0" });
    return refusedAs(a, "audience_empty") && refusedAs(b, "audience_empty") && !b.ok && b.freshCount === 0;
  }, () => show(d({ fresh: claim(0, "typed", null), shown: claim(0, "typed", null), typed: "0" })));
  ok(p(L.d2), () => {
    const fresh = claim(7, "typed", null);
    return [null, claim(7, "typed", null, { campaignId: "sc_other" }), otherVersion(fresh)]
      .every((shown) => refusedAs(d({ fresh, shown, typed: "7" }), "stale_view"));
  }, () => show(d({ fresh: claim(7, "typed", null), shown: claim(7, "typed", null, { campaignId: "sc_other" }), typed: "7" })));
  ok(p(L.d3), () =>
    refusedAs(d({ fresh: claim(7, "typed", null), shown: claim(7, "typed", null, { draftRevision: 1 }), typed: "7" }), "draft_changed")
      && refusedAs(d({ fresh: claim(3, "enumerate", K1), shown: claim(3, "enumerate", K1, { draftRevision: 1 }), typed: null }), "draft_changed"),
  () => show(d({ fresh: claim(7, "typed", null), shown: claim(7, "typed", null, { draftRevision: 1 }), typed: "7" })));
  ok(p(L.d4), () => {
    const stale = d({ fresh: claim(8, "typed", null), shown: claim(7, "typed", null), typed: "7" });
    const again = d({ fresh: claim(8, "typed", null), shown: claim(8, "typed", null), typed: "8" });
    return refusedAs(stale, "audience_moved") && !stale.ok && stale.freshCount === 8 && stale.shownCount === 7 && stale.freshTier === "typed"
      && again.ok && again.freeze.count === 8;
  }, () => show(d({ fresh: claim(8, "typed", null), shown: claim(7, "typed", null), typed: "7" })));
  ok(p(L.d5), () => {
    const shrunk = d({ fresh: claim(6, "typed", null), shown: claim(7, "typed", null), typed: "7" });
    return refusedAs(shrunk, "audience_moved") && !shrunk.ok && shrunk.freshCount === 6;
  }, () => show(d({ fresh: claim(6, "typed", null), shown: claim(7, "typed", null), typed: "7" })));
  ok(p(L.d6), () => ["6", "8", "70"].every((t) => refusedAs(d({ fresh: claim(7, "typed", null), shown: claim(7, "typed", null), typed: t }), "typed_mismatch")),
    () => show(d({ fresh: claim(7, "typed", null), shown: claim(7, "typed", null), typed: "6" })));
  ok(p(L.d7), () => [null, "", "seven", "7.0"].every((t) => refusedAs(d({ fresh: claim(7, "typed", null), shown: claim(7, "typed", null), typed: t }), "typed_required")),
    () => show(d({ fresh: claim(7, "typed", null), shown: claim(7, "typed", null), typed: null })));
  ok(p(L.d8), () => {
    const a = d({ fresh: claim(3, "enumerate", K1), shown: claim(3, "enumerate", K1), typed: null });
    const b = d({ fresh: claim(3, "enumerate", K1), shown: claim(3, "enumerate", K1), typed: "anything" });
    return a.ok && a.freeze.tier === "enumerate" && a.freeze.audienceWatermark === K1 && a.freeze.count === 3
      && a.freeze.draftRevision === REV && b.ok;
  }, () => show(d({ fresh: claim(3, "enumerate", K1), shown: claim(3, "enumerate", K1), typed: null })));
  ok(p(L.d9), () => {
    const swapped = d({ fresh: claim(3, "enumerate", K2), shown: claim(3, "enumerate", K1), typed: null });
    const typedOver = d({ fresh: claim(3, "enumerate", K2), shown: claim(3, "enumerate", K1), typed: "3" });
    return refusedAs(swapped, "audience_moved") && !swapped.ok && swapped.freshTier === "enumerate" && swapped.freshCount === 3
      && refusedAs(typedOver, "audience_moved");
  }, () => show(d({ fresh: claim(3, "enumerate", K2), shown: claim(3, "enumerate", K1), typed: null })));
  ok(p(L.d10), () => {
    const none = d({ fresh: claim(2, "typed", null), shown: claim(2, "typed", null), typed: null });
    const two = d({ fresh: claim(2, "typed", null), shown: claim(2, "typed", null), typed: "2" });
    return refusedAs(none, "typed_required") && two.ok && two.freeze.tier === "typed" && two.freeze.audienceWatermark === null && two.freeze.count === 2;
  }, () => show(d({ fresh: claim(2, "typed", null), shown: claim(2, "typed", null), typed: null })));
  ok(p(L.d11), () => {
    const crossed = d({ fresh: claim(6, "typed", null), shown: claim(5, "enumerate", K1), typed: null });
    return refusedAs(crossed, "audience_moved") && !crossed.ok && crossed.freshTier === "typed" && crossed.freshCount === 6 && crossed.shownCount === 5;
  }, () => show(d({ fresh: claim(6, "typed", null), shown: claim(5, "enumerate", K1), typed: null })));
  ok(p(L.d12), () => {
    const r = d({ fresh: claim(7, "typed", null), shown: claim(3, "enumerate", K1), typed: "7" });
    return r.ok && r.freeze.count === 7 && r.freeze.tier === "typed" && r.freeze.audienceWatermark === null;
  }, () => show(d({ fresh: claim(7, "typed", null), shown: claim(3, "enumerate", K1), typed: "7" })));
  ok(p(L.d13), () => {
    const r = d({ fresh: claim(7, "typed", K1), shown: claim(7, "typed", null), typed: "7" });
    return r.ok && r.freeze.audienceWatermark === null;
  }, () => show(d({ fresh: claim(7, "typed", K1), shown: claim(7, "typed", null), typed: "7" })));
  ok(p(L.d14), () => {
    const sevenListed = d({ fresh: claim(7, "enumerate", K1), shown: claim(7, "enumerate", K1), typed: null });
    const keyless = d({ fresh: claim(3, "enumerate", null), shown: claim(3, "enumerate", null), typed: null });
    const keylessTyped = d({ fresh: claim(3, "enumerate", "not-a-key"), shown: claim(3, "enumerate", "not-a-key"), typed: "3" });
    return refusedAs(sevenListed, "typed_required") && !sevenListed.ok && sevenListed.freshTier === "typed"
      && refusedAs(keyless, "typed_required") && !keyless.ok && keyless.freshTier === "typed"
      && keylessTyped.ok && keylessTyped.freeze.tier === "typed" && keylessTyped.freeze.audienceWatermark === null;
  }, () => `${show(d({ fresh: claim(7, "enumerate", K1), shown: claim(7, "enumerate", K1), typed: null }))} | ${show(d({ fresh: claim(3, "enumerate", null), shown: claim(3, "enumerate", null), typed: null }))}`);

  let gridDetail = "";
  ok(p(L.d15), () => {
    const g = runGrid(impl.decide);
    gridDetail = `${g.combinations} combinations, reached ${[...g.reached].sort().join(",")}; ${g.bad.length} violation(s)${g.bad.length ? `: ${g.bad.slice(0, 3).join(" || ")}` : ""}`;
    console.log(`     grid: ${g.combinations} combinations checked`);
    return g.bad.length === 0 && g.combinations >= 1000 && [...DECIDE_REASONS].every((r) => g.reached.has(r));
  }, () => gridDetail);

  // ── §5 · START (OD28) ───────────────────────────────────────────────────────────────────────────
  const s = impl.start;
  ok(p(L.s1), () => {
    const typedUp = s({ confirmedCount: 7, confirmedTier: "typed", confirmedWatermark: null, fresh: { count: 8, membersKey: null } });
    const listedUp = s({ confirmedCount: 3, confirmedTier: "enumerate", confirmedWatermark: K1, fresh: { count: 4, membersKey: K1 } });
    return !typedUp.ok && typedUp.reason === "audience_moved" && typedUp.freshCount === 8 && typedUp.confirmedCount === 7 && !listedUp.ok;
  }, () => showStart(s({ confirmedCount: 7, confirmedTier: "typed", confirmedWatermark: null, fresh: { count: 8, membersKey: null } })));
  ok(p(L.s2), () => {
    const typedSame = s({ confirmedCount: 7, confirmedTier: "typed", confirmedWatermark: null, fresh: { count: 7, membersKey: null } });
    const listedSame = s({ confirmedCount: 3, confirmedTier: "enumerate", confirmedWatermark: K1, fresh: { count: 3, membersKey: K1 } });
    return typedSame.ok && typedSame.shrunkBy === 0 && listedSame.ok && listedSame.shrunkBy === 0;
  }, () => showStart(s({ confirmedCount: 7, confirmedTier: "typed", confirmedWatermark: null, fresh: { count: 7, membersKey: null } })));
  ok(p(L.s3), () => {
    const fewer = s({ confirmedCount: 7, confirmedTier: "typed", confirmedWatermark: null, fresh: { count: 5, membersKey: null } });
    const none = s({ confirmedCount: 7, confirmedTier: "typed", confirmedWatermark: null, fresh: { count: 0, membersKey: null } });
    const others = s({ confirmedCount: 7, confirmedTier: "typed", confirmedWatermark: null, fresh: { count: 7, membersKey: K2 } });
    return fewer.ok && fewer.shrunkBy === 2 && none.ok && none.shrunkBy === 7 && others.ok && others.shrunkBy === 0;
  }, () => showStart(s({ confirmedCount: 7, confirmedTier: "typed", confirmedWatermark: null, fresh: { count: 5, membersKey: null } })));
  ok(p(L.s4), () =>
    [{ count: 2, membersKey: K2 }, { count: 3, membersKey: K2 }, { count: 3, membersKey: null }, { count: 2, membersKey: null }]
      .every((fresh) => !s({ confirmedCount: 3, confirmedTier: "enumerate", confirmedWatermark: K1, fresh }).ok),
  () => showStart(s({ confirmedCount: 3, confirmedTier: "enumerate", confirmedWatermark: K1, fresh: { count: 2, membersKey: K2 } })));
  ok(p(L.s5), () =>
    !s({ confirmedCount: 7, confirmedTier: "typed", confirmedWatermark: null, fresh: { count: Number.NaN, membersKey: null } }).ok
      && !s({ confirmedCount: Number.NaN, confirmedTier: "typed", confirmedWatermark: null, fresh: { count: 3, membersKey: null } }).ok
      && !s({ confirmedCount: 7.5, confirmedTier: "typed", confirmedWatermark: null, fresh: { count: 7, membersKey: null } }).ok
      && !s({ confirmedCount: 7, confirmedTier: "typed", confirmedWatermark: null, fresh: { count: 2.5, membersKey: null } }).ok
      && !s({ confirmedCount: 3, confirmedTier: "enumerate", confirmedWatermark: null, fresh: { count: 3, membersKey: null } }).ok
      && !s({ confirmedCount: 3, confirmedTier: "HARD" as ConfirmTier, confirmedWatermark: null, fresh: { count: 3, membersKey: K1 } }).ok,
  () => showStart(s({ confirmedCount: 3, confirmedTier: "enumerate", confirmedWatermark: null, fresh: { count: 3, membersKey: null } })));

  // ── §6 · THE ANSWERS ────────────────────────────────────────────────────────────────────────────
  ok(p(L.w1), () =>
    impl.writeRefusal(null) === "not_found" && impl.writeRefusal({ status: "CONFIRMED" }) === "not_draft"
      && impl.writeRefusal({ status: "RUNNING" }) === "not_draft" && impl.writeRefusal({ status: "DRAFT" }) === "draft_changed",
  () => `${impl.writeRefusal(null)} ${impl.writeRefusal({ status: "CONFIRMED" })} ${impl.writeRefusal({ status: "DRAFT" })}`);
  const everyReason = [...CONFIRM_REFUSAL_REASONS, "not_found"] as const;
  const figures = [{ fresh: 7, shown: 6 }, { fresh: 7, shown: 7 }, { fresh: 1, shown: null }, { fresh: null, shown: null }];
  ok(p(L.w2), () =>
    Object.keys(impl.copy).sort().join(",") === [...everyReason].sort().join(",")
      && everyReason.every((r) => figures.every((n) => {
        const line = impl.copy[r](n);
        return typeof line === "string" && line.length > 0 && /Nothing was (confirmed|sent|changed)/.test(line)
          && !/undefined|null|NaN|\[object/.test(line);
      })),
  () => everyReason.map((r) => `${r}: ${impl.copy[r]?.({ fresh: 7, shown: 6 })}`).filter((x) => !/Nothing was/.test(x)).join(" | "));
  ok(p(L.w3), () =>
    impl.copy.audience_moved({ fresh: 6104, shown: 5912 }).includes("It is now 6,104 people (was 5,912).")
      && impl.copy.audience_moved({ fresh: 1, shown: 2 }).includes("1 person ")
      && !impl.copy.audience_moved({ fresh: 1, shown: 2 }).includes("1 people")
      && impl.copy.audience_moved({ fresh: 3, shown: 3 }).includes("not the same"),
  () => impl.copy.audience_moved({ fresh: 6104, shown: 5912 }));
  ok(p(L.w4), () => {
    const mismatch = impl.copy.typed_mismatch({ fresh: 5912, shown: 5912 });
    const required = impl.copy.typed_required({ fresh: 5912, shown: 5912 });
    return mismatch.includes("Type 5912 to confirm") && !mismatch.includes("5,912")
      && required.includes("Type 5912 to confirm") && !required.includes("5,912");
  }, () => impl.copy.typed_mismatch({ fresh: 5912, shown: 5912 }));
  ok(p(L.w5), () =>
    impl.column.enumerate === "ENUMERATE" && impl.column.typed === "TYPED"
      && impl.fromColumn("ENUMERATE") === "enumerate" && impl.fromColumn("TYPED") === "typed"
      && [null, undefined, "", "enumerate", "typed", "HARD", 1].every((v) => impl.fromColumn(v) === null),
  () => JSON.stringify(impl.column));

  // ── §7 · THE SOURCE ─────────────────────────────────────────────────────────────────────────────
  const src = impl.source;
  ok(p(L.x1), () => {
    const specifiers = [
      ...src.matchAll(/\bfrom\s+["']([^"']+)["']/g),
      ...src.matchAll(/\bimport\s*\(\s*["']([^"']+)["']/g),
      ...src.matchAll(/\brequire\s*\(\s*["']([^"']+)["']/g),
      ...src.matchAll(/^\s*import\s+["']([^"']+)["']/gm),
    ].map((m) => m[1]);
    return specifiers.length === 1 && specifiers[0] === "@/lib/utils"
      && !/lib\/server|node:|process\.env|["']use server["']|server-only/.test(src);
  }, () => [...src.matchAll(/\bfrom\s+["']([^"']+)["']/g)].map((m) => m[1]).join(", "));
  ok(p(L.x2), () => src.includes("export function decideConfirm(a: { fresh: FenceClaim; shown: FenceClaim | null; typed: string | null }): ConfirmDecision {"));
  ok(p(L.x3), () =>
    (src.match(/CONFIRM_ENUMERATE_MAX = 5(?![0-9])/g) ?? []).length === 1
      && !/[<>]=?\s*5(?![0-9])/.test(src)
      && !/(?<![0-9.])5\s*[<>]/.test(src),
  () => (src.match(/.{0,30}[<>]=?\s*5(?![0-9]).{0,10}/) ?? [""])[0]);
  ok(p(L.x4), () => impl.pinned.includes('"lib/marketing/campaign-confirm.ts"'),
    () => (impl.pinned === "" ? "the PINNED list was not found" : "not pinned"));
  ok(p(L.x5), () =>
    /(?:^|&&)\s*npm run test:campaign-confirm\s*(?:&&|$)/.test(impl.wiring.predeploy)
      && impl.wiring.test === "tsx scripts/campaign-confirm.test.mts"
      && impl.wiring.red === "tsx scripts/campaign-confirm.test.mts --prove-red",
  () => `predeploy ${impl.wiring.predeploy.includes("test:campaign-confirm") ? "names it" : "does not name it"} · test ${impl.wiring.test} · red ${impl.wiring.red}`);
}

/* ══ THE GRID ══════════════════════════════════════════════════════════════════════════════════════ */

function runGrid(decide: typeof decideConfirm): { combinations: number; reached: Set<string>; bad: string[] } {
  const freshes: FenceClaim[] = [];
  for (const count of [0, 1, 3, 5, 6, 7, 8]) {
    for (const unfiltered of [false, true]) {
      // Built by the SHIPPED builder: well-formed claims, as the server makes them. §3 holds the builder.
      freshes.push(buildFenceClaim({ campaignId: CAMPAIGN, draftRevision: REV, count, unfiltered, membersKey: K1 }));
    }
  }
  // …and the malformed ones a broken fence could hand in.
  freshes.push(claim(3, "enumerate", null), claim(7, "enumerate", K1), claim(4, "typed", K1), claim(0, "enumerate", K1));

  const viewsOf = (f: FenceClaim): Array<FenceClaim | null> => [
    null,
    { ...f, campaignId: "sc_other" },
    { ...f, draftRevision: f.draftRevision - 1 },
    otherVersion(f),
    f,
    { ...f, count: f.count + 1 },
    { ...f, count: Math.max(0, f.count - 1) },
    { ...f, membersKey: K2 },
    { ...f, membersKey: null },
    claim(f.count, f.tier === "typed" ? "enumerate" : "typed", f.tier === "typed" ? K1 : null),
  ];
  const typedOf = (f: FenceClaim): Array<string | null> => [
    null, "", String(f.count), ` ${f.count} `, String(f.count + 1), String(Math.max(0, f.count - 1)), "abc", `${f.count}.0`,
  ];

  let combinations = 0;
  const reached = new Set<string>();
  const bad: string[] = [];
  for (const fresh of freshes) {
    const tier = heldTier(fresh);
    for (const shown of viewsOf(fresh)) {
      for (const typed of typedOf(fresh)) {
        combinations++;
        const out = decide({ fresh, shown, typed });
        const current = shown !== null && shown.v === 1 && shown.campaignId === fresh.campaignId && shown.draftRevision === fresh.draftRevision;
        // The shipped parser decides what was typed; §2 holds it on its own.
        const typedOk = parseTypedCount(typed) === fresh.count;
        const listOk = shown !== null && shown.count === fresh.count && shown.membersKey === fresh.membersKey && fresh.membersKey !== null;
        const meets = fresh.count > 0 && current && (tier === "typed" ? typedOk : listOk);
        const at = `fresh ${JSON.stringify(fresh)} shown ${JSON.stringify(shown)} typed ${JSON.stringify(typed)} → ${show(out)}`;
        if (out.ok !== meets) { bad.push(`${meets ? "should confirm" : "should refuse"}: ${at}`); continue; }
        if (out.ok) {
          const f = out.freeze;
          if (f.count !== fresh.count || f.draftRevision !== fresh.draftRevision || f.tier !== tier
            || f.audienceWatermark !== (tier === "enumerate" ? fresh.membersKey : null)) bad.push(`freeze: ${at}`);
        } else {
          reached.add(out.reason);
          if (!DECIDE_REASONS.has(out.reason) || out.freshCount !== fresh.count || out.freshTier !== tier
            || out.shownCount !== (shown === null ? null : shown.count)) bad.push(`refusal: ${at}`);
        }
      }
    }
  }
  return { combinations, reached, bad };
}

/* ══ THE STAND-INS THE PLANTS SWITCH FLAWS ON IN ═══════════════════════════════════════════════════ */

/** The gate as somebody might write it, with one flaw switched on. With NO flaw on it must pass all of §4 (checked
 *  before any plant runs), so a plant is red for its flaw and nothing else. */
type DecideFlaws = Partial<Record<
  | "noEmpty" | "noCampaign" | "noRevision" | "typedVsShown" | "typedAtLeast" | "swapTypedReasons" | "noMembers"
  | "reportShownTier" | "freezeShown" | "freezeTypedKey" | "trustTier" | "refuseAll" | "requireTyped" | "listSmall",
  true
>>;
function flawedDecide(w: DecideFlaws): typeof decideConfirm {
  return ({ fresh, shown, typed }) => {
    let tier: ConfirmTier = w.trustTier ? fresh.tier : heldTier(fresh);
    if (w.listSmall && fresh.count >= 1 && fresh.count <= CONFIRM_ENUMERATE_MAX) tier = "enumerate";
    const refuse = (reason: DecideRefusalReason): ConfirmDecision => ({
      ok: false, reason, freshCount: fresh.count,
      freshTier: w.reportShownTier && shown !== null ? shown.tier : tier,
      shownCount: shown === null ? null : shown.count,
    });
    if (w.refuseAll) return refuse("audience_moved");
    if (!w.noEmpty && fresh.count === 0) return refuse("audience_empty");
    if (shown === null) return refuse("stale_view");
    if (!w.noCampaign && (shown.v !== 1 || shown.campaignId !== fresh.campaignId)) return refuse("stale_view");
    if (!w.noRevision && shown.draftRevision !== fresh.draftRevision) return refuse("draft_changed");
    const freeze = {
      count: w.freezeShown ? shown.count : fresh.count,
      tier,
      audienceWatermark: w.freezeTypedKey || tier === "enumerate" ? fresh.membersKey : null,
      draftRevision: fresh.draftRevision,
    };
    if (tier === "enumerate" && !w.requireTyped) {
      const same = shown.count === fresh.count && (w.noMembers === true || shown.membersKey === fresh.membersKey);
      return same ? { ok: true, freeze } : refuse("audience_moved");
    }
    const n = parseTypedCount(typed);
    const target = w.typedVsShown ? shown.count : fresh.count;
    if (n !== null && (w.typedAtLeast ? n >= target : n === target)) return { ok: true, freeze };
    if (shown.count !== fresh.count) return refuse("audience_moved");
    return refuse((n === null) !== (w.swapTypedReasons === true) ? "typed_required" : "typed_mismatch");
  };
}

/** Start as somebody might write it. `naive` is the one-line version: no whole-number check, an exact
 *  "enumerate" test for the tier, and a bare `!==` on the watermark. */
type StartFlaws = Partial<Record<"noAbove" | "atLeast" | "anyChange" | "ignoreWatermark" | "naive", true>>;
function flawedStart(w: StartFlaws): typeof startAudienceVerdict {
  return (a) => {
    const moved: StartAudienceVerdict = { ok: false, reason: "audience_moved", freshCount: a.fresh.count, confirmedCount: a.confirmedCount };
    const whole = (n: number) => Number.isSafeInteger(n) && n >= 0;
    if (!w.naive && (!whole(a.confirmedCount) || !whole(a.fresh.count))) return moved;
    if (!w.noAbove && (w.atLeast ? a.fresh.count >= a.confirmedCount : a.fresh.count > a.confirmedCount)) return moved;
    if (w.anyChange && a.fresh.count !== a.confirmedCount) return moved;
    const listed = w.naive ? a.confirmedTier === "enumerate" : a.confirmedTier !== "typed";
    if (listed && !w.ignoreWatermark) {
      const stored = w.naive || (typeof a.confirmedWatermark === "string" && HEX.test(a.confirmedWatermark));
      if (!stored || a.fresh.membersKey !== a.confirmedWatermark) return moved;
    }
    return { ok: true, shrunkBy: a.confirmedCount - a.fresh.count };
  };
}

/** A copy of the source with one string replaced. ⛔ A plant whose anchor is gone THROWS, so it can never pass as
 *  "caught" without having changed anything. */
const plantSource = (from: string, to: string): string => {
  if (!SOURCE.includes(from)) throw new Error(`plant anchor not found in the source: ${from}`);
  return SOURCE.replace(from, to);
};

/* ══ RUN ═══════════════════════════════════════════════════════════════════════════════════════════ */

if (!PROVE_RED) {
  runAssertions(REAL, "");
  console.log(`\ncampaign-confirm: ${pass} passed, ${fail} failed`);
  process.exitCode = fail === 0 ? 0 : 1;
} else {
  const problems: string[] = [];
  runAssertions(REAL, "base:");
  if (fail !== 0) problems.push(`BASELINE: the shipped module is already red (${failed.join(" | ")})`);
  console.log(`\n§0 baseline: ${pass} passed, ${fail} failed\n`);

  // ⭐ The stand-ins with no flaw on must be faithful, or every plant built from them proves nothing.
  pass = 0; fail = 0; failed.length = 0; quiet = true;
  runAssertions({ ...REAL, decide: flawedDecide({}), start: flawedStart({}) }, "stand-in:");
  if (fail !== 0) problems.push(`STAND-IN: the plants' gate or Start is red with no flaw on (${failed.join(" | ")})`);
  console.log(`§0 stand-ins with no flaw: ${pass} passed, ${fail} failed\n`);

  const CASES: Array<{ name: string; expect: string; impl: () => Impl }> = [
    { name: "R4 · the tier ignores `unfiltered`", expect: L.t2,
      impl: () => ({ ...REAL, tier: (n) => (Number.isSafeInteger(n) && n >= 0 && n <= 5 ? "enumerate" : "typed") }) },
    { name: "the threshold drifts to `>= 5` — five people are typed", expect: L.t1,
      impl: () => ({ ...REAL, tier: (n, u) => (u !== false || !(Number.isSafeInteger(n) && n >= 0) || n >= 5 ? "typed" : "enumerate") }) },
    { name: "the tier does not fail closed — NaN is listed", expect: L.t4,
      impl: () => ({ ...REAL, tier: (n, u) => (u || n > 5 ? "typed" : "enumerate") }) },
    { name: "the exported threshold becomes 6", expect: L.t3,
      impl: () => ({ ...REAL, max: 6 }) },
    { name: "a lenient Number() parse — '5912.0', '0x10' and '1e3' read as counts", expect: L.n2,
      impl: () => ({ ...REAL, parse: (raw) => {
        if (raw === null || raw === undefined || raw.trim() === "") return null;
        const n = Number(raw.replace(/[ ,]/g, ""));
        return Number.isFinite(n) ? n : null;
      } }) },
    { name: "the parse stops at six digits", expect: L.n3,
      impl: () => ({ ...REAL, parse: (raw) => { const n = parseTypedCount(raw); return n !== null && n > 999_999 ? null : n; } }) },
    { name: "the word to type is grouped ('5,912') — the officer must type a comma", expect: L.n4,
      impl: () => ({ ...REAL, word: (n) => n.toLocaleString("en-US") }) },
    { name: "X13 · the builder passes a members key through on a typed claim", expect: L.f1,
      impl: () => ({ ...REAL, build: (a) => ({ ...buildFenceClaim(a), membersKey: a.membersKey }) }) },
    { name: "the builder lists an audience whose members nobody could name", expect: L.f2,
      impl: () => ({ ...REAL, build: (a) => {
        const tier = confirmTier(a.count, a.unfiltered);
        return { v: 1, campaignId: a.campaignId, draftRevision: a.draftRevision, count: a.count, tier, membersKey: tier === "enumerate" ? a.membersKey : null };
      } }) },
    { name: "the claim reader hands back the raw object — extra fields ride along", expect: L.f3,
      impl: () => ({ ...REAL, parseClaim: (raw) => ((raw as { v?: unknown } | null)?.v === 1 ? (raw as FenceClaim) : null) }) },
    { name: "the claim reader checks the version and the campaign, nothing else", expect: L.f4,
      impl: () => ({ ...REAL, parseClaim: (raw) => {
        const o = raw as Record<string, unknown> | null;
        if (!o || o.v !== 1 || typeof o.campaignId !== "string") return null;
        return { v: 1, campaignId: o.campaignId, draftRevision: o.draftRevision as number, count: o.count as number, tier: o.tier as ConfirmTier, membersKey: (o.membersKey ?? null) as string | null };
      } }) },
    { name: "X9 · the members input keeps the walk's order — the same people give two keys", expect: L.f5,
      impl: () => ({ ...REAL, members: (keys, count) => (canonicalMembers(keys, count) === null ? null : [...new Set(keys)].join(",")) }) },
    { name: "the members input ignores the count and the spelling", expect: L.f6,
      impl: () => ({ ...REAL, members: (keys) => [...new Set(keys)].sort().join(",") || null }) },
    { name: "the gate has no empty check — a typed 0 confirms nobody", expect: L.d1,
      impl: () => ({ ...REAL, decide: flawedDecide({ noEmpty: true }) }) },
    { name: "the gate accepts another campaign's (or another version's) view", expect: L.d2,
      impl: () => ({ ...REAL, decide: flawedDecide({ noCampaign: true }) }) },
    { name: "the gate skips the draft revision — an edited message is confirmed unseen", expect: L.d3,
      impl: () => ({ ...REAL, decide: flawedDecide({ noRevision: true }) }) },
    { name: "R1 (the plan's own) · the typed number is checked against the count INSIDE the posted view", expect: L.d4,
      impl: () => ({ ...REAL, decide: flawedDecide({ typedVsShown: true }) }) },
    { name: "the typed check is `>=` — a shrunk audience confirms on the old number", expect: L.d5,
      impl: () => ({ ...REAL, decide: flawedDecide({ typedAtLeast: true }) }) },
    { name: "typed_required and typed_mismatch swapped", expect: L.d6,
      impl: () => ({ ...REAL, decide: flawedDecide({ swapTypedReasons: true }) }) },
    { name: "the gate demands a typed number from every tier — a list of 3 cannot confirm", expect: L.d8,
      impl: () => ({ ...REAL, decide: flawedDecide({ requireTyped: true }) }) },
    { name: "R3 · the list tier skips the members key — a swapped person is confirmed", expect: L.d9,
      impl: () => ({ ...REAL, decide: flawedDecide({ noMembers: true }) }) },
    { name: "the gate lists every audience of 5 or fewer, ignoring the claim's tier — an unfiltered book confirmed at a glance", expect: L.d10,
      impl: () => ({ ...REAL, decide: flawedDecide({ listSmall: true }) }) },
    { name: "a refusal reports the VIEW's tier — the remount stays a list after crossing 5", expect: L.d11,
      impl: () => ({ ...REAL, decide: flawedDecide({ reportShownTier: true }) }) },
    { name: "R2 · the freeze takes the shown count", expect: L.d12,
      impl: () => ({ ...REAL, decide: flawedDecide({ freezeShown: true }) }) },
    { name: "X13 · a typed confirmation freezes the claim's key as the watermark", expect: L.d13,
      impl: () => ({ ...REAL, decide: flawedDecide({ freezeTypedKey: true }) }) },
    { name: "the gate trusts the claimed tier — null === null passes the members check", expect: L.d14,
      impl: () => ({ ...REAL, decide: flawedDecide({ trustTier: true }) }) },
    { name: "the gate refuses everything — a correct confirmation can never land", expect: L.d15,
      impl: () => ({ ...REAL, decide: flawedDecide({ refuseAll: true }) }) },
    { name: "R11 · Start has no 'above' check", expect: L.s1,
      impl: () => ({ ...REAL, start: flawedStart({ noAbove: true }) }) },
    { name: "R12 · Start's check is `>=` — the same count refuses", expect: L.s2,
      impl: () => ({ ...REAL, start: flawedStart({ atLeast: true }) }) },
    { name: "Start refuses any change of count — 'fewer goes ahead' is lost", expect: L.s3,
      impl: () => ({ ...REAL, start: flawedStart({ anyChange: true }) }) },
    { name: "Start ignores the watermark of an enumerated confirmation", expect: L.s4,
      impl: () => ({ ...REAL, start: flawedStart({ ignoreWatermark: true }) }) },
    { name: "Start, naive — NaN passes, a missing watermark matches a missing key, an unknown tier is typed", expect: L.s5,
      impl: () => ({ ...REAL, start: flawedStart({ naive: true }) }) },
    { name: "the refused write's read-back is swapped", expect: L.w1,
      impl: () => ({ ...REAL, writeRefusal: (r) => (r === null ? "not_found" : r.status === "DRAFT" ? "not_draft" : "draft_changed") }) },
    { name: "audience_moved stops saying that nothing was sent", expect: L.w2,
      impl: () => ({ ...REAL, copy: { ...CONFIRM_REFUSAL_COPY, audience_moved: () => "The audience changed while you were confirming." } }) },
    { name: "audience_moved omits the new number", expect: L.w3,
      impl: () => ({ ...REAL, copy: { ...CONFIRM_REFUSAL_COPY, audience_moved: () => "The audience changed while you were confirming. Nothing was confirmed or sent." } }) },
    { name: "typed_mismatch groups the number to type", expect: L.w4,
      impl: () => ({ ...REAL, copy: { ...CONFIRM_REFUSAL_COPY, typed_mismatch: ({ fresh }) => `That isn't the number. Type ${(fresh ?? 0).toLocaleString("en-US")} to confirm. Nothing was confirmed.` } }) },
    { name: "the tier column is written in lower case", expect: L.w5,
      impl: () => ({ ...REAL, column: { enumerate: "enumerate", typed: "typed" } as unknown as typeof CONFIRM_TIER_COLUMN }) },
    { name: "the module imports the server store", expect: L.x1,
      impl: () => ({ ...REAL, source: `import { db } from "@/lib/server/store";\n${SOURCE}` }) },
    { name: "the gate grows a posted count", expect: L.x2,
      impl: () => ({ ...REAL, source: plantSource("typed: string | null }): ConfirmDecision {", "typed: string | null; postedCount: number }): ConfirmDecision {") }) },
    { name: "the tier writes its own literal 5", expect: L.x3,
      impl: () => ({ ...REAL, source: plantSource("count > CONFIRM_ENUMERATE_MAX ? \"typed\"", "count > 5 ? \"typed\"") }) },
    { name: "the pin is dropped from test:client-graph-safe", expect: L.x4,
      impl: () => {
        if (!REAL.pinned.includes('"lib/marketing/campaign-confirm.ts"')) throw new Error("the pin is not there to drop");
        return { ...REAL, pinned: REAL.pinned.split('"lib/marketing/campaign-confirm.ts"').join("") };
      } },
    { name: "the suite drops out of predeploy", expect: L.x5,
      impl: () => ({ ...REAL, wiring: { ...REAL.wiring, predeploy: REAL.wiring.predeploy.split("test:campaign-confirm").join("test:campaign-compose") } }) },
  ];

  for (const [i, c] of CASES.entries()) {
    pass = 0; fail = 0; failed.length = 0;
    const tag = `red${i + 1}:`;
    console.log(`── case ${i + 1}: ${c.name}`);
    let impl: Impl;
    try { impl = c.impl(); } catch (e) {
      problems.push(`case ${i + 1} (${c.name}): the plant could not be built — ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }
    runAssertions(impl, tag);
    if (fail === 0) problems.push(`case ${i + 1} (${c.name}): stayed GREEN`);
    else if (!failed.includes(`${tag}${c.expect}`)) problems.push(`case ${i + 1} (${c.name}): red, but not on "${c.expect}" — got ${failed.join(" | ")}`);
    else console.log(`   caught → ${c.expect}\n`);
  }
  const caught = CASES.length - problems.filter((x) => x.startsWith("case")).length;
  console.log(`\n${caught}/${CASES.length} caught`);
  if (problems.length) {
    console.log("\nPROBLEMS:");
    for (const x of problems) console.log(`  ✗ ${x}`);
    process.exitCode = 1;
  } else {
    console.log("RED PROOF COMPLETE");
    process.exitCode = 0;
  }
}
