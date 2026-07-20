/**
 * DEPOSIT STATES → WHAT THE PLAYER ACTUALLY RECEIVES.
 *
 * The gap this suite closes: every deposit state was already *stored* correctly,
 * but only ONE of them (CONFIRMED) told the player anything. A declined card, a
 * payment reconciled to failed half an hour later, a deposit auto-reversed by the
 * self-exclusion guard, and a payment sitting in flight all produced total
 * silence — no inbox entry, no email. On a real-money platform, silence after
 * money leaves a player's account is indistinguishable from theft, and a silent
 * pending is the exact condition that makes someone pay twice.
 *
 * So this file asserts, for every state:
 *   1. an in-app notification exists, with the right kind and a truthful title,
 *   2. an email was sent, and — critically — we assert on the RENDERED HTML, not
 *      merely that a send happened. The bug that started this work (a receipt
 *      carrying our internal id where the gateway reference belonged) lives in
 *      the body and would sail straight past a "was sendEmail called?" check,
 *   3. both references travel together everywhere, so one payment has one
 *      identity across the email, the receipt, the return leg and the admin table,
 *   4. the money itself did what the message claims it did.
 *
 * Everything runs against the in-memory store; no gateway is involved.
 */
process.env.EMAIL_OUTBOX_CAPTURE = "1";

import { db } from "../src/lib/server/store.ts";
import { deposit, settlePaymentWebhook, notifyStillPendingDeposits, reconcileStalePayments } from "../src/lib/server/wallet-service.ts";
import { emailOutbox, clearEmailOutbox } from "../src/lib/server/email.ts";
import { setPaymentControls } from "../src/lib/server/payment-control.ts";
import { selfExclude } from "../src/lib/server/responsible-gambling.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};

const now = () => new Date().toISOString();
let seq = 0;

async function mkUser(id: string): Promise<void> {
  await db.user.create({
    id,
    phoneE164: `+25579${String(++seq).padStart(7, "0")}`,
    passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: "Test Player", dob: "1990-01-01", region: "TZ",
    acceptedTermsVersion: "v1", acceptedTermsAt: now(),
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    email: `${id}@t.tz`, emailVerifiedAt: now(),
    createdAt: now(), updatedAt: now(), lastLoginAt: now(), closedAt: null,
  } as never);
  await db.wallet.create({
    id: `wal_${id}`, userId: id, balance: 0, pending: 0, hold: 0,
    currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now(),
  } as never);
}

/** Seed a PROCESSING deposit directly — the state the gateway leaves us in
 *  while a collection is still moving. `createdAt` is back-dated so the stale
 *  sweeps consider it without the test having to wait 30 real minutes. */
async function mkProcessingDeposit(userId: string, id: string, opts: {
  amount: number; providerRef: string | null; ageMs?: number; provider?: string;
}): Promise<void> {
  await db.txn.create({
    id, walletId: `wal_${userId}`, userId,
    type: "DEPOSIT", status: "PROCESSING", amount: opts.amount,
    fee: 0, taxWithheld: 0, balanceAfter: null, currency: "TZS",
    provider: (opts.provider ?? "CARD") as never, providerRef: opts.providerRef,
    msisdn: null, description: "Card deposit", positionId: null, amlReason: null,
    createdAt: new Date(Date.now() - (opts.ageMs ?? 0)).toISOString(),
    updatedAt: now(), completedAt: null, idempotencyKey: null,
  } as never);
}

/**
 * Let the fire-and-forget mail land before asserting on the outbox.
 *
 * Every `sendEmailToUser` call site is intentionally NOT awaited — a slow or
 * failing mail provider must never delay or break a money path. That means the
 * send completes a few ticks after the function that triggered it returns, so a
 * test asserting immediately reads an empty outbox (and, worse, then reads the
 * PREVIOUS case's mail once it finally arrives). Draining here keeps the
 * production behaviour non-blocking while making the assertions deterministic.
 */
const flush = async (): Promise<void> => {
  for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 20));
};

const notifsFor = async (uid: string) => await db.notification.findByUser(uid, 50);
const depositMail = () => emailOutbox().filter((m) => m.tag === "deposit");
const balanceOf = async (uid: string) => (await db.wallet.findByUserId(uid))?.balance ?? 0;

await setPaymentControls({ provider: "mock" }, "test").catch(() => {});

// ═══ A — CONFIRMED ══════════════════════════════════════════════════════════
// The happy path, and the one that already worked. What is NEW here is that the
// email must now carry the GATEWAY reference alongside our own id.
{
  await flush();
  clearEmailOutbox();
  await mkUser("usr_dn_ok");
  const r = await deposit("usr_dn_ok", { provider: "MPESA", amount: 10_000, msisdn: "712345678" });
  await flush();
  ok("A1 confirmed deposit succeeds", r.ok);
  const txnId = r.ok ? r.data.txnId : "";
  const txn = await db.txn.findById(txnId);

  ok("A2 wallet credited", (await balanceOf("usr_dn_ok")) === 10_000);
  ok("A3 txn is CONFIRMED", txn?.status === "CONFIRMED");

  const ns = await notifsFor("usr_dn_ok");
  const confirmNote = ns.find((n) => n.kind === "DEPOSIT" && /confirmed/i.test(n.titleEn));
  ok("A4 a DEPOSIT notification exists", !!confirmNote);
  ok("A5 notification is trilingual (SW + ZH present)",
    !!confirmNote?.titleSw && !!confirmNote?.titleZh && !!confirmNote?.bodySw && !!confirmNote?.bodyZh);
  ok("A6 notification deep-links to THIS deposit's receipt",
    confirmNote?.href === `/wallet/receipt/${txnId}`, confirmNote?.href ?? "none");

  const mail = depositMail();
  ok("A7 exactly one deposit email", mail.length === 1, `got ${mail.length}`);
  const html = mail[0]?.html ?? "";
  ok("A8 email went to the player's address", mail[0]?.to === "usr_dn_ok@t.tz");
  // ── G1, the bug Ali called out ──
  ok("A9 email carries OUR reference", html.includes(txnId));
  ok("A10 email labels it as the 50pick reference", /50pick reference/i.test(html));
  if (txn?.providerRef) {
    ok("A11 email carries the GATEWAY reference", html.includes(txn.providerRef));
    ok("A12 email labels it as the gateway reference", /gateway reference/i.test(html));
  } else {
    ok("A11 no gateway ref on this rail → none printed (no placeholder invented)",
      !/gateway reference/i.test(html));
    pass++; console.log("PASS A12 (n/a — internal rail)");
  }
  ok("A13 email states the new balance", /10,000/.test(html));
}

// ═══ B — FAILED (G2) ════════════════════════════════════════════════════════
// The state that previously wrote an audit row and told the player nothing.
{
  clearEmailOutbox();
  await mkUser("usr_dn_fail");
  await mkProcessingDeposit("usr_dn_fail", "txn_dn_fail", { amount: 25_000, providerRef: "dep_fail_001" });

  const before = await balanceOf("usr_dn_fail");
  const res = await settlePaymentWebhook({ providerRef: "dep_fail_001", status: "FAILED" });
  await flush();
  ok("B1 webhook handled the failure", res.handled);
  ok("B2 txn is FAILED", (await db.txn.findById("txn_dn_fail"))?.status === "FAILED");
  ok("B3 NO money moved", (await balanceOf("usr_dn_fail")) === before);

  const ns = await notifsFor("usr_dn_fail");
  const failNote = ns.find((n) => n.kind === "DEPOSIT" && /failed/i.test(n.titleEn));
  ok("B4 a failure notification exists", !!failNote);
  ok("B5 notification says no money was taken",
    /no money was taken/i.test(failNote?.bodyEn ?? ""), failNote?.bodyEn ?? "none");
  ok("B6 failure notification is trilingual", !!failNote?.titleSw && !!failNote?.titleZh);

  const mail = depositMail();
  ok("B7 a failure email was sent", mail.length === 1, `got ${mail.length}`);
  const html = mail[0]?.html ?? "";
  ok("B8 subject names the failure", /failed/i.test(mail[0]?.subject ?? ""));
  // The single most important sentence in this email.
  ok("B9 email states plainly that NO MONEY WAS TAKEN", /no money was taken/i.test(html));
  ok("B10 email says the balance is unchanged", /balance is unchanged/i.test(html));
  ok("B11 email carries our reference", html.includes("txn_dn_fail"));
  ok("B12 email carries the gateway reference", html.includes("dep_fail_001"));
  ok("B13 email tells them what to do if their bank DOES show a charge",
    /if your bank/i.test(html) && /trace it/i.test(html));
  ok("B14 email is NOT gold-chromed (gold is money-in only)", !/GILT|gold/i.test(html.slice(0, 400)));
}

// ═══ C — REVERSED, self-exclusion (G4) ══════════════════════════════════════
// A player who self-excluded between initiating and settling. Money must not be
// credited, and the silence here was the worst of the four gaps.
{
  clearEmailOutbox();
  await mkUser("usr_dn_rg");
  await selfExclude("usr_dn_rg", "SIX_MONTHS" as never).catch(async () => {
    await selfExclude("usr_dn_rg", Object.keys((await import("../src/lib/server/responsible-gambling.ts")).SELF_EXCLUSION_PERIODS_SEC)[0] as never);
  });
  await mkProcessingDeposit("usr_dn_rg", "txn_dn_rg", { amount: 40_000, providerRef: "dep_rg_001" });

  const res = await settlePaymentWebhook({ providerRef: "dep_rg_001", status: "CONFIRMED", amount: 40_000 });
  await flush();
  ok("C1 webhook handled it", res.handled);
  const t = await db.txn.findById("txn_dn_rg");
  // Was: status === "REVERSED". The excluded player must still never be CREDITED —
  // that part of the intent is unchanged and is what this really asserts. But
  // REVERSED reads as "settled, nothing owed" and dropped the deposit out of every
  // operator queue while the cash sat in the provider float with no ledger entry at
  // all. It is now AML_REVIEW with an rg_refund_due reason, so it stays in front of a
  // human until the money is actually returned to the player.
  ok("C2 txn is not CONFIRMED — excluded player is never credited", t?.status !== "CONFIRMED", t?.status ?? "none");
  ok("C2b txn is held for review, not silently settled", t?.status === "AML_REVIEW", t?.status ?? "none");
  ok("C2c the reason records that a refund is owed", (t?.amlReason ?? "").startsWith("rg_refund_due"), t?.amlReason ?? "none");
  ok("C3 an excluded player was NOT credited", (await balanceOf("usr_dn_rg")) === 0);

  const ns = await notifsFor("usr_dn_rg");
  const revNote = ns.find((n) => n.kind === "DEPOSIT" && /reversed/i.test(n.titleEn));
  ok("C4 a reversal notification exists", !!revNote);
  ok("C5 notification explains it was not added and was returned",
    /not added/i.test(revNote?.bodyEn ?? "") && /returned/i.test(revNote?.bodyEn ?? ""));
  ok("C6 reversal notification is trilingual", !!revNote?.titleSw && !!revNote?.titleZh);

  const mail = depositMail();
  ok("C7 a reversal email was sent", mail.length === 1, `got ${mail.length}`);
  const html = mail[0]?.html ?? "";
  ok("C8 email explains the self-exclusion", /self-excluded|cooling-off/i.test(html));
  ok("C9 email says the money went back", /returned to the account it came from/i.test(html));
  ok("C10 email carries both references", html.includes("txn_dn_rg") && html.includes("dep_rg_001"));
  // We must not invite a self-excluded player back into the deposit flow.
  ok("C11 email does NOT link them back to depositing", !/\/wallet\/deposit/.test(html));
  ok("C12 email confirms the exclusion still stands", /exclusion stays in place/i.test(html));
}

// ═══ D — PROCESSING (G3) ════════════════════════════════════════════════════
// Fires an inbox entry immediately; the EMAIL is deliberately withheld until the
// deposit has actually been slow.
{
  clearEmailOutbox();
  await mkUser("usr_dn_pending");
  await setPaymentControls({ demoAsync: true }, "test").catch(() => {});
  const r = await deposit("usr_dn_pending", { provider: "MPESA", amount: 15_000, msisdn: "712345678" });
  await flush();
  ok("D1 deposit accepted", r.ok);
  ok("D2 left PROCESSING (no credit yet)", r.ok && r.data.status === "PROCESSING", r.ok ? r.data.status : "");
  ok("D3 nothing credited while in flight", (await balanceOf("usr_dn_pending")) === 0);

  const ns = await notifsFor("usr_dn_pending");
  const pendNote = ns.find((n) => n.kind === "DEPOSIT" && /processing/i.test(n.titleEn));
  ok("D4 a processing notification fires immediately", !!pendNote);
  ok("D5 it tells them NOT to pay again (the double-pay guard)",
    /don't pay again|do not pay again/i.test(pendNote?.bodyEn ?? ""), pendNote?.bodyEn ?? "none");
  ok("D6 processing notification is trilingual", !!pendNote?.titleSw && !!pendNote?.titleZh);
  ok("D7 NO email at t=0 (would be noise for a fast card payment)",
    depositMail().length === 0, `got ${depositMail().length}`);

  await setPaymentControls({ demoAsync: false }, "test").catch(() => {});
}

// ═══ E — the delayed "still waiting" email + its exactly-once guard ═════════
{
  clearEmailOutbox();
  await mkUser("usr_dn_slow");
  // 45 minutes old — past the 30-minute cutoff.
  await mkProcessingDeposit("usr_dn_slow", "txn_dn_slow", {
    amount: 60_000, providerRef: "dep_slow_001", ageMs: 45 * 60 * 1000,
  });

  const first = await notifyStillPendingDeposits();
  await flush();
  ok("E1 the slow deposit was picked up", first.notified === 1, `notified=${first.notified}`);
  const mail = depositMail();
  ok("E2 a 'still waiting' email was sent", mail.length === 1, `got ${mail.length}`);
  const html = mail[0]?.html ?? "";
  ok("E3 email says we're waiting", /waiting on your payment/i.test(html));
  ok("E4 email warns against paying twice", /do NOT pay again/i.test(html));
  ok("E5 email mentions the 30-minute worst case", /30 minutes/i.test(html));
  ok("E6 email carries both references", html.includes("txn_dn_slow") && html.includes("dep_slow_001"));
  ok("E7 the deposit is still PROCESSING — informing is not terminalising",
    (await db.txn.findById("txn_dn_slow"))?.status === "PROCESSING");

  // Exactly-once: the sweep runs every 5 minutes forever.
  clearEmailOutbox();
  const second = await notifyStillPendingDeposits();
  await flush();
  ok("E8 a second sweep notifies nobody", second.notified === 0, `notified=${second.notified}`);
  ok("E9 and sends no second email", depositMail().length === 0, `got ${depositMail().length}`);

  const third = await notifyStillPendingDeposits();
  await flush();
  ok("E10 still silent on a third sweep", third.notified === 0 && depositMail().length === 0);
}

// ═══ F — a deposit that settles before the sweep is never told "still waiting"
{
  clearEmailOutbox();
  await mkUser("usr_dn_race");
  await mkProcessingDeposit("usr_dn_race", "txn_dn_race", {
    amount: 20_000, providerRef: "dep_race_001", ageMs: 45 * 60 * 1000,
  });
  // It settles first…
  await settlePaymentWebhook({ providerRef: "dep_race_001", status: "CONFIRMED", amount: 20_000 });
  await flush();
  ok("F1 deposit confirmed", (await db.txn.findById("txn_dn_race"))?.status === "CONFIRMED");
  clearEmailOutbox();
  // …then the sweep runs.
  const swept = await notifyStillPendingDeposits();
  await flush();
  ok("F2 the sweep skips an already-settled deposit", swept.notified === 0, `notified=${swept.notified}`);
  ok("F3 no confusing 'still waiting' mail after confirmation", depositMail().length === 0);
}

// ═══ G — idempotency: a replayed webhook must not re-notify ═════════════════
{
  clearEmailOutbox();
  await mkUser("usr_dn_replay");
  await mkProcessingDeposit("usr_dn_replay", "txn_dn_replay", { amount: 30_000, providerRef: "dep_replay_001" });

  await settlePaymentWebhook({ providerRef: "dep_replay_001", status: "CONFIRMED", amount: 30_000 });
  await flush();
  const mailAfterFirst = depositMail().length;
  const notesAfterFirst = (await notifsFor("usr_dn_replay")).length;
  ok("G1 first settlement credits once", (await balanceOf("usr_dn_replay")) === 30_000);
  ok("G2 first settlement sends one email", mailAfterFirst === 1, `got ${mailAfterFirst}`);

  // Gateway retries are routine.
  await settlePaymentWebhook({ providerRef: "dep_replay_001", status: "CONFIRMED", amount: 30_000 });
  await settlePaymentWebhook({ providerRef: "dep_replay_001", status: "CONFIRMED", amount: 30_000 });
  await flush();
  ok("G3 replays do not double-credit", (await balanceOf("usr_dn_replay")) === 30_000,
    String(await balanceOf("usr_dn_replay")));
  ok("G4 replays send no extra email", depositMail().length === mailAfterFirst, `got ${depositMail().length}`);
  ok("G5 replays create no extra notification",
    (await notifsFor("usr_dn_replay")).length === notesAfterFirst);
}

// ═══ H — the reconcile sweep notifies too (it is now on the ticker) ═════════
{
  clearEmailOutbox();
  await mkUser("usr_dn_recon");
  // No providerRef → never reached the gateway → safe to fail on the timer.
  await mkProcessingDeposit("usr_dn_recon", "txn_dn_recon", {
    amount: 12_000, providerRef: null, ageMs: 45 * 60 * 1000,
  });
  const before = await balanceOf("usr_dn_recon");
  const swept = await reconcileStalePayments();
  await flush();
  ok("H1 the sweep failed the stranded deposit", swept.depositsFailed >= 1, JSON.stringify(swept));
  ok("H2 txn is FAILED", (await db.txn.findById("txn_dn_recon"))?.status === "FAILED");
  ok("H3 no money moved", (await balanceOf("usr_dn_recon")) === before);
  const ns = await notifsFor("usr_dn_recon");
  ok("H4 the player was told, even though a machine decided it",
    ns.some((n) => n.kind === "DEPOSIT" && /failed/i.test(n.titleEn)));
  const mail = depositMail();
  ok("H5 and emailed", mail.length >= 1, `got ${mail.length}`);
  ok("H6 the email still leads with 'no money was taken'",
    /no money was taken/i.test(mail[0]?.html ?? ""));
}

// ═══ I — no deposit mail ever leaks another player's identifiers ════════════
{
  const leaked = emailOutbox().filter((m) =>
    m.tag === "deposit" && /usr_dn_(ok|fail|rg|slow)@t\.tz/.test(m.html));
  ok("I1 no deposit email embeds another player's address in its body", leaked.length === 0);
}

console.log(`\ndeposit-notifications: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
