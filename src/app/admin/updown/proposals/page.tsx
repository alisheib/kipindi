import Link from "next/link";
import type { Route } from "next";
import { AdminPageHead, AdminCard, AdminKpi } from "@/components/admin/admin-shell";
import { AdminPagination, PER_PAGE, parsePage, buildBaseHref } from "@/components/admin/admin-pagination";
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
import { currentSession } from "@/lib/server/auth-service";
import { canUseControl, CONTROL_DOMAIN } from "@/lib/server/control-gates";
import { ControlLocked } from "@/components/admin/control-locked";
import { updownProposalStateLabel } from "@/components/admin/status-badge";
import { AdminBody } from "@/components/admin/admin-body";
import { KpiGrid } from "@/components/admin/admin-body";

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

/* Operator language, not enum language — the state name is never shown raw. The map
   that stood here has moved into `updownProposalStateLabel`, alongside the poll and
   candidate queues' own maps, because the three shared four tokens and disagreed on
   two of them: this queue's APPROVED means "ready to arm a chain that will take real
   stakes", which is not the poll queue's APPROVED, and that difference is now stated
   in one place instead of implied by three local copies. */

/** Plain-English reason text. The enum value is for counting; this is for reading. */
const REASON_LABEL: Record<string, string> = {
  source_not_trusted: "Source not on the approved allowlist",
  source_unreadable: "The platform could not read a price from this asset's feed",
  duration_not_allowed: "Duration is not on the 5-minute grid",
  margin_out_of_range: "Margin outside 0–20%",
  duplicate_chain: "A chain is already running for this asset and duration",
  framing_unclear: "Framing is missing a language",
  asset_disabled: "The asset is disabled",
  provider_error: "The AI provider failed",
  officer_judgement: "Officer judgement",
};

/**
 * WHAT TO DO ABOUT IT — Ali, 2026-08-03: *"what do all those 'didn't pass checks' mean?"*
 *
 * The label above names the fault; it does not tell an officer whether they caused it,
 * whether it will recur, or whether there is anything to do. On production **13 of 13**
 * proposals failed and **not one ever read a price**, so "didn't pass checks" was the only
 * thing the console had ever said — 13 times, for two quite different reasons, one of
 * which is unfixable by the officer.
 *
 * ⭐ E-47b (Ali, 2026-08-03) changed what `source_unreadable` MEANS, so its advice had to
 * change with it. It used to say "expected, and not your fault — the AI has no key for
 * api.twelvedata.com, so it can never read a price there; use the Add-asset form instead."
 * That was honest about a dead end. The platform reads the price itself now, so the reason no
 * longer describes the AI failing — it describes THE ASSET'S OWN FEED failing, which is real,
 * actionable, and would void every round of a chain armed on it.
 */
const REASON_ADVICE: Record<string, string> = {
  // ⚠️ NO CLAIM ABOUT COST BELONGS IN THIS STRING. The first version of it ended "No AI credit
  // was spent on this attempt" — true of every attempt made AFTER E-47b, and FALSE of the 12
  // rows already in the queue, which cost ~$0.13 each. A static advice line is rendered against
  // historical rows too, so anything row-specific has to be read off the row. The cost sentence
  // is now rendered from `p.costUsd` at the call site.
  source_unreadable:
    "The platform read this asset's own price feed — the same way a live round does — and got " +
    "nothing back. That is worth knowing: a chain armed on it would void and refund every " +
    "round. Check the asset's symbol and source under Up & Down → Overview, use Check symbol " +
    "to see what the feed answers, then regenerate.",
  duplicate_chain:
    "Nothing to fix — you already run this asset at this duration. Edit the existing chain " +
    "on the Overview page rather than arming a second one.",
  source_not_trusted:
    "Add the domain under Sources & categories, in this asset's own category, then regenerate.",
  duration_not_allowed: "Regenerate with 5, 15 or 30 minutes.",
  margin_out_of_range: "Edit the margin before approving; the ladder value is pre-filled.",
  framing_unclear: "Edit the framing — all three languages must be present.",
  asset_disabled: "Enable the asset on the Overview page first.",
  provider_error:
    "The AI call itself failed — usually a timeout or a credit limit. Check Admin → AI usage; " +
    "no proposal was produced and nothing is stuck.",
  officer_judgement: "",
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

/** The proposal states an officer can filter to. Closed set, so `?state=BOGUS` explains
 *  itself rather than rendering an empty queue the officer reads as "nothing to do". */
const STATES = ["PENDING_REVIEW", "APPROVED", "ARMED", "REJECTED", "FILTERED", "VALIDATION_FAILED", "GENERATING"] as const;

export default async function UpDownProposalsPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; asset?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const [assets, allProposals, counts, cfg, aiOn] = await Promise.all([
    listAssets().catch(() => []),
    listProposals().catch(() => []),
    countProposalsByState().catch(() => ({
      GENERATING: 0, VALIDATION_FAILED: 0, FILTERED: 0, PENDING_REVIEW: 0, APPROVED: 0, REJECTED: 0, ARMED: 0,
    })),
    getUpDownConfig(),
    isPollGenEnabled().catch(() => true),
  ]);

  // ⛔ E-27. Arming is `accounting`; this route is `trading`, and DEFAULT_GRANTS makes
  // them disjoint — so the page must ask before it renders an armed button that can only
  // bounce and write a SECURITY row for an ordinary click.
  const canArm = await canUseControl((await currentSession())?.role, "armProposal");

  const enabledAssets = assets.filter((a) => a.enabled);
  const assetByKey = new Map(assets.map((a) => [a.id, a]));

  // ⛔ THIS QUEUE HAD NO CAP AND NO PAGER (campaign finding G-1c). Not truncated — simply
  // unbounded: every proposal ever generated rendered as a row, and each row carries an
  // evidence panel and up to three armed controls. It grows with every generation run, and
  // the officer's actual job is the handful in PENDING_REVIEW — which sat further down the
  // page with every run. ⚠️ The earlier G-1 inventory recorded this grid as "capped at 12";
  // that was a misread of `p.reviewedBy.slice(0, 12)`, a STRING slice. Unbounded is a
  // different problem from truncated and it needed the filter more, not less.
  const stateFilter = (STATES as readonly string[]).includes(sp.state ?? "")
    ? (sp.state as UpDownProposalState)
    : undefined;
  const assetKey = assets.some((a) => a.key === sp.asset) ? sp.asset : undefined;
  const badFilter = (!!sp.state && !stateFilter) || (!!sp.asset && !assetKey);
  const filterAssetId = assetKey ? assets.find((a) => a.key === assetKey)?.id : undefined;

  const filtered = allProposals.filter(
    (p) => (!stateFilter || p.state === stateFilter) && (!filterAssetId || p.requestAssetId === filterAssetId),
  );
  const page = parsePage(sp.page, filtered.length);
  const proposals = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const baseHref = buildBaseHref("/admin/updown/proposals", { state: stateFilter, asset: assetKey });

  // Spend is the LIFETIME total across every proposal — it is a budget figure, and a
  // budget that changed when you filtered or turned a page would be worthless.
  const spend = allProposals.reduce((s, p) => s + p.costUsd, 0);
  const reviewable = counts.PENDING_REVIEW + counts.APPROVED;

  return (
    <>
      <AdminPageHead title="Up & Down · AI proposals" sw="Mapendekezo ya AI" />
      <AdminBody>
        <KpiGrid>
          {/* ⚠️ Keep every `delta` SHORT. AdminKpi renders it `whitespace-nowrap` with no
              truncate, so at 360px a long string is clipped mid-word by the card. Found by
              looking at the xs screenshot — the suite passed, because clipping inside the card
              is not a page overflow. A green audit is not a readable screen. */}
          <AdminKpi label="Awaiting you" sw="Yanakusubiri" value={String(reviewable)} delta={`${counts.PENDING_REVIEW} review · ${counts.APPROVED} arm`} spark={false} />
          <AdminKpi label="Armed" sw="Zimeanzishwa" value={String(counts.ARMED)} delta="live chains" spark={false} />
          <AdminKpi label="Didn't pass" sw="Hayakupita" value={String(counts.FILTERED + counts.VALIDATION_FAILED)} delta="unreadable" spark={false} />
          <AdminKpi label="AI spend" sw="Matumizi" value={formatUsd(spend)} delta={`${allProposals.length} generation${allProposals.length === 1 ? "" : "s"}`} spark={false} />
        </KpiGrid>

        {/* ── The AI switch lives in ONE place; this page reports it, never mirrors it. ── */}
        {!aiOn && (
          <div className="rounded-lg border border-warning-border bg-warning-bg p-3 text-body-sm leading-[1.55] text-warning-fg">
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

        {/* Filters. The officer's job is PENDING_REVIEW; everything else is history, and
            before this the two were one undifferentiated list that only grew. Same chip
            idiom as the audit log and the rounds explorer — one filter language. */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Link href={buildBaseHref("/admin/updown/proposals", { asset: assetKey }) as Route} className="inline-flex items-center min-h-[44px] transition-opacity hover:opacity-80">
            <Chip size="lg" variant={!stateFilter ? "brand" : "neutral"} selected={!stateFilter}>All states</Chip>
          </Link>
          {STATES.map((s) => (
            <Link
              key={s}
              href={buildBaseHref("/admin/updown/proposals", { state: s, asset: assetKey }) as Route}
              className="inline-flex items-center min-h-[44px] transition-opacity hover:opacity-80"
            >
              <Chip size="lg" variant={stateFilter === s ? "brand" : "neutral"} selected={stateFilter === s}>
                {updownProposalStateLabel(s)} {counts[s] ?? 0}
              </Chip>
            </Link>
          ))}
          {assets.length > 1 && (
            <>
              <span className="hidden sm:block mx-2 h-5 w-px bg-border-subtle" aria-hidden />
              <Link href={buildBaseHref("/admin/updown/proposals", { state: stateFilter }) as Route} className="inline-flex items-center min-h-[44px] transition-opacity hover:opacity-80">
                <Chip size="lg" variant={!assetKey ? "brand" : "neutral"} selected={!assetKey}>All assets</Chip>
              </Link>
              {assets.map((a) => (
                <Link
                  key={a.key}
                  href={buildBaseHref("/admin/updown/proposals", { state: stateFilter, asset: a.key }) as Route}
                  className="inline-flex items-center min-h-[44px] transition-opacity hover:opacity-80"
                >
                  <Chip size="lg" variant={assetKey === a.key ? "brand" : "neutral"} selected={assetKey === a.key}>{a.key}</Chip>
                </Link>
              ))}
            </>
          )}
          <span className="ml-auto font-mono text-micro tracking-[0.14em] uppercase text-text-subtle">
            {filtered.length.toLocaleString()} of {allProposals.length.toLocaleString()}
          </span>
        </div>
        {badFilter && (
          <p className="font-mono text-[11px] text-warning-fg bg-warning-bg border border-warning-border rounded-md px-3 py-2">
            Unknown state or asset &mdash; showing the whole queue. Pick one from the chips above.
          </p>
        )}

        <AdminCard title={`Queue · ${filtered.length.toLocaleString()}`} sw="Foleni" padding="p-0">
          {proposals.length === 0 ? (
            <div className="p-6">
              <EmptyState
                kind="default"
                title={allProposals.length === 0 ? "No proposals yet" : "No proposals match this filter"}
                body={
                  allProposals.length === 0
                    ? "Ask the AI to propose a chain above. The platform reads the asset's price from its own feed first — the same way a live round does — and the AI proposes the framing and the margin against that reading. It lands here for your review; it cannot start a chain by itself."
                    : "Clear the state or asset chips above to see the whole queue."
                }
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
                    {/* E-47b — the AI reads nothing. Both columns describe the PLATFORM'S read
                        of the asset's own feed; naming the wrong actor on a money-adjacent
                        column is how an officer comes to trust the wrong evidence. */}
                    <th>Source the platform read</th>
                    <th>What the feed returned</th>
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
                            readAt={p.createdAt}
                            decimals={asset?.decimals ?? 2}
                            maxStalenessSeconds={cfg.maxStalenessSeconds}
                          />
                        </td>
                        <td className="max-w-[320px]">
                          <Indicators p={p} />
                          {reasons.length > 0 && (
                            <ul className="mt-1 space-y-0.5">
                              {reasons.map((r) => (
                                // `text-danger-fg` — `hot-rose` is not a bridged family, so
                                // these refusal reasons rendered in plain body ink. Not
                                // `no-300`: §B2 keeps YES/NO for money outcomes only.
                                <li key={r} className="text-body-sm leading-snug text-danger-fg">
                                  · {REASON_LABEL[r] ?? r}
                                  {REASON_ADVICE[r] && (
                                    <span className="mt-0.5 block text-text-subtle">{REASON_ADVICE[r]}</span>
                                  )}
                                  {/* Read the cost off THE ROW. Since E-47b the feed is checked
                                      before the AI is called, so a new unreadable-source refusal
                                      is free — but the rows generated before it each cost ~$0.13,
                                      and telling an officer those were free would be a false
                                      money statement on a spend readout. */}
                                  {r === "source_unreadable" && (
                                    <span className="mt-0.5 block text-text-subtle">
                                      {p.costUsd > 0
                                        ? `This attempt cost $${p.costUsd.toFixed(4)} — it predates the change that checks the feed before calling the AI.`
                                        : "No AI credit was spent on this attempt — the feed is checked first."}
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                        <td className="whitespace-nowrap">
                          <Chip size="sm" variant={STATE_VARIANT[p.state]}>{updownProposalStateLabel(p.state)}</Chip>
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
                            {/* ⛔ E-27: `armProposal` is `accounting` on a `trading`
                                page, so ask the same question the action will ask. */}
                            {p.state === "APPROVED" && !canArm && (
                              <ControlLocked what="Arm" need={CONTROL_DOMAIN.armProposal} />
                            )}
                            {p.state === "APPROVED" && canArm && (
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
                              <Link href={"/admin/updown" as Route} className="font-mono text-micro uppercase tracking-[0.1em] text-text-subtle hover:text-text px-2 py-1">
                                View chain
                              </Link>
                            )}
                            {/* The ARMED gate is here, and the delete modal's copy
                                ("has never opened a round") depends on it holding. */}
                            {p.state !== "ARMED" && <DeleteProposalAction id={p.id} />}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollX>
          )}
          <AdminPagination total={filtered.length} page={page} baseHref={baseHref} />
        </AdminCard>

        <AdminCard title="How this works" sw="Inavyofanya kazi">
          <div className="space-y-2 text-body-sm leading-[1.6] text-text-subtle max-w-[85ch]">
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
              draft. Change the duration, the margin or the framing — every edit is re-checked.
              ⚠️ Changing the <em>link</em> clears the price, because the reading was taken from the
              asset&rsquo;s own source and no longer belongs to the new one — and nothing can take a
              fresh reading for a link the asset does not point at, so the proposal cannot then be
              armed. To move an asset&rsquo;s source, do it on the Overview page and regenerate.
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
      </AdminBody>
    </>
  );
}
