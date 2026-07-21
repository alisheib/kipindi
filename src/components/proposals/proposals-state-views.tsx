import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { Button } from "@/components/ui/button";
import { ProposalsStateBadge } from "@/components/ui/proposals-state-badge";
import type { ProposalsState } from "@/lib/server/proposals-config";

/**
 * Player-facing views for the non-ACTIVE proposals states. Presentational only
 * (no hooks) so they render inside the server page trees; every string is passed
 * in already-localized. The aesthetic split is the whole point:
 *   COMING_SOON → gilt  (aspirational — it's on its way)
 *   MAINTENANCE → amber `--warning` (temporary — back shortly, never NO-rose)
 *   DISABLED    → muted neutral (honest "not available", guided elsewhere)
 * The tokens below are the only place the two live states' colours are chosen,
 * so board banner + blocked composer can never drift apart.
 */

type Tone = { bg: string; border: string; fg: string; Icon: (typeof I)[keyof typeof I] };

function toneFor(state: ProposalsState): Tone {
  if (state === "COMING_SOON") {
    return {
      bg: "color-mix(in oklab, var(--gold-500) 10%, var(--bg-elevated))",
      border: "color-mix(in oklab, var(--gold-500) 30%, var(--border))",
      fg: "var(--gold-300)",
      Icon: I.clock,
    };
  }
  // MAINTENANCE
  return {
    bg: "color-mix(in oklab, var(--warning-500) 14%, var(--bg-elevated))",
    border: "color-mix(in oklab, var(--warning-500) 38%, var(--border))",
    fg: "var(--warning-500)",
    Icon: I.pause,
  };
}

/**
 * Inline board banner — sits at the top of the (read-only) proposals board when
 * the feature is COMING_SOON or MAINTENANCE. Renders nothing for ACTIVE/DISABLED
 * (ACTIVE has no banner; DISABLED renders its own full page instead).
 */
export function ProposalsStateBanner({
  state,
  title,
  body,
}: {
  state: ProposalsState;
  title: string;
  body: string;
}) {
  if (state !== "COMING_SOON" && state !== "MAINTENANCE") return null;
  const { bg, border, fg, Icon } = toneFor(state);
  return (
    <div role="status" className="flex gap-3 rounded-xl border p-3.5" style={{ background: bg, borderColor: border }}>
      <span className="mt-0.5 shrink-0" style={{ color: fg }}><Icon s={18} aria-hidden /></span>
      <div className="min-w-0">
        <p className="text-[13px] font-bold text-text">{title}</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-text-muted">{body}</p>
      </div>
    </div>
  );
}

/**
 * Blocked composer — replaces the create form on /proposals/new when the feature
 * is COMING_SOON or MAINTENANCE. Guides the player (state badge + icon + reason)
 * and always offers a live way forward (back to the board). Never a dead end.
 */
export function ProposalsBlockedComposer({
  state,
  title,
  body,
  comingSoonLabel,
  maintenanceLabel,
  backHref,
  backLabel,
}: {
  state: ProposalsState;
  title: string;
  body: string;
  comingSoonLabel: string;
  maintenanceLabel: string;
  backHref: string;
  backLabel: string;
}) {
  const { bg, border, fg, Icon } = toneFor(state);
  return (
    <div className="flex flex-col items-center rounded-2xl border p-6 text-center sm:p-8" style={{ background: bg, borderColor: border }}>
      <span
        className="grid h-14 w-14 place-items-center rounded-2xl"
        style={{ color: fg, background: "color-mix(in oklab, var(--bg-base) 55%, transparent)", border: `1px solid ${border}` }}
      >
        <Icon s={26} aria-hidden />
      </span>
      <div className="mt-3.5">
        <ProposalsStateBadge state={state} comingSoonLabel={comingSoonLabel} maintenanceLabel={maintenanceLabel} />
      </div>
      <h2 className="mt-3 font-display text-[18px] font-bold leading-snug text-text">{title}</h2>
      <p className="mx-auto mt-2 max-w-[42ch] text-[13px] leading-relaxed text-text-muted">{body}</p>
      <Link href={backHref as never} className="mt-5">
        <Button variant="ghost" size="md" leading={<I.chevronLeft s={15} />}>{backLabel}</Button>
      </Link>
    </div>
  );
}

/**
 * Unavailable board — the whole /proposals surface when the feature is DISABLED.
 * Honest, guided, and never a 404: the entry points are removed from the app, so
 * a player who reached here by a direct link gets a clear message + a live way on
 * (browse markets). Deep links to /proposals/* are redirected here.
 */
export function ProposalsUnavailable({
  title,
  body,
  browseHref,
  browseLabel,
}: {
  title: string;
  body: string;
  browseHref: string;
  browseLabel: string;
}) {
  return (
    <div className="mx-auto flex max-w-[440px] flex-col items-center rounded-2xl border border-dashed border-border bg-bg-elevated/40 px-6 py-12 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl border border-border text-text-subtle" style={{ background: "var(--bg-overlay)" }}>
        <I.info s={26} aria-hidden />
      </span>
      <h1 className="mt-4 font-display text-[19px] font-bold leading-snug text-text">{title}</h1>
      <p className="mx-auto mt-2 max-w-[38ch] text-[13px] leading-relaxed text-text-muted">{body}</p>
      <Link href={browseHref as never} className="mt-5">
        <Button variant="primary" size="md" trailing={<I.arrowRight s={15} />}>{browseLabel}</Button>
      </Link>
    </div>
  );
}
