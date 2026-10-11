/**
 * THE CASES BEHIND `test:agent-fee-expiry` — K32 (2026-10-11, found by R8-D): a registration fee COLLECTED into an agent
 * application that then EXPIRES is owed back, exactly as a rejection owes it, and the expiry decides inside the locks the
 * fee's own writers take, on the row as it is read there.
 *
 * Run by `scripts/agent-fee-expiry.test.mts` through the two-store runner: once on the memory store, once on a fresh scratch
 * Postgres, each store in its own child process (a store picks its backend when it is first imported). Every line carries
 * its store. ⛔ The in-memory lock is one process's mutex; only Postgres has the advisory locks, a real transaction per lock
 * and the ledger — so the Postgres half is the one that proves the money, and a case that passes in memory and fails there
 * is a FAIL.
 *
 * ── WHAT EACH SECTION HOLDS ─────────────────────────────────────────────────────────────────────────────────────────────
 *  E.1  a wallet-paid draft expires → REFUND_DUE with the rejection's deadline, on the officers' one refunds-owed worklist,
 *       nothing new said to the applicant; `recordFeeRefund` then pays it back to the wallet (one refund transaction, the
 *       ledger mirror on Postgres) and the refund's own letter is what reaches them. E.1b · the abandoned "more information"
 *       file, the commonest way a paid fee meets the clock.
 *  E.2  an EXTERNAL (bank-paid, officer-reconciled) collection → REFUND_DUE, recorded as wired back, NO wallet credit.
 *  E.3  CONTROLS · NONE, WAIVED and INVITED expire exactly as before; a paid draft whose clock has not run out is untouched.
 *  E.4  THE RACE, both ways, and against the officer's lock too — each interleaving FORCED, never left to timing: a store
 *       read is held open (`holdAfter`) so the order of events is the case's, not the scheduler's.
 *  E.5  idempotent · E.6 the audit names the refund owed · S.1 one spelling of "a collected fee is owed back".
 *
 * ⚠️ FIXTURES, each declared: users and wallets are written directly through the store (identity approved on photos by
 * `verified-fixtures`, the address confirmed), the seeded cash enters the books as a deposit; a lapsed clock is the row's
 * own `expiresAt` moved a minute into the past — never a `now` handed to the job, which would lapse every other case's draft.
 * Everything else goes through the real services: the wallet debit, the officer's reconciliation, waiver, request for more
 * information and refund, the invitation, the submit.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFileSync } from "node:fs";
import { decomment } from "./decomment.mts";

type Any = any;
const STORE = process.env.HB_MONEY_STORE ?? "unknown";
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) pass++; else fail++;
  console.log(`${cond ? "PASS" : "FAIL"} [${STORE}] ${label}${detail ? ` — ${detail}` : ""}`);
};
const section = (t: string) => console.log(`${String.fromCharCode(10)}[${STORE}] ${t}`);

process.env.EMAIL_OUTBOX_CAPTURE = "1";
const onPostgres = !!process.env.DATABASE_URL && process.env.USE_PRISMA_DAL !== "false";
// ⭐ The store first — then the fixtures that wrap it (identity approved at create), then the services.
const { db }: Any = await import("../../src/lib/server/store.ts");
await import("./verified-fixtures.mts");
const svc: Any = await import("../../src/lib/server/agent-application-service.ts");
const { getAgentConfig }: Any = await import("../../src/lib/server/agent-config.ts");
const { postLedgerEntries, depositEntries }: Any = await import("../../src/lib/server/ledger.ts");
const { prisma }: Any = await import("../../src/lib/server/prisma.ts");
const email: Any = await import("../../src/lib/server/email.ts");
const AUD: Any = await import("../../src/lib/server/audit.ts");
const { AGENT_TERMS_VERSION }: Any = await import("../../src/lib/agent-terms-version.ts");

const cfg = getAgentConfig();
const FEE: number = svc.feeBreakdown(cfg).totalTzs;
const DUE_MS: number = cfg.refundDeadlineDays * 86_400_000;
/** A real 1×1 PNG — `attachAgentDocument` sniffs bytes, not the data-URL label. */
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const MASKED_ACCOUNT = "07•• ••• 877";

const j = (v: unknown) => JSON.stringify(v);
const sleep = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));
let seq = 0;
const uid = (p: string) => `${p}_${process.pid}_${++seq}`;
async function until<T>(read: () => Promise<T>, done: (v: T) => boolean, ms = 4_000): Promise<T> {
  let v = await read();
  for (let waited = 0; !done(v) && waited < ms; waited += 50) { await sleep(50); v = await read(); }
  return v;
}
/** Whether `p` settles within `ms` — read WITHOUT consuming it (the caller still awaits `p` afterwards). */
async function settlesWithin(p: Promise<unknown>, ms: number): Promise<boolean> {
  let settled = false;
  p.then(() => { settled = true; }, () => { settled = true; });
  for (let waited = 0; !settled && waited < ms; waited += 50) await sleep(50);
  return settled;
}
/** A promise's outcome, bounded: a case that deadlocks is a FAIL with a reason, never a suite that hangs. */
async function outcome<T>(p: Promise<T>, ms = 30_000): Promise<{ done: boolean; value?: T; error?: string }> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<{ done: boolean }>((r) => { timer = setTimeout(() => r({ done: false }), ms); });
  try {
    return await Promise.race([p.then((value) => ({ done: true, value }), (e) => ({ done: true, error: String((e as Error)?.message ?? e) })), late]);
  } finally { if (timer) clearTimeout(timer); }
}

/**
 * ⏸ HOLD AFTER A READ. The next call of `db[model][method]` whose arguments match runs FOR REAL, and its answer is held until
 * `release()` — so the caller is frozen right after that read, wherever it stands (inside its lock or not). `hit` resolves
 * when it is reached. The store's own method is put back by `restore()`, which every case calls in `finally`.
 */
function holdAfter(model: string, method: string, match: (args: Any[]) => boolean) {
  const target = db[model];
  const real = target[method];
  let release!: () => void;
  const gate = new Promise<void>((r) => { release = r; });
  let reached!: () => void;
  const hit = new Promise<void>((r) => { reached = r; });
  let armed = true;
  target[method] = async (...args: Any[]) => {
    const answer = await real.apply(target, args);
    if (armed && match(args)) { armed = false; reached(); await gate; }
    return answer;
  };
  return { hit, release: () => release(), restore: () => { target[method] = real; } };
}
const reached = async (hit: Promise<void>, ms = 10_000) => (await outcome(hit, ms)).done;

/** A user with a wallet holding `balance`, an approved identity (verified-fixtures) and a confirmed address. */
async function person(p: string, opts: { balance?: number; role?: string } = {}): Promise<string> {
  const id = uid(p);
  const now = new Date().toISOString();
  const balance = opts.balance ?? 0;
  await db.user.create({
    id, phoneE164: `+2557${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`, email: `${id}@t.tz`,
    passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: opts.role ?? "PLAYER", status: "ACTIVE", locale: "EN", displayName: null, dob: null, region: null,
    acceptedTermsVersion: null, acceptedTermsAt: null, marketingOptIn: false, twoFactorEnabled: false,
    avatarDataUrl: null, recruitedBy: null, createdAt: now, updatedAt: now, lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({
    id: `wal_${id}`, userId: id, balance, pending: 0, hold: 0, bonusBalance: 0,
    currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now,
  } as never);
  // The seeded cash enters the books as a deposit, so the books see only what a case does.
  if (balance > 0) await postLedgerEntries(`seed_${id}`, depositEntries({ txnId: `seed_${id}`, userId: id, amount: balance, provider: "TEST_SEED" }));
  await db.user.update(id, { emailVerifiedAt: now });
  return id;
}
const OFFICER = await person("k32_officer", { role: "COMPLIANCE" });

async function draft(u: string): Promise<string> {
  const s = await svc.startApplication(u);
  if (!s.ok) throw new Error(`fixture: startApplication refused ${j(s)}`);
  return s.data.applicationId as string;
}
async function attachSeven(u: string): Promise<void> {
  for (const slot of svc.REQUIRED_DOC_SLOTS as string[]) {
    const r = await svc.attachAgentDocument(u, slot, PNG);
    if (!r.ok) throw new Error(`fixture: attach ${slot} refused ${j(r)}`);
  }
}
async function referees(u: string): Promise<void> {
  const r = await svc.setReferees(u, { oneName: "Amina J", oneContact: "+255711000001", twoName: "Baraka K", twoContact: "+255711000002", consent: true });
  if (!r.ok) throw new Error(`fixture: referees refused ${j(r)}`);
}
async function pay(u: string): Promise<void> {
  const r = await svc.payFeeFromWallet(u);
  if (!r.ok) throw new Error(`fixture: payFeeFromWallet refused ${j(r)}`);
}
/** The draft's clock runs out: its own `expiresAt`, a minute ago. */
const lapse = (id: string) => db.agentApplication.update(id, { expiresAt: new Date(Date.now() - 60_000).toISOString() });
const row = (id: string): Promise<Any> => db.agentApplication.findById(id);
const fee = (r: Any) => ({ status: r?.status, disposition: r?.feeDisposition, source: r?.feeFundingSource, amount: r?.feeAmountTzs, dueAt: r?.feeRefundDueAt, refundedAt: r?.feeRefundedAt });
const expire = (): Promise<Any> => svc.expireStaleAgentApplications();
const balanceOf = async (u: string) => Number((await db.wallet.findByUserId(u))?.balance);
const feeTxns = async (u: string): Promise<Any[]> => (await db.txn.findByUser(u, 200)).filter((t: Any) => t.type === "AGENT_REGISTRATION_FEE");
const mailsTo = (u: string): Any[] => email.emailOutbox().filter((m: Any) => m.to === `${u}@t.tz`);
const noticesOf = async (u: string) => (await db.notification.findByUser(u, 200)).length;
async function expiryAudits(id: string): Promise<Any[]> {
  await AUD.auditFlush();
  return AUD.getAuditPage({ category: "SYSTEM", limit: 10_000 }).filter((e: Any) => e.action === "agent.application.expired" && e.targetId === id);
}
/** Postgres: the rows of one ledger group. ⛔ Only ever called on Postgres — the memory store keeps no ledger. */
async function ledger(groupId: string): Promise<Array<{ account: string; amount: number }>> {
  const rows: Any[] = await prisma()!.$queryRawUnsafe(`SELECT account, amount::float8 AS amount FROM "LedgerEntry" WHERE "groupId" = $1`, groupId);
  return rows.map((r) => ({ account: String(r.account), amount: Number(r.amount) }));
}
const legSum = (lines: Array<{ account: string; amount: number }>, account: string) =>
  lines.filter((l) => l.account === account).reduce((s, l) => s + l.amount, 0);
const total = (lines: Array<{ amount: number }>) => lines.reduce((s, l) => s + l.amount, 0);
const dueWithin = (dueAt: string | null | undefined, t0: number, t1: number) =>
  !!dueAt && Date.parse(dueAt) >= t0 + DUE_MS && Date.parse(dueAt) <= t1 + DUE_MS;

ok(`0.store · the cases run on the ${STORE} store`, onPostgres === (STORE === "postgres"), `onPostgres ${onPostgres}`);

/* ══ S · ONE SPELLING ═══════════════════════════════════════════════════════════════════════════════════════════════════ */
section("S · a collected fee is owed back in ONE place, for the rejection and the expiry alike");
{
  const code = decomment(readFileSync(new URL("../../src/lib/server/agent-application-service.ts", import.meta.url), "utf8"));
  const count = (needle: string) => code.split(needle).length - 1;
  ok("S.1 · the service writes REFUND_DUE in exactly one place (`feeOwedBack`), and both exits that keep no money call it — the rejection and the expiry",
    count('feeDisposition: "REFUND_DUE"') === 1 && count("function feeOwedBack(") === 1 && count("feeOwedBack(") === 3,
    j({ writes: count('feeDisposition: "REFUND_DUE"'), helper: count("function feeOwedBack("), uses: count("feeOwedBack(") }));
}

/* ══ E.1 · A WALLET-PAID DRAFT EXPIRES ═════════════════════════════════════════════════════════════════════════════════ */
section("E.1 · a draft whose fee was paid from the wallet expires — the fee is owed back, and the officer pays it");
const e1 = await (async () => {
  const u = await person("k32_e1", { balance: FEE * 2 });
  const id = await draft(u);
  const cv = await svc.attachAgentDocument(u, "CV", PNG);
  await pay(u);
  const paid = await row(id);
  const mailsBefore = mailsTo(u).length, noticesBefore = await noticesOf(u);
  await lapse(id);
  const t0 = Date.now();
  const run = await expire();
  const t1 = Date.now();
  const r = await row(id);
  ok("E.1 · a draft whose fee was paid from the WALLET expires REFUND_DUE — the money kept nowhere without a debt beside it",
    paid?.feeDisposition === "COLLECTED" && paid?.feeFundingSource === "WALLET"
      && r?.status === "EXPIRED" && r?.feeDisposition === "REFUND_DUE" && r?.feeFundingSource === "WALLET" && r?.feeAmountTzs === FEE,
    j({ paid: fee(paid), after: fee(r) }));
  ok(`E.1′ · …due ${cfg.refundDeadlineDays} days (refundDeadlineDays) from the expiry, exactly as a rejection dates it`,
    dueWithin(r?.feeRefundDueAt, t0, t1), j({ dueAt: r?.feeRefundDueAt, t0: new Date(t0).toISOString() }));
  const docs: Any[] = await db.agentApplicationDoc.listByApplication(id);
  ok("E.1″ · …and it expires as before otherwise: counted once, its documents destroyed",
    cv.ok && run.drafts === 1 && run.documents >= 1 && docs.length >= 1 && docs.every((d: Any) => !!d.purgedAt), j({ run, docs: docs.length }));
  await sleep(300);
  ok("E.1‴ · the expiry tells the applicant nothing new — no letter, no notice (the refund's own words come when it is paid)",
    mailsTo(u).length === mailsBefore && (await noticesOf(u)) === noticesBefore, j({ mails: [mailsBefore, mailsTo(u).length] }));
  const worklist = (await db.agentApplication.list()).filter((a: Any) => a.feeDisposition === "REFUND_DUE").map((a: Any) => a.id);
  const view = await svc.applicantView(u);
  ok("E.1⁗ · on the officers' ONE refunds-owed worklist (every REFUND_DUE row) and in the applicant's own view — expired, the fee due back by the deadline",
    worklist.includes(id) && view.state === "expired" && view.refund?.amountTzs === FEE && view.refund?.dueAt === r?.feeRefundDueAt && view.refund?.refundedAt === null,
    j({ onList: worklist.includes(id), state: view.state, refund: view.refund }));
  return { u, id, dueAt: r?.feeRefundDueAt as string | null };
})();

/* ══ E.5 · THE NEXT RUN ════════════════════════════════════════════════════════════════════════════════════════════════ */
section("E.5 · idempotent — the next run neither re-expires nor re-flags");
{
  const again = await expire();
  const r = await row(e1.id);
  ok("E.5 · the next run counts nothing, and the expired draft keeps its debt and its deadline exactly",
    again.drafts === 0 && r?.status === "EXPIRED" && r?.feeDisposition === "REFUND_DUE" && r?.feeRefundDueAt === e1.dueAt, j({ again, after: fee(r) }));
}

/* ══ E.1 (cont.) · THE SECOND-FEE GATE, AND THE OFFICER'S REFUND ═════════════════════════════════════════════════════════ */
{
  const { u, id } = e1;
  const next = await draft(u);
  const second = await svc.payFeeFromWallet(u);
  ok("E.1g · the second-fee gate sees the debt: a NEW draft may not pay a second fee while this one is owed (`refund_owed`), and nothing moves",
    next !== id && second.ok === false && second.refusal === "refund_owed" && (await balanceOf(u)) === FEE && (await feeTxns(u)).length === 1,
    j({ second, balance: await balanceOf(u) }));
  const rf = await svc.recordFeeRefund(OFFICER, id, { reference: "RF-K32-E1", amountTzs: FEE });
  const r = await row(id);
  const txns = await feeTxns(u);
  const debit = txns.filter((t: Any) => t.amount === -FEE && t.providerRef === `agentfee_${id}`);
  const credit = txns.filter((t: Any) => t.amount === FEE && t.providerRef === `agentfee_refund_${id}`);
  ok("E.1r · `recordFeeRefund` pays it back to the WALLET: REFUNDED, the whole fee, the balance restored — ONE refund transaction beside the ONE debit",
    rf.ok === true && r?.feeDisposition === "REFUNDED" && r?.feeRefundAmountTzs === FEE && (await balanceOf(u)) === FEE * 2
      && txns.length === 2 && debit.length === 1 && credit.length === 1,
    j({ rf, after: fee(r), balance: await balanceOf(u), txns: txns.map((t: Any) => [t.amount, t.providerRef]) }));
  const letter = await until(async () => mailsTo(u).filter((m: Any) => m.tag === "agent-fee-refunded"), (v: Any[]) => v.length > 0);
  ok("E.1m · …and the refund's own letter is what reaches the applicant: \"has been refunded\", its reference, to their 50pick wallet",
    letter.length === 1 && String(letter[0].subject).startsWith("Your agent registration fee has been refunded")
      && String(letter[0].html).includes("RF-K32-E1") && String(letter[0].html).includes("Your 50pick wallet"),
    j({ letters: letter.length, subject: letter[0]?.subject }));
  if (onPostgres) {
    const lines = await ledger(`agentfee_refund_${id}`);
    ok("E.1l · PG · the refund's ledger group is the debit's mirror: PLAYER +fee, HOUSE:AGENT_FEE −fee, summing to zero",
      lines.length >= 2 && legSum(lines, `PLAYER:${u}`) === FEE && legSum(lines, "HOUSE:AGENT_FEE") === -FEE && Math.abs(total(lines)) < 0.005, j(lines));
  }
  const after = await expire();
  ok("E.5′ · …nor after the refund: the next run leaves the REFUNDED draft REFUNDED, and counts nothing",
    after.drafts === 0 && (await row(id))?.feeDisposition === "REFUNDED", j({ after, now: fee(await row(id)) }));
  const third = await svc.payFeeFromWallet(u);
  ok("E.1g′ · CONTROL · the gate lifts once the refund is paid: the new draft pays its own fee",
    third.ok === true && (await balanceOf(u)) === FEE && (await row(next))?.feeDisposition === "COLLECTED", j({ third, balance: await balanceOf(u) }));
}

/* ══ E.6 · THE AUDIT ═══════════════════════════════════════════════════════════════════════════════════════════════════ */
section("E.6 · the expiry's audit names the refund owed");
{
  const rows = await expiryAudits(e1.id);
  ok("E.6 · ONE `agent.application.expired` row, naming the refund owed and its amount (`refundDue: true`, the fee)",
    rows.length === 1 && rows[0].payload?.refundDue === true && rows[0].payload?.amountTzs === FEE, j(rows.map((e: Any) => e.payload)));
}

/* ══ E.1b · THE ABANDONED "MORE INFORMATION" FILE ══════════════════════════════════════════════════════════════════════ */
section("E.1b · a paid application sent back for more information and never answered");
{
  const u = await person("k32_e1b", { balance: FEE });
  const id = await draft(u);
  await attachSeven(u);
  await referees(u);
  await pay(u);
  const sub = await svc.submitForReview(u, { acceptedTermsVersion: AGENT_TERMS_VERSION });
  const info = await svc.requestMoreInfo(OFFICER, id, { note: "The CV is unreadable — please re-scan.", slots: ["CV"] });
  const sent = await row(id);
  await lapse(id);
  const t0 = Date.now();
  const run = await expire();
  const t1 = Date.now();
  const r = await row(id);
  ok("E.1b · an ADDITIONAL_INFO_REQUIRED application whose paid applicant never came back expires REFUND_DUE, with the deadline",
    sub.ok && info.ok && sent?.status === "ADDITIONAL_INFO_REQUIRED" && run.drafts === 1
      && r?.status === "EXPIRED" && r?.feeDisposition === "REFUND_DUE" && dueWithin(r?.feeRefundDueAt, t0, t1),
    j({ sub: sub.ok, info: info.ok, sent: sent?.status, run, after: fee(r) }));
}

/* ══ E.2 · AN EXTERNAL COLLECTION ══════════════════════════════════════════════════════════════════════════════════════ */
section("E.2 · a bank-paid fee an officer reconciled (EXTERNAL), in a draft that expires");
{
  const u = await person("k32_e2");
  const id = await draft(u);
  await attachSeven(u);
  const receipt = await svc.attachAgentDocument(u, "FEE_RECEIPT", PNG);
  const ref = await svc.recordFeePayment(u, { feeReference: `K32-E2-${process.pid}` });
  const rec = await svc.reconcileFee(OFFICER, id, { attestedTzs: FEE, statementRef: "STMT-K32-E2", sourceAccountMasked: MASKED_ACCOUNT });
  const collected = await row(id);
  await lapse(id);
  const t0 = Date.now();
  const run = await expire();
  const t1 = Date.now();
  const r = await row(id);
  ok("E.2 · the EXTERNAL collection is owed back too: EXPIRED, REFUND_DUE, its deadline, the rail it came by kept (EXTERNAL)",
    receipt.ok && ref.ok && rec.ok && collected?.feeDisposition === "COLLECTED" && collected?.feeFundingSource === "EXTERNAL" && run.drafts === 1
      && r?.status === "EXPIRED" && r?.feeDisposition === "REFUND_DUE" && r?.feeFundingSource === "EXTERNAL" && r?.feeAmountTzs === FEE
      && dueWithin(r?.feeRefundDueAt, t0, t1),
    j({ rec, collected: fee(collected), after: fee(r) }));
  const rf = await svc.recordFeeRefund(OFFICER, id, { reference: "RF-K32-E2", amountTzs: FEE });
  ok("E.2′ · `recordFeeRefund` records it as wired back — REFUNDED — and credits NO wallet (never MINT): the balance still 0, no fee transaction at all",
    rf.ok === true && (await row(id))?.feeDisposition === "REFUNDED" && (await balanceOf(u)) === 0 && (await feeTxns(u)).length === 0,
    j({ rf, balance: await balanceOf(u), txns: (await feeTxns(u)).length }));
  const letter = await until(async () => mailsTo(u).filter((m: Any) => m.tag === "agent-fee-refunded"), (v: Any[]) => v.length > 0);
  ok("E.2″ · …and the refund's letter names the bank account the money went back to, never a wallet",
    letter.length === 1 && String(letter[0].html).includes(MASKED_ACCOUNT) && !String(letter[0].html).includes("Your 50pick wallet"),
    j({ letters: letter.length }));
  if (onPostgres) {
    const lines = await ledger(`agentfee_refund_${id}`);
    ok("E.2l · PG · the refund's ledger group reverses the EXTERNAL leg and holds NO player leg — no shilling minted into a wallet",
      lines.length >= 2 && legSum(lines, "EXTERNAL:SELCOM") === FEE && !lines.some((l) => l.account.startsWith("PLAYER:")) && Math.abs(total(lines)) < 0.005, j(lines));
  }
}

/* ══ E.3 · CONTROLS ════════════════════════════════════════════════════════════════════════════════════════════════════ */
section("E.3 · CONTROLS — nothing collected expires exactly as before; a live clock is not touched");
const e3 = await (async () => {
  const uNone = await person("k32_e3_none");
  const idNone = await draft(uNone);
  const cv = await svc.attachAgentDocument(uNone, "CV", PNG);
  const uWaived = await person("k32_e3_waived");
  const idWaived = await draft(uWaived);
  const waived = await svc.waiveFee(OFFICER, idWaived, "waived for the K32 expiry guard's control fixture");
  const uInvited = await person("k32_e3_invited");
  const inv = await svc.issueInvitation(OFFICER, { email: `${uInvited}@t.tz` });
  const idInvited = (await db.agentApplication.findActiveByUser(uInvited))?.id as string;
  const uLive = await person("k32_e3_live", { balance: FEE });
  const idLive = await draft(uLive);
  await pay(uLive);
  for (const id of [idNone, idWaived, idInvited]) await lapse(id);
  const run = await expire();
  const [rNone, rWaived, rInvited, rLive] = [await row(idNone), await row(idWaived), await row(idInvited), await row(idLive)];
  const noneDocs: Any[] = await db.agentApplicationDoc.listByApplication(idNone);
  ok("E.3 · CONTROL · a draft with no fee expires as before: EXPIRED, nothing owed (NONE, no deadline), its documents destroyed",
    cv.ok && rNone?.status === "EXPIRED" && rNone?.feeDisposition === "NONE" && rNone?.feeRefundDueAt === null && noneDocs.every((d: Any) => !!d.purgedAt),
    j(fee(rNone)));
  const noRefund = await svc.recordFeeRefund(OFFICER, idWaived, { reference: "RF-K32-E3", amountTzs: 0 });
  ok("E.3′ · CONTROL · a WAIVED draft expires as before: EXPIRED, still WAIVED, no deadline — and the officer has no refund to record",
    waived.ok && rWaived?.status === "EXPIRED" && rWaived?.feeDisposition === "WAIVED" && rWaived?.feeRefundDueAt === null && noRefund.ok === false,
    j({ after: fee(rWaived), noRefund }));
  ok("E.3″ · CONTROL · an officer's invitation never accepted (INVITED) expires as before, nothing owed",
    inv.ok && !!idInvited && rInvited?.status === "EXPIRED" && rInvited?.feeDisposition === "NONE" && rInvited?.feeRefundDueAt === null, j({ inv: inv.ok, after: fee(rInvited) }));
  ok("E.3‴ · CONTROL · a PAID draft whose clock has NOT run out is untouched by the same run — and the run counted exactly the three",
    rLive?.status === "DRAFT" && rLive?.feeDisposition === "COLLECTED" && run.drafts === 3, j({ live: fee(rLive), run }));
  return { idNone, idWaived };
})();
{
  const none = await expiryAudits(e3.idNone), waived = await expiryAudits(e3.idWaived);
  ok("E.6′ · …and the audit says so when nothing is owed: `refundDue: false`, no amount (NONE and WAIVED)",
    none.length === 1 && waived.length === 1 && [none[0], waived[0]].every((e: Any) => e.payload?.refundDue === false && e.payload?.amountTzs === null),
    j([...none, ...waived].map((e: Any) => e.payload)));
}

/* ══ E.4 · THE RACE ════════════════════════════════════════════════════════════════════════════════════════════════════ */
section("E.4 · THE RACE — a payment and the expiry interleaved both ways, and the officer's lock; each order forced");

// E.4a · the payment holds its lock first (frozen just before its debit); the run reads its list then; the payment lands.
{
  const u = await person("k32_e4a", { balance: FEE * 2 });
  const id = await draft(u);
  await lapse(id);
  const payHold = holdAfter("user", "findById", (a) => a[0] === u);      // payFeeFromWallet's address read — inside agentapp:<u>
  const listHold = holdAfter("agentApplication", "list", () => true);   // the run's candidate read
  let during: Any = null;
  let payment: { done: boolean; value?: Any; error?: string } = { done: false };
  let run: { done: boolean; value?: Any; error?: string } = { done: false };
  try {
    const P = svc.payFeeFromWallet(u) as Promise<Any>;
    const paused = await reached(payHold.hit);
    const J = expire();
    const listed = await reached(listHold.hit);
    listHold.release();                                                // the run goes on, its snapshot taken while the draft read NONE
    during = await until(async () => (await row(id))?.status, (s) => s === "EXPIRED", 1_500);
    payHold.release();
    payment = await outcome(P);
    run = await outcome(J);
    if (!paused || !listed) during = `${during} (paused ${paused}, listed ${listed})`;
  } finally { payHold.release(); listHold.release(); payHold.restore(); listHold.restore(); }
  const r = await row(id);
  ok("E.4a · a payment inside its lock when the run reads its list: the run WAITS — nothing is written while the payment holds the draft",
    during === "DRAFT", j({ during }));
  ok("E.4a′ · …then reads what the payment wrote: the paid draft expires REFUND_DUE — never a stranded COLLECTED on an EXPIRED row",
    payment.value?.ok === true && run.done && !run.error && r?.status === "EXPIRED" && r?.feeDisposition === "REFUND_DUE" && !!r?.feeRefundDueAt,
    j({ payment, run, after: fee(r) }));
  ok("E.4a″ · …and the money moved once: one debit, the wallet down by exactly the fee",
    (await balanceOf(u)) === FEE && (await feeTxns(u)).length === 1, j({ balance: await balanceOf(u), txns: (await feeTxns(u)).length }));
}

// E.4b · the run holds the draft first (frozen right after its re-read, inside its locks); a payment arrives then.
{
  const u = await person("k32_e4b", { balance: FEE * 2 });
  const id = await draft(u);
  await lapse(id);
  const runHold = holdAfter("agentApplication", "findById", (a) => a[0] === id);
  let held = false, settledWhileHeld = true;
  let payment: { done: boolean; value?: Any; error?: string } = { done: false };
  let run: { done: boolean; value?: Any; error?: string } = { done: false };
  try {
    const J = expire();
    held = await reached(runHold.hit, 5_000);
    const P = svc.payFeeFromWallet(u) as Promise<Any>;
    settledWhileHeld = await settlesWithin(P, 1_500);
    runHold.release();
    run = await outcome(J);
    payment = await outcome(P);
  } finally { runHold.release(); runHold.restore(); }
  const r = await row(id);
  ok("E.4b · the run holds the draft (its re-read, inside the locks): a payment arriving then WAITS — it does not complete while the run decides",
    held && !settledWhileHeld, j({ held, settledWhileHeld }));
  ok("E.4b′ · …and is refused once the draft is EXPIRED (`not_editable`) before any money moves: no debit, no fee row, the draft closed with nothing owed",
    run.done && !run.error && payment.value?.ok === false && payment.value?.refusal === "not_editable"
      && (await balanceOf(u)) === FEE * 2 && (await feeTxns(u)).length === 0
      && r?.status === "EXPIRED" && r?.feeDisposition === "NONE" && r?.feeRefundDueAt === null,
    j({ payment, run, balance: await balanceOf(u), after: fee(r) }));
}

// E.4c · two runs overlap (the late one frozen after its list), and the officer refunds in between: never a double refund.
{
  const u = await person("k32_e4c", { balance: FEE * 2 });
  const id = await draft(u);
  await pay(u);
  await lapse(id);
  const listHold = holdAfter("agentApplication", "list", () => true);
  let first: Any = null, refund: Any = null, refundedAt: string | null = null;
  let late: { done: boolean; value?: Any; error?: string } = { done: false };
  try {
    const J2 = expire();
    const listed = await reached(listHold.hit);
    first = await expire();                                            // not held: the hold is spent on the late run
    refund = await svc.recordFeeRefund(OFFICER, id, { reference: "RF-K32-E4C", amountTzs: FEE });
    refundedAt = (await row(id))?.feeRefundedAt ?? null;
    listHold.release();
    late = await outcome(J2);
    if (!listed) late = { ...late, error: `${late.error ?? ""} (the late run's list was never held)` };
  } finally { listHold.release(); listHold.restore(); }
  const r = await row(id);
  const again = await svc.recordFeeRefund(OFFICER, id, { reference: "RF-K32-E4C-2", amountTzs: FEE });
  const credits = (await feeTxns(u)).filter((t: Any) => t.amount === FEE);
  ok("E.4c · two runs overlapping across an officer's refund: the late run re-reads the draft and leaves it — still REFUNDED, refunded once, and it counts nothing",
    first?.drafts === 1 && refund?.ok === true && late.done && !late.error && late.value?.drafts === 0
      && r?.feeDisposition === "REFUNDED" && r?.feeRefundedAt === refundedAt,
    j({ first, refund, late, after: fee(r) }));
  ok("E.4c′ · never a double refund: a second refund is refused (nothing owed) and the wallet was credited exactly once",
    again.ok === false && (await balanceOf(u)) === FEE * 2 && credits.length === 1, j({ again, balance: await balanceOf(u), credits: credits.length }));
  ok("E.4c″ · …and one expiry, one audit row", (await expiryAudits(id)).length === 1, j((await expiryAudits(id)).length));
}

// E.4d · an officer reconciling a bank-paid fee holds the application (agent:<id>) when the run reaches it.
{
  const u = await person("k32_e4d");
  const id = await draft(u);
  await attachSeven(u);
  await svc.attachAgentDocument(u, "FEE_RECEIPT", PNG);
  const ref = await svc.recordFeePayment(u, { feeReference: `K32-E4D-${process.pid}` });
  await lapse(id);
  const recHold = holdAfter("user", "findById", (a) => a[0] === u);     // officerLoads' applicant read — inside agent:<id>
  let during: Any = null;
  let rec: { done: boolean; value?: Any; error?: string } = { done: false };
  let run: { done: boolean; value?: Any; error?: string } = { done: false };
  try {
    const RC = svc.reconcileFee(OFFICER, id, { attestedTzs: FEE, statementRef: "STMT-K32-E4D", sourceAccountMasked: MASKED_ACCOUNT }) as Promise<Any>;
    const paused = await reached(recHold.hit);
    const J = expire();
    during = await until(async () => (await row(id))?.status, (s) => s === "EXPIRED", 1_500);
    recHold.release();
    rec = await outcome(RC);
    run = await outcome(J);
    if (!paused) during = `${during} (the officer was never held)`;
  } finally { recHold.release(); recHold.restore(); }
  const r = await row(id);
  ok("E.4d · an officer reconciling a bank-paid fee holds the application (its own lock, agent:<id>): the run waits — nothing written meanwhile",
    ref.ok && during === "PAYMENT_PENDING", j({ during }));
  ok("E.4d′ · …then reads the collection and owes it back: EXPIRED, REFUND_DUE, EXTERNAL — never a reconciled fee stranded on an EXPIRED row",
    rec.value?.ok === true && run.done && !run.error && r?.status === "EXPIRED" && r?.feeDisposition === "REFUND_DUE" && r?.feeFundingSource === "EXTERNAL",
    j({ rec, run, after: fee(r) }));
}

// E.4e · the applicant submits while a run stands between its list and its decision.
{
  const u = await person("k32_e4e", { balance: FEE });
  const id = await draft(u);
  await attachSeven(u);
  await referees(u);
  await pay(u);
  await lapse(id);
  const listHold = holdAfter("agentApplication", "list", () => true);
  let sub: Any = null;
  let run: { done: boolean; value?: Any; error?: string } = { done: false };
  try {
    const J = expire();
    const listed = await reached(listHold.hit);
    sub = await svc.submitForReview(u, { acceptedTermsVersion: AGENT_TERMS_VERSION });
    listHold.release();
    run = await outcome(J);
    if (!listed) run = { ...run, error: `${run.error ?? ""} (the run's list was never held)` };
  } finally { listHold.release(); listHold.restore(); }
  const r = await row(id);
  ok("E.4e · an applicant who submits while a run is between its list and its decision is NOT expired: the run re-reads UNDER_REVIEW and leaves it, the fee still COLLECTED, no expiry",
    sub?.ok === true && run.done && !run.error && run.value?.drafts === 0 && r?.status === "UNDER_REVIEW" && r?.feeDisposition === "COLLECTED"
      && (await expiryAudits(id)).length === 0,
    j({ sub: sub?.ok, run, after: fee(r) }));
}

console.log(`${String.fromCharCode(10)}@@SUMMARY ${JSON.stringify({ pass, fail, store: STORE })}`);
process.exit(fail === 0 ? 0 : 1);
