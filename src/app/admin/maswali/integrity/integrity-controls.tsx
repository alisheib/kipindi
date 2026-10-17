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
import {
  forfeitMaswaliShareAction, holdMaswaliShareAction, pauseMaswaliSalesAction, releaseMaswaliShareAction, resumeMaswaliSalesAction,
  voidMaswaliWeekAction,
} from "./actions";

const FORFEIT_WORD = "FORFEIT SHARE";
const fd = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return f; };

function useAct() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; error?: string; note?: string }>, after?: () => void) => {
    setError(null); setNote(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) { setError(r.error ?? "That did not go through."); return; }
      setNote(r.note ?? null);
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
      <Field label={paused ? "Why sales resume" : "Why sales pause"}><Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} /></Field>
      <Button size="sm" variant={paused ? "primary" : "claret"} disabled={pending || text.trim().length < 5} onClick={() => setOpen(true)}>{paused ? "Resume sales" : "Pause sales"}</Button>
      {error && <p role="alert" className="text-body-sm text-danger-fg">{error}</p>}
      {note && <p role="status" className="text-body-sm text-success">{note}</p>}
      <UnsavedChangesGuard dirty={text.trim() !== ""} body={`A reason to ${paused ? "resume" : "pause"} sales has been typed but not recorded. Leaving now discards it.`} />
      <ConfirmModal open={open} onClose={() => setOpen(false)} loading={pending} tone={paused ? "brand" : "claret"} tier="hard" typedWord={paused ? "RESUME" : "PAUSE"}
        title={paused ? "Resume Millionea sales?" : "Pause Millionea sales?"} confirmLabel={paused ? "Resume" : "Pause"}
        body={paused ? "Players can buy again at once." : "No ticket can be bought until sales resume. Tickets already bought are safe; settlements, refunds and cancels go on."}
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
      <Button size="xs" variant="claret" disabled={pending} onClick={() => setOpen(true)}>Void {code}</Button>
      {error && <span role="alert" className="text-body-sm text-danger-fg">{error}</span>}
      {note && <span role="status" className="text-body-sm text-success">{note}</span>}
      <ConfirmModal open={open} onClose={() => setOpen(false)} loading={pending} tone="claret" tier="hard" typedWord="VOID"
        title={`Void ${code} whole?`} confirmLabel="Void and refund"
        body="Voided mains outnumber the usable reserves on the sealed record (MR-18). Every live ticket is refunded in full; the jackpot carries on untouched."
        onConfirm={() => run(() => voidMaswaliWeekAction(fd({ weekId })), () => setOpen(false))} />
    </span>
  );
}

export function HoldShareControl({ ticketId, serial }: { ticketId: string; serial: string }) {
  const mayAct = useMayAct();
  const { pending, error, note, run } = useAct();
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);
  if (!mayAct) return <ActReadOnly />;
  return (
    <span className="inline-flex flex-col gap-1">
      <Button size="xs" variant="ghost" disabled={pending} onClick={() => setOpen(true)}>Hold…</Button>
      {error && <span role="alert" className="text-body-sm text-danger-fg">{error}</span>}
      {note && <span role="status" className="text-body-sm text-success">{note}</span>}
      <ConfirmModal open={open} onClose={() => setOpen(false)} loading={pending} tone="warning" tier="hard" typedWord="HOLD"
        title={`Hold the share on ${serial}?`} confirmLabel="Hold it"
        body={<Field label="Why (a reversed deposit funded it, a disqualification found later)"><Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>}
        onConfirm={() => run(() => holdMaswaliShareAction(fd({ ticketId, reason })), () => setOpen(false))} />
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
  if (!mayAct) return <ActReadOnly />;
  return (
    <span className="inline-flex flex-col gap-1.5 items-start">
      <span className="inline-flex gap-2">
        {canRelease ? <Button size="xs" variant="ghost" disabled={pending} onClick={() => setMode("release")}>Release…</Button> : <ControlLocked what="Release" need={releaseNeed} />}
        {canForfeit ? <Button size="xs" variant="claret" disabled={pending} onClick={() => setMode("forfeit")}>Forfeit…</Button> : <ControlLocked what="Forfeit" need={forfeitNeed} />}
      </span>
      {error && <span role="alert" className="text-body-sm text-danger-fg">{error}</span>}
      {note && <span role="status" className="text-body-sm text-success">{note}</span>}
      <ConfirmModal open={mode !== null} onClose={() => setMode(null)} loading={pending} tone={mode === "forfeit" ? "claret" : "brand"} tier="hard"
        typedWord={mode === "forfeit" ? FORFEIT_WORD : "RELEASE"}
        title={mode === "forfeit" ? `Forfeit the share on ${serial}?` : `Release the share on ${serial}?`} confirmLabel={mode === "forfeit" ? "Forfeit to the jackpot" : "Release it"}
        body={
          <div className="space-y-2 text-left">
            <p>{mode === "forfeit" ? "The whole share leaves the wallet and goes back to the jackpot, for the next winning week — never to the house (OD-07)." : "The player keeps the share; the wallet's hold lifts once no other share is held."}</p>
            <Field label="The decision"><Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} /></Field>
          </div>
        }
        onConfirm={() => run(() => (mode === "forfeit"
          ? forfeitMaswaliShareAction(fd({ ticketId, typed: FORFEIT_WORD, reason: text }))
          : releaseMaswaliShareAction(fd({ ticketId, note: text }))), () => { setMode(null); setText(""); })} />
    </span>
  );
}
