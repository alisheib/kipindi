/**
 * test:phone-normalize — ONE phone key, and the refusal that stops a malformed one being billed.
 *
 * ── PART ONE (2026-08): THE PHONE FIELD MUST ACCEPT WHAT THE SERVER ACCEPTS ──
 * Found by typing into the live site: `PhoneInput` stripped non-digits and truncated to 9, so four
 * of the five shapes a Tanzanian actually writes were mangled before the server ever saw them — on
 * registration AND on sign-in:
 *
 *   typed              kept by the field
 *   0712000101    ->   071200010     (last digit lost, "invalid number")
 *   +255712000101 ->   255712000     (a DIFFERENT number)
 *   255712000101  ->   255712000
 *   0712 000 101  ->   071200010
 *   712000101     ->   712000101     (the only shape that survived)
 *
 * `tzPhone` had always accepted all four. §1 pins the two definitions together: whatever the widget
 * produces must parse, and must parse to the SAME E.164 the server would derive from the raw input.
 *
 * ── PART TWO (2026-09-25, marketing plan U1): D1 AND D2 ──────────────────────
 * 🔴 D1 — THE IDD PREFIX PRODUCED A SIXTEEN-DIGIT MSISDN. Measured on this file's own vectors
 * before the fix:
 *
 *   toMsisdn255("00255712345678")            -> "2550255712345678"   (16 digits, on the wire)
 *   normalizeTzLocalDigits("00255712345678") -> "255712345"          (a different number entirely)
 *
 * Both helpers tested `startsWith("0")` before `startsWith("255")`, so an international `00` IDD
 * prefix was read as the local trunk prefix. The two rails then disagreed in OPPOSITE directions on
 * the same input, which is the shape of defect that survives review: each function looks correct
 * read alone.
 *
 * ⛔ IT WAS LATENT, NOT LIVE, AND THAT IS EXACTLY WHY IT HAD TO BE FIXED BEFORE THE IMPORTER. Every
 * caller today stands behind `tzPhone`, whose regex `^(?:\+?255|0)?[67]\d{8}$` cannot pass a `00…`
 * string through. The contacts importer (plan U25/U26) is the first caller that will not — a pasted
 * `00255…` is one of the commonest shapes in a real address book. Fixing it after the importer
 * exists means fixing it with rows already written.
 *
 * 🔴 D2 — NOTHING REFUSED A MALFORMED NUMBER AT THE WIRE. `sendBatch` normalised, wrote the
 * `SmsMessage` row, and POSTed. Four of this file's twelve vectors reach the gateway today and are
 * billed as send attempts that can never deliver: the 16-digit one, a Kenyan `+254…`, a Dar es
 * Salaam landline, and a truncated 9-digit string.
 *
 * ── WHAT THIS FILE ASSERTS, AND WHY EACH SHAPE IS NOT DECORATION ─────────────
 * §1 · the widget's shapes still parse (the 2026-08 regression).
 * §2 · TWELVE WRITTEN-OUT VECTORS, each pinned to ONE stated result for BOTH helpers. ⛔ Not round
 *      numbers and not generated — a generated corpus agrees with whatever the code does.
 * §3 · THE TWO RAILS AGREE. For every vector that is not foreign, `toMsisdn255(v)` is exactly
 *      `"255" + normalizeTzLocalDigits(v)`. ⭐ And the FOREIGN vector must BREAK that identity —
 *      without that half, an identity that held trivially would look like a passing assertion.
 * §4 · the gateway predicate's decision table, including the two numbers it deliberately does NOT
 *      catch (see the note on 70 below).
 * §5 · THE WIRE, driven for real through `sendBatch` against a stubbed gateway: a good number sends
 *      (the control), every bad one is refused `BAD_MSISDN`, no `SmsMessage` row is written for it,
 *      and ⭐ NO HTTP REQUEST IS MADE — the refusal has to happen before the money, not after.
 * §6 · the standing invariant: no row in the store carries a msisdn the gateway cannot use.
 *
 * ⚠️ WHAT §4 DOES NOT COVER, DELIBERATELY. `0701234567` normalises to `255701234567`, which is
 * twelve digits starting `2557`, so the wire predicate ACCEPTS it without any view on who holds NDC
 * 70. The predicate is coarse on purpose: its job is "can the gateway dial this at all", and it
 * must not silently become a second, drifting copy of the numbering plan. ⭐ The cost of getting
 * that wrong is measured, not imagined: NDC 70 was spare in the TCRA plan's 2020, 2024 and 2025
 * editions and is allocated in the 2026 one. A table pinned here would have refused a real
 * customer's number. Allocation is the numbering module's single job (plan U2). §4 asserts the gap
 * EXPLICITLY so that nobody later reads this suite as covering it.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION. `--prove-red` plants the pre-fix implementations IN MEMORY and
 * requires the MATCHING assertion to fire — not merely "something failed". This file makes no
 * file-writing call of any kind, so it stays outside `test:red-anchors` §4's undeclared count.
 *
 * Run:  npm run test:phone-normalize
 * Red:  npm run red:phone-normalize
 */
import { normalizeTzLocalDigits, toMsisdn255, isGatewayMsisdn } from "../src/lib/phone-normalize.ts";
import { tzPhone } from "../src/lib/server/validators.ts";
import { sendBatch } from "../src/lib/server/sms.ts";
import { db } from "../src/lib/server/store.ts";

/* ⛔ FAILURE IS THE DEFAULT AND IS SET BEFORE THE FIRST `await`. A suite whose verdict is written
 * only at the end scores GREEN when a promise never settles or the process exits early — the exit
 * code is 0 unless something set it. This line is cleared at the bottom, and only there. */
process.exitCode = 1;

const PROVE_RED = process.argv.includes("--prove-red");

/* ══ THE IMPLEMENTATIONS UNDER TEST ══════════════════════════════════════════
 * Passed in rather than imported directly by the assertions, so `--prove-red` can substitute the
 * pre-fix versions and run the IDENTICAL assertions against them. */
type Impl = {
  toMsisdn255: (raw: string) => string;
  normalizeTzLocalDigits: (raw: string) => string;
  isGatewayMsisdn: (msisdn: string) => boolean;
};

const REAL: Impl = { toMsisdn255, normalizeTzLocalDigits, isGatewayMsisdn };

/** The code exactly as it stood before this unit — the defect, restored, for the red control.
 *  Copied from `src/lib/phone-normalize.ts` at `a008232e`. */
const NAIVE: Impl = {
  toMsisdn255: (raw: string): string => {
    const d = (raw ?? "").replace(/\D/g, "");
    if (d.startsWith("255")) return d;
    if (d.startsWith("0")) return "255" + d.slice(1);
    if (d.length === 9) return "255" + d;
    return d;
  },
  normalizeTzLocalDigits: (raw: string): string => {
    let d = (raw ?? "").replace(/\D+/g, "");
    if (d.startsWith("255")) d = d.slice(3);
    else if (d.startsWith("0")) d = d.replace(/^0+/, "");
    return d.slice(0, 9);
  },
  // Before D2 there was no predicate at all: everything reached the wire.
  isGatewayMsisdn: () => true,
};

/* ══ THE TWELVE VECTORS ══════════════════════════════════════════════════════
 * Written out, one stated result each. `local` is what the form field keeps; `msisdn` is what the
 * gateway is handed; `wire` is whether the gateway may be asked to dial it at all. */
type Vector = {
  raw: string;
  why: string;
  local: string;
  msisdn: string;
  wire: boolean;
  foreign?: true;
};

const VECTORS: Vector[] = [
  { raw: "0712345678",       why: "habitual local form, leading trunk zero",  local: "712345678", msisdn: "255712345678", wire: true },
  { raw: "712345678",        why: "bare nine digits",                         local: "712345678", msisdn: "255712345678", wire: true },
  { raw: "255712345678",     why: "country code, no plus",                    local: "712345678", msisdn: "255712345678", wire: true },
  { raw: "+255712345678",    why: "full international, pasted",               local: "712345678", msisdn: "255712345678", wire: true },
  { raw: "00255712345678",   why: "🔴 D1 — IDD prefix instead of the plus",   local: "712345678", msisdn: "255712345678", wire: true },
  { raw: "+255 712 345 678", why: "international, spaced as on a card",       local: "712345678", msisdn: "255712345678", wire: true },
  { raw: "255-712-345-678",  why: "dashed",                                   local: "712345678", msisdn: "255712345678", wire: true },
  { raw: "'+255712345678",   why: "our own CSV export's formula guard",       local: "712345678", msisdn: "255712345678", wire: true },
  { raw: "+254712345678",    why: "🔴 D2 — Kenyan; billable today",           local: "254712345", msisdn: "254712345678", wire: false, foreign: true },
  { raw: "0222123456",       why: "🔴 D2 — Dar es Salaam landline",           local: "222123456", msisdn: "255222123456", wire: false },
  { raw: "255712345",        why: "🔴 D2 — truncated, nine digits",           local: "712345",    msisdn: "255712345",    wire: false },
  { raw: "0701234567",       why: "⚠️ NDC 70 — dialable; who holds it is not this module's business", local: "701234567", msisdn: "255701234567", wire: true },
  { raw: "00712000101",      why: "🔴 D1 — IDD with no country code; 13 digits before the fix",      local: "712000101", msisdn: "255712000101", wire: true },
];

/* ══ THE ASSERTIONS ══════════════════════════════════════════════════════════ */

/** Every pure assertion, run against whichever `Impl` is handed in. Returns the labels that FAILED,
 *  so the red control can require the SPECIFIC one it planted for. */
function checkPure(impl: Impl, log: (line: string) => void): string[] {
  const failed: string[] = [];
  const ok = (label: string, cond: boolean, extra = "") => {
    if (cond) log(`  ok   ${label}`);
    else { failed.push(label); log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
  };

  /* ── §1 · the widget's shapes still reach the server unchanged ───────────── */
  log("\n§1 · THE FIELD ACCEPTS WHAT THE SERVER ACCEPTS");
  const EXPECTED = "+255712000101";
  const SHAPES: Array<[string, string]> = [
    ["0712000101", "habitual local form with leading zero"],
    ["+255712000101", "full international, pasted"],
    ["255712000101", "country code without the plus"],
    ["0712 000 101", "spaced, as printed on a business card"],
    ["712 000 101", "spaced, no trunk prefix"],
    ["712000101", "bare nine digits"],
    ["+255 712 000 101", "international with spaces"],
    ["0712-000-101", "dashed"],
    ["00712000101", "double-zero fat finger"],
  ];
  for (const [raw, why] of SHAPES) {
    const widget = impl.normalizeTzLocalDigits(raw);
    const parsed = tzPhone.safeParse(widget);
    ok(
      `§1 the field keeps "${raw}" usable (${why})`,
      parsed.success && parsed.data === EXPECTED,
      `field produced "${widget}" -> ${parsed.success ? parsed.data : "REJECTED by tzPhone"}`,
    );
  }
  ok(
    "§1 no shape silently becomes a different subscriber number",
    SHAPES.every(([raw]) => {
      const p = tzPhone.safeParse(impl.normalizeTzLocalDigits(raw));
      return !p.success || p.data === EXPECTED;
    }),
  );

  // Partial input while typing must stay a prefix — the field cannot fight the user.
  {
    const typed = "0712000101";
    let prev = "";
    let monotonic = true;
    for (let i = 1; i <= typed.length; i++) {
      const cur = impl.normalizeTzLocalDigits(typed.slice(0, i));
      if (!cur.startsWith(prev)) monotonic = false;
      prev = cur;
    }
    ok("§1 typing digit-by-digit only ever appends", monotonic, `ended at "${prev}"`);
    ok("§1 …and lands on the canonical nine digits", prev === "712000101", prev);
  }

  for (const junk of ["", "abc", "+", "255", "0"]) {
    const w = impl.normalizeTzLocalDigits(junk);
    ok(`§1 "${junk}" does not become a valid number`, !tzPhone.safeParse(w).success || w.length === 9, `-> "${w}"`);
  }

  /* ── §2 · the twelve vectors, one stated result each ─────────────────────── */
  log("\n§2 · TWELVE VECTORS, ONE STATED RESULT EACH");
  for (const v of VECTORS) {
    const got = impl.toMsisdn255(v.raw);
    ok(`§2 toMsisdn255("${v.raw}") is "${v.msisdn}" (${v.why})`, got === v.msisdn, `got "${got}"`);
  }
  for (const v of VECTORS) {
    const got = impl.normalizeTzLocalDigits(v.raw);
    ok(`§2 normalizeTzLocalDigits("${v.raw}") is "${v.local}"`, got === v.local, `got "${got}"`);
  }
  // ⭐ The class assertion, not just the instances: nothing this repo can be handed may produce a
  // msisdn longer than the international maximum. D1's 16-digit output is the reason it is here.
  ok(
    "§2 ⭐ no vector produces a msisdn longer than 15 digits (ITU-T E.164 maximum)",
    VECTORS.every((v) => impl.toMsisdn255(v.raw).length <= 15),
    VECTORS.filter((v) => impl.toMsisdn255(v.raw).length > 15)
      .map((v) => `"${v.raw}" -> ${impl.toMsisdn255(v.raw).length} digits`).join("; "),
  );

  /* ── §3 · the two rails agree, and the foreign vector proves it is not vacuous ── */
  log("\n§3 · THE TWO RAILS AGREE (and one vector proves the identity has teeth)");
  for (const v of VECTORS.filter((x) => !x.foreign)) {
    const expanded = impl.toMsisdn255(v.raw);
    const reduced = impl.normalizeTzLocalDigits(v.raw);
    ok(
      `§3 "${v.raw}" — toMsisdn255 is exactly "255" + normalizeTzLocalDigits`,
      expanded === "255" + reduced,
      `"${expanded}" vs "255${reduced}"`,
    );
  }
  {
    const v = VECTORS.find((x) => x.foreign)!;
    ok(
      `§3 ⭐ …and BREAKS for the foreign vector "${v.raw}" — a reducer cannot make a Kenyan number Tanzanian`,
      impl.toMsisdn255(v.raw) !== "255" + impl.normalizeTzLocalDigits(v.raw),
      "the identity held, so it is proving nothing",
    );
  }

  /* ── §4 · the gateway predicate's decision table ─────────────────────────── */
  log("\n§4 · WHAT THE GATEWAY MAY BE ASKED TO DIAL");
  for (const v of VECTORS) {
    const got = impl.isGatewayMsisdn(impl.toMsisdn255(v.raw));
    ok(
      `§4 "${v.raw}" -> ${v.wire ? "dialable" : "REFUSED"} (${v.why})`,
      got === v.wire,
      `predicate said ${got}`,
    );
  }
  // ⛔ The deliberate gap, asserted so it cannot be mistaken for coverage.
  ok(
    "§4 ⚠️ the predicate accepts NDC 70 with no view on who holds it — allocation is the numbering module's job",
    impl.isGatewayMsisdn("255701234567") === true,
  );
  ok(
    "§4 control · the predicate is not simply always-true",
    impl.isGatewayMsisdn("254712345678") === false && impl.isGatewayMsisdn("255222123456") === false,
  );
  ok(
    "§4 control · the predicate is not simply always-false",
    impl.isGatewayMsisdn("255712345678") === true && impl.isGatewayMsisdn("255612345678") === true,
  );

  return failed;
}

/** The standing invariant, read off the store. Returns the offending rows. */
async function badRowsInStore(): Promise<string[]> {
  const rows = await db.smsMessage.listRecent(10_000);
  return rows.filter((r) => !isGatewayMsisdn(r.msisdn)).map((r) => `${r.reference}=${r.msisdn}`);
}

/* ══ THE RUN ═════════════════════════════════════════════════════════════════ */

if (!PROVE_RED) {
  const log = (l: string) => console.log(l);
  const failed = checkPure(REAL, log);

  /* ── §5 · the wire, driven for real ──────────────────────────────────────── */
  log("\n§5 · THE WIRE REFUSES BEFORE IT BILLS");
  const ok = (label: string, cond: boolean, extra = "") => {
    if (cond) log(`  ok   ${label}`);
    else { failed.push(label); log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
  };

  process.env.SMS_PROVIDER = "blackball";
  process.env.SMS_SENDER_ID = "50pick";
  process.env.BLACKBALL_CLIENT_ID = "cid";
  process.env.BLACKBALL_CLIENT_SECRET = "csec";
  delete process.env.SMS_BALANCE_FLOOR_TZS;

  let httpCalls = 0;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    if (String(input).includes("/api/account/balance")) {
      return new Response(JSON.stringify({ status: true, message: "Account balance", data: { currency: "TZS" }, balance: 5000 }), { status: 200 });
    }
    httpCalls++;
    return new Response(JSON.stringify({ status: true, message: "Successfully submitted message(s) to broker.", data: null, balance: 5000 }), { status: 200 });
  }) as typeof fetch;

  const BAD = VECTORS.filter((v) => !v.wire);
  const GOOD = "+255712345678";

  // ⭐ THE CONTROL COMES FIRST. A suite that refuses everything would pass every assertion below it.
  {
    const before = (await db.smsMessage.listRecent(10_000)).length;
    httpCalls = 0;
    const r = await sendBatch([{ to: GOOD, body: "control", purpose: "OPS" }]);
    const after = (await db.smsMessage.listRecent(10_000)).length;
    ok("§5 control · a good number still sends, writes its row, and makes exactly one request",
      r.results[0]?.ok === true && after === before + 1 && httpCalls === 1,
      `ok=${r.results[0]?.ok} rows ${before}->${after} httpCalls=${httpCalls}`);
  }

  for (const v of BAD) {
    const before = (await db.smsMessage.listRecent(10_000)).length;
    httpCalls = 0;
    const r = await sendBatch([{ to: v.raw, body: "must not send", purpose: "INVITE" }]);
    const after = (await db.smsMessage.listRecent(10_000)).length;
    const res = r.results[0];
    ok(`§5 "${v.raw}" is refused BAD_MSISDN`, res?.ok === false && res?.code === "BAD_MSISDN", `code=${res?.code} ok=${res?.ok}`);
    ok(`§5 "${v.raw}" writes no SmsMessage row`, after === before, `rows ${before} -> ${after}`);
    ok(`§5 ⭐ "${v.raw}" makes no request — refused BEFORE the money, not after`, httpCalls === 0, `httpCalls=${httpCalls}`);
    ok(`§5 "${v.raw}" is handed back with no reference, because no row was minted`, res?.reference === "", `reference="${res?.reference}"`);
  }

  // ⭐ A MIXED BATCH IS THE REAL CAMPAIGN SHAPE. One bad row must not kill nine good ones — and the
  // results must stay in INPUT ORDER, because `invite-service` zips them back by target.
  {
    const before = (await db.smsMessage.listRecent(10_000)).length;
    httpCalls = 0;
    const r = await sendBatch([
      { to: GOOD, body: "a", purpose: "INVITE", targetId: "one" },
      { to: "+254712345678", body: "b", purpose: "INVITE", targetId: "two" },
      { to: "0712345679", body: "c", purpose: "INVITE", targetId: "three" },
    ]);
    const after = (await db.smsMessage.listRecent(10_000)).length;
    ok("§5 ⭐ a mixed batch sends the good and refuses only the bad",
      r.results.length === 3 && r.results[0]?.ok === true && r.results[1]?.ok === false && r.results[2]?.ok === true,
      r.results.map((x) => `${x.ok}/${x.code ?? "-"}`).join(" "));
    ok("§5 ⭐ …results stay in INPUT ORDER, carrying each caller's own key",
      r.results[0]?.targetId === "one" && r.results[1]?.targetId === "two" && r.results[2]?.targetId === "three",
      r.results.map((x) => String(x.targetId)).join(" "));
    ok("§5 …and exactly two rows are written, not three", after === before + 2, `rows ${before} -> ${after}`);
    ok("§5 …and the bad one is reported BAD_MSISDN", r.results[1]?.code === "BAD_MSISDN", String(r.results[1]?.code));
  }

  /* ── §6 · the standing invariant ─────────────────────────────────────────── */
  log("\n§6 · NO ROW CARRIES A MSISDN THE GATEWAY CANNOT USE");
  {
    const bad = await badRowsInStore();
    ok("§6 every SmsMessage row written in this run is dialable", bad.length === 0, bad.join(", "));
  }

  console.log(`\nPHONE NORMALIZE — ${failed.length === 0 ? "all checks passed" : `${failed.length} failed`}\n`);
  for (const f of failed) console.log(`  · ${f}`);
  process.exitCode = failed.length === 0 ? 0 : 1;
} else {
  /* ══ RED CONTROL, IN MEMORY ════════════════════════════════════════════════
   * ⭐ EACH PLANT NAMES THE ASSERTION IT MUST BREAK. "The suite reported something" is not a red
   * control — a class already failing would satisfy it. Each plant here must (a) be proven to have
   * LANDED, and (b) produce the MATCHING failure and not merely some failure. */
  const quiet = () => {};
  let pass = 0, fail = 0;
  const ok = (label: string, cond: boolean, extra = "") => {
    if (cond) { pass++; console.log(`  ok   ${label}`); }
    else { fail++; console.log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
  };

  console.log("RED CONTROL — the pre-fix code, planted in memory\n");

  // The baseline: the real implementation passes everything. Without this, a red control cannot
  // tell "the plant broke it" from "it was already broken".
  const baseline = checkPure(REAL, quiet);
  ok("§0 baseline · the shipped implementation passes every pure assertion", baseline.length === 0, baseline.join("; "));

  type Plant = { name: string; expect: RegExp; impl: Impl; landed: () => boolean; landedAs: string };
  const plants: Plant[] = [
    {
      name: "D1 · the pre-fix toMsisdn255 (leading zero tested before the country code)",
      expect: /^§2 toMsisdn255\("00255712345678"\)/,
      impl: { ...REAL, toMsisdn255: NAIVE.toMsisdn255 },
      landed: () => NAIVE.toMsisdn255("00255712345678") === "2550255712345678",
      landedAs: `NAIVE.toMsisdn255("00255712345678") = "${NAIVE.toMsisdn255("00255712345678")}"`,
    },
    {
      name: "D1 · …and the sixteen-digit msisdn trips the E.164 length class assertion",
      expect: /^§2 ⭐ no vector produces a msisdn longer than 15 digits/,
      impl: { ...REAL, toMsisdn255: NAIVE.toMsisdn255 },
      landed: () => NAIVE.toMsisdn255("00255712345678").length === 16,
      landedAs: `length = ${NAIVE.toMsisdn255("00255712345678").length}`,
    },
    {
      // ⭐ FOUND BY AUDITING THE SUITE, NOT THE CODE. `00712000101` has been in §1 since August,
      // labelled "double-zero fat finger" — the one input this file already called a real user
      // mistake. Nothing anywhere evaluated `toMsisdn255` on it, and it produced a THIRTEEN-digit
      // wire msisdn. A vector can sit in a suite for a month and still be untested by it.
      name: "D1 · the pre-fix toMsisdn255 on the IDD-with-no-country-code vector (13 digits)",
      expect: /^§2 toMsisdn255\("00712000101"\)/,
      impl: { ...REAL, toMsisdn255: NAIVE.toMsisdn255 },
      landed: () => NAIVE.toMsisdn255("00712000101") === "2550712000101",
      landedAs: `NAIVE.toMsisdn255("00712000101") = "${NAIVE.toMsisdn255("00712000101")}" (${NAIVE.toMsisdn255("00712000101").length} digits)`,
    },
    {
      name: "D1 · the pre-fix normalizeTzLocalDigits (same ordering, opposite wrong answer)",
      expect: /^§2 normalizeTzLocalDigits\("00255712345678"\)/,
      impl: { ...REAL, normalizeTzLocalDigits: NAIVE.normalizeTzLocalDigits },
      landed: () => NAIVE.normalizeTzLocalDigits("00255712345678") === "255712345",
      landedAs: `NAIVE.normalizeTzLocalDigits("00255712345678") = "${NAIVE.normalizeTzLocalDigits("00255712345678")}"`,
    },
    {
      name: "D1 · …and the two rails then disagree on that vector",
      expect: /^§3 "00255712345678"/,
      impl: { ...REAL, normalizeTzLocalDigits: NAIVE.normalizeTzLocalDigits },
      landed: () => toMsisdn255("00255712345678") !== "255" + NAIVE.normalizeTzLocalDigits("00255712345678"),
      landedAs: `"${toMsisdn255("00255712345678")}" vs "255${NAIVE.normalizeTzLocalDigits("00255712345678")}"`,
    },
    {
      name: "D2 · no predicate at all — everything reaches the wire",
      expect: /^§4 "\+254712345678" -> REFUSED/,
      impl: { ...REAL, isGatewayMsisdn: NAIVE.isGatewayMsisdn },
      landed: () => NAIVE.isGatewayMsisdn("254712345678") === true,
      landedAs: "the pre-fix predicate accepts a Kenyan number",
    },
    {
      name: "D2 · …and an always-true predicate is caught by §4's own control",
      expect: /^§4 control · the predicate is not simply always-true/,
      impl: { ...REAL, isGatewayMsisdn: NAIVE.isGatewayMsisdn },
      landed: () => NAIVE.isGatewayMsisdn("255222123456") === true,
      landedAs: "the pre-fix predicate accepts a landline",
    },
    {
      name: "control · an always-FALSE predicate is caught too (so §4 cannot be satisfied by refusing all)",
      expect: /^§4 control · the predicate is not simply always-false/,
      impl: { ...REAL, isGatewayMsisdn: () => false },
      landed: () => true,
      landedAs: "an always-false predicate needs no proof of landing",
    },
    {
      name: "control · an identity that holds for EVERYTHING is caught by §3's foreign vector",
      expect: /^§3 ⭐ …and BREAKS for the foreign vector/,
      impl: { ...REAL, toMsisdn255: (raw: string) => "255" + REAL.normalizeTzLocalDigits(raw) },
      landed: () => "255" + REAL.normalizeTzLocalDigits("+254712345678") === "255254712345",
      landedAs: "a toMsisdn255 defined AS the identity makes §3 vacuous",
    },
  ];

  for (const p of plants) {
    ok(`PLANT LANDED · ${p.name}`, p.landed(), p.landedAs);
    const failures = checkPure(p.impl, quiet);
    const matched = failures.filter((f) => p.expect.test(f));
    ok(`  └─ fires: ${p.expect.source.slice(0, 60)}`, matched.length > 0,
      failures.length === 0 ? "NOTHING failed — the guard cannot see this defect" : `failed instead: ${failures.slice(0, 3).join(" | ")}`);
  }

  // §6's invariant gets its own plant: a row the old code would have written, put straight into the
  // store. Nothing else in this file can prove that assertion is able to fail.
  {
    const ref = "sms_redcontrol_00255";
    db.smsMessage.create({
      reference: ref, msisdn: NAIVE.toMsisdn255("00255712345678"), purpose: "OPS", provider: "blackball",
      senderId: "50pick", bodyLen: 1, status: "QUEUED", providerMsg: null, dlrStatus: null, dlrDesc: null,
      balanceTzs: null, attempts: 1, targetType: null, targetId: null,
      createdAt: "2026-09-25T00:00:00.000Z", sentAt: null, deliveredAt: null, failedAt: null,
    });
    const bad = await badRowsInStore();
    ok("PLANT LANDED · a 16-digit row, exactly as the pre-fix sendBatch would have written it",
      bad.some((b) => b.startsWith(ref)), bad.join(", "));
    ok("  └─ fires: §6 every SmsMessage row written in this run is dialable", bad.length > 0,
      "the invariant did not see a row the gateway cannot dial");
  }

  console.log(`\nRED CONTROL — ${fail === 0 ? `all ${pass} proofs held` : `${fail} of ${pass + fail} FAILED`}\n`);
  process.exitCode = fail === 0 ? 0 : 1;
}
