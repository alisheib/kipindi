import Link from "next/link";
import { redirect } from "next/navigation";
import { PositionCard } from "@/components/markets/position-card";
import { listPositionsForUser, getMarket, seedDemoMarkets } from "@/lib/server/market-service";
import { currentSession } from "@/lib/server/auth-service";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "My positions · Madau yangu" };
export const dynamic = "force-dynamic";

export default async function PositionsPage() {
  seedDemoMarkets();
  const session = await currentSession();
  if (!session) redirect("/auth/login");

  const positions = listPositionsForUser(session.userId);
  const open = positions.filter((p) => p.status === "OPEN");
  const settled = positions.filter((p) => p.status !== "OPEN");

  return (
    <main className="mx-auto max-w-[1080px] px-3 lg:px-6 py-6 space-y-6">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-text-subtle">Positions · Madau</p>
        <h1 className="font-display text-[28px] font-bold text-text">Your predictions</h1>
        <p className="text-[15px] italic text-text-subtle">Utabiri wako</p>
      </header>

      <Section title="Open" sw="Hai" count={open.length}>
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
              const m = getMarket(p.marketId);
              if (!m) return null;
              return (
                <PositionCard
                  key={p.id}
                  marketId={p.marketId}
                  marketTitle={m.titleEn}
                  side={p.side}
                  stake={p.stake}
                  current={p.potentialPayout}
                  payout={p.potentialPayout}
                  status="OPEN"
                />
              );
            })}
          </div>
        )}
      </Section>

      <Section title="Settled" sw="Imekamilika" count={settled.length}>
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
              const m = getMarket(p.marketId);
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
                  status={p.status as "WIN" | "LOSS" | "VOID"}
                />
              );
            })}
          </div>
        )}
      </Section>
    </main>
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
          <Link
            href={"/markets" as never}
            className="inline-flex h-9 items-center px-4 rounded-pill bg-yes-500 font-semibold text-yes-950 hover:bg-yes-400 transition-colors text-[13px]"
          >
            Browse markets →
          </Link>
        ) : null
      }
    />
  );
}
