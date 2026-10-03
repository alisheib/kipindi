/**
 * U33a-0 · THE CENSUS OF PRE-LEDGER SWITCH-OFFS — read-only, COUNTS ONLY (spec `docs/marketing-specs/U33a-U37c-OD58.md`
 * §6 "U33a-0", F1 / P6 / R11).
 *
 * Between 2026-09-14 and U6's deploy (the consent ledger, 6429f86f) a player could turn "Product news" OFF on
 * /profile/notifications and leave only an AUDIT row — no ledger row existed to write. Under OD58 a player with no
 * ledger row and the switch off reads as never asked, and licence outreach would reach them: a real "no" lost. This
 * counts the accounts that meet all three:
 *   1. the latest of their own `privacy.marketing_consent.given` / `.withdrawn` audit rows (actor = target = the
 *      account) is a WITHDRAWAL written before the cutoff;
 *   2. `marketingOptIn` is false now;
 *   3. their number has NO marketing ledger row after that audit row.
 * Criterion 3 is the decisive one: once U6 was live every toggle wrote its ledger row, so a later withdrawal is never
 * counted whatever the cutoff. The cutoffs are read from Railway by the runner (never typed) and passed in; a run under
 * each, plus one under none, that all agree make the count robust to when exactly the U6 build went live.
 *
 * ⛔ READ ONLY BY CONSTRUCTION: every read runs inside ONE Postgres transaction set READ ONLY — a write would be refused
 * by the database itself. ⛔ Prints counts only: no id, number, name or e-mail ever leaves this script.
 *
 * Usage (DATABASE_URL = the Postgres service's PUBLIC proxy, set by the runner — never printed):
 *   node scripts/live/marketing-preledger-offs.mjs --cutoff=u6-build:<ISO> --cutoff=next-deploy:<ISO>
 */
import { PrismaClient } from "@prisma/client";

const GIVEN = "privacy.marketing_consent.given";
const WITHDRAWN = "privacy.marketing_consent.withdrawn";

const cutoffs = process.argv.slice(2)
  .filter((a) => a.startsWith("--cutoff="))
  .map((a) => {
    const body = a.slice("--cutoff=".length);
    const at = body.indexOf(":");
    const label = body.slice(0, at);
    const iso = body.slice(at + 1);
    const ms = Date.parse(iso);
    if (!label || Number.isNaN(ms)) throw new Error(`unreadable cutoff "${a}" — expected --cutoff=<label>:<ISO instant>`);
    return { label, ms, iso: new Date(ms).toISOString() };
  });
if (!process.env.DATABASE_URL) {
  console.log("REFUSING: no DATABASE_URL — run through the runner, which sets the public proxy.");
  process.exit(2);
}

const prisma = new PrismaClient();
try {
  const result = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    const ro = await tx.$queryRaw`SELECT current_setting('transaction_read_only') AS ro`;

    // ⛔ THE CONTROL — an empty answer must prove it could have been non-empty: the same read sees the audit log at all,
    // and which privacy actions it holds (action names and counts only).
    const auditTotal = await tx.auditLog.count();
    const privacyActions = await tx.auditLog.groupBy({ by: ["action"], where: { action: { startsWith: "privacy." } }, _count: { _all: true } });
    const byCategory = await tx.auditLog.groupBy({ by: ["category"], _count: { _all: true } });
    const audits = await tx.auditLog.findMany({
      where: { action: { in: [GIVEN, WITHDRAWN] }, actorId: { not: null } },
      select: { actorId: true, targetId: true, action: true, createdAt: true, seq: true },
    });
    // actor = target = the account (the toggle's own row). An officer's row about someone else is not the person's.
    const own = audits.filter((r) => r.targetId === null || r.targetId === r.actorId);
    const latest = new Map();
    for (const r of own) {
      const prev = latest.get(r.actorId);
      if (!prev || r.createdAt > prev.createdAt || (+r.createdAt === +prev.createdAt && r.seq > prev.seq)) latest.set(r.actorId, r);
    }
    const ids = [...latest.keys()];
    const users = ids.length === 0 ? [] : await tx.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, phoneE164: true, marketingOptIn: true },
    });
    // The ledger keys a player by the bare 255… form; `userPhoneKeyFor` (consent.ts) is `+` + that key.
    const keyOf = (phone) => (typeof phone === "string" && phone.startsWith("+") ? phone.slice(1) : null);
    const keys = users.map((u) => keyOf(u.phoneE164)).filter((k) => k !== null);
    const ledger = keys.length === 0 ? [] : await tx.messagingConsent.findMany({
      where: { channel: "SMS", category: "MARKETING", identifier: { in: keys } },
      select: { identifier: true, createdAt: true },
    });
    const ledgerByKey = new Map();
    for (const row of ledger) {
      const list = ledgerByKey.get(row.identifier) ?? [];
      list.push(row.createdAt);
      ledgerByKey.set(row.identifier, list);
    }
    const firstLedgerRow = ledger.reduce((m, r) => (m === null || r.createdAt < m ? r.createdAt : m), null);
    const ledgerRowsTotal = await tx.messagingConsent.count({ where: { channel: "SMS", category: "MARKETING" } });

    const usersById = new Map(users.map((u) => [u.id, u]));
    const census = (cutMs) => {
      let latestWithdrawn = 0, offNow = 0, noLaterLedger = 0, erasedOrNoPhone = 0, missingAccount = 0;
      for (const [id, row] of latest) {
        if (row.action !== WITHDRAWN) continue;
        if (cutMs !== null && +row.createdAt >= cutMs) continue;
        latestWithdrawn++;
        const u = usersById.get(id);
        if (!u) { missingAccount++; continue; }
        if (u.marketingOptIn !== false) continue;
        offNow++;
        const key = keyOf(u.phoneE164);
        if (key === null) { erasedOrNoPhone++; continue; }
        const later = (ledgerByKey.get(key) ?? []).some((at) => at > row.createdAt);
        if (!later) noLaterLedger++;
      }
      return { latestWithdrawn, offNow, noLaterLedger, erasedOrNoPhone, missingAccount };
    };
    return {
      auditTotal,
      privacyActions: privacyActions.map((p) => `${p.action} ${p._count._all}`).sort(),
      byCategory: byCategory.map((c) => `${c.category} ${c._count._all}`).sort(),
      readOnly: ro?.[0]?.ro,
      auditRows: audits.length,
      ownAuditRows: own.length,
      accountsWithAnOwnRow: latest.size,
      latestIsWithdrawal: [...latest.values()].filter((r) => r.action === WITHDRAWN).length,
      ledgerRowsTotal,
      firstLedgerRowAt: firstLedgerRow ? firstLedgerRow.toISOString() : null,
      byCutoff: [...cutoffs.map((c) => ({ label: c.label, cutoff: c.iso, ...census(c.ms) })), { label: "no cutoff", cutoff: null, ...census(null) }],
    };
  }, { timeout: 60_000, maxWait: 10_000 });

  console.log(`transaction read-only: ${result.readOnly}`);
  console.log(`control · audit rows in all: ${result.auditTotal} (${result.byCategory.join(" · ")}); privacy actions present: ${result.privacyActions.length === 0 ? "none" : result.privacyActions.join(" · ")}`);
  console.log(`own marketing-switch audit rows: ${result.ownAuditRows} (of ${result.auditRows}) across ${result.accountsWithAnOwnRow} account(s); latest is a withdrawal for ${result.latestIsWithdrawal}`);
  console.log(`marketing ledger rows in all: ${result.ledgerRowsTotal}; the earliest among these accounts' numbers: ${result.firstLedgerRowAt ?? "none"}`);
  for (const c of result.byCutoff) {
    console.log(`[${c.label}${c.cutoff ? ` < ${c.cutoff}` : ""}] latest own row a withdrawal: ${c.latestWithdrawn} · switch off now: ${c.offNow} · ⭐ NO LATER LEDGER ROW (the count): ${c.noLaterLedger} · erased/no phone: ${c.erasedOrNoPhone} · account gone: ${c.missingAccount}`);
  }
} finally {
  await prisma.$disconnect();
}
