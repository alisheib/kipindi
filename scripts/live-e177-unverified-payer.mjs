/**
 * E-177 — NOBODY HAS EVER WATCHED AN UNVERIFIED PLAYER BE PAID. This is that drive.
 *
 *   npm run qa:e177
 *
 * ⛔ THIS MOVES REAL MONEY ON PRODUCTION. Ali confirmed it 2026-08-26. Read before running.
 *
 * ⭐ ALI'S RULING: CONSOLIDATE, NEVER MINT (docs/SESSION-PROMPT-FINISH-THE-BOARD.md §2).
 * The drive needs one player holding ≥ TZS 1,000,000. It does NOT create that money — it moves
 * it from an existing admin test-funding pot and puts it back afterwards. Platform-wide the two
 * adjustments are NET ZERO, and the ledger sum is asserted unchanged at the end.
 *
 * ⛔ AND NOTHING EVER LEAVES THE PLATFORM. A gross ≥ TWO_PERSON_THRESHOLD returns at the AML hold
 * BEFORE any gateway adapter is touched — verified by reading `dispatchWithdrawal`: the branch
 * returns *before* `resolveActiveAdapter`, and its `providerRef` is deliberately our own
 * correlation id rather than a fabricated gateway ref. So both audit rows get written while the
 * money sits in `hold`, and the hold is then rejected.
 *
 * ⚠️ EVERY MOVE GOES THROUGH `/admin/players/[id]`, NEVER SQL. `adminAdjustBalance` makes the
 * wallet mutation, the CONFIRMED transaction and the ledger group ATOMIC and writes the
 * COMPLIANCE row. A direct UPDATE would move the balance and leave the books unable to explain it.
 *
 * ⚠️ 794,906 is BELOW the 1,000,000 two-person threshold, so each adjustment is single-officer —
 * deliberate, and the reason the figure is what it is.
 *
 * ⭐ IT RESTORES ITSELF. The finally-block reverses whatever it managed to do, so an abort midway
 * does not leave the fleet consolidated. "Leaving the fleet consolidated is not done."
 */
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { BASE, browser, loginOnce } from "./live/harness.mjs";

const require = createRequire(import.meta.url);
const REPO = process.env.KP_REPO ?? "F:/kipindi-main";
const SHOTS = join(REPO, ".qa-e177");

const DONOR = "usr_7fe743ff94c535666a252ce0";       // +255777777776, admin test-funding pot
const RECIPIENT_PHONE = "+255799000002";            // fleet:02
const MOVE = 794_906;                               // < 1,000,000 ⇒ single officer
const TARGET = 1_000_000;

let pass = 0, fail = 0;
const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

function db() {
  const { Client } = require(join(REPO, "node_modules", "pg"));
  const p = join(REPO, "scripts/live/ops/.env");
  if (!existsSync(p)) throw new Error("scripts/live/ops/.env missing — run mkenv.cjs");
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const i = line.indexOf("=");
    if (i > 0) process.env[line.slice(0, i)] = line.slice(i + 1).trim();
  }
  return new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
}

const client = db();
await client.connect();

const bal = async (idOrPhone) => {
  const byId = idOrPhone.startsWith("usr_");
  const r = await client.query(
    `select u.id, w.balance::text as balance, w.hold::text as hold from "User" u
       join "Wallet" w on w."userId" = u.id where ${byId ? "u.id" : 'u."phoneE164"'} = $1`,
    [idOrPhone],
  );
  return r.rows[0] ?? null;
};
const ledgerSum = async () =>
  (await client.query(`select coalesce(sum(amount),0)::text as t from "LedgerEntry"`)).rows[0].t;

/** Drive ONE adjustment through the real admin control. */
async function adjust(page, userId, direction, amount, reason) {
  await page.goto(`${BASE}/admin/players/${userId}`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.waitForTimeout(3_000);
  await page.getByRole("button", { name: /Adjust balance/i }).first().click();
  const modal = page.locator('[role="dialog"], [role="alertdialog"]');
  await modal.waitFor({ state: "visible", timeout: 20_000 });
  // The direction control is a radio pair labelled "Credit (+)" / "Debit (−)".
  await modal.getByRole("radio", { name: direction === "credit" ? /Credit/ : /Debit/ }).click();
  await modal.locator('input[inputmode="numeric"]').fill(String(amount));
  await modal.locator("textarea").fill(reason);
  // ⚠️ The submit label CARRIES THE AMOUNT ("Debit TZS 794,906"), so match on the verb only.
  await modal.getByRole("button", { name: direction === "credit" ? /^Credit / : /^Debit / }).click();
  await page.waitForTimeout(6_000);
}

const before = { donor: await bal(DONOR), fleet: await bal(RECIPIENT_PHONE), ledger: await ledgerSum() };
console.log(`   before · donor ${before.donor.balance} · fleet ${before.fleet.balance} · ledger ${before.ledger}`);
const FLEET_ID = before.fleet.id;

let movedOut = false, movedIn = false, holdTxnId = null;
const { b } = await browser();

try {
  if (!existsSync(SHOTS)) mkdirSync(SHOTS, { recursive: true });
  const adminState = await loginOnce(b, "admin");
  const actx = await b.newContext({ storageState: adminState, viewport: { width: 1440, height: 1000 } });
  const apage = await actx.newPage();

  // ── 1 · CONSOLIDATE ────────────────────────────────────────────────────────
  await adjust(apage, DONOR, "debit", MOVE, "E-177 drive: consolidate to fleet:02 for the unverified-payer seal. Reversed at the end of this run.");
  const d1 = await bal(DONOR);
  movedOut = Number(d1.balance) === Number(before.donor.balance) - MOVE;
  ok("1: the donor was debited through /admin/players — never SQL", movedOut,
     `${before.donor.balance} → ${d1.balance}`);
  if (!movedOut) throw new Error("donor debit did not take — refusing to continue");

  await adjust(apage, FLEET_ID, "credit", MOVE, "E-177 drive: consolidate for the unverified-payer seal. Reversed at the end of this run.");
  const f1 = await bal(RECIPIENT_PHONE);
  movedIn = Number(f1.balance) === TARGET;
  ok("1: …and fleet:02 now holds EXACTLY the threshold", movedIn, `${before.fleet.balance} → ${f1.balance}`);
  if (!movedIn) throw new Error("fleet credit did not land on the target — refusing to continue");

  ok("1: ⭐ CONSOLIDATE, NEVER MINT — the ledger is unchanged, so nothing was created",
     (await ledgerSum()) === before.ledger, `ledger ${before.ledger} → ${await ledgerSum()}`);

  // ── 2 · THE ZERO-MONEY WITHDRAWAL ──────────────────────────────────────────
  const pState = await loginOnce(b, "fleet:02");
  const pctx = await b.newContext({ storageState: pState, viewport: { width: 393, height: 852 } });
  const ppage = await pctx.newPage();
  await ppage.goto(`${BASE}/wallet/withdraw`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await ppage.waitForTimeout(4_000);
  // ⚠️ MEASURED, NOT GUESSED. The field is `input[name="amount"]` and the submit reads
  // "Confirm withdrawal" — my first guesses (/withdraw|toa|continue/) matched nothing.
  await ppage.locator('input[name="amount"]').fill(String(TARGET));
  await ppage.waitForTimeout(800);
  // ⛔ "Confirm withdrawal" IS THE TRIGGER, NOT THE COMMIT — it opens a ConfirmDialog whose own
  // button carries the SAME LABEL. The first run clicked the trigger, waited 9s and reported the
  // seal missing; the product had simply been waiting for a confirmation nobody gave. ⚠️ THIRD
  // TIME THIS PATTERN HAS COST A RUN TODAY (staff promotion, balance adjust, and now this): on
  // this platform a money-commit control is ALWAYS two steps, and the second lives in a dialog.
  await ppage.getByRole("button", { name: /Confirm withdrawal/i }).first().click();
  const wdlg = ppage.locator('[role="dialog"], [role="alertdialog"]');
  await wdlg.waitFor({ state: "visible", timeout: 20_000 });
  await ppage.screenshot({ path: join(SHOTS, "confirm-dialog.png"), fullPage: true });
  // ⚠️ THE DIALOG COMMITS UNDER A DIFFERENT WORD: "Send funds" (t.common.sendFunds), not
  // "Confirm withdrawal". Read from confirm-dialog confirmLabel, not guessed a fourth time.
  await wdlg.getByRole("button", { name: /Send funds|Tuma pesa/i }).last().click();
  await ppage.waitForTimeout(12_000);
  await ppage.screenshot({ path: join(SHOTS, "player-sees.png"), fullPage: true });
  const playerText = (await ppage.evaluate(() => (document.body.innerText || "").replace(/\s+/g, " "))).slice(0, 400);
  console.log(`   player sees: ${playerText.slice(0, 220)}`);

  // ── 3 · THE TWO AUDIT ROWS, AND THE SAME txnId ─────────────────────────────
  const rows = await client.query(
    `select action, payload, "createdAt"::text as at from "AuditLog"
      where "targetId" = $1 and action in ('withdraw.initiated','withdraw.unverified_payer')
      order by "createdAt" desc limit 6`, [FLEET_ID]);
  const init = rows.rows.find((r) => r.action === "withdraw.initiated");
  const unv = rows.rows.find((r) => r.action === "withdraw.unverified_payer");
  ok("3: `withdraw.initiated` was written and carries kycStatus",
     Boolean(init && "kycStatus" in (init.payload ?? {})), init ? JSON.stringify(init.payload).slice(0, 150) : "absent");
  ok("3: ⭐ `withdraw.unverified_payer` was written — the seal nobody had ever watched fire",
     Boolean(unv), unv ? JSON.stringify(unv.payload).slice(0, 150) : "absent");
  ok("3: ⭐ …and BOTH rows carry the SAME txnId — one event, not two coincidences",
     Boolean(init && unv && init.payload?.txnId && init.payload.txnId === unv.payload?.txnId),
     `${init?.payload?.txnId ?? "?"} vs ${unv?.payload?.txnId ?? "?"}`);
  holdTxnId = init?.payload?.txnId ?? null;

  // ⛔ THE MONEY MUST STILL BE INSIDE THE PLATFORM.
  const f2 = await bal(RECIPIENT_PHONE);
  ok("3: ⛔ nothing left the platform — the amount is in HOLD, not gone",
     Number(f2.hold) > 0 && Number(f2.balance) + Number(f2.hold) === TARGET,
     `balance ${f2.balance} · hold ${f2.hold}`);
  await pctx.close();
} catch (err) {
  fail++;
  console.log(`FAIL driver threw — ${err?.message ?? err}`);
} finally {
  // ── 4 · PUT IT BACK. Always. ───────────────────────────────────────────────
  try {
    const adminState = await loginOnce(b, "admin");
    const actx = await b.newContext({ storageState: adminState, viewport: { width: 1440, height: 1000 } });
    const apage = await actx.newPage();

    if (holdTxnId) {
      // ⛔ TARGET MY OWN ROW, AND REFUSE IF THE QUEUE IS AMBIGUOUS. "Click the first reject
      // button" would reject SOMEBODY ELSE'S hold — real money, wrong player. The queue was
      // measured EMPTY before this drive, so exactly one AML_REVIEW row should exist and it
      // should be mine; anything else and the drive stops and says so rather than guessing.
      const held = await client.query(
        `select id, "userId" from "Transaction" where status = 'AML_REVIEW'`,
      );
      const mine = held.rows.filter((r) => r.id === holdTxnId);
      if (held.rows.length !== 1 || mine.length !== 1) {
        console.log(`⛔ REFUSING TO REJECT — the AML queue holds ${held.rows.length} row(s) and I cannot`);
        console.log(`   prove which is mine (${holdTxnId}). Reject it by hand; the money is in HOLD, not gone.`);
      } else {
        await apage.goto(`${BASE}/admin/aml`, { waitUntil: "domcontentloaded", timeout: 90_000 });
        await apage.waitForTimeout(5_000);
        await apage.getByRole("button", { name: /reject/i }).first().click();
        await apage.waitForTimeout(2_500);
        const dlg = apage.locator('[role="dialog"], [role="alertdialog"]');
        if (await dlg.count()) {
          await dlg.locator("textarea, input[type='text']").first()
            .fill("E-177 drive — returning the hold; nothing was ever dispatched to a gateway.").catch(() => {});
          await dlg.getByRole("button", { name: /reject/i }).first().click().catch(() => {});
        }
        await apage.waitForTimeout(8_000);
      }
    }

    if (movedIn) {
      await adjust(apage, FLEET_ID, "debit", MOVE, "E-177 drive: reversing the consolidation. Net zero platform-wide.");
    }
    if (movedOut) {
      await adjust(apage, DONOR, "credit", MOVE, "E-177 drive: reversing the consolidation. Net zero platform-wide.");
    }
    await actx.close();

    const after = { donor: await bal(DONOR), fleet: await bal(RECIPIENT_PHONE), ledger: await ledgerSum() };
    ok("4: ⭐ PUT BACK — the donor is exactly where it started",
       after.donor.balance === before.donor.balance, `${before.donor.balance} → ${after.donor.balance}`);
    ok("4: ⭐ …and so is fleet:02, hold included",
       after.fleet.balance === before.fleet.balance && Number(after.fleet.hold) === Number(before.fleet.hold),
       `balance ${before.fleet.balance} → ${after.fleet.balance} · hold ${before.fleet.hold} → ${after.fleet.hold}`);
    ok("4: ⛔ and the ledger still sums to what it did — nothing was minted or destroyed",
       after.ledger === before.ledger, `${before.ledger} → ${after.ledger}`);
  } catch (err) {
    fail++;
    console.log(`FAIL RESTORE THREW — ⛔ THE FLEET MAY BE LEFT CONSOLIDATED: ${err?.message ?? err}`);
  }
  await b.close();
  await client.end();
}

console.log(`\nlive-e177: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
