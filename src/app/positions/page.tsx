import Link from "next/link";
import { redirect } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { PositionCard } from "@/components/markets/position-card";
import { SellButton } from "@/components/markets/sell-button";
import { listPositionsForUser, getMarket, seedDemoMarkets, cashOutValue } from "@/lib/server/market-service";
import { currentSession } from "@/lib/server/auth-service";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "History · Historia" };
export const dynamic = "force-dynamic";

const fmtTzs = (n: number) => `TZS ${Math.round(n).toLocaleString("en-US")}`;

export default async function PositionsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  seedDemoMarkets();
  const session = await currentSession();
  if (!session) redirect("/auth/login");
  const sp = await searchParams;
  const activeTab: "open" | "settled" | "all" = (["open", "settled", "all"] as const).includes(sp.tab as "open" | "settled" | "all") ? (sp.tab as "open" | "settled" | "all") : "all";

  const positions = await listPositionsForUser(session.userId);
  const open = positions.filter((p) => p.status === "OPEN");
  const settled = positions.filter((p) => p.status !== "OPEN");

  // Pre-fetch all referenced markets so we don't await inside JSX .map()
  const marketIds = [...new Set(positions.map((p) => p.marketId))];
  const marketMap = new Map<string, Awaited<ReturnType<typeof getMarket>>>();
  for (const mid of marketIds) {
    marketMap.set(mid, await getMarket(mid));
  }

  // P&L summary — open at-risk + live cash-out value, settled net.
  const openStake = open.reduce((s, p) => s + p.stake, 0);
  let openLiveValue = 0;
  for (const p of open) {
    const m = marketMap.get(p.marketId);
    if (m && m.status === "LIVE") {
      openLiveValue += (await cashOutValue(
        { side: p.side, stake: p.stake },
        { id: m.id, yesPool: m.yesPool, noPool: m.noPool },
      )).value;
    } else {
      openLiveValue += p.potentialPayout;
    }
  }
  // Pre-compute cash-out values for open positions (cashOutValue is async)
  const openCashOutValues = new Map<string, number | null>();
  for (const p of open) {
    const m = marketMap.get(p.marketId);
    if (m && m.status === "LIVE") {
      openCashOutValues.set(p.id, (await cashOutValue({ side: p.side, stake: p.stake }, { id: m.id, yesPool: m.yesPool, noPool: m.noPool })).value);
    } else {
      openCashOutValues.set(p.id, null);
    }
  }

  const settledNet = settled.reduce((s, p) => {
    if (p.status === "WIN" || p.status === "CASHED_OUT") return s + ((p.finalPayout ?? 0) - p.stake);
    if (p.status === "LOSS") return s - p.stake;
    return s; // VOID = 0
  }, 0);
  const wins = settled.filter((p) => p.status === "WIN").length;
  const losses = settled.filter((p) => p.status === "LOSS").length;
  const cashOuts = settled.filter((p) => p.status === "CASHED_OUT").length;

  return (
    <main className="mx-auto max-w-[1080px] px-3 lg:px-6 py-6 space-y-6">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-text-subtle">History · Historia</p>
        <h1 className="font-display text-[28px] font-bold text-text leading-tight tracking-[-0.02em]">Polls you&rsquo;ve played</h1>
        <p className="text-[15px] italic text-text-subtle">Kura ulizocheza</p>
      </header>

      {/* Tab filter — All / Open / Settled (matches markets page filter pattern) */}
      {positions.length > 0 && (
        <nav className="flex flex-wrap items-center gap-1.5" aria-label="Position filter">
          {([
            { id: "all", label: "All", sw: "Zote", count: positions.length },
            { id: "open", label: "Open", sw: "Hai", count: open.length },
            { id: "settled", label: "Settled", sw: "Imekamilika", count: settled.length },
          ] as const).map((t) => {
            const on = activeTab === t.id;
            return (
              <Link
                key={t.id}
                href={`/positions${t.id === "all" ? "" : `?tab=${t.id}`}` as never}
                className={
                  "inline-flex h-8 items-center rounded-md border px-3.5 font-mono text-[12px] font-semibold whitespace-nowrap transition-all " +
                  (on
                    ? "border-brand-500 text-text"
                    : "border-border bg-bg-elevated/60 text-text-muted hover:border-brand-400 hover:text-text")
                }
                style={on ? { background: "oklch(40% 0.12 262 / 0.35)", boxShadow: "0 0 10px oklch(63% 0.18 262 / 0.15)" } : undefined}
                aria-current={on ? "page" : undefined}
              >
                {t.label}
                <span className="ml-1.5 italic font-normal text-[10.5px] text-text-subtle">· {t.sw}</span>
                <span className="ml-1.5 font-mono text-[10px] tabular-nums opacity-60">{t.count}</span>
              </Link>
            );
          })}
        </nav>
      )}

      {/* P&L summary strip — only render when the user has any positions */}
      {positions.length > 0 && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryCell
            label="At risk"   sw="Hatarini"
            value={fmtTzs(openStake)}
            sub={`${open.length} open`}
            icon={<I.clock s={13} />}
          />
          <SummaryCell
            label="Live value" sw="Thamani sasa"
            value={fmtTzs(openLiveValue)}
            sub={openLiveValue >= openStake
              ? `+${fmtTzs(openLiveValue - openStake)} unrealised`
              : `−${fmtTzs(openStake - openLiveValue)} unrealised`}
            tone={openLiveValue >= openStake ? "yes" : "no"}
            icon={openLiveValue >= openStake
              ? <I.trendingUp s={13} />
              : <I.trendingDown s={13} />}
          />
          <SummaryCell
            label="Settled P&L" sw="Faida ya jumla"
            value={(settledNet >= 0 ? "+" : "−") + fmtTzs(Math.abs(settledNet))}
            sub={`${wins}W · ${losses}L · ${cashOuts}C`}
            tone={settledNet >= 0 ? "gold" : "no"}
            icon={<I.coins s={13} />}
          />
          <SummaryCell
            label="Win rate" sw="Asilimia ya ushindi"
            value={settled.length > 0 ? `${Math.round((wins / settled.length) * 100)}%` : "—"}
            sub={`${settled.length} settled`}
            icon={<I.trendingUp s={13} />}
          />
        </section>
      )}

      {(activeTab === "all" || activeTab === "open") && <Section title="Open" sw="Hai" count={open.length}>
        {open.length === 0 ? (
          <Empty
            kind="positions"
            title="No open positions yet"
            titleSw="Bado huna utabiri hai"
            body="Pick a market and drag the conviction dial to commit your first prediction."
            bodySw="Chagua soko, geuza dial ya imani, ushiriki utabiri wako wa kwanza."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {open.map((p) => {
              const m = marketMap.get(p.marketId);
              if (!m) return null;
              const liveValue = openCashOutValues.get(p.id) ?? null;
              return (
                <div key={p.id} className="space-y-2">
                  <PositionCard
                    marketId={p.marketId}
                    marketTitle={m.titleEn}
                    side={p.side}
                    stake={p.stake}
                    current={liveValue ?? p.potentialPayout}
                    payout={p.potentialPayout}
                    status="OPEN"
                  />
                  {liveValue !== null && (
                    <SellButton
                      positionId={p.id}
                      stake={p.stake}
                      value={liveValue}
                      resolutionAt={m.resolutionAt}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>}

      {(activeTab === "all" || activeTab === "settled") && <Section title="Settled" sw="Imekamilika" count={settled.length}>
        {settled.length === 0 ? (
          <Empty
            kind="default"
            title="No settled positions yet"
            titleSw="Bado hakuna utabiri uliokamilika"
            body="Settled positions appear here once their markets resolve."
            bodySw="Utabiri uliokamilika utaonekana hapa baada ya soko kutatuliwa."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {settled.map((p) => {
              const m = marketMap.get(p.marketId);
              if (!m) return null;
              return (
                <PositionCard
                  key={p.id}
                  marketId={p.marketId}
                  marketTitle={m.titleEn}
                  side={p.side}
                  stake={p.stake}
                  current={p.finalPayout ?? 0}
                  payout={p.finalPayout ?? 0}
                  status={p.status as "WIN" | "LOSS" | "VOID" | "CASHED_OUT"}
                />
              );
            })}
          </div>
        )}
      </Section>}
    </main>
  );
}

function SummaryCell({
  label, sw, value, sub, tone = "neutral", icon,
}: {
  label: string; sw: string; value: string; sub: string;
  tone?: "neutral" | "yes" | "no" | "gold";
  icon?: React.ReactNode;
}) {
  const valueClass =
    tone === "yes"  ? "text-yes-300"
    : tone === "no"   ? "text-no-300"
    : tone === "gold" ? "text-gold-300"
    : "text-text";
  return (
    <div className="rounded-xl border border-border bg-bg-elevated px-4 py-3.5">
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-text-subtle">{icon}</span>}
        <p className="font-mono text-[9.5px] uppercase tracking-[0.08em] font-semibold text-text-subtle">{label}</p>
      </div>
      <p className={`mt-1.5 font-mono text-[18px] font-bold tabular-nums leading-tight ${valueClass}`}>{value}</p>
      <p className="text-[11px] italic text-text-subtle">{sw}</p>
      <p className="mt-1 font-mono text-[10.5px] tabular-nums text-text-muted">{sub}</p>
    </div>
  );
}

function Section({ title, sw, count, children }: { title: string; sw: string; count: number; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 flex items-baseline gap-2">
        <span className="font-display text-[20px] font-semibold text-text">{title}</span>
        <span className="text-[13px] italic text-text-subtle">· {sw}</span>
        <span className="ml-auto font-mono text-[12px] text-text-subtle">{count}</span>
      </h2>
      {children}
    </section>
  );
}

function Empty({ kind, title, titleSw, body, bodySw }: { kind: "positions" | "default"; title: string; titleSw: string; body?: string; bodySw?: string }) {
  return (
    <EmptyState
      kind={kind}
      title={title}
      titleSw={titleSw}
      body={body}
      bodySw={bodySw}
      action={
        kind === "positions" ? (
          <Link href={"/markets" as never} className="btn btn-gold btn-sm">
            Browse markets →
          </Link>
        ) : null
      }
    />
  );
}
