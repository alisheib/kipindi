/**
 * JAY UNIT I (#7) · THE SELCOM STATEMENT — and the one figure it must never mislabel.
 *
 * The acceptance is three things: both balances shown or honestly absent; a statement
 * reconciling to `scripts/live/ops/payments-now.cjs`; and **a guard that fails if a ledger
 * figure is ever labelled a rail figure.**
 *
 * ⛔ THAT LAST ONE CANNOT BE A CHECK ON WORDING. This campaign has counted a thing by its
 * spelling and been wrong three separate times (`--aqua-400` vs `--accent-400` resolving to
 * the identical colour is the most recent). So provenance is a TYPE: every figure carries
 * `source: "rail" | "ledger"`, only `railFloat()` can mint a rail figure, and the card reads
 * its heading out of `provenanceLabel(figure.source)` instead of typing one. This suite
 * drives that mechanism; §6 additionally proves the card does not hand-write a label
 * around it, because a type is only a guarantee while nobody writes prose beside it.
 *
 * ⛔ THE JUDGEMENT CHECK — *would this still pass if the feature were absent?* §2's
 * exclusion assertions are worthless over a fixture with no `BET_PAYOUT` rows in it, so
 * §2 asserts the fixture's own conflation total is NON-ZERO first. That is the positive
 * control, and `control-no-internal-credits` in the RED harness empties it to prove the
 * point.
 *
 * ⚠️ THE NUMBERS IN THE HEADERS ARE RE-DERIVED, NOT QUOTED. Production, 2026-08-25 21:55
 * UTC, `scripts/live/ops/selcom-statement-census.cjs`: in 646,000 (52) · out 70,000 (12) ·
 * in-wallet credits 2,077,191 (289) · ratio 29.7×. Every confirmed type holds ONE sign, so
 * a magnitude is unambiguous — measured, not assumed, because `sum(abs)` and `abs(sum)` are
 * equal only while that stays true.
 *
 * Run: npm run test:selcom-statement
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-aaaa";

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { db, type StoredTxn } from "../src/lib/server/store.ts";
import {
  buildSelcomStatement, tallyRailTotals, asRailTotals, railFloat, provenanceLabel,
  RAIL_TYPES, INTERNAL_CREDIT_TYPE, TALLY_TYPES,
} from "../src/lib/server/selcom-statement.ts";
import { decomment } from "./lib/decomment.mts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const now = Date.now();
const iso = (ms: number) => new Date(ms).toISOString();
let seq = 0;
const rows: StoredTxn[] = [];
function txn(type: StoredTxn["type"], amount: number, status: StoredTxn["status"] = "CONFIRMED"): StoredTxn {
  const t = {
    id: `txn_${++seq}`, walletId: "wal_x", userId: "usr_x", type, status,
    amount, fee: 0, taxWithheld: 0, balanceAfter: null, currency: "TZS",
    provider: "INTERNAL", providerRef: null, msisdn: null, description: null, positionId: null,
    amlReason: null, createdAt: iso(now), updatedAt: iso(now), completedAt: iso(now),
  } as StoredTxn;
  rows.push(t);
  db.txn.create(t);
  return t;
}

// ── The fixture, shaped like production ──────────────────────────────────────────────
// ⚠️ WITHDRAWALS ARE STORED NEGATIVE. The live census reads `WITHDRAWAL CONFIRMED n=12
// total=-70000`; a statement that summed them raw prints a negative "money out" and a net
// that ADDS when it should subtract. The fixture keeps the real sign so that cannot be
// tested away.
txn("DEPOSIT", 400_000);
txn("DEPOSIT", 246_000);
txn("DEPOSIT", 999_999, "FAILED");        // ⛔ not confirmed — must not count
txn("WITHDRAWAL", -50_000);
txn("WITHDRAWAL", -20_000);
txn("WITHDRAWAL", -62_000, "FAILED");     // ⛔ the census's 14 FAILED rows, in miniature
txn("BET_PAYOUT", 1_200_000);
txn("BET_PAYOUT", 877_191);
txn("BET_PLACED", -500_000);              // ⛔ internal, and not even a credit
txn("CASHOUT", 30_000);                   // ⛔ internal
txn("BONUS_CREDIT", 20_000);              // ⛔ internal

const totals = tallyRailTotals(rows);
const st = buildSelcomStatement(totals, 26_385);

// ── 1 · The statement counts the rail, and only the rail ─────────────────────────────
{
  ok("1: money in is the confirmed DEPOSIT total", st.statement.in.amount === 646_000, `${st.statement.in.amount}`);
  ok("1: …and its count excludes the FAILED deposit", st.statement.in.count === 2, `${st.statement.in.count}`);
  // ⚠️ A MAGNITUDE, not the stored sign.
  ok("1: money out is a POSITIVE magnitude, not the stored negative", st.statement.out.amount === 70_000, `${st.statement.out.amount}`);
  ok("1: …and its count excludes the FAILED withdrawal", st.statement.out.count === 2, `${st.statement.out.count}`);
  ok("1: net SUBTRACTS out from in", st.statement.net.amount === 576_000, `${st.statement.net.amount}`);
}

// ── 2 · ⛔ THE CONFLATION — with its positive control first ──────────────────────────
{
  // ⭐ POSITIVE CONTROL. Everything below is vacuous over a fixture with no in-wallet
  // credits in it, so establish that the thing being excluded EXISTS and is large.
  ok("2: ⭐ POSITIVE CONTROL — the fixture actually holds in-wallet credits to be confused",
     st.internalCredits.amount > 0 && st.internalCredits.count > 0, `${st.internalCredits.amount} over ${st.internalCredits.count} rows`);
  ok("2: …and they DWARF the rail, as on production", st.internalCredits.amount > st.statement.out.amount * 10,
     `${st.internalCredits.amount} vs ${st.statement.out.amount}`);

  ok("2: ⛔ BET_PAYOUT is NOT in the money-out figure", st.statement.out.amount === 70_000);
  ok("2: ⛔ …nor anywhere in the statement", st.statement.in.amount + st.statement.out.amount + Math.abs(st.statement.net.amount) < st.internalCredits.amount * 2
     && st.statement.in.amount !== st.internalCredits.amount && st.statement.out.amount !== st.internalCredits.amount);
  ok("2: ⛔ RAIL_TYPES names exactly DEPOSIT and WITHDRAWAL", [...RAIL_TYPES].join(",") === "DEPOSIT,WITHDRAWAL", [...RAIL_TYPES].join(","));
  ok("2: ⛔ …and does not contain the internal credit type", !(RAIL_TYPES as readonly string[]).includes(INTERNAL_CREDIT_TYPE));
  ok("2: the conflation ratio is stated, so nobody has to rediscover it",
     st.conflationRatio !== null && Math.abs(st.conflationRatio - 2_077_191 / 70_000) < 0.01, `${st.conflationRatio}`);
  // Internal, non-credit movements must not leak in either.
  ok("2: BET_PLACED / CASHOUT / BONUS_CREDIT reach neither side",
     st.statement.in.count === 2 && st.statement.out.count === 2 && st.internalCredits.count === 2);
}

// ── 3 · Provenance is carried by the figure ──────────────────────────────────────────
{
  ok("3: every statement figure is ledger-sourced",
     st.statement.in.source === "ledger" && st.statement.out.source === "ledger" && st.statement.net.source === "ledger");
  ok("3: …and so is the in-wallet credit figure", st.internalCredits.source === "ledger");
  const f = st.rail.disbursementFloat;
  ok("3: the float is rail-sourced", f.available && f.source === "rail");
  ok("3: …and carries the live number", f.available && f.balance === 26_385);
  ok("3: an unreadable float is UNAVAILABLE, never zero", (() => {
    const r = railFloat(null);
    return r.available === false && !("balance" in r);
  })());
  ok("3: ⛔ the two labels are different, so a swap is visible",
     provenanceLabel("rail").short !== provenanceLabel("ledger").short);
  ok("3: …the rail label names Selcom", /selcom/i.test(provenanceLabel("rail").short));
  ok("3: …the ledger label names US, and never Selcom",
     /ledger|our/i.test(provenanceLabel("ledger").short) && !/selcom/i.test(provenanceLabel("ledger").short),
     provenanceLabel("ledger").short);
}

// ── 4 · ⛔ THE COLLECTIONS BALANCE IS ABSENT, AND STAYS ABSENT ───────────────────────
// Selcom publishes no C2B balance. The page must say so rather than computing one from our
// ledger and captioning it "Selcom" (A-5).
{
  ok("4: ⛔ the collections balance is never available", st.rail.collectionsBalance.available === false);
  ok("4: …and it says WHY, naming Selcom's contract", /selcom/i.test(st.rail.collectionsBalance.reason) && /per-transaction|no collections/i.test(st.rail.collectionsBalance.reason),
     st.rail.collectionsBalance.reason.slice(0, 80));
  ok("4: ⛔ …and it carries NO number that could be read as a balance",
     !("balance" in (st.rail.collectionsBalance as object)) && !/[0-9]{3,}/.test(st.rail.collectionsBalance.reason));
  // It cannot become available for a rich ledger either — that is the whole point.
  const rich = buildSelcomStatement(tallyRailTotals(rows), 999_999);
  ok("4: ⛔ …not even when the ledger is full and the float reads fine",
     rich.rail.collectionsBalance.available === false);
}

// ── 5 · The twins agree, and the missing-key case is a true zero ─────────────────────
{
  // `tallyRailTotals` (in-memory, used here) and `db.txn.totalsByType` (the store's own
  // twin of the SQL) must give the same answer over the same rows, or a statement means
  // something different depending on which store served it.
  const viaStore = asRailTotals(db.txn.totalsByType([...TALLY_TYPES]));
  ok("5: the pure tally and the store's twin agree on every figure",
     JSON.stringify(viaStore) === JSON.stringify(totals), `${JSON.stringify(viaStore)} vs ${JSON.stringify(totals)}`);
  // ⚠️ A SQL GROUP BY omits a type with no rows; a true zero must look like a zero.
  const seeded = asRailTotals({ DEPOSIT: { amount: 5, count: 1 } });
  ok("5: a type absent from the aggregate is seeded at zero, not undefined",
     seeded.WITHDRAWAL.amount === 0 && seeded.WITHDRAWAL.count === 0 && seeded.BET_PAYOUT.count === 0);
  const empty = buildSelcomStatement(asRailTotals({}), null);
  ok("5: an empty platform yields honest zeros and an unavailable float",
     empty.statement.in.amount === 0 && empty.statement.out.amount === 0 && empty.rail.disbursementFloat.available === false);
  ok("5: …and states no conflation ratio rather than dividing by zero", empty.conflationRatio === null);
}

// ── 6 · The CARD reads its labels off the figure ─────────────────────────────────────
// A type is a guarantee only while nobody writes prose beside it. ⚠️ DECOMMENTED — this
// file's own header explains the mechanism using the very strings being searched for, and
// `red:card-share` case 6 has already proved a raw scan reads the explanation as the code.
{
  const card = decomment(readFileSync(join(ROOT, "src/app/admin/payments/selcom-statement-card.tsx"), "utf8"));
  ok("6: the card derives its provenance labels from the figure", /provenanceLabel\(/.test(card));
  // ⛔ AND HAND-WRITES NONE OF THEM. 🔴 The first version of this check matched a phrase
  // only inside a pure JSX text node — `["'>][^"'<>{}]*…` — and `red:selcom-statement`
  // case 8 reported NOT CAUGHT against a card that really had been mutated, because the
  // realistic defect sits AFTER an interpolation (`{figure.count.toLocaleString()} confirmed
  // · from Selcom`) and the `{`/`}` broke the character class. **The mutation was right and
  // the detector was wrong**, which is this campaign's most-repeated finding, one layer up.
  // ⭐ The phrases are now taken FROM `provenanceLabel` rather than typed here, so the check
  // follows a rewording instead of silently ceasing to match it — the same "anchor on the
  // thing itself, never on a copy of its wording" rule the handoff locator was broken by
  // four times.
  const owned = (["rail", "ledger"] as const).flatMap((s) => {
    const l = provenanceLabel(s);
    return [l.short, l.sw];
  });
  const handWritten = owned.filter((phrase) => card.includes(phrase));
  ok("6: ⛔ …and hand-writes none of them", handWritten.length === 0, handWritten.join(" | "));
  // ⭐ POSITIVE CONTROL for the line above: the phrases must be non-empty and distinct, or
  // "the card contains none of them" is true of every file ever written.
  ok("6: ⭐ …and the phrase list it searches for is real", owned.length === 4 && owned.every((p) => p.length > 3) && new Set(owned).size === 4,
     owned.join(" | "));
  // The C2B absence must be rendered, not just modelled.
  ok("6: the card renders the collections-balance reason", /collectionsBalance\.reason/.test(card));
  ok("6: …under a heading that says it is NOT published", /not published by selcom/i.test(card));
  // ⛔ And the in-wallet figure must be marked as not-the-rail on the page itself.
  ok("6: the in-wallet credit is captioned as money that did not touch Selcom",
     /did not touch selcom/i.test(card));
  // The page must not have kept a second, hand-rolled Selcom balance strip beside this one.
  const pageSrc = decomment(readFileSync(join(ROOT, "src/app/admin/payments/page.tsx"), "utf8"));
  ok("6: the page routes the Selcom figures through the one card",
     /<SelcomStatementCard\b/.test(pageSrc) && !/Disbursement float · Salio la malipo/.test(pageSrc));
  ok("6: …and reads its tallies from the DB aggregate, never a ledger walk",
     /db\.txn\.totalsByType\(/.test(pageSrc) && !/db\.txn\.listAll\(/.test(pageSrc));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
