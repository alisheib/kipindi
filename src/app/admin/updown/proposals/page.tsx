import Link from "next/link";
import type { Route } from "next";
import { AdminPageHead, AdminCard, AdminKpi } from "@/components/admin/admin-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollX } from "@/components/ui/scroll-x";
import { Chip } from "@/components/ui/chip";
import { formatUsd, formatDateTimeSafe } from "@/lib/utils";
import { listAssets, getUpDownConfig } from "@/lib/server/updown-config";
import {
  listProposals, countProposalsByState,
  type StoredProposal, type UpDownProposalState,
} from "@/lib/server/updown-proposal";
import { isPollGenEnabled } from "@/lib/server/ai-controls";
import { ProposeForm, ReviewActions, ArmAction, DeleteProposalAction, EvidencePanel } from "./proposal-actions";

export const metadata = { title: "Admin · Up & Down · AI proposals" };
export const dynamic = "force-dynamic";

/**
 * THE OFFICER QUEUE for AI-proposed Up & Down chains.
 *
 * Modelled on `/admin/ai-polls` — same states, same review verbs, same spend readout — so an
 * officer who reviews polls already knows how to work this. The differences are the ones the
 * product demands: the terminal act is ARMING A CHAIN that emits real-money rounds on a timer,
 * so the source link and the readability evidence are the two things this page puts first.
 *
 * ⛔ NOTHING ON THIS PAGE CAN ARM WITHOUT AN APPROVAL. The Arm button only renders on an
 * APPROVED proposal, and `armProposal` refuses any other state regardless of what is posted.
 */

const STATE_VARIANT: Record<UpDownProposalState, "success" | "warning" | "danger" | "neutral" | "info"> = {
  GENERATING: "info",
  VALIDATION_FAILED: "danger",
  FILTERED: "warning",
  PENDING_REVIEW: "warning",
  APPROVED: "success",
  REJECTED: "neutral",
  ARMED: "success",
};

/** Operator language, not enum language — the state name is never shown raw. */
const STATE_LABEL: Record<UpDownProposalState, string> = {
  GENERATING: "Generating…",
  VALIDATION_FAILED: "Failed",
  FILTERED: "Didn't pass checks",
  PENDING_REVIEW: "Ready for review",
  APPROVED: "Approved · ready to arm",
  REJECTED: "Rejected",
  ARMED: "Armed · chain running",
};

/** Plain-English reason text. The enum value is for counting; this is for reading. */
const REASON_LABEL: Record<string, string> = {
  source_not_trusted: "Source not on the approved allowlist",
  source_unreadable: "No price could be read from the page",
  duration_not_allowed: "Duration is not on the 5-minute grid",
  margin_out_of_range: "Margin outside 0–20%",
  duplicate_chain: "A chain is already running for this asset and duration",
  framing_unclear: "Framing is missing a language",
  asset_disabled: "The asset is disabled",
  provider_error: "The AI provider failed",
  officer_judgement: "Officer judgement",
};

function Indicators({ p }: { p: StoredProposal }) {
  if (p.qualityIndicators.length === 0) {
    return <span className="text-[11px] text-text-subtle">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {p.qualityIndicators.map((i, n) => (
        <Chip
          key={n}
          size="sm"
          variant={i.status === "good" ? "success" : i.status === "warn" ? "warning" : "danger"}
        >
          {i.label}
        </Chip>
      ))}
    </div>
  );
}

export default async function UpDownProposalsPage() {
  const [assets, proposals, counts, cfg, aiOn] = await Promise.all([
    listAssets().catch(() => []),
    listProposals().catch(() => []),
    countProposalsByState().catch(() => ({
      GENERATING: 0, VALIDATION_FAILED: 0, FILTERED: 0, PENDING_REVIEW: 0, APPROVED: 0, REJECTED: 0, ARMED: 0,
    })),
    getUpDownConfig(),
    isPollGenEnabled().catch(() => true),
  ]);

  const enabledAssets = assets.filter((a) => a.enabled);
  const assetByKey = new Map(assets.map((a) => [a.id, a]));
  const spend = proposals.reduce((s, p) => s + p.costUsd, 0);
  const reviewable = counts.PENDING_REVIEW + counts.APPROVED;

  return (
    <>
      <AdminPageHead title="Up & Down · AI proposals" sw="Mapendekezo ya AI" />
      <div className="px-4 lg:px-6 py-5 space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* ⚠️ Keep every `delta` SHORT. AdminKpi renders it `whitespace-nowrap` with no
              truncate, so at 360px a long string is clipped mid-word by the card. Found by
              looking at the xs screenshot — the suite passed, because clipping inside the card
              is not a page overflow. A green audit is not a readable screen. */}
          <AdminKpi label="Awaiting you" sw="Yanakusubiri" value={String(reviewable)} delta={`${counts.PENDING_REVIEW} review · ${counts.APPROVED} arm`} spark={false} />
          <AdminKpi label="Armed" sw="Zimeanzishwa" value={String(counts.ARMED)} delta="live chains" spark={false} />
          <AdminKpi label="Didn't pass" sw="Hayakupita" value={String(counts.FILTERED + counts.VALIDATION_FAILED)} delta="unreadable" spark={false} />
          <AdminKpi label="AI spend" sw="Matumizi" value={formatUsd(spend)} delta={`${proposals.length} generation${proposals.length === 1 ? "" : "s"}`} spark={false} />
        </div>

        {/* ── The AI switch lives in ONE place; this page reports it, never mirrors it. ── */}
        {!aiOn && (
          <div className="rounded-lg border border-warning-border bg-warning-bg p-3 text-[12px] leading-[1.55] text-warning-fg">
            <strong>AI generation is switched off.</strong> Proposals cannot be generated until it is
            turned back on in the <strong>AI toolkit</strong> menu in the top bar — the one place that
            switch lives, for both long-form polls and Up &amp; Down. Proposals already in the queue can
            still be reviewed, approved and armed.
          </div>
        )}

        <AdminCard title="Propose a chain" sw="Pendekeza mnyororo">
          {enabledAssets.length === 0 ? (
            <EmptyState
              kind="default"
              title="No enabled assets yet"
              body="A proposal is always for an asset you have already registered and enabled, so the AI can only choose within your approved sources. Add one under Up & Down → Overview first."
            />
          ) : (
            <ProposeForm
              assets={enabledAssets.map((a) => ({ id: a.id, key: a.key, symbol: a.symbol, sourceDomain: a.sourceDomain }))}
              defaultMarginBps={cfg.defaultMarginBps}
              maxStalenessSeconds={cfg.maxStalenessSeconds}
              aiEnabled={aiOn}
            />
          )}
        </AdminCard>

        <AdminCard title={`Queue · ${proposals.length}`} sw="Foleni" padding="p-0">
          {proposals.length === 0 ? (
            <div className="p-6">
              <EmptyState
                kind="default"
                title="No proposals yet"
                body="Ask the AI to propose a chain above. It will fetch the asset's approved source, report the price and timestamp it actually found there, and land here for your review — it cannot start a chain by itself."
              />
            </div>
          ) : (
            <ScrollX label="AI chain proposals">
              <table className="admin-tbl">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Round</th>
                    <th>Margin</th>
                    <th>Source the AI read</th>
                    <th>What it found there</th>
                    <th>Checks</th>
                    <th>State</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {proposals.map((p) => {
                    const asset = assetByKey.get(p.requestAssetId);
                    const reasons = p.state === "REJECTED" ? p.rejectReasons : p.filterReasons;
                    return (
                      <tr key={p.id}>
                        <td>
                          <span className="font-mono text-[11.5px] font-bold">{asset?.key ?? "—"}</span>
                          <div className="font-mono text-[10px] text-text-subtle">{asset?.symbol ?? ""}</div>
                        </td>
                        <td className="whitespace-nowrap font-mono text-[11.5px]">{p.durationMinutes}m</td>
                        <td className="whitespace-nowrap font-mono text-[11.5px] tabular-nums">
                          {(p.marginBps / 100).toFixed(2)}%
                        </td>
                        <td className="max-w-[280px]">
                          {p.sourceUrl ? (
                            <a
                              href={p.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-[10.5px] break-all text-royal-300 hover:underline"
                            >
                              {p.sourceUrl}
                            </a>
                          ) : (
                            <span className="text-[11px] text-text-subtle">no link proposed</span>
                          )}
                        </td>
                        <td className="max-w-[200px]">
                          <EvidencePanel
                            observedPrice={p.observedPrice}
                            observedQuotedAt={p.observedQuotedAt}
                            decimals={asset?.decimals ?? 2}
                            maxStalenessSeconds={cfg.maxStalenessSeconds}
                          />
                        </td>
                        <td className="max-w-[320px]">
                          <Indicators p={p} />
                          {reasons.length > 0 && (
                            <ul className="mt-1 space-y-0.5">
                              {reasons.map((r) => (
                                <li key={r} className="text-[10.5px] leading-snug text-hot-rose-300">
                                  · {REASON_LABEL[r] ?? r}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                        <td className="whitespace-nowrap">
                          <Chip size="sm" variant={STATE_VARIANT[p.state]}>{STATE_LABEL[p.state]}</Chip>
                          <div className="mt-1 font-mono text-[10px] text-text-subtle">
                            {formatDateTimeSafe(p.createdAt)}
                          </div>
                          {p.reviewedBy && (
                            <div className="font-mono text-[10px] text-text-subtle">
                              by {p.reviewedBy.slice(0, 12)}
                            </div>
                          )}
                        </td>
                        <td className="text-right">
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
                            {(p.state === "PENDING_REVIEW" || p.state === "FILTERED" || p.state === "APPROVED") && (
                              <ReviewActions
                                id={p.id}
                                state={p.state}
                                assetKey={asset?.key ?? "?"}
                                durationMinutes={p.durationMinutes}
                                marginBps={p.marginBps}
                                sourceUrl={p.sourceUrl}
                                framingEn={p.framingEn}
                                framingSw={p.framingSw}
                                framingZh={p.framingZh}
                                reasoning={p.reasoning}
                                blockingReasons={p.filterReasons.map((r) => REASON_LABEL[r] ?? r)}
                              />
                            )}
                            {p.state === "APPROVED" && (
                              <ArmAction
                                id={p.id}
                                assetKey={asset?.key ?? "?"}
                                durationMinutes={p.durationMinutes}
                                marginBps={p.marginBps}
                                sourceUrl={p.sourceUrl}
                                sourceChanges={!!asset && p.sourceUrl !== asset.priceSourceUrl}
                                currentAssetSource={asset?.priceSourceUrl ?? ""}
                              />
                            )}
                            {p.state === "ARMED" && p.armedChainId && (
                              <Link href={"/admin/updown" as Route} className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-text-subtle hover:text-text px-2 py-1">
                                View chain
                              </Link>
                            )}
                            {p.state !== "ARMED" && <DeleteProposalAction id={p.id} state={p.state} />}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollX>
          )}
        </AdminCard>

        <AdminCard title="How this works" sw="Inavyofanya kazi">
          <div className="space-y-2 text-[11.5px] leading-[1.6] text-text-subtle max-w-[85ch]">
            <p>
              <strong>1 · The AI proposes.</strong> It fetches the asset&rsquo;s approved domain — it is
              restricted to that one domain and cannot cite anywhere else — finds a page showing a live
              price <em>with the time that price was quoted</em>, and proposes a duration, a margin and a
              framing.
            </p>
            <p>
              <strong>2 · It reports what it actually found.</strong> The &ldquo;what it found
              there&rdquo; column is the AI&rsquo;s own reading, not a promise. <strong>Most price pages
              show nothing usable</strong> — they draw the number with JavaScript that a fetch does not
              run — so a blank here is the normal, honest outcome and the proposal is held back rather
              than armed. A proposal that cannot show a price it read <em>cannot</em> be approved.
            </p>
            <p>
              <strong>3 · You review, and may edit anything.</strong> The AI&rsquo;s suggestion is a
              draft. Change the link, the duration, the margin or the framing — every edit is
              re-checked, and changing the link clears the evidence, because the AI read the old page.
            </p>
            <p>
              <strong>4 · Arming starts a real chain.</strong> It points the asset at the approved link,
              creates or updates the chain, and starts it — through the same controls the Overview page
              uses, so every refusal there still applies. In particular, the source <strong>cannot</strong>{" "}
              move while any round on that asset is unresolved; you will be told to let those settle
              first.
            </p>
            <p>
              <strong>5 · Every round then captures that link at open</strong> and resolves against the
              captured copy — never against whatever the asset says later. That is what makes the link
              the AI chose the link the round is settled on.
            </p>
          </div>
        </AdminCard>
      </div>
    </>
  );
}
