import Link from "next/link";
import { AdminPageHead, AdminCard, AdminKpi } from "@/components/admin/admin-shell";
import { AdminPagination, PER_PAGE, parsePage, buildBaseHref } from "@/components/admin/admin-pagination";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollX } from "@/components/ui/scroll-x";
import { listAssets, listChains, getUpDownConfig, abandonAfterSeconds } from "@/lib/server/updown-config";
import { roundStore, type RoundQuery } from "@/lib/server/updown-dal";
import { marketStore } from "@/lib/server/market-dal";
import { currentSession } from "@/lib/server/auth-service";
import { canUseControl, CONTROL_DOMAIN } from "@/lib/server/control-gates";
import { ControlLocked } from "@/components/admin/control-locked";
import { VoidRoundControl } from "./void-round-control";
import { formatTzs } from "@/lib/utils";

export const metadata = { title: "Admin · Up & Down · Rounds" };
export const dynamic = "force-dynamic";

const fmt = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toISOString().slice(5, 16).replace("T", " ") + "Z" : "—";
};

/** The outcome filter's closed set — validated, so `?outcome=BOGUS` cannot render an
 *  empty table the operator reads as "no rounds". */
const OUTCOMES = ["UP", "DOWN", "VOID", "PENDING"] as const;

/** How many overdue rounds the whole-set sweep will look at. The healer's own batch is
 *  bounded the same way; past this the KPI reads "200+", which is the honest answer and
 *  is anyway a five-alarm number. */
const OVERDUE_SCAN_CAP = 200;

/**
 * Round explorer for the sealed Up & Down section — every round across all chains, with
 * its price story (open → close), outcome, and the money on it. This is the operator's
 * audit view of the game: what resolved, how it moved, what it earned.
 *
 * ⛔ IT USED TO SHOW SIXTY OF THEM AND SAY NOTHING (campaign finding G-1, 2026-08-02).
 * The read was `limit: 30` per chain, merged, `.slice(0, 60)`, and the card title was
 * `Rounds · 60`. Production held **1,402**, so 96% of the operator's audit view was
 * missing and there was no control anywhere on the page that could reach it. A grid that
 * silently truncates is worse than one that is empty: the empty one prompts a question.
 * Now the row set is paged in the DATABASE (`roundStore.list` + `count` share one
 * `where`), and the totals below describe every matching round, not the visible slice.
 */
export default async function AdminUpDownRoundsPage({
  searchParams,
}: {
  searchParams: Promise<{ asset?: string; outcome?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const [assets, chains] = await Promise.all([listAssets().catch(() => []), listChains().catch(() => [])]);
  const assetById = new Map(assets.map((a) => [a.id, a]));
  const chainById = new Map(chains.map((c) => [c.id, c]));

  // E-18's lesson, applied rather than repeated: this route is `trading`, but voiding a
  // round hands real money back and is therefore `compliance` (control-gates.ts). Ask
  // the SAME question the action will ask, and render a read-only state instead of a
  // control that bounces — a refused click writes a SECURITY privilege_escalation_blocked
  // row against a legitimate operator.
  const session = await currentSession();
  const canVoidRound = await canUseControl(session?.role, "voidUpDownRound");

  // The self-healer's deadline (E-24), so the "overdue" flag on this page and the
  // guarantee the engine actually makes are one number, never two.
  const cfg = await getUpDownConfig().catch(() => null);
  const overdueMs = (cfg ? abandonAfterSeconds(cfg) : 390) * 1000;

  // ── the filter, validated against closed sets ──────────────────────────────
  // An asset owns one chain per cadence (XAU already has 5m and 15m), so filtering by
  // asset means filtering by that asset's chain IDs — a single `chainId` would show one
  // cadence and label it the asset.
  const assetKey = assets.some((a) => a.key === sp.asset) ? sp.asset : undefined;
  const outcome = (OUTCOMES as readonly string[]).includes(sp.outcome ?? "")
    ? (sp.outcome as RoundQuery["outcome"])
    : undefined;
  const badFilter = (!!sp.asset && !assetKey) || (!!sp.outcome && !outcome);
  const filterAsset = assetKey ? assets.find((a) => a.key === assetKey) : undefined;
  const query: RoundQuery = {
    ...(filterAsset ? { chainIds: chains.filter((c) => c.assetId === filterAsset.id).map((c) => c.id) } : {}),
    ...(outcome ? { outcome } : {}),
  };

  // ── the page slice, counted in the database ────────────────────────────────
  // `total` answers the same `where` as `list`, so the pager can never claim a page the
  // table cannot fill. The four totals beside it are whole-set too: a "Voided" figure
  // that only counted the visible page would move every time the operator turned it.
  const [total, unsettled, voided, pending] = await Promise.all([
    roundStore.count(query).catch(() => 0),
    roundStore.count({ ...query, unsettledOnly: true }).catch(() => 0),
    roundStore.count({ ...query, outcome: "VOID" }).catch(() => 0),
    roundStore.count({ ...query, outcome: "PENDING" }).catch(() => 0),
  ]);
  const page = parsePage(sp.page, total);
  const rounds = await roundStore
    .list({ ...query, limit: PER_PAGE, offset: (page - 1) * PER_PAGE })
    .catch(() => []);
  const baseHref = buildBaseHref("/admin/updown/rounds", { asset: assetKey, outcome });

  const enriched = await Promise.all(
    rounds.map(async (r) => {
      const m = await marketStore.get(r.marketId).catch(() => null);
      const chain = chainById.get(r.chainId);
      const asset = chain ? assetById.get(chain.assetId) : undefined;
      return {
        r,
        asset,
        durationMinutes: chain?.durationMinutes ?? 0,
        volume: m ? m.yesPool + m.noPool : 0,
        players: m?.predictorCount ?? 0,
        decimals: asset?.decimals ?? 2,
      };
    }),
  );

  const settled = total - unsettled;
  const pageVol = enriched.reduce((s, e) => s + e.volume, 0);

  // A round past the healer's deadline and still unresolved is the E-24 symptom
  // recurring, and it is the one number on this page that means money is not moving.
  //
  // ⛔ THIS MUST BE READ ACROSS THE WHOLE SET, NOT THE PAGE. Paging the table (G-1) would
  // otherwise have made the money signal WORSE than the truncation it fixed: the oldest
  // stuck round sorts last, so an operator standing on page 1 of 71 would be told
  // "Overdue: 0" while a stranded stake sat on page 71. `unresolvedBefore` is the same
  // read the self-healer performs, so the console and the engine agree by construction.
  const now = Date.now();
  const overdueRounds = await roundStore
    .unresolvedBefore(new Date(now - overdueMs).toISOString(), OVERDUE_SCAN_CAP)
    .catch(() => []);
  // The asset filter narrows the alarm to what the operator is looking at; the count
  // still ignores which PAGE they are on.
  const stuckAll = query.chainIds ? overdueRounds.filter((r) => query.chainIds!.includes(r.chainId)) : overdueRounds;
  const stuckLabel = stuckAll.length >= OVERDUE_SCAN_CAP ? `${OVERDUE_SCAN_CAP}+` : String(stuckAll.length);
  // ⚠️ The COUNT is the alarm and it is unbounded; the MONEY beside it is bounded on
  // purpose. Each figure costs one market read, and firing 200 of them in parallel would
  // make this page slowest at the exact moment it matters most — when the healer has
  // stopped and an operator is trying to see how much is stranded. So sum at most
  // MONEY_SCAN and say "at least" when there are more, rather than quoting a total that
  // is really a sample.
  const MONEY_SCAN = 25;
  const stuckMoney = (
    await Promise.all(
      stuckAll.slice(0, MONEY_SCAN).map((r) => marketStore.get(r.marketId).then((m) => (m ? m.yesPool + m.noPool : 0)).catch(() => 0)),
    )
  ).reduce((s, v) => s + v, 0);
  const stuckMoneyLabel = `${stuckAll.length > MONEY_SCAN ? "at least " : ""}${formatTzs(stuckMoney)}`;

  const usd = (n: number, d: number) => (n == null ? "—" : `$${n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })}`);

  return (
    <>
      <AdminPageHead title="Up & Down · Rounds" sw="Raundi za Juu na Chini" />
      <div className="px-4 lg:px-6 py-5 space-y-4">
        {/* Every figure here counts the whole FILTERED set, not the visible page — the
            one exception names itself ("on this page"), because turnover needs a market
            row per round and reading 1,402 of them to fill a tile is not a trade worth
            making. */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <AdminKpi label="Settled" sw="Zimekamilika" value={settled.toLocaleString()} delta={`of ${total.toLocaleString()} total`} spark={false} />
          <AdminKpi label="Turnover on this page" sw="Mzunguko (ukurasa huu)" value={formatTzs(pageVol)} spark={false} />
          <AdminKpi label="Voided" sw="Batili" value={voided.toLocaleString()} delta={voided > 0 ? "refunded in full" : "none"} spark={false} />
          <AdminKpi
            label="Overdue"
            sw="Zimechelewa"
            value={stuckLabel}
            delta={stuckAll.length > 0 ? `${stuckMoneyLabel} not moving` : "none — all closed on time"}
            spark={false}
          />
        </div>

        {stuckAll.length > 0 && (
          <AdminCard title="Rounds past their deadline" sw="Raundi zilizochelewa" padding="p-4">
            <p className="text-[12.5px] leading-[1.6] text-text-muted">
              {stuckAll.length === 1 ? "One round has" : `${stuckLabel} rounds have`} passed their price boundary
              by more than {Math.round(overdueMs / 1000)}s without reaching a verdict, holding{" "}
              <strong className="text-text">{stuckMoneyLabel}</strong> of player stakes. The platform closes
              and refunds these automatically within that window, so seeing one here means the automatic recovery
              is not running — check the lifecycle ticker before voiding by hand.{" "}
              <Link href="/admin/updown/rounds?outcome=PENDING" className="text-yes-300 hover:text-yes-200">
                Show every round still without a verdict ({pending.toLocaleString()})
              </Link>.
            </p>
          </AdminCard>
        )}

        {/* Filters. Same idiom as the audit log: a Chip inside a Link, with a 44px-tall
            hit area (WCAG 2.5.5 AAA) around a chip that keeps its own size. */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Link href={buildBaseHref("/admin/updown/rounds", { outcome })} className="inline-flex items-center min-h-[44px] transition-opacity hover:opacity-80">
            <Chip size="lg" variant={!assetKey ? "brand" : "neutral"} selected={!assetKey}>All assets</Chip>
          </Link>
          {assets.map((a) => (
            <Link
              key={a.key}
              href={buildBaseHref("/admin/updown/rounds", { asset: a.key, outcome })}
              className="inline-flex items-center min-h-[44px] transition-opacity hover:opacity-80"
            >
              <Chip size="lg" variant={assetKey === a.key ? "brand" : "neutral"} selected={assetKey === a.key}>{a.key}</Chip>
            </Link>
          ))}
          {/* Separates the asset chips from the outcome chips. Hidden below `sm`, where
              the row wraps and a divider that has lost the thing on its left just reads
              as a stray mark at the start of a line. */}
          <span className="hidden sm:block mx-2 h-5 w-px bg-border-subtle" aria-hidden />
          <Link href={buildBaseHref("/admin/updown/rounds", { asset: assetKey })} className="inline-flex items-center min-h-[44px] transition-opacity hover:opacity-80">
            <Chip size="lg" variant={!outcome ? "brand" : "neutral"} selected={!outcome}>Any outcome</Chip>
          </Link>
          {OUTCOMES.map((o) => (
            <Link
              key={o}
              href={buildBaseHref("/admin/updown/rounds", { asset: assetKey, outcome: o })}
              className="inline-flex items-center min-h-[44px] transition-opacity hover:opacity-80"
            >
              <Chip size="lg" variant={outcome === o ? "brand" : "neutral"} selected={outcome === o}>{o}</Chip>
            </Link>
          ))}
          <span className="ml-auto font-mono text-[10px] tracking-[0.14em] uppercase text-text-subtle">
            {total.toLocaleString()} rounds
          </span>
        </div>
        {badFilter && (
          <p className="font-mono text-[11px] text-warning-fg bg-warning-bg border border-warning-border rounded-md px-3 py-2">
            Unknown asset or outcome &mdash; showing every round. Pick one from the chips above.
          </p>
        )}

        <AdminCard title={`Rounds · ${total.toLocaleString()}`} sw="Raundi" padding="p-0">
          {enriched.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title={total === 0 && !assetKey && !outcome ? "No rounds yet" : "No rounds match this filter"}
                body={
                  total === 0 && !assetKey && !outcome
                    ? "Rounds appear here once a chain is running. Start one from the Overview."
                    : "Clear the asset or outcome chips above to see every round."
                }
              />
            </div>
          ) : (
            <ScrollX label="Up & Down rounds">
              <table className="admin-tbl min-w-[1020px]">
                <thead>
                  <tr className="text-left font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle border-b border-border-subtle">
                    <th className="px-4 py-2.5 font-semibold">Round</th>
                    <th className="px-4 py-2.5 font-semibold">Window (UTC)</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Open → Close</th>
                    <th className="px-4 py-2.5 font-semibold">Outcome</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Volume</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Players</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Settled</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Remedy</th>
                  </tr>
                </thead>
                <tbody>
                  {enriched.map(({ r, asset, durationMinutes, volume, players, decimals }) => {
                    const moved = r.openPrice != null && r.closePrice != null ? r.closePrice - r.openPrice : null;
                    return (
                      <tr key={r.id} className="border-b border-border-subtle/60 last:border-0">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-mono font-bold text-text">{asset?.key ?? "?"} {durationMinutes}m #{r.roundNumber}</div>
                          <div className="font-mono text-[10.5px] text-text-subtle">{asset?.nameEn ?? "unknown"}</div>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-text-muted whitespace-nowrap">
                          {fmt(r.opensAt)} → {fmt(r.closesAt)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[11.5px] tabular-nums whitespace-nowrap"
                            style={{ color: moved == null ? "var(--text-muted)" : moved > 0 ? "var(--yes-300)" : moved < 0 ? "var(--no-300)" : "var(--text-muted)" }}>
                          {usd(r.openPrice as number, decimals)} → {usd(r.closePrice as number, decimals)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={"chip " + (r.outcome === "UP" ? "chip-yes" : r.outcome === "DOWN" ? "chip-no" : r.outcome === "VOID" ? "chip-pending" : "chip-pending")}>
                            {r.outcome ?? (r.resolvedAt ? "—" : "PENDING")}
                            {r.outcome === "VOID" && r.voidReason ? ` · ${r.voidReason}` : ""}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[11.5px] tabular-nums text-text-muted">{formatTzs(volume)}</td>
                        <td className="px-4 py-3 text-right font-mono text-[11.5px] tabular-nums text-text-muted">{players}</td>
                        <td className="px-4 py-3 text-right font-mono text-[10.5px] text-text-subtle whitespace-nowrap">{r.settledAt ? fmt(r.settledAt) : "—"}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {/* The lever exists ONLY where it can do something: an unsettled
                              round. Once the money has moved there is nothing to refund and
                              the service refuses anyway, so offering it on a settled round
                              would be a button that always refuses — the very defect E-18
                              is about. A viewer who may not act gets a locked state, not a
                              live-looking control that files their click as an attempted
                              privilege escalation. */}
                          {r.settledAt ? (
                            <span className="font-mono text-[10.5px] text-text-subtle">—</span>
                          ) : canVoidRound ? (
                            <VoidRoundControl
                              roundId={r.id}
                              label={`${asset?.key ?? "?"} ${durationMinutes}m #${r.roundNumber}`}
                              volume={formatTzs(volume)}
                              players={players}
                            />
                          ) : (
                            <ControlLocked what="Void & refund" need={CONTROL_DOMAIN.voidUpDownRound} />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollX>
          )}
          <AdminPagination total={total} page={page} baseHref={baseHref} />
        </AdminCard>
        <p className="text-[11.5px] leading-[1.55] text-text-subtle">
          Each round is a settled or in-flight price market. Open and close prices are read from the asset&rsquo;s approved
          source at the round&rsquo;s grid boundaries; a round that could not confirm a price VOIDs and refunds every stake
          in full. Full per-round proof (both source links + quoted times) is on each round&rsquo;s market page.
          Every round reaches a verdict — or a full refund — within {Math.round(overdueMs / 1000)}s of its boundary,
          automatically; <em>Void &amp; refund</em> is the manual remedy for when it has not. Only an unsettled round can
          be voided, and the reason you give is written to the audit trail.
        </p>
      </div>
    </>
  );
}
