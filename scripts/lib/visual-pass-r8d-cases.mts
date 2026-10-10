/**
 * THE SERVICE CASES BEHIND `test:visual-pass-r8d` — R8-D (2026-10-10, the owner's ruling (4) completed): during a break, no
 * service takes an offer to earn or recruit, no money moves toward one, and nothing the services send solicits.
 *
 * Run two ways, one case list: in memory inside `test:visual-pass-r8d` (in-process), and on the memory store AND a fresh
 * scratch Postgres by `test:visual-pass-r8d-stores` (`scripts/visual-pass-r8d-stores.test.mts`, each store in its own child,
 * `scripts/lib/visual-pass-r8d-child.mts`). ⛔ The store picks its backend when first imported, so a caller sets
 * `DATABASE_URL` / `USE_PRISMA_DAL` and only THEN runs these.
 *
 * Every case goes through the real services on the real store — the money path above all: `payFeeFromWallet` holds its
 * advisory lock (Postgres) and runs the real debit when it is allowed to. Fixtures, each declared: a user and a wallet are
 * written directly (`user`, as the two-store world does) with an approved identity (`verified-fixtures`) and a confirmed
 * address — the agent programme's own preconditions, so a case measures the break and not another door; a break is the
 * settings row's timers (`brk`), written through the store the way `coolOff` / `selfExclude` write them.
 * "NOTHING MOVED" IS FOUR OBSERVABLES, EACH SHOWN ABLE TO SEE A PAYMENT IN THE SAME RUN: the wallet, the fee Transaction, the
 * application's fee columns and — on Postgres — the fee's ledger group. The control that pays moves every one of them.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;
export type Ok = (label: string, cond: boolean, detail?: string) => void;

const HOUR = 3_600_000;
let seq = 0;

export async function runR8dServiceCases(ok: Ok): Promise<{ onPostgres: boolean }> {
  process.env.EMAIL_OUTBOX_CAPTURE = "1";
  const onPostgres = !!process.env.DATABASE_URL && process.env.USE_PRISMA_DAL !== "false";
  // ⭐ The store first — then the fixtures that wrap it (identity approved at create), then the services.
  const { db }: Any = await import("../../src/lib/server/store.ts");
  await import("./verified-fixtures.mts");
  const svc: Any = await import("../../src/lib/server/agent-application-service.ts");
  const { getAgentConfig }: Any = await import("../../src/lib/server/agent-config.ts");
  const rgsvc: Any = await import("../../src/lib/server/responsible-gambling.ts");
  const props: Any = await import("../../src/lib/server/proposals-service.ts");
  const { setProposalsConfig }: Any = await import("../../src/lib/server/proposals-config.ts");
  const email: Any = await import("../../src/lib/server/email.ts");
  const aff: Any = await import("../../src/lib/server/affiliate-service.ts");
  const { prisma }: Any = await import("../../src/lib/server/prisma.ts");
  const { postLedgerEntries, depositEntries }: Any = await import("../../src/lib/server/ledger.ts");

  const FEE: number = svc.feeBreakdown(getAgentConfig()).totalTzs;
  const RG_SENTENCE = "Applications are not available while a responsible-gambling break is active.";
  const j = (v: unknown) => JSON.stringify(v);
  const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));
  const iso = (ms: number) => new Date(Date.now() + ms).toISOString();
  const uid = (p: string) => `${p}_${process.pid}_${++seq}`;
  async function until<T>(read: () => Promise<T>, done: (v: T) => boolean, ms = 4_000): Promise<T> {
    let v = await read();
    for (let waited = 0; !done(v) && waited < ms; waited += 50) { await sleep(50); v = await read(); }
    return v;
  }

  /** A user with a wallet holding `balance`, an approved identity (verified-fixtures) and a confirmed address. */
  async function user(p: string, balance = 0): Promise<string> {
    const id = uid(p);
    const now = iso(0);
    await db.user.create({
      id, phoneE164: `+2557${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`, email: `${id}@t.tz`,
      passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
      role: "PLAYER", status: "ACTIVE", locale: "EN", displayName: null, dob: null, region: null,
      acceptedTermsVersion: null, acceptedTermsAt: null, marketingOptIn: false, twoFactorEnabled: false,
      avatarDataUrl: null, recruitedBy: null, createdAt: now, updatedAt: now, lastLoginAt: null, closedAt: null,
    } as never);
    await db.wallet.create({
      id: `wal_${id}`, userId: id, balance, pending: 0, hold: 0, bonusBalance: 0,
      currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now,
    } as never);
    // The seeded cash enters the books as a deposit (the two-store world's rule), so the books see only what a case does.
    if (balance > 0) await postLedgerEntries(`seed_${id}`, depositEntries({ txnId: `seed_${id}`, userId: id, amount: balance, provider: "TEST_SEED" }));
    await db.user.update(id, { emailVerifiedAt: now });
    return id;
  }
  type Brk = "cooling" | "exclusion" | "served" | "ended" | "none";
  /** The break, as `coolOff` / `selfExclude` write it: the settings row's timers. */
  async function brk(id: string, kind: Brk): Promise<void> {
    const cur = await rgsvc.getRgSettings(id);
    await db.responsible.upsert({
      ...cur,
      coolingOffUntil: kind === "cooling" ? iso(26 * HOUR) : kind === "ended" ? iso(-HOUR) : null,
      selfExclusionUntil: kind === "exclusion" ? iso(26 * HOUR) : kind === "served" ? iso(-HOUR) : null,
    });
  }
  /** Postgres: the rows of one ledger group (`null` on the memory store, which keeps no ledger). */
  async function groupRows(groupId: string): Promise<number | null> {
    if (!onPostgres) return null;
    const rows: Any[] = await prisma()!.$queryRawUnsafe(`SELECT count(*)::int AS "n" FROM "LedgerEntry" WHERE "groupId" = $1`, groupId);
    return Number(rows[0]?.n ?? 0);
  }
  async function look(id: string) {
    const w = await db.wallet.findByUserId(id);
    const fee = (await db.txn.findByUser(id, 200)).filter((t: Any) => t.type === "AGENT_REGISTRATION_FEE");
    const app = await db.agentApplication.findActiveByUser(id);
    return {
      balance: Number(w?.balance), feeTxns: fee.length, disposition: app?.feeDisposition ?? null,
      feeAmount: app?.feeAmountTzs ?? null, source: app?.feeFundingSource ?? null, ledger: app ? await groupRows(`agentfee_${app.id}`) : null,
    };
  }
  const untouched = (l: Awaited<ReturnType<typeof look>>, balance: number) =>
    l.balance === balance && l.feeTxns === 0 && l.disposition === "NONE" && l.feeAmount === null && l.source === null && (l.ledger === null || l.ledger === 0);
  /** An applicant with a draft started BEFORE any break (the start refuses a break), funded with twice the fee. */
  async function applicant(p: string): Promise<string> {
    const id = await user(p, FEE * 2);
    const s = await svc.startApplication(id);
    if (!s.ok) throw new Error(`fixture: startApplication refused ${j(s)}`);
    return id;
  }

  /* ══ M · THE MONEY PATH — payFeeFromWallet ═════════════════════════════════════════════════════════════════════════ */
  {
    const a = await applicant("r8d_m_cool");
    await brk(a, "cooling");
    const r = await svc.payFeeFromWallet(a);
    const l = await look(a);
    ok("M.1 · a cooling-off running: the fee is REFUSED with the programme's token `rg_locked` (its own sentence for the record)",
      r.ok === false && r.refusal === "rg_locked" && r.error === RG_SENTENCE, j(r));
    ok("M.1′ · …and NOTHING MOVED: the wallet holds both fees, no fee Transaction, the application's fee columns untouched, no ledger group",
      untouched(l, FEE * 2), j(l));

    const x = await applicant("r8d_m_excl");
    await brk(x, "exclusion");
    const rx = await svc.payFeeFromWallet(x);
    ok("M.2 · a self-exclusion running: refused `rg_locked` and nothing moved — told the break, not the frozen-wallet line",
      rx.ok === false && rx.refusal === "rg_locked" && untouched(await look(x), FEE * 2), j(rx));

    const s = await applicant("r8d_m_served");
    await brk(s, "served");
    const rs = await svc.payFeeFromWallet(s);
    const sub = await svc.submitForReview(s, { acceptedTermsVersion: "x" });
    ok("M.3 · a self-exclusion served but on record: refused too — the programme's own hold, so nobody pays for an application its submit refuses",
      rs.ok === false && rs.refusal === "rg_locked" && untouched(await look(s), FEE * 2)
        && sub.ok === false && sub.error === RG_SENTENCE && sub.refusal === "rg_locked", j({ rs, sub }));

    const c = await applicant("r8d_m_ctrl");
    await brk(c, "ended");
    const rc = await svc.payFeeFromWallet(c);
    const lc = await look(c);
    ok("M.4 · CONTROL · the break over: the same applicant PAYS — and every observable M.1′ reads moved (wallet −fee, one fee Transaction, COLLECTED from the WALLET, the ledger group on Postgres)",
      rc.ok === true && lc.balance === FEE && lc.feeTxns === 1 && lc.disposition === "COLLECTED" && lc.feeAmount === FEE && lc.source === "WALLET"
        && (lc.ledger === null || lc.ledger > 0), j({ rc, lc }));

    const i = await applicant("r8d_m_idem");
    const first = await svc.payFeeFromWallet(i);
    await brk(i, "cooling");
    const again = await svc.payFeeFromWallet(i);
    const li = await look(i);
    ok("M.5 · IDEMPOTENCY UNCHANGED · a fee paid before the break answers a second tap during it exactly as before — ok, and nothing moves a second time",
      first.ok === true && again.ok === true && li.balance === FEE && li.feeTxns === 1 && li.disposition === "COLLECTED", j({ first, again, li }));

    const o = await applicant("r8d_m_order");
    await db.user.update(o, { emailVerifiedAt: null });
    await brk(o, "cooling");
    const ro = await svc.payFeeFromWallet(o);
    ok("M.6 · ORDER · on a break with an unconfirmed address, the break is said — not `email_unverified`, a door that would only lead to the same refusal",
      ro.ok === false && ro.refusal === "rg_locked", j(ro));
    await brk(o, "none");
    const ro2 = await svc.payFeeFromWallet(o);
    ok("M.6′ CONTROL · the same applicant off a break is asked for the address, as today", ro2.ok === false && ro2.refusal === "email_unverified", j(ro2));

    const f = await applicant("r8d_m_fail");
    const realGet = db.responsible.get;
    db.responsible.get = () => { throw new Error("the settings row could not be read"); };
    let threw = false;
    try { await svc.payFeeFromWallet(f); } catch { threw = true; } finally { db.responsible.get = realGet; }
    ok("M.7 · a failed break read is a refusal's read: the payment THROWS out of its lock — and nothing moved (never 'no break', never a debit)",
      threw && untouched(await look(f), FEE * 2), j(await look(f)));
  }

  /* ══ P · PROPOSE & EARN — createProposal ═══════════════════════════════════════════════════════════════════════════ */
  setProposalsConfig({ state: "ACTIVE" }, "r8d-officer");
  const input = (n: string) => ({
    titleEn: `Will the Kigamboni bridge toll change before December ${n}?`,
    resolutionCriterion: "Resolved YES if the toll authority publishes a new toll schedule in writing.",
    resolutionDate: iso(30 * 24 * HOUR).slice(0, 10), category: "infrastructure",
    sourceUrl: "https://www.thecitizen.co.tz/tanzania/news/kigamboni-toll",
  });
  {
    const p = await user("r8d_p_cool");
    await brk(p, "cooling");
    const r = await props.createProposal(p, input("one"));
    const mine = await db.proposal.listByProposer(p);
    ok("P.1 · on a break the proposal is REFUSED (`RG_LOCKED`) and carries the break's end for the composer; nothing is written",
      r.ok === false && r.code === "RG_LOCKED" && r.breakEnd?.exclusion === false && typeof r.breakEnd?.until === "string" && mine.length === 0, j({ r, n: mine.length }));
    const x = await user("r8d_p_excl");
    await brk(x, "exclusion");
    const rx = await props.createProposal(x, input("two"));
    ok("P.2 · a self-exclusion running: refused, and the end says it is an exclusion", rx.ok === false && rx.code === "RG_LOCKED" && rx.breakEnd?.exclusion === true, j(rx));
    const c = await user("r8d_p_ctrl");
    const rc = await props.createProposal(c, input("three"));
    ok("P.3 · CONTROL · a reader not on a break proposes exactly as today", rc.ok === true && (await db.proposal.listByProposer(c)).length === 1, j({ ok: rc.ok, code: rc.code }));
    const e = await user("r8d_p_ended");
    await brk(e, "ended");
    const re = await props.createProposal(e, input("four"));
    ok("P.4 · CONTROL · the break over, the reader proposes again", re.ok === true, j({ ok: re.ok, code: re.code }));
    setProposalsConfig({ state: "MAINTENANCE" }, "r8d-officer");
    const rp = await props.createProposal(p, input("five"));
    setProposalsConfig({ state: "ACTIVE" }, "r8d-officer");
    ok("P.5 · a closed programme answers first (its own state), even for a reader on a break", rp.ok === false && rp.code === "PAUSED", j(rp));
    const f = await user("r8d_p_fail");
    const realGet = db.responsible.get;
    db.responsible.get = () => { throw new Error("the settings row could not be read"); };
    let threw = false;
    try { await props.createProposal(f, input("six")); } catch { threw = true; } finally { db.responsible.get = realGet; }
    ok("P.6 · a failed break read throws — the refusal's read is never 'no break' — and no proposal is written",
      threw && (await db.proposal.listByProposer(f)).length === 0);
  }

  /* ══ L · LETTERS — the decline letter, decided at send time ═════════════════════════════════════════════════════════ */
  const SOLICIT = ["Don't let this stop you", "propose another market anytime", "Usikate tamaa", "pendekeza soko lingine", "/proposals/new", "Propose another"];
  const mailTo = async (id: string, tag: string) => {
    const box = await until(async () => email.emailOutbox().filter((m: Any) => m.to === `${id}@t.tz` && m.tag === tag), (v: Any[]) => v.length > 0);
    return box[0]?.html ?? "";
  };
  const textOf = (html: string) => html.replace(/<style[^]*?<\/style>/g, "").replace(/<[^>]+>/g, " ").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  {
    email.clearEmailOutbox();
    const on = await user("r8d_l_on");
    const off = await user("r8d_l_off");
    const pOn = await props.createProposal(on, input("seven"));
    const pOff = await props.createProposal(off, input("eight"));
    await brk(on, "cooling");                       // the break begins while the proposal is under review
    await props.declineProposal(pOn.proposal.id, "r8d-officer", "Duplicate", "A market on this already exists.");
    await props.declineProposal(pOff.proposal.id, "r8d-officer", "Duplicate", "A market on this already exists.");
    const hOn = await mailTo(on, "proposal-declined");
    const hOff = await mailTo(off, "proposal-declined");
    const missingOff = SOLICIT.filter((s) => !hOff.includes(s));
    const presentOn = SOLICIT.filter((s) => hOn.includes(s));
    ok("L.1 · CONTROL · off a break the decline letter carries its encouragement and its 'Propose another' button, as today", hOff.length > 500 && missingOff.length === 0, missingOff.join(" | "));
    ok("L.2 · during the proposer's break the letter leaves out the encouragement (en + sw) and the button — decided at SEND time", hOn.length > 500 && presentOn.length === 0, presentOn.join(" | "));
    const keep = ["We couldn't list this proposal", "Duplicate", "A market on this already exists.", "Proposal update", "Taarifa ya pendekezo"];
    ok("L.3 · …and keeps everything else, word for word: the head, the decision, its reason and the officer's note", keep.every((k) => textOf(hOn).includes(k)), keep.filter((k) => !textOf(hOn).includes(k)).join(" | "));
    // Every occurrence: a button's label is drawn twice (Outlook's VML and the anchor).
    const strip = (t: string) => ["Don't let this stop you — propose another market anytime.", "Usikate tamaa — pendekeza soko lingine wakati wowote.", "Propose another · Pendekeza"]
      .reduce((acc, s) => acc.split(s).join(""), t).replace(/\s+/g, " ").trim();
    ok("L.4 · the two letters differ by those lines ONLY (the title aside): nothing else moved",
      strip(textOf(hOff)).replace(/eight/g, "N") === textOf(hOn).replace(/seven/g, "N"), `${strip(textOf(hOff)).length} vs ${textOf(hOn).length}`);

    // sendEmailToUser itself: the break read only when asked, failing open.
    email.clearEmailOutbox();
    const realGet = db.responsible.get;
    let reads = 0;
    db.responsible.get = (...a: Any[]) => { reads++; return realGet.apply(db.responsible, a); };
    const seen: boolean[] = [];
    await email.sendEmailToUser(on, (to: string, reader: Any) => { seen.push(reader.onBreak); return { to, subject: "x", html: "<p>x</p>", tag: "r8d-plain" }; });
    const plainReads = reads;
    await email.sendEmailToUser(on, (to: string, reader: Any) => { seen.push(reader.onBreak); return { to, subject: "x", html: "<p>x</p>", tag: "r8d-aware" }; }, { breakAware: true });
    db.responsible.get = () => { throw new Error("down"); };
    await email.sendEmailToUser(on, (to: string, reader: Any) => { seen.push(reader.onBreak); return { to, subject: "x", html: "<p>x</p>", tag: "r8d-fail" }; }, { breakAware: true });
    db.responsible.get = realGet;
    ok("L.5 · `sendEmailToUser` reads no break for a send that does not ask (every other letter reads what it read before)", plainReads === 0 && seen[0] === false, j({ plainReads, seen }));
    ok("L.6 · …tells a `breakAware` builder the recipient's break (on a break: true) — and a failed read is no break (it gates a solicitation)", seen[1] === true && seen[2] === false, j(seen));
  }

  /* ══ N · THE "FRIEND JOINED" NOTICE ════════════════════════════════════════════════════════════════════════════════ */
  {
    const joined = async (id: string) => (await db.notification.findByUser(id, 50)).filter((n: Any) => n.kind === "AFFILIATE" && n.titleEn === "Your friend just joined");
    const refOn = await user("r8d_n_on");
    const refOff = await user("r8d_n_off");
    const codeOn = (await aff.ensureAffiliateAccount(refOn)).code;
    const codeOff = (await aff.ensureAffiliateAccount(refOff)).code;
    await brk(refOn, "cooling");
    const recOn = await user("r8d_n_rec1");
    const recOff = await user("r8d_n_rec2");
    const bOn = await aff.bindRecruit({ recruitUserId: recOn, code: codeOn });
    const bOff = await aff.bindRecruit({ recruitUserId: recOff, code: codeOff });
    const nOff = await until(() => joined(refOff), (v: Any[]) => v.length > 0);
    await sleep(300);
    const nOn = await joined(refOn);
    ok("N.1 · CONTROL · off a break the referrer is told their friend joined, as today", bOff.bound === true && nOff.length === 1, j({ bOff, n: nOff.length }));
    ok("N.2 · during the referrer's break the bind stands (an attribution, not an offer) and NO 'friend joined' notice is written",
      bOn.bound === true && nOn.length === 0, j({ bOn, n: nOn.length }));
    const refFail = await user("r8d_n_fail");
    const codeFail = (await aff.ensureAffiliateAccount(refFail)).code;
    const recFail = await user("r8d_n_rec3");
    const realGet = db.responsible.get;
    db.responsible.get = (id: string, ...rest: Any[]) => { if (id === refFail) throw new Error("down"); return realGet.call(db.responsible, id, ...rest); };
    let bFail: Any;
    try { bFail = await aff.bindRecruit({ recruitUserId: recFail, code: codeFail }); } finally { db.responsible.get = realGet; }
    const nFail = await until(() => joined(refFail), (v: Any[]) => v.length > 0);
    ok("N.3 · a failed read of the referrer's break is no break (it gates an offer): the notice is sent", bFail?.bound === true && nFail.length === 1, j({ bFail, n: nFail.length }));
  }

  return { onPostgres };
}
