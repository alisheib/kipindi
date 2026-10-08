"use client";

/**
 * U47b-2 · THE LIVE CAMPAIGN PAGE — its status, its controls and its figures, sharing ONE state (ENGINE-SPEC §4.15).
 *
 * ⭐ THE CARDS ARE THE SERVER'S, THE STATE IS OURS. The page renders each `AdminCard` (its chrome lives in `admin-shell`,
 * which a client module must never import — it reaches the store), and `LiveProvider`, a client provider wrapped around
 * them, holds what they share: the campaign as the driver last read it, the driver's stop, the press in flight and the last
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
 * — and, for the one the status asks for, said in words beside them (a phone has no hover). Start and Stop open a kit
 * `ConfirmModal` (medium tier, focus on Cancel — the modal's own rule); Pause and Resume act at once. A press that landed
 * says so in a toast; a refusal stays on the page, in words, until the next press. ⛔ An act that threw is `unfinished` —
 * it may or may not have happened, so the page shows where the campaign is and never offers a blind retry.
 * ⛔ AN ACT CONTROL: `useMayAct()` disables every press for a view-only role, and the actions re-check on the server.
 *
 * Guard: `npm run test:campaign-visuals` §page (V1 · V3 · V4 · V7 · V8) · Red: `npm run red:campaign-visuals`.
 */
import { createContext, useContext, useState, useTransition } from "react";
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
import { runAdminAction } from "@/lib/client/run-admin-action";
import { formatNumber } from "@/lib/utils";
import type { CampaignLiveView } from "@/lib/server/marketing/campaign-live";
import { CAMPAIGNS_UNTITLED, progressCaption, progressLabel } from "../campaigns-copy";
import {
  campaignStepAction, campaignViewAction, copyCampaignAction, pauseCampaignAction, resumeCampaignAction,
  startCampaignAction, stopCampaignAction,
} from "./actions";
import type { LiveActAnswer } from "./live-run";
import { LIVE_TILE, LIVE_TILES } from "./live-geometry";
import { useLiveDriver } from "./live-driver";
import type { DriverStop, LiveDriver } from "./live-driver";
import {
  LIVE_ACT_UNFINISHED, LIVE_BREAKDOWN_TITLE, LIVE_CHIPS_LEAD, LIVE_CONTROL_LABEL, LIVE_DIALOG_ACTIONS, LIVE_DISABLED,
  LIVE_FACTOR_LINK, LIVE_KEEP_OPEN, LIVE_KPI, LIVE_OUT_OF_DATE, LIVE_RELOAD, LIVE_SWITCH_OFF, LIVE_TRY_AGAIN,
  liveAudienceLine, liveChipText, liveConfirmedLine, liveReasonTitle, nobodyDrivingSentence,
} from "./live-copy";

/* ══ THE SHARED STATE ═══════════════════════════════════════════════════════════════════════════════════════════════ */

type ActName = "start" | "pause" | "resume" | "stop" | "copy";
/** The two presses that ask first. */
type DialogName = "start" | "stop";
/** The last refusal, by the press that met it — printed beside the controls until the next press. */
type Refusal = { act: ActName; reason: string; message: string };

/** Each press's action — the doors `actions.ts` holds, each guarded there. */
const ACT_CALL: Readonly<Record<ActName, (campaignId: string) => Promise<LiveActAnswer>>> = {
  start: startCampaignAction,
  pause: pauseCampaignAction,
  resume: resumeCampaignAction,
  stop: stopCampaignAction,
  copy: copyCampaignAction,
};

/** The five controls, in the order they are drawn. */
const ACTS: readonly ActName[] = ["start", "pause", "resume", "stop", "copy"];

type Live = {
  view: CampaignLiveView;
  /** The server's decision AND the console's act gate — a page that is not told it may act never acts. */
  mayAct: boolean;
  driver: LiveDriver;
  acting: ActName | null;
  refusal: Refusal | null;
  press: (act: ActName) => void;
  ask: (dialog: DialogName) => void;
};

const LiveCtx = createContext<Live | null>(null);

function useLive(): Live {
  const c = useContext(LiveCtx);
  if (c === null) throw new Error("the live page's blocks render inside <LiveProvider>");
  return c;
}

/** A thrown action comes back from `runAdminAction` as `{ ok: false, error }` — it may or may not have happened. */
function answerOf(r: LiveActAnswer | { ok: false; error: string }): LiveActAnswer {
  return "error" in r ? { ok: false, reason: "unfinished", message: LIVE_ACT_UNFINISHED, view: null } : r;
}

export function LiveProvider({ initial, mayAct, children }: { initial: CampaignLiveView; mayAct: boolean; children: ReactNode }) {
  const router = useRouter();
  const shellMayAct = useMayAct();
  const { toast } = useToast();
  const may = mayAct && shellMayAct;
  const driver = useLiveDriver({ id: initial.id, mayAct: may, initial, step: campaignStepAction, poll: campaignViewAction });
  const [dialog, setDialog] = useState<DialogName | null>(null);
  const [acting, setActing] = useState<ActName | null>(null);
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  const [, startAct] = useTransition();
  const view = driver.view;

  /** One press: the action, then the campaign as it answered, then the words. ⛔ Never two at once. */
  const press = (act: ActName) => {
    if (acting !== null || !may) return;
    setActing(act);
    setRefusal(null);
    startAct(async () => {
      const r = answerOf(await runAdminAction(() => ACT_CALL[act](view.id)));
      // The answer carries the campaign as it is now; one that could not be read is asked for at once.
      if (r.view !== null) driver.setView(r.view);
      else driver.refresh();
      if (r.ok) {
        toast({ title: r.message, variant: "success" });
        if (act === "copy" && r.href !== null) router.push(r.href as never);
      } else {
        setRefusal({ act, reason: r.reason, message: r.message });
      }
      setDialog(null);
      setActing(null);
    });
  };

  const value: Live = { view, mayAct: may, driver, acting, refusal, press, ask: setDialog };
  return (
    <LiveCtx.Provider value={value}>
      {children}
      {/* ⭐ Outside every card, medium tier: focus opens on Cancel (the modal's own rule), and a press in flight holds it
          open — scrim, Esc and the cross are refused until the server has answered. */}
      <ConfirmModal
        open={dialog === "start" && view.startDialog !== null}
        onClose={() => setDialog(null)}
        onConfirm={() => press("start")}
        title={view.startDialog?.title ?? ""}
        body={view.startDialog?.body ?? ""}
        confirmLabel={LIVE_DIALOG_ACTIONS.start}
        cancelLabel={LIVE_DIALOG_ACTIONS.cancel}
        tone="brand"
        tier="medium"
        loading={acting === "start"}
      />
      <ConfirmModal
        open={dialog === "stop"}
        onClose={() => setDialog(null)}
        onConfirm={() => press("stop")}
        title={view.stopDialog.title}
        body={view.stopDialog.body}
        confirmLabel={LIVE_DIALOG_ACTIONS.stop}
        cancelLabel={LIVE_DIALOG_ACTIONS.cancel}
        tone="claret"
        tier="medium"
        loading={acting === "stop"}
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

/** The control the status asks for — the one whose reason is also said in words beside the row. */
const EXPECTED: Readonly<Record<string, ActName | undefined>> = {
  CONFIRMED: "start", PREPARING: "pause", RUNNING: "pause", PAUSED: "resume",
};

/** One driver stop, in its words, with the one way on that can work — never a retry that cannot. */
function StopCallout({ stop, driver }: { stop: DriverStop; driver: LiveDriver }) {
  const reload = (
    <Button type="button" size="sm" variant="ghost" onClick={() => window.location.reload()} data-live-reload>{LIVE_RELOAD}</Button>
  );
  if (stop.kind === "second_factor") {
    return (
      <Callout tone="warning" role="alert">
        <span className="block" data-live-stopped="second_factor">{stop.sentence}</span>
        <span className="mt-2 flex flex-wrap items-center gap-2">
          <a href={stop.href} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" data-live-factor-link>{LIVE_FACTOR_LINK}</a>
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
  const { view, mayAct, driver, acting, refusal, press, ask } = useLive();
  const { stop, said } = driver;
  // Each control: the view's verdict (decided on the server from the STORED role), then this page's own — a press in flight,
  // or an act gate that says view-only. A reason is always said, never a bare grey button.
  const state = (act: ActName): { enabled: boolean; reason: string | null } => {
    const c = view.controls[act];
    if (!mayAct) return { enabled: false, reason: c.reason ?? LIVE_DISABLED.role };
    return { enabled: c.enabled && acting === null, reason: c.enabled ? null : c.reason };
  };
  const onClick: Record<ActName, () => void> = {
    start: () => ask("start"), pause: () => press("pause"), resume: () => press("resume"), stop: () => ask("stop"), copy: () => press("copy"),
  };
  const variant: Record<ActName, "primary" | "ghost"> = { start: "primary", pause: "ghost", resume: "primary", stop: "ghost", copy: "ghost" };
  const expected = EXPECTED[view.status];
  const expectedReason = expected === undefined ? null : state(expected).reason;
  // "Nobody is sending" is the data's fact: an acting viewer whose own driver is running is the one sending.
  const nobody = view.standing.nobodyDriving && (!mayAct || !driver.ran || stop !== null);
  const switchOff = !view.standing.switchOpen && view.status !== "DRAFT" && view.status !== "DONE" && view.status !== "CANCELLED";

  return (
    <div className="space-y-3" data-live-controls>
      <div className="flex flex-wrap items-center gap-2">
        {ACTS.map((act) => {
          const s = state(act);
          return (
            <Button
              key={act}
              type="button"
              size="md"
              variant={variant[act]}
              disabled={!s.enabled}
              loading={acting === act}
              title={s.reason ?? undefined}
              onClick={onClick[act]}
              data-live-control={act}
            >
              {LIVE_CONTROL_LABEL[act]}
            </Button>
          );
        })}
      </div>
      {expectedReason !== null && <p className="text-body-sm text-text-secondary" data-live-reason={expected}>{expectedReason}</p>}
      {refusal !== null && (
        <Callout tone={refusal.reason === "unfinished" ? "danger" : "warning"} role="alert">
          <span className="block" data-live-refusal={refusal.act} data-live-refusal-reason={refusal.reason}>{refusal.message}</span>
        </Callout>
      )}
      {stop !== null && <StopCallout stop={stop} driver={driver} />}
      {said !== null && (
        <Callout tone="info" role="status">
          <span className="block" data-live-wait>{said}</span>
        </Callout>
      )}
      {nobody && (
        <Callout tone="warning" role="status">
          <span className="block" data-live-nobody>{nobodyDrivingSentence(view.standing.lastStepAt)}</span>
        </Callout>
      )}
      {switchOff && (
        <Callout tone="info" role="status">
          <span className="block" data-live-switch-off>{LIVE_SWITCH_OFF}</span>
        </Callout>
      )}
      {view.standing.keepOpen && (
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
      {view.notSentReasons !== null && (
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
