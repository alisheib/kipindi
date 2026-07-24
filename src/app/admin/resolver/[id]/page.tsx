import { notFound } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { AdminPageHead, AdminCard } from "@/components/admin/admin-shell";
import { Chip } from "@/components/ui/chip";
import { I } from "@/components/ui/glyphs";
import { ProbabilityBar } from "@/components/markets/probability-bar";
import { CountdownRing } from "@/components/positions/countdown-ring";
import { getMarket, impliedYesPct, listPositionsForMarket } from "@/lib/server/market-service";
import { getRequireTwoOfficerResolution } from "@/lib/server/resolution-policy";
import { getAuditPage } from "@/lib/server/audit";
import { officerLabel } from "@/lib/server/actor-label";
import { currentSession } from "@/lib/server/auth-service";
import { formatDateTime, formatTzs } from "@/lib/utils";
import { CEREMONY, SELECTION, bi } from "@/lib/admin-status-lexicon";
import { ResolutionCeremony } from "./resolution-ceremony";

export const metadata = { title: "Admin · Resolution ceremony" };
export const dynamic = "force-dynamic";


export default async function ResolutionCeremonyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = await getMarket(id).catch(() => null);
  if (!m) notFound();

  const session = await currentSession();
  const currentOfficerId = session?.userId ?? "";

  const yes = impliedYesPct(m);
  // A-5: distinguish a failed positions read from a genuine 0-open so the ceremony
  // header shows "— open" rather than a fabricated "0 open".
  let positionsFailed = false;
  const positions = await listPositionsForMarket(m.id).catch(() => { positionsFailed = true; return []; });
  const openCount = positions.filter((p) => p.status === "OPEN").length;
  const grossPool = m.yesPool + m.noPool;

  const settled = m.status === "RESOLVED" || m.status === "VOIDED";
  const stage1By = m.resolutionStage1By;
  const stage2By = m.resolutionStage2By;
  const stage: "stage1" | "stage2" = stage1By ? "stage2" : "stage1";
  // Two-admin authorization (resolver-queue toggle, default OFF): the ONE flag for
  // how many officers a resolution needs. OFF ⇒ single admin seals in one action —
  // no second officer, no self-countersign block. ON ⇒ stage-2 must be a DIFFERENT
  // officer, so a same-officer countersign is blocked.
  const requireTwoOfficer = await getRequireTwoOfficerResolution().catch(() => false);
  const isSelfCountersign = requireTwoOfficer && stage === "stage2" && !!currentOfficerId && currentOfficerId === stage1By;

  const [officerA, officerB] = await Promise.all([officerLabel(stage1By), officerLabel(stage2By)]);

  // Evidence + attestation timeline from the immutable audit trail (bounded scan).
  const resolutionAudit = getAuditPage({ category: "ADMIN", limit: 500 })
    .filter((e) => e.targetId === m.id && e.action.startsWith("market.resolve"))
    .reverse(); // oldest → newest (stage1 then stage2)
  const stage1Entry = resolutionAudit.find((e) => e.action === "market.resolve.stage1");
  const recordedEvidence = (stage1Entry?.payload?.evidence as string | null | undefined) ?? null;

  const verdictColor = (o: string | null) =>
    o === "YES" ? "var(--yes-300)" : o === "NO" ? "var(--no-300)" : o === "VOID" ? "var(--claret-300)" : "var(--text)";

  return (
    <>
      <AdminPageHead
        title="Resolution ceremony"
        sw="Sherehe ya utatuzi"
        period={false}
        actions={
          <Link
            href={"/admin/resolver-queue" as Route}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-bg-inset font-mono text-[11px] tracking-[0.08em] uppercase text-text-muted hover:text-text hover:border-border-strong transition-colors"
          >
            <I.chevronLeft s={13} /> Queue
          </Link>
        }
      />

      <div className="px-4 lg:px-6 py-5">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] items-start">
          {/* ── Evidence (left) ─────────────────────────────────────────── */}
          <div className="space-y-4">
            <AdminCard>
              <div className="flex flex-wrap items-center gap-2">
                <Chip size="sm" variant="neutral">{m.category}</Chip>
                {settled ? (
                  <Chip size="sm" variant={m.status === "VOIDED" ? "claret" : "resolved"}>
                    {m.status === "VOIDED" ? "VOIDED" : `SEALED · ${m.resolvedOutcome}`}
                  </Chip>
                ) : requireTwoOfficer && stage === "stage2" ? (
                  <Chip size="sm" variant="warning">{CEREMONY.awaitingSecondOfficer.en.toUpperCase()}</Chip>
                ) : requireTwoOfficer ? (
                  <Chip size="sm" variant="pending">{CEREMONY.awaitingStage1.en.toUpperCase()}</Chip>
                ) : (
                  <Chip size="sm" variant="pending">AWAITING RESOLUTION</Chip>
                )}
                <span className="ml-auto font-mono text-[10px] text-text-subtle">{m.id}</span>
              </div>
              <h1 className="mt-2 font-display text-[18px] font-bold leading-tight text-text">{m.titleEn}</h1>
              {m.titleSw && <p className="text-[13px] italic text-text-subtle">{m.titleSw}</p>}

              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-dashed border-border-subtle pt-3 text-[12px]">
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">{SELECTION.betsClosed.en}</dt>
                  <dd className="font-mono text-text">{formatDateTime(m.selectionClosedAt ?? m.resolutionAt)}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">Resolves</dt>
                  <dd className="font-mono text-text">{formatDateTime(m.resolutionAt)}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">Gross pool</dt>
                  <dd className="font-mono text-text">{formatTzs(grossPool)}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">Positions</dt>
                  <dd className="font-mono text-text">{m.predictorCount} predictors · {positionsFailed ? "—" : openCount} open</dd>
                </div>
              </dl>

              {/* Declared official source — read-only, mono URL. */}
              <div className="mt-3 border-t border-dashed border-border-subtle pt-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">Declared source</span>
                <a
                  href={m.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 flex items-center gap-1.5 font-mono text-[12px] text-royal-300 hover:text-royal-200 break-all"
                >
                  <I.externalLink s={12} className="shrink-0" />
                  {m.sourceUrl}
                </a>
                <p className="mt-2 text-[12px] leading-relaxed text-text-muted">{m.resolutionCriterion}</p>
              </div>
            </AdminCard>

            {/* Final tipping bar, frozen at close — numerals only, no animation. */}
            <AdminCard title="Final tipping bar · frozen at close" sw="Baa la mwisho">
              <ProbabilityBar yesPct={yes} size="large" resolved={settled} showLabels />
              <p className="mt-2 font-mono text-[11px] text-text-subtle">
                YES {yes}% · {formatTzs(m.yesPool)} &nbsp;|&nbsp; NO {100 - yes}% · {formatTzs(m.noPool)}
              </p>
            </AdminCard>

            {/* AI Sentinel evidence (if the market was AI-closed) — a suggestion, not a verdict. */}
            {m.sentinelOutcome && (
              <AdminCard>
                <div className="flex items-center gap-2">
                  <I.sparkle s={14} className="text-brand-300" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] font-semibold text-brand-300">AI-Sentinel recommendation</span>
                  {m.sentinelConfidence != null && (
                    <span className="font-mono text-[10px] text-text-subtle">{m.sentinelConfidence}% confidence</span>
                  )}
                </div>
                <p className="mt-2 font-display text-[14px] font-bold text-text">
                  Sentinel says: <span style={{ color: verdictColor(m.sentinelOutcome) }}>{m.sentinelOutcome}</span>
                </p>
                {m.sentinelEvidence && <p className="mt-1 text-[12px] leading-snug text-text-secondary">{m.sentinelEvidence}</p>}
                {m.sentinelSourceUrl && (
                  <a href={m.sentinelSourceUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 font-mono text-[11px] text-royal-300 hover:text-royal-200">
                    AI source <I.externalLink s={10} />
                  </a>
                )}
              </AdminCard>
            )}

            {/* Recorded officer evidence (from the immutable audit trail). */}
            {recordedEvidence && (
              <AdminCard title={bi(CEREMONY.recordedEvidence)} sw="From the Stage-1 attestation">
                <blockquote className="border-l-2 border-brand-500 pl-3 text-[12.5px] leading-relaxed text-text-muted italic">
                  {recordedEvidence}
                </blockquote>
              </AdminCard>
            )}
          </div>

          {/* ── Verdict rail (right) ─────────────────────────────────────── */}
          <div className="space-y-4 lg:sticky lg:top-4">
            <AdminCard
              title={requireTwoOfficer ? CEREMONY.twoOfficerAttestation.en : "Resolving officer"}
              sw={requireTwoOfficer ? CEREMONY.twoOfficerAttestation.sw : "Afisa mtatuzi"}
            >
              {requireTwoOfficer ? (
                <div className="grid grid-cols-2 gap-2">
                  <AttestSlot
                    label={`Officer A · ${CEREMONY.stage1.en}`}
                    name={officerA}
                    at={m.resolutionStage1At}
                    outcome={stage1By ? m.resolvedOutcome : null}
                    color={verdictColor(m.resolvedOutcome)}
                  />
                  <AttestSlot
                    label={`Officer B · ${CEREMONY.stage2.en}`}
                    name={officerB}
                    at={m.resolutionStage2At}
                    outcome={stage2By ? m.resolvedOutcome : null}
                    color={verdictColor(m.resolvedOutcome)}
                  />
                </div>
              ) : (
                // Single-admin authorization: ONE officer seals. Show a single slot
                // (stage-1 and stage-2 stamp the same officer) — not a two-slot grid
                // that would imply a second signatory that never existed.
                <AttestSlot
                  label="Resolved by"
                  name={officerA}
                  at={m.resolutionStage1At ?? m.resolutionStage2At}
                  outcome={stage1By ? m.resolvedOutcome : null}
                  color={verdictColor(m.resolvedOutcome)}
                />
              )}
            </AdminCard>

            {/* Objection window — only exists once sealed. */}
            {settled && m.objectionsClosedAt && m.resolutionStage2At && (
              <AdminCard>
                <div className="flex items-center gap-3">
                  <CountdownRing
                    deadlineIso={m.objectionsClosedAt}
                    startIso={m.resolutionStage2At}
                    serverNow={Date.now()}
                    size={64}
                    accent="var(--aqua-400)"
                    urgentAccent="var(--aqua-400)"
                    ariaLabel="Objection window remaining"
                  />
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">{bi(CEREMONY.objectionWindow)}</p>
                    <p className="mt-0.5 text-[13px] font-semibold text-text">Closes {formatDateTime(m.objectionsClosedAt)}</p>
                    <p className="mt-0.5 text-[11px] text-text-muted">Payouts are provisional until the 24-hour window elapses.</p>
                  </div>
                </div>
              </AdminCard>
            )}

            {/* Verdict controls (or a sealed banner when done). */}
            <AdminCard
              title={settled ? "Sealed" : requireTwoOfficer ? (stage === "stage2" ? "Countersign & seal" : "Stage-1 attestation") : "Resolve & seal"}
              sw={settled ? undefined : "Hatua ya utatuzi"}
            >
              {settled ? (
                <div className="flex items-start gap-2.5">
                  <I.shieldcheck s={18} style={{ color: verdictColor(m.resolvedOutcome) }} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-display text-[15px] font-bold" style={{ color: verdictColor(m.resolvedOutcome) }}>
                      {m.status === "VOIDED" ? "Voided · stakes refunded" : `Sealed ${m.resolvedOutcome}`}
                    </p>
                    <p className="mt-0.5 text-[12px] text-text-muted">
                      {stage1By && stage2By && stage1By !== stage2By
                        ? "Both officers attested. The verdict is published and the audit entry is immutable."
                        : "Resolved by an officer. The verdict is published and the audit entry is immutable."}
                    </p>
                  </div>
                </div>
              ) : (
                <ResolutionCeremony
                  marketId={m.id}
                  stage={stage}
                  stagedOutcome={m.resolvedOutcome}
                  isSelfCountersign={isSelfCountersign}
                  twoAdmin={requireTwoOfficer}
                />
              )}
            </AdminCard>

            {/* Audit line — the visible mono trail. */}
            {resolutionAudit.length > 0 && (
              <AdminCard title="Audit trail" sw="Njia ya ukaguzi">
                <ol className="space-y-1.5">
                  {resolutionAudit.map((e) => (
                    <li key={e.id} className="flex items-baseline gap-2 font-mono text-[11px]">
                      <span className="shrink-0 text-text-subtle tabular-nums">{formatDateTime(e.createdAt)}</span>
                      <span className="text-text-muted">
                        {e.action.replace("market.resolve.", "").replace("market.resolved", "sealed")}
                        {(e.payload?.outcome as string | undefined) ? ` → ${e.payload!.outcome as string}` : ""}
                      </span>
                    </li>
                  ))}
                </ol>
              </AdminCard>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function AttestSlot({
  label,
  name,
  at,
  outcome,
  color,
}: {
  label: string;
  name: string | null;
  at: string | null;
  outcome: string | null;
  color: string;
}) {
  const signed = !!name;
  return (
    <div
      className="rounded-md border p-2.5"
      style={{ borderColor: signed ? "color-mix(in oklab, var(--brand-500) 45%, var(--border))" : "var(--border)", background: signed ? "color-mix(in oklab, var(--brand-500) 7%, transparent)" : "var(--bg-overlay)" }}
    >
      <div className="flex items-center gap-1.5">
        <I.shieldcheck s={12} className={signed ? "text-brand-300" : "text-text-subtle"} />
        <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-text-subtle">{label}</span>
      </div>
      {signed ? (
        <>
          <p className="mt-1 truncate text-[12px] font-semibold text-text" title={name!}>{name}</p>
          {at && <p className="font-mono text-[10px] text-text-subtle">{formatDateTime(at)}</p>}
          {outcome && (
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em]">
              <span className="text-text-subtle">attested </span>
              <span className="font-bold" style={{ color }}>{outcome}</span>
            </p>
          )}
        </>
      ) : (
        <p className="mt-1 font-mono text-[11px] italic text-text-subtle">{CEREMONY.awaitingSignature.en}</p>
      )}
    </div>
  );
}
