"use client";

/**
 * U47b-2 · THE LIVE CAMPAIGN PAGE — its status, its controls and its figures, sharing ONE state (ENGINE-SPEC §4.15).
 *
 * ⭐ THE CARDS ARE THE SERVER'S, THE STATE IS OURS. The page renders each `AdminCard` (its chrome lives in `admin-shell`,
 * which a client module must never import — it reaches the store), and `LiveProvider`, a client provider wrapped around
 * them, holds what they share: the campaign as the driver last read it, the driver's stop, the presses in flight and the last
 * refusal. The three bodies (`LiveStatus`, `LiveControls`, `LiveProgress`) read it through one hook; `LiveWhenListed`
 * draws its card only once the campaign has people on its list.
 * ⛔ NO ARITHMETIC ON A COUNT IN THE BROWSER. Every figure on this page — each tile, the bar, a reason, a chip, a headline's
 * "420 of 1,604" — is a field of the view-model (`campaignLiveView`), which the server computed from ONE groupBy; this file
 * only prints it (`formatNumber` is a format, not a sum). Two views of one campaign are the same page, byte for byte
 * (V3), and nothing here moves a bar on a timer (OD34): the driver replaces the view when the server answers, no sooner.
 * ⛔ A viewer below E23's floor is handed nulls for every per-state figure; a null tile is not drawn — never a zero.
 * ⛔ NO MONEY WORD HERE (OD24): the Start dialog is the one place a TZS figure can appear, and the view hands it the money
 * only for a viewer who may read it. ⛔ NEVER "DELIVERED" FOR A HAND-OVER (OD41): the words are `live-copy.ts`'s.
 * ⭐ THE CONTROLS ARE NEVER HIDDEN (decision 4): all five are drawn in every state, each disabled with its reason in `title`
 * — and, in words (the review's MINOR 8: a phone has no hover and a disabled button takes no focus), the reasons that matter
 * beside them (`reasonModel`), every other one named to assistive technology. Start and Stop open a kit `ConfirmModal`
 * (medium tier, focus on Cancel — the modal's own rule); Pause and Resume act at once. A press that landed says so in a toast
 * — a warning or advice stays until it is dismissed; a refusal stays on the page, in words, until the next press. ⛔ An act
 * that threw is `unfinished` — it may or may not have happened, so the page shows where the campaign is and never offers a
 * blind retry.
 * ⭐ A PRESS IN FLIGHT DISABLES ITS OWN CONTROL ONLY (the review's MAJOR): Stop stays pressable while Pause waits. The decisions
 * — who may act, which callout, what a landed act does — are `live-decide.ts`'s pure functions; the state is `live-presses.ts`
 * and the driver's; this file is the markup, and V13–V15 execute what it calls.
 * ⛔ AN ACT CONTROL: `useMayAct()` disables every press for a view-only role, and the actions re-check on the server.
 *
 * Guard: `npm run test:campaign-visuals` §page (V1 · V3 · V4 · V7 · V8 · V13–V15) · Red: `npm run red:campaign-visuals`.
 */
import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Chip } from "@/components/ui/chip";
import { ConfirmModal } from "@/components/ui/modal";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Stat } from "@/components/ui/stat";
import { useToast } from "@/components/ui/toast";
import { useMayAct } from "@/components/admin/act-gate";
import { AdminBarList } from "@/components/admin/admin-charts";
import { formatNumber } from "@/lib/utils";
import type { CampaignLiveView } from "@/lib/server/marketing/campaign-live";
import { CAMPAIGNS_UNTITLED, progressCaption, progressLabel } from "../campaigns-copy";
import { campaignViewAction, copyCampaignAction, pauseCampaignAction, resumeCampaignAction, startCampaignAction, stopCampaignAction } from "./actions";
import type { LiveActAnswer } from "./live-run";
import { LIVE_TILE, LIVE_TILES } from "./live-geometry";
import { postLiveStep, useLiveDriver } from "./live-driver";
import type { DriverStop, LiveDriver } from "./live-driver";
import { useLivePresses } from "./live-presses";
import { useStatusAnnouncement } from "./live-announce";
import { ACTS, calloutsFor, controlName, controlState, liveMay, reasonIdFor, reasonModel } from "./live-decide";
import type { ActName, DialogName, Refusal } from "./live-decide";
import {
  LIVE_BREAKDOWN_TITLE, LIVE_CHIPS_LEAD, LIVE_CONTROL_LABEL, LIVE_COPY_ELSEWHERE, LIVE_COPY_OPEN_DRAFT, LIVE_DIALOG_ACTIONS,
  LIVE_FACTOR_LINK, LIVE_KEEP_OPEN, LIVE_KPI, LIVE_OUT_OF_DATE, LIVE_RELOAD, LIVE_SIGN_IN_LINK, LIVE_SWITCH_OFF, LIVE_TRY_AGAIN,
  liveAudienceLine, liveChipText, liveConfirmedLine, liveReasonTitle, nobodyDrivingSentence,
} from "./live-copy";

/* ══ THE SHARED STATE ═══════════════════════════════════════════════════════════════════════════════════════════════ */

/** Each press's action — the doors `actions.ts` holds, each guarded there. */
const LIVE_ACT_CALLS: Readonly<Record<ActName, (campaignId: string) => Promise<LiveActAnswer>>> = {
  start: startCampaignAction,
  pause: pauseCampaignAction,
  resume: resumeCampaignAction,
  stop: stopCampaignAction,
  copy: copyCampaignAction,
};

type Live = {
  view: CampaignLiveView;
  /** The server's decision AND the console's act gate — a page that is not told it may act never acts. */
  mayAct: boolean;
  driver: LiveDriver;
  /** The presses in flight — each disables its own control, never another. */
  pending: ReadonlySet<ActName>;
  refusal: Refusal | null;
  /** The new draft's address, while this page keeps sending (a copy never takes a driving tab away). */
  copyLink: string | null;
  press: (act: ActName) => void;
  ask: (dialog: DialogName) => void;
};

const LiveCtx = createContext<Live | null>(null);

/** The campaign as the driver last read it, for the blocks drawn beside this file's (U48a's results card reads it here). */
export function useLive(): Live {
  const c = useContext(LiveCtx);
  if (c === null) throw new Error("the live page's blocks render inside <LiveProvider>");
  return c;
}

export function LiveProvider({ initial, mayAct, children }: { initial: CampaignLiveView; mayAct: boolean; children: ReactNode }) {
  const router = useRouter();
  const shellMayAct = useMayAct();
  const { toast } = useToast();
  const may = liveMay(mayAct, shellMayAct);
  // ⭐ The STEP is a fetch to its door (`postLiveStep`), the poll a server action: a step that takes seconds no longer holds
  // the presses (Next 16 runs a page's actions one at a time).
  const driver = useLiveDriver({ id: initial.id, mayAct: may, initial, step: postLiveStep, poll: campaignViewAction });
  const [dialog, setDialog] = useState<DialogName | null>(null);
  const presses = useLivePresses({
    id: initial.id,
    may,
    mode: driver.mode,
    calls: LIVE_ACT_CALLS,
    setView: driver.setView,
    refresh: driver.refresh,
    toast,
    navigate: (href) => router.push(href as never),
    // Only the dialog the settled press belongs to closes — a Pause answering never closes a Stop dialog the officer is reading.
    onSettled: (act) => setDialog((open) => (open === act ? null : open)),
  });
  const view = driver.view;
  const announcement = useStatusAnnouncement(view);

  const value: Live = { view, mayAct: may, driver, pending: presses.pending, refusal: presses.refusal, copyLink: presses.copyLink, press: presses.press, ask: setDialog };
  return (
    <LiveCtx.Provider value={value}>
      {children}
      {/* ⭐ THE PAGE'S ONE LIVE REGION (the review's MINOR 8): always mounted, polite, and silent but for a change of status. */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true" data-live-announce>{announcement}</div>
      {/* ⭐ Outside every card, medium tier: focus opens on Cancel (the modal's own rule), and a press in flight holds it
          open — scrim, Esc and the cross are refused until the server has answered. */}
      <ConfirmModal
        open={dialog === "start" && view.startDialog !== null}
        onClose={() => setDialog(null)}
        onConfirm={() => presses.press("start")}
        title={view.startDialog?.title ?? ""}
        body={view.startDialog?.body ?? ""}
        confirmLabel={LIVE_DIALOG_ACTIONS.start}
        cancelLabel={LIVE_DIALOG_ACTIONS.cancel}
        tone="brand"
        tier="medium"
        loading={presses.pending.has("start")}
      />
      <ConfirmModal
        open={dialog === "stop"}
        onClose={() => setDialog(null)}
        onConfirm={() => presses.press("stop")}
        title={view.stopDialog.title}
        body={view.stopDialog.body}
        confirmLabel={LIVE_DIALOG_ACTIONS.stop}
        cancelLabel={LIVE_DIALOG_ACTIONS.cancel}
        tone="claret"
        tier="medium"
        loading={presses.pending.has("stop")}
      />
    </LiveCtx.Provider>
  );
}

/** The card that exists only once the campaign has people on its list — the page hands it the card, drawn on the server. */
export function LiveWhenListed({ children }: { children: ReactNode }) {
  const { view } = useLive();
  return view.kpis.onCampaign > 0 ? <>{children}</> : null;
}

/* ══ THE STATUS CARD ════════════════════════════════════════════════════════════════════════════════════════════════ */

export function LiveStatus() {
  const { view } = useLive();
  return (
    <div className="space-y-2" data-live-status={view.status}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Chip size="md" variant={view.chip}><span className="whitespace-nowrap" data-live-chip>{view.statusLabel}</span></Chip>
        {/* The name is a value an officer typed, not copy this repo wrote — the served gates scan around it. */}
        <h2 className="min-w-0 break-words font-display text-title-sm font-bold text-text" data-operator-text="label" data-live-name>
          {view.name.trim() === "" ? CAMPAIGNS_UNTITLED : view.name}
        </h2>
      </div>
      <p className="text-body text-text" data-live-headline>{view.headline}</p>
      {view.stopSentence !== null && <p className="text-body-sm text-text-secondary" data-live-stop>{view.stopSentence}</p>}
      <p className="text-body-sm text-text-tertiary" data-live-audience>{liveAudienceLine(view.audienceLines)}</p>
      {view.confirmed !== null && <p className="text-body-sm text-text-tertiary" data-live-confirmed>{liveConfirmedLine(view.confirmed)}</p>}
    </div>
  );
}

/* ══ THE CONTROLS CARD ══════════════════════════════════════════════════════════════════════════════════════════════ */

/** One driver stop, in its words, with the one way on that can work — never a retry that cannot. */
function StopCallout({ stop, driver }: { stop: DriverStop; driver: LiveDriver }) {
  const reload = (
    <Button type="button" size="sm" variant="ghost" onClick={() => window.location.reload()} data-live-reload>{LIVE_RELOAD}</Button>
  );
  // A lapsed 2-step, and a sign-in that ended: the way on is in ANOTHER tab (this page keeps its place), then "Try again".
  if (stop.kind === "second_factor" || stop.kind === "signed_out") {
    return (
      <Callout tone="warning" role="alert">
        <span className="block" data-live-stopped={stop.kind}>{stop.sentence}</span>
        <span className="mt-2 flex flex-wrap items-center gap-2">
          <a href={stop.href} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" data-live-factor-link>
            {stop.kind === "signed_out" ? LIVE_SIGN_IN_LINK : LIVE_FACTOR_LINK}
          </a>
          <Button type="button" size="sm" variant="ghost" onClick={driver.retry} data-live-try-again>{LIVE_TRY_AGAIN}</Button>
        </span>
      </Callout>
    );
  }
  const sentence = stop.kind === "out_of_date" ? LIVE_OUT_OF_DATE : stop.sentence;
  return (
    <Callout tone="warning" role="alert">
      <span className="block" data-live-stopped={stop.kind}>{sentence}</span>
      <span className="mt-2 block">{reload}</span>
    </Callout>
  );
}

export function LiveControls() {
  const { view, mayAct, driver, pending, refusal, copyLink, press, ask } = useLive();
  const model = reasonModel(view, mayAct);
  const c = calloutsFor({
    view, mayAct, mode: driver.mode, stop: driver.stop, said: driver.said, refusal: refusal !== null, copyLink: copyLink !== null,
  });
  const onClick: Record<ActName, () => void> = {
    start: () => ask("start"), pause: () => press("pause"), resume: () => press("resume"), stop: () => ask("stop"), copy: () => press("copy"),
  };
  const variant: Record<ActName, "primary" | "ghost"> = { start: "primary", pause: "ghost", resume: "primary", stop: "ghost", copy: "ghost" };

  return (
    // The driver's own stamps, for the drive: what it is doing and how many calls it has made (a page that may not act
    // makes no step call — the drive reads `steps` to prove it).
    <div className="space-y-3" data-live-controls data-live-driver={driver.mode} data-live-steps={driver.steps} data-live-polls={driver.polls}>
      <div className="flex flex-wrap items-center gap-2">
        {ACTS.map((act) => {
          const s = controlState(view, act, mayAct, pending);
          return (
            <Button
              key={act}
              type="button"
              size="sm"
              variant={variant[act]}
              disabled={!s.enabled}
              loading={pending.has(act)}
              title={s.reason ?? undefined}
              aria-describedby={s.reason !== null ? reasonIdFor(model, act) : undefined}
              onClick={onClick[act]}
              data-live-control={act}
            >
              {LIVE_CONTROL_LABEL[act]}
            </Button>
          );
        })}
      </div>
      {/* ⭐ The reasons that matter, in words (the review's MINOR 8); every other disabled control is described to assistive
          technology by an element a screen reader reads and the eye does not. */}
      {model.lines.length > 0 && (
        <ul className="space-y-1 text-body-sm text-text-secondary" data-live-reason-list>
          {model.lines.map((l) => (
            <li key={l.id} id={l.id} data-live-reason={l.acts.length === ACTS.length ? "all" : l.acts.join(" ")}>
              {model.lines.length > 1 && l.acts.length < ACTS.length ? `${l.acts.map(controlName).join(", ")} — ${l.text}` : l.text}
            </li>
          ))}
        </ul>
      )}
      {model.quiet.map((q) => <span key={q.id} id={q.id} className="sr-only">{q.text}</span>)}
      {c.refusal && refusal !== null && (
        <Callout tone={refusal.reason === "unfinished" ? "danger" : "warning"} role="alert">
          <span className="block" data-live-refusal={refusal.act} data-live-refusal-reason={refusal.reason}>{refusal.message}</span>
          {refusal.reason === "second_factor" && refusal.href !== null && (
            <span className="mt-2 flex flex-wrap items-center gap-2">
              <a href={refusal.href} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" data-live-refusal-link>{LIVE_FACTOR_LINK}</a>
            </span>
          )}
          {refusal.reason === "unfinished" && (
            <span className="mt-2 block">
              <Button type="button" size="sm" variant="ghost" onClick={() => window.location.reload()} data-live-reload>{LIVE_RELOAD}</Button>
            </span>
          )}
        </Callout>
      )}
      {c.copyLink && copyLink !== null && (
        <Callout tone="info" role="note">
          <span className="block" data-live-copy-elsewhere>{LIVE_COPY_ELSEWHERE}</span>
          <span className="mt-2 flex flex-wrap items-center gap-2">
            <a href={copyLink} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" data-live-copy-link>{LIVE_COPY_OPEN_DRAFT}</a>
          </span>
        </Callout>
      )}
      {c.stop && driver.stop !== null && <StopCallout stop={driver.stop} driver={driver} />}
      {c.said && driver.said !== null && (
        <Callout tone="info" role="note">
          <span className="block" data-live-wait>{driver.said}</span>
        </Callout>
      )}
      {c.nobody && (
        <Callout tone="warning" role="note">
          <span className="block" data-live-nobody>{nobodyDrivingSentence(view.standing.lastStepAt, view.status)}</span>
        </Callout>
      )}
      {c.window !== null && (
        <Callout tone="info" role="note">
          <span className="block" data-live-window>{c.window}</span>
        </Callout>
      )}
      {c.switchCloses !== null && (
        <Callout tone="info" role="note">
          <span className="block" data-live-switch-closes>{c.switchCloses}</span>
        </Callout>
      )}
      {c.switchOff && (
        <Callout tone="info" role="note">
          <span className="block" data-live-switch-off>{LIVE_SWITCH_OFF}</span>
        </Callout>
      )}
      {c.keepOpen && (
        <Callout tone="info" role="note">
          <span className="block" data-live-keep-open>{LIVE_KEEP_OPEN}</span>
        </Callout>
      )}
    </div>
  );
}

/* ══ THE FIGURES CARD ═══════════════════════════════════════════════════════════════════════════════════════════════ */

/** One KPI: the tile, with the hover title the spec gives it (a tile on a touch screen has the label alone). */
function Figure({ name, value }: { name: keyof typeof LIVE_KPI; value: number }) {
  const k = LIVE_KPI[name];
  return (
    <div data-live-kpi={name} title={k.title ?? undefined}>
      <Stat boxed="card" size="md" labelStyle="quiet" className={LIVE_TILE} label={k.label} value={formatNumber(value)} />
    </div>
  );
}

export function LiveProgress() {
  const { view } = useLive();
  const k = view.kpis;
  const p = view.progress;
  return (
    <div className="space-y-4" data-live-progress={p === null ? "none" : p.phase}>
      {p !== null && (
        <div data-live-bar>
          <ProgressBar value={p.value} max={p.max} label={progressLabel(view.name)} caption={progressCaption(p)} captionText={progressCaption(p)} />
        </div>
      )}
      <div className={LIVE_TILES}>
        <Figure name="onCampaign" value={k.onCampaign} />
        {k.handedOver !== null && <Figure name="handedOver" value={k.handedOver} />}
        {k.failed !== null && <Figure name="failed" value={k.failed} />}
        {k.notSent !== null && <Figure name="notSent" value={k.notSent} />}
        {k.noAnswer !== null && <Figure name="noAnswer" value={k.noAnswer} />}
        {k.waiting !== null && <Figure name="waiting" value={k.waiting} />}
      </div>
      {view.floor !== null && <p className="text-body-sm text-text-secondary" data-live-floor>{view.floor}</p>}
      {/* U48a · "Not sent, by reason" is printed ONCE: by the results card, whenever the view carries results (the same list, worded
          once). This one is the figures card's own only while there are none to carry it. */}
      {view.notSentReasons !== null && view.results === null && (
        <div className="space-y-2" data-live-reasons>
          <p className="text-body-sm text-text-secondary">{LIVE_BREAKDOWN_TITLE}</p>
          <AdminBarList
            rows={view.notSentReasons.map((r) => ({ label: r.label, value: r.count, title: liveReasonTitle(r.label, r.count) }))}
            format={formatNumber}
          />
        </div>
      )}
      {view.chips !== null && (
        <div className="space-y-2" data-live-chips>
          <p className="text-body-sm text-text-secondary">{LIVE_CHIPS_LEAD}</p>
          <ul className="flex flex-wrap gap-2">
            {view.chips.map((c) => (
              <li key={c.status} data-live-chip-status={c.status}>
                <Chip size="md" variant="neutral"><span className="whitespace-nowrap">{liveChipText(c.label, c.count)}</span></Chip>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
