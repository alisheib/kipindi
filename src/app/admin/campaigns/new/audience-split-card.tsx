/**
 * U38b · THE AUDIENCE COUNT — an async SERVER component: the split → the ONE view-model → the figures, the reasons, the
 * sample, and when it was counted (ENGINE-SPEC §4.4 decision 5).
 *
 * ⭐ IT RENDERS THE VIEW-MODEL AND NOTHING ELSE. Every figure is a string `audienceSplitView` made from a count the split
 * made; nothing here adds, subtracts or derives one (`test:campaign-audience` §B4), and nothing reaches the browser but
 * this component's output — the split itself never leaves the server.
 * ⭐ KEYED BY THE FILTER: page.tsx wraps this in a Suspense keyed by the filter's ONE key, so a new filter mounts a new
 * boundary and shows `AudienceCountFallback` — never the old numbers under the new words (§B5). The fallback is the
 * figures' own ghost (the same component the route's ghost draws), so the block does not jump when the count lands.
 * ⛔ D19 · THE FLOOR (E23): for a viewer who may not read a number and fewer than 10 people, the view-model is the count
 * alone and its sentence — there is no figure, reason or sample to render, so none can be (§B6).
 * ⛔ NEUTRAL INK (OD40): "not receiving" is the gate working — no danger colour on a figure or a reason.
 * ⛔ A READ THAT FAILED IS SAID, with "Count again" (the same address) — never a zero, and never what failed: the log line
 * carries the error's name alone, so no number in a database error can reach the log (§5.6).
 */
import type { ReactNode } from "react";
import { AdminBarList } from "@/components/admin/admin-charts";
import { SkBar } from "@/components/admin/admin-skeletons";
import { Stat } from "@/components/ui/stat";
import { viewerReadsContacts } from "@/app/admin/contacts/contacts-loader";
import { composeAudienceCount } from "./composer-loader";
import type { ComposeAudienceCount } from "./composer-loader";
import type { AudienceReasonView, AudienceSplitView } from "./audience-view-model";
import { AudienceCountAgain } from "./composer-client";
import {
  AUDIENCE_COMPUTING, AUDIENCE_EMPTY, AUDIENCE_ERROR, AUDIENCE_FIGURE, AUDIENCE_REASONS_LEAD, AUDIENCE_SAMPLE_LEAD,
  audienceCountedLine, audienceUncheckedLine,
} from "./audience-copy";

/** Each reason row prints its count AS THE VIEW-MODEL WROTE IT, looked up by the row's value — the bar list formats
 *  nothing of its own here, so a count the view-model writes differently (a floor, a grouping) is the count on screen. */
function reasonCountOf(reasons: readonly AudienceReasonView[]): (n: number) => string {
  const said = new Map(reasons.map((r) => [r.n, r.count] as const));
  return (n) => said.get(n) ?? "";
}

/* ═══ THE GEOMETRY — one set of boxes for the figures and their ghost, so the swap cannot move the page ═══════════ */

/** A figure tile — the kit's `Stat` in its card box, at a fixed floor tall enough for a two-line label at 360. */
const TILE = "min-h-[84px]";
/** The figures' grid: two across on a phone, four from the small breakpoint. */
const TILES = "grid grid-cols-2 gap-2 sm:grid-cols-4";
/** One sample row: a line of reading copy inside its padding, at a fixed floor. */
const SAMPLE_ROW = "flex min-h-[36px] flex-wrap items-center gap-x-3 gap-y-0.5 border-b border-border-subtle py-1.5 text-body-sm last:border-b-0";
/** The footer under the figures: two lines' room, so the sentence that wraps at 360 and the one that does not hold one box. */
const FOOTER = "min-h-[36px] text-body-sm text-text-tertiary";
/** The count-alone sentence's box (OD65): three lines' room — it wraps to three at 360 — so it holds one box at 360 and
 *  1280, and its ghost the same (measured: 58px of copy at 360, one line at 1280). */
const FLOOR_LINE = "min-h-[60px] text-body-sm text-text-secondary";
/** A blank that still takes a line's height (a no-break space, built from its code — no invisible character in the source). */
const NBSP = String.fromCharCode(160);
/** The reasons' ghost: five rows of the kit's bar list, blank, their tracks empty. */
const GHOST_REASONS = [0, 1, 2, 3, 4].map(() => ({ label: NBSP, value: 0 }));

/** ⭐ THE FIGURES' GHOST — the route's ghost (`loading.tsx`) and the keyed fallback draw THIS, so both stand in exactly for
 *  the full count: four tiles, the five reasons, five sample rows and the footer's box (which holds `footer`). */
export function AudienceCountGhost({ footer }: { footer: ReactNode }) {
  return (
    <div className="space-y-3" aria-hidden={footer === null || undefined}>
      <div className={TILES}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`rounded-md border border-border bg-bg-elevated p-3 ${TILE}`}>
            <SkBar className="h-[12px] w-[96px]" />
            <SkBar className="mt-2 h-[18px] w-[56px]" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <SkBar className="h-[18px] w-[160px]" />
        {/* The kit's own bar list with five blank rows and empty tracks — its geometry, never a copy of it. */}
        <AdminBarList rows={GHOST_REASONS} format={() => NBSP} />
      </div>
      <div className="space-y-1">
        <SkBar className="h-[18px] w-[200px]" />
        <ul>
          {[0, 1, 2, 3, 4].map((i) => (
            <li key={i} className={SAMPLE_ROW}>
              <SkBar className="h-[14px] w-[112px]" />
              <SkBar className="h-[14px] w-[64px]" />
            </li>
          ))}
        </ul>
      </div>
      <div className={FOOTER}>{footer}</div>
    </div>
  );
}

/** ⭐ OD65 · THE COUNT ALONE'S GHOST — one tile and the sentence's box, the very boxes `AudienceFloor` draws: what a viewer
 *  who may not read a number is shown is never stood in for by a breakdown they will not get. The route's ghost draws it
 *  (the composer is GROWTH's screen first); a reader's keyed fallback draws the full one. */
export function AudienceFloorGhost({ footer }: { footer: ReactNode }) {
  return (
    <div className="space-y-3" aria-hidden={footer === null || undefined}>
      <div className={TILES}>
        <div className={`rounded-md border border-border bg-bg-elevated p-3 ${TILE}`}>
          <SkBar className="h-[12px] w-[96px]" />
          <SkBar className="mt-2 h-[18px] w-[56px]" />
        </div>
      </div>
      <div className={FLOOR_LINE}>{footer}</div>
    </div>
  );
}

/** The keyed fallback, shaped for THIS viewer: the count alone's ghost for a viewer who may not read a number (OD65), the
 *  figures' ghost for a reader — each with "Counting who will receive it…" where the sentence or "Counted at …" stands. */
export function AudienceCountFallback({ countOnly }: { countOnly: boolean }) {
  const counting = <p role="status" data-audience-computing>{AUDIENCE_COMPUTING}</p>;
  return (
    <div data-audience-count="computing">
      {countOnly ? <AudienceFloorGhost footer={counting} /> : <AudienceCountGhost footer={counting} />}
    </div>
  );
}

/* ═══ THE STATES ═════════════════════════════════════════════════════════════════════════════════════════════════ */

function Figure({ name, label, value }: { name: string; label: string; value: string }) {
  return (
    <div data-audience-figure={name}>
      <Stat boxed="card" size="md" labelStyle="quiet" className={TILE} label={label} value={value} />
    </div>
  );
}

/** ⭐ THE FULL VIEW — a reader's always; anyone else's from the floor up. Every value below is a view-model field. */
function AudienceFigures({ view }: { view: Extract<AudienceSplitView, { kind: "full" }> }) {
  return (
    <div className="space-y-3" data-audience-count={view.empty ? "empty" : "full"}>
      <div className={TILES}>
        <Figure name="onCampaign" label={AUDIENCE_FIGURE.onCampaign} value={view.onCampaign} />
        <Figure name="willReceive" label={AUDIENCE_FIGURE.willReceive} value={view.willReceive} />
        <Figure name="notReceiving" label={AUDIENCE_FIGURE.notReceiving} value={view.notReceiving} />
        <Figure name="unsendable" label={AUDIENCE_FIGURE.unsendable} value={view.unsendable} />
        {view.unchecked !== null && <Figure name="unchecked" label={AUDIENCE_FIGURE.unchecked} value={view.unchecked} />}
      </div>
      {view.unchecked !== null && <p className="text-body-sm text-text-secondary" data-audience-unchecked>{audienceUncheckedLine(view.willReceive)}</p>}
      {view.empty && <p className="text-body-sm text-text" data-audience-empty>{AUDIENCE_EMPTY}</p>}
      {/* ⭐ The reasons, dominant first — one row each, protected ONE row for every role (the view-model's order). */}
      <div className="space-y-2" data-audience-reasons>
        <p className="text-body-sm text-text-secondary">{AUDIENCE_REASONS_LEAD}</p>
        <AdminBarList
          rows={view.reasons.map((r) => ({ label: r.label, value: r.n, title: `${r.label}: ${r.count}` }))}
          format={reasonCountOf(view.reasons)}
        />
      </div>
      {view.sample.length > 0 && (
        <div className="space-y-1" data-audience-sample>
          <p className="text-body-sm text-text-secondary">{AUDIENCE_SAMPLE_LEAD}</p>
          <ul>
            {view.sample.map((r, i) => (
              <li key={i} className={SAMPLE_ROW} data-audience-sample-row>
                <span className="font-mono text-text">{r.masked}</span>
                <span className="text-text-secondary">{r.operator}</span>
                {r.who !== null && <span className="text-text-secondary" data-audience-sample-who>{r.who}</span>}
                {r.status !== null && <span className="text-text-tertiary" data-audience-sample-status>{r.status}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className={FOOTER} data-audience-counted>{audienceCountedLine(view.countedAt, view.tookSeconds)}</p>
    </div>
  );
}

/** ⛔ D19 · OD65 · THE COUNT ALONE — the count on the campaign and the sentence why; nothing else exists to draw. */
function AudienceFloor({ view }: { view: Extract<AudienceSplitView, { kind: "floor" }> }) {
  return (
    <div className="space-y-3" data-audience-count="floor">
      <div className={TILES}>
        <Figure name="onCampaign" label={AUDIENCE_FIGURE.onCampaign} value={view.onCampaign} />
      </div>
      <p className={FLOOR_LINE} data-audience-floor>{view.sentence}</p>
    </div>
  );
}

/** ⛔ A read that failed: said, with the way to ask again — never a zero. */
function AudienceCountError() {
  return (
    <div className="space-y-2" data-audience-count="error">
      <p className="text-body-sm text-text" role="alert" data-audience-error>{AUDIENCE_ERROR}</p>
      <AudienceCountAgain />
    </div>
  );
}

/**
 * ⭐ THE CARD — the split door asked for this audience, as THIS viewer (their read cell, decided on the server every time).
 */
export async function AudienceSplitCard({ countKey }: { countKey: string }) {
  const reads = await viewerReadsContacts().catch(() => false);
  let shown: ComposeAudienceCount | null;
  try {
    shown = await composeAudienceCount({ countKey }, reads);
  } catch (err) {
    console.error("[admin/campaigns/new] the audience count failed:", (err as { name?: unknown })?.name ?? "error");
    return <AudienceCountError />;
  }
  if (shown === null) return null;
  if (shown.kind === "refused") {
    return <p className="text-body-sm text-text" role="alert" data-audience-count="refused">{shown.reason}</p>;
  }
  return shown.view.kind === "floor" ? <AudienceFloor view={shown.view} /> : <AudienceFigures view={shown.view} />;
}
