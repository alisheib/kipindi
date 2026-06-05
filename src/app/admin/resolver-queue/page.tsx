import { AdminPageHead, AdminCard } from "@/components/admin/admin-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { ExternalLink, Users, ShieldCheck, AlertCircle } from "lucide-react";
import { I } from "@/components/ui/glyphs";
import { listMarkets, seedDemoMarkets, impliedYesPct } from "@/lib/server/market-service";
import { ProbabilityBar } from "@/components/markets/probability-bar";
import { CircularProgress } from "@/components/markets/circular-progress";
import { ResolveControls } from "./resolve-controls";

export const metadata = { title: "Admin · Resolver queue" };
export const dynamic = "force-dynamic";

const fmtTime = (iso: string) => new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

function timeUntil(iso: string): { label: string; tone: "default" | "soon" | "overdue" } {
  const ms = Date.parse(iso) - Date.now();
  if (ms <= 0) return { label: `${Math.abs(Math.floor(ms / 60_000))}m overdue`, tone: "overdue" };
  const m = Math.floor(ms / 60_000);
  if (m < 60) return { label: `${m}m`, tone: "soon" };
  const h = Math.floor(m / 60);
  if (h < 24) return { label: `${h}h`, tone: m < 60 * 24 ? "soon" : "default" };
  return { label: `${Math.floor(h / 24)}d`, tone: "default" };
}

export default function ResolverQueuePage() {
  seedDemoMarkets();
  // Markets within 24h of resolutionAt OR closed waiting for second-officer
  const now = Date.now();
  const within24h = listMarkets().filter((m) => {
    const due = Date.parse(m.resolutionAt);
    if (m.status === "CLOSED") return true;          // awaiting stage-2 second-officer
    if (m.status === "LIVE") return due - now < 24 * 3600_000; // due within 24h
    return false;
  }).sort((a, b) => Date.parse(a.resolutionAt) - Date.parse(b.resolutionAt));

  return (
    <>
      <AdminPageHead
        title="Resolver queue"
        sw="Foleni ya utatuzi"
        period={false}
      />
      <div className="px-4 lg:px-6 py-5 space-y-4">
        {within24h.length === 0 ? (
          <EmptyState
            kind="audit"
            title="Queue is clear"
            titleSw="Foleni ni tupu"
            body="No markets within 24 hours of resolution."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {within24h.map((m) => {
              const t = timeUntil(m.resolutionAt);
              const yes = impliedYesPct(m);
              const stage1 = !!m.resolutionStage1By;
              // Confidence: derived from how lopsided the pool is (proxy for crowd certainty)
              const confidence = Math.round(Math.abs(yes - 50) * 2);
              return (
                <AdminCard key={m.id} padding="p-0" data-market-id={m.id}>
                  <div className="flex items-start gap-4 p-4 border-b border-border">
                    <CircularProgress
                      value={confidence}
                      size={64}
                      stroke={5}
                      tone={confidence > 75 ? "yes" : confidence > 40 ? "teal" : "warning"}
                      label={`${confidence}%`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span
                          className={`inline-flex items-center rounded-pill border px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap ${
                            t.tone === "overdue" ? "border-no-700 bg-no-500/15 text-no-300"
                            : t.tone === "soon" ? "border-warning-border bg-warning-bg/40 text-warning-fg"
                            : "border-border bg-bg-overlay text-text-muted"
                          }`}
                        >
                          {t.label}
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">{m.category}</span>
                        <a href={m.sourceUrl} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 font-mono text-[11px] text-teal-300 hover:text-teal-200">
                          Source
                          <ExternalLink size={11} />
                        </a>
                      </div>
                      <h3 className="mt-1 font-display text-[15px] font-semibold leading-tight text-text line-clamp-2">{m.titleEn}</h3>
                      <p className="text-[12px] italic text-text-subtle line-clamp-1">{m.titleSw}</p>
                      <p className="mt-1 font-mono text-[11px] text-text-subtle">Resolves {fmtTime(m.resolutionAt)}</p>
                    </div>
                  </div>

                  <div className="px-4 py-3 border-b border-border">
                    <ProbabilityBar yesPct={yes} size="micro" />
                    <p className="mt-1 font-mono text-[10px] text-text-subtle">Crowd: {yes}% YES · {100 - yes}% NO</p>
                  </div>

                  <div className="px-4 py-3 border-b border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <I.users s={14} />
                      <span className="font-mono text-[10px] uppercase tracking-[0.14em] font-semibold text-text-muted">Two-officer rule</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[12px]">
                      <div className={`rounded-md border p-2 ${stage1 ? "border-yes-700 bg-yes-500/10" : "border-border bg-bg-overlay"}`}>
                        <div className="flex items-center gap-1.5">
                          <I.shieldcheck s={12} />
                          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">Stage 1</span>
                        </div>
                        <p className={`mt-1 font-mono text-[11px] ${stage1 ? "text-yes-300" : "text-text-subtle"}`}>
                          {stage1 ? `${m.resolutionStage1By?.slice(0, 14)}…` : "awaiting"}
                        </p>
                      </div>
                      <div className="rounded-md border border-border bg-bg-overlay p-2">
                        <div className="flex items-center gap-1.5">
                          <I.alertCircle s={12} />
                          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">Stage 2</span>
                        </div>
                        <p className="mt-1 font-mono text-[11px] text-text-subtle">{stage1 ? "ready for 2nd officer" : "unlocks after stage 1"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    <ResolveControls marketId={m.id} stage={stage1 ? "stage2" : "stage1"} />
                  </div>
                </AdminCard>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
