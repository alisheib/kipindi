"use client";

/**
 * U40b · THE CONFIRM CARD — the composer's fourth card, under the Test card, and the dialog it opens (ENGINE-SPEC §4.6;
 * OD27 · OD65 · OD67; U40.md "UI states"). The work is the server's: U40a's `campaignConfirmView` and `confirmCampaign`.
 *
 * ⭐ THE TRIGGER READS THE PAGE AGAIN, THEN OPENS. "Confirm audience…" refreshes the page (the view is counted again on the
 * server for this officer — `loadConfirmCard`), says "Counting the audience…" while it does, and opens the dialog on the
 * figures as they are NOW — or, if the fresh view is blocked, does not open and says why.
 * ⭐ DISABLED WITH ITS REASON, NEVER HIDDEN (decision 1): in its `title` and beside it (`confirmTriggerBlocked`) — a campaign
 * past DRAFT, the act gate, the FORM (the server confirms the SAVED message and audience and cannot see this form, so
 * unsaved text, an audience on screen the draft does not store, a save in flight or a blank Swahili message all say "Save
 * first" or "Write the Swahili message first" — and a draft saved in another tab since this page loaded says reload, so
 * nobody confirms text they are not looking at), and the server's view in its own words.
 * ⛔ THE DIALOG'S TIER IS THE VIEW'S (`confirmGate` — `view.tier` exactly as the server answered it, never worked out again
 * here from a count). OD67: a viewer who may not read a number is always handed the typed tier, with the count alone, no
 * list and no sample — so this card has nothing to list for them, and never could: it lists `view.sample` and nothing
 * else. A reader's list tier names every person (masked, the operator by prefix — no player flag, D19).
 * ⭐ THE DIALOG IS THE KIT'S `ConfirmModal`, never a Modal of its own: the medium tier opens on Cancel and the typed tier on
 * its box (the digit keypad — `typedInputMode`), so the Confirm button is never the focused element when it opens; it is
 * keyed `${watermark}:${attempt}`, so a refusal REMOUNTS it on the fresh view — the new number, the server's sentence on
 * top, the box cleared, the focus back on the box or on Cancel (an enumerate → typed crossing switches the tier).
 * ⭐ CONFIRMING: both buttons off, a spinner, and the scrim, Esc and ✕ refused (the kit's `loading`). CONFIRMED: the dialog
 * closes once the page is read again (read-only now), and a toast says so — "Nothing has been sent." — with the record's
 * failure said too when it did not land (ruling 543). ERROR (the action failed, or its answer was lost): the dialog stays
 * OPEN with the typing kept, and a toast says only what is known — "nothing was confirmed" only when the row is still a
 * draft.
 * ⛔ NO MONEY IS WORDED HERE: the estimate's segments are said to every role; the money line is the server's
 * (`confirmMoneyLine`), handed to a money reader only, and printed as it comes (`test:campaign-compose` §16.5).
 * ⛔ ONE ACTION, imported here (`confirmCampaignAction`) — the browser posts the campaign, the word the dialog armed on and
 * the claim it was opened on; never a count (OD27: the server counts).
 *
 * Guard: `npm run test:campaign-gates` §UI · Drive: `npm run qa:marketing-confirm`.
 */
import { Suspense, useEffect, useState, useTransition } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { ConfirmModal } from "@/components/ui/modal";
import { Stat } from "@/components/ui/stat";
import { useDeferredToast } from "@/components/ui/toast";
import { SkBar } from "@/components/admin/admin-skeletons";
import { useMayAct, useActDisabledReason } from "@/components/admin/act-gate";
import { runAdminAction } from "@/lib/client/run-admin-action";
import { CAMPAIGN_SCREENS, campaignDetailHref } from "@/lib/marketing/campaign-status";
import { confirmCampaignAction } from "./confirm-actions";
import { useComposerSaved } from "./composer-client";
import type { ConfirmCardData, ConfirmCardView } from "./composer-loader";
import type { AudienceSplitView } from "./audience-view-model";
import { AUDIENCE_COUNT_AGAIN, AUDIENCE_FIGURE, AUDIENCE_NO_OPERATOR, AUDIENCE_SAMPLE_LEAD } from "./audience-copy";
import {
  COMPOSE_CONFIRM_ACT, COMPOSE_CONFIRM_COUNTING, COMPOSE_CONFIRM_FAILED, COMPOSE_CONFIRM_HONESTY, COMPOSE_CONFIRM_LIST_LEAD,
  COMPOSE_CONFIRM_REFUSED, COMPOSE_CONFIRM_TRIGGER, COMPOSE_CONFIRM_UNFINISHED, COMPOSE_CONFIRM_UNRECORDED, COMPOSE_CONFIRMED,
  COMPOSE_CONFIRMED_NEXT, COMPOSE_CONFIRMED_START, composeConfirmSegments, composeConfirmTitle, composeConfirmedToast,
  confirmGate, confirmTriggerBlocked,
} from "./composer-copy";

/* ═══ THE GEOMETRY — one set of boxes for the card and its ghost ═════════════════════════════════════════════════════ */

/** A figure tile — the kit's `Stat` in its card box, tall enough for a two-line label at 360 (the audience card's floor). */
const TILE = "min-h-[84px]";
/** The figures: two across on a phone, four from the small breakpoint. */
const TILES = "grid grid-cols-2 gap-2 sm:grid-cols-4";
/** One listed person: the masked number and the operator, wrapping rather than clipping. */
const ROW = "flex flex-wrap items-baseline justify-between gap-x-3 border-b border-border px-3 py-2 last:border-0";

/** ⭐ THE CARD'S GHOST — the route's ghost (`loading.tsx`) and the boundary's fallback draw THIS: the trigger's box (a
 *  `btn-md`, 44px) and the line under it. */
export function ConfirmCardGhost() {
  return (
    <div className="space-y-2" aria-hidden data-confirm-card="loading">
      <SkBar className="h-[44px] w-[176px]" />
      <SkBar className="h-[18px] w-full" />
    </div>
  );
}

/**
 * ⭐ THE CARD'S OWN SUSPENSE, keyed by the draft — a new draft mounts a new boundary and shows the ghost while its view is
 * counted; a refresh of the same draft keeps the card on screen until the fresh view lands (page.tsx holds its one Suspense
 * for the audience count — `test:campaign-audience` B5 — so this one lives here).
 */
export function ConfirmCardBoundary({ draftKey, children }: { draftKey: string; children: ReactNode }) {
  return (
    <Suspense key={draftKey} fallback={<ConfirmCardGhost />}>
      {children}
    </Suspense>
  );
}

/* ═══ THE DIALOG'S BODY ══════════════════════════════════════════════════════════════════════════════════════════════ */

function Figure({ name, label, value }: { name: string; label: string; value: string }) {
  return (
    <div data-confirm-figure={name}>
      <Stat boxed="card" size="md" labelStyle="quiet" className={TILE} label={label} value={value} />
    </div>
  );
}

/** The audience as this viewer may see it — U38b's view-model, printed and never derived: the four figures for a reader,
 *  the count alone and why for anyone else (OD65). */
function ConfirmFigures({ split }: { split: AudienceSplitView }) {
  if (split.kind === "floor") {
    return (
      <div className="space-y-2" data-confirm-figures="count-alone">
        <div className={TILES}>
          <Figure name="onCampaign" label={AUDIENCE_FIGURE.onCampaign} value={split.onCampaign} />
        </div>
        <p className="text-body-sm text-text-secondary" data-confirm-floor>{split.sentence}</p>
      </div>
    );
  }
  return (
    <div className={TILES} data-confirm-figures="full">
      <Figure name="onCampaign" label={AUDIENCE_FIGURE.onCampaign} value={split.onCampaign} />
      <Figure name="willReceive" label={AUDIENCE_FIGURE.willReceive} value={split.willReceive} />
      <Figure name="notReceiving" label={AUDIENCE_FIGURE.notReceiving} value={split.notReceiving} />
      <Figure name="unsendable" label={AUDIENCE_FIGURE.unsendable} value={split.unsendable} />
      {split.unchecked !== null && <Figure name="unchecked" label={AUDIENCE_FIGURE.unchecked} value={split.unchecked} />}
    </div>
  );
}

function ConfirmBody({ view, money, listed, notice }: { view: ConfirmCardView; money: string | null; listed: boolean; notice: string | null }) {
  return (
    <div className="space-y-3" data-confirm-body={listed ? "listed" : "typed"}>
      {/* A refusal's own sentence, on top of the view it was refused for — read again since. */}
      {notice !== null && (
        <Callout tone="warning" role="alert">
          <span className="block" data-confirm-notice>{notice}</span>
        </Callout>
      )}
      {view.describe.length > 0 && (
        <ul className="space-y-0.5" data-confirm-describe>
          {view.describe.map((line) => <li key={line} className="text-body-sm text-text">{line}</li>)}
        </ul>
      )}
      {view.split !== null && <ConfirmFigures split={view.split} />}
      {/* ⛔ OD67 · the server's rows and nothing else: every person of a reader's list, the first five of a reader's typed
          audience — and none at all for a viewer who may not read a number (their view carries none). */}
      {view.sample.length > 0 && (
        <div className="space-y-1" data-confirm-list={listed ? "everyone" : "first"}>
          <p className="text-body-sm text-text-secondary">{listed ? COMPOSE_CONFIRM_LIST_LEAD : AUDIENCE_SAMPLE_LEAD}</p>
          {/* A list, not a table, in its own scroll box: the dialog never runs sideways at 360. */}
          <ul className="max-h-[38vh] overflow-y-auto rounded-md border border-border">
            {view.sample.map((row, i) => (
              <li key={i} className={ROW} data-confirm-row>
                <span className="font-mono text-body-sm text-text" data-masked>{row.masked}</span>
                <span className="text-body-sm text-text-secondary">{row.operator ?? AUDIENCE_NO_OPERATOR}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {view.estimate !== null && (
        <p className="text-body-sm text-text" data-confirm-estimate>{composeConfirmSegments(view.estimate.segments, view.estimate.perRecipient)}</p>
      )}
      {/* ⛔ The server's words for a money reader; null — and nothing at all here — for anyone else. */}
      {money !== null && <p className="text-body-sm text-text" data-confirm-money>{money}</p>}
      <p className="text-body-sm text-text-secondary" data-confirm-honesty="dialog">{COMPOSE_CONFIRM_HONESTY}</p>
    </div>
  );
}

/* ═══ THE CARD ═══════════════════════════════════════════════════════════════════════════════════════════════════════ */

/** ⭐ The card for one draft as page.tsx counted it for this officer — `null` while no draft is saved. */
export function CampaignConfirm({ card }: { card: ConfirmCardData | null }) {
  const router = useRouter();
  const mayAct = useMayAct();
  const actReason = useActDisabledReason();
  const form = useComposerSaved();
  const [open, setOpen] = useState(false);
  // Bumped by a refusal, so the dialog remounts on the fresh view even when its claim did not change.
  const [attempt, setAttempt] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [asked, setAsked] = useState(false);
  const [counting, startCounting] = useTransition();
  const [confirming, startConfirming] = useTransition();
  const { toast, deferToast } = useDeferredToast(confirming);

  const view = card !== null && card.read === "view" ? card.view : null;
  // ⛔ The tier is the VIEW's (`confirmGate` reads `view.tier`) — never worked out again here from the count (OD67).
  const gate = view === null ? null : confirmGate(view);
  // The last view the dialog could be drawn from: a confirmation that lands (or a campaign confirmed meanwhile) reads the
  // page again into a view with nothing left to count, and the dialog then CLOSES on the view it was showing — playing the
  // kit's exit — instead of vanishing. Held by the "adjust state while rendering" rule, so no frame draws a mismatch.
  const live = view !== null && view.count !== null && gate !== null ? { view, gate } : null;
  const [drawn, setDrawn] = useState<{ view: ConfirmCardView; gate: NonNullable<typeof gate> } | null>(null);
  if (live !== null && drawn?.view !== live.view) setDrawn(live);
  const dialog = live ?? drawn;
  const reason = confirmTriggerBlocked({
    mayAct,
    actReason: actReason ?? null,
    form,
    card: card === null ? null : { campaignId: card.campaignId, status: card.status, read: card.read, view },
  });
  const openable = reason === null && gate !== null;

  /** ⭐ Read the page again, THEN open — on the figures as they are now. */
  const begin = () => {
    if (!openable || counting || confirming) return;
    setNotice(null);
    setAsked(true);
    startCounting(() => router.refresh());
  };
  // The page has been read again: open on the fresh view — when it may still open (else the card says why).
  useEffect(() => {
    if (!asked || counting) return;
    setAsked(false);
    if (openable) setOpen(true);
  }, [asked, counting, openable]);
  // A dialog whose fresh view may no longer open (a refusal read again, and now blocked) closes, and its sentence stays said.
  useEffect(() => {
    if (!open || confirming || openable) return;
    setOpen(false);
    if (notice !== null) {
      toast({ title: COMPOSE_CONFIRM_REFUSED, description: notice, variant: "warning" });
      setNotice(null);
    }
  }, [open, confirming, openable, notice, toast]);

  const close = () => {
    setOpen(false);
    setNotice(null);
  };

  /** ⛔ The campaign, the word the dialog armed on (the bare count — what the server checks against its OWN count) and the
   *  claim it was opened on. Never a count of the browser's. */
  const confirm = () => {
    if (card === null || view === null || gate === null || confirming) return;
    const fd = new FormData();
    fd.set("campaignId", card.campaignId);
    fd.set("watermark", view.watermark ?? "");
    fd.set("typed", gate.tier === "hard" ? gate.typedWord : "");
    startConfirming(async () => {
      const r = await runAdminAction(() => confirmCampaignAction(fd));
      if (r.ok) {
        // Read the page again (read-only now, the confirmed line on this card), then close and say it.
        startConfirming(() => {
          setOpen(false);
          setNotice(null);
          router.refresh();
        });
        deferToast(r.recorded
          ? { title: composeConfirmedToast(r.count), variant: "success" }
          : { title: composeConfirmedToast(r.count), description: COMPOSE_CONFIRM_UNRECORDED, variant: "danger", durationMs: 0 });
        return;
      }
      const why = "reason" in r ? r.reason : undefined;
      if (why === undefined || why === "failed" || why === "unfinished") {
        // ⭐ THE ERROR STATE: the dialog stays OPEN with the typing kept — no remount, no close. Saying only what is known; an
        // outcome nobody can vouch for ("may already be confirmed") stays on screen until it is read (UD-3).
        toast(why === "failed"
          ? { title: COMPOSE_CONFIRM_FAILED, variant: "danger" }
          : { title: COMPOSE_CONFIRM_UNFINISHED, variant: "danger", durationMs: 0 });
        return;
      }
      if (why === "role") {
        setOpen(false);
        toast({ title: COMPOSE_CONFIRM_REFUSED, description: r.error, variant: "danger" });
        return;
      }
      if (why === "not_draft" || why === "not_found") {
        // Confirmed or closed meanwhile (perhaps by this very press, its answer lost): the page is read again and says so.
        startConfirming(() => {
          setOpen(false);
          setNotice(null);
          router.refresh();
        });
        deferToast({ title: COMPOSE_CONFIRM_REFUSED, description: r.error, variant: "warning" });
        return;
      }
      // ⭐ EVERY OTHER REFUSAL: the page is read again, and the dialog REMOUNTS on the fresh view with the server's sentence.
      startConfirming(() => {
        setNotice(r.error);
        setAttempt((a) => a + 1);
        router.refresh();
      });
    });
  };

  const state = card === null ? "unsaved"
    : card.status === "CONFIRMED" ? "confirmed"
      : card.status !== "DRAFT" ? "closed"
        : counting ? "counting"
          : open ? "open"
            : card.read === "error" ? "error"
              : reason !== null ? "blocked" : "ready";

  return (
    <div className="space-y-2" data-confirm-card={state}>
      {card !== null && card.status === "CONFIRMED" && (
        <Callout tone="success" role="status">
          <span className="block" data-confirm-confirmed>
            {COMPOSE_CONFIRMED}{" "}
            {CAMPAIGN_SCREENS.detail ? (
              <Link href={campaignDetailHref(card.campaignId) as Route} className="underline underline-offset-2" data-confirm-start>
                {COMPOSE_CONFIRMED_START}
              </Link>
            ) : (
              COMPOSE_CONFIRMED_NEXT
            )}
          </span>
        </Callout>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Button
          type="button"
          size="md"
          variant="primary"
          disabled={!openable || confirming}
          loading={counting}
          title={reason ?? undefined}
          onClick={begin}
          data-confirm-trigger
        >
          {counting ? COMPOSE_CONFIRM_COUNTING : COMPOSE_CONFIRM_TRIGGER}
        </Button>
        {reason !== null && <span className="text-body-sm text-text-secondary" data-confirm-blocked>{reason}</span>}
        {/* A view that could not be read is counted again here — the same page, read again; never a zero. */}
        {card !== null && card.read === "error" && (
          <Button type="button" size="sm" variant="ghost" loading={counting} onClick={() => startCounting(() => router.refresh())} data-confirm-count-again>
            {AUDIENCE_COUNT_AGAIN}
          </Button>
        )}
      </div>
      <p className="text-body-sm text-text-tertiary" data-confirm-honesty="card">{COMPOSE_CONFIRM_HONESTY}</p>
      {dialog !== null && dialog.view.count !== null && (
        <ConfirmModal
          key={`${dialog.view.watermark}:${attempt}`}
          open={open && live !== null}
          onClose={close}
          onConfirm={confirm}
          title={composeConfirmTitle(dialog.view.count, dialog.gate.tier === "medium")}
          body={<ConfirmBody view={dialog.view} money={card?.money ?? null} listed={dialog.gate.tier === "medium"} notice={notice} />}
          confirmLabel={COMPOSE_CONFIRM_ACT}
          tone="brand"
          maxWidth={560}
          loading={confirming}
          {...dialog.gate}
        />
      )}
    </div>
  );
}
