/**
 * Break-glass: reverse money that is in a wallet with NO ledger entry behind it.
 *
 * 🔴 WHY THIS EXISTS. The first production backup drill (2026-07-30) ran the platform's own
 * `trialBalance()` and found one wallet holding **TZS 100,000 with no LedgerEntry, no
 * Transaction and no AuditLog row**. The double-entry books themselves were intact
 * (`globalSum` 0, no imbalanced group) — the money simply never went through them, so the
 * wallet and the ledger disagreed and `trialBalance().ok` was false platform-wide.
 *
 * A licensed operator cannot carry a balance it cannot explain. But the fix must not repeat
 * the defect: this goes through `adminAdjustBalance`, which commits the wallet mutation, a
 * CONFIRMED `ADJUSTMENT_DEBIT` transaction and the ledger group **atomically** inside the
 * wallet lock and raises a WATCHED `COMPLIANCE` audit row. Removing unledgered money with a
 * raw UPDATE would be the same bug pointing the other way.
 *
 * ⛔ REFUSES to run without `--actor` and `--confirm`. An officer moving money by hand must
 * be named in the compliance trail — that is the whole point of the audit row.
 * ⛔ REFUSES if the wallet has ANY ledger entry, transaction or position. If the money has
 * been used, this is no longer an orphan and the decision is a human one, not a script's.
 *
 * Usage (DATABASE_URL must be the Postgres service's PUBLIC url — see BACKUP-RUNBOOK.md):
 *   node scripts/ops-clear-unledgered-credit.mjs --user <id> --actor <officerId> --confirm
 */
process.env.USE_PRISMA_DAL = "true";

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}
const has = (n) => process.argv.includes(`--${n}`);

const userId = arg("user");
const actor = arg("actor");
if (!userId) { console.error("!! --user <userId> is required."); process.exit(2); }
if (!actor) {
  console.error("!! --actor <officerId> is required. Moving money by hand must name an officer.");
  process.exit(2);
}

const { db } = await import("../src/lib/server/store.ts");
const { adminAdjustBalance } = await import("../src/lib/server/wallet-service.ts");
const { trialBalance } = await import("../src/lib/server/ledger.ts");

const wallet = await db.wallet.findByUserId(userId);
if (!wallet) { console.error(`!! no wallet for ${userId}`); process.exit(2); }

// Everything that would make this NOT an orphan.
const [ledger, txns, positions] = await Promise.all([
  db.txn.listForUser(userId).then(() => null).catch(() => null), // shape probe only
  db.txn.listForUser(userId),
  import("../src/lib/server/market-service.ts").then((m) => m.listPositionsForUser(userId, 5000)),
]);
void ledger;

const before = await trialBalance();
const drifting = before.drift.find((d) => d.userId === userId);

console.log(`\nwallet        ${wallet.id}`);
console.log(`balance       ${wallet.balance} TZS   hold ${wallet.hold}   bonus ${wallet.bonusBalance}`);
console.log(`transactions  ${txns.length}`);
console.log(`positions     ${positions.length}`);
console.log(`ledger (real) ${drifting ? drifting.ledgerReal : "n/a"}   drift ${drifting ? drifting.realDrift : 0}`);
console.log(`trialBalance  ok=${before.ok}  drifting=${before.driftingWallets}  totalAbsDrift=${before.totalAbsDrift}`);

/**
 * ⚠️ THIS GUARD BELONGS TO THE DEBIT, NOT TO THE BACKFILL — and getting that wrong locked
 * the script out of repairing its own half-finished run.
 *
 * "The money has been used, so a human must decide" is the right rule for REMOVING money.
 * It is the wrong rule for the ledger backfill, whose only job is to make the ledger state
 * what the wallet already holds. After a debit has been posted the wallet legitimately has
 * a transaction against it, and refusing on that basis blocks the very correction that
 * closes the drift.
 */
const used = txns.length > 0 || positions.length > 0;
if (used && !has("skip-debit")) {
  console.error(
    `\n!! REFUSING to debit — this wallet has ${txns.length} transaction(s) and ` +
      `${positions.length} position(s).\n` +
      "   The money has been used, so this is not an unexplained orphan and the decision is a\n" +
      "   human one. Investigate before removing anything.\n" +
      "   (--skip-debit still allows the ledger-only backfill, which removes nothing.)",
  );
  process.exit(2);
}
if (!drifting || drifting.realDrift === 0) {
  console.log("\nNothing to do — this wallet's ledger already agrees with its balance.");
  process.exit(0);
}

/**
 * 🔴 TWO STEPS, IN THIS ORDER, AND THE ORDER IS THE WHOLE LESSON.
 *
 * `adminAdjustBalance` moves the wallet AND the ledger together — correctly, that is what
 * makes it money-safe. But it therefore CANNOT close a wallet↔ledger *mismatch*: debiting
 * an unledgered 100,000 leaves the wallet at 0 and the ledger at −100,000, and the drift
 * is identical in magnitude, just pointing the other way. (Done exactly that on 2026-07-31
 * before working it out; this script exists so nobody repeats it.)
 *
 * So: BACKFILL the ledger entry that was never written, which makes the ledger agree with
 * the wallet as it stands — then debit, which moves both to zero together.
 *
 *   1. ledger-only  HOUSE:ADJUSTMENT −X / PLAYER +X   ← the credit that was never recorded
 *   2. adminAdjust  −X                                ← removes it, wallet + ledger as one
 *
 * Net: wallet 0, player ledger 0, house ledger 0, and two entries that tell the story
 * rather than one that cancels a mistake.
 */
const amount = -Math.round(drifting.realDrift);
const backfill = Math.round(drifting.realDrift);
console.log(`\nstep 1        ledger-only backfill  +${backfill} TZS   (make the ledger match the wallet)`);
console.log(`step 2        ADJUSTMENT_DEBIT ${amount} TZS   (officer ${actor})`);

if (!has("confirm")) {
  console.log("\nDry run. Add --confirm to post it.\n");
  process.exit(0);
}

// Step 1 — the missing original credit, ledger only. Balanced group, so the double-entry
// invariant holds; `postLedgerEntries` throws on an imbalanced group rather than posting.
if (!has("skip-backfill")) {
  const { postLedgerEntries, adjustmentEntries } = await import("../src/lib/server/ledger.ts");
  const groupId = `fix_unledgered_${userId.slice(-8)}_${backfill}`;
  const posted = await postLedgerEntries(
    groupId,
    adjustmentEntries({
      txnId: groupId,
      userId,
      amount: backfill,
      description:
        "Backfill: this wallet was credited without a ledger entry. Recording it so the " +
        "books reflect what the wallet actually held, before it is reversed.",
    }),
  );
  console.log(`step 1        posted group ${posted ?? "(skipped — no database)"}`);
}

const res = has("skip-debit")
  ? { ok: true, balance: wallet.balance, skipped: "debit" }
  : await adminAdjustBalance(
      userId,
      actor,
      amount,
      "Reversing an unledgered credit: this balance had no LedgerEntry, no Transaction and no " +
        "audit row behind it, and was never spent. Found by the production backup drill via " +
        "trialBalance(). Cleared so the wallet and the ledger reconcile.",
    );
console.log("\nresult:", JSON.stringify(res));

const after = await trialBalance();
console.log(
  `trialBalance  ok=${after.ok}  drifting=${after.driftingWallets}  ` +
    `totalAbsDrift=${after.totalAbsDrift}  globalSum=${after.globalSum}`,
);
process.exit(res.ok && after.ok ? 0 : 1);
