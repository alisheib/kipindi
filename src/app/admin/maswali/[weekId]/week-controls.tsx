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
import { UnsavedChangesGuard } from "@/components/ui/unsaved-changes";
import { ScrollX } from "@/components/ui/scroll-x";
import { ControlLocked } from "@/components/admin/control-locked";
import { useMayAct, ActReadOnly } from "@/components/admin/act-gate";
import { isMaswaliVoidReason, MASWALI_VOID_REASON_LABEL } from "@/lib/maswali-void-reason";
import { withoutSealedPicks } from "@/lib/maswali-seal-batch";
import {
  attestMaswaliParityAction, confirmMaswaliSealAction, correctMaswaliSealAction, moveMaswaliCloseAction, openMaswaliWeekAction,
  sealMaswaliQuestionsAction, voidMaswaliQuestionAction,
} from "../actions";

const fd = (o: Record<string, string>) => { const f = new FormData(); for (const [k, v] of Object.entries(o)) f.set(k, v); return f; };

function useAct() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; error?: string; auditWarning?: string | null }>, after?: () => void, onWarning?: (warning: string | null) => void) => {
    setError(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) { setError(r.error ?? "That did not go through."); return; }
      onWarning?.(r.auditWarning ?? null);
      after?.();
      router.refresh();
    });
  };
  return { pending, error, run, setError, start };
}

// ── Attest and open ─────────────────────────────────────────────────────────────────────────────────

export function AttestOpenControls({ weekId, weekCode, attestedBy, canAttest, canOpen, openReady, attestNeed, openNeed }: {
  weekId: string; weekCode: string; attestedBy: string | null; canAttest: boolean; canOpen: boolean; openReady: boolean; attestNeed: string; openNeed: string;
}) {
  const mayAct = useMayAct();
  const { pending, error, run, setError } = useAct();
  const [confirm, setConfirm] = useState(false);
  const [attestConfirm, setAttestConfirm] = useState(false);
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {attestedBy ? <span className="text-body-sm text-success">The three languages are attested.</span>
        : canAttest ? (mayAct ? <Button size="sm" variant="ghost" disabled={pending} onClick={() => { setError(null); setAttestConfirm(true); }}>I read all three languages: they agree</Button> : <ActReadOnly />)
        : <ControlLocked what="Attest the languages" need={attestNeed} />}
      {canOpen ? (mayAct ? <Button size="sm" disabled={pending || !openReady} onClick={() => setConfirm(true)}>Open the week</Button> : <ActReadOnly />)
        : <ControlLocked what="Open the week" need={openNeed} />}
      {!attestConfirm && error && <p role="alert" className="text-body-sm text-danger-fg w-full">{error}</p>}
      <ConfirmModal open={attestConfirm} onClose={() => setAttestConfirm(false)} loading={pending} tone="brand" tier="hard" typedWord="ATTEST"
        title={`Attest ${weekCode}'s three languages?`} confirmLabel="Record the attestation"
        body={<div className="space-y-2">
          <p>Confirm that you personally read {weekCode}&apos;s English, Swahili and Chinese questions and that their meanings agree. This records your signoff; editing a question clears it.</p>
          {error && <p role="alert" className="text-body-sm text-danger-fg">{error}</p>}
        </div>}
        onConfirm={() => run(() => attestMaswaliParityAction(fd({ weekId })), () => setAttestConfirm(false))} />
      <ConfirmModal open={confirm} onClose={() => setConfirm(false)} loading={pending} tone="brand"
        title="Open the week for sale?" confirmLabel="Open the week"
        body="The rules, the fifteen questions and their sources freeze now and cannot change afterwards (MR-13). Players can buy as soon as Millionea is visible to them."
        onConfirm={() => run(() => openMaswaliWeekAction(fd({ weekId })), () => setConfirm(false))} />
    </div>
  );
}

// ── Move the close ──────────────────────────────────────────────────────────────────────────────────

export function MoveCloseForm({ weekId, weekCode, currentEat }: { weekId: string; weekCode: string; currentEat: string }) {
  const mayAct = useMayAct();
  const { pending, error, run, setError } = useAct();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [review, setReview] = useState<{ fromEat: string; toEat: string; closeAt: string } | null>(null);
  return (
    <div className="space-y-3 max-w-form">
      <p className="text-body-sm text-text-secondary">Now closes {currentEat} (EAT). Earlier, never inside the next notice period; later, never past the first event less its buffer (MB-28).</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="New close date (EAT)"><DateSelect value={date} onChange={setDate} size="md" /></Field>
        <Field label="New close time (EAT)"><TimeSelect value={time} onChange={setTime} size="md" aria-label="New close time" /></Field>
      </div>
      {mayAct ? <Button size="sm" disabled={pending || !date || !time} onClick={() => { setError(null); setReview({ fromEat: currentEat, toEat: `${date} ${time}`, closeAt: `${date}T${time}` }); }}>Move the close</Button> : <ActReadOnly />}
      {!review && error && <p role="alert" className="text-body-sm text-danger-fg">{error}</p>}
      <UnsavedChangesGuard dirty={date !== "" || time !== ""} body="A new sales close has been chosen but not moved. Leaving now discards it." />
      <ConfirmModal open={review !== null} onClose={() => setReview(null)} loading={pending} tone="warning" tier="hard" typedWord="MOVE CLOSE"
        title={`Move ${weekCode}'s sales close?`} confirmLabel="Move the close"
        body={<div className="space-y-2">
          <p>Current close: <strong>{review?.fromEat} (EAT)</strong></p>
          <p>New close: <strong>{review?.toEat} (EAT)</strong></p>
          <p>The service checks the notice period, free-cancel window and first event before accepting this move.</p>
          {error && <p role="alert" className="text-body-sm text-danger-fg">{error}</p>}
        </div>}
        onConfirm={() => {
          if (!review) return;
          run(() => moveMaswaliCloseAction(fd({ weekId, closeAt: review.closeAt })), () => { setReview(null); setDate(""); setTime(""); });
        }} />
    </div>
  );
}

// ── The seal console ────────────────────────────────────────────────────────────────────────────────

export type SealRowView = {
  slot: number; label: string; textEn: string; criterionEn: string; sourceUrl: string; eventEat: string; voidDeadlineEat: string;
  outcome: string | null; voidReason: string | null; sealedBy: string | null; sealedAt: string | null; sealedAtIso: string | null;
  awaitingSecond: boolean; proposedVoid: boolean; aiSuggestion: string | null;
};
type Can = { seal: boolean; void: boolean; correct: boolean; confirm: boolean };

export function SealConsole({ weekId, weekCode, rows, voidReasons, windowOpen, can, need }: {
  weekId: string; weekCode: string; rows: SealRowView[]; voidReasons: string[]; windowOpen: boolean; can: Can; need: Record<keyof Can, string>;
}) {
  const router = useRouter();
  const mayAct = useMayAct();
  const { pending, error, run, setError, start } = useAct();
  const [picks, setPicks] = useState<Record<number, { outcome: string; evidence: string }>>({});
  const [sealAuditWarning, setSealAuditWarning] = useState<string | null>(null);
  const [sealOpen, setSealOpen] = useState(false);
  const [confirmRow, setConfirmRow] = useState<SealRowView | null>(null);
  const [voidRow, setVoidRow] = useState<SealRowView | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [voidEvidence, setVoidEvidence] = useState("");
  const [voidTried, setVoidTried] = useState(false);
  const [correctRow, setCorrectRow] = useState<SealRowView | null>(null);
  const [correction, setCorrection] = useState({ outcome: "YES", evidence: "", voidReason: "" });
  const [correctTried, setCorrectTried] = useState(false);
  const chosen = Object.entries(picks)
    .filter(([slot, p]) => rows.some((row) => row.slot === Number(slot) && row.outcome === null) && (p.outcome === "YES" || p.outcome === "NO"))
    .map(([slot, p]) => ({ slot: Number(slot), ...p }));
  const evidenceMissing = chosen.some((c) => c.evidence.trim().length < 10);

  return (
    <div>
      <UnsavedChangesGuard dirty={Object.values(picks).some((p) => p.outcome !== "" || p.evidence.trim() !== "")}
        body="Results have been entered but not sealed. Leaving now discards them." />
      <ConfirmModal open={confirmRow !== null} onClose={() => setConfirmRow(null)} loading={pending} tone="brand" tier="hard" typedWord="CONFIRM"
        title={`Confirm ${weekCode} ${confirmRow?.label ?? ""} as second officer?`} confirmLabel="Confirm this seal"
        body={<div className="space-y-2">
          <p>Week: <strong>{weekCode}</strong> · Slot: <strong>{confirmRow?.label}</strong></p>
          <p>Question: {confirmRow?.textEn}</p>
          <p>Sealed result: <strong>{confirmRow?.outcome}</strong>{confirmRow?.voidReason ? ` · ${isMaswaliVoidReason(confirmRow.voidReason) ? MASWALI_VOID_REASON_LABEL[confirmRow.voidReason] : confirmRow.voidReason}` : ""}</p>
          <p>The service refuses this signoff if the seal changes before you confirm it.</p>
          {error && <p role="alert" className="text-body-sm text-danger-fg">{error}</p>}
        </div>}
        onConfirm={() => {
          const row = confirmRow;
          if (!row?.outcome || !row.sealedAtIso) return;
          const expectedOutcome = row.outcome;
          const expectedSealedAt = row.sealedAtIso;
          run(() => confirmMaswaliSealAction(fd({ weekId, slot: String(row.slot), expectedOutcome, expectedSealedAt })), () => setConfirmRow(null), setSealAuditWarning);
        }} />
      {/* The 1,040px result table stays horizontally scrollable. Paint containment keeps its offscreen columns out of
          the document's own scroll width on narrow screens; the named, focusable ScrollX still reaches every column. */}
      <ScrollX label="Millionea results to seal" style={{ contain: "paint" }}>
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
                    <a href={r.sourceUrl} target="_blank" rel="noreferrer" className="link inline-flex min-h-[44px] min-w-[44px] items-center text-body-sm">Source</a>
                    {r.aiSuggestion && <span className="block text-body-sm text-text-tertiary">AI suggests (never seals): {r.aiSuggestion}</span>}
                  </td>
                  <td className="text-left tabular align-top">{r.eventEat}<span className="block text-body-sm text-text-tertiary">void deadline {r.voidDeadlineEat}</span></td>
                  <td className="text-left align-top">
                    {r.outcome
                      ? <span>{r.outcome}{r.voidReason ? ` · ${isMaswaliVoidReason(r.voidReason) ? MASWALI_VOID_REASON_LABEL[r.voidReason] : r.voidReason}` : ""}<span className="block text-body-sm text-text-tertiary">{r.sealedAt}{r.awaitingSecond ? " · awaits a second officer" : ""}</span></span>
                      : can.seal && mayAct
                        ? <Select size="md" className="min-w-[100px]" value={p.outcome} onChange={(v) => setPicks((s) => ({ ...s, [r.slot]: { ...p, outcome: v } }))} ariaLabel={`${r.label} result`}
                            options={[{ value: "", label: "Not yet" }, { value: "YES", label: "YES" }, { value: "NO", label: "NO" }]} />
                        : "—"}
                  </td>
                  <td className="text-left align-top min-w-[220px]">
                    {!r.outcome && can.seal && mayAct
                      ? <Input size="md" value={p.evidence} aria-label={`${r.label} seal evidence`} placeholder="What the source says" onChange={(e) => setPicks((s) => ({ ...s, [r.slot]: { ...p, evidence: e.target.value } }))} />
                      : null}
                  </td>
                  <td className="text-left align-top">
                    <div className="flex flex-col gap-1.5 items-start">
                      {!r.outcome && (can.void ? (mayAct ? <Button size="sm" variant="ghost" onClick={() => { setVoidRow(r); setVoidReason(""); setVoidEvidence(""); setVoidTried(false); }}>Void…</Button> : <ActReadOnly />) : <ControlLocked what="Void" need={need.void} />)}
                      {r.outcome && windowOpen && (can.correct ? (mayAct ? <Button size="sm" variant="ghost" disabled={!r.sealedAtIso} onClick={() => { setError(null); setCorrectRow(r); setCorrection({ outcome: r.outcome === "NO" ? "YES" : "NO", evidence: "", voidReason: "" }); setCorrectTried(false); }}>Correct…</Button> : <ActReadOnly />) : <ControlLocked what="Correct" need={need.correct} />)}
                      {r.awaitingSecond && (can.confirm ? (mayAct ? <Button size="sm" variant="ghost" disabled={pending || !r.sealedAtIso} onClick={() => { setError(null); setConfirmRow(r); }}>Confirm as second officer</Button> : <ActReadOnly />) : <ControlLocked what="Confirm" need={need.confirm} />)}
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
        {sealAuditWarning && <p role="alert" className="text-body-sm text-warning w-full">{sealAuditWarning}</p>}
        {!confirmRow && error && <p role="alert" className="text-body-sm text-danger-fg w-full">{error}</p>}
      </div>

      <ConfirmModal open={sealOpen} onClose={() => setSealOpen(false)} loading={pending} tone="brand" tier="hard" typedWord="SEAL"
        title={`Seal ${chosen.length} result${chosen.length === 1 ? "" : "s"}?`} confirmLabel="Seal"
        body={`${chosen.map((c) => `${rows.find((r) => r.slot === c.slot)?.label} ${c.outcome}`).join(" · ")}. A seal is final once its objection window closes; until then only its own correction changes it.`}
        onConfirm={() => {
          setError(null);
          setSealAuditWarning(null);
          start(async () => {
            const result = await sealMaswaliQuestionsAction(fd({ weekId, seals: JSON.stringify(chosen) }));
            if (result.sealed.length) setPicks((current) => withoutSealedPicks(current, result.sealed));
            setSealOpen(false);
            setSealAuditWarning(result.auditWarning);
            if (!result.ok) {
              const applied = result.sealed.map((slot) => rows.find((row) => row.slot === slot)?.label ?? `slot ${slot}`);
              setError(applied.length ? `${applied.join(", ")} sealed. ${result.error} The sealed results will not be retried.` : result.error);
            }
            router.refresh();
          });
        }} />

      <ConfirmModal open={!!voidRow} onClose={() => { setVoidRow(null); setVoidTried(false); }} loading={pending} tone="claret" tier="hard" typedWord="VOID"
        title={`Void ${voidRow?.label ?? ""}?`} confirmLabel="Void the question"
        body={
          <div className="space-y-3 text-left">
            <p>A voided main is replaced by the next usable reserve; a voided reserve is skipped (MR-17).</p>
            <Field label="Ground" required error={voidTried && !isMaswaliVoidReason(voidReason) ? "Choose a ground from the list." : undefined}><Select size="md" value={voidReason} onChange={setVoidReason} ariaLabel="Void ground" options={[{ value: "", label: "Choose the ground" }, ...voidReasons.map((v) => ({ value: v, label: isMaswaliVoidReason(v) ? MASWALI_VOID_REASON_LABEL[v] : v }))]} /></Field>
            <Field label="Evidence" required error={voidTried && voidEvidence.trim().length < 10 ? "Write at least 10 characters of evidence." : undefined}><Input size="md" value={voidEvidence} onChange={(e) => setVoidEvidence(e.target.value)} placeholder="What happened, as the source records it" /></Field>
          </div>
        }
        onConfirm={() => {
          setVoidTried(true);
          if (!voidRow || !isMaswaliVoidReason(voidReason) || voidEvidence.trim().length < 10) return;
          run(() => voidMaswaliQuestionAction(fd({ weekId, slot: String(voidRow.slot), voidReason, evidence: voidEvidence })), () => setVoidRow(null), setSealAuditWarning);
        }} />

      <ConfirmModal open={!!correctRow} onClose={() => { setCorrectRow(null); setCorrectTried(false); }} loading={pending} tone="warning" tier="hard" typedWord="CORRECT"
        title={`Correct ${correctRow?.label ?? ""}?`} confirmLabel="Record the correction"
        body={
          <div className="space-y-3 text-left">
            <p>Only the officer who sealed it may correct it, and only inside the objection window; the window starts again (OD-09).</p>
            <Field label="Correct result"><Select size="md" value={correction.outcome} onChange={(v) => setCorrection((c) => ({ ...c, outcome: v }))} ariaLabel="Correct result" options={[{ value: "YES", label: "YES" }, { value: "NO", label: "NO" }, { value: "VOID", label: "VOID" }]} /></Field>
            {correction.outcome === "VOID" && <Field label="Ground" required error={correctTried && !isMaswaliVoidReason(correction.voidReason) ? "Choose a ground from the list." : undefined}><Select size="md" value={correction.voidReason} onChange={(v) => setCorrection((c) => ({ ...c, voidReason: v }))} ariaLabel="Void ground" options={[{ value: "", label: "Choose the ground" }, ...voidReasons.map((v) => ({ value: v, label: isMaswaliVoidReason(v) ? MASWALI_VOID_REASON_LABEL[v] : v }))]} /></Field>}
            <Field label="Evidence" required error={correctTried && correction.evidence.trim().length < 10 ? "Write at least 10 characters of evidence." : undefined}><Input size="md" value={correction.evidence} onChange={(e) => setCorrection((c) => ({ ...c, evidence: e.target.value }))} /></Field>
            {error && <p role="alert" className="text-body-sm text-danger-fg">{error}</p>}
          </div>
        }
        onConfirm={() => {
          setCorrectTried(true);
          if (!correctRow || correction.evidence.trim().length < 10 || (correction.outcome === "VOID" && !isMaswaliVoidReason(correction.voidReason))) return;
          const expectedOutcome = correctRow.outcome;
          const expectedSealedAt = correctRow.sealedAtIso;
          if (!expectedOutcome || !expectedSealedAt) { setError("Reload the week and review the sealed result before correcting it."); return; }
          run(() => correctMaswaliSealAction(fd({ weekId, slot: String(correctRow.slot), outcome: correction.outcome,
            evidence: correction.evidence, voidReason: correction.voidReason,
            expectedOutcome, expectedSealedAt })), () => setCorrectRow(null), setSealAuditWarning);
        }} />
    </div>
  );
}
