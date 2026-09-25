/**
 * test:tz-msisdn — the Tanzanian numbering plan, and the four ways a table like it goes wrong.
 *
 * ⭐ THE QUESTION THIS SUITE IS BUILT TO ANSWER: would it still pass if the feature were absent?
 * A parser that answered `ok` to everything would satisfy any suite made only of valid numbers, and
 * one that refused everything would satisfy any suite made only of junk. §2 therefore carries a
 * fixture for EVERY verdict, and §3 asserts both degenerate parsers are caught — by name.
 *
 * ── THE FOUR FAILURES THIS GUARDS, EACH ONE MEASURED RATHER THAN IMAGINED ────
 *
 * 🔴 ① A TABLE THAT IS SIMPLY OUT OF DATE. The plan this unit was drafted from carried the June-2020
 * edition. TCRA has re-issued it three times since, and 63, 64, 66, 70 and 72 all changed holder —
 * so five of nineteen rows were wrong. ⛔ Most sharply: the unit's own specified red control was
 * "`verdictFor("701234567") === "ok"` is the DEFECT", and 070 has been Honora/Yas, operational,
 * since the June-2026 edition. Planting that would have pinned the WRONG answer in place for ever.
 * §4 plants the 2020 answers and requires each one to fire.
 *
 * 🔴 ② A CODE THAT IS ALLOCATED ON PAPER AND DEAD ON THE WIRE. 064 belongs to Telxer Enterprise
 * Limited, has had no entry in libphonenumber's carrier map since 2022-09-08, is excluded from its
 * TZ mobile pattern, and Telxer appears nowhere in TCRA's own quarterly subscriber table. Sending to
 * it is billed and never arrives. ⛔ `isGatewayMsisdn` ACCEPTS `25564…` by design — the wire
 * predicate deliberately knows no numbering — so this module is the only thing standing in front of
 * it. §5 asserts exactly that seam.
 *
 * 🔴 ③ A TABLE REBUILT PER CALL. The importer is specified for ~150,000 rows (marketing plan §3c).
 * A `new Map(...)` inside the parser is invisible in every functional assertion and costs 150,000
 * allocations per import. §6 parses a large corpus and requires `tzTableBuildCount()` to still be 1.
 *
 * 🔴 ④ A SECOND COPY OF THE DISPLAY FORMATTER. There were two: `phone-input.tsx` held it privately,
 * and `wallet/withdraw/page.tsx` rendered the same shape with a different regex. They agree on every
 * nine-digit input and diverge on everything else, which is why nothing caught it. §8 asserts both
 * call sites now resolve to this module, and §3 proves the divergence is real.
 *
 * ⚠️ AND ONE RULE THAT IS ABOUT MONEY, NOT NUMBERS. `walletHint` is display-only: Tanzania's sources
 * contradict each other on number portability, so an NDC says which block a number was ISSUED from,
 * never which network it is on today. §7 asserts no payment or wallet module imports this file, so a
 * withdrawal can never be routed on a guess.
 *
 * ⛔ NO CALENDAR-TRIGGERED ASSERTION. §1 requires the plan's review date to PARSE and prints its age.
 * It never fails on a date: a guard that goes red on a birthday is a guard someone disables.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION — `--prove-red` plants every defect IN MEMORY and requires the
 * MATCHING assertion to fire. This file makes no file-writing call, so it stays outside
 * `test:red-anchors` §4's undeclared count.
 *
 * Run:  npm run test:tz-msisdn
 * Red:  npm run red:tz-msisdn
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  parseTzNumber,
  isSendableTzNumber,
  formatTzPhone,
  tzTableBuildCount,
  TZ_MOBILE_NDCS,
  TZ_OPERATORS,
  TZ_NUMBERING_PLAN,
  type TzNumber,
  type TzVerdict,
} from "../src/lib/tz-msisdn.ts";
import { formatTzPhone as formatFromModule } from "../src/lib/tz-msisdn.ts";
import { isGatewayMsisdn } from "../src/lib/phone-normalize.ts";

process.exitCode = 1; // failure is the default; cleared only at the very end

const PROVE_RED = process.argv.includes("--prove-red");
const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

/** What the parser is, so a red run can swap it for a broken one and re-run the same assertions. */
type Parser = (raw: string) => TzNumber;

/* ══ FIXTURES — one per verdict, and written out rather than generated ═══════ */

type Fixture = {
  raw: string;
  verdict: TzVerdict;
  why: string;
  msisdn?: string | null;
  ndc?: string;
  brand?: string;
  display?: string;
};

const FIXTURES: Fixture[] = [
  // ok — one per operator, so a table that loses a whole operator is caught
  { raw: "0745123456", verdict: "ok", why: "Vodacom range", msisdn: "255745123456", ndc: "74", brand: "Vodacom", display: "745 123 456" },
  { raw: "+255712345678", verdict: "ok", why: "Yas range, international form", msisdn: "255712345678", ndc: "71", brand: "Yas" },
  { raw: "0682345678", verdict: "ok", why: "Airtel range", msisdn: "255682345678", ndc: "68", brand: "Airtel" },
  { raw: "0612345678", verdict: "ok", why: "Halotel range", msisdn: "255612345678", ndc: "61", brand: "Halotel" },
  { raw: "0732345678", verdict: "ok", why: "TTCL range", msisdn: "255732345678", ndc: "73", brand: "TTCL" },
  // ⭐ the five codes the 2020 edition got wrong — each pinned to its 2026 answer
  { raw: "0632345678", verdict: "ok", why: "63 — Amotel in 2020, Halotel today", msisdn: "255632345678", ndc: "63", brand: "Halotel" },
  { raw: "0662345678", verdict: "ok", why: "66 — Smile in 2020, Airtel today", msisdn: "255662345678", ndc: "66", brand: "Airtel" },
  { raw: "0701234567", verdict: "ok", why: "70 — spare until 2026, Yas today ⛔ the unit's drafted red control had this backwards", msisdn: "255701234567", ndc: "70", brand: "Yas" },
  { raw: "0722345678", verdict: "ok", why: "72 — MO Mobile in 2020, Vodacom today", msisdn: "255722345678", ndc: "72", brand: "Vodacom" },
  { raw: "0602345678", verdict: "ok", why: "60 — TCRA says reserved, the carriers say Airtel; accepted and flagged", msisdn: "255602345678", ndc: "60", brand: "Airtel" },
  // unallocated_prefix
  { raw: "0642345678", verdict: "unallocated_prefix", why: "64 — Telxer holds it; no live network since 2022", ndc: "64" },
  // landline and its neighbours
  { raw: "0222123456", verdict: "landline", why: "Dar es Salaam fixed line", ndc: "22" },
  { raw: "0272123456", verdict: "landline", why: "Arusha fixed line", ndc: "27" },
  { raw: "0800110051", verdict: "landline", why: "the Gaming Board's toll-free helpline", ndc: "80" },
  { raw: "0900123456", verdict: "landline", why: "premium rate", ndc: "90" },
  { raw: "0512345678", verdict: "landline", why: "corporate data, not mobile", ndc: "51" },
  { raw: "0412345678", verdict: "landline", why: "internet telephony", ndc: "41" },
  // foreign
  { raw: "+254712345678", verdict: "foreign", why: "Kenyan" },
  { raw: "00447700900123", verdict: "foreign", why: "UK, written with the IDD prefix" },
  // shape
  { raw: "0712345", verdict: "too_short", why: "seven digits — cut off in the paste" },
  { raw: "+2557123456789", verdict: "too_long", why: "one digit too many" },
  // ⚠️ GENUINELY AMBIGUOUS, AND PINNED SO THE CHOICE IS VISIBLE. Nine digits beginning "25" is
  // either a truncated `255712345678` or a real Katavi/Mbeya landline written the way Tanzanians
  // write numbers — without the trunk zero, exactly as "712 345 678" is a mobile. Nothing can tell
  // them apart. The parser reads it as the landline, which is the reading consistent with every
  // other nine-digit national number it handles. ⭐ Either way it is REFUSED and explained, so the
  // outcome is right and only the wording differs — but the choice is pinned here so a future
  // change to it is deliberate rather than accidental.
  { raw: "255712345", verdict: "landline", why: "nine digits from 25 — read as a landline, not a truncation", ndc: "25" },
  { raw: "", verdict: "not_a_number", why: "an empty cell in the imported file" },
  { raw: "n/a", verdict: "not_a_number", why: "a word where a number should be" },
  // ⭐ our own export's formula guard must survive its own round trip
  { raw: "'+255712345678", verdict: "ok", why: "our CSV export writes a leading apostrophe", msisdn: "255712345678", ndc: "71", brand: "Yas" },
  // ⭐ D1's vector, reaching the parser rather than the wire
  { raw: "00255712345678", verdict: "ok", why: "IDD prefix instead of the plus", msisdn: "255712345678", ndc: "71", brand: "Yas" },
];

/* ══ THE ASSERTIONS ═════════════════════════════════════════════════════════ */

function check(parse: Parser, format: (d: string) => string, log: (l: string) => void): string[] {
  const failed: string[] = [];
  const ok = (label: string, cond: boolean, extra = "") => {
    if (cond) log(`  ok   ${label}`);
    else { failed.push(label); log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
  };

  /* ── §1 · the plan declares its own provenance ─────────────────────────── */
  log("\n§1 · THE PLAN THIS FILE ENCODES DECLARES ITSELF");
  const reviewed = new Date(`${TZ_NUMBERING_PLAN.reviewed}T00:00:00Z`);
  ok("§1 the review date parses", !Number.isNaN(reviewed.getTime()), TZ_NUMBERING_PLAN.reviewed);
  ok("§1 the edition, issue date and source are all present",
    !!TZ_NUMBERING_PLAN.edition && !!TZ_NUMBERING_PLAN.issued && /^https:\/\//.test(TZ_NUMBERING_PLAN.source));
  ok("§1 …and a second, independent corroborating source is named",
    /^https:\/\//.test(TZ_NUMBERING_PLAN.corroboration));
  // ⛔ PRINTED, NEVER ASSERTED — see the header.
  const ageDays = Math.floor((Date.now() - reviewed.getTime()) / 86_400_000);
  log(`       plan ${TZ_NUMBERING_PLAN.edition} (issued ${TZ_NUMBERING_PLAN.issued}) · last reviewed by a human ${TZ_NUMBERING_PLAN.reviewed}, ${ageDays} day(s) ago`);

  /* ── §2 · a fixture for every verdict ──────────────────────────────────── */
  log("\n§2 · A FIXTURE FOR EVERY VERDICT");
  for (const f of FIXTURES) {
    const got = parse(f.raw);
    ok(`§2 "${f.raw}" is ${f.verdict} (${f.why})`, got.verdict === f.verdict, `got ${got.verdict} — ${got.reason}`);
    if (f.msisdn !== undefined) ok(`§2 "${f.raw}" yields msisdn ${f.msisdn}`, got.msisdn === f.msisdn, `got ${got.msisdn}`);
    if (f.ndc !== undefined) ok(`§2 "${f.raw}" reports NDC ${f.ndc}`, got.ndc === f.ndc, `got ${got.ndc}`);
    if (f.brand !== undefined) ok(`§2 "${f.raw}" is issued from ${f.brand}'s range`, got.operator?.brand === f.brand, `got ${got.operator?.brand}`);
    if (f.display !== undefined) ok(`§2 "${f.raw}" displays as ${f.display}`, got.display === f.display, `got ${got.display}`);
  }
  const seen = new Set(FIXTURES.map((f) => f.verdict));
  const ALL: TzVerdict[] = ["ok", "not_a_number", "too_short", "too_long", "landline", "foreign", "unallocated_prefix"];
  ok("§2 ⭐ every verdict the type allows has at least one fixture",
    ALL.every((v) => seen.has(v)), `missing: ${ALL.filter((v) => !seen.has(v)).join(", ")}`);

  /* ── §3 · neither degenerate parser can pass ───────────────────────────── */
  log("\n§3 · NEITHER DEGENERATE PARSER CAN PASS");
  ok("§3 control · something is accepted", FIXTURES.some((f) => parse(f.raw).verdict === "ok"));
  ok("§3 control · something is refused", FIXTURES.some((f) => parse(f.raw).verdict !== "ok"));
  ok("§3 ⭐ a refusal never hands out a sendable number",
    FIXTURES.every((f) => { const r = parse(f.raw); return r.verdict === "ok" || (r.msisdn === null && r.e164 === null); }),
    "a non-ok verdict carried an msisdn, which is exactly the misuse this prevents");
  ok("§3 ⭐ every ok DOES hand out one, and it is dialable by the wire predicate",
    FIXTURES.filter((f) => f.verdict === "ok").every((f) => { const r = parse(f.raw); return !!r.msisdn && isGatewayMsisdn(r.msisdn); }));
  ok("§3 every refusal explains itself in words, not a code",
    FIXTURES.filter((f) => f.verdict !== "ok").every((f) => { const r = parse(f.raw); return r.reason.length > 20 && !/[A-Z]{4,}_/.test(r.reason); }));

  /* ── §4 · the table is the 2026 edition, not the 2020 one ──────────────── */
  log("\n§4 · THE TABLE IS THE EDITION IT CLAIMS TO BE");
  const brandOf = (ndc: string) => parse(`0${ndc}2345678`).operator?.brand ?? null;
  const MOVED: Array<[string, string, string]> = [
    ["63", "Halotel", "Amotel"],
    ["66", "Airtel", "Smile"],
    ["70", "Yas", "nobody — it was spare"],
    ["72", "Vodacom", "MO Mobile"],
  ];
  for (const [ndc, now, then] of MOVED) {
    ok(`§4 NDC ${ndc} is ${now} today (it was ${then} in the 2020 edition)`, brandOf(ndc) === now, `got ${brandOf(ndc)}`);
  }
  ok("§4 every mobile NDC 60-79 has exactly one row", TZ_MOBILE_NDCS.length === 20, `${TZ_MOBILE_NDCS.length} rows`);
  ok("§4 …and no NDC appears twice", new Set(TZ_MOBILE_NDCS.map((r) => r.ndc)).size === TZ_MOBILE_NDCS.length);
  ok("§4 every row names an operator that exists", TZ_MOBILE_NDCS.every((r) => !!TZ_OPERATORS[r.operator]));
  ok("§4 ⭐ every row the table refuses says WHY, in words", TZ_MOBILE_NDCS.filter((r) => !r.sendable).every((r) => (r.note ?? "").length > 40));
  ok("§4 ⭐ every DISPUTED row is accepted, not refused — a false refusal is invisible, a false send is a receipt that never arrives",
    TZ_MOBILE_NDCS.filter((r) => r.disputed).every((r) => r.sendable));

  /* ── §5 · the seam with the wire predicate ─────────────────────────────── */
  log("\n§5 · THE SEAM WITH THE WIRE PREDICATE");
  ok("§5 ⭐ the wire predicate ACCEPTS 25564… — it knows no numbering, by design",
    isGatewayMsisdn("255642345678") === true);
  ok("§5 ⭐ …and this module is what refuses it, so the two together are correct",
    parse("0642345678").verdict === "unallocated_prefix");
  ok("§5 …and refusing it means no msisdn escapes", parse("0642345678").msisdn === null);
  ok("§5 isSendableTzNumber agrees with the verdict on every fixture",
    FIXTURES.every((f) => isSendableTzNumber(f.raw) === (parse(f.raw).verdict === "ok")));

  /* ── §6 · built once ───────────────────────────────────────────────────── */
  log("\n§6 · THE TABLE IS BUILT ONCE, NOT ONCE PER ROW");
  const before = tzTableBuildCount();
  const CORPUS = 20_000;
  const t0 = Date.now();
  for (let i = 0; i < CORPUS; i++) parse(`07${(12_000_000 + i).toString().slice(0, 7)}`);
  const ms = Date.now() - t0;
  ok(`§6 ⭐ ${CORPUS.toLocaleString()} parses did not rebuild the table`, tzTableBuildCount() === before && before === 1,
    `build count ${before} -> ${tzTableBuildCount()}`);
  // ⛔ PRINTED, NOT ASSERTED. A timing threshold on a shared machine is a flake, and a threshold
  // loose enough not to flake proves nothing. The build count is the assertion.
  log(`       ${CORPUS.toLocaleString()} parses in ${ms} ms (${Math.round(CORPUS / Math.max(ms, 1) * 1000).toLocaleString()}/s) — 150,000 rows would take about ${(150_000 / Math.max(CORPUS / Math.max(ms, 1) * 1000, 1)).toFixed(1)} s`);

  /* ── §9 · the formatter ────────────────────────────────────────────────── */
  log("\n§9 · ONE DISPLAY FORMATTER");
  const GROUPING: Array<[string, string]> = [
    ["", ""], ["7", "7"], ["71", "71"], ["712", "712"], ["7123", "712 3"],
    ["712345", "712 345"], ["7123456", "712 345 6"], ["712345678", "712 345 678"],
    ["7123456789", "712 345 678"],
  ];
  for (const [inp, out] of GROUPING) {
    ok(`§9 format("${inp}") is "${out}"`, format(inp) === out, `got "${format(inp)}"`);
  }
  ok("§9 ⭐ no trailing space at a group boundary — the caret must not land after a space nobody typed",
    !format("712").endsWith(" ") && !format("712345").endsWith(" "));
  // ⭐ THE DIVERGENCE THAT MADE THE SECOND COPY DANGEROUS, pinned. The withdraw page's regex had no
  // nine-digit cap, so a stored wire-form msisdn rendered as a thirteen-character string.
  const OLD_WITHDRAW_COPY = (s: string) => s.replace(/(\d{3})(?=\d)/g, "$1 ");
  ok("§9 ⭐ the two old copies AGREE on nine digits, which is why nothing caught the drift",
    OLD_WITHDRAW_COPY("712345678") === format("712345678"));
  ok("§9 ⭐ …and DISAGREE on a stored wire-form number, which is the bug",
    OLD_WITHDRAW_COPY("255712345678") !== format("255712345678"),
    `old "${OLD_WITHDRAW_COPY("255712345678")}" vs one-home "${format("255712345678")}"`);

  return failed;
}

/** Source-level assertions: these read the tree, so they run once, not per planted parser. */
function checkSources(log: (l: string) => void, override?: (rel: string, src: string) => string): string[] {
  const failed: string[] = [];
  const ok = (label: string, cond: boolean, extra = "") => {
    if (cond) log(`  ok   ${label}`);
    else { failed.push(label); log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
  };
  // ⛔ `override` exists ONLY so `--prove-red` can plant a source-level defect IN MEMORY. Nothing on
  // the green path passes it, and no file is ever written — §7 and §8 read the tree, so without this
  // they would be the two assertions in this file that nothing proves can fail.
  const read = (rel: string) => {
    const raw = readFileSync(join(ROOT, rel), "utf8");
    return override ? override(rel, raw) : raw;
  };

  /* ── §7 · money may not read this table ────────────────────────────────── */
  log("\n§7 · NO MONEY RAIL READS THIS TABLE");
  const walk = (dir: string, out: string[] = []): string[] => {
    for (const e of readdirSync(join(ROOT, dir))) {
      const rel = `${dir}/${e}`;
      if (statSync(join(ROOT, rel)).isDirectory()) walk(rel, out);
      else if (/\.(ts|tsx)$/.test(e)) out.push(rel);
    }
    return out;
  };
  const MONEY = [
    "src/lib/server/wallet-service.ts", "src/lib/server/payments.ts", "src/lib/server/selcom.ts",
    "src/lib/payout-destination.ts", "src/lib/server/payment-ops.ts",
  ].filter((p) => { try { statSync(join(ROOT, p)); return true; } catch { return false; } });
  ok("§7 control · the money modules this checks actually exist", MONEY.length >= 3, `found ${MONEY.length}`);
  const walletDir = walk("src/app/wallet");
  ok("§7 control · the wallet screens were found", walletDir.length > 0, `${walletDir.length} files`);
  // ⭐ THE RULE IS ABOUT THE TABLE, NOT THE FILE. A money screen may import the pure display
  // formatter — that is the entire point of giving the 3-3-3 grouping one home, and the withdraw
  // page does exactly that. What it may NEVER import is anything that answers "which network is
  // this number on", because Tanzania's sources contradict each other on portability and a payout
  // routed on an NDC guess reaches the wrong provider for anyone who has ported.
  // ⛔ An earlier version of this assertion banned the whole module and went red on the legitimate
  // import, which would have been "fixed" by deleting the guard. Ban the binding, not the file.
  const FORBIDDEN_IN_MONEY = ["parseTzNumber", "isSendableTzNumber", "TZ_OPERATORS", "TZ_MOBILE_NDCS", "TZ_NUMBERING_PLAN"];
  const bindingsOf = (src: string): string[] => {
    const m = src.match(/import\s*\{([^}]*)\}\s*from\s*["'][^"']*tz-msisdn["']/);
    return m ? m[1].split(",").map((s) => s.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean) : [];
  };
  const offenders = [...MONEY, ...walletDir]
    .map((p) => [p, bindingsOf(read(p)).filter((b) => FORBIDDEN_IN_MONEY.includes(b))] as const)
    .filter(([, bad]) => bad.length > 0);
  ok("§7 ⭐ no payment module and no wallet screen reads the NDC table — a payout can never be routed on an NDC guess",
    offenders.length === 0, offenders.map(([p, b]) => `${p}: ${b.join("+")}`).join(", "));
  ok("§7 control · the binding reader actually finds bindings, so an empty result means clean and not broken",
    bindingsOf('import { formatTzPhone, parseTzNumber } from "@/lib/tz-msisdn";').join(",") === "formatTzPhone,parseTzNumber");

  /* ── §8 · both display call sites resolve here ─────────────────────────── */
  log("\n§8 · BOTH DISPLAY CALL SITES RESOLVE TO ONE FUNCTION");
  const input = read("src/components/ui/phone-input.tsx");
  ok("§8 phone-input imports the formatter rather than defining one",
    /from\s+["']@\/lib\/tz-msisdn["']/.test(input) && !/function\s+formatTzPhone/.test(input),
    /function\s+formatTzPhone/.test(input) ? "it still defines its own" : "it does not import it");
  const withdraw = read("src/app/wallet/withdraw/page.tsx");
  ok("§8 ⭐ the withdraw page's hand-rolled grouping regex is gone",
    !/\(\\d\{3\}\)\(\?=\\d\)/.test(withdraw) && !/\(\\d\{3\}\)\(\?=\\d\)/.test(withdraw.replace(/\\\\/g, "\\")),
    "the second copy is still there");
  ok("§8 …and it renders through the shared formatter",
    /formatTzPhone/.test(withdraw), "it no longer groups at all, which is a different regression");
  return failed;
}

/* ══ THE RUN ════════════════════════════════════════════════════════════════ */

if (!PROVE_RED) {
  const log = (l: string) => console.log(l);
  const failed = [...check(parseTzNumber, formatFromModule, log), ...checkSources(log)];
  console.log(`\nTZ MSISDN — ${failed.length === 0 ? "all checks passed" : `${failed.length} failed`}\n`);
  for (const f of failed) console.log(`  · ${f}`);
  process.exitCode = failed.length === 0 ? 0 : 1;
} else {
  const quiet = () => {};
  let pass = 0, fail = 0;
  const ok = (label: string, cond: boolean, extra = "") => {
    if (cond) { pass++; console.log(`  ok   ${label}`); }
    else { fail++; console.log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
  };

  console.log("RED CONTROL — the real defects, planted in memory\n");

  const baseline = [...check(parseTzNumber, formatFromModule, quiet), ...checkSources(quiet)];
  ok("§0 baseline · the shipped module passes every assertion before anything is planted",
    baseline.length === 0, baseline.join("; "));

  /** Re-answers as if the 2020 edition were still current. */
  const stale = (ndc: string, brand: string): Parser => (raw) => {
    const r = parseTzNumber(raw);
    if (r.ndc !== ndc || r.verdict !== "ok") return r;
    return { ...r, operator: { id: "TELXER", licensee: "stale", brand, walletHint: null } };
  };

  type Plant = { name: string; expect: RegExp; parse: Parser; format?: (d: string) => string; landed: () => boolean; landedAs: string };
  const plants: Plant[] = [
    {
      name: "① the 2020 edition's answer for NDC 63 (Amotel)",
      expect: /^§4 NDC 63 is Halotel today/,
      parse: stale("63", "Amotel"),
      landed: () => stale("63", "Amotel")("0632345678").operator?.brand === "Amotel",
      landedAs: "the stale parser answers Amotel for 063",
    },
    {
      name: "① the 2020 edition's answer for NDC 66 (Smile)",
      expect: /^§4 NDC 66 is Airtel today/,
      parse: stale("66", "Smile"),
      landed: () => stale("66", "Smile")("0662345678").operator?.brand === "Smile",
      landedAs: "the stale parser answers Smile for 066",
    },
    {
      name: "① ⭐ THE UNIT'S OWN DRAFTED RED CONTROL, WHICH WAS BACKWARDS: 070 refused as unallocated",
      expect: /^§2 "0701234567" is ok/,
      parse: (raw) => { const r = parseTzNumber(raw); return r.ndc === "70" ? { ...r, verdict: "unallocated_prefix", msisdn: null, e164: null, operator: null, reason: "no operator holds 070" } : r; },
      landed: () => true,
      landedAs: "070 was spare until the June-2026 edition; the unit's text planted 'ok' AS the defect",
    },
    {
      name: "② NDC 64 accepted — allocated on paper, dead on the wire, and the wire predicate will not catch it",
      expect: /^§2 "0642345678" is unallocated_prefix/,
      parse: (raw) => { const r = parseTzNumber(raw); return r.ndc === "64" ? { ...r, verdict: "ok", msisdn: "255642345678", e164: "+255642345678" } : r; },
      landed: () => isGatewayMsisdn("255642345678") === true,
      landedAs: "isGatewayMsisdn accepts 255642345678, so nothing downstream would refuse it",
    },
    {
      name: "④ the display formatter re-inlined with the withdraw page's regex (no nine-digit cap)",
      expect: /^§9 format\("7123456789"\)/,
      parse: parseTzNumber,
      format: (s) => (s ?? "").replace(/(\d{3})(?=\d)/g, "$1 "),
      landed: () => "7123456789".replace(/(\d{3})(?=\d)/g, "$1 ") === "712 345 678 9",
      landedAs: 'the old regex renders "7123456789" as "712 345 678 9"',
    },
    {
      name: "control · a parser that answers ok to everything",
      expect: /^§2 "0222123456" is landline/,
      parse: (raw) => ({ ...parseTzNumber(raw), verdict: "ok", msisdn: "255712345678", e164: "+255712345678" }),
      landed: () => true,
      landedAs: "an always-ok parser needs no proof of landing",
    },
    {
      name: "control · a parser that refuses everything",
      expect: /^§2 "0745123456" is ok/,
      parse: (raw) => ({ ...parseTzNumber(raw), verdict: "not_a_number", msisdn: null, e164: null }),
      landed: () => true,
      landedAs: "an always-refusing parser needs no proof of landing",
    },
    {
      name: "control · a refusal that still hands out a sendable msisdn",
      expect: /^§3 ⭐ a refusal never hands out a sendable number/,
      parse: (raw) => { const r = parseTzNumber(raw); return r.verdict === "ok" ? r : { ...r, msisdn: "255712345678", e164: "+255712345678" }; },
      landed: () => true,
      landedAs: "the misuse this module is shaped to prevent",
    },
    {
      name: "control · a disputed row REFUSED rather than accepted (NDC 60)",
      expect: /^§2 "0602345678" is ok/,
      parse: (raw) => { const r = parseTzNumber(raw); return r.ndc === "60" ? { ...r, verdict: "unallocated_prefix", msisdn: null, e164: null } : r; },
      landed: () => TZ_MOBILE_NDCS.some((r) => r.ndc === "60" && !!r.disputed),
      landedAs: "60 is the disputed row: TCRA says reserved, the carriers say Airtel",
    },
  ];

  for (const p of plants) {
    ok(`PLANT LANDED · ${p.name}`, p.landed(), p.landedAs);
    const failures = check(p.parse, p.format ?? formatFromModule, quiet);
    const matched = failures.filter((f) => p.expect.test(f));
    ok(`  └─ fires: ${p.expect.source.slice(0, 58)}`, matched.length > 0,
      failures.length === 0 ? "NOTHING failed — the guard cannot see this defect" : `failed instead: ${failures.slice(0, 2).join(" | ")}`);
  }

  /* ── §7 and §8 read the TREE, so their plants are source-level, still in memory ────────────── */
  type SourcePlant = { name: string; expect: RegExp; override: (rel: string, src: string) => string };
  const sourcePlants: SourcePlant[] = [
    {
      name: "⚠️ a wallet screen reaching for the NDC table — the payout-on-a-guess this rule exists for",
      expect: /^§7 ⭐ no payment module and no wallet screen reads the NDC table/,
      override: (rel, src) =>
        rel.endsWith("withdraw/page.tsx") ? `import { parseTzNumber } from "@/lib/tz-msisdn";\n${src}` : src,
    },
    {
      name: "④ the phone input defining its own formatter again — the second copy, returning",
      expect: /^§8 phone-input imports the formatter rather than defining one/,
      override: (rel, src) =>
        rel.endsWith("phone-input.tsx")
          ? src.replace(/import \{ formatTzPhone \} from "@\/lib\/tz-msisdn";/, "function formatTzPhone(d: string) { return d; }")
          : src,
    },
    {
      name: "④ the withdraw page's hand-rolled grouping regex, restored",
      expect: /^§8 ⭐ the withdraw page's hand-rolled grouping regex is gone/,
      override: (rel, src) =>
        rel.endsWith("withdraw/page.tsx") ? src.replace("{formatTzPhone(registeredMsisdn)}", '{registeredMsisdn.replace(/(\\d{3})(?=\\d)/g, "$1 ")}') : src,
    },
  ];
  for (const p of sourcePlants) {
    const failures = checkSources(quiet, p.override);
    const matched = failures.filter((f) => p.expect.test(f));
    ok(`PLANT · ${p.name}`, matched.length > 0,
      failures.length === 0 ? "NOTHING failed — the guard cannot see this defect" : `failed instead: ${failures.slice(0, 2).join(" | ")}`);
  }

  // §6's build-count assertion gets its own plant: a parser that rebuilds the index per call.
  {
    let builds = 1;
    const rebuilding: Parser = (raw) => { builds += 1; new Map(TZ_MOBILE_NDCS.map((r) => [r.ndc, r])); return parseTzNumber(raw); };
    for (let i = 0; i < 100; i++) rebuilding("0712345678");
    ok("PLANT LANDED · a parser that rebuilds the NDC index on every call", builds === 101, `builds = ${builds}`);
    ok("  └─ fires: §6 the build counter is what makes that visible at all",
      builds !== tzTableBuildCount(),
      "a per-call rebuild was indistinguishable from the real module, so §6 proves nothing");
  }

  console.log(`\nRED CONTROL — ${fail === 0 ? `all ${pass} proofs held` : `${fail} of ${pass + fail} FAILED`}\n`);
  process.exitCode = fail === 0 ? 0 : 1;
}
