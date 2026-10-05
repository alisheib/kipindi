"use client";

/**
 * U33b-L · THE "LISTS" CARD on /admin/contacts — where a licence basis is recorded on a contact list, and revoked.
 *
 * ⭐ WHAT THE OFFICER IS ACTUALLY DOING. Recording a basis is the most consequential act in the contact book: it is what
 * makes a list of people reachable WITHOUT their consent, under the Gaming Board licence. So the card never reduces it
 * to a button — it shows how many of the list's members a recording would reach, labels the tick with the saved 18+
 * sentence the officer is attesting to (never a paraphrase), and asks for a note saying where the numbers came from,
 * which is kept as evidence for seven years.
 *
 * ⛔ IT SHOWS COVERAGE AS TWO NUMBERS, "covers 412 of 420", because a recording reaches the members present when it was
 * made and nobody added afterwards. An officer who adds people to a recorded list and assumes they are covered is the
 * failure this line exists to prevent, so the gap is spelled out in words when there is one.
 *
 * ⛔ NO BUTTON WHILE THE WORDINGS ARE UNSAVED. The writer refuses then — a default nobody approved is not evidence — and
 * a control that always fails is worse than none, so the card says which screen saves them instead.
 *
 * ⛔ A SEPARATE FILE, consulting the act gate itself (`useMayAct`), for the reason every card on this page does:
 * `test:admin-act-gate` judges a whole FILE. A viewer who may not act reads every count and changes nothing.
 * ⭐ D19 · there is nothing to mask here: a list row is counts, names and instants, never a phone number.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmModal } from "@/components/ui/modal";
import { I } from "@/components/ui/glyphs";
import { useDeferredToast } from "@/components/ui/toast";
import { ActReadOnly, useMayAct } from "@/components/admin/act-gate";
import { UnsavedChangesGuard } from "@/components/ui/unsaved-changes";
import { runAdminAction } from "@/lib/client/run-admin-action";
import { PROOF_NOTE_MAX, PROOF_NOTE_MIN, proofNoteChars } from "@/lib/marketing/consent-basis";
import { recordListBasisAction, revokeListBasisAction } from "./list-basis-actions";
import type { ListsCardView } from "./lists-loader";

const DATE = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toISOString().slice(0, 16).replace("T", " ");
};

export function ListsCard({ view }: { view: ListsCardView }) {
  const mayAct = useMayAct();
  const router = useRouter();
  const [pending, start] = useTransition();
  const { toast } = useDeferredToast(pending);
  /** Which list's form is open — one at a time, because each is an attestation and two half-filled ones invite a mix-up. */
  const [open, setOpen] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [ticked, setTicked] = useState(false);
  const [asking, setAsking] = useState<{ kind: "record" | "revoke"; listId: string } | null>(null);
  /** The list whose revoke form is open. ⛔ The REASON is asked before the confirmation, never after: a dialog that
   *  fires on a reason nobody has written yet is a control that asks the wrong question first. */
  const [revoking, setRevoking] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const noteChars = proofNoteChars(note);
  const noteReady = noteChars >= PROOF_NOTE_MIN && noteChars <= PROOF_NOTE_MAX;
  const reasonChars = proofNoteChars(reason);
  const reasonReady = reasonChars >= PROOF_NOTE_MIN && reasonChars <= PROOF_NOTE_MAX;

  const run = (kind: "record" | "revoke", listId: string) => {
    setAsking(null);
    start(async () => {
      const fd = new FormData();
      fd.set("listId", listId);
      if (kind === "record") { fd.set("proofNote", note); fd.set("adultAttested", ticked ? "1" : "0"); }
      else fd.set("reason", reason);
      const res = await runAdminAction(() => (kind === "record" ? recordListBasisAction(fd) : revokeListBasisAction(fd)));
      if (!res.ok) {
        toast({ title: kind === "record" ? "Couldn't record the basis" : "Couldn't revoke the basis", description: res.error, variant: "danger" });
        router.refresh();
        return;
      }
      toast({
        title: kind === "record" ? "Basis recorded" : "Basis revoked",
        description: kind === "record"
          ? "This list's members can now receive campaigns under the licence. Anyone added from now on is not covered until you record again."
          : "From now on this list covers nobody. People who consented are unaffected.",
      });
      setOpen(null); setNote(""); setTicked(false); setReason(""); setRevoking(null);
      router.refresh();
    });
  };

  if (!view.wordingsSaved) {
    return (
      <p className="flex items-start gap-2 text-body-sm text-text-secondary">
        <I.alertCircle s={14} className="mt-0.5 shrink-0" />
        <span>
          The licence outreach wording or its 18+ confirmation hasn&apos;t been saved yet, so no basis can be recorded —
          an admin saves them in Admin → System → Marketing wordings.
        </span>
      </p>
    );
  }

  /* ⛔ AN ATTESTATION MUST NOT BE SILENTLY LOST, AND MUST NOT BE SILENTLY RESTORED EITHER. `test:unsaved-changes`
     found this card leaving an operator able to type a proof note and navigate away with it. The guard WARNS on exit —
     ⭐ but this form deliberately keeps no DRAFT: a half-written attestation resurrected on a later visit, and submitted
     without being re-read, is worse than retyping it. The officer is told; nothing is kept. */
  const dirty = note.trim() !== "" || reason.trim() !== "" || ticked;

  return (
    <div>
      <UnsavedChangesGuard
        dirty={dirty}
        title="Leave without recording?"
        body="You have typed a basis note or a revocation reason that has not been recorded. Leaving now discards it — nothing is kept."
        confirmLabel="Discard it"
      />
      <p className="text-body-sm text-text-subtle mb-3">
        Recording a basis lets this list&apos;s members receive campaigns under the 50pick licence, without each person
        having agreed. It covers the members on the list at the moment you record it — anyone added later is not covered
        until you record again. Every recording and revocation is kept with your name and the time.
      </p>

      {view.rows.length === 0 && <p className="text-body-sm text-text-subtle">No lists yet.</p>}

      <ul className="space-y-3">
        {view.rows.map((l) => {
          const inForce = l.basis !== null && l.basis.revokedAt === null;
          const gap = inForce ? l.live - l.covered : 0;
          return (
            <li key={l.id} className="rounded-md border border-border-subtle p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-body font-semibold text-text">{l.name}</p>
                  <p className="text-caption text-text-subtle">{l.live} member{l.live === 1 ? "" : "s"}</p>
                </div>
                <span className={`shrink-0 text-caption font-semibold ${inForce ? "text-success" : "text-text-tertiary"}`}>
                  {inForce ? "Recorded" : l.basis ? "Revoked" : "Not recorded"}
                </span>
              </div>

              {l.basis && (
                <p className="mt-1 text-body-sm text-text-secondary">
                  {inForce ? (
                    <>
                      Recorded {DATE(l.basis.recordedAt)} · covers {l.covered} of {l.live}
                      {/* ⛔ The gap is said in WORDS, not left as arithmetic: an officer who adds people to a recorded
                          list and assumes they are covered is exactly the mistake this line prevents. */}
                      {gap > 0 && <> — {gap} added since, record again to cover them</>}
                    </>
                  ) : (
                    <>Revoked {l.basis.revokedAt ? DATE(l.basis.revokedAt) : ""} — this list covers nobody</>
                  )}
                </p>
              )}

              {!mayAct ? (
                <div className="mt-2"><ActReadOnly /></div>
              ) : open === l.id ? (
                <div className="mt-3 space-y-2">
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Where did these numbers come from? This is kept as evidence for seven years."
                    rows={3}
                    data-field="list-basis-note"
                  />
                  <p className="text-caption text-text-subtle">
                    {noteChars} / {PROOF_NOTE_MAX} characters{noteChars < PROOF_NOTE_MIN ? ` — at least ${PROOF_NOTE_MIN}` : ""}
                  </p>
                  {/* ⭐ The tick is labelled with the SAVED sentence, so the officer attests to the words that will be
                      stored on the row — never to a paraphrase written in this file. */}
                  <Checkbox checked={ticked} onChange={setTicked} label={view.adultLabel ?? ""} />
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => setAsking({ kind: "record", listId: l.id })} disabled={pending || !noteReady || !ticked}>
                      {inForce ? "Record again" : "Record"}
                    </Button>
                    <Button variant="ghost" onClick={() => { setOpen(null); setNote(""); setTicked(false); }} disabled={pending}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => { setOpen(l.id); setNote(""); setTicked(false); }} disabled={pending}>
                    {inForce ? "Record again" : "Record"}
                  </Button>
                  {inForce && (
                    <Button variant="ghost" onClick={() => { setReason(""); setRevoking(l.id); }} disabled={pending}>
                      Revoke
                    </Button>
                  )}
                </div>
              )}
              {mayAct && revoking === l.id && (
                <div className="mt-3 space-y-2">
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Why is this basis being revoked?"
                    rows={2}
                    data-field="list-basis-reason"
                  />
                  <p className="text-caption text-text-subtle">
                    {reasonChars} / {PROOF_NOTE_MAX} characters{reasonChars < PROOF_NOTE_MIN ? ` — at least ${PROOF_NOTE_MIN}` : ""}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="danger" onClick={() => setAsking({ kind: "revoke", listId: l.id })} disabled={pending || !reasonReady}>
                      Revoke this basis
                    </Button>
                    <Button variant="ghost" onClick={() => { setRevoking(null); setReason(""); }} disabled={pending}>Cancel</Button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <ConfirmModal
        open={asking !== null}
        onClose={() => setAsking(null)}
        onConfirm={() => asking && run(asking.kind, asking.listId)}
        title={asking?.kind === "record" ? "Record this basis?" : "Revoke this basis?"}
        body={asking?.kind === "record"
          ? "From now on this list's current members can receive campaigns under the licence, without each person having agreed. Anyone added later is not covered until you record again. A stop is always kept."
          : "From now on this list covers nobody. People who consented are unaffected, and the recording stays on the record."}
        confirmLabel={asking?.kind === "record" ? "Record" : "Revoke"}
        loading={pending}
      />

    </div>
  );
}
