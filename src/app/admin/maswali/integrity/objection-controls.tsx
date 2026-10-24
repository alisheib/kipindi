"use client";

/**
 * Compliance's ruling on a Millionea objection (MASWALI-BUILD S7-OB; MASWALI-PLAN §3 MR-16, MB-23) — one question of one
 * week, on the integrity page.
 *
 * ⭐ A ruling is a typed confirmation in the kit dialog (S4 item 6): the word is the ruling's own — REJECT, REVERSE, VOID,
 *    REINSTATE — and the dialog says what it does to the week before the officer types it. The note is required and goes
 *    to the record (and to the player).
 * ⭐ The ruling carries the seal the officer reviewed (its result and its version): a result that changed since the page
 *    was drawn is refused by the service, never ruled blind (the same check a correction makes).
 * ⛔ Only a role the action accepts sees the buttons (the page asks `canUseControl`); an officer the service would refuse
 *    on this question — the objector, an officer holding a ticket in the week, and while the Owner's second-officer checks
 *    are ON (FEE-TAX R1) the one who sealed it or confirmed its seal and the one whose upheld ruling set its present result
 *    — sees why, and that the Owner is the fallback, instead of a button that bounces.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmModal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { UnsavedChangesGuard } from "@/components/ui/unsaved-changes";
import { useMayAct, ActReadOnly } from "@/components/admin/act-gate";
import { I } from "@/components/ui/glyphs";
import { isMaswaliVoidReason, MASWALI_VOID_REASONS, MASWALI_VOID_REASON_LABEL } from "@/lib/maswali-void-reason";
import { ruleMaswaliObjectionAction } from "./actions";
import { outcomeLabel } from "./objection-words";
import { raiseAuditWarning } from "../audit-warning";

/** The ruling's note: the service's own bounds (`DETAIL_MIN`, `DETAIL_MAX`), restated for the form. */
export const RULING_NOTE_MIN = 10;
export const RULING_NOTE_MAX = 1000;

type Ruling = "REJECT" | "REVERSE" | "VOID" | "REINSTATE";
const fd = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return f; };

/** What each ruling does to the week, in the words the dialog shows before the typed word arms it. */
function effectOf(ruling: Ruling, q: { label: string; outcome: string }, restartSpent: boolean): string {
  const window = restartSpent
    ? "This week's objection window has already restarted once, so it does not restart again."
    : "If that changes the graded set, the objection window restarts once, from now, and the week settles only after it ends.";
  switch (ruling) {
    case "REJECT": return `${q.label} keeps its result (${outcomeLabel(q.outcome)}). The week settles once its other objections are ruled and its objection window has ended.`;
    case "REVERSE": return `${q.label}'s result changes from ${outcomeLabel(q.outcome)} to ${outcomeLabel(q.outcome === "YES" ? "NO" : "YES")} and the week is graded again. ${window}`;
    case "VOID": return `${q.label} becomes void on the ground you choose; the first usable reserve stands in for it and the week is graded again. ${window}`;
    case "REINSTATE": return `${q.label} comes back with the result you choose; a reserve that stood in for it leaves the graded set. ${window}`;
  }
}
const TITLE: Record<Ruling, string> = { REJECT: "Reject the objection", REVERSE: "Reverse the result", VOID: "Void the question", REINSTATE: "Reinstate the question" };
const CONFIRM: Record<Ruling, string> = { REJECT: "Reject · the result stands", REVERSE: "Reverse the result", VOID: "Void the question", REINSTATE: "Reinstate it" };

export function MillioneaRulingControl({ objectionId, weekCode, slotLabel, outcome, sealedAtIso, restartSpent, blocked }: {
  objectionId: string; weekCode: string; slotLabel: string; outcome: "YES" | "NO" | "VOID"; sealedAtIso: string; restartSpent: boolean;
  /** Why the service would refuse THIS officer on this question (the seal's officers, the objector, a ticket holder). */
  blocked: string | null;
}) {
  const mayAct = useMayAct();
  const router = useRouter();
  const { toast } = useToast();
  const [pending, start] = useTransition();
  const [ruling, setRuling] = useState<Ruling | null>(null);
  const [note, setNote] = useState("");
  const [voidReason, setVoidReason] = useState<string>("criterion_objection");
  const [reinstateTo, setReinstateTo] = useState<string>("");
  const [tried, setTried] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!mayAct) return <ActReadOnly />;
  // The service's refusal said before any button, with the lock every locked control wears (`ControlLocked`).
  if (blocked) return <p className="flex items-start gap-1.5 text-body-sm text-text-tertiary"><I.lock s={12} aria-hidden className="mt-[4px] shrink-0" /><span>{blocked}</span></p>;

  const offered: Ruling[] = outcome === "VOID" ? ["REJECT", "REINSTATE"] : ["REJECT", "REVERSE", "VOID"];
  const noteOk = note.trim().length >= RULING_NOTE_MIN;
  const reinstateOk = ruling !== "REINSTATE" || reinstateTo === "YES" || reinstateTo === "NO";
  const voidOk = ruling !== "VOID" || isMaswaliVoidReason(voidReason);
  const close = () => { if (!pending) { setRuling(null); setTried(false); } };
  const submit = () => {
    setTried(true);
    if (!ruling || !noteOk || !reinstateOk || !voidOk) return;
    setError(null);
    start(async () => {
      const r = await ruleMaswaliObjectionAction(fd({
        objectionId, ruling, note, typed: ruling, expectedOutcome: outcome, expectedSealedAt: sealedAtIso,
        ...(ruling === "VOID" ? { voidReason } : {}), ...(ruling === "REINSTATE" ? { outcome: reinstateTo } : {}),
      }));
      if (!r.ok) { setError(r.error); return; }
      raiseAuditWarning("integrity:objections", r.auditWarning ?? null);
      // The decided case replaces this control when the page refreshes, so the outcome is said where it survives that.
      toast({ title: r.note ?? "Ruling recorded.", variant: "success" });
      setRuling(null); setNote(""); setTried(false);
      router.refresh();
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {offered.map((x) => (
          <Button key={x} size="sm" variant={x === "REJECT" ? "ghost" : "claret"} disabled={pending} onClick={() => { setError(null); setRuling(x); }}>
            {x === "REJECT" ? "Reject…" : x === "REVERSE" ? "Reverse…" : x === "VOID" ? "Void…" : "Reinstate…"}
          </Button>
        ))}
      </div>
      {ruling === null && error && <p role="alert" className="text-body-sm text-danger-fg">{error}</p>}
      <UnsavedChangesGuard dirty={note.trim() !== ""} body={`A ruling note on ${weekCode} ${slotLabel} has been typed but not recorded. Leaving now discards it.`} />
      <ConfirmModal open={ruling !== null} onClose={close} loading={pending} tone={ruling === "REJECT" ? "brand" : "claret"} tier="hard" typedWord={ruling ?? "REJECT"}
        eyebrow={`${weekCode} · ${slotLabel}`} title={ruling ? TITLE[ruling] : ""} confirmLabel={ruling ? CONFIRM[ruling] : ""} maxWidth={480}
        body={ruling && (
          <div className="space-y-3 text-left">
            <p>{effectOf(ruling, { label: slotLabel, outcome }, restartSpent)}</p>
            {ruling === "VOID" && (
              <Field label="Ground" required error={tried && !voidOk ? "Choose a ground from the list." : undefined}>
                <Select size="md" value={voidReason} onChange={setVoidReason} ariaLabel="Void ground"
                  options={MASWALI_VOID_REASONS.map((v) => ({ value: v, label: MASWALI_VOID_REASON_LABEL[v] }))} />
              </Field>
            )}
            {ruling === "REINSTATE" && (
              <Field label="Its result" required error={tried && !reinstateOk ? "Choose the result the source published." : undefined}>
                <Select size="md" value={reinstateTo} onChange={setReinstateTo} ariaLabel="Reinstated result"
                  options={[{ value: "", label: "Choose the result" }, { value: "YES", label: "YES" }, { value: "NO", label: "NO" }]} />
              </Field>
            )}
            <Field label="Reason for the record" required hint={`${RULING_NOTE_MIN}–${RULING_NOTE_MAX} characters. Written to the audit record and shown to the player.`}
              error={tried && !noteOk ? `Write what you checked and what it showed (at least ${RULING_NOTE_MIN} characters).` : undefined}>
              <Textarea rows={3} maxLength={RULING_NOTE_MAX} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
            {error && <p role="alert" className="text-body-sm text-danger-fg">{error}</p>}
          </div>
        )}
        onConfirm={submit} />
    </div>
  );
}
