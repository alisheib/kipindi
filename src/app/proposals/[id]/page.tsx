import Link from "next/link";
import { notFound } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { currentSession } from "@/lib/server/auth-service";
import { getProposalDetail, timelineStep } from "@/lib/server/proposals-service";
import { getProposalsConfig } from "@/lib/server/proposals-config";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { VoteControl } from "@/components/proposals/vote-control";
import { StatusBadge } from "@/components/proposals/status-badge";
import { StatusTimeline } from "@/components/proposals/status-timeline";
import { CategoryIcon, CATEGORY_LABEL } from "@/components/proposals/category-icon";

export const dynamic = "force-dynamic";

export default async function ProposalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await currentSession();
  const p = getProposalDetail(id, session?.userId ?? null);
  if (!p) notFound();

  const cfg = getProposalsConfig();
  const open = p.status === "REVIEW" || p.status === "CHANGES_REQUESTED";
  const showPrize = p.status === "RESOLVED" && p.prizePaidTzs > 0 && p.isMine;

  return (
    <main className="mx-auto max-w-[640px] px-3 lg:px-6 py-6 space-y-3.5">
      {/* Head card */}
      <section className="rounded-xl glass-panel p-4">
        <div className="mb-2.5 flex flex-wrap items-center gap-2">
          <StatusBadge status={p.status} isHot={p.isHot} />
          <Chip variant="neutral"><CategoryIcon category={p.category} />{CATEGORY_LABEL[p.category]}</Chip>
          <span className="ml-auto font-mono text-[10.5px] text-text-subtle">resolves {p.resolutionDate}</span>
        </div>
        <h1 className="font-display text-[19px] font-bold leading-snug tracking-[-0.01em]">{p.titleEn}</h1>
        {p.titleSw && <p className="mt-0.5 font-display italic text-text-subtle text-[12.5px]">{p.titleSw}</p>}
        {p.description && <p className="mt-2 text-[13px] leading-relaxed text-text-muted">{p.description}</p>}
        <div className="mt-3.5 flex items-center gap-3">
          <VoteControl proposalId={p.id} up={p.up} down={p.down} myVote={p.myVote} horizontal disabled={!cfg.enabled || !open} />
          <span className="font-mono text-[11.5px] text-text-subtle">by {p.proposerMasked} · {p.up + p.down} votes</span>
        </div>
      </section>

      {/* Resolution criterion */}
      <section className="rounded-xl glass-panel p-4">
        <p className="mb-2 font-mono text-[9.5px] uppercase tracking-[0.12em] font-bold text-text-subtle">Resolution criterion · Vigezo</p>
        <p className="text-[13px] leading-relaxed text-text-muted">{p.resolutionCriterion}</p>
      </section>

      {/* Declined / changes-requested notice */}
      {p.status === "DECLINED" && (
        <section className="rounded-xl border p-4" style={{ borderColor: "color-mix(in oklab, var(--claret-500) 30%, var(--border))", background: "color-mix(in oklab, var(--claret-500) 7%, var(--bg-elevated))" }}>
          <div className="mb-1.5 flex items-center gap-2 text-claret-300"><I.void s={16} /><p className="text-[13px] font-bold">Declined · Imekataliwa</p></div>
          <p className="text-[12.5px] leading-relaxed text-text-muted">Reason: {p.declineReason}.{p.declineNote ? ` ${p.declineNote}` : ""}</p>
        </section>
      )}
      {p.status === "CHANGES_REQUESTED" && p.changeNote && (
        <section className="rounded-xl border p-4" style={{ borderColor: "color-mix(in oklab, var(--royal-500) 30%, var(--border))", background: "color-mix(in oklab, var(--royal-500) 8%, var(--bg-elevated))" }}>
          <div className="mb-1.5 flex items-center gap-2 text-royal-200"><I.edit s={16} /><p className="text-[13px] font-bold">Changes requested</p></div>
          <p className="text-[12.5px] leading-relaxed text-text-muted">{p.changeNote}</p>
        </section>
      )}

      {/* Resolved celebration for the proposer */}
      {showPrize && (
        <section className="relative overflow-hidden rounded-xl border p-5 text-center" style={{ borderColor: "var(--gold-700)", background: "linear-gradient(160deg, var(--bg-elevated), var(--royal-950))" }}>
          <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(180deg, transparent, color-mix(in oklab, var(--gold-700) 16%, transparent))" }} />
          <div className="relative">
            <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full text-gold-fg" style={{ background: "linear-gradient(135deg, var(--gold-400), var(--gold-700))" }}><I.trophy s={24} /></span>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-gold-300">Your proposal resolved</p>
            <p className="mt-1 font-display text-[20px] font-bold">You earned a prize</p>
            <p className="my-1 font-mono text-[28px] font-bold text-gold-300">+TZS {p.prizePaidTzs.toLocaleString()}</p>
            <p className="text-[12.5px] text-text-muted">Imelipwa · Paid to your wallet</p>
          </div>
        </section>
      )}

      {/* Timeline / market link */}
      {p.status !== "DECLINED" && (
        <section className="rounded-xl glass-panel p-4">
          <p className="mb-3 font-mono text-[9.5px] uppercase tracking-[0.12em] font-bold text-text-subtle">Status · Hali</p>
          <StatusTimeline current={timelineStep(p)} />
          {open && <p className="mt-1 text-[12px] text-text-subtle">An officer reviews next · Subiri ukaguzi.</p>}
          {p.publishedMarketId && (
            <Link href={`/markets/${p.publishedMarketId}` as never}>
              <Button variant={p.status === "RESOLVED" ? "gold" : "ghost"} size="md" fullWidth className="mt-3" trailing={<I.arrowRight s={15} />}>
                {p.status === "RESOLVED" ? "View the resolved market" : "View the live market"}
              </Button>
            </Link>
          )}
        </section>
      )}

      <Link href={"/proposals" as never} className="block text-center text-[12px] text-text-subtle hover:text-text-muted">← Back to proposals · Rudi</Link>
    </main>
  );
}
