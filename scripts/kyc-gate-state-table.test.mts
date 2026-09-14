/**
 * THE IDENTITY PANEL'S STATE, AS A TABLE OVER EVERY SHAPE A ROW CAN TAKE.   `npm run test:kyc-gate-state-table`   (in predeploy)
 *
 * 🔴 WHAT THIS HOLDS (audit session 95, U1, 2026-09-14). `kycGateState` asked `approvedEver` FIRST, so an account
 * approved once and later refused on a FINAL code (UNDERAGE / SANCTIONED / DUPLICATE_IDENTITY) answered `null` — and
 * `/wallet/withdraw` drew the payout form over a wallet the refusal had frozen. The player learned only at confirm.
 * The repair is one line of precedence. A line of precedence is exactly what a later tidy-up reorders "for
 * readability", so the rule is held here as a TABLE, not as one example: every status, with and without an approval
 * stamp, with every refusal code, with and without documents, in both shapes the callers pass.
 *
 * THE TABLE — pure, no store, no server import:
 *   status        NOT_STARTED · IN_PROGRESS · PENDING_REVIEW · ADDITIONAL_INFO_REQUIRED · REJECTED · APPROVED · (none)
 *   approvedAt    set · unset
 *   rejectReason  each FINAL code · each RECOVERABLE code (BLURRY_DOC, DETAILS_MISMATCH, EXPIRED_ID, OTHER) · null
 *   documents     0 · 1, given as `documentCount` and as a `documents` array
 *   …and the missing row itself (null and undefined).
 *
 * THE TWO ASSERTIONS, on every row:
 *   A · status REJECTED on a FINAL code  ⇒  kycGateState(row) === "refused_final", whatever approvedAt says;
 *   B · every other row                 ⇒  kycGateState(row) === null  ⟺  approvedEver(row).
 * B is the money-safety rule from the other side: an account approved at least once is never shown a wall on the
 * withdraw screen (it may withdraw), and an account never approved is never shown the form.
 *
 * ⭐ THE HELPERS ARE CHECKED AGAINST ORACLES WRITTEN HERE (§1), because A and B lean on `approvedEver` and
 * `isFinalRefusal`: if either drifted, a table that only asked them would agree with itself forever.
 * ⛔ IT CANNOT PASS VACUOUSLY: the row count is pinned, each assertion prints how many rows it judged, and §3
 * re-implements the wrong variants inline and requires the SAME checker to fail every one of them.
 */
import { kycGateState, type KycGateFacts } from "../src/lib/kyc-gate-state.ts";
import { approvedEver } from "../src/lib/kyc-approval.ts";
import { isFinalRefusal, FINAL_REFUSAL_CODES } from "../src/lib/kyc-refusal.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra = "") => {
  if (cond) pass++; else fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${extra ? ` — ${extra}` : ""}`);
};
const section = (s: string) => console.log(`\n${s}`);

// ═══ §0 · THE TABLE ═════════════════════════════════════════════════════════════════════════════════════════════
const STATUSES = ["NOT_STARTED", "IN_PROGRESS", "PENDING_REVIEW", "ADDITIONAL_INFO_REQUIRED", "REJECTED", "APPROVED", null] as const;
const APPROVED_AT = [null, "2026-08-01T10:00:00.000Z"] as const;
/** Written out here, not read from `kyc-refusal.ts` — the oracle must not be the thing under test. */
const FINAL_ORACLE = ["UNDERAGE", "SANCTIONED", "DUPLICATE_IDENTITY"] as const;
const RECOVERABLE = ["BLURRY_DOC", "DETAILS_MISMATCH", "EXPIRED_ID", "OTHER"] as const;
const REASONS = [...FINAL_ORACLE, ...RECOVERABLE, null] as const;
const DOCS = [0, 1] as const;
const SHAPES = ["count", "array"] as const;

type Row = { label: string; facts: KycGateFacts };
function buildTable(): Row[] {
  const rows: Row[] = [
    { label: "no row (null)", facts: null },
    { label: "no row (undefined)", facts: undefined },
  ];
  for (const status of STATUSES) for (const approvedAt of APPROVED_AT) for (const rejectReason of REASONS)
    for (const docs of DOCS) for (const shape of SHAPES) {
      const facts: KycGateFacts = shape === "count"
        ? { status, approvedAt, rejectReason, documentCount: docs }
        : { status, approvedAt, rejectReason, documents: Array.from({ length: docs }, () => ({ docType: "NIDA_FRONT" })) };
      rows.push({
        label: `${status ?? "(no status)"} · approvedAt ${approvedAt ? "set" : "unset"} · reason ${rejectReason ?? "null"} · docs ${docs} (${shape})`,
        facts,
      });
    }
  return rows;
}
const rows = buildTable();
/** 2 missing rows + 7 statuses × 2 stamps × 8 reasons × 2 document counts × 2 shapes. */
const EXPECTED_ROWS = 450;

const approvedOracle = (f: KycGateFacts) => !!f?.approvedAt || f?.status === "APPROVED";
const finalOracle = (code: string | null | undefined) => !!code && (FINAL_ORACLE as readonly string[]).includes(code);
const VOCAB = new Set(["not_started", "uploaded", "pending_review", "more_info", "rejected", "refused_final"]);

section("§0 · the population");
ok(`0.1 ⛔ RATCHET · the table holds exactly ${EXPECTED_ROWS} rows`, rows.length === EXPECTED_ROWS, `${rows.length} rows`);
ok("0.2 the table covers all seven statuses, both stamps, all eight reasons, both document counts and both shapes",
  STATUSES.length === 7 && APPROVED_AT.length === 2 && REASONS.length === 8 && DOCS.length === 2 && SHAPES.length === 2);

// ═══ §1 · THE ORACLES — the helpers A and B lean on ═════════════════════════════════════════════════════════════
section("§1 · approvedEver and isFinalRefusal, against oracles written here");
{
  const drift = rows.filter((r) => approvedEver(r.facts) !== approvedOracle(r.facts)).map((r) => r.label);
  ok("1.1 ⛔ approvedEver(row) === (approvedAt set || status APPROVED) on every row", drift.length === 0, drift.slice(0, 4).join(" | "));
  const approvedRows = rows.filter((r) => approvedOracle(r.facts)).length;
  ok("1.2 …and the table holds both answers (neither side of B is empty)", approvedRows > 0 && approvedRows < rows.length, `${approvedRows} approved-ever of ${rows.length}`);

  const codes: (string | null | undefined)[] = [...REASONS, undefined, "", "underage", "UNDERAGE ", "REJECTED"];
  const wrong = codes.filter((c) => isFinalRefusal(c) !== finalOracle(c)).map((c) => JSON.stringify(c));
  ok("1.3 ⛔ isFinalRefusal is true for exactly the three final codes (not a lowercase, padded or recoverable one)", wrong.length === 0, wrong.join(", "));
  const exported = [...FINAL_REFUSAL_CODES].sort().join(",");
  ok("1.4 ⛔ FINAL_REFUSAL_CODES is exactly the oracle's three", exported === [...FINAL_ORACLE].sort().join(","), exported);
}

// ═══ §2 · THE TABLE — assertions A and B ════════════════════════════════════════════════════════════════════════
type Gate = (f: KycGateFacts) => string | null;
type Report = { a: string[]; b: string[]; vocab: string[]; judgedA: number; judgedB: number; stampedFinal: number };
/** ONE checker, run on the real function below and on every wrong variant in §3. */
function check(gate: Gate): Report {
  const out: Report = { a: [], b: [], vocab: [], judgedA: 0, judgedB: 0, stampedFinal: 0 };
  for (const r of rows) {
    let got: string | null;
    try { got = gate(r.facts); } catch (err) { got = `THREW ${(err as Error).message}`; }
    if (got !== null && !VOCAB.has(got)) out.vocab.push(`${r.label} → ${got}`);
    if (r.facts?.status === "REJECTED" && isFinalRefusal(r.facts?.rejectReason)) {
      out.judgedA++;
      if (r.facts?.approvedAt) out.stampedFinal++;
      if (got !== "refused_final") out.a.push(`${r.label} → ${JSON.stringify(got)}`);
    } else {
      out.judgedB++;
      if ((got === null) !== approvedEver(r.facts)) out.b.push(`${r.label} → ${JSON.stringify(got)} (approvedEver ${approvedEver(r.facts)})`);
    }
  }
  return out;
}
const violations = (r: Report) => r.a.length + r.b.length + r.vocab.length;

section("§2 · kycGateState over the table");
{
  const r = check(kycGateState as Gate);
  // 1 status × 2 stamps × 3 final codes × 2 document counts × 2 shapes.
  ok("2.0 the rows judged by A are exactly the REJECTED-on-a-final-code rows (24), and B judges the rest",
    r.judgedA === 24 && r.judgedB === EXPECTED_ROWS - 24, `A ${r.judgedA} · B ${r.judgedB}`);
  ok("2.1 ⛔ A · REJECTED on a FINAL code is refused_final — on every such row", r.a.length === 0, r.a.slice(0, 4).join(" | "));
  ok("2.2 🔴 A · …including the 12 rows APPROVED BEFORE (the U1 defect: the payout form over a frozen wallet)",
    r.stampedFinal === 12 && !r.a.some((x) => x.includes("approvedAt set")), `${r.stampedFinal} stamped final rows`);
  ok("2.3 ⛔ B · every other row is null exactly when approvedEver — no wall for an approved-ever account, no form for the rest",
    r.b.length === 0, r.b.slice(0, 4).join(" | "));
  ok("2.4 every non-null answer is in the panel's vocabulary", r.vocab.length === 0, r.vocab.slice(0, 4).join(" | "));
  console.log(`     judged ${rows.length} rows · A ${r.judgedA} · B ${r.judgedB} · violations ${violations(r)}`);
}

// ═══ §3 · CONTROLS — the wrong variants, and the same checker failing each ══════════════════════════════════════
section("§3 · CONTROLS: every wrong variant is caught by the same table");
{
  /** The panel's switch, exactly as `kyc-gate-state.ts` writes it, so each variant differs in ONE decision. */
  const panelOf = (f: KycGateFacts): string => {
    const documentCount = f?.documentCount ?? f?.documents?.length ?? 0;
    switch (f?.status) {
      case "PENDING_REVIEW": return "pending_review";
      case "ADDITIONAL_INFO_REQUIRED": return "more_info";
      case "REJECTED": return isFinalRefusal(f?.rejectReason) ? "refused_final" : "rejected";
      case "IN_PROGRESS": return documentCount > 0 ? "uploaded" : "not_started";
      default: return "not_started";
    }
  };
  const variants: [string, Gate, (r: Report) => boolean][] = [
    // 🔴 The shipped defect: approved-ever asked first.
    ["the pre-2026-09-14 precedence (approvedEver first)", (f) => (approvedEver(f) ? null : panelOf(f)), (r) => r.a.length === 12],
    // The 2026-09-13 page/server split: only the stamp counts, so an APPROVED row with no stamp meets a wall.
    ["approval read from the stamp alone", (f) => (f?.status === "REJECTED" && isFinalRefusal(f?.rejectReason) ? "refused_final" : f?.approvedAt ? null : panelOf(f)), (r) => r.b.length > 0],
    // A final refusal drawn as the recoverable panel ("try again" to a player who cannot).
    ["a final refusal shown as `rejected`", (f) => (approvedEver(f) ? null : f?.status === "REJECTED" ? "rejected" : panelOf(f)), (r) => r.a.length > 0],
    // The refusal code read without the status: a leftover UNDERAGE on a re-opened, approved-ever row walls it off.
    ["the refusal code read without the status", (f) => (isFinalRefusal(f?.rejectReason) ? "refused_final" : approvedEver(f) ? null : panelOf(f)), (r) => r.b.length > 0],
    // A missing row answered as "nothing to show", the opposite of `assertIdentityForPayout`.
    ["a missing row answered null", (f) => (!f ? null : f.status === "REJECTED" && isFinalRefusal(f.rejectReason) ? "refused_final" : approvedEver(f) ? null : panelOf(f)), (r) => r.b.length > 0],
    // A new word the panel cannot draw.
    ["an answer outside the vocabulary", (f) => (f?.status === "REJECTED" && isFinalRefusal(f?.rejectReason) ? "refused_final" : approvedEver(f) ? null : "blocked"), (r) => r.vocab.length > 0],
  ];
  for (const [name, gate, caughtWhere] of variants) {
    const r = check(gate);
    ok(`3 ⭐ CONTROL · the table FAILS "${name}"`, violations(r) > 0 && caughtWhere(r),
      `A ${r.a.length} · B ${r.b.length} · vocab ${r.vocab.length}${r.a[0] ? ` · e.g. ${r.a[0]}` : r.b[0] ? ` · e.g. ${r.b[0]}` : ""}`);
  }
  const real = check(kycGateState as Gate);
  ok("3 CONTROL · …and passes the real function (the variants differ from it, not the checker from itself)", violations(real) === 0, `${violations(real)} violation(s)`);
}

console.log(`\nkyc-gate-state-table: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
