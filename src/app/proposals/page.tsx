import Link from "next/link";
import { redirect } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { currentSession } from "@/lib/server/auth-service";
import { listBoard, type BoardFilter, type ProposalView } from "@/lib/server/proposals-service";
import { getProposalsConfig } from "@/lib/server/proposals-config";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination, PLAYER_PER_PAGE } from "@/components/ui/pagination";
import { VoteControl } from "@/components/proposals/vote-control";
import { StatusBadge } from "@/components/proposals/status-badge";
import { CategoryIcon, CATEGORY_LABEL } from "@/components/proposals/category-icon";

export const metadata = { title: "Market Proposals · Mapendekezo" };
export const dynamic = "force-dynamic";

const FILTERS: Array<{ id: BoardFilter; label: string }> = [
  { id: "hot", label: "Hot" },
  { id: "new", label: "New" },
  { id: "listed", label: "Listed" },
  { id: "mine", label: "Mine" },
];

function ageStr(iso: string): string {
  const ms = Date.now() - Date.parse(iso);
  const d = Math.floor(ms / 86_400_000);
  if (d > 0) return `${d}d ago · siku ${d}`;
  const h = Math.floor(ms / 3_600_000);
  if (h > 0) return `${h}h ago · saa ${h}`;
  const m = Math.max(1, Math.floor(ms / 60_000));
  return `${m}m ago · dakika ${m}`;
}

export default async function ProposalsPage({ searchParams }: { searchParams: Promise<{ f?: string; page?: string }> }) {
  const sp = await searchParams;
  const filter: BoardFilter = (["hot", "new", "listed", "mine"] as const).includes(sp.f as BoardFilter) ? (sp.f as BoardFilter) : "hot";
  const session = await currentSession();
  if (filter === "mine" && !session) redirect("/auth/login?next=/proposals");

  const cfg = getProposalsConfig();
  const pageNum = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const { proposals, matchedCount, totalProposals, totalVotes, enabled, page } = await listBoard(session?.userId ?? null, filter, pageNum, PLAYER_PER_PAGE);
  const proposalsBaseHref = `/proposals?f=${filter}`;

  return (
    <main className="mx-auto max-w-[1080px] px-3 lg:px-6 py-6 space-y-3.5">
      <h1 className="sr-only">Market Proposals · Mapendekezo</h1>

      <div>
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-text-subtle">Market Proposals · Mapendekezo</p>
          {enabled && (
            <Link href={"/proposals/new" as never} className="shrink-0">
              <Button variant="gold" size="md" leading={<I.plus s={15} />}>Create · Pendekeza</Button>
            </Link>
          )}
        </div>
        <h2 className="mt-1 font-display text-[22px] font-bold leading-tight">Vote for the markets you want to see</h2>
        <p className="font-display italic text-text-subtle text-[13px]">Pigia kura soko unayotaka</p>
      </div>

      {/* Reward banner — compact info strip + mobile CTA */}
      <section
        className="relative overflow-hidden rounded-xl border border-border p-3.5"
        style={{ background: "linear-gradient(150deg, var(--bg-elevated), var(--royal-950))" }}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(120% 90% at 100% 0%, color-mix(in oklab, var(--gold-500) 12%, transparent), transparent 60%)" }} />
        <div className="relative flex items-center gap-3">
          <span className="text-gold-300"><I.sparkle s={18} /></span>
          <p className="text-[13px] flex-1 min-w-0">
            <span className="font-bold text-text">Propose &amp; get paid</span>{" "}
            <span className="italic text-text-subtle">· Pendekeza upate</span>
            {cfg.prizeTzs > 0 && (
              <span className="block sm:inline sm:ml-2 text-[12px] font-semibold text-gold-300">TZS {cfg.prizeTzs.toLocaleString()} per listed market</span>
            )}
          </p>
        </div>
        {enabled && (
          <Link href={"/proposals/new" as never} className="sm:hidden">
            <Button variant="gold" size="md" fullWidth leading={<I.plus s={15} />} className="mt-3">Create proposal · Pendekeza</Button>
          </Link>
        )}
      </section>

      {!enabled && (
        <div className="flex gap-2.5 rounded-xl border p-3" style={{ background: "color-mix(in oklab, var(--warning-500) 12%, transparent)", borderColor: "color-mix(in oklab, var(--warning-500) 30%, transparent)" }}>
          <span className="shrink-0" style={{ color: "oklch(84% 0.15 80)" }}><I.info s={16} /></span>
          <p className="text-[12px] leading-relaxed text-text-muted">Proposals are paused right now — the board is read-only. <span className="font-display italic text-text-subtle">Mapendekezo yamesimama kwa sasa.</span></p>
        </div>
      )}

      {/* Stats + filters */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <p className="font-mono text-[12px] text-text-muted">{totalProposals.toLocaleString()} proposals · {totalVotes.toLocaleString()} votes</p>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => {
            const active = f.id === filter;
            return (
              <Link
                key={f.id}
                href={`/proposals?f=${f.id}` as never}
                className="inline-flex h-[30px] items-center rounded-pill border px-3.5 text-[12.5px] font-semibold transition-colors"
                style={
                  active
                    ? { borderColor: "color-mix(in oklab, var(--gold-500) 40%, transparent)", background: "color-mix(in oklab, var(--gold-500) 14%, transparent)", color: "var(--gold-200)" }
                    : { borderColor: "var(--border)", color: "var(--text-muted)" }
                }
              >
                {f.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* List / empty */}
      {proposals.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {proposals.map((p) => (
              <ProposalCard key={p.id} p={p} disabled={!enabled} />
            ))}
          </div>
          {matchedCount > PLAYER_PER_PAGE && (
            <div className="rounded-lg border border-border bg-bg-elevated/40 overflow-hidden">
              <Pagination total={matchedCount} page={page} perPage={PLAYER_PER_PAGE} baseHref={proposalsBaseHref} />
            </div>
          )}
        </>
      ) : totalProposals === 0 ? (
        <EmptyState
          kind="markets"
          title="No proposals yet"
          titleSw="Bado hakuna mapendekezo"
          body={`Be the first to propose a market. If it gets listed and resolved, you earn TZS ${cfg.prizeTzs.toLocaleString()}.`}
          action={enabled ? (
            <Link href={"/proposals/new" as never}><Button variant="gold" size="sm" leading={<I.plus s={12} />}>Create · Pendekeza</Button></Link>
          ) : undefined}
        />
      ) : (
        <EmptyState
          kind="markets"
          title={`No proposals in ${FILTERS.find((f) => f.id === filter)?.label ?? "this filter"}`}
          titleSw="Hakuna mapendekezo katika kichujio hiki"
          body="Try another filter, or be the first to propose a market here."
          action={enabled ? (
            <Link href={"/proposals/new" as never}><Button variant="gold" size="sm" leading={<I.plus s={12} />}>Create · Pendekeza</Button></Link>
          ) : undefined}
        />
      )}
    </main>
  );
}

function ProposalCard({ p, disabled }: { p: ProposalView; disabled?: boolean }) {
  return (
    <div className="group flex items-start gap-3 rounded-xl glass-panel p-3.5 transition-all hover:-translate-y-0.5 hover:border-teal-400 hover:shadow-[var(--shadow-4),var(--glow-blue)]">
      <VoteControl proposalId={p.id} up={p.up} down={p.down} myVote={p.myVote} disabled={disabled} />
      <Link href={`/proposals/${p.id}` as never} className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <StatusBadge status={p.status} isHot={p.isHot} />
          <Chip variant="neutral"><CategoryIcon category={p.category} />{CATEGORY_LABEL[p.category]}</Chip>
          <span className="ml-auto font-mono text-[10.5px] text-text-subtle">{ageStr(p.createdAt)}</span>
        </div>
        <p className="font-display text-[15.5px] font-semibold leading-snug tracking-[-0.01em] text-text">{p.titleEn}</p>
        {p.titleSw && <p className="mt-0.5 font-display italic text-text-subtle text-[11.5px]">{p.titleSw}</p>}
        {p.description && <p className="mt-1.5 text-[12.5px] leading-relaxed text-text-muted line-clamp-2">{p.description}</p>}
        <div className="mt-2.5 flex items-center gap-3.5 font-mono text-[11px] text-text-subtle">
          <span>by {p.proposerMasked}</span>
          {p.status === "LISTED" && <span className="flex items-center gap-1 text-royal-200">View market <I.arrowRight s={12} /></span>}
          {p.status === "RESOLVED" && p.prizePaidTzs > 0 && <span className="flex items-center gap-1 text-gold-300"><I.coins s={12} /> +{p.prizePaidTzs.toLocaleString()} earned</span>}
          <I.chevronRight s={14} />
        </div>
      </Link>
    </div>
  );
}
