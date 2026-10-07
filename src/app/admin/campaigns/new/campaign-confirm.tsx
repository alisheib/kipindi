"use client";

/**
 * U40b · THE CONFIRM CARD — the composer's fourth card, under the Test card, and the dialog it opens (ENGINE-SPEC §4.6;
 * OD27 · OD65 · OD67; U40.md "UI states"). The work is the server's: U40a's `campaignConfirmView` and `confirmCampaign`,
 * reached through this card's two actions.
 *
 * ⭐ COUNTED ON DEMAND, NEVER ON A RENDER (the U40b review's MAJOR). The composer's render counts nothing for this card: no
 * rail pick, save, test or "Count again" waits on a confirmation's walk. "Confirm audience…" ASKS
 * (`campaignConfirmViewAction`) — "Counting the audience…" while the view is counted for this officer, now — and opens the
 * dialog on those figures, or, if they are blocked, says why and offers to check again. A failed read is said as such, with
 * "Count again" — never a zero. The server counts nothing for a campaign past DRAFT, a revision this form is not showing, or
 * an audience on screen that the draft does not store.
 * ⭐ DISABLED WITH ITS REASON, NEVER HIDDEN (decision 1): in its `title` and on the card (`confirmTriggerBlocked`) — a campaign
 * past DRAFT (its status, in words true of it), the act gate, the FORM (the server confirms the SAVED message and audience
 * and cannot see this form: an audience the composer cannot use says its own problem; unsaved text, an audience on screen
 * the draft does not store or a save in flight say "Save first"; a blank Swahili message says so; a draft saved in another
 * tab since this page loaded says reload), and the read's last answer in its own words — never "Nothing was confirmed"
 * beside a trigger nobody confirmed with.
 * ⭐ ONE HEIGHT AT REST: the card's line under the trigger is a box as tall as the honesty line at every width (an invisible
 * copy sizes it), holding the honesty line, the reason, or the confirmed line — so the route's ghost (`ConfirmCardGhost`,
 * the same box) is the card's height (`qa:marketing-confirm` asserts it). The boxes are `confirm-card-ghost.tsx`'s, a
 * server-safe file, so the route's ghost is drawn without this card's chunk.
 * ⛔ THE DIALOG'S TIER IS THE VIEW'S (`confirmGate` — `view.tier` exactly as the server answered it, never worked out again
 * here from a count). OD67: a viewer who may not read a number is always handed the typed tier, with the count alone, no
 * list and no sample — so this card has nothing to list for them, and never could: it lists `view.sample` and nothing
 * else. A reader's list tier names every person (masked, the operator by prefix — no player flag, D19).
 * ⭐ THE DIALOG IS THE KIT'S `ConfirmModal`, never a Modal of its own: the medium tier opens on Cancel and the typed tier on
 * its box (the digit keypad — `typedInputMode`), so the Confirm button is never the focused element when it opens. It is
 * NEVER REMOUNTED: a refusal asks for the view again inside the same busy moment and RE-ARMS the dialog on it
 * (`armKey` = `${watermark}:${attempt}`) — the new number, the server's sentence on top, the box cleared, the focus back on
 * the box or on Cancel; a fresh view that can no longer open closes it in the same render (`open` is decided while
 * rendering), its sentence said in a toast. A remount would draw nothing for a commit: a blink.
 * ⭐ WHAT EACH ANSWER DOES is decided by the pure router (`confirmOutcome`, `afterRecount` — `test:campaign-gates` §UI 13):
 * CONFIRMED closes once the page is read again (read-only now) and says "Nothing has been sent." (and that the record did
 * not land, when it did not — ruling 543); an ERROR keeps the dialog OPEN with the typing kept, saying only what is known;
 * the role's refusal closes; "no longer a draft" closes, reads the page again and is titled from the row it reads —
 * "Already confirmed" when this officer's own earlier press may have landed. CONFIRMING: both buttons off, a spinner, and
 * the scrim, Esc and ✕ refused (the kit's `loading`).
 * ⛔ NO MONEY IS WORDED HERE: the estimate's segments are said to every role; the money line is the server's
 * (`confirmMoneyLine`), handed to a money reader only, and printed as it comes (`test:campaign-compose` §16.5).
 * ⛔ TWO ACTIONS, ONE EACH FILE, both imported here: the read (`campaignConfirmViewAction` — the form's campaign, revision and
 * audience keys) and the confirmation (`confirmCampaignAction` — the campaign, the word the dialog armed on and the claim it
 * was opened on). Never a count (OD27: the server counts).
 *
 * Guard: `npm run test:campaign-gates` §UI · Drive: `npm run qa:marketing-confirm`.
 */
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { ConfirmModal } from "@/components/ui/modal";
import { Stat } from "@/components/ui/stat";
import { useDeferredToast } from "@/components/ui/toast";
import { useMayAct, useActDisabledReason } from "@/components/admin/act-gate";
import { runAdminAction } from "@/lib/client/run-admin-action";
import { CAMPAIGN_SCREENS, campaignDetailHref } from "@/lib/marketing/campaign-status";
import { confirmCampaignAction } from "./confirm-actions";
import { campaignConfirmViewAction } from "./confirm-view-actions";
import { useComposerSaved } from "./composer-client";
import type { ConfirmCardView, ConfirmReadAnswer } from "./confirm-doors";
import type { AudienceSplitView } from "./audience-view-model";
import { AUDIENCE_COUNT_AGAIN, AUDIENCE_FIGURE, AUDIENCE_NO_OPERATOR, AUDIENCE_SAMPLE_LEAD } from "./audience-copy";
import {
  COMPOSE_CONFIRM_ACT, COMPOSE_CONFIRM_CHECK_AGAIN, COMPOSE_CONFIRM_COUNTING, COMPOSE_CONFIRM_HONESTY, COMPOSE_CONFIRM_LIST_LEAD,
  COMPOSE_CONFIRM_REFUSED, COMPOSE_CONFIRM_TRIGGER, COMPOSE_CONFIRMED, COMPOSE_CONFIRMED_NEXT, COMPOSE_CONFIRMED_START,
  afterRecount, composeConfirmSegments, composeConfirmTitle, composeNotDraftTitle, confirmAnswerReady, confirmAnswerRetry,
  confirmGate, confirmOutcome, confirmTriggerBlocked,
} from "./composer-copy";
import type { ConfirmGateProps, ConfirmOutcome, ConfirmRecount } from "./composer-copy";
import { CONFIRM_LINE_BOX, CONFIRM_LINE_CELL, ConfirmLineSizer } from "./confirm-card-ghost";

/* ═══ THE GEOMETRY — the dialog's boxes (the card's line and the route's ghost share `confirm-card-ghost.tsx`'s) ══════ */

/** A figure tile — the kit's `Stat` in its card box, tall enough for a two-line label at 360 (the audience card's floor). */
const TILE = "min-h-[84px]";
/** The figures: two across on a phone, four from the small breakpoint. */
const TILES = "grid grid-cols-2 gap-2 sm:grid-cols-4";
/** One listed person: the masked number and the operator, wrapping rather than clipping. */
const ROW = "flex flex-wrap items-baseline justify-between gap-x-3 border-b border-border px-3 py-2 last:border-0";

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
      {/* A refusal's own sentence, on top of the fresh view it was asked again on. */}
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

/** The read's answer as the card receives it — the action's, or a request lost in transit (`runAdminAction`). */
type ReadAnswer = ConfirmReadAnswer | { ok: false; error: string; field?: string };
/** The read's last answer, held with the form it was asked for (its draft, revision and audience). */
type Asked = { key: string; answer: ReadAnswer };
/** What the dialog is drawn from: the last view it could open on, kept while it closes so its exit plays on it. */
type Drawn = { view: ConfirmCardView; gate: ConfirmGateProps; money: string | null };

/** ⭐ The card for the composer's draft — it reads the composer's own state, and counts nothing until it is pressed. */
export function CampaignConfirm() {
  const router = useRouter();
  const mayAct = useMayAct();
  const actReason = useActDisabledReason();
  const form = useComposerSaved();
  const [asked, setAsked] = useState<Asked | null>(null);
  const [open, setOpen] = useState(false);
  // Bumped when a refusal re-arms the dialog on its fresh view — never by any other answer.
  const [attempt, setAttempt] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  // A refusal for a campaign no longer a draft, said once the page has been read again — titled from the row it reads.
  const [notDraft, setNotDraft] = useState<string | null>(null);
  const [counting, startCounting] = useTransition();
  const [confirming, startConfirming] = useTransition();
  const { toast, deferToast } = useDeferredToast(confirming);

  // ⭐ The answer is the FORM's: another draft, another revision or another audience on screen asks again.
  const formKey = `${form.savedId ?? ""}:${form.savedRevision ?? ""}:${JSON.stringify(form.audienceParams)}`;
  const answer = asked !== null && asked.key === formKey ? asked.answer : null;
  const facts = { mayAct, actReason: actReason ?? null, form };
  const reason = confirmTriggerBlocked({ ...facts, answer });
  // The way back a blocked ANSWER offers — only while nothing on the page itself stands in front of it.
  const retry = confirmTriggerBlocked({ ...facts, answer: null }) === null ? confirmAnswerRetry(answer) : null;
  const view = answer !== null && answer.ok ? answer.card.view : null;
  // ⛔ The tier is the VIEW's (`confirmGate` reads `view.tier`) — never worked out again here from the count (OD67).
  const gate = view === null ? null : confirmGate(view);
  const live: Drawn | null = reason === null && view !== null && view.count !== null && gate !== null
    ? { view, gate, money: answer !== null && answer.ok ? answer.card.money : null }
    : null;
  // The last view the dialog could open on — held by the "adjust state while rendering" rule, so no frame draws a mismatch.
  const [drawn, setDrawn] = useState<Drawn | null>(null);
  if (live !== null && drawn?.view !== live.view) setDrawn(live);
  const dialog = live ?? drawn;

  /** The read's request: what this form shows — never a count. */
  const readRequest = () => ({ campaignId: form.savedId ?? "", draftRevision: form.savedRevision, audience: form.audienceParams });

  /** ⭐ ASK — count the confirmation's view for this officer, NOW (a press, never a render), and open on it when it may. */
  const ask = () => {
    if (form.savedId === null || counting || confirming) return;
    const key = formKey;
    const request = readRequest();
    setNotice(null);
    startCounting(async () => {
      const r = await runAdminAction(() => campaignConfirmViewAction(request));
      startCounting(() => {
        setAsked({ key, answer: r });
        if (confirmAnswerReady(r)) setOpen(true);
      });
    });
  };

  /** What each answer does — decided by the pure router, applied here and nowhere else. */
  const settle = (o: ConfirmOutcome | ConfirmRecount) => {
    switch (o.kind) {
      case "confirmed":
        setOpen(false);
        setNotice(null);
        router.refresh();
        deferToast(o.toast);
        return;
      case "keep":
        // ⭐ THE ERROR STATE: the dialog stays OPEN with the typing kept — no re-arm, no close.
        toast(o.toast);
        return;
      case "close":
        setOpen(false);
        setNotice(null);
        toast(o.toast);
        return;
      case "already":
        setOpen(false);
        setNotice(null);
        router.refresh();
        if (o.gone) deferToast({ title: COMPOSE_CONFIRM_REFUSED, description: o.description, variant: "warning" });
        else setNotDraft(o.description);
        return;
      case "rearm":
        // ⭐ RE-ARMED on the fresh view: the server's sentence on top, the box cleared and the focus given again (`armKey`).
        setNotice(o.notice);
        setAttempt((a) => a + 1);
        return;
      case "recount":
        return;
    }
  };

  // "No longer a draft" is said once the page has been read again: "Already confirmed" when it now reads CONFIRMED.
  useEffect(() => {
    if (notDraft === null || confirming) return;
    toast({ title: composeNotDraftTitle(form.status), description: notDraft, variant: "warning" });
    setNotDraft(null);
  }, [notDraft, confirming, form.status, toast]);

  const close = () => {
    setOpen(false);
    setNotice(null);
  };

  /** ⛔ The campaign, the word the dialog armed on (the bare count — what the server checks against its OWN count) and the
   *  claim it was opened on. Never a count of the browser's. */
  const confirm = () => {
    if (dialog === null || form.savedId === null || confirming) return;
    const fd = new FormData();
    fd.set("campaignId", form.savedId);
    fd.set("watermark", dialog.view.watermark ?? "");
    fd.set("typed", dialog.gate.tier === "hard" ? dialog.gate.typedWord : "");
    const key = formKey;
    const request = readRequest();
    startConfirming(async () => {
      const r = await runAdminAction(() => confirmCampaignAction(fd));
      const o = confirmOutcome(r);
      if (o.kind !== "recount") {
        startConfirming(() => settle(o));
        return;
      }
      // ⭐ A REFUSAL: the view asked for again inside the same busy moment — the dialog stays drawn until it can re-arm.
      const refused = o.notice;
      const again = await runAdminAction(() => campaignConfirmViewAction(request));
      startConfirming(() => {
        setAsked({ key, answer: again });
        settle(afterRecount(again, refused));
      });
    });
  };

  const status = form.status;
  const state = status === "CONFIRMED" ? "confirmed"
    : status !== null && status !== "DRAFT" ? "closed"
      : counting ? "counting"
        : open && live !== null ? "open"
          : retry === "count" ? "error"
            : reason !== null ? "blocked" : "ready";

  return (
    <div className="space-y-2" data-confirm-card={state}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Button
          type="button"
          size="md"
          variant="primary"
          disabled={reason !== null || confirming}
          loading={counting}
          title={reason ?? undefined}
          onClick={ask}
          data-confirm-trigger
        >
          {counting ? COMPOSE_CONFIRM_COUNTING : COMPOSE_CONFIRM_TRIGGER}
        </Button>
        {/* A read that failed is counted again, a blocked one checked again — the trigger's own read. Never a zero. */}
        {retry !== null && (
          <Button type="button" size="sm" variant="ghost" disabled={counting || confirming} onClick={ask} data-confirm-again={retry}>
            {retry === "count" ? AUDIENCE_COUNT_AGAIN : COMPOSE_CONFIRM_CHECK_AGAIN}
          </Button>
        )}
      </div>
      {/* ⭐ The line: the confirmed line, the reason, or the honesty line — in ONE box as tall as the honesty line. */}
      <div className={CONFIRM_LINE_BOX}>
        <ConfirmLineSizer />
        {status === "CONFIRMED" ? (
          <p className={`${CONFIRM_LINE_CELL} text-success-fg`} role="status" data-confirm-confirmed>
            {COMPOSE_CONFIRMED}{" "}
            {CAMPAIGN_SCREENS.detail && form.pageDraftId !== null ? (
              <Link href={campaignDetailHref(form.pageDraftId) as Route} className="underline underline-offset-2" data-confirm-start>
                {COMPOSE_CONFIRMED_START}
              </Link>
            ) : (
              COMPOSE_CONFIRMED_NEXT
            )}
          </p>
        ) : reason !== null ? (
          <p className={`${CONFIRM_LINE_CELL} text-text-secondary`} role="status" data-confirm-blocked>{reason}</p>
        ) : (
          <p className={`${CONFIRM_LINE_CELL} text-text-tertiary`} role="status" data-confirm-honesty="card">{COMPOSE_CONFIRM_HONESTY}</p>
        )}
      </div>
      {dialog !== null && dialog.view.count !== null && (
        <ConfirmModal
          open={open && live !== null}
          onClose={close}
          onConfirm={confirm}
          title={composeConfirmTitle(dialog.view.count, dialog.gate.tier === "medium")}
          body={<ConfirmBody view={dialog.view} money={dialog.money} listed={dialog.gate.tier === "medium"} notice={notice} />}
          confirmLabel={COMPOSE_CONFIRM_ACT}
          tone="brand"
          maxWidth={560}
          loading={confirming}
          armKey={`${dialog.view.watermark}:${attempt}`}
          {...dialog.gate}
        />
      )}
    </div>
  );
}
