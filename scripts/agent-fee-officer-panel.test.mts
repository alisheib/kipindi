/**
 * UNIT 4 · THE OFFICER'S PANEL AFTER RECONCILIATION STOPS BEING MANUAL.
 *
 * 🔴 WHAT THIS CLOSES. `/admin/agents/[id]` renders a gold fee panel whose evidence grid was
 * built for ONE rail: an applicant wires money to a bank account, types a reference, and an
 * officer attests the receipt against a statement line. Every slot in it — `Receipt ref`,
 * `Attested`, `Statement line` — is an artefact of that rail.
 *
 * Since 2026-09-10 the live rail is a WALLET DEBIT. `payFeeFromWallet` deliberately writes
 * none of those three ("⛔ No `feeReference`, no `feeAttestedTzs`, no `feeReconciledById` —
 * nobody attested anything, and inventing an officer here would be a false audit record"), so
 * the panel rendered THREE EM-DASHES at an officer looking at a fee that was paid in full.
 *
 * ⚠️ AND AN EM-DASH IS NOT A NEUTRAL CHARACTER IN THIS PANEL. Every other `—` in the grid
 * means "this step has not happened yet" — it is the shape of an unreconciled application, the
 * thing the officer's whole job is to chase. Printing it for a wallet-funded fee tells the
 * officer that evidence is MISSING when in fact none is owed. The money moved, atomically,
 * under a row lock, with the payer's identity carried by the debit itself.
 *
 * ⭐ THE BRIEF SAID TWO EM-DASHES. THERE ARE THREE, PLUS A FOURTH SLOT THAT LIES.
 * `Reconciled` renders a real timestamp for a wallet payment, because `payFeeFromWallet` sets
 * `feeReconciledAt` — so the officer reads "Reconciled 11 Sep 09:41" against a fee no officer
 * ever reconciled. A hand-counted list standing for "all of them", again.
 *
 * ⛔ AND `feeReconciledAt` MUST KEEP BEING SET. It is not a display field: `reconcileFee`
 * refuses with "The fee is already reconciled." when it is present, which is what stops an
 * officer collecting a second time from an applicant who already paid from their wallet.
 * Clearing it to tidy the panel would open a double-charge hole. The fix is the LABEL, never
 * the field.
 *
 * ── WHY THE LOGIC LIVES IN `fee-evidence.ts` AND NOT IN THE PAGE ──────────────────────────
 * A guard that greps a `.tsx` for `<dt>Receipt ref</dt>` asserts a PROXY — the source text —
 * for the property, which is what an officer SEES. The proxy drifts on any rename, reformat or
 * extraction, and goes silently vacuous. So the decision is a pure function the page calls,
 * and this suite drives the function and reads its OUTPUT. Same doctrine as
 * `test:agent-fee-copy`: *"⛔ THE FUNCTION THE PAGE ITSELF CALLS — not a copy of its logic."*
 *
 * ⚠️ A function a page does not call is decoration, so §6 asserts the CALL SITE too — the
 * lesson `test:agent-fee-wallet` learned the hard way when flipping `reconcileFee`'s source to
 * "WALLET" left it 34/0 because §1 drove the builder directly and never checked its callers.
 *
 * ⭐ And §7 constructs the defects and proves each detector catches them, rather than asserting
 * that today's code does what today's code does.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { decomment } from "./lib/decomment.mts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? `\n       ${extra}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 62 - s.length))}`);

/** The placeholder the grid uses for "this has not happened yet". */
const DASH = "—";

/** The three slots that only ever mean anything on the LEGACY out-of-band rail. */
const BANK_SLOT_LABELS = ["Receipt ref", "Attested", "Statement line"];

type Row = { label: string; value: string };
type Evidence = { rows: Row[]; note: string | null };

// ═══ §0 · THE MODULE EXISTS ══════════════════════════════════════════════════════════════
/**
 * ⛔ A FAIL LINE, NEVER A LOAD CRASH. A suite that dies on a missing import prints no FAIL and
 * still scores as "red" in a roll-up — this repo has been burned by a red with no failure text
 * being counted as a caught defect. So the import is dynamic and its absence is an ASSERTION.
 */
section("§0 · the module the page delegates to");
const MODPATH = "../src/app/admin/agents/[id]/fee-evidence.ts";
let mod: Record<string, unknown> = {};
try {
  mod = (await import(MODPATH)) as Record<string, unknown>;
} catch (e) {
  ok("0.0 ⛔ fee-evidence.ts loads", false, `import threw: ${(e as Error).message.split("\n")[0]}`);
}
const feeEvidence = mod.feeEvidence as ((app: unknown) => Evidence) | undefined;
const feeRefundDestination = mod.feeRefundDestination as ((app: unknown) => string) | undefined;

ok("0.1 ⛔ `feeEvidence` is exported", typeof feeEvidence === "function",
  `got ${typeof feeEvidence}`);
ok("0.2 ⛔ `feeRefundDestination` is exported", typeof feeRefundDestination === "function",
  `got ${typeof feeRefundDestination}`);

if (typeof feeEvidence !== "function" || typeof feeRefundDestination !== "function") {
  console.log(`\nFAILURES — ${pass} passed, ${fail} failed  (the module is absent; every later section would be vacuous)`);
  process.exit(1);
}

/** A wallet-funded application exactly as `payFeeFromWallet` stamps one. */
const WALLET = {
  feeFundingSource: "WALLET" as const,
  feeDisposition: "COLLECTED" as const,
  feeReference: null,
  feeAttestedTzs: null,
  feeStatementRef: null,
  feeReconciledAt: "2026-09-11T09:41:02.000Z",
  feeSourceAccount: null,
};

/** A bank-funded application exactly as `reconcileFee` stamps one. */
const EXTERNAL = {
  feeFundingSource: "EXTERNAL" as const,
  feeDisposition: "COLLECTED" as const,
  feeReference: "AGT-88213",
  feeAttestedTzs: 100_000,
  feeStatementRef: "STMT-4471",
  feeReconciledAt: "2026-09-07T13:05:49.000Z",
  feeSourceAccount: "****4412",
};

/**
 * ⭐ THE HISTORICAL ROW. Production holds exactly one APPROVED agent whose fee was collected
 * out of band, and it was NEVER BACKFILLED — `feeFundingSource` is `null` there by design,
 * because the 2026-09-09 VAT ruling is not retroactive and that row must not be reclassified.
 * `null` therefore has to read as EXTERNAL, not as "unknown" and not as WALLET.
 */
const LEGACY_NULL = { ...EXTERNAL, feeFundingSource: null };

// ═══ §1 · A WALLET-FUNDED FEE SHOWS NO EMPTY SLOTS ═══════════════════════════════════════
section("§1 · a wallet-funded fee needs no attestation, and the panel says so");
{
  const ev = feeEvidence(WALLET);

  // ⛔ THE CONTROL FIRST. An empty row list would satisfy 1.2 and 1.3 trivially — "no slot
  // holds an em-dash" is free if there are no slots. Assert there is something to look at
  // BEFORE asserting what it does not contain.
  ok("1.1 CONTROL · the wallet shape renders rows at all (an empty grid passes 1.2 for free)",
    ev.rows.length >= 2, `rows=${ev.rows.length}`);

  ok("1.2 ⛔ NO slot renders the em-dash placeholder",
    ev.rows.every((r) => !r.value.includes(DASH)),
    ev.rows.filter((r) => r.value.includes(DASH)).map((r) => `${r.label}=${r.value}`).join(" | "));

  ok("1.3 ⛔ none of the three bank-rail slots is rendered at all",
    ev.rows.every((r) => !BANK_SLOT_LABELS.includes(r.label)),
    ev.rows.map((r) => r.label).join(" | "));

  ok("1.4 ⭐ the panel STATES that no attestation is owed",
    typeof ev.note === "string" && ev.note.trim().length > 0, JSON.stringify(ev.note));

  // 🔴 THE SLOT THAT LIED. `feeReconciledAt` is set by the wallet path, so the old grid printed
  // "Reconciled <date>" for a fee no officer reconciled. The timestamp is real and must still
  // be shown — it is WHEN THE MONEY MOVED — but never under a word that names an officer act.
  ok("1.5 ⛔ no slot calls a wallet payment `Reconciled` — nobody reconciled anything",
    ev.rows.every((r) => !/reconcil/i.test(r.label)),
    ev.rows.map((r) => r.label).join(" | "));

  ok("1.6 ⭐ …and the moment the money moved is STILL shown, under a truthful label",
    ev.rows.some((r) => r.value.includes("2026") || /wallet/i.test(r.value)),
    ev.rows.map((r) => `${r.label}=${r.value}`).join(" | "));

  ok("1.7 ⭐ the panel names the WALLET as the source, so the officer knows where it came from",
    ev.rows.some((r) => /wallet/i.test(r.label) || /wallet/i.test(r.value)),
    ev.rows.map((r) => `${r.label}=${r.value}`).join(" | "));
}

// ═══ §2 · THE LEGACY RAIL IS UNTOUCHED ═══════════════════════════════════════════════════
/**
 * ⛔ THIS IS THE HALF THAT PROTECTS REAL MONEY ALREADY COLLECTED. Unit 7 is a NON-REGRESSION
 * obligation, not a backfill: one historical APPROVED agent paid 118,000 by bank at 18% VAT,
 * and the officer's record of that payment must keep rendering exactly as it always has.
 */
section("§2 · the out-of-band rail still renders its evidence, unchanged");
{
  const ev = feeEvidence(EXTERNAL);

  ok("2.1 ⛔ all three bank-rail slots are present",
    BANK_SLOT_LABELS.every((l) => ev.rows.some((r) => r.label === l)),
    `missing: ${BANK_SLOT_LABELS.filter((l) => !ev.rows.some((r) => r.label === l)).join(", ")}`);

  ok("2.2 ⛔ …and they carry the ATTESTED data, not a placeholder",
    ev.rows.some((r) => r.value.includes("AGT-88213")) && ev.rows.some((r) => r.value.includes("STMT-4471")),
    ev.rows.map((r) => `${r.label}=${r.value}`).join(" | "));

  ok("2.3 ⛔ the officer's reconciliation is still named as such on this rail",
    ev.rows.some((r) => /reconcil/i.test(r.label)),
    ev.rows.map((r) => r.label).join(" | "));

  ok("2.4 ⛔ no `no attestation needed` note on a rail where an officer DID attest",
    ev.note === null, JSON.stringify(ev.note));

  // A bank-funded application mid-flight has genuinely missing evidence, and the em-dash is
  // the CORRECT rendering there. Removing it everywhere would be the opposite defect.
  const pending = feeEvidence({ ...EXTERNAL, feeReference: null, feeAttestedTzs: null, feeStatementRef: null, feeReconciledAt: null });
  ok("2.5 ⭐ an UNreconciled bank application still shows the em-dash — it really is missing",
    pending.rows.some((r) => r.value.includes(DASH)),
    pending.rows.map((r) => `${r.label}=${r.value}`).join(" | "));
}

// ═══ §3 · A NULL FUNDING SOURCE IS THE LEGACY ROW ════════════════════════════════════════
section("§3 · null funding source reads as the legacy rail, never as wallet");
{
  const nul = feeEvidence(LEGACY_NULL);
  const ext = feeEvidence(EXTERNAL);
  ok("3.1 ⛔ a null `feeFundingSource` renders IDENTICALLY to EXTERNAL",
    JSON.stringify(nul) === JSON.stringify(ext),
    `null=${JSON.stringify(nul).slice(0, 160)}\n       ext=${JSON.stringify(ext).slice(0, 160)}`);
  ok("3.2 ⛔ …and is never given the wallet note",
    nul.note === null, JSON.stringify(nul.note));
}

// ═══ §4 · THE REFUND DESTINATION ═════════════════════════════════════════════════════════
/**
 * 🔴 THE ROW THAT WOULD MISDIRECT A REFUND. The panel's `To` slot read `feeSourceAccount`,
 * which a wallet payment never writes — so the officer processing a refund on a wallet-funded
 * application saw an em-dash where the destination should be, on the one screen whose job is
 * to say where a person's money is going.
 */
section("§4 · the refund destination names where the money actually goes");
{
  ok("4.1 ⭐ a wallet-funded refund NAMES the wallet",
    /wallet/i.test(feeRefundDestination(WALLET)), feeRefundDestination(WALLET));
  ok("4.2 ⛔ …and never renders the placeholder",
    !feeRefundDestination(WALLET).includes(DASH), feeRefundDestination(WALLET));
  ok("4.3 ⛔ a bank-funded refund still names the stamped account",
    feeRefundDestination(EXTERNAL) === "****4412", feeRefundDestination(EXTERNAL));
  ok("4.4 ⛔ a legacy null row is treated as bank-funded here too",
    feeRefundDestination(LEGACY_NULL) === "****4412", feeRefundDestination(LEGACY_NULL));
  ok("4.5 ⭐ a bank row with no captured account still degrades to the placeholder",
    feeRefundDestination({ ...EXTERNAL, feeSourceAccount: null }).includes(DASH),
    feeRefundDestination({ ...EXTERNAL, feeSourceAccount: null }));
}

// ═══ §4b · WHY THE OFFICER CANNOT RECONCILE — true of every disposition ══════════════════
/**
 * 🔴 UNIT 4.1 IS "AND THE UI SAYS SO", AND THE UI SAID NOTHING.
 *
 * `decision-rail.tsx` rendered this sentence behind `&& state.fee.disposition === "NONE"`, so on
 * a COLLECTED fee the string was computed and thrown away. An officer looking at a wallet-funded
 * application saw a fee panel with no reconcile control and no explanation of why.
 *
 * ⚠️ AND THE SENTENCE ITSELF WAS WRONG TWICE OVER: `COLLECTED ? "Reconciled."` names an officer
 * act that never happened on the wallet rail, and the fallback —
 * "The applicant has not recorded a receipt reference." — is the WITHDRAWN bank rail's
 * instruction, shown to an officer looking at somebody who has simply not paid yet.
 *
 * ⛔ REFUND_DUE and REFUNDED are asserted here deliberately: both exist only BECAUSE the fee was
 * collected, so an "has not paid" sentence would be flatly false on them — and the rail renders
 * this string right beside the refund control.
 */
section("§4b · the reason the reconcile control is unavailable is true on every disposition");
{
  const whyNoReconcile = mod.whyNoReconcile as ((app: unknown) => string | null) | undefined;
  if (typeof whyNoReconcile !== "function") {
    ok("4b.0 ⛔ `whyNoReconcile` is exported", false, `got ${typeof whyNoReconcile}`);
  } else {
    const why = (d: string, src: "WALLET" | "EXTERNAL" | null) =>
      whyNoReconcile({ feeDisposition: d, feeFundingSource: src }) ?? "";

    ok("4b.1 ⭐ a WALLET-collected fee says nothing is to be reconciled",
      /wallet/i.test(why("COLLECTED", "WALLET")) && !/^Reconciled\.$/.test(why("COLLECTED", "WALLET")),
      why("COLLECTED", "WALLET"));
    ok("4b.2 ⛔ …and never claims an officer RECONCILED it",
      !/reconciled/i.test(why("COLLECTED", "WALLET").replace(/nothing to reconcile/i, "")),
      why("COLLECTED", "WALLET"));
    ok("4b.3 ⛔ a bank-collected fee still says `Reconciled.` — that rail really was attested",
      why("COLLECTED", "EXTERNAL") === "Reconciled.", why("COLLECTED", "EXTERNAL"));
    ok("4b.4 ⛔ a legacy null row is treated as the bank rail here too",
      why("COLLECTED", null) === "Reconciled.", why("COLLECTED", null));
    ok("4b.5 ⛔ an UNPAID fee is not described with the withdrawn rail's receipt instruction",
      !/receipt|reference/i.test(why("NONE", "WALLET")), why("NONE", "WALLET"));
    ok("4b.6 ⭐ …it says the fee is unpaid, which is what is actually true",
      /not paid|unpaid/i.test(why("NONE", "WALLET")), why("NONE", "WALLET"));
    ok("4b.7 ⛔ a REFUND_DUE fee is NEVER described as unpaid — it was paid, that is why a refund exists",
      !/not paid|unpaid/i.test(why("REFUND_DUE", "WALLET")) && why("REFUND_DUE", "WALLET").length > 0,
      why("REFUND_DUE", "WALLET"));
    ok("4b.8 ⛔ …nor is a REFUNDED one",
      !/not paid|unpaid/i.test(why("REFUNDED", "WALLET")) && why("REFUNDED", "WALLET").length > 0,
      why("REFUNDED", "WALLET"));
    ok("4b.9 ⛔ WAIVED still reads `Waived.`", why("WAIVED", null) === "Waived.", why("WAIVED", null));

    // ⭐ EVERY disposition must produce a sentence, or the rail renders a blank where an
    // explanation belongs — which is the defect this section exists to close.
    const ALL = ["NONE", "COLLECTED", "WAIVED", "REFUND_DUE", "REFUNDED"];
    const silent = ALL.filter((d) => why(d, "WALLET").trim().length === 0);
    ok("4b.10 ⭐ no disposition leaves the officer with NO explanation at all",
      silent.length === 0, `silent on: ${silent.join(", ")}`);
  }
}

// ═══ §4c · THE RAIL ACTUALLY RENDERS IT ══════════════════════════════════════════════════
/**
 * ⚠️ §4b proves the SENTENCE is right. It cannot see that the rail throws it away — which is
 * precisely what happened. So assert the render condition too: the `disposition === "NONE"`
 * qualifier must be gone, or every assertion above is true of a string nobody reads.
 */
section("§4c · the decision rail does not hide it behind a disposition");
{
  const rail = decomment(read("src/app/admin/agents/[id]/decision-rail.tsx"));
  ok("4c.0 CONTROL · the rail was read and it really does render the sentence",
    /state\.fee\.whyNoReconcile/.test(rail), "whyNoReconcile is not rendered by the rail at all");
  ok("4c.1 🔴 …and NOT only while the fee is unpaid",
    !/whyNoReconcile\s*&&\s*state\.fee\.disposition\s*===\s*"NONE"/.test(rail),
    "the sentence is still gated on disposition === NONE, so a COLLECTED fee explains nothing");
}

// ═══ §5 · THE PAGE ACTUALLY CALLS IT ═════════════════════════════════════════════════════
/**
 * ⚠️ A PURE FUNCTION NOTHING RENDERS IS DECORATION. §1–§4 would stay green forever while the
 * page went on printing its own hand-rolled grid. So assert the CALL SITE, and assert that the
 * bank-rail labels exist in exactly ONE place — the module — and not back in the page.
 */
section("§5 · the workstation delegates to it, and keeps no second copy");
{
  const page = decomment(read("src/app/admin/agents/[id]/page.tsx"));

  ok("5.1 ⛔ the page imports the module",
    /from\s+"\.\/fee-evidence"/.test(page), "no import of ./fee-evidence");
  ok("5.2 ⛔ …and calls `feeEvidence`", /feeEvidence\s*\(/.test(page));
  ok("5.3 ⛔ …and calls `feeRefundDestination`", /feeRefundDestination\s*\(/.test(page));

  // ⭐ THE ANTI-DRIFT ASSERTION. If anyone re-adds a literal bank slot to the page, the two
  // renderings can disagree and only one of them is guarded. One home, or none.
  /**
   * ⚠️ IT MATCHES A RENDERED POSITION, NOT A WORD — because the word alone is a PROXY that
   * catches the wrong thing. The first version of this line was `page.includes("Attested")` and
   * it fired on `attestedTzs: app.feeAttestedTzs`, a prop handed to the decision rail:
   * `feeAttestedTzs` contains "Attested". ⛔ A guard that matches identifier NAMES accuses
   * correct code, and an accusation that has to be waved away is how the next real one gets
   * waved away too. So the rule is `>LABEL<` — JSX text between tags, the only position where
   * an officer can READ a label. The rail may go on carrying the DATA under any name it likes.
   */
  const asRenderedText = (l: string) => new RegExp(`>\\s*${l}\\s*<`).test(page);
  const strays = BANK_SLOT_LABELS.filter(asRenderedText);
  ok("5.4 ⭐ no bank-rail slot label is RENDERED by the page any more — the module is its one home",
    strays.length === 0, `still rendered in the page: ${strays.join(" | ")}`);
  ok("5.4c CONTROL · the `>label<` detector really does match a label this page DOES render",
    asRenderedText("Refund due by"),
    "the detector matched no known rendered label — it is blind, and 5.4 is vacuous");

  ok("5.5 CONTROL · the page really was read and decommented (a short read passes 5.4 for free)",
    page.length > 4000, `len=${page.length}`);
}

// ═══ §6 · POSITIVE CONTROLS — every detector must be able to say NO ══════════════════════
/**
 * ⭐ CONSTRUCT THE DEFECT AND PROVE THE DETECTOR CATCHES IT. Each check above is only worth
 * what its detector is worth, and a detector that cannot fail turns a whole section vacuous.
 */
section("§6 · the detectors can fail");
{
  const broken: Row[] = [{ label: "Receipt ref", value: DASH }];
  ok("6.1 the em-dash detector catches a slot holding one",
    !broken.every((r) => !r.value.includes(DASH)));
  ok("6.2 the bank-slot detector catches a bank label",
    !broken.every((r) => !BANK_SLOT_LABELS.includes(r.label)));
  ok("6.3 the `reconciled` detector catches that word in a label",
    !([{ label: "Reconciled", value: "x" }] as Row[]).every((r) => !/reconcil/i.test(r.label)));
  ok("6.4 …and clean wallet rows are NOT caught",
    ([{ label: "Paid from", value: "Wallet" }] as Row[])
      .every((r) => !r.value.includes(DASH) && !BANK_SLOT_LABELS.includes(r.label) && !/reconcil/i.test(r.label)));
}

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
