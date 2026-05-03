import { MatchCard } from "@/components/betting/match-card";
import { Chip } from "@/components/ui/chip";
import { getActiveAdapter, trace } from "@/lib/server/match-feed";

export const metadata = { title: "Live · Mechi" };
export const dynamic = "force-dynamic";

export default async function LivePage() {
  const adapter = getActiveAdapter();
  const all = await trace("listToday", () => adapter.listToday());
  const live = all.filter((m) => m.status === "live");
  const soon = all.filter((m) => m.status === "scheduled");
  const finished = all.filter((m) => m.status === "finished");

  return (
    <div className="mx-auto max-w-[1280px] px-3 lg:px-6 py-4 lg:py-6 space-y-5">
      <header className="space-y-1">
        <h1 className="font-display text-title-lg text-text">Live & upcoming · Moja kwa moja</h1>
        <p className="text-body text-text-secondary">All matches across NBC Premier League and Tanzania FA Cup.</p>
      </header>

      <div className="flex items-center gap-1.5 flex-wrap">
        <Chip variant="brand" selected>All sports · Yote</Chip>
        <Chip variant="neutral">Football · Soka</Chip>
        <Chip variant="neutral">By kickoff · Kuanza</Chip>
        <Chip variant="neutral">Window open · Kipindi wazi</Chip>
      </div>

      {live.length > 0 && (
        <Section title={`Live · ${live.length}`} accent="success">
          <Grid>{live.map((m) => <MatchCard key={m.id} match={m} />)}</Grid>
        </Section>
      )}
      {soon.length > 0 && (
        <Section title={`Starting soon · ${soon.length}`}>
          <Grid>{soon.map((m) => <MatchCard key={m.id} match={m} />)}</Grid>
        </Section>
      )}
      {finished.length > 0 && (
        <Section title={`Finished · Imekwisha`} accent="muted">
          <Grid>{finished.map((m) => <MatchCard key={m.id} match={m} />)}</Grid>
        </Section>
      )}
    </div>
  );
}

function Section({ title, accent, children }: { title: string; accent?: "success" | "muted"; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="font-display text-title-md text-text">{title}</h2>
        {accent === "success" && <span aria-hidden className="h-2 w-2 rounded-pill bg-success kp-ping" />}
      </div>
      {children}
    </section>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 auto-rows-fr">{children}</div>;
}
