/**
 * test:maswali-config — MILLIONEA'S RULES ARE ADMIN-EDITABLE, VALIDATED, AND FROZEN PER WEEK; THE LICENCE BASIS GATES THE
 * OPEN; THE FEE MODEL IS READ, NEVER GUESSED (MASWALI-BUILD S1).
 *
 *   npx tsx scripts/maswali-config.test.mts     (npm run test:maswali-config)
 *
 *   §1 the ruled defaults validate, and are the numbers RULES §1 / §2.12 state
 *   §2 every field refuses what it must (and the refusal names the field in words)
 *   §3 the write is verified and audited; a refused save changes nothing
 *   §4 the week's snapshot: every field but the fee, version 1, a freeze time; refused unless it validates
 *   §5 the licence basis: NONE never opens; a recorded basis does; a bad record is refused
 *   §6 the fee model: `jackpot-payout` is read, frozen with its rate, refused without one, and never a pool fee
 *   §7 ⚠️ POSITIVE CONTROLS — the validators really refuse a planted bad value
 *
 * In-memory: no DATABASE_URL, so `defineConfig` persists to process memory and every read is fresh.
 */
import {
  MASWALI_DEFAULTS, getMaswaliConfig, maswaliConfigProblem, readMaswaliConfigFresh, readMaswaliRulesSnapshot,
  saveMaswaliConfig, snapshotMaswaliRules, type MaswaliConfig,
} from "../src/lib/server/maswali-config.ts";
import {
  LICENCE_BASIS_NONE, getLicenceBasis, licenceBasisAllowsOpen, licenceBasisProblem, readLicenceBasisFresh, recordLicenceBasis,
} from "../src/lib/server/maswali-licence.ts";
import { FEE_MODELS, MAX_JACKPOT_FEE_RATE, describeFeeModel, poolFee, FEE_CAPTION_MAX_CHARS } from "../src/lib/payout.ts";
import { snapshotFromConfig, snapshotOrLegacy, getGlobalConfig } from "../src/lib/server/market-config.ts";
import { readFileSync } from "node:fs";

process.exitCode = 1;
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
};
const throws = (fn: () => unknown): string | null => { try { fn(); return null; } catch (e) { return String((e as Error).message ?? e); } };
const with_ = (over: Partial<MaswaliConfig>): MaswaliConfig => ({ ...MASWALI_DEFAULTS, ...over, questionCaps: { ...MASWALI_DEFAULTS.questionCaps, ...(over.questionCaps ?? {}) } });

// ── §1 · the ruled defaults ─────────────────────────────────────────────────
console.log("\n§1 · the ruled defaults validate, and are the numbers the law states");
{
  ok("1.1 · the defaults validate", maswaliConfigProblem(MASWALI_DEFAULTS) === null, String(maswaliConfigProblem(MASWALI_DEFAULTS)));
  const d = MASWALI_DEFAULTS;
  ok("1.2 · ticket TZS 1,000 · floor TZS 1,000,000 · fee 13% · cap 10 (Ali 2026-10-16)",
    d.ticketPriceTzs === 1_000 && d.floorTzs === 1_000_000 && d.jackpotFeeRate === 0.13 && d.ticketCapPerWeek === 10);
  ok("1.3 · open Monday 00:00 · close Friday 18:00 EAT (R-WEEK)", d.openWeekday === 1 && d.openAt === "00:00" && d.closeWeekday === 5 && d.closeAt === "18:00");
  ok("1.4 · buffer 30 min (OD-15) · void deadline 48 h (OD-09b) · final deadline Monday 23:59 of the results week",
    d.minLockBufferMinutes === 30 && d.voidDeadlineHours === 48 && d.finalDeadlineWeekday === 1 && d.finalDeadlineAt === "23:59");
  ok("1.5 · objection window 24 h, never closing before 12:00 (OD-05)", d.objectionWindowHours === 24 && d.objectionNotBeforeAt === "12:00");
  ok("1.6 · question rules 30–70%, ≤ 4 per competition, reserves from ≥ 3 sources (OD-14)",
    d.questionCaps.probabilityMin === 0.3 && d.questionCaps.probabilityMax === 0.7 && d.questionCaps.maxPerCompetition === 4 && d.questionCaps.minReserveSources === 3);
  ok("1.7 · no paid exit, ever (MB-50) · release alert 4 h (OD-06)", d.paidExitWindowMinutes === 0 && d.releaseAlertHours === 4);
  // The law states the same numbers (RULES §1 rows, §2.12): read the file, not a copy.
  const rules = readFileSync(new URL("../docs/RULES.md", import.meta.url), "utf8");
  ok("1.8 · RULES §1 states the ticket, the fee, the floor and the cap as these defaults",
    /\| \*\*Millionea ticket\*\* \| \*\*TZS 1,000, fixed\*\*/.test(rules) && /\| \*\*Millionea fee\*\* \| \*\*13% of the jackpot/.test(rules)
    && /\| \*\*Millionea floor\*\* \| A winning week's jackpot is \*\*at least TZS 1,000,000\*\*/.test(rules)
    && /\| \*\*Millionea cap\*\* \| \*\*10 tickets per account per week\*\*/.test(rules));
  ok("1.9 · the sync read starts from the defaults", JSON.stringify(getMaswaliConfig()) === JSON.stringify(MASWALI_DEFAULTS));
}

// ── §2 · every field refuses what it must ───────────────────────────────────
console.log("\n§2 · every field refuses what it must");
{
  const bad: Array<[string, Partial<MaswaliConfig>, RegExp]> = [
    ["price below the stake range", { ticketPriceTzs: 499 }, /ticket price/],
    ["price above the stake range", { ticketPriceTzs: 1_000_001 }, /ticket price/],
    ["price not whole", { ticketPriceTzs: 1_000.5 }, /ticket price/],
    ["negative floor", { floorTzs: -1 }, /floor/],
    ["a floor below one ticket", { floorTzs: 999 }, /floor below one ticket/],
    ["fee above the bound", { jackpotFeeRate: MAX_JACKPOT_FEE_RATE + 0.01 }, /fee at payout/],
    ["negative fee", { jackpotFeeRate: -0.01 }, /fee at payout/],
    ["cap 0", { ticketCapPerWeek: 0 }, /ticket cap/],
    ["cap fractional", { ticketCapPerWeek: 2.5 }, /ticket cap/],
    ["weekday 8", { openWeekday: 8 as never }, /open must be/],
    ["clock 24:00", { closeAt: "24:00" }, /close must be/],
    ["clock without a leading zero", { openAt: "0:00" }, /open must be/],
    ["close before open", { openWeekday: 5, openAt: "19:00", closeWeekday: 5, closeAt: "18:00" }, /close must come after the open/],
    ["close equal to open", { openWeekday: 3, openAt: "12:00", closeWeekday: 3, closeAt: "12:00" }, /close must come after the open/],
    ["buffer under 5 minutes", { minLockBufferMinutes: 4 }, /close buffer/],
    ["void deadline 0", { voidDeadlineHours: 0 }, /void deadline/],
    ["objection window 0 (the live 1h-or-0 setting MB-23 rejects)", { objectionWindowHours: 0 }, /objection window/],
    ["objection earliest close 7pm", { objectionNotBeforeAt: "7pm" }, /earliest close/],
    ["probability band reversed", { questionCaps: { probabilityMin: 0.7, probabilityMax: 0.3, maxPerCompetition: 4, minReserveSources: 3 } }, /probability band/],
    ["per-competition 0", { questionCaps: { probabilityMin: 0.3, probabilityMax: 0.7, maxPerCompetition: 0, minReserveSources: 3 } }, /per competition/],
    ["unknown guarantee policy", { guaranteeReservePolicy: "PAY_FROM_HOUSE_CASH" as never }, /guarantee policy/],
    ["a paid exit window", { paidExitWindowMinutes: 5 as never }, /no paid early exit/],
  ];
  for (const [name, over, re] of bad) {
    const why = maswaliConfigProblem(with_(over));
    ok(`2 · refuses ${name}`, why !== null && re.test(why), String(why));
  }
  ok("2.ok · a Friday close at 23:59 after a Monday open is accepted", maswaliConfigProblem(with_({ closeAt: "23:59" })) === null);
  ok("2.ok · a zero floor (no guarantee) is a valid configuration, refused only by the open's own gate", maswaliConfigProblem(with_({ floorTzs: 0 })) === null);
}

// ── §3 · the write ──────────────────────────────────────────────────────────
console.log("\n§3 · the write is verified; a refused save changes nothing");
{
  const refused = await saveMaswaliConfig({ ticketCapPerWeek: 0 }, "usr_officer");
  ok("3.1 · a refused save says why", !refused.ok && /ticket cap/.test(refused.ok ? "" : refused.error), JSON.stringify(refused));
  ok("3.2 · …and changed nothing", getMaswaliConfig().ticketCapPerWeek === 10);
  const saved = await saveMaswaliConfig({ ticketCapPerWeek: 8, closeAt: "17:00" }, "usr_officer");
  ok("3.3 · a valid save is verified and returns the whole config", saved.ok && saved.config.ticketCapPerWeek === 8 && saved.config.closeAt === "17:00", JSON.stringify(saved).slice(0, 200));
  const fresh = await readMaswaliConfigFresh();
  ok("3.4 · the fresh read sees it", fresh.ok && fresh.config.ticketCapPerWeek === 8 && fresh.config.closeAt === "17:00");
  ok("3.5 · the other fields kept their values (a shallow merge, not a reset)", fresh.ok && fresh.config.floorTzs === 1_000_000 && fresh.config.jackpotFeeRate === 0.13);
  const back = await saveMaswaliConfig({ ticketCapPerWeek: 10, closeAt: "18:00" }, "usr_officer");
  ok("3.6 · and back to the ruled values", back.ok && JSON.stringify(getMaswaliConfig()) === JSON.stringify(MASWALI_DEFAULTS));
}

// ── §4 · the week's snapshot ────────────────────────────────────────────────
console.log("\n§4 · the week's frozen rules");
{
  const at = new Date("2026-10-26T00:00:00.000+03:00");
  const snap = snapshotMaswaliRules(MASWALI_DEFAULTS, at);
  ok("4.1 · version 1 with its freeze time", snap.v === 1 && snap.frozenAt === at.toISOString());
  ok("4.2 · ⛔ the fee is NOT in the rules snapshot — it has one home, the week's feeSnapshot", !("jackpotFeeRate" in snap));
  const fields = Object.keys(MASWALI_DEFAULTS).filter((k) => k !== "jackpotFeeRate");
  ok("4.3 · every other field is frozen", fields.every((k) => JSON.stringify((snap as Record<string, unknown>)[k]) === JSON.stringify((MASWALI_DEFAULTS as Record<string, unknown>)[k])), fields.join(","));
  ok("4.4 · the nested caps are a COPY (editing the config cannot reach a frozen week)", snap.questionCaps !== MASWALI_DEFAULTS.questionCaps);
  ok("4.5 · freezing an invalid config throws", throws(() => snapshotMaswaliRules(with_({ ticketCapPerWeek: 0 }), at)) !== null);
  const read = readMaswaliRulesSnapshot(JSON.parse(JSON.stringify(snap)));
  ok("4.6 · a stored snapshot reads back, through a JSON round trip", read.ok && read.rules.ticketCapPerWeek === 10 && read.rules.v === 1);
  ok("4.7 · ⛔ a snapshot of an unknown version is refused, never defaulted", !readMaswaliRulesSnapshot({ ...snap, v: 2 }).ok);
  ok("4.8 · ⛔ a snapshot with no freeze time is refused", !readMaswaliRulesSnapshot({ ...snap, frozenAt: undefined }).ok);
  ok("4.9 · ⛔ a tampered snapshot (a cap of 0) is refused", !readMaswaliRulesSnapshot({ ...snap, ticketCapPerWeek: 0 }).ok);
  ok("4.10 · ⛔ no snapshot at all is refused", !readMaswaliRulesSnapshot(null).ok);
  // S7-F3 · LOW-3 · A RUNNING WEEK IS READ AGAINST ITS OWN VERSION, NEVER TODAY'S VALIDATOR. A week frozen while the ranges
  // were wider (a cap of 150, a price of 1.5M, a 2-minute buffer) must stay readable once today's ranges are narrower:
  // `maswaliConfigProblem` refuses each value below, as a tightened validator would, and the week's rules still read.
  const looser = { ...JSON.parse(JSON.stringify(snap)), ticketCapPerWeek: 150, ticketPriceTzs: 1_500_000, minLockBufferMinutes: 2 };
  const tightened = [with_({ ticketCapPerWeek: 150 }), with_({ ticketPriceTzs: 1_500_000, floorTzs: 2_000_000 }), with_({ minLockBufferMinutes: 2 })].map((c) => maswaliConfigProblem(c));
  const kept = readMaswaliRulesSnapshot(looser);
  ok("4.11 · ⭐ S7-F3 · a week frozen under wider ranges stays readable after today's validator narrowed them (its cap, price and buffer as frozen)",
    tightened.every((why) => why !== null) && kept.ok && kept.rules.ticketCapPerWeek === 150 && kept.rules.ticketPriceTzs === 1_500_000 && kept.rules.minLockBufferMinutes === 2,
    JSON.stringify({ tightened, kept: kept.ok ? "read" : kept.error }));
  // …the control: a snapshot that is not version 1's shape is still unreadable, field by field.
  const malformed: Array<[string, Record<string, unknown>]> = [
    ["a cap written as text", { ticketCapPerWeek: "10" }], ["a fractional cap", { ticketCapPerWeek: 2.5 }], ["a price of 0", { ticketPriceTzs: 0 }],
    ["a negative floor", { floorTzs: -1 }], ["no close", { closeAt: undefined }], ["a close at 24:00", { closeAt: "24:00" }],
    ["the close at the open", { closeWeekday: 1, closeAt: "00:00" }], ["a void deadline of 0", { voidDeadlineHours: 0 }],
    ["a reversed probability band", { questionCaps: { probabilityMin: 0.7, probabilityMax: 0.3, maxPerCompetition: 4, minReserveSources: 3 } }],
    ["no question rules", { questionCaps: null }], ["a policy v1 does not know", { guaranteeReservePolicy: "PAY_FROM_HOUSE_CASH" }],
    ["a paid exit", { paidExitWindowMinutes: 5 }],
  ];
  const readable = malformed.filter(([, over]) => readMaswaliRulesSnapshot({ ...JSON.parse(JSON.stringify(snap)), ...over }).ok).map(([name]) => name);
  ok("4.12 · ⛔ …and a snapshot that is not version 1's shape is still refused, each malformation on its own (control)", readable.length === 0, readable.join(", "));
}

// ── §5 · the licence basis ──────────────────────────────────────────────────
console.log("\n§5 · the licence basis gates the open");
{
  ok("5.1 · it ships NONE", JSON.stringify(getLicenceBasis()) === JSON.stringify(LICENCE_BASIS_NONE));
  ok("5.2 · ⛔ NONE never opens", !licenceBasisAllowsOpen(LICENCE_BASIS_NONE));
  const fresh0 = await readLicenceBasisFresh();
  ok("5.3 · the fresh read is NONE", fresh0.ok && fresh0.basis.kind === "NONE");
  const short = await recordLicenceBasis({ kind: "OWNER_RULING", ref: "abc" }, "usr_owner");
  ok("5.4 · a ruling with no real reference is refused", !short.ok, JSON.stringify(short));
  const rec = await recordLicenceBasis({ kind: "OWNER_RULING", ref: "  Owner ruling 2026-10-16,  COMPLIANCE-DECISIONS  " }, "usr_owner", new Date("2026-10-20T09:00:00Z"));
  ok("5.5 · the Owner's ruling records, trimmed, dated and signed", rec.ok && rec.basis.kind === "OWNER_RULING"
    && rec.basis.ref === "Owner ruling 2026-10-16, COMPLIANCE-DECISIONS" && rec.basis.recordedAt === "2026-10-20T09:00:00.000Z" && rec.basis.recordedBy === "usr_owner", JSON.stringify(rec));
  ok("5.6 · ⭐ POSITIVE CONTROL · a recorded basis opens", rec.ok && licenceBasisAllowsOpen(rec.basis));
  const fresh1 = await readLicenceBasisFresh();
  ok("5.7 · the fresh read sees it", fresh1.ok && fresh1.basis.kind === "OWNER_RULING");
  ok("5.8 · a forged record (a basis with no author) is refused by the validator", licenceBasisProblem({ kind: "GBT_WRITTEN", ref: "GBT/2026/001", recordedAt: "2026-10-20T09:00:00.000Z", recordedBy: null }) !== null);
  ok("5.9 · …and cannot open", !licenceBasisAllowsOpen({ kind: "GBT_WRITTEN", ref: "GBT/2026/001", recordedAt: "2026-10-20T09:00:00.000Z", recordedBy: null }));
  ok("5.10 · an unknown kind is refused", licenceBasisProblem({ kind: "VERBAL" as never, ref: "spoken", recordedAt: "2026-10-20T09:00:00.000Z", recordedBy: "usr_owner" }) !== null);
  const withdrawn = await recordLicenceBasis({ kind: "NONE", ref: "ignored" }, "usr_owner");
  ok("5.11 · withdrawing it is recorded as a clean NONE", withdrawn.ok && JSON.stringify(withdrawn.basis) === JSON.stringify(LICENCE_BASIS_NONE));
  ok("5.12 · …which closes the gate again", !licenceBasisAllowsOpen(getLicenceBasis()));
}

// ── §6 · the fee model ──────────────────────────────────────────────────────
console.log("\n§6 · jackpot-payout: read, frozen with its rate, never a pool fee");
{
  ok("6.1 · three fee models, in RULES §3's order", JSON.stringify(FEE_MODELS) === JSON.stringify(["capped-commission", "loser-share", "jackpot-payout"]));
  const g = await getGlobalConfig();
  const frozen = snapshotFromConfig({ ...g, feeModel: "jackpot-payout", jackpotFeeRate: 0.13 });
  ok("6.2 · a week's feeSnapshot freezes the model AND its rate, with the global levies", frozen.feeModel === "jackpot-payout"
    && (frozen as { jackpotFeeRate?: number }).jackpotFeeRate === 0.13 && frozen.traTaxOnCommissionRate === g.traTaxOnCommissionRate);
  const poll = snapshotFromConfig(g);
  ok("6.3 · ⛔ a poll's snapshot never carries a jackpot rate", !("jackpotFeeRate" in poll));
  const back = snapshotOrLegacy(JSON.parse(JSON.stringify(frozen)));
  ok("6.4 · it reads back as itself — never folded into the legacy model", back.feeModel === "jackpot-payout" && (back as { jackpotFeeRate?: number }).jackpotFeeRate === 0.13);
  const cap = describeFeeModel(back);
  ok(`6.5 · the caption is "13% at payout" and fits the ${FEE_CAPTION_MAX_CHARS}-character cell`, cap.caption === "13% at payout" && cap.caption.length <= FEE_CAPTION_MAX_CHARS, JSON.stringify(cap));
  ok("6.6 · ⛔ poolFee refuses a jackpot week", throws(() => poolFee(10_000, 0, back)) !== null);
  ok("6.7 · ⛔ a jackpot snapshot WITHOUT its rate is refused, never priced at a default",
    throws(() => describeFeeModel({ feeModel: "jackpot-payout" })) !== null);
  ok("6.8 · ⛔ a rate above the bound is refused", throws(() => describeFeeModel({ feeModel: "jackpot-payout", jackpotFeeRate: 0.9 })) !== null);
  ok("6.9 · ⛔ an UNKNOWN model is refused — before S1 it was coerced to capped-commission", throws(() => describeFeeModel({ feeModel: "pari-jackpot" as never })) !== null);
  ok("6.10 · an ABSENT model is still the legacy capped one (the no-mix guarantee)", describeFeeModel({}).model === "capped-commission");
}

// ── §7 · positive controls ──────────────────────────────────────────────────
console.log("\n§7 · ⚠️ POSITIVE CONTROLS");
{
  ok("7.1 · the validator is not vacuous: a config with EVERY field wrong reports a problem",
    maswaliConfigProblem({ ...MASWALI_DEFAULTS, ticketPriceTzs: -1, floorTzs: -1, ticketCapPerWeek: -1 }) !== null);
  ok("7.2 · …and each §2 refusal is for its own field: the price refusal does not fire on a good price",
    !/ticket price/.test(String(maswaliConfigProblem(with_({ ticketCapPerWeek: 0 })))));
}

console.log(`\n${"═".repeat(70)}\n  MASWALI CONFIG: ${pass} passed, ${fail} failed\n${"═".repeat(70)}`);
/** The floor is the count a green run PRINTED (MASWALI-BUILD S1, the first run); it only rises, to a printed number. */
const MIN_ASSERTIONS = 1;
if (pass < MIN_ASSERTIONS) { console.error(`!! FLOOR — ran ${pass}, fewer than ${MIN_ASSERTIONS}.`); process.exit(4); }
process.exit(fail === 0 ? 0 : 1);
