/**
 * test:lock-tx-threading — a money write under `withLock` must JOIN the lock's transaction.
 *
 * 🔴 THE DEFECT THIS GATE EXISTS FOR. `locks.ts` documents its own contract as *"Everything
 * inside ONE withLock now shares ONE transaction, so a throw rolls back every write made
 * under the lock"*. That is **not ambient**. `withAdvisoryLock` PASSES the transaction to the
 * callback, but `prisma-dal` resolves its client as `const db: Db = tx ?? pc()` and never
 * reads the AsyncLocalStorage the lock publishes. So a callback written `async () => {` — one
 * that does not NAME `tx` — autocommits every write on the pooled singleton, OUTSIDE the
 * advisory-lock transaction, while the contract above says it cannot.
 *
 * `wallet-service.withdraw`'s Phase A was written that way. Its hold and its Transaction row
 * committed separately, so a P2024 pool timeout, a P2028, or a SIGTERM during a rolling deploy
 * between the two writes left the player's money in `Wallet.hold` with NO transaction row —
 * and nothing can find that state: `reconcileStalePayments` starts from the txn table,
 * `/admin/payments` counts the same table, and `trialBalance` compares `balance + hold`
 * against the ledger, so moving money between those two columns changes neither side. The
 * books tie to the shilling over a player who is permanently short.
 *
 * ⚠️ THIS GATE IS STRUCTURAL, AND STRUCTURAL CHECKS LIE EASILY. It reads source text, so it
 * cannot prove the transaction actually rolls back — only that the writes are handed the
 * client that would. §3 is the positive control: the pre-fix shape must be REJECTED, or a
 * green run means the scanner went blind rather than that the code is correct. The
 * behavioural proof needs a real Postgres (`e2e:money`).
 *
 *   npx tsx scripts/lock-tx-threading.test.mts
 *   LOCKTX_ROOT=<tree> npx tsx scripts/lock-tx-threading.test.mts   ← used by the red harness
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.LOCKTX_ROOT || join(here, "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8").split("\r\n").join("\n");

let pass = 0;
let fail = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${detail ? ` · ${detail}` : ""}`); }
}

/** The body of `fn`, from its opening line onward. */
function blockAfter(src: string, anchor: string, span = 4000): string {
  const i = src.indexOf(anchor);
  if (i < 0) return "";
  return src.slice(i, i + span);
}

/**
 * ⛔ COMMENTS STRIPPED BEFORE MATCHING, AND THIS FILE IS WHY.
 *
 * §2c asserts that `updated?.balance ?? wallet.balance + amount` is GONE from
 * `creditInternal`. The fix's own docblock quotes that exact line to explain what it
 * replaced — so the naive scanner found its own prose and reported the defect as live, on
 * source that is correct. An absence check that reads comments is measuring the
 * explanation, not the code.
 *
 * ⚠️ It cuts the other way too, and that is the dangerous direction: a PRESENCE check could
 * be satisfied by a comment mentioning the right call, over code that never makes it.
 */
function codeOnly(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")   // block comments, including JSDoc
    .replace(/^[ \t]*\/\/.*$/gm, "");   // whole-line // comments
}

const wallet = read("src/lib/server/wallet-service.ts");
const dal = read("src/lib/server/prisma-dal.ts");
const locks = read("src/lib/server/locks.ts");

// ── §1 · The premise: the DAL really is not ambient ──────────────────────────
//
// If this ever stops being true — if the DAL learns to read `currentLockTx()` itself — then
// §2 is no longer necessary and this gate should be retired rather than left asserting a
// requirement that has moved. Stating the premise is what makes that visible.
console.log("\n§1 · the premise — prisma-dal resolves its client from the ARGUMENT, not the store");
{
  ok("1.1  prisma-dal resolves `tx ?? pc()`", dal.includes("const db: Db = tx ?? pc();"));
  ok("1.2  prisma-dal never reads the lock store",
    !dal.includes("currentLockTx") && !dal.includes("lockStore"));
  ok("1.3  withLock does pass its tx to the callback", locks.includes("() => fn(tx)"));
}

// ── §2 · withdraw's Phase A takes the tx and hands it to BOTH writes ─────────
console.log("\n§2 · wallet-service.withdraw Phase A enrols its writes in the lock transaction");
{
  const phaseA = blockAfter(wallet, "const hold = await withLock(`wallet:${userId}`,");
  ok("2.1  the lock callback NAMES its transaction",
    /await withLock\(`wallet:\$\{userId\}`,\s*async \(tx\)/.test(phaseA),
    "callback is `async () =>` — the writes below autocommit outside the lock");
  ok("2.2  the balance→hold move is passed the tx",
    /db\.wallet\.adjust\([^;]*requireBalanceGte: amount \}, tx\)/.test(phaseA),
    "wallet.adjust does not receive tx");
  ok("2.3  the Transaction row is created on the tx",
    /idempotencyKey: idempotencyKey \?\? null,\s*\n\s*\}, tx\);/.test(phaseA),
    "txn.create does not receive tx");
}

// ── §2b · settleWithdrawalFailed — the path that hands money BACK ────────────
//
// 🔴 THE SAME DEFECT, ON THE REFUND PATH, AND IT REPEATS. Its callback was `async ()` too,
// so the credit and the status write autocommitted separately. The only thing between a
// payout and a SECOND refund is `t.status !== "PROCESSING"`, read inside that lock — so a
// credit that commits while the status write fails leaves money returned AND the row still
// PROCESSING. `reconcileStalePayments` runs every five minutes, finds it, re-queries, reads
// FAILED, and refunds again. And again. While the real payout may already have left.
console.log("\n§2b · settleWithdrawalFailed commits the refund and the status flip together");
{
  const failed = blockAfter(wallet, "export async function settleWithdrawalFailed");
  ok("2b.1  its lock callback NAMES the transaction",
    /withLock\(`wallet:\$\{pre\.userId\}`,\s*async \(tx\)/.test(failed),
    "callback is `async ()` — the refund and the status write autocommit separately");
  ok("2b.2  the refund credit is passed the tx",
    /db\.wallet\.adjust\(w\.id, \{ balance: amt, hold: -amt \}, undefined, tx\)/.test(failed),
    "the credit does not receive tx");
  ok("2b.3  the FAILED status write is passed the tx",
    /db\.txn\.update\(txnId, \{ status: "FAILED"[^;]*\}, tx\)/.test(failed),
    "the status write does not receive tx — this is the half that repeats");
}

// ── §2c · creditInternal — the path that puts money IN ──────────────────────
//
// 🔴 IT INVENTED THE BALANCE. `const newBalance = updated?.balance ?? wallet.balance + amount;`
// — so when `db.wallet.adjust` returned null (a guarded updateMany matching zero rows, or a
// throw swallowed to null by the self-committing arm) NO MONEY MOVED and the function carried
// on: a CONFIRMED transaction, a `balanceAfter` never persisted, a balanced ledger group, and
// that fabricated number returned to the caller as success. `onRecruitSettlement` writes the
// agent's commission as PAID on it and remits 5% withholding to HOUSE:TAX — tax on income the
// agent never received. Every caller's `!== null` test passes.
// ⭐ `debitInternal` — the mirror, right below it — has always threaded `tx` and aborted on
// null. The path taking money OUT was safe; the path putting money IN was not.
console.log("\n§2c · creditInternal refuses rather than inventing a balance");
{
  // ⚠️ The span must clear the whole function INCLUDING its docblocks. At 5000 it stopped
  // between 2c.2 and 2c.3 and reported a defect that is not there — the third time this
  // file's own span has had to grow, and the reason §3 re-runs every pattern against fixed
  // text: a scanner that under-reads accuses working code exactly as loudly as it misses
  // broken code.
  const credit = codeOnly(blockAfter(wallet, "export async function creditInternal", 9000));
  ok("2c.1  its lock callback NAMES the transaction",
    /withLock\(`wallet:\$\{userId\}`,\s*async \(tx\)/.test(credit),
    "callback is `async ()` — the credit, the txn row and the ledger group autocommit apart");
  ok("2c.2  the credit is passed the tx",
    /db\.wallet\.adjust\(wallet\.id, \{ balance: amount \}, undefined, tx\)/.test(credit));
  ok("2c.3  ⛔ it REFUSES on a null write instead of fabricating the balance",
    /if \(!updated\) \{/.test(credit) && /const newBalance = updated\.balance;/.test(credit),
    "the `?? wallet.balance + amount` fallback is back — money can be recorded as PAID that never moved");
  ok("2c.4  and the `??` fabrication is gone entirely",
    !/updated\?\.balance \?\? wallet\.balance \+ amount/.test(credit));
  ok("2c.5  the ledger group is posted ON the tx and AWAITED, not fire-and-forget",
    /await postLedgerEntries\(`int_\$\{txnId\}`, lines, tx\)/.test(credit),
    "a fire-and-forget group can be lost while the wallet moved");
}

// ── §3 · POSITIVE CONTROL — the scanner can still say NO ─────────────────────
//
// ⛔ WITHOUT THIS, §2 COULD PASS BY MATCHING NOTHING. Each assertion is re-run against the
// PRE-FIX text; every one of them must REJECT it. A regex that has quietly stopped matching
// reports the fixed shape and the broken shape identically, and this repo has shipped that
// exact failure before.
console.log("\n§3 · POSITIVE CONTROL · the pre-fix shape must be REJECTED");
{
  const preFix = `const hold = await withLock(\`wallet:\${userId}\`, async () => {
    const updated = await db.wallet.adjust(w.id, { balance: -amount, hold: amount }, { requireBalanceGte: amount });
    await db.txn.create({
      idempotencyKey: idempotencyKey ?? null,
    });`;
  ok("3.1  the pre-fix callback signature is rejected",
    !/await withLock\(`wallet:\$\{userId\}`,\s*async \(tx\)/.test(preFix));
  ok("3.2  the pre-fix wallet.adjust is rejected",
    !/db\.wallet\.adjust\([^;]*requireBalanceGte: amount \}, tx\)/.test(preFix));
  ok("3.3  the pre-fix txn.create is rejected",
    !/idempotencyKey: idempotencyKey \?\? null,\s*\n\s*\}, tx\);/.test(preFix));
  // …and the fixed shape must be ACCEPTED by the same three, so the controls above are not
  // passing merely because the patterns match nothing at all.
  const fixed = `const hold = await withLock(\`wallet:\${userId}\`, async (tx) => {
    const updated = await db.wallet.adjust(w.id, { balance: -amount, hold: amount }, { requireBalanceGte: amount }, tx);
    await db.txn.create({
      idempotencyKey: idempotencyKey ?? null,
    }, tx);`;
  ok("3.4  the fixed shape is accepted by all three patterns",
    /await withLock\(`wallet:\$\{userId\}`,\s*async \(tx\)/.test(fixed)
    && /db\.wallet\.adjust\([^;]*requireBalanceGte: amount \}, tx\)/.test(fixed)
    && /idempotencyKey: idempotencyKey \?\? null,\s*\n\s*\}, tx\);/.test(fixed));

  // …and the same for §2b's three, against the refund path's real pre-fix text.
  const preFixFailed = `const done = await withLock(\`wallet:\${pre.userId}\`, async (): Promise<StoredTxn | null> => {
    if (w) await db.wallet.adjust(w.id, { balance: amt, hold: -amt });
    await db.txn.update(txnId, { status: "FAILED", description: \`Withdrawal failed: \${reason}\` });`;
  // …and §2c's, against the credit path's real pre-fix text.
  const preFixCredit = `return withLock(\`wallet:\${userId}\`, async () => {
    const updated = await db.wallet.adjust(wallet.id, { balance: amount });
    const newBalance = updated?.balance ?? wallet.balance + amount;
    postLedgerEntries(\`int_\${txnId}\`, lines).catch(() => {});`;
  ok("3.6  pre-fix creditInternal is rejected by all of §2c",
    !/withLock\(`wallet:\$\{userId\}`,\s*async \(tx\)/.test(preFixCredit)
    && !/db\.wallet\.adjust\(wallet\.id, \{ balance: amount \}, undefined, tx\)/.test(preFixCredit)
    && !/if \(!updated\) \{/.test(preFixCredit)
    && /updated\?\.balance \?\? wallet\.balance \+ amount/.test(preFixCredit)
    && !/await postLedgerEntries\(`int_\$\{txnId\}`, lines, tx\)/.test(preFixCredit));

  ok("3.5  pre-fix settleWithdrawalFailed is rejected by all three of §2b",
    !/withLock\(`wallet:\$\{pre\.userId\}`,\s*async \(tx\)/.test(preFixFailed)
    && !/db\.wallet\.adjust\(w\.id, \{ balance: amt, hold: -amt \}, undefined, tx\)/.test(preFixFailed)
    && !/db\.txn\.update\(txnId, \{ status: "FAILED"[^;]*\}, tx\)/.test(preFixFailed));
}

// ── §4 · The reference implementation stays the reference ────────────────────
console.log("\n§4 · settleWithdrawalConfirmed — the shape withdraw was measured against");
{
  const confirmed = blockAfter(wallet, "async function settleWithdrawalConfirmed");
  ok("4.1  it still threads tx through withMoneyTx", /withMoneyTx\(async \(tx\)/.test(confirmed));
  ok("4.2  and still passes tx to its wallet write", /db\.wallet\.adjust\([^;]*, tx\)/.test(confirmed));
}

console.log(`\n${fail === 0 ? "PASS" : "FAILED"} · ${pass} ok, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
