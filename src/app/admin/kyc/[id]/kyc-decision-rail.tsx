"use client";

/**
 * ADM3 — KYC decision rail. Auto-derived checklist rows (read-only, from server)
 * + officer-judgment rows the officer must clear before Approve arms. Approve /
 * reject-with-reason-code / escalate-to-AML all call the guarded workstation
 * actions. High-risk approvals go through the maker-checker: recommend (officer
 * A) → approve (officer B ≠ A).
 *
 * ⭐ FOUR STAGES SINCE 2026-10-10 (owner ruling — players verify with typed details, approved automatically
 * when the checks pass; agents keep photo KYC):
 *   · `review`      — a case WITH US (PENDING_REVIEW): routed typed details, an agent's photo case, or a
 *                     legacy photo case. Approve (or recommend, at high risk) on THIS case's attestation set.
 *   · `post_check`  — an automatic approval nobody has checked yet: the typed set + "Mark checked".
 *   · `approved`    — an approval an officer made or already checked: no checklist, only the asks below.
 *   · `with_player` — corrections asked (ADDITIONAL_INFO_REQUIRED): the player's move, but NOT a dead end for the
 *                     officer — reject (recoverable or final) and escalate to AML stay open; nothing approves or marks
 *                     it checked, and corrections are already asked. ⛔ Until 2026-10-10 this status drew no rail at all,
 *                     so a holder found to be under 18, sanctioned or a duplicate could not be refused (or escalated)
 *                     for as long as they chose not to answer — while an identity approved once kept withdrawal open.
 * In every other stage the officer may also ask the player to CORRECT their details. Every reject offers a freeze
 * of the wallet; on an automatic approval no officer has checked it is ticked and cannot be unticked (`freezeRequired`).
 * ⛔ "This stops no money" is said when the identity was EVER approved (`approvedOnce` — `approvedEver`, the withdrawal
 * gate's own question), never inferred from the stage: a photo upgrade or a corrected date of birth puts an identity
 * approved once back in `review` with withdrawals still open.
 *
 * ⛔ THE CHECKLIST IS THE SERVER'S. Each auto row is one `decideKyc` row (`kyc-auto-checks.ts`) — pass,
 * FLAG (a reason to look; it never disarms a button), ROUTE (why the case is in front of an officer) or
 * BLOCK (under 18, expired: nothing approves it). The server re-checks the blocks on every approval, so a
 * page that drifted cannot approve what the checks refuse.
 * ⛔ EVERY FORM POSTS `version` — the row the officer was shown. A case the player changed meanwhile is refused.
 */
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { useDeferredToast } from "@/components/ui/toast";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { BrandSpinner } from "@/components/brand";
import { AttestationRail } from "@/components/admin/attestation-rail";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { UnsavedChangesGuard, PendingChangesBar } from "@/components/ui/unsaved-changes";
import { CEREMONY } from "@/lib/admin-status-lexicon";
import { KYC_ATTESTATION_SETS, type KycAttestationMode } from "@/lib/kyc-attestations";
import { runAdminAction } from "@/lib/client/run-admin-action";
import { focusFirstInvalid } from "@/lib/client/focus-first-invalid";
import {
  approveKycWorkstationAction,
  rejectKycWorkstationAction,
  escalateKycToAmlAction,
  recommendKycApprovalAction,
  askForCorrectionsAction,
  markPostCheckedAction,
} from "./kyc-actions";
import { useMayAct, ActReadOnly } from "@/components/admin/act-gate";

type TriState = "pass" | "fail" | "pending";

/** One automatic check as the page derived it — `decideKyc`'s outcome, or `pending` when it has nothing to say yet. */
export type RailCheckOutcome = "pass" | "flag" | "route" | "block" | "pending";
export type RailCheck = { key: string; label: string; outcome: RailCheckOutcome; detail: string };

export type RailStage = "review" | "post_check" | "approved" | "with_player";

/* The service's floors (`CORRECTIONS_NOTE_MIN`, `OFFICER_FREEZE_REASON_MIN`) — repeated here only to arm the
   buttons; a server module cannot be imported into a client component, and the actions re-check both. */
const NOTE_MIN = 5;
const FREEZE_MIN = 5;

/**
 * ⭐ THE THREE FINAL CODES ARE CHOOSABLE HERE (2026-09-13), and until then none of them was.
 * This list offered only recoverable categories plus "suspected fraud" → OTHER, so an officer
 * looking at a sixteen-year-old's passport had no way to refuse the account AS UNDERAGE.
 * `final: true` must agree with `src/lib/kyc-refusal.ts` — the server decides by the code, not by this flag.
 * ⛔ "Document unreadable" left the list on 2026-10-10: a typed case has no image, and the service refuses
 * `BLURRY_DOC` for a new decision. The refusals already on file keep their words.
 */
const REJECT_OPTIONS = [
  { value: "mismatch", label: "Details mismatch", final: false },
  { value: "expired", label: "Document expired", final: false },
  { value: "suspected_fraud", label: "Suspected fraud", final: false },
  { value: "other", label: "Other (note required)", final: false },
  { value: "underage", label: "FINAL · Under 18", final: true },
  { value: "sanctioned", label: "FINAL · Sanctions / PEP concern", final: true },
  { value: "duplicate_identity", label: "FINAL · Identity used on another account", final: true },
];

/** The outcome word beside a check — officer English, upper-cased by the mono eyebrow. */
const OUTCOME_WORD: Record<RailCheckOutcome, string> = {
  pass: "",
  flag: "Flag",
  route: "To an officer",
  block: "Blocks approval",
  pending: "",
};

/* shrink-0 on every glyph (2026-09-14): in a flex row beside a long detail string the browser squeezed the
   15px icon to a 2px speck, so an officer could not read the verdict. */
function CheckIcon({ outcome }: { outcome: RailCheckOutcome }) {
  if (outcome === "pass") return <I.checkCircle s={15} className="shrink-0 text-success-fg" />;
  if (outcome === "block") return <I.x s={15} className="shrink-0 text-danger-fg" />;
  if (outcome === "flag") return <I.alertCircle s={15} className="shrink-0 text-warning-fg" />;
  if (outcome === "route") return <I.shieldAlert s={15} className="shrink-0 text-royal-300" />;
  return <span className="inline-block h-3 w-3 shrink-0 rounded-full border border-text-subtle" />;
}

function TriIcon({ state }: { state: TriState }) {
  if (state === "pass") return <I.checkCircle s={15} className="shrink-0 text-success-fg" />;
  if (state === "fail") return <I.x s={15} className="shrink-0 text-danger-fg" />;
  return <span className="inline-block h-3 w-3 shrink-0 rounded-full border border-text-subtle" />;
}

export function KycDecisionRail({
  userId,
  version,
  stage,
  mode,
  checks,
  checksReadable,
  makerCheckerRequired,
  hasRecommendation,
  isRecommender,
  recommenderName,
  approvedOnce,
  freezeRequired,
}: {
  userId: string;
  /** `kycRowVersion(kyc)` — posted by every form on this rail. */
  version: string;
  stage: RailStage;
  /** `approvedEver(kyc)` — this identity was approved at least once, so withdrawal stays open whatever the rail does. */
  approvedOnce: boolean;
  /** An automatic approval no officer has checked (`uncheckedAutomaticApproval`, `kyc-approval.ts` — in ANY status: approved,
   *  corrections asked, or back with an officer, review R5.1): a recoverable reject must freeze the wallet too — the
   *  service refuses one without it. */
  freezeRequired: boolean;
  /** Which attestation set this case takes (photo set on file → photo). A post-check is always typed. */
  mode: KycAttestationMode;
  checks: RailCheck[];
  /** False when the automatic checks' facts could not be read — nothing is armed on facts nobody can see. */
  checksReadable: boolean;
  makerCheckerRequired: boolean;
  hasRecommendation: boolean;
  isRecommender: boolean;
  recommenderName: string | null;
}) {
  // A1 — this control only ACTS, so a role holding VIEW without ACT is shown why rather
  // than being offered a button the server will refuse (and logged as a privilege
  // escalation for pressing it). See docs/ADMIN-CONSOLE-FINDINGS.md.
  const mayAct = useMayAct();

  // ⭐ THE SET FOLLOWS THE CASE (2026-10-10): the photo set's "selfie matches" would be an officer signing for an image
  // a typed case does not have, so a typed case — and every post-check — takes the typed set.
  const judgmentMode: KycAttestationMode = stage === "post_check" ? "typed" : mode;
  // Nothing is approved or marked checked in `approved` or `with_player`, so neither carries a judgment checklist.
  const judgmentChecks: readonly { key: string; label: string }[] = stage === "approved" || stage === "with_player" ? [] : KYC_ATTESTATION_SETS[judgmentMode];

  const [pending, startTransition] = useTransition();
  /* ⛔ ONE HOME for the resting checklist — the seed and the "has anything been judged?"
     comparison read the same builder, so a new check added to a set cannot make the
     rail open already claiming unsaved work. */
  const freshJudgments = () => Object.fromEntries(judgmentChecks.map((c) => [c.key, "pending"])) as Record<string, TriState>;
  const [judg, setJudg] = useState<Record<string, TriState>>(freshJudgments);
  const [panel, setPanel] = useState<"none" | "reject" | "corrections">("none");
  const [reasonCode, setReasonCode] = useState("");
  const [note, setNote] = useState("");
  const [alsoFreeze, setAlsoFreeze] = useState(false);
  const [freezeReason, setFreezeReason] = useState("");
  /* The open panel — the container focusFirstInvalid searches (see run() below). */
  const panelRef = useRef<HTMLDivElement>(null);
  const reviewDirty =
    Object.values(judg).some((v) => v !== "pending") || reasonCode !== "" || note.trim().length > 0 || alsoFreeze || freezeReason.trim().length > 0;
  const closePanel = () => {
    setPanel("none");
    setReasonCode("");
    setNote("");
    setAlsoFreeze(false);
    setFreezeReason("");
  };
  const discardReview = () => {
    setJudg(freshJudgments());
    closePanel();
  };
  const router = useRouter();
  // B-28 — success toasts ride the transition's falling edge (data visible when announced)
  const { toast, deferToast } = useDeferredToast(pending);

  // Rules of hooks: read the gate as a hook at the top, ACT on it below every other hook.
  // Revoking an ACT grant mid-session flips `mayAct` on the next router.refresh(); an early
  // return above these hooks would render fewer hooks than the last pass and crash the page.
  if (!mayAct) return <ActReadOnly />;

  const cycle = (k: string) => setJudg((p) => ({ ...p, [k]: p[k] === "pending" ? "pass" : p[k] === "pass" ? "fail" : "pending" }));
  const allJudged = judgmentChecks.every((c) => judg[c.key] === "pass");
  const anyBlock = checks.some((c) => c.outcome === "block");
  // A check with nothing to say yet (no identity details recorded) is not a pass — nothing is armed on it.
  const anyPending = checks.some((c) => c.outcome === "pending");
  const pickedFinal = REJECT_OPTIONS.find((o) => o.value === reasonCode)?.final === true;
  /* ⭐ THE FREEZE A REJECT MAY NOT LEAVE OUT (2026-10-10). An automatic approval stamped `approvedAt` with no officer,
     and `approvedAt` keeps withdrawal open for good — so a recoverable reject of one no officer has checked would pay out
     on the very identity it refuses unless the wallet is held. On that case the reject's box is ticked and stays ticked;
     the service refuses such a reject without it. ⛔ Not on "Ask for corrections" (not a refusal), and a FINAL code
     freezes the wallet by itself (its box is not drawn). The officer's own tick lives in `alsoFreeze`, untouched. */
  const freezeLocked = panel === "reject" && freezeRequired;
  const freezeOn = alsoFreeze || freezeLocked;
  const freezeOk = !freezeOn || freezeReason.trim().length >= FREEZE_MIN;
  /* ⛔ ONLY THIS SET'S KEYS TRAVEL. The judgments live in state across a refresh, and a case can change set while the
     page is open (photos arrive; a restart clears them) — a stale key from the other set would be refused by the
     server's strict parser as "unrecognised", so the payload is rebuilt from the set on screen. */
  const attested = () => JSON.stringify(Object.fromEntries(judgmentChecks.map((c) => [c.key, judg[c.key] ?? "pending"])));

  const run = (fn: (fd: FormData) => Promise<{ ok: boolean; error?: string; field?: string }>, okTitle: string, extra?: Record<string, string>, okVariant: "success" | "warning" = "success") => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("userId", userId);
      fd.set("version", version);
      for (const [k, v] of Object.entries(extra ?? {})) fd.set(k, v);
      const r = await runAdminAction(() => fn(fd));
      if (!r.ok) {
        toast({ title: "Blocked", description: r.error, variant: "danger" });
        /* ⭐ DG-S-05/06 — scoped to the open panel, the only part of this rail that owns addressable
           fields. It stays open on a refusal, so the control is on screen. */
        if (r.field) focusFirstInvalid(panelRef.current, [r.field]);
        return;
      }
      // Success outcomes defer to the refresh; warning outcomes stay immediate.
      (okVariant === "success" ? deferToast : toast)({ title: okTitle, variant: okVariant });
      if (fn !== recommendKycApprovalAction && fn !== escalateKycToAmlAction) discardReview();
      router.refresh();
    });
  };

  if (pending) {
    return (
      <div className="flex items-center justify-center gap-2.5 py-4">
        <BrandSpinner size={28} />
        <span className="font-mono text-caption uppercase tracking-[0.16em] text-text-muted">Recording decision…</span>
      </div>
    );
  }

  // Approve is armed only when every judgment passes, no check BLOCKS and the checks could be read; high-risk needs
  // the second officer. ⛔ A flag or a route never disarms it — they are why the officer is looking, not a verdict.
  const checksOk = allJudged && !anyBlock && !anyPending && checksReadable;
  const canApproveDirect = checksOk && !makerCheckerRequired;
  const canApproveAsChecker = checksOk && makerCheckerRequired && hasRecommendation && !isRecommender;
  const canRecommend = checksOk && makerCheckerRequired && !hasRecommendation;
  const freezeFields = { alsoFreeze: freezeOn ? "1" : "", freezeReason: freezeOn ? freezeReason.trim() : "" };

  /* "Also freeze the wallet" — offered on every ask and every rejection, because none of them stops money on its own:
     an identity approved once keeps withdrawal open (`approvedAt` is never cleared).
     ⛔ LOCKED TICKED (`freezeLocked`) through the kit's own Checkbox, which has no disabled state: controlled, with no
     handler, a click cannot untick it, and `required` tells a screen reader the box is not optional. The line under it
     says why, so the officer is not left pressing a box that does nothing. */
  const freezeBlock = (
    <div className="space-y-1.5 rounded-md border border-border bg-bg-inset px-2.5 py-2" data-freeze-required={freezeLocked ? "1" : undefined}>
      <Checkbox
        checked={freezeOn}
        onChange={freezeLocked ? undefined : (v) => setAlsoFreeze(v)}
        required={freezeLocked}
        label={<span className="text-body-sm text-text"><strong>Also freeze the wallet</strong> — stops deposits, bets and withdrawals until an officer lifts it.</span>}
      />
      {freezeLocked && (
        <p className="text-body-sm text-text-muted">An automatic approval no officer has checked keeps withdrawals open — rejecting it holds the wallet too.</p>
      )}
      {freezeOn && (
        <div data-field="freezeReason">
          <textarea value={freezeReason} onChange={(e) => setFreezeReason(e.target.value)} rows={2} maxLength={300} placeholder="Why the wallet is frozen (internal, audit-logged)…" className="w-full rounded-md border border-border bg-bg-overlay px-2.5 py-1.5 text-[12px] text-text admin-focus resize-y placeholder:text-text-subtle" />
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Checklist — ⛔ not drawn when it holds nothing (`approved`, `with_player`): a heading over an empty list reads as
          checks that went missing, and the unreadable-checks warning guards buttons those stages do not have. */}
      {(checks.length > 0 || judgmentChecks.length > 0) && (
      <div className="space-y-1.5">
        <p className="font-mono text-micro uppercase eyebrow text-text-subtle">Verification checklist · Orodha</p>
        {!checksReadable && (
          <p className="rounded-md border border-warning-border bg-warning-bg px-2 py-2 text-body-sm text-warning-fg" data-kyc-checks-unreadable="1">
            The automatic checks could not be read, so nothing below can be approved or marked checked. Reload before deciding.
          </p>
        )}
        {/* Top-aligned, the label on its own line and the detail UNDER it (2026-10-10), left-aligned with the label's text
            and as wide as the row. The detail sat in a right-aligned column beside the label (2026-09-14), and a long one —
            a voter's card's "no published format" flag, the NIDA number's source note — became a sliver fifteen lines deep
            at 1280 and worse at 390. The 2px offset lines the icon up with the label's first line. */}
        {checks.map((c) => (
          <div key={c.key} className="flex items-start gap-2.5 text-[12.5px]" data-kyc-check={c.key} data-kyc-check-outcome={c.outcome}>
            <span className="mt-[2px] flex shrink-0"><CheckIcon outcome={c.outcome} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-text">{c.label}</p>
              <p className="mt-0.5 break-words font-mono text-[10.5px] text-text-tertiary">
                {OUTCOME_WORD[c.outcome] && <span className={`uppercase tracking-[0.08em] ${c.outcome === "block" ? "text-danger-fg" : c.outcome === "flag" ? "text-warning-fg" : "text-royal-300"}`}>{OUTCOME_WORD[c.outcome]} · </span>}
                {c.detail}
              </p>
            </div>
          </div>
        ))}
        {judgmentChecks.length > 0 && <div className="my-1 border-t border-dashed border-border-subtle" />}
        {/* DG-A-08 — the checklist row is a CONTROL (it cycles the judgment), and at
            py-0.5 it rendered 22.75px against §A2's 40px floor. `min-h` rather than the
            kit `.btn`: this is a full-width row whose label is left-aligned and whose
            verdict is pushed right by `ml-auto`, and a `.btn` centres both. §K1 forbids a
            height utility ON a `.btn` — this is not one, so the floor is stated directly. */}
        {judgmentChecks.map((c) => (
          <button key={c.key} type="button" onClick={() => cycle(c.key)} className="flex min-h-[var(--tap-min)] w-full items-center gap-2.5 rounded-sm py-0.5 text-left text-[12.5px] hover:bg-bg-overlay/40">
            <TriIcon state={judg[c.key]} />
            <span className="text-text">{c.label}</span>
            <span className="ml-auto font-mono text-micro uppercase tracking-[0.12em] text-text-subtle">
              {judg[c.key] === "pending" ? "tap to verify" : judg[c.key]}
            </span>
          </button>
        ))}
      </div>
      )}

      {/* Maker-checker banner for high-risk */}
      {stage === "review" && makerCheckerRequired && (
        <AttestationRail tone="info" title={CEREMONY.twoOfficerRule}>
          {hasRecommendation
            ? isRecommender
              ? "You recommended this approval — a different officer must seal it."
              : `Recommended by ${recommenderName ?? "an officer"}. You may approve as the second officer.`
            : "High-risk score — one officer recommends, a second approves."}
        </AttestationRail>
      )}

      {/* Actions */}
      <div className="space-y-2">
        {stage === "review" && (canRecommend ? (
          <button type="button" onClick={() => run(recommendKycApprovalAction, "Approval recommended", { attestations: attested() }, "warning")} className="btn btn-primary btn-md w-full">
            <I.shieldcheck s={14} /> Recommend approval
          </button>
        ) : (
          <ConfirmDialog
            trigger={
              <button
                type="button"
                disabled={!(canApproveDirect || canApproveAsChecker)}
                /* btn-lg (--h-control-lg, 48px) rather than btn-md: these three controls
                   decide a person's identity and open the withdrawal gate, and officers
                   review on a phone, so they get the top rung of the ladder.
                   ⛔ Values live in globals.css — do not restate them here. */
                className="btn btn-primary btn-lg w-full disabled:opacity-40"
              >
                <I.shieldcheck s={14} /> {makerCheckerRequired ? "Approve (second officer)" : "Approve identity"}
              </button>
            }
            title="Approve identity · Idhinisha kitambulisho"
            /* E-9 (officer-facing twin of E-5), measured at the ENFORCEMENT layer. This sentence
               has now been wrong three times, and the third was held in place by a green guard:
                 · first "unlocks full real-money deposits, play and withdrawals";
                 · then "opens the withdrawal gate" — false from 2026-08-20 to 2026-09-05;
                 · then, from 2026-09-05, "does NOT open any money gate: withdrawals no longer depend
                   on identity verification…" — FALSE IN ALL THREE CLAUSES while the 2026-09-05 gate
                   stood, and `kyc-approved-copy.test.mts` asserted it stayed that way.
               ⭐ FROM 2026-09-13 THE TRUE SENTENCE IS ONE CLAUSE: approval opens the withdrawal gate,
               and nothing else (`kyc-gate.ts` — the only identity question on any money path).
               ⭐ 2026-10-07 — THE GATE HAS TWO HALVES NOW (owner ruling): identity, which this decides, and a
               confirmed email address, which the player confirms themselves; a deposit asks for neither. So
               approval answers the identity HALF, and "depositing needs a confirmed email" became false that day.
               ⭐ 2026-10-10 — the last sentence names what was reviewed: the photos on a photo case, the typed
               details on a typed one (no image exists to have been reviewed).
               ⛔ Fix this sentence and its guard in the same commit, every time. */
            body={<>This records the player&apos;s identity as <strong>verified</strong> and binds this document to this account, so no other account can claim it. It is audit-logged. <strong>It answers the identity half of the withdrawal gate, and nothing else</strong> — the other half is a confirmed email address, which the player confirms themselves. Depositing and playing need neither, so this player may already hold money they are waiting to take out. {mode === "photo" ? "Confirm the checklist reflects the documents you actually reviewed." : "Confirm the checklist reflects the details you actually reviewed."}</>}
            confirmLabel="Yes, approve identity"
            tone="brand"
            /* E-4: the attestations travel WITH the decision. They used to arm this
               button and then die in the browser. */
            onConfirm={() => run(approveKycWorkstationAction, "Identity approved", { mode, attestations: attested() })}
          />
        ))}

        {stage === "post_check" && (
          <ConfirmDialog
            trigger={
              <button type="button" disabled={!checksOk} className="btn btn-primary btn-lg w-full disabled:opacity-40">
                <I.shieldcheck s={14} /> Mark checked
              </button>
            }
            title="Mark this automatic approval checked"
            body={<>The identity was approved automatically from the details the player typed. Marking it checked records <strong>you</strong> as the officer who reviewed those details, the number&apos;s flags and other accounts, and takes it off the post-check list. It changes nothing for the player. If something is wrong, ask for corrections or reject instead.</>}
            confirmLabel="Yes, mark checked"
            tone="brand"
            onConfirm={() => run(markPostCheckedAction, "Marked checked", { attestations: attested() })}
          />
        )}

        {panel === "none" ? (
          <div className="grid grid-cols-2 gap-2">
            {/* Corrections are already asked in `with_player` (the service refuses a second ask), so Reject takes the row. */}
            {stage !== "with_player" && (
              <button type="button" onClick={() => setPanel("corrections")} className="btn btn-ghost btn-lg w-full">
                <I.alertCircle s={13} /> Ask for corrections
              </button>
            )}
            <button type="button" onClick={() => setPanel("reject")} className={`btn btn-lg w-full${stage === "with_player" ? " col-span-2" : ""}`} style={{ background: "var(--claret-soft)", color: "var(--claret-200)", border: "1px solid var(--claret-edge)" }}>
              <I.x s={13} /> Reject
            </button>
            <button type="button" onClick={() => run(escalateKycToAmlAction, "Escalated to AML", { note: "" }, "warning")} className="btn btn-ghost btn-lg col-span-2 w-full">
              <I.alertCircle s={13} /> Escalate AML
            </button>
          </div>
        ) : panel === "corrections" ? (
          <div ref={panelRef} className="space-y-2 rounded-md border border-border bg-bg-inset/40 p-2.5" data-kyc-panel="corrections">
            <p className="text-body-sm text-text">
              <strong>Ask the player to correct their details.</strong> They read your note and send again; the corrected case comes back to an officer.
              {approvedOnce ? " This stops no money: an identity approved once keeps withdrawal open." : ""}
            </p>
            <div data-field="note">
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={500} placeholder="What should the player correct? They read this note…" className="w-full rounded-md border border-border bg-bg-overlay px-2.5 py-1.5 text-[12px] text-text admin-focus resize-y placeholder:text-text-subtle" />
            </div>
            {freezeBlock}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={note.trim().length < NOTE_MIN || !freezeOk} onClick={() => run(askForCorrectionsAction, freezeOn ? "Corrections asked · wallet frozen" : "Corrections asked", { note: note.trim(), ...freezeFields }, freezeOn ? "warning" : "success")} className="btn btn-primary btn-md w-full disabled:opacity-40">Send to the player</button>
              <button type="button" onClick={closePanel} className="btn btn-ghost btn-md w-full">Cancel</button>
            </div>
          </div>
        ) : (
          <div ref={panelRef} className="space-y-2 rounded-md border border-claret-edge bg-claret-soft p-2.5" data-kyc-panel="reject">
            {/* ⭐ DG-S-05/06 — the addresses `rejectKycWorkstationAction` can name. Each wrapper CONTAINS its
                control, so `focusFirstInvalid` focuses the control rather than merely scrolling to a label. */}
            <div data-field="reasonCode">
              <Select
                value={reasonCode}
                onChange={setReasonCode}
                ariaLabel="Reason code"
                placeholder="Reason code…"
                size="sm"
                options={REJECT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              />
            </div>
            {pickedFinal && (
              <p data-final-refusal-warning="1" className="rounded-md border border-border bg-bg-inset px-2 py-2 text-body-sm text-text">
                <strong>A final refusal.</strong> It freezes the wallet (no deposits, bets or withdrawals), keeps this document reserved, and the player cannot restart verification themselves. You then decide what happens to any balance, with a written reason.
              </p>
            )}
            {/* ⭐ A RECOVERABLE REFUSAL SAYS WHAT IT DOES NOT DO (audit session 95, 2026-09-14). Only a final code
                freezes the wallet on its own; the lever that stops money on a recoverable one is right below it. */}
            {reasonCode && !pickedFinal && (
              <p data-recoverable-refusal-note="1" className="rounded-md border border-border bg-bg-inset px-2 py-2 text-body-sm text-text">
                <strong>Recoverable:</strong> the document number is released and the player may send their details again — the case then comes back to an officer.{" "}
                {freezeLocked
                  ? "The wallet is frozen with it: the box below stays ticked."
                  : `The wallet is not frozen unless you tick the box below${approvedOnce ? ", and an identity approved once keeps withdrawal open" : ""}.`}
              </p>
            )}
            <div data-field="note">
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder={pickedFinal ? "Optional note — the player reads it; never name a list or an internal check…" : "Note to the player (required for “Other”)…"} className="w-full rounded-md border border-border bg-bg-overlay px-2.5 py-1.5 text-[12px] text-text admin-focus resize-y placeholder:text-text-subtle" />
            </div>
            {!pickedFinal && freezeBlock}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={!reasonCode || (!pickedFinal && !freezeOk)} onClick={() => run(rejectKycWorkstationAction, pickedFinal ? "Refused · wallet frozen" : freezeOn ? "Rejected · wallet frozen" : "Submission rejected", { reasonCode, note, ...(pickedFinal ? {} : freezeFields) }, pickedFinal || freezeOn ? "warning" : "success")} className="btn btn-claret btn-md w-full disabled:opacity-40">{pickedFinal ? "Confirm final refusal" : "Confirm reject"}</button>
              <button type="button" onClick={closePanel} className="btn btn-ghost btn-md w-full">Cancel</button>
            </div>
          </div>
        )}
      </div>

      {anyBlock && (
        <p className="font-mono text-[10.5px] text-danger-fg">A check blocks approval — reject the identity or ask the player for corrections rather than approve.</p>
      )}

      {/**
        * ⛔ THE OFFICER'S JUDGEMENTS ARE WORK, not just the typed note. `judg` is a whole manual
        * checklist — every entry starts `pending` and an officer moves them one at a time while
        * reading the case — and none of it is written anywhere until a decision is run. An
        * interrupted KYC review meant doing the reading again.
        * ⭐ This rail is inline chrome, not a modal: nothing blocks a click on the sidebar.
        */}
      <PendingChangesBar
        dirty={reviewDirty}
        label="Decision not recorded"
        detail="The checklist and notes are held in this page only."
        onDiscard={discardReview}
      />
      <UnsavedChangesGuard
        dirty={reviewDirty}
        body="This KYC review has judgements that have not been submitted as a decision. Leaving now discards them."
      />
    </div>
  );
}
