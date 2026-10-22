"use client";

/**
 * The integrity page's acts (MASWALI-BUILD S4): the sales pause, the week void, and Compliance's decisions on a share.
 * ⭐ Each is a typed confirmation in the kit dialog (S4 item 6); `FORFEIT SHARE` is the service's own word.
 * ⛔ Three acts kept apart (MB-78): the pause stops sales only, the week void refunds and leaves the carry where it is,
 *    and stopping the product is the Owner's sunset on the pools page.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmModal } from "@/components/ui/modal";
import { UnsavedChangesGuard } from "@/components/ui/unsaved-changes";
import { ControlLocked } from "@/components/admin/control-locked";
import { useMayAct, ActReadOnly } from "@/components/admin/act-gate";
import { validShareDecision } from "@/lib/maswali-admin-form-validation";
import { MASWALI_REASON_MIN, MASWALI_REASON_MAX, pauseReasonLengthOk, reasonLengthOk } from "@/lib/maswali-ceremony-bounds";
import {
  clearUnresolvedLetterAction, forfeitMaswaliShareAction, holdMaswaliShareAction, markMillioneaWinnerReachedAction, pauseMaswaliSalesAction,
  releaseMaswaliShareAction, resumeMaswaliSalesAction, voidMaswaliWeekAction,
} from "./actions";
import { raiseAuditWarning } from "../audit-warning";

const FORFEIT_WORD = "FORFEIT SHARE";
/** The server's `WINNER_REACHED_WORD` (maswali-console.ts), restated here: this client file imports no server module. */
const REACHED_WORD = "REACHED";
/** The server's `LETTERS_CLEARED_WORD` (maswali-console.ts), restated here for the same reason. */
const CHECKED_WORD = "CHECKED";
const fd = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return f; };

function useAct() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; error?: string; note?: string; auditWarning?: string | null }>, after?: () => void, onWarning?: (warning: string | null) => void) => {
    setError(null); setNote(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) { setError(r.error ?? "That did not go through."); return; }
      setNote(r.note ?? null);
      onWarning?.(r.auditWarning ?? null);
      after?.();
      router.refresh();
    });
  };
  return { pending, error, note, run };
}

export function PauseControl({ paused }: { paused: boolean }) {
  const mayAct = useMayAct();
  const { pending, error, note, run } = useAct();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  if (!mayAct) return <ActReadOnly />;
  return (
    <div className="space-y-3 max-w-form">
      <Field label={paused ? "Why sales resume" : "Why sales pause"} hint={`${MASWALI_REASON_MIN}–${MASWALI_REASON_MAX} characters.`}>
        <Textarea rows={2} maxLength={MASWALI_REASON_MAX} value={text} onChange={(e) => setText(e.target.value)} />
      </Field>
      <Button size="sm" variant={paused ? "primary" : "claret"} disabled={pending || !(paused ? reasonLengthOk(text) : pauseReasonLengthOk(text))} onClick={() => setOpen(true)}>{paused ? "Resume sales" : "Pause sales"}</Button>
      {!open && error && <p role="alert" className="text-body-sm text-danger-fg">{error}</p>}
      {note && <p role="status" className="text-body-sm text-success">{note}</p>}
      <UnsavedChangesGuard dirty={text.trim() !== ""} body={`A reason to ${paused ? "resume" : "pause"} sales has been typed but not recorded. Leaving now discards it.`} />
      <ConfirmModal open={open} onClose={() => setOpen(false)} loading={pending} tone={paused ? "brand" : "claret"} tier="hard" typedWord={paused ? "RESUME" : "PAUSE"}
        title={paused ? "Resume Millionea sales?" : "Pause Millionea sales?"} confirmLabel={paused ? "Resume" : "Pause"}
        body={<div className="space-y-2">
          <p>{paused ? "Players can buy again at once." : "No ticket can be bought until sales resume. Tickets already bought are safe; settlements, refunds and cancels go on."}</p>
          {error && <p role="alert" className="text-body-sm text-danger-fg">{error}</p>}
        </div>}
        onConfirm={() => run(() => (paused ? resumeMaswaliSalesAction(fd({ note: text })) : pauseMaswaliSalesAction(fd({ reason: text }))), () => { setOpen(false); setText(""); })} />
    </div>
  );
}

export function VoidWeekControl({ weekId, code }: { weekId: string; code: string }) {
  const mayAct = useMayAct();
  const { pending, error, note, run } = useAct();
  const [open, setOpen] = useState(false);
  if (!mayAct) return <ActReadOnly />;
  return (
    <span className="inline-flex flex-col gap-1">
      <Button size="sm" variant="claret" disabled={pending} onClick={() => setOpen(true)}>Void {code}</Button>
      {!open && error && <span role="alert" className="text-body-sm text-danger-fg">{error}</span>}
      {note && <span role="status" className="text-body-sm text-success">{note}</span>}
      <ConfirmModal open={open} onClose={() => setOpen(false)} loading={pending} tone="claret" tier="hard" typedWord="VOID"
        title={`Void ${code} whole?`} confirmLabel="Void and refund"
        body={<div className="space-y-2">
          <p>Voided mains outnumber the usable reserves on the sealed record. Every live ticket is refunded in full; the jackpot carries on untouched.{/* MR-18 */}</p>
          {error && <p role="alert" className="text-body-sm text-danger-fg">{error}</p>}
        </div>}
        onConfirm={() => run(() => voidMaswaliWeekAction(fd({ weekId })), () => setOpen(false), (warning) => raiseAuditWarning("integrity:weekVoid", warning))} />
    </span>
  );
}

/** S6 · MB-93 · the desk records a call that reached a winner no notice is known to have reached: the row and its alert clear. */
export function MarkReachedControl({ weekId, userId, holder }: { weekId: string; userId: string; holder: string }) {
  const mayAct = useMayAct();
  const { pending, error, note, run } = useAct();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  if (!mayAct) return <ActReadOnly />;
  // S6-ADMIN 1 · the 40px floor (sm, never xs: test:maswali-admin-touch), and the refusal stated inside the dialog while it
  // is open — never a copy under the scrim (F4; test:maswali-admin-form-validation's dialog reader).
  return (
    <span className="inline-flex flex-col gap-1">
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => setOpen(true)}>Reached by phone…</Button>
      {!open && error && <span role="alert" className="text-body-sm text-danger-fg">{error}</span>}
      {note && <span role="status" className="text-body-sm text-success">{note}</span>}
      <ConfirmModal open={open} onClose={() => setOpen(false)} loading={pending} tone="brand" tier="hard" typedWord={REACHED_WORD}
        title={`Record that ${holder} was reached?`} confirmLabel="Record the call"
        body={<div className="space-y-2">
          <Field label="How they were reached (the number called, what they were told)"><Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} /></Field>
          {error && <p role="alert" className="text-body-sm text-danger-fg">{error}</p>}
        </div>}
        onConfirm={() => run(() => markMillioneaWinnerReachedAction(fd({ weekId, userId, typed: REACHED_WORD, note: text })), () => { setOpen(false); setText(""); })} />
    </span>
  );
}

/** S6 · an officer records that a week's letters not known to have gone were checked: the row leaves the card. */
export function ClearLettersControl({ weekId, notice, code }: { weekId: string; notice: string; code: string }) {
  const mayAct = useMayAct();
  const { pending, error, note, run } = useAct();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  if (!mayAct) return <ActReadOnly />;
  // S6-ADMIN 1 · as MarkReachedControl: the 40px floor, and the refusal inside the dialog while it is open.
  return (
    <span className="inline-flex flex-col gap-1">
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => setOpen(true)}>Checked…</Button>
      {!open && error && <span role="alert" className="text-body-sm text-danger-fg">{error}</span>}
      {note && <span role="status" className="text-body-sm text-success">{note}</span>}
      <ConfirmModal open={open} onClose={() => setOpen(false)} loading={pending} tone="brand" tier="hard" typedWord={CHECKED_WORD}
        title={`Record that ${code}'s letters were checked?`} confirmLabel="Record the check"
        body={<div className="space-y-2">
          <Field label="What was checked (the provider's activity, what the holder was told)"><Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} /></Field>
          {error && <p role="alert" className="text-body-sm text-danger-fg">{error}</p>}
        </div>}
        onConfirm={() => run(() => clearUnresolvedLetterAction(fd({ weekId, notice, typed: CHECKED_WORD, note: text })), () => { setOpen(false); setText(""); })} />
    </span>
  );
}

export function HoldShareControl({ ticketId, serial }: { ticketId: string; serial: string }) {
  const mayAct = useMayAct();
  const { pending, error, note, run } = useAct();
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);
  const [tried, setTried] = useState(false);
  if (!mayAct) return <ActReadOnly />;
  return (
    <span className="inline-flex flex-col gap-1">
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => setOpen(true)}>Hold…</Button>
      {!open && error && <span role="alert" className="text-body-sm text-danger-fg">{error}</span>}
      {note && <span role="status" className="text-body-sm text-success">{note}</span>}
      <ConfirmModal open={open} onClose={() => { setOpen(false); setTried(false); }} loading={pending} tone="warning" tier="hard" typedWord="HOLD"
        title={`Hold the share on ${serial}?`} confirmLabel="Hold it"
        body={<div className="space-y-2"><Field label="Why (a reversed deposit funded it, a disqualification found later)" required hint="5–300 characters"
          error={tried && !validShareDecision(reason) ? "Write why this share is held (5–300 characters)." : undefined}>
          <Textarea rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
          {error && <p role="alert" className="text-body-sm text-danger-fg">{error}</p>}
        </div>}
        onConfirm={() => {
          if (!validShareDecision(reason)) { setTried(true); return; }
          run(() => holdMaswaliShareAction(fd({ ticketId, reason })), () => { setOpen(false); setReason(""); setTried(false); });
        }} />
    </span>
  );
}

export function HeldShareControls({ ticketId, serial, canRelease, canForfeit, releaseNeed, forfeitNeed }: {
  ticketId: string; serial: string; canRelease: boolean; canForfeit: boolean; releaseNeed: string; forfeitNeed: string;
}) {
  const mayAct = useMayAct();
  const { pending, error, note, run } = useAct();
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"release" | "forfeit" | null>(null);
  const [tried, setTried] = useState(false);
  if (!mayAct) return <ActReadOnly />;
  return (
    <span className="inline-flex flex-col gap-1.5 items-start">
      <span className="inline-flex gap-2">
        {canRelease ? <Button size="sm" variant="ghost" disabled={pending} onClick={() => setMode("release")}>Release…</Button> : <ControlLocked what="Release" need={releaseNeed} />}
        {canForfeit ? <Button size="sm" variant="claret" disabled={pending} onClick={() => setMode("forfeit")}>Forfeit…</Button> : <ControlLocked what="Forfeit" need={forfeitNeed} />}
      </span>
      {mode === null && error && <span role="alert" className="text-body-sm text-danger-fg">{error}</span>}
      {note && <span role="status" className="text-body-sm text-success">{note}</span>}
      <ConfirmModal open={mode !== null} onClose={() => { setMode(null); setTried(false); }} loading={pending} tone={mode === "forfeit" ? "claret" : "brand"} tier="hard"
        typedWord={mode === "forfeit" ? FORFEIT_WORD : "RELEASE"}
        title={mode === "forfeit" ? `Forfeit the share on ${serial}?` : `Release the share on ${serial}?`} confirmLabel={mode === "forfeit" ? "Forfeit to the jackpot" : "Release it"}
        body={
          <div className="space-y-2 text-left">
            {/* OD-07 · a forfeited share goes back to the jackpot, never to the house. */}
            <p>{mode === "forfeit" ? "The whole share leaves the wallet and goes back to the jackpot, for the next winning week — never to the house." : "The player keeps the share; the wallet's hold lifts once no other share is held."}</p>
            <Field label="The decision" required hint="5–300 characters"
              error={tried && !validShareDecision(text) ? "Write the decision (5–300 characters)." : undefined}>
              <Textarea rows={2} maxLength={300} value={text} onChange={(e) => setText(e.target.value)} /></Field>
            {error && <p role="alert" className="text-body-sm text-danger-fg">{error}</p>}
          </div>
        }
        onConfirm={() => {
          if (!validShareDecision(text)) { setTried(true); return; }
          run(() => (mode === "forfeit"
            ? forfeitMaswaliShareAction(fd({ ticketId, typed: FORFEIT_WORD, reason: text }))
            : releaseMaswaliShareAction(fd({ ticketId, note: text }))), () => { setMode(null); setText(""); setTried(false); });
        }} />
    </span>
  );
}
