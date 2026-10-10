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
 *
 * ⭐ §4 (2026-10-10, review R5.6) — THE SAME ROWS, THE AGENT PROGRAMME'S QUESTION. The agent application draws this
 * panel from `agentIdentityPanel` (`app/agent/apply/identity-panel.ts`), which asks for an officer's photo approval,
 * not "approved ever". An identity APPROVED from typed details with no photos yet was answered `not_started`, so a
 * verified player read "Verify your identity"; it is `photo_upgrade` now, on exactly those rows — held against an
 * oracle written here, with the shipped mapping and two other wrong ones as controls.
 */
import { readFileSync } from "node:fs";
import { kycGateState, type KycGateFacts } from "../src/lib/kyc-gate-state.ts";
import { approvedEver } from "../src/lib/kyc-approval.ts";
import { isFinalRefusal, FINAL_REFUSAL_CODES } from "../src/lib/kyc-refusal.ts";
import { agentIdentityPanel } from "../src/app/agent/apply/identity-panel.ts";
import { decomment } from "./lib/decomment.mts";

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

// ═══ §4 · THE AGENT APPLICATION'S PANEL — the agent programme's own question over the same rows (review R5.6) ════════
section("§4 · agentIdentityPanel — an officer's photo approval, asked over the same rows");
{
  /**
   * ⭐ The agent application asks for an officer's approval of the document photos and a selfie (`photoIdentityVerified`,
   * which the page asks and passes in), never "approved ever". 🔴 The defect held here (review R5.6, 2026-10-10): an
   * identity APPROVED from typed details with no photos yet fell in with IN_PROGRESS and answered `not_started`, so a
   * VERIFIED player read "Verify your identity". It answers `photo_upgrade` — and only an APPROVED row may, because that
   * state's words say the identity IS verified.
   * ⚠️ The mapper reads the row's `documents` ARRAY (every StoredKyc carries one), so the array-shaped rows are asked.
   */
  type AgentPanel = (f: KycGateFacts, photoVerified: boolean) => string | null;
  const AGENT_VOCAB = new Set([...VOCAB, "photo_upgrade"]);
  const agentRows = rows.filter((r) => !r.facts || Array.isArray(r.facts.documents));
  /** The oracle, written out here — never the mapper under test. */
  const agentOracle: AgentPanel = (f, photoVerified) => {
    if (photoVerified) return null;
    if (f?.status === "REJECTED" && finalOracle(f?.rejectReason)) return "refused_final";
    const docs = f?.documents?.length ?? 0;
    if (f?.status === "PENDING_REVIEW") return "pending_review";
    if (f?.status === "ADDITIONAL_INFO_REQUIRED") return "more_info";
    if (f?.status === "REJECTED") return "rejected";
    if (f?.status === "APPROVED") return docs > 0 ? "uploaded" : "photo_upgrade";
    if (f?.status === "IN_PROGRESS") return docs > 0 ? "uploaded" : "not_started";
    return "not_started";
  };
  type AgentReport = { wrong: string[]; vocab: string[]; shownToVerified: string[]; hiddenFromUnverified: string[]; upgrade: number; upgradeElsewhere: string[] };
  /** ONE checker, run on the real mapper and on every wrong variant below. */
  const checkAgent = (panel: AgentPanel): AgentReport => {
    const out: AgentReport = { wrong: [], vocab: [], shownToVerified: [], hiddenFromUnverified: [], upgrade: 0, upgradeElsewhere: [] };
    for (const r of agentRows) for (const photoVerified of [false, true]) {
      let got: string | null;
      try { got = panel(r.facts, photoVerified); } catch (err) { got = `THREW ${(err as Error).message}`; }
      const label = `${r.label} · photo-approved ${photoVerified}`;
      if (got !== null && !AGENT_VOCAB.has(got)) out.vocab.push(`${label} → ${got}`);
      if (photoVerified && got !== null) out.shownToVerified.push(`${label} → ${got}`);
      if (!photoVerified && got === null) out.hiddenFromUnverified.push(label);
      if (got === "photo_upgrade") {
        if (r.facts?.status === "APPROVED") out.upgrade++;
        else out.upgradeElsewhere.push(label);
      }
      const want = agentOracle(r.facts, photoVerified);
      if (got !== want) out.wrong.push(`${label} → ${JSON.stringify(got)} (oracle ${JSON.stringify(want)})`);
    }
    return out;
  };
  const real = checkAgent(agentIdentityPanel as AgentPanel);
  // 2 missing rows + 7 statuses × 2 stamps × 8 reasons × 2 document counts, array-shaped — each asked twice.
  ok("4.0 the rows asked are the 224 array-shaped rows and the 2 missing rows, each with and without the photo approval",
    agentRows.length === 226, `${agentRows.length} rows`);
  ok("4.1 ⛔ an officer's photo approval → no panel, on every row", real.shownToVerified.length === 0, real.shownToVerified.slice(0, 3).join(" | "));
  ok("4.2 ⛔ without it → always a panel: a typed approval never waves an agent applicant through", real.hiddenFromUnverified.length === 0,
    real.hiddenFromUnverified.slice(0, 3).join(" | "));
  // 1 status × 2 stamps × 8 reasons × no documents.
  ok("4.3 🔴 R5.6 · APPROVED from typed details with no photos → photo_upgrade, on all 16 such rows (never \"Verify your identity\")",
    real.upgrade === 16, `${real.upgrade} row(s)`);
  ok("4.4 ⛔ …and on no other row: photo_upgrade says the identity IS verified, so only an APPROVED row may draw it",
    real.upgradeElsewhere.length === 0, real.upgradeElsewhere.slice(0, 3).join(" | "));
  ok("4.5 every answer is in the panel's vocabulary (the six identity states and photo_upgrade)", real.vocab.length === 0, real.vocab.slice(0, 3).join(" | "));
  ok("4.6 ⛔ every row, both ways, equals the oracle written here", real.wrong.length === 0, real.wrong.slice(0, 3).join(" | "));

  // ⭐ CONTROLS — each wrong mapping differs from the real one in ONE decision, and the SAME checker must fail it.
  const shipped: AgentPanel = (f, photoVerified) => {
    // The mapping as it stood before R5.6: APPROVED fell in with IN_PROGRESS.
    if (photoVerified) return null;
    if (f?.status === "REJECTED" && isFinalRefusal(f?.rejectReason)) return "refused_final";
    const docs = f?.documents?.length ?? 0;
    switch (f?.status) {
      case "PENDING_REVIEW": return "pending_review";
      case "ADDITIONAL_INFO_REQUIRED": return "more_info";
      case "REJECTED": return "rejected";
      case "APPROVED":
      case "IN_PROGRESS": return docs > 0 ? "uploaded" : "not_started";
      default: return "not_started";
    }
  };
  const variants: [string, AgentPanel, (r: AgentReport) => boolean][] = [
    ["the shipped mapping (an APPROVED identity with no photos told to verify)", shipped, (r) => r.upgrade === 0 && r.wrong.length === 16],
    ["photo_upgrade for every row with no photos (an unverified player told they are verified)",
      (f, photoVerified) => (!photoVerified && (f?.documents?.length ?? 0) === 0 && f?.status !== "REJECTED" ? "photo_upgrade" : agentIdentityPanel(f, photoVerified)),
      (r) => r.upgradeElsewhere.length > 0],
    ["the photo approval ignored (an approved agent applicant still shown a panel)", (f) => agentIdentityPanel(f, false), (r) => r.shownToVerified.length > 0],
  ];
  for (const [name, panel, caughtWhere] of variants) {
    const r = checkAgent(panel);
    ok(`4.c ⭐ CONTROL · the checker FAILS "${name}"`, caughtWhere(r),
      `wrong ${r.wrong.length} · photo_upgrade elsewhere ${r.upgradeElsewhere.length} · shown to the photo-approved ${r.shownToVerified.length}`);
  }

  // ⭐ AND THE TWO ENDS OF IT, IN THE SOURCE: the page hands the mapper the gate's own predicate (no second, local mapping),
  // and the panel can draw the state — a brand step with one verify door, in its own three words.
  const page = decomment(readFileSync(new URL("../src/app/agent/apply/page.tsx", import.meta.url), "utf8"));
  ok("4.7 /agent/apply asks `photoIdentityVerified` and hands it to this mapper — and keeps no local copy of the mapping",
    page.includes("agentIdentityPanel(kyc, photoIdentityVerified(kyc))") && !page.includes("function agentIdentityPanel"));
  const panel = decomment(readFileSync(new URL("../src/components/kyc/kyc-gate-panel.tsx", import.meta.url), "utf8"));
  ok("4.8 the panel draws photo_upgrade: brand, the camera, one verify door, and its own title, body and CTA",
    /photo_upgrade:\s*\{\s*tone:\s*"neutral",\s*glyph:\s*"camera",\s*cta:\s*"verify"\s*\}/.test(panel)
      && ["titlePhotoUpgrade", "bodyPhotoUpgrade", "ctaPhotoUpgrade"].every((k) => panel.includes(`t.kycGate.${k}`)));
}

console.log(`\nkyc-gate-state-table: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
