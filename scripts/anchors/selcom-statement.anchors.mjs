/**
 * THE ANCHORS `red:selcom-statement` MUTATES — declared, as DATA, importable without running.
 *
 * ⛔ A SIDECAR: `test:red-anchors` audits that every anchor still resolves exactly once
 * WITHOUT executing a harness that rewrites real source. ⚠️ NO SIDE EFFECTS, data only.
 *
 * ── WHAT THESE MUTATIONS ARE ─────────────────────────────────────────────────────────
 * Jay's #7 is a page built for the Gaming Board, and the acceptance names one defect
 * explicitly: *a ledger figure labelled as a rail figure.* On production the two differ by
 * 29.7× — the rail moved TZS 70,000 out while the internal wallet credited TZS 2,077,191 —
 * so the mislabelled number is not a rounding error, it is an order of magnitude on a
 * regulatory statement.
 *
 * ⭐ THE THREE WORTH READING:
 *
 *   `ledger-labelled-rail` — `provenanceLabel` returns the Selcom caption for a LEDGER
 *     figure. Nothing about the numbers changes; every total is still correct; the page
 *     simply tells a regulator that Selcom reported them. It is the literal defect the
 *     acceptance asks for a guard against, and it is invisible to any check on totals.
 *
 *   `collections-derived-from-ledger` — the C2B balance stops being absent and becomes our
 *     own deposit total wearing a Selcom heading. It is the most TEMPTING wrong fix on the
 *     whole unit, because the page then looks complete: two balances, both populated,
 *     neither blank. A-5 exists for exactly this.
 *
 *   `control-internal-credits-zeroed` — ⭐ THE POSITIVE CONTROL. The conflation figure is
 *     zeroed at source, so every *"BET_PAYOUT is not in the rail figure"* assertion passes
 *     HARDER while the number the card exists to distinguish has vanished from the page.
 *
 * ⚠️ SINGLE-LINE ANCHORS where possible (CRLF tree); no replacement may CONTAIN its own anchor.
 */

/** @typedef {{ name: string, file: string, suite: string, from: string, to: string, why: string, expect: string }} RedMutation */

const LIB = "src/lib/server/selcom-statement.ts";
const CARD = "src/app/admin/payments/selcom-statement-card.tsx";
const PAGE = "src/app/admin/payments/page.tsx";

/** @type {RedMutation[]} */
export const MUTATIONS = [
  {
    name: "ledger-labelled-rail",
    why: "⭐ THE DEFECT THE ACCEPTANCE NAMES. A ledger total keeps its correct value and is captioned as something Selcom reported. No total changes, so nothing that checks arithmetic can see it",
    file: LIB,
    suite: "selcom-statement",
    from: `        short: "from our ledger",\n        sw: "kutoka daftari letu",`,
    to: `        short: "from Selcom",\n        sw: "kutoka Selcom",`,
    expect: "3: …the ledger label names US, and never Selcom",
  },
  {
    name: "payout-counted-as-rail",
    why: "the conflation itself — `BET_PAYOUT` joins the rail types, so an internal wallet credit is reported as money that left to Selcom. On production this overstates the rail by 29.7x on a page the regulator reads",
    file: LIB,
    suite: "selcom-statement",
    from: `export const RAIL_TYPES = ["DEPOSIT", "WITHDRAWAL"] as const;`,
    to: `export const RAIL_TYPES = ["DEPOSIT", "WITHDRAWAL", "BET_PAYOUT"] as const;`,
    expect: "2: ⛔ RAIL_TYPES names exactly DEPOSIT and WITHDRAWAL",
  },
  {
    name: "collections-derived-from-ledger",
    why: "⭐ THE TEMPTING WRONG FIX. Selcom publishes no C2B balance, so the page invents one from our own deposits and captions it Selcom. The card then looks COMPLETE — two balances, neither blank — which is precisely why A-5 exists",
    file: LIB,
    suite: "selcom-statement",
    from: `      collectionsBalance: {\n        available: false,`,
    to: `      collectionsBalance: {\n        available: false,\n        balance: moneyIn.amount,`,
    expect: "4: ⛔ …and it carries NO number that could be read as a balance",
  },
  {
    name: "withdrawal-summed-signed",
    why: "`Math.abs` is dropped from the tally. Withdrawals are stored NEGATIVE, so money-out prints as a negative number and the net ADDS what it should subtract — the statement reports more money on the platform than there is",
    file: LIB,
    suite: "selcom-statement",
    from: `    slot.amount += Math.abs(t.amount);`,
    to: `    slot.amount += t.amount;`,
    expect: "1: money out is a POSITIVE magnitude, not the stored negative",
  },
  {
    name: "net-adds-instead-of-subtracting",
    why: "the net becomes in + out. With magnitudes on both sides that reads as TZS 716,000 having crossed the rail in one direction, on a statement whose whole job is to say which way the money went",
    file: LIB,
    suite: "selcom-statement",
    from: `      net: { amount: moneyIn.amount - moneyOut.amount,`,
    to: `      net: { amount: moneyIn.amount + moneyOut.amount,`,
    expect: "1: net SUBTRACTS out from in",
  },
  {
    name: "failed-rows-counted",
    why: "the CONFIRMED filter goes, so refused deposits and the 14 FAILED withdrawals on production are reported as money that moved. A statement that counts what did NOT happen is worse than one that is missing",
    file: LIB,
    suite: "selcom-statement",
    from: `    if (t.status !== "CONFIRMED") continue;`,
    to: `    if (t.status === "CANCELLED") continue;`,
    expect: "1: …and its count excludes the FAILED deposit",
  },
  {
    name: "float-zero-instead-of-unavailable",
    why: "an unreadable float becomes TZS 0 rather than 'unavailable'. A fabricated zero on the disbursement float reads as an emptied account and would trigger the low-float alarm on a platform whose float is fine — the exact opposite of the honest-absence rule this page is built on",
    file: LIB,
    suite: "selcom-statement",
    from: `    ? { available: false, reason: "Selcom is not the active provider, or the float PIN is not set." }`,
    to: `    ? { available: true, balance: 0, source: "rail" }`,
    expect: "3: an unreadable float is UNAVAILABLE, never zero",
  },
  {
    name: "card-hand-writes-the-provenance",
    why: "the card stops asking the figure where it came from and types the caption instead. This is how the type-level guarantee is defeated in practice: the mechanism survives, and a human writes the wrong words beside it",
    file: CARD,
    suite: "selcom-statement",
    from: `        {figure.count.toLocaleString()} confirmed · {prov.short} · {prov.sw}`,
    to: `        {figure.count.toLocaleString()} confirmed · from Selcom · kutoka Selcom`,
    expect: "6: ⛔ …and hand-writes none of them",
  },
  {
    name: "page-walks-the-whole-ledger",
    why: "the DB-side aggregate is replaced by a full table load. It is CORRECT and it is what `report-money.ts` measured at 3,176 ms and 333 MB of heap, on a page an operator opens while payouts are failing",
    file: PAGE,
    suite: "selcom-statement",
    from: `  const railTotalsRaw = await db.txn.totalsByType([...TALLY_TYPES]).catch(() => null);`,
    to: `  const railTotalsRaw = await db.txn.listAll().catch(() => null);`,
    expect: "6: …and reads its tallies from the DB aggregate, never a ledger walk",
  },
  {
    name: "control-internal-credits-zeroed",
    why: "⭐ THE POSITIVE CONTROL. The conflation figure is zeroed at source, so every 'BET_PAYOUT is not in the rail figure' assertion passes HARDER — while the number the card exists to hold apart from the rail has silently left the page. A suite without §2's control would report this perfect",
    file: LIB,
    suite: "selcom-statement",
    from: `    slot.amount += Math.abs(t.amount);\n    slot.count += 1;`,
    to: `    if (t.type === "BET_PAYOUT") continue;\n    slot.amount += Math.abs(t.amount);\n    slot.count += 1;`,
    expect: "2: ⭐ POSITIVE CONTROL — the fixture actually holds in-wallet credits to be confused",
  },
];
