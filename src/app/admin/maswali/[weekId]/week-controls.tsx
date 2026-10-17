"use client";

/**
 * The week page's controls (MASWALI-BUILD S4): attest and open a draft, move the close, and the SEAL CONSOLE.
 *
 * ⛔ Each control is shown only to a role the action will accept (the page asks `canUseControl` with the action's own
 *    id); a role that cannot act sees the control locked, with who can — never a button that bounces.
 * ⭐ A seal is a typed confirmation in the kit dialog (S4 item 6): `SEAL` for YES/NO results, `VOID` for a void. A void
 *    is its own act with its ground from the closed list (MR-15), never mixed into a bulk seal.
 * ⛔ No ticket data reaches this component (MR-14, MB-34): the rows carry the question, its source and its seal only.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DateSelect } from "@/components/ui/date-select";
import { TimeSelect } from "@/components/ui/time-select";
import { ConfirmModal } from "@/components/ui/modal";
import { ScrollX } from "@/components/ui/scroll-x";
import { ControlLocked } from "@/components/admin/control-locked";
import { useMayAct, ActReadOnly } from "@/components/admin/act-gate";
import { isMaswaliVoidReason, MASWALI_VOID_REASON_LABEL } from "@/lib/maswali-void-reason";
import {
  attestMaswaliParityAction, confirmMaswaliSealAction, correctMaswaliSealAction, moveMaswaliCloseAction, openMaswaliWeekAction,
  sealMaswaliQuestionsAction, voidMaswaliQuestionAction,
} from "../actions";

const fd = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return f; };

function useAct() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) => {
    setError(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) { setError(r.error ?? "That did not go through."); return; }
      after?.();
      router.refresh();
    });
  };
  return { pending, error, run, setError };
}

// ── Attest and open ─────────────────────────────────────────────────────────────────────────────────

export function AttestOpenControls({ weekId, attestedBy, canAttest, canOpen, openReady, attestNeed, openNeed }: {
  weekId: string; attestedBy: string | null; canAttest: boolean; canOpen: boolean; openReady: boolean; attestNeed: string; openNeed: string;
}) {
  const mayAct = useMayAct();
  const { pending, error, run } = useAct();
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {attestedBy ? <span className="text-body-sm text-success">The three languages are attested.</span>
        : canAttest ? (mayAct ? <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => attestMaswaliParityAction(fd({ weekId })))}>I read all three languages: they agree</Button> : <ActReadOnly />)
        : <ControlLocked what="Attest the languages" need={attestNeed} />}
      {canOpen ? (mayAct ? <Button size="sm" disabled={pending || !openReady} onClick={() => setConfirm(true)}>Open the week</Button> : <ActReadOnly />)
        : <ControlLocked what="Open the week" need={openNeed} />}
      {error && <p role="alert" className="text-body-sm text-danger-fg w-full">{error}</p>}
      <ConfirmModal open={confirm} onClose={() => setConfirm(false)} loading={pending} tone="brand"
        title="Open the week for sale?" confirmLabel="Open the week"
        body="The rules, the fifteen questions and their sources freeze now and cannot change afterwards (MR-13). Players can buy as soon as Millionea is visible to them."
        onConfirm={() => run(() => openMaswaliWeekAction(fd({ weekId })), () => setConfirm(false))} />
    </div>
  );
}

// ── Move the close ──────────────────────────────────────────────────────────────────────────────────

export function MoveCloseForm({ weekId, currentEat }: { weekId: string; currentEat: string }) {
  const mayAct = useMayAct();
  const { pending, error, run } = useAct();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  return (
    <div className="space-y-3 max-w-form">
      <p className="text-body-sm text-text-secondary">Now closes {currentEat} (EAT). Earlier, never inside the next notice period; later, never past the first event less its buffer (MB-28).</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="New close date (EAT)"><DateSelect value={date} onChange={setDate} size="sm" /></Field>
        <Field label="New close time (EAT)"><TimeSelect value={time} onChange={setTime} size="sm" aria-label="New close time" /></Field>
      </div>
      {mayAct ? <Button size="sm" disabled={pending || !date || !time} onClick={() => run(() => moveMaswaliCloseAction(fd({ weekId, closeAt: `${date}T${time}` })))}>Move the close</Button> : <ActReadOnly />}
      {error && <p role="alert" className="text-body-sm text-danger-fg">{error}</p>}
    </div>
  );
}

// ── The seal console ────────────────────────────────────────────────────────────────────────────────

export type SealRowView = {
  slot: number; label: string; textEn: string; criterionEn: string; sourceUrl: string; eventEat: string; voidDeadlineEat: string;
  outcome: string | null; voidReason: string | null; sealedBy: string | null; sealedAt: string | null;
  awaitingSecond: boolean; proposedVoid: boolean; aiSuggestion: string | null;
};
type Can = { seal: boolean; void: boolean; correct: boolean; confirm: boolean };

export function SealConsole({ weekId, rows, voidReasons, windowOpen, can, need }: {
  weekId: string; rows: SealRowView[]; voidReasons: string[]; windowOpen: boolean; can: Can; need: Record<keyof Can, string>;
}) {
  const mayAct = useMayAct();
  const { pending, error, run, setError } = useAct();
  const [picks, setPicks] = useState<Record<number, { outcome: string; evidence: string }>>({});
  const [sealOpen, setSealOpen] = useState(false);
  const [voidRow, setVoidRow] = useState<SealRowView | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [voidEvidence, setVoidEvidence] = useState("");
  const [correctRow, setCorrectRow] = useState<SealRowView | null>(null);
  const [correction, setCorrection] = useState({ outcome: "YES", evidence: "", voidReason: "" });
  const chosen = Object.entries(picks).filter(([, p]) => p.outcome === "YES" || p.outcome === "NO").map(([slot, p]) => ({ slot: Number(slot), ...p }));
  const evidenceMissing = chosen.some((c) => c.evidence.trim().length < 10);

  return (
    <div>
      <ScrollX label="Millionea results to seal">
        <table className="admin-tbl min-w-[1040px]">
          <thead>
            <tr><th className="text-left">Slot</th><th className="text-left">Question and how it resolves</th><th className="text-left">Event (EAT)</th><th className="text-left">Result</th><th className="text-left">Evidence</th><th className="text-left">Act</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const p = picks[r.slot] ?? { outcome: "", evidence: "" };
              return (
                <tr key={r.slot}>
                  <td className="text-left tabular align-top">{r.label}{r.proposedVoid && <span className="block text-body-sm text-warning">void proposed</span>}</td>
                  <td className="text-left align-top max-w-[360px]">
                    <span className="block">{r.textEn}</span>
                    <span className="block text-body-sm text-text-tertiary">{r.criterionEn}</span>
                    <a href={r.sourceUrl} target="_blank" rel="noreferrer" className="link text-body-sm">Source</a>
                    {r.aiSuggestion && <span className="block text-body-sm text-text-tertiary">AI suggests (never seals): {r.aiSuggestion}</span>}
                  </td>
                  <td className="text-left tabular align-top">{r.eventEat}<span className="block text-body-sm text-text-tertiary">void deadline {r.voidDeadlineEat}</span></td>
                  <td className="text-left align-top">
                    {r.outcome
                      ? <span>{r.outcome}{r.voidReason ? ` · ${isMaswaliVoidReason(r.voidReason) ? MASWALI_VOID_REASON_LABEL[r.voidReason] : r.voidReason}` : ""}<span className="block text-body-sm text-text-tertiary">{r.sealedAt}{r.awaitingSecond ? " · awaits a second officer" : ""}</span></span>
                      : can.seal && mayAct
                        ? <Select size="xs" value={p.outcome} onChange={(v) => setPicks((s) => ({ ...s, [r.slot]: { ...p, outcome: v } }))} ariaLabel={`${r.label} result`}
                            options={[{ value: "", label: "Not yet" }, { value: "YES", label: "YES" }, { value: "NO", label: "NO" }]} />
                        : "—"}
                  </td>
                  <td className="text-left align-top min-w-[220px]">
                    {!r.outcome && can.seal && mayAct
                      ? <Input size="sm" value={p.evidence} placeholder="What the source says" onChange={(e) => setPicks((s) => ({ ...s, [r.slot]: { ...p, evidence: e.target.value } }))} />
                      : null}
                  </td>
                  <td className="text-left align-top">
                    <div className="flex flex-col gap-1.5 items-start">
                      {!r.outcome && (can.void ? (mayAct ? <Button size="xs" variant="ghost" onClick={() => { setVoidRow(r); setVoidReason(""); setVoidEvidence(""); }}>Void…</Button> : <ActReadOnly />) : <ControlLocked what="Void" need={need.void} />)}
                      {r.outcome && windowOpen && (can.correct ? (mayAct ? <Button size="xs" variant="ghost" onClick={() => { setCorrectRow(r); setCorrection({ outcome: r.outcome === "NO" ? "YES" : "NO", evidence: "", voidReason: "" }); }}>Correct…</Button> : <ActReadOnly />) : <ControlLocked what="Correct" need={need.correct} />)}
                      {r.awaitingSecond && (can.confirm ? (mayAct ? <Button size="xs" variant="ghost" disabled={pending} onClick={() => run(() => confirmMaswaliSealAction(fd({ weekId, slot: String(r.slot) })))}>Confirm as second officer</Button> : <ActReadOnly />) : <ControlLocked what="Confirm" need={need.confirm} />)}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ScrollX>
      <div className="p-4 flex items-center gap-3 flex-wrap border-t border-border-subtle">
        {can.seal ? (mayAct
          ? <Button size="sm" disabled={pending || chosen.length === 0 || evidenceMissing} onClick={() => { setError(null); setSealOpen(true); }}>Seal {chosen.length || ""} result{chosen.length === 1 ? "" : "s"}</Button>
          : <ActReadOnly />) : <ControlLocked what="Seal results" need={need.seal} />}
        {evidenceMissing && <span className="text-body-sm text-warning">Each seal records its evidence (at least 10 characters).</span>}
        {error && <p role="alert" className="text-body-sm text-danger-fg w-full">{error}</p>}
      </div>

      <ConfirmModal open={sealOpen} onClose={() => setSealOpen(false)} loading={pending} tone="brand" tier="hard" typedWord="SEAL"
        title={`Seal ${chosen.length} result${chosen.length === 1 ? "" : "s"}?`} confirmLabel="Seal"
        body={`${chosen.map((c) => `${rows.find((r) => r.slot === c.slot)?.label} ${c.outcome}`).join(" · ")}. A seal is final once its objection window closes; until then only its own correction changes it.`}
        onConfirm={() => run(() => sealMaswaliQuestionsAction(fd({ weekId, seals: JSON.stringify(chosen) })), () => { setSealOpen(false); setPicks({}); })} />

      <ConfirmModal open={!!voidRow} onClose={() => setVoidRow(null)} loading={pending} tone="claret" tier="hard" typedWord="VOID"
        title={`Void ${voidRow?.label ?? ""}?`} confirmLabel="Void the question"
        body={
          <div className="space-y-3 text-left">
            <p>A voided main is replaced by the next usable reserve; a voided reserve is skipped (MR-17).</p>
            <Field label="Ground"><Select size="sm" value={voidReason} onChange={setVoidReason} ariaLabel="Void ground" options={[{ value: "", label: "Choose the ground" }, ...voidReasons.map((v) => ({ value: v, label: isMaswaliVoidReason(v) ? MASWALI_VOID_REASON_LABEL[v] : v }))]} /></Field>
            <Field label="Evidence"><Input size="sm" value={voidEvidence} onChange={(e) => setVoidEvidence(e.target.value)} placeholder="What happened, as the source records it" /></Field>
          </div>
        }
        onConfirm={() => voidRow && run(() => voidMaswaliQuestionAction(fd({ weekId, slot: String(voidRow.slot), voidReason, evidence: voidEvidence })), () => setVoidRow(null))} />

      <ConfirmModal open={!!correctRow} onClose={() => setCorrectRow(null)} loading={pending} tone="warning" tier="hard" typedWord="CORRECT"
        title={`Correct ${correctRow?.label ?? ""}?`} confirmLabel="Record the correction"
        body={
          <div className="space-y-3 text-left">
            <p>Only the officer who sealed it may correct it, and only inside the objection window; the window starts again (OD-09).</p>
            <Field label="Correct result"><Select size="sm" value={correction.outcome} onChange={(v) => setCorrection((c) => ({ ...c, outcome: v }))} ariaLabel="Correct result" options={[{ value: "YES", label: "YES" }, { value: "NO", label: "NO" }, { value: "VOID", label: "VOID" }]} /></Field>
            {correction.outcome === "VOID" && <Field label="Ground"><Select size="sm" value={correction.voidReason} onChange={(v) => setCorrection((c) => ({ ...c, voidReason: v }))} ariaLabel="Void ground" options={[{ value: "", label: "Choose the ground" }, ...voidReasons.map((v) => ({ value: v, label: isMaswaliVoidReason(v) ? MASWALI_VOID_REASON_LABEL[v] : v }))]} /></Field>}
            <Field label="Evidence"><Input size="sm" value={correction.evidence} onChange={(e) => setCorrection((c) => ({ ...c, evidence: e.target.value }))} /></Field>
          </div>
        }
        onConfirm={() => correctRow && run(() => correctMaswaliSealAction(fd({ weekId, slot: String(correctRow.slot), outcome: correction.outcome, evidence: correction.evidence, voidReason: correction.voidReason })), () => setCorrectRow(null))} />
    </div>
  );
}
