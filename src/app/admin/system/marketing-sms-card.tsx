"use client";

/**
 * U49s-2 · THE "MARKETING SMS SENDING" CARD — the live switch, ABOVE the rail on /admin/system (spec
 * `docs/marketing-specs/ENGINE-SPEC.md` §4.3 U49s decision 8; E13; OD62).
 *
 * ⭐ ABOVE THE RAIL BECAUSE IT IS A KILL-SWITCH (§K rule 7d: "a tab may hide a DETAIL. It may never hide a STATE"). While
 * it is off no marketing SMS can reach a phone — a campaign cannot start and a test send is refused; while it is on, every
 * started campaign sends and every test costs real SMS credit. So its state is on every tab, beside Maintenance mode.
 *
 * ⛔ THE BUTTONS ARE NOT THE GATE. Both actions call `requireOwner` FIRST, and the writers re-read the row, write
 * conditionally, read it back and record the COMPLIANCE row on the server — this card is only as fresh as its last render,
 * and every answer re-renders it from the row (`router.refresh`). A viewer who is not the owner (or may not act on this
 * page at all) reads the state and the limits; the buttons the state calls for are shown DISABLED, with the reason beside
 * them and in their `title` — never only in a tooltip a phone cannot reach.
 *
 * ⛔ NEVER "THEY WEREN'T SWITCHED ON" WITHOUT PROOF, NEVER "OFF" UNREAD — the words are `marketing-sms-words.ts`'s (pure,
 * so `test:marketing-settings` S14 runs every writer path through them): "weren't switched on" only for a refusal made
 * before this click wrote anything; a switch-on taken back "didn't complete"; anything else "Couldn't confirm whether
 * marketing SMS are on". `already_open` and "already off" are worded from the server's read AFTER the answer (the action
 * hands it back) — never from this card as it was before the click.
 *
 * ⭐ THE SWITCH CLOSES ITSELF (E13): opening asks how long — 30 minutes to 24 hours, 2 hours by default, every time the
 * dialog opens — and the dialog names the instant it will switch itself off, in EAT, as the owner changes the choice
 * (a polite live region, so a screen reader hears the new instant too). The dialog opens on Cancel (the kit's medium
 * tier). ⛔ The durations are RADIOS inside the dialog, never the kit Select: its list is portalled outside the dialog,
 * where an aria-modal dialog hides it from VoiceOver, and the dialog's Escape closed the whole dialog over an open list.
 * ⭐ The dialog stays up, its Confirm spinning and nothing dismissable, until the server answers; then it closes and
 * focus lands on the state sentence, which reads the switch as the refreshed card has it. A refusal or a caveat stays
 * on screen until it is dismissed (`durationMs: 0`, UD-3).
 *
 * ⛔ A SEPARATE FILE, NOT `system-client.tsx` (the U33w/U33p/U33a-R cards' reason): `test:admin-act-gate` judges a whole
 * FILE, and `system-client.tsx` is a declared, ungated entry on its shrink-only allowlist. This card consults the gate.
 * ⛔ No Swahili gloss is invented for this English console copy (§5.13).
 */
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/modal";
import { useDeferredToast } from "@/components/ui/toast";
import { useMayAct } from "@/components/admin/act-gate";
import { runAdminAction } from "@/lib/client/run-admin-action";
import { LIVE_SWITCH_DEFAULT_OPEN_MS, LIVE_SWITCH_DURATIONS_MS } from "@/lib/marketing/sms-settings";
import { closeMarketingLiveSwitchAction, openMarketingLiveSwitchAction } from "./actions";
import type { MarketingSmsCardView } from "./marketing-sms-view";
import {
  NOT_OWNER_REASON, ROLE_UNREAD_REASON, alreadyOffToast, closeRefusalTitle, openRefusalToast,
} from "./marketing-sms-words";

const durationLabel = (ms: number): string => {
  const minutes = ms / 60_000;
  if (minutes < 60) return `${minutes} minutes`;
  const hours = minutes / 60;
  return hours === 1 ? "1 hour" : `${hours} hours`;
};

const EAT_TIME = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Dar_es_Salaam", hour: "2-digit", minute: "2-digit", hour12: false });
const EAT_DAY = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Dar_es_Salaam", day: "numeric", month: "short" });
/** The instant the dialog names: "14:30 EAT", or "14:30 EAT on 7 Oct" when it is not today in Dar es Salaam. */
const eatLabel = (ms: number, nowMs: number): string =>
  EAT_DAY.format(ms) === EAT_DAY.format(nowMs) ? `${EAT_TIME.format(ms)} EAT` : `${EAT_TIME.format(ms)} EAT on ${EAT_DAY.format(ms)}`;

const MALFORMED = "Off — the stored switch was not in a shape this version reads, so it is treated as off.";

/** The state sentence (spec §4.3 "Card above the rail"). The malformed state's instruction is said only to a viewer who
 *  can follow it. */
export function liveSwitchSentence(
  v: Pick<MarketingSmsCardView, "state" | "why" | "closesAtLabel" | "enabledAtLabel" | "enabledByName">,
  canSwitch: boolean,
): string {
  if (v.state === "open") {
    const until = v.closesAtLabel ?? "its closing time";
    return `On until ${until} — switched on by ${v.enabledByName ?? "an owner"} at ${v.enabledAtLabel ?? "an earlier time"}. Started campaigns send while it is on; it switches itself off at ${until}.`;
  }
  if (v.why === "expired") return `Off — it switched itself off at ${v.closesAtLabel ?? "its closing time"}.`;
  if (v.why === "unreadable") return "Couldn't read the switch — it is treated as off. Reload the page to check again.";
  if (v.why === "malformed") return canSwitch ? `${MALFORMED} Switch it off now to clear it.` : MALFORMED;
  return "Off — no marketing SMS can be sent. Campaigns can't start, and test sends to a phone are refused.";
}

export const SWITCH_ON_TITLE = "Switch on marketing SMS?";
export const SWITCH_OFF_TITLE = "Switch off marketing SMS now?";
export const SWITCH_OFF_BODY = "Campaigns that are sending pause at their next step. Messages already handed to the network are not recalled.";
const UNRECORDED = " The record of this switch-off couldn't be written — tell the developer.";

export function MarketingSmsCard({ view }: { view: MarketingSmsCardView }) {
  const mayAct = useMayAct();
  const router = useRouter();
  const [pending, start] = useTransition();
  const { deferToast, toast } = useDeferredToast(pending);
  const [asking, setAsking] = useState<null | "on" | "off">(null);
  const [forMs, setForMs] = useState<number>(LIVE_SWITCH_DEFAULT_OPEN_MS);
  // The closing time the dialog names follows the clock while it is open, re-read AT each minute's turn (a dialog left
  // open for a while still tells the truth, and a confirm just after the turn never names the minute before the one the
  // server stamps); the server stamps its own instant regardless.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (asking !== "on") return;
    let t: ReturnType<typeof setTimeout>;
    const arm = () => {
      t = setTimeout(() => { setNow(Date.now()); arm(); }, 60_000 - (Date.now() % 60_000) + 20);
    };
    arm();
    return () => clearTimeout(t);
  }, [asking]);

  const canSwitch = view.isOwner && mayAct;
  // A role that could not be read is said as such — never as "not the owner" (the buttons stay disabled either way).
  const disabledReason = canSwitch ? undefined : view.roleUnread ? ROLE_UNREAD_REASON : NOT_OWNER_REASON;
  const tone = view.state === "open" ? "text-text font-semibold" : view.why === "unreadable" || view.why === "malformed" ? "text-warning-fg" : "text-text";

  // ⭐ Every opening starts from E13's default and the clock as it is now — never the last choice left in the dialog.
  const askOn = () => { setForMs(LIVE_SWITCH_DEFAULT_OPEN_MS); setNow(Date.now()); setAsking("on"); };

  // ⭐ Once an answer has re-rendered the card (the action AND the refresh settled), focus lands on the state sentence:
  // the dialog that held focus is gone, and the button that opened it may be too (Switch on… becomes Switch off now), so
  // focus would otherwise fall to the page, and the new state would never be read out.
  const stateRef = useRef<HTMLParagraphElement>(null);
  const answered = useRef(false);
  useEffect(() => {
    if (pending || !answered.current) return;
    answered.current = false;
    stateRef.current?.focus();
  }, [pending]);

  const run = (kind: "on" | "off") => {
    start(async () => {
      try {
        if (kind === "on") {
          const fd = new FormData();
          fd.set("minutes", String(forMs / 60_000));
          const res = await runAdminAction(() => openMarketingLiveSwitchAction(fd));
          if (!res.ok) {
            // `readsAs`: the server's read after an `already_open` — what the refreshed card is about to show.
            const readsAs = "readsAs" in res ? res.readsAs : undefined;
            toast({ ...openRefusalToast("reason" in res ? res.reason : undefined, res.error, readsAs), variant: "danger", durationMs: 0 });
          } else {
            deferToast({ title: `Marketing SMS are on until ${res.closesAtLabel}.`, description: "Every test send now costs real SMS credit.", variant: "success" });
          }
        } else {
          const res = await runAdminAction(() => closeMarketingLiveSwitchAction());
          if (!res.ok) {
            toast({ title: closeRefusalTitle("reason" in res ? res.reason : undefined), description: res.error, variant: "danger", durationMs: 0 });
          } else if (res.already) {
            // Nothing was removed (nothing recorded, nothing owed) — said as the read after it found the switch.
            const t = alreadyOffToast(res.remains);
            deferToast(t.variant === "danger" ? { ...t, durationMs: 0 } : t);
          } else {
            const unrecorded = res.recorded ? "" : UNRECORDED;
            if (res.reopened) {
              deferToast({ title: "Switched off — but someone switched it on again at the same moment.", description: `Marketing SMS are on now. Switch them off again if you meant to.${unrecorded}`, variant: "danger", durationMs: 0 });
            } else if (res.unreadAfter) {
              deferToast({ title: "Switched off — but the switch couldn't be read back.", description: `Reload the page to check it is off.${unrecorded}`, variant: "danger", durationMs: 0 });
            } else if (!res.recorded) {
              deferToast({ title: "Marketing SMS are off.", description: unrecorded.trim(), variant: "danger", durationMs: 0 });
            } else {
              deferToast({ title: "Marketing SMS are off.", variant: "success" });
            }
          }
        }
      } finally {
        // The dialog closes WITH the answer — until then its Confirm spins and nothing dismisses it (kit DS-2).
        setAsking(null);
        answered.current = true;
        // ⭐ Every answer re-renders the card from the row, so what it shows is what the server read — never this click.
        router.refresh();
      }
    });
  };

  return (
    <div data-live-switch={view.state} data-live-switch-why={view.why ?? undefined}>
      <p ref={stateRef} tabIndex={-1} className={`text-body-sm mb-2 ${tone}`} data-live-switch-state>{liveSwitchSentence(view, canSwitch)}</p>
      <p className="text-body-sm text-text-secondary mb-3" data-live-switch-limits>{view.limits}</p>
      <div className="flex flex-wrap items-center gap-3">
        {view.offers.includes("off") && (
          <Button variant={view.state === "open" ? "primary" : "secondary"} onClick={() => setAsking("off")} disabled={pending || !canSwitch} title={disabledReason} data-live-switch-off>
            Switch off now
          </Button>
        )}
        {view.offers.includes("on") && (
          <Button variant="secondary" onClick={askOn} disabled={pending || !canSwitch} title={disabledReason} data-live-switch-on>
            Switch on…
          </Button>
        )}
        {/* A disabled control says why, beside it — a greyed button with no reason reads as a broken console. */}
        {!canSwitch && <span className="text-body-sm text-text-tertiary" data-live-switch-reason>{disabledReason}</span>}
      </div>

      <ConfirmModal
        open={asking === "on"}
        onClose={() => setAsking(null)}
        onConfirm={() => run("on")}
        title={SWITCH_ON_TITLE}
        body={
          <div className="space-y-3" data-live-switch-dialog="on">
            {/* The console's radio-card shape (the composer's "Send the test to"): native radios, one tab stop, the arrows
                move the choice — and all of it inside the dialog. ⛔ Locked while the server works: the instant this
                dialog names must stay the one the click asked for. */}
            <fieldset disabled={pending} data-live-switch-durations>
              <legend className="mb-2 text-body-sm font-semibold text-text">For how long</legend>
              {/* Two columns at every width: the dialog is narrow on a desktop too, and three wrap "30 minutes". */}
              <div className="grid grid-cols-2 gap-2">
                {LIVE_SWITCH_DURATIONS_MS.map((ms) => (
                  <label
                    key={ms}
                    className={`flex min-h-[var(--tap-min)] cursor-pointer items-center gap-[10px] rounded-md border px-3 text-body-sm transition-colors ${
                      forMs === ms ? "border-royal-700 bg-royal-500/10" : "border-border hover:border-border-strong"
                    }`}
                  >
                    <input
                      type="radio"
                      name="live-switch-for"
                      value={String(ms)}
                      checked={forMs === ms}
                      onChange={() => setForMs(ms)}
                      className="shrink-0 accent-[var(--royal-500)]"
                    />
                    {/* One weight for every label: the choice shows in its border and tint, never in a width change. */}
                    <span className="text-text">{durationLabel(ms)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <p>While it is on, any campaign that has been started sends, and every test send costs real SMS credit.</p>
            {/* Polite and atomic: a changed choice (or the minute's turn) is read out as the whole sentence. */}
            <p aria-live="polite" aria-atomic="true">
              It switches itself off at <strong className="text-text" data-live-switch-closes>{eatLabel(now + forMs, now)}</strong>.
            </p>
          </div>
        }
        confirmLabel="Switch on"
        loading={pending}
      />
      <ConfirmModal
        open={asking === "off"}
        onClose={() => setAsking(null)}
        onConfirm={() => run("off")}
        title={SWITCH_OFF_TITLE}
        body={<span data-live-switch-dialog="off">{SWITCH_OFF_BODY}</span>}
        confirmLabel="Switch off"
        tone="brand"
        loading={pending}
      />
    </div>
  );
}
