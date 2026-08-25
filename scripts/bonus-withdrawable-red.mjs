/**
 * J · RED HARNESS for `test:bonus-withdrawable` — can this guard see a repealed bonus?
 *
 *   node scripts/bonus-withdrawable-red.mjs      (npm run red:bonus-withdrawable)
 *
 * ⭐ MUTATION 1 IS THE ONE THAT MATTERS, and it is a change somebody would make on purpose.
 * "The player's wallet shows 13,000 — let them withdraw 13,000" is a reasonable-sounding
 * ticket, it is one line, and it repeals the entire wagering requirement: every bonus ever
 * granted becomes cash the moment it lands. Before this file, no suite in the repository
 * would have gone red on it.
 *
 * 🔴 AND THE FIRST DRAFT OF MUTATION 1 WOULD HAVE PROVED NOTHING, WHICH IS WHY §DEPTH EXISTS.
 * The balance is guarded TWICE — an explicit `if (w.balance < amount)` and then an ATOMIC
 * `db.wallet.adjust(..., { requireBalanceGte: amount })` whose failure returns the identical
 * refusal. Mutating only the first leaves the second standing, the suite stays green, and a
 * harness that expected red would have reported "GUARD DID NOT CATCH IT" against a guard that
 * is working and a platform that is safe. ⛔ **A mutation must remove the whole control, not
 * the first line of it** — the same lesson as a mutation that APPENDS a class instead of
 * deleting one. §DEPTH below measures the second control rather than assuming it, and it
 * asserts GREEN: it is a control that must NOT go red, and it is not counted as a catch.
 *
 * ⚠️ A NON-ZERO EXIT IS NOT ENOUGH. `tsx` exits non-zero when the suite CRASHES too — a
 * mutation that produces a type error would then read as "defect caught" while proving
 * nothing at all. Every verdict here requires the suite to exit non-zero AND to have printed
 * at least one `FAIL` line, so a crash is reported as a harness error rather than a catch.
 *
 * ⚠️ CRLF: an LF anchor silently fails to match a CRLF tree, the mutation never applies, and
 * the harness reports guard weakness. Every mutation matches both line endings AND re-reads
 * the file to confirm the anchor is gone from disk.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const WALLET = new URL("../src/lib/server/wallet-service.ts", import.meta.url);
const BONUS = new URL("../src/lib/server/bonus-service.ts", import.meta.url);
const originals = new Map([
  [WALLET, readFileSync(WALLET, "utf8")],
  [BONUS, readFileSync(BONUS, "utf8")],
]);
const restore = () => { for (const [f, s] of originals) writeFileSync(f, s); };

const CWD = new URL("..", import.meta.url);
/**
 * Run the suite and say what actually happened, rather than collapsing three different
 * outcomes into one boolean.
 *   { red: true }   exited non-zero AND printed a FAIL line   → the guard saw it
 *   { red: false }  exited zero                               → the guard did not
 *   { crash: true } exited non-zero with no FAIL line         → proves nothing
 */
function runSuite() {
  try {
    execSync("npx tsx scripts/bonus-withdrawable.test.mts", { cwd: CWD, stdio: "pipe" });
    return { red: false, crash: false, out: "" };
  } catch (e) {
    const out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
    return { red: /^FAIL /m.test(out), crash: !/^FAIL /m.test(out), out };
  }
}

restore();
{
  const base = runSuite();
  if (base.red || base.crash) {
    console.error("✗ POSITIVE CONTROL FAILED — the unmutated suite is already red.");
    console.error("  A red below would be indistinguishable from red-on-everything. Fix the suite first.");
    process.exit(1);
  }
}
console.log("  ✓ CONTROL  the unmutated tree is GREEN — a red below is caused by the mutation\n");

// ⚠️ THIS ANCHOR HAS ALREADY MOVED ONCE, AND THE HARNESS CAUGHT IT RATHER THAN LYING.
// `E-223` rewrote the refusal to `return shortOfFunds(w, amount)`, so the previous literal —
// the inline `{ ok: false … "Insufficient balance." }` object — stopped existing. Both
// mutations that used it reported **HARNESS ERROR: anchor not found** instead of quietly
// editing nothing and calling the guard weak. That is the whole point of re-reading the file
// after a write, and it is `E-108` one layer down.
const BALANCE_CHECK = `    if (w.balance < amount) return shortOfFunds(w, amount);`;
const ATOMIC_DEBIT = `    const updated = await db.wallet.adjust(w.id, { balance: -amount, hold: amount }, { requireBalanceGte: amount });`;
const WALLET_FROZEN = `    if (w.status !== "ACTIVE") return { ok: false as const, error: "Wallet frozen.", code: "SUSPENDED" as const };`;

const MUTATIONS = [
  {
    file: WALLET,
    name: "the-bonus-becomes-spendable",
    why: "⭐ THE DEFECT THIS FILE EXISTS FOR — 'the wallet shows 13,000, let them take 13,000'. Both controls move to balance+bonus, so every grant is cash on arrival and the wagering requirement is repealed platform-wide",
    from: `${BALANCE_CHECK}`,
    to: `    const spendable = w.balance + (w.bonusBalance ?? 0);\n`
      + `    if (spendable < amount) return shortOfFunds(w, amount);`,
    also: {
      from: ATOMIC_DEBIT,
      to: `    const updated = await db.wallet.adjust(w.id, { balance: -Math.min(amount, w.balance), bonusBalance: -Math.max(0, amount - w.balance), hold: amount });`,
    },
  },
  {
    file: BONUS,
    name: "fulfilment-credits-nothing",
    why: "the grant still FULFILS on turnover but the unspent remainder never reaches the real balance — a player completes the requirement and is paid nothing, which no balance-only assertion elsewhere can see",
    from: `      const moved = g.remainingTzs;`,
    to: `      const moved = 0; void g.remainingTzs;`,
  },
  {
    file: BONUS,
    name: "requirement-off-by-one",
    why: "★ turnover must EXCEED the requirement rather than meet it, so a player who wagers exactly what was asked is never released — the support-ticket defect nobody reports as a bug",
    from: `    if (newWagered >= g.wagerRequiredTzs) {`,
    to: `    if (newWagered > g.wagerRequiredTzs) {`,
  },
  {
    file: BONUS,
    name: "unlock-is-not-a-bonus-credit",
    why: "the money moves but the ledger calls it something else — the balance is right and the platform can no longer say WHY it changed, which is the provenance rule I-7 states for the Selcom page one product over",
    from: `          type: "BONUS_CREDIT",`,
    to: `          type: "ADJUSTMENT",`,
  },
  {
    file: WALLET,
    name: "the-refusal-says-nothing-again",
    why: "⭐ `E-223` VERBATIM — the reason is dropped, `errorCopy` falls through to the generic *\"That didn't go through. Check the details and try again.\"*, and the most common refusal on the money-out screen explains nothing. This is what production actually answered on 2026-08-26",
    from: `    reason: bonusExplainsIt ? ("withdraw_bonus_locked" as const) : ("withdraw_balance_insufficient" as const),`,
    to: `    /* reason removed */`,
  },
  {
    file: WALLET,
    name: "the-refusal-names-the-wallet-total",
    why: "🔴 THE WORST VERSION OF THE FIX — the sentence offers `balance + bonusBalance`, so a player holding 3,000 of cash and 10,000 of locked bonus is told they may withdraw 13,000. A false money figure, stated confidently, on a money screen",
    from: `    detail: { balance: w.balance, needed: amount },`,
    to: `    detail: { balance: w.balance + bonus, needed: amount },`,
  },
  {
    file: WALLET,
    name: "every-shortfall-blames-the-bonus",
    why: "⚠️ THE OVER-CORRECTION — the bonus branch drops its \"does it actually close the gap\" test, so a player asking for far more than cash AND bonus is lectured about a wagering requirement that is not why they were refused",
    from: `  const bonusExplainsIt = bonus > 0 && amount <= w.balance + bonus;`,
    to: `  const bonusExplainsIt = bonus > 0;`,
  },
  {
    file: WALLET,
    name: "the-two-sentences-swap",
    why: "★ the branches invert, so a player with a locked bonus gets the plain shortfall and a player with none is told about a wagering requirement they do not have — green on any check that only asks whether SOME reason was returned",
    from: `    reason: bonusExplainsIt ? ("withdraw_bonus_locked" as const) : ("withdraw_balance_insufficient" as const),`,
    to: `    reason: bonusExplainsIt ? ("withdraw_balance_insufficient" as const) : ("withdraw_bonus_locked" as const),`,
  },
  {
    file: WALLET,
    name: "identity-gate-restored",
    why: "⚠️ Board comment #1 silently reverts — withdrawal is KYC-gated again. The money rules would all still pass; only §6 can see it",
    from: WALLET_FROZEN,
    to: `    if ((w.status !== "ACTIVE")) return { ok: false as const, error: "Wallet frozen.", code: "SUSPENDED" as const };\n`
      + `    if (kycStatus !== "APPROVED") return { ok: false as const, error: "Verify your identity first.", code: "INVALID" as const };`,
  },
];

let caught = 0;
const problems = [];

/** Apply one anchored replacement, CRLF-aware, and confirm the anchor left the disk. */
function applyOne(file, from, to) {
  const src = readFileSync(file, "utf8");
  const asCRLF = from.replace(/\n/g, "\r\n");
  const anchor = src.includes(from) ? from : src.includes(asCRLF) ? asCRLF : null;
  if (anchor === null) return "anchor not found";
  writeFileSync(file, src.replace(anchor, anchor === asCRLF ? to.replace(/\n/g, "\r\n") : to));
  if (readFileSync(file, "utf8").includes(anchor)) return "anchor still present after write";
  return null;
}

for (const m of MUTATIONS) {
  restore();
  const bad = applyOne(m.file, m.from, m.to) ?? (m.also ? applyOne(m.file, m.also.from, m.also.to) : null);
  if (bad) { problems.push(`${m.name} — HARNESS ERROR: ${bad}`); continue; }

  const r = runSuite();
  if (r.crash) { problems.push(`${m.name} — HARNESS ERROR: the suite CRASHED rather than failing a check; this proves nothing`); continue; }
  if (r.red) { caught++; console.log(`  ✓ RED  ${m.name} — ${m.why}`); }
  else problems.push(`${m.name} — GUARD DID NOT CATCH IT (${m.why})`);
}

// ── §DEPTH · a control that must NOT go red ──────────────────────────────────
// Removing ONLY the explicit balance check must leave the platform safe, because the atomic
// debit refuses the same overdraw. This is measured, not assumed — and if it ever starts
// going red, the second control has gone and mutation 1's `also` clause is load-bearing in a
// way this file should say out loud.
restore();
{
  const bad = applyOne(WALLET, BALANCE_CHECK, `    void amount;`);
  if (bad) problems.push(`DEPTH — HARNESS ERROR: ${bad}`);
  else {
    const r = runSuite();
    if (r.crash) problems.push("DEPTH — HARNESS ERROR: the suite crashed");
    else if (r.red) problems.push("DEPTH — the atomic `requireBalanceGte` debit NO LONGER holds on its own; the explicit check is now the only control");
    else console.log("  ✓ GREEN  defence-in-depth — with the explicit balance check deleted, the atomic debit still refuses the overdraw (not counted as a catch)");
  }
}

restore();
console.log(`\ntree restored · ${caught}/${MUTATIONS.length} defects caught`);
if (problems.length) { for (const p of problems) console.error(`  ✗ ${p}`); process.exit(1); }
