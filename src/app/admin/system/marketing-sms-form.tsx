"use client";

/**
 * U49s-2 · THE "MARKETING SMS" TAB — the owner's five settings on /admin/system (`?tab=marketing-sms`; spec
 * `docs/marketing-specs/ENGINE-SPEC.md` §4.3 U49s decisions 4–6; E14; OD63): the price per SMS, the credit kept for login
 * and withdrawal codes, the most one campaign may spend, and the send window.
 *
 * ⭐ EVERY BOX IS VALIDATED LIVE WITH THE SERVER'S OWN RULE (`marketingSmsSettingsProblems`, the pure module both sides
 * import), every problem at once, each under its own box; a refusal from the server lands under the box it names and the
 * cursor is taken there (DG-S-06). The window's two ends are SELECTS of the quarter hours inside the bounds, so no bad
 * hour can be chosen at all — only a window under two hours can still be refused, under its end. Save is off, with its
 * reason beside it, while nothing changed or a box has a problem (as on the two sibling cards, a disabled Save also stops
 * Enter's implicit submit — the reason beside it says why); the pending bar's Save, which stays on, is never a silent
 * no-op: it goes to the first problem, or says there is nothing to save yet.
 * ⭐ A box that reads the same number ("6.0" for 6, "020000" for 20,000) is not a change: the form compares numbers, so a
 * save the server answers "nothing changed" never leaves the page saying it has unsaved changes.
 * ⛔ THE SERVER DECIDES AGAIN: the action calls `requireOwner` first and the setter re-judges every value, refuses a page
 * that is out of date (the `base` this form was rendered from) and a stored record it cannot read in full.
 * ⭐ Everyone else reads text (`editable` is the SERVER's decision — `marketingSmsFormView`, S11): a viewer who is not the
 * owner, one who may not act on this page, an owner whose own money.figures cell hides money (D3), and every viewer of a
 * record that could not be read in full — each told why, in words beside the values, never only in a tooltip.
 * ⛔ No box is ever disabled or read-only (the owner rule: no locked box) — a viewer who may not change these gets text.
 *
 * ⛔ A SEPARATE FILE, NOT `system-client.tsx` (`test:admin-act-gate` judges a whole file); it consults the gate itself.
 */
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FormColumn } from "@/components/ui/form-column";
import { useDeferredToast } from "@/components/ui/toast";
import { PendingChangesBar, UnsavedChangesGuard } from "@/components/ui/unsaved-changes";
import { ActReadOnly, useMayAct } from "@/components/admin/act-gate";
import { runAdminAction } from "@/lib/client/run-admin-action";
import { focusFirstInvalid } from "@/lib/client/focus-first-invalid";
import {
  SETTINGS_FIELDS, formatPriceTzs, formatWindow, marketingSmsSettingsProblems, minuteLabel, windowEndChoices,
  windowStartChoices, type SettingsField,
} from "@/lib/marketing/sms-settings";
import { formatTzs } from "@/lib/utils";
import { saveMarketingSmsSettingsAction } from "./actions";
import type { MarketingSmsFormView } from "./marketing-sms-view";

export const NOT_OWNER_NOTE = "Only an owner account (ADMIN) can change these.";
export const MONEY_HIDDEN_NOTE =
  "The price, the credit kept for codes and the campaign limit are shown to roles that may read money figures.";
export const OWNER_MONEY_HIDDEN_NOTE =
  "Your account's read level for money figures hides these settings, so they can't be changed here. An owner sets read levels on Roles.";
export const SAVED_SENTENCE = "Saved — campaigns use these from their next step.";
export const UNREADABLE_NOTE =
  "The saved settings couldn't be read in full, so nothing that spends money uses them, and nothing can be saved here until a developer fixes the stored record.";
export const LOAD_FAILED_NOTE = "The Marketing SMS settings couldn't be read just now — reload the page.";
export const ROLE_UNREAD_NOTE = "Your role couldn't be checked just now — reload the page to change these.";
const HELD_IDLE = "Change a setting to save.";

type Boxes = Record<SettingsField, string>;

const LABEL: Readonly<Record<SettingsField, string>> = {
  pricePerSegmentTzs: "Price per SMS (TZS)",
  codesReserveTzs: "Kept for login and withdrawal codes (TZS)",
  campaignLimitTzs: "Most one campaign may spend (TZS)",
  windowStartMinute: "Send window starts (EAT)",
  windowEndMinute: "Send window ends (EAT)",
};
const WINDOW_HINT =
  "50pick's own rule — no law sets these hours. If the Responsible Gambling page states hours, change its line on the Public policy lines tab too.";

/** A box's value as a number reads it ("6.0" and "6" are one price), or the text as typed when it is not one. */
const canon = (s: string): string => {
  const t = s.trim();
  return /^[0-9]+(\.[0-9]+)?$/.test(t) ? String(Number(t)) : t;
};

export function MarketingSmsForm({ view }: { view: MarketingSmsFormView }) {
  const mayAct = useMayAct();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  /* The card's own Save. The bar draws no second one while this is on screen. */
  const saveRef = useRef<HTMLButtonElement>(null);
  const [pending, start] = useTransition();
  const { deferToast, toast } = useDeferredToast(pending);
  const money = view.money;
  const win = view.window;
  /* ⭐ The boxes start from the row; the page remounts this form after a save (its `key` is the record's fingerprint). */
  const initial: Boxes = {
    pricePerSegmentTzs: money ? String(money.pricePerSegmentTzs) : "",
    codesReserveTzs: money ? String(money.codesReserveTzs) : "",
    campaignLimitTzs: money ? String(money.campaignLimitTzs) : "",
    windowStartMinute: win ? String(win.startMinute) : "",
    windowEndMinute: win ? String(win.endMinute) : "",
  };
  const [boxes, setBoxes] = useState<Boxes>(() => ({ ...initial }));
  /* The server's sentences from the last refused save, by box — cleared for a box as soon as it is changed. */
  const [serverProblems, setServerProblems] = useState<Partial<Record<SettingsField, string>>>({});

  const dirty = SETTINGS_FIELDS.some((f) => canon(boxes[f]) !== canon(initial[f]));
  const judged = marketingSmsSettingsProblems(boxes, view.floorTzs ?? 0);
  const live: Partial<Record<SettingsField, string>> = judged.ok ? {} : judged.problems;
  const problemOf = (f: SettingsField): string | undefined => serverProblems[f] ?? (dirty ? live[f] : undefined);
  const blocked = SETTINGS_FIELDS.filter((f) => problemOf(f) !== undefined);
  const canSave = dirty && blocked.length === 0;

  const set = (f: SettingsField, value: string) => {
    setBoxes((b) => ({ ...b, [f]: value }));
    setServerProblems((p) => {
      if (p[f] === undefined) return p;
      const next = { ...p };
      delete next[f];
      return next;
    });
  };
  const discard = () => { setBoxes({ ...initial }); setServerProblems({}); };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    /* ⛔ CAPTURED BEFORE THE ASYNC BOUNDARY — the form is the scope `focusFirstInvalid` searches (several forms share
       this page). */
    const form = e.currentTarget;
    // ⛔ NEVER A SILENT NO-OP: a held save goes to the first box with a problem, or says there is nothing to save yet.
    if (blocked.length > 0) { focusFirstInvalid(form, blocked); return; }
    if (!dirty) { toast({ title: "Nothing to save yet", description: HELD_IDLE }); return; }
    const fd = new FormData();
    for (const f of SETTINGS_FIELDS) fd.set(f, boxes[f].trim());
    fd.set("base", view.base ?? "");
    start(async () => {
      const r = await runAdminAction(() => saveMarketingSmsSettingsAction(fd));
      if (!r.ok) {
        const problems = ("problems" in r && r.problems ? r.problems : {}) as Partial<Record<SettingsField, string>>;
        setServerProblems(problems);
        toast({ title: "Couldn't save the Marketing SMS settings", description: r.error, variant: "danger" });
        const fields = SETTINGS_FIELDS.filter((f) => problems[f] !== undefined);
        if (fields.length > 0) focusFirstInvalid(form, fields);
        else if (r.field) focusFirstInvalid(form, [r.field]);
        return;
      }
      router.refresh();
      deferToast(r.changed > 0
        ? { title: SAVED_SENTENCE, variant: "success" }
        : { title: "Nothing changed", description: "Every setting already reads that way." });
    });
  };

  if (view.loadFailed) {
    return <p className="text-body-sm text-warning-fg" data-sms-settings="load-failed">{LOAD_FAILED_NOTE}</p>;
  }

  // ⛔ BELOW EVERY HOOK — everyone the server did not hand the form reads text, and is told why in words.
  if (!mayAct || !view.editable) {
    const why = !view.readable ? UNREADABLE_NOTE
      : view.roleUnread ? ROLE_UNREAD_NOTE
      : !view.isOwner ? NOT_OWNER_NOTE
        : !view.moneyVisible ? OWNER_MONEY_HIDDEN_NOTE
          : NOT_OWNER_NOTE;
    return (
      <div className="space-y-3" data-sms-settings="read-only">
        <div className="flex flex-wrap items-center gap-2">
          {!mayAct && <ActReadOnly note={NOT_OWNER_NOTE} />}
          <p className={`text-body-sm ${view.readable ? "text-text-tertiary" : "text-warning-fg"}`} data-sms-settings-note>{why}</p>
        </div>
        {view.readable && (
          /* On a phone each label sits over its value, the pairs spaced apart; from `sm` the pairs' wrappers step aside
             (`contents`) and the two columns line up. The values say "TZS" themselves, so the labels don't. */
          <dl className="space-y-2 text-body-sm sm:grid sm:grid-cols-[auto_1fr] sm:gap-x-4 sm:gap-y-1.5 sm:space-y-0">
            {money && (<>
              <div className="sm:contents"><dt className="text-text-secondary">Price per SMS</dt><dd className="text-text">{formatPriceTzs(money.pricePerSegmentTzs)}</dd></div>
              <div className="sm:contents"><dt className="text-text-secondary">Kept for login and withdrawal codes</dt><dd className="text-text">{formatTzs(money.codesReserveTzs)}</dd></div>
              <div className="sm:contents"><dt className="text-text-secondary">Most one campaign may spend</dt><dd className="text-text">{formatTzs(money.campaignLimitTzs)}</dd></div>
            </>)}
            {win && (
              <div className="sm:contents">
                <dt className="text-text-secondary">Send window</dt>
                <dd className="text-text">{formatWindow({ windowStartMinute: win.startMinute, windowEndMinute: win.endMinute })}</dd>
              </div>
            )}
          </dl>
        )}
        {view.readable && !money && view.isOwner === false && !view.roleUnread && (
          <p className="text-body-sm text-text-secondary" data-sms-settings-money-hidden>{MONEY_HIDDEN_NOTE}</p>
        )}
      </div>
    );
  }

  const startOptions = windowStartChoices().map((m) => ({ value: String(m), label: minuteLabel(m) }));
  const endOptions = windowEndChoices().map((m) => ({ value: String(m), label: minuteLabel(m) }));
  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-4" noValidate data-sms-settings="form">
      {view.stored === false && (
        <p className="text-body-sm text-text-secondary" data-sms-settings-defaults>
          Nothing has been saved yet — these are the defaults, and campaigns use them until you save.
        </p>
      )}
      <FormColumn measure="form" className="space-y-5">
        <Field
          label={LABEL.pricePerSegmentTzs}
          hint={`Used to estimate a campaign's cost until our own sends measure it. ${view.measuredHint ?? ""} From 1 to 1,000, at most two decimals.`.replace(/\s+/g, " ").trim()}
          error={problemOf("pricePerSegmentTzs")}
          dataField="pricePerSegmentTzs"
        >
          <Input inputMode="decimal" autoComplete="off" value={boxes.pricePerSegmentTzs} onChange={(e) => set("pricePerSegmentTzs", e.currentTarget.value)} error={problemOf("pricePerSegmentTzs") !== undefined} />
        </Field>
        <Field
          label={LABEL.codesReserveTzs}
          hint={`Marketing stops before the SMS credit falls below this, so codes keep sending. Whole shillings, at least ${(view.floorTzs ?? 0).toLocaleString("en-US")}.`}
          error={problemOf("codesReserveTzs")}
          dataField="codesReserveTzs"
        >
          <Input inputMode="numeric" autoComplete="off" value={boxes.codesReserveTzs} onChange={(e) => set("codesReserveTzs", e.currentTarget.value)} error={problemOf("codesReserveTzs") !== undefined} />
        </Field>
        <Field
          label={LABEL.campaignLimitTzs}
          hint="A campaign whose cost could pass this can't be confirmed. Whole shillings, from 100 to 10,000,000."
          error={problemOf("campaignLimitTzs")}
          dataField="campaignLimitTzs"
        >
          <Input inputMode="numeric" autoComplete="off" value={boxes.campaignLimitTzs} onChange={(e) => set("campaignLimitTzs", e.currentTarget.value)} error={problemOf("campaignLimitTzs") !== undefined} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* The window's hint sits on the START box, so a screen reader hears it there; the END box keeps its own line for
              the one refusal the window can still have (under 2 hours). */}
          <Field label={LABEL.windowStartMinute} hint={WINDOW_HINT} error={problemOf("windowStartMinute")} dataField="windowStartMinute">
            <Select ariaLabel={LABEL.windowStartMinute} value={boxes.windowStartMinute} onChange={(v) => set("windowStartMinute", v)} options={startOptions} error={problemOf("windowStartMinute") !== undefined} />
          </Field>
          <Field label={LABEL.windowEndMinute} error={problemOf("windowEndMinute")} dataField="windowEndMinute">
            <Select ariaLabel={LABEL.windowEndMinute} value={boxes.windowEndMinute} onChange={(v) => set("windowEndMinute", v)} options={endOptions} error={problemOf("windowEndMinute") !== undefined} />
          </Field>
        </div>
      </FormColumn>
      <div className="flex flex-wrap items-center gap-3">
        <Button ref={saveRef} type="submit" variant="primary" loading={pending} disabled={!canSave} data-sms-settings-save>
          Save settings
        </Button>
        {/* A disabled control says why — a greyed button with no reason reads as a broken console. */}
        {!pending && !canSave && (
          <span className="text-body-sm text-text-tertiary" aria-live="polite" data-sms-settings-reason>
            {blocked.length > 0 ? "Fix the problems shown under the boxes to save." : HELD_IDLE}
          </span>
        )}
      </div>
      <PendingChangesBar
        dirty={dirty}
        saving={pending}
        detail="The settings apply to every campaign from its next step."
        saveAnchor={saveRef}
        onSave={() => {
          const form = formRef.current;
          if (!form) return;
          if (blocked.length > 0) { focusFirstInvalid(form, blocked); return; }
          form.requestSubmit();
        }}
        onDiscard={discard}
        saveLabel="Save settings"
      />
      <UnsavedChangesGuard dirty={dirty} body="The Marketing SMS settings have been changed but not saved. Leaving now discards the change." />
    </form>
  );
}
