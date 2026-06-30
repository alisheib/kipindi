import { notFound } from "next/navigation";
import Link from "next/link";
import { AdminPageHead, AdminKpi, AdminCard, FeedRow } from "@/components/admin/admin-shell";
import { AdminPagination, PER_PAGE, parsePage, buildBaseHref } from "@/components/admin/admin-pagination";
import { parseSort, applySort, SortTh } from "@/components/admin/admin-sort";
import { Avatar } from "@/components/ui/avatar";
import { Chip } from "@/components/ui/chip";
import { db, type StoredTxn, type StoredBet } from "@/lib/server/store";
import { getAuditForActor, getAuditForTarget, audit as recordAudit, type AuditCategory } from "@/lib/server/audit";
import { currentSession } from "@/lib/server/auth-service";
import { exportUserData } from "@/lib/server/user-service";
import { I } from "@/components/ui/glyphs";
import { formatTzs, formatTzsCompact, formatDateTime } from "@/lib/utils";
import { displayLabel, displayInitials } from "@/lib/display-label";
import { KycReviewControls } from "@/components/admin/kyc-review-controls";
import { SuspendControls } from "./suspend-controls";
import { SetEmailForm } from "./set-email-form";
import { ResetPasswordButton } from "./reset-password-button";
import { ExportPlayerButton } from "./export-player-button";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await db.user.findById(id);
  const label = user ? displayLabel(user) : id.slice(0, 8);
  return { title: `Admin · Player — ${label}` };
}

const CATEGORY_VARIANT: Record<AuditCategory, "gold" | "royal" | "danger" | "success" | "warning" | "neutral"> = {
  AUTH:       "royal",
  KYC:        "royal",
  WALLET:     "royal",
  BET:        "gold",
  ADMIN:      "warning",
  COMPLIANCE: "warning",
  SECURITY:   "danger",
  SYSTEM:     "neutral",
};

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "neutral" | "info"> = {
  ACTIVE: "success",
  PENDING_KYC: "warning",
  SUSPENDED: "danger",
  SELF_EXCLUDED: "danger",
  COOLED_OFF: "warning",
  CLOSED: "neutral",
};

export default async function AdminPlayerDetailPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    tab?: string;
    txpage?: string; txsort?: string; txdir?: string;
    betpage?: string; betsort?: string; betdir?: string;
  }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const tab = sp.tab ?? "activity";
  const playerHref = `/admin/players/${id}`;

  const user = await db.user.findById(id);
  if (!user) notFound();
  // Access audit — record which officer opened this player's full PII record
  // (KYC doc views + exports were audited; opening the record itself was not).
  const viewer = await currentSession();
  if (viewer) {
    recordAudit({ category: "COMPLIANCE", action: "player.record_viewed", actorId: viewer.userId, targetType: "User", targetId: id });
  }
  const wallet = await db.wallet.findByUserId(id);
  const kyc = await db.kyc.findByUserId(id);
  const rg = await db.responsible.get(id);
  const data = await exportUserData(id);
  const txns = data.transactions as StoredTxn[];
  const bets = data.bets as StoredBet[];
  // Merge the player's OWN actions with admin actions taken AGAINST them, so an
  // officer can see who suspended / reset / emailed / approved this account.
  const audit = [...getAuditForActor(id, 200), ...getAuditForTarget("User", id, 200)]
    .filter((e, i, arr) => arr.findIndex((x) => x.id === e.id) === i)
    .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
    .slice(0, 200);

  const lifetimeStakes = txns.filter((t) => t.type === "BET_PLACED" && t.status === "CONFIRMED").reduce((s, t) => s + Math.abs(t.amount), 0);
  const lifetimePayouts = txns.filter((t) => (t.type === "BET_PAYOUT" || t.type === "CASHOUT") && t.status === "CONFIRMED").reduce((s, t) => s + Math.abs(t.amount), 0);
  const lifetimeDeposits = txns.filter((t) => t.type === "DEPOSIT" && t.status === "CONFIRMED").reduce((s, t) => s + t.amount, 0);
  const lifetimeWithdrawals = txns.filter((t) => t.type === "WITHDRAWAL" && t.status === "CONFIRMED").reduce((s, t) => s + Math.abs(t.amount), 0);
  const ngr = lifetimeStakes - lifetimePayouts;
  const betsCount = bets.length;
  const lastBet = bets.sort((a, b) => b.placedAt.localeCompare(a.placedAt))[0]?.placedAt;

  // Transactions table (prefix "tx") — newest first by default.
  const tx = parseSort(sp, ["time", "type", "provider", "status", "amount"] as const, "time", "desc", "tx");
  const txSorted = applySort(txns, tx.sort, tx.dir, {
    time: (t) => t.createdAt,
    type: (t) => t.type,
    provider: (t) => t.provider ?? "",
    status: (t) => t.status,
    amount: (t) => t.amount,
  });
  const txPage = parsePage(sp.txpage, txSorted.length);
  const txRows = txSorted.slice((txPage - 1) * PER_PAGE, txPage * PER_PAGE);
  const txBase = buildBaseHref(playerHref, sp, "txpage");

  // Bets table (prefix "bet") — newest first by default.
  const bet = parseSort(sp, ["when", "match", "outcome", "stake", "status", "return"] as const, "when", "desc", "bet");
  const betSorted = applySort(bets, bet.sort, bet.dir, {
    when: (b) => b.placedAt,
    match: (b) => b.matchLabel,
    outcome: (b) => b.outcomeLabel,
    stake: (b) => b.stake,
    status: (b) => b.status,
    return: (b) => b.returnAmount ?? 0,
  });
  const betPage = parsePage(sp.betpage, betSorted.length);
  const betRows = betSorted.slice((betPage - 1) * PER_PAGE, betPage * PER_PAGE);
  const betBase = buildBaseHref(playerHref, sp, "betpage");

  // Risk score — simple proxy: deposit cycling rate, AML hits, late-night sessions, declined cards
  const riskScore = computeRiskScore(txns.length, lifetimeWithdrawals, kyc?.status === "APPROVED");
  const riskBand = riskScore >= 70 ? "high" : riskScore >= 40 ? "medium" : "low";

  const initials = displayInitials(user);
  const headerLabel = displayLabel(user);
  const isAutoHandle = !((user.displayName ?? "").trim().length > 0);

  const TABS: { id: string; label: string; count?: number; icon: React.ReactNode }[] = [
    { id: "activity",     label: "Activity",       count: audit.length, icon: <I.activity s={12} /> },
    { id: "bets",         label: "Bets",           count: betsCount,    icon: <I.ticket s={12} /> },
    { id: "transactions", label: "Transactions",   count: txns.length,  icon: <I.wallet s={12} /> },
    { id: "kyc",          label: "KYC",            count: undefined,    icon: <I.shieldcheck s={12} /> },
    { id: "limits",       label: "Limits",         count: undefined,    icon: <I.lock s={12} /> },
    { id: "exclusion",    label: "Self-exclusion", count: undefined,    icon: <I.shieldOff s={12} /> },
    { id: "audit",        label: "Audit",          count: audit.length, icon: <I.alertCircle s={12} /> },
  ];

  // KYC is the most critical tab — give it an at-a-glance status so an officer
  // immediately sees whether it needs action. Gold = not approved (needs you),
  // green = approved, red = rejected.
  const kycTone: "gold" | "green" | "red" =
    kyc?.status === "APPROVED" ? "green" : kyc?.status === "REJECTED" ? "red" : "gold";
  const kycNeedsAction = kyc?.status === "PENDING_REVIEW" || kyc?.status === "ADDITIONAL_INFO_REQUIRED";

  return (
    <>
      <AdminPageHead
        title="Player profile"
        sw="Wasifu wa mchezaji"
        period={false}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/admin/players"
              className="btn btn-ghost btn-sm inline-flex items-center gap-1.5"
            >
              <I.chevronLeft s={13} />
              Players
            </Link>
            <ExportPlayerButton userId={id} />
          </div>
        }
      />

      <div className="px-4 lg:px-6 py-5 space-y-4">
        {/* §A — Identity card */}
        <AdminCard>
          <div className="flex items-center gap-4 flex-wrap">
            <Avatar initials={initials} size="xl" seed={user.id} />
            <div className="flex-1 min-w-[260px]">
              <h2 className={`font-display font-bold text-title-md text-text leading-none ${isAutoHandle ? "font-mono" : ""}`}>{headerLabel}</h2>
              <p className="font-mono text-caption text-text-tertiary mt-1">
                {id.slice(0, 14)}… · {user.phoneE164.slice(0, 4)}*****{user.phoneE164.slice(-2)} · {user.region ?? "—"} · joined {user.createdAt.split("T")[0]}
              </p>
              {user.email && (
                <p className="font-mono text-caption text-text-tertiary mt-0.5 flex items-center gap-1">
                  <I.mail s={10} />
                  {user.email}
                  {user.emailVerifiedAt && <I.check s={10} className="text-success" />}
                </p>
              )}
              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                <Chip size="sm" variant={STATUS_VARIANT[user.status] ?? "neutral"}>● {user.status}</Chip>
                {kyc && (
                  <a href={`/admin/players/${id}?tab=kyc`} className="inline-block hover:opacity-80 transition-opacity">
                    <Chip size="sm" variant={kyc.status === "APPROVED" ? "success" : kyc.status === "REJECTED" ? "danger" : "warning"}>
                      {kyc.status === "APPROVED" ? <I.shieldcheck s={10} className="inline -mt-0.5 mr-0.5" /> : <I.shieldAlert s={10} className="inline -mt-0.5 mr-0.5" />}
                      KYC · {kyc.status}
                    </Chip>
                  </a>
                )}
                {kyc?.nidaVerifiedAt && <Chip size="sm" variant="neutral"><I.check s={10} className="inline -mt-0.5 mr-0.5" />NIDA verified</Chip>}
                {rg?.dailyDepositLimit && (
                  <Chip size="sm" variant="warning">limit {formatTzsCompact(rg.dailyDepositLimit).replace("TZS ", "")}/day</Chip>
                )}
              </div>
            </div>
            <div className="text-right ml-auto">
              <p className="font-mono text-micro uppercase tracking-[0.14em] text-text-tertiary">Risk score</p>
              <p
                className={[
                  "font-mono font-bold tabular leading-none mt-1 text-display-3",
                  riskBand === "high" ? "text-danger" : riskBand === "medium" ? "text-gold" : "text-success",
                ].join(" ")}
              >
                {riskScore}
              </p>
              <p className="font-mono text-micro text-text-tertiary tracking-wider mt-1">{riskBand} · review monthly</p>
            </div>
          </div>
        </AdminCard>

        {/* §B — Quick stats strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminKpi label="Lifetime deposit"    sw="Jumla ya amana"        value={`TZS ${formatTzsCompact(lifetimeDeposits).replace("TZS ", "")}`} gold delta={wallet ? `wallet ${formatTzs(wallet.balance)}` : "—"} />
          <AdminKpi label="Lifetime withdrawal" sw="Jumla ya utoaji"       value={`TZS ${formatTzsCompact(lifetimeWithdrawals).replace("TZS ", "")}`} delta={`${txns.filter((t) => t.type === "WITHDRAWAL").length} txns`} />
          <AdminKpi label="NGR contribution"    sw="Mchango wa mapato"     value={`TZS ${formatTzsCompact(ngr).replace("TZS ", "")}`} gold delta={`bets ${betsCount}`} />
          <AdminKpi label="Last bet"            sw="Dau la mwisho"         value={lastBet ? new Date(lastBet).toLocaleDateString("en-GB") : "never"} delta={lastBet ? `${bets.length} bets` : "—"} />
        </div>

        {/* §C — Tabs */}
        <AdminCard padding="p-0">
          <nav aria-label="Player tabs" className="flex gap-4 px-4 border-b border-border-subtle overflow-x-auto">
            {TABS.map((t) => {
              const active = t.id === tab;
              const isKyc = t.id === "kyc";
              // The KYC tab stays visually loud when it's not approved, even
              // when another tab is active, so the officer always notices it.
              const kycHot = isKyc && kycTone !== "green";
              const dotColor = kycTone === "green" ? "bg-yes-500" : kycTone === "red" ? "bg-no-500" : "bg-gold";
              const cls = active
                ? (kycHot ? "border-gold text-gold-300 font-bold" : "border-gold text-text font-semibold")
                : kycHot
                  ? (kycTone === "red" ? "border-no-700/60 text-no-300 font-semibold hover:text-no-200" : "border-gold-700/60 text-gold-300 font-semibold hover:text-gold-200")
                  : isKyc
                    ? "border-transparent text-yes-300 hover:text-yes-200" // approved → calm green
                    : "border-transparent text-text-tertiary hover:text-text";
              return (
                <a
                  key={t.id}
                  href={`/admin/players/${id}?tab=${t.id}`}
                  className={["py-3 text-body-sm whitespace-nowrap border-b-2 transition-colors inline-flex items-center gap-1.5", cls].join(" ")}
                >
                  {isKyc ? (
                    <span
                      aria-hidden
                      className={`h-1.5 w-1.5 rounded-pill ${dotColor} ${kycNeedsAction ? "animate-pulse" : ""}`}
                    />
                  ) : (
                    <span aria-hidden className="opacity-60">{t.icon}</span>
                  )}
                  {t.label}
                  {isKyc && kycNeedsAction && (
                    <span className="font-mono text-micro uppercase tracking-[0.1em] text-gold-300">· review</span>
                  )}
                  {isKyc && kyc?.status === "APPROVED" && <I.check s={12} className="text-yes-400" />}
                  {t.count !== undefined && <span className="ml-1.5 font-mono text-micro text-text-tertiary">· {t.count}</span>}
                </a>
              );
            })}
          </nav>
          <div className="p-4">
            {tab === "activity" && (
              <div className="max-h-[420px] overflow-y-auto">
                {audit.slice(0, 50).map((e) => (
                  <FeedRow
                    key={e.id}
                    ts={formatDateTime(e.createdAt)}
                    category={e.category}
                    variant={CATEGORY_VARIANT[e.category]}
                    body={e.action}
                  />
                ))}
                {audit.length === 0 && <p className="text-caption text-text-tertiary py-6 text-center">No recorded activity yet.</p>}
              </div>
            )}
            {tab === "bets" && (
              <>
              <div className="overflow-x-auto">
                <table className="admin-tbl min-w-[600px]">
                  <thead className="font-mono text-micro tracking-[0.14em] uppercase text-text-tertiary border-b border-border-subtle">
                    <tr>
                      <th className="py-2 pr-3 text-left">Ref</th>
                      <SortTh field="when" label="When" current={bet.sort} dir={bet.dir} sp={sp} baseHref={playerHref} prefix="bet" className="py-2 pr-3" />
                      <SortTh field="match" label="Match · window" current={bet.sort} dir={bet.dir} sp={sp} baseHref={playerHref} prefix="bet" className="py-2 pr-3" />
                      <SortTh field="outcome" label="Outcome" current={bet.sort} dir={bet.dir} sp={sp} baseHref={playerHref} prefix="bet" className="py-2 pr-3" />
                      <SortTh field="stake" label="Stake" current={bet.sort} dir={bet.dir} sp={sp} baseHref={playerHref} prefix="bet" align="right" className="py-2 pr-3" />
                      <SortTh field="status" label="Status" current={bet.sort} dir={bet.dir} sp={sp} baseHref={playerHref} prefix="bet" align="right" className="py-2 pr-3" />
                      <SortTh field="return" label="Return" current={bet.sort} dir={bet.dir} sp={sp} baseHref={playerHref} prefix="bet" align="right" className="py-2 pl-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {betRows.map((b) => (
                      <tr key={b.id} className="border-b border-border-subtle/50 last:border-b-0">
                        <td className="py-2 pr-3 font-mono text-[10px] tracking-[0.04em] text-text-muted tabular-nums whitespace-nowrap">{b.id}</td>
                        <td className="py-2 pr-3 font-mono whitespace-nowrap">{formatDateTime(b.placedAt)}</td>
                        <td className="py-2 pr-3">{b.matchLabel} <span className="text-text-tertiary">· {b.windowLabel}</span></td>
                        <td className="py-2 pr-3">{b.outcomeLabel}</td>
                        <td className="py-2 pr-3 font-mono tabular text-right">{formatTzs(b.stake)}</td>
                        <td className="py-2 pr-3 text-right"><span className="font-mono text-micro tracking-wider uppercase">{b.status}</span></td>
                        <td className={["py-2 pl-3 font-mono tabular text-right", b.status === "WON" ? "text-gold" : "text-text-tertiary"].join(" ")}>{b.returnAmount ? formatTzs(b.returnAmount) : "—"}</td>
                      </tr>
                    ))}
                    {bets.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-text-tertiary">No bets placed.</td></tr>}
                  </tbody>
                </table>
              </div>
              <AdminPagination total={betSorted.length} page={betPage} baseHref={betBase} param="betpage" />
              </>
            )}
            {tab === "transactions" && (
              <>
              <div className="overflow-x-auto">
                <table className="admin-tbl min-w-[600px]">
                  <thead className="font-mono text-micro tracking-[0.14em] uppercase text-text-tertiary border-b border-border-subtle">
                    <tr>
                      <SortTh field="time" label="When" current={tx.sort} dir={tx.dir} sp={sp} baseHref={playerHref} prefix="tx" className="py-2 pr-3" />
                      <SortTh field="type" label="Type" current={tx.sort} dir={tx.dir} sp={sp} baseHref={playerHref} prefix="tx" className="py-2 pr-3" />
                      <SortTh field="provider" label="Provider" current={tx.sort} dir={tx.dir} sp={sp} baseHref={playerHref} prefix="tx" className="py-2 pr-3" />
                      <SortTh field="status" label="Status" current={tx.sort} dir={tx.dir} sp={sp} baseHref={playerHref} prefix="tx" className="py-2 pr-3" />
                      <SortTh field="amount" label="Amount" current={tx.sort} dir={tx.dir} sp={sp} baseHref={playerHref} prefix="tx" align="right" className="py-2 pl-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {txRows.map((t) => (
                      <tr key={t.id} className="border-b border-border-subtle/50 last:border-b-0">
                        <td className="py-2 pr-3 font-mono whitespace-nowrap">{formatDateTime(t.createdAt)}</td>
                        <td className="py-2 pr-3 font-medium text-text">{t.type}</td>
                        <td className="py-2 pr-3">{t.provider ?? "—"}</td>
                        <td className="py-2 pr-3"><span className="font-mono text-micro tracking-wider uppercase">{t.status}</span></td>
                        <td className={["py-2 pl-3 font-mono tabular text-right", t.amount >= 0 ? "text-gold" : "text-text-secondary"].join(" ")}>{formatTzs(t.amount)}</td>
                      </tr>
                    ))}
                    {txns.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-text-tertiary">No transactions.</td></tr>}
                  </tbody>
                </table>
              </div>
              <AdminPagination total={txSorted.length} page={txPage} baseHref={txBase} param="txpage" />
              </>
            )}
            {tab === "kyc" && (
              <KycTab kyc={kyc} userEmail={user.email} userId={id} />
            )}
            {tab === "limits" && (
              <LimitsTab rg={rg} />
            )}
            {tab === "exclusion" && (
              <ExclusionTab rg={rg} />
            )}
            {tab === "audit" && (
              <div className="max-h-[420px] overflow-y-auto">
                {audit.slice(0, 100).map((e) => (
                  <FeedRow
                    key={e.id}
                    ts={formatDateTime(e.createdAt)}
                    category={e.category}
                    variant={CATEGORY_VARIANT[e.category]}
                    body={`${e.action} ${e.targetType ? `· ${e.targetType}#${e.targetId?.slice(0, 12)}` : ""}`}
                  />
                ))}
              </div>
            )}
          </div>
        </AdminCard>

        {/* §D — Account actions (live + audited) */}
        <AdminCard title="Account actions" sw="Vitendo vya akaunti">
          <div className="flex items-center gap-3 flex-wrap">
            <SuspendControls userId={data.user!.id} currentStatus={data.user!.status} />
            <ResetPasswordButton userId={data.user!.id} />
            <p className="text-caption text-text-tertiary flex items-center gap-1.5 ml-auto">
              <I.shieldcheck s={12} />
              Every action is audited · reason required
            </p>
          </div>
        </AdminCard>
      </div>
    </>
  );
}

function KycTab({ kyc, userEmail, userId }: { kyc: ReturnType<typeof db.kyc.findByUserId>; userEmail?: string | null; userId: string }) {
  if (!kyc) return <p className="text-caption text-text-tertiary py-4 text-center">No KYC record yet.</p>;
  const decided = kyc.status === "APPROVED" || kyc.status === "REJECTED";
  return (
    <div className="space-y-4">
      {/* Status banner — most important signal, shown first so officers see it immediately */}
      {kyc.status === "PENDING_REVIEW" && (
        <div className="rounded-lg border-2 border-gold-700/70 bg-gold-500/[0.08] px-4 py-3 flex items-start gap-3">
          <I.shieldAlert s={16} className="text-gold-300 shrink-0 mt-0.5 animate-pulse" />
          <div>
            <p className="font-display font-semibold text-gold-300 text-[13px]">Action required · Inahitaji ukaguzi</p>
            <p className="mt-0.5 text-caption text-text-muted">This identity submission is awaiting officer review. Check the documents below and make a decision.</p>
          </div>
        </div>
      )}
      {kyc.status === "ADDITIONAL_INFO_REQUIRED" && (
        <div className="rounded-lg border border-warning-border bg-warning-bg/20 px-4 py-3 flex items-start gap-3">
          <I.alertCircle s={16} className="text-warning-fg shrink-0 mt-0.5" />
          <div>
            <p className="font-display font-semibold text-warning-fg text-[13px]">Awaiting player response</p>
            <p className="mt-0.5 text-caption text-text-muted">Additional information was requested. Waiting for the player to upload the requested documents and resubmit.</p>
          </div>
        </div>
      )}
      {kyc.status === "REJECTED" && (
        <div className="rounded-lg border border-no-700/60 bg-no-500/[0.08] px-4 py-3 flex items-start gap-3">
          <I.xCircle s={16} className="text-no-300 shrink-0 mt-0.5" />
          <div>
            <p className="font-display font-semibold text-no-300 text-[13px]">Verification rejected</p>
            {kyc.rejectReason && <p className="mt-0.5 text-caption text-text-muted">&ldquo;{kyc.rejectReason}&rdquo;</p>}
          </div>
        </div>
      )}
      {kyc.status === "APPROVED" && (
        <div className="rounded-lg border border-yes-700/60 bg-yes-500/[0.08] px-4 py-3 flex items-center gap-3">
          <I.shieldcheck s={16} className="text-yes-400 shrink-0" />
          <p className="font-display font-semibold text-yes-300 text-[13px]">Identity verified · Utambulisho umethibitishwa</p>
        </div>
      )}
      {/* Email status — critical for KYC notifications. Warn if missing. */}
      <div className={`rounded-md px-3 py-2.5 flex items-start gap-2.5 text-caption ${userEmail ? "border border-border bg-bg-inset/30" : "border-2 border-warning-border bg-warning-bg/20"}`}>
        <I.mail s={14} className={userEmail ? "text-text-tertiary mt-0.5" : "text-gold-300 mt-0.5"} />
        <div className="flex-1 min-w-0">
          <p className="font-mono text-micro tracking-[0.12em] uppercase text-text-tertiary">Player email</p>
          {userEmail ? (
            <p className="text-body-sm font-medium text-text break-all">{userEmail}</p>
          ) : (
            <>
              <p className="text-body-sm font-semibold text-gold-300">No email on file — KYC notifications will not reach this player</p>
              <SetEmailForm userId={userId} />
            </>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-caption">
        <Item label="Status" value={<Chip size="sm" variant={kyc.status === "APPROVED" ? "success" : kyc.status === "REJECTED" ? "danger" : "warning"}>{kyc.status}</Chip>} />
        <Item label="NIDA number" value={<span className="font-mono">{kyc.nidaNumber ? `${kyc.nidaNumber.slice(0, 4)}…${kyc.nidaNumber.slice(-4)}` : "—"}</span>} />
        <Item label="Full name" value={kyc.fullName ?? "—"} />
        <Item label="DOB" value={kyc.dob ?? "—"} />
        <Item label="NIDA verified at" value={kyc.nidaVerifiedAt ? new Date(kyc.nidaVerifiedAt).toLocaleString("en-GB") : "—"} />
        <Item label="Documents" value={kyc.documents.length > 0 ? kyc.documents.map((d: { docType: string }) => d.docType).join(", ") : "none"} />
        <Item label="Submitted" value={kyc.submittedAt ? new Date(kyc.submittedAt).toLocaleString("en-GB") : "—"} />
        {decided && <Item label="Reviewed by" value={<span className="font-mono">{kyc.reviewerId ? `${kyc.reviewerId.slice(0, 14)}…` : "—"}{kyc.reviewedAt ? ` · ${new Date(kyc.reviewedAt).toLocaleString("en-GB")}` : ""}</span>} />}
        {kyc.status === "REJECTED" && kyc.rejectReason && <Item label="Reject reason" value={<span className="text-no-300">{kyc.rejectReason}</span>} />}
      </dl>

      {/* Document previews — fetched per-image through the admin-gated route
          (never inlined here). Click to open the full-size photo. */}
      {(() => {
        const SLOTS = [
          { type: "NIDA_FRONT", label: "ID front" },
          { type: "NIDA_BACK", label: "ID back" },
          { type: "SELFIE", label: "Selfie" },
        ] as const;
        const present = new Set(kyc.documents.map((d: { docType: string }) => d.docType));
        return (
          <div>
            <p className="font-mono text-micro tracking-[0.12em] uppercase text-text-tertiary mb-2.5">Documents</p>
            <div className="grid grid-cols-3 gap-2.5">
              {SLOTS.map((s) => {
                const has = present.has(s.type);
                const src = `/api/admin/kyc-doc?user=${encodeURIComponent(kyc.userId)}&type=${s.type}`;
                return (
                  <div key={s.type} className="space-y-1">
                    {has ? (
                      <a href={src} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-md border border-border bg-bg-inset hover:border-gold-500 transition-colors" title={`Open ${s.label} full size`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt={s.label} loading="lazy" className="h-28 w-full object-cover" />
                      </a>
                    ) : (
                      <div className="flex h-28 w-full items-center justify-center rounded-md border border-dashed border-border bg-bg-inset/40 text-text-tertiary">
                        <I.x s={16} />
                      </div>
                    )}
                    <p className={`text-center font-mono text-micro ${has ? "text-text-secondary" : "text-text-tertiary"}`}>{s.label}{has ? "" : " · missing"}</p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Officer-requested extra documents — description + uploaded content (or
          "awaiting"). Empty in the normal case; only shown when docs were asked. */}
      {(kyc.extraRequests ?? []).length > 0 && (
        <div>
          <p className="font-mono text-micro tracking-[0.12em] uppercase text-text-tertiary mb-2.5">Requested documents</p>
          <div className="space-y-2.5">
            {(kyc.extraRequests ?? []).map((rq: { id: string; description: string; storageKey: string | null; uploadedAt: string | null }) => {
              const src = `/api/admin/kyc-doc?user=${encodeURIComponent(kyc.userId)}&req=${encodeURIComponent(rq.id)}`;
              return (
                <div key={rq.id} className="flex items-start gap-3 rounded-md border border-border bg-bg-inset/40 p-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-caption text-text leading-snug">{rq.description}</p>
                    <p className="mt-0.5 font-mono text-micro text-text-tertiary">
                      {rq.uploadedAt ? `Uploaded · ${new Date(rq.uploadedAt).toLocaleString("en-GB")}` : "Awaiting upload"}
                    </p>
                  </div>
                  {rq.storageKey ? (
                    <a href={src} target="_blank" rel="noopener noreferrer" className="block shrink-0 overflow-hidden rounded-md border border-border hover:border-gold-500 transition-colors" title="Open full size">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="requested document" loading="lazy" className="h-16 w-16 object-cover" />
                    </a>
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-bg-inset/40 text-text-tertiary">
                      <I.x s={16} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border-subtle bg-bg-inset/30 p-3.5">
        <p className="font-mono text-micro tracking-[0.12em] uppercase text-text-tertiary mb-2.5">Officer decision</p>
        <KycReviewControls userId={kyc.userId} status={kyc.status} />
      </div>
    </div>
  );
}

function LimitsTab({ rg }: { rg: ReturnType<typeof db.responsible.get> }) {
  if (!rg) return <p className="text-caption text-text-tertiary py-4 text-center">No limits configured.</p>;
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-caption">
      <Item label="Daily deposit limit"   value={rg.dailyDepositLimit   !== null ? formatTzs(rg.dailyDepositLimit)   : "no limit"} />
      <Item label="Weekly deposit limit"  value={rg.weeklyDepositLimit  !== null ? formatTzs(rg.weeklyDepositLimit)  : "no limit"} />
      <Item label="Monthly deposit limit" value={rg.monthlyDepositLimit !== null ? formatTzs(rg.monthlyDepositLimit) : "no limit"} />
      <Item label="Daily loss limit"      value={rg.dailyLossLimit      !== null ? formatTzs(rg.dailyLossLimit)      : "no limit"} />
      <Item label="Session time limit"    value={rg.sessionTimeLimitMin !== null ? `${rg.sessionTimeLimitMin} min`   : "no limit"} />
      <Item label="Reality check interval" value={`${rg.realityCheckIntervalMin} min`} />
      {rg.pendingIncreaseTo !== null && (
        <Item label="Pending limit increase" value={
          <span className="text-warning font-medium">
            {formatTzs(rg.pendingIncreaseTo)} effective {rg.pendingIncreaseEffectiveAt ? new Date(rg.pendingIncreaseEffectiveAt).toLocaleString("en-GB") : "—"}
          </span>
        } />
      )}
    </dl>
  );
}

function ExclusionTab({ rg }: { rg: ReturnType<typeof db.responsible.get> }) {
  if (!rg) return <p className="text-caption text-text-tertiary py-4 text-center">No self-exclusion or cooling-off active.</p>;
  return (
    <div className="space-y-3">
      {rg.selfExclusionUntil ? (
        <div className="rounded-md border-2 border-danger/40 bg-danger-bg/15 p-4 flex items-start gap-2.5">
          <I.alertOctagon size={16} className="text-danger shrink-0 mt-0.5" />
          <div className="text-caption text-text-secondary">
            <p className="font-bold text-text">Self-exclusion active</p>
            <p>Until {new Date(rg.selfExclusionUntil).toLocaleString("en-GB")}. One-way until expiry — only the player can re-enable after the period ends.</p>
          </div>
        </div>
      ) : <p className="text-caption text-text-tertiary">No self-exclusion active.</p>}
      {rg.coolingOffUntil && (
        <div className="rounded-md border border-warning-border bg-warning-bg/20 p-4 flex items-start gap-2.5">
          <I.shieldcheck s={16} />
          <div className="text-caption text-text-secondary">
            <p className="font-bold text-text">Cooling-off period</p>
            <p>Until {new Date(rg.coolingOffUntil).toLocaleString("en-GB")}.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md bg-bg-sunken/40 px-3 py-2">
      <dt className="font-mono text-micro tracking-[0.14em] uppercase text-text-tertiary">{label}</dt>
      <dd className="text-body-sm font-medium text-text mt-1 break-words">{value}</dd>
    </div>
  );
}

function computeRiskScore(txnCount: number, withdrawalsTotal: number, kycOk: boolean): number {
  // Simple deterministic 0-100 score:
  //   base 30 if KYC not approved, else 5
  //   + min(40, txnCount * 0.2)
  //   + min(30, withdrawalsTotal / 1_000_000 * 5)
  let score = kycOk ? 5 : 30;
  score += Math.min(40, txnCount * 0.2);
  score += Math.min(30, (withdrawalsTotal / 1_000_000) * 5);
  return Math.round(Math.min(100, score));
}
