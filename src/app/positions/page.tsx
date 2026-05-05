import { redirect } from "next/navigation";
import { PositionCard } from "@/components/markets/position-card";
import { listPositionsForUser, getMarket, seedDemoMarkets } from "@/lib/server/market-service";
import { currentSession } from "@/lib/server/auth-service";

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
          <Empty>You don&apos;t have any open positions yet.<br /><span className="italic text-text-subtle">Bado huna utabiri wowote hai.</span></Empty>
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
          <Empty>No settled positions yet.<br /><span className="italic text-text-subtle">Bado hakuna utabiri uliokamilika.</span></Empty>
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

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-bg-elevated/40 p-10 text-center">
      <p className="text-[14px] text-text-muted">{children}</p>
    </div>
  );
}
