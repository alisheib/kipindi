"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { AttestationRail } from "@/components/admin/attestation-rail";

/* ⛔ NO IMPORT FROM `admin-shell`. It pulls @/lib/server/store, control-gates and roles, and
   this file is "use client" — so importing AdminCard here dragged the whole server graph into
   the browser bundle and the build failed on ioredis reaching for node:dns. The CARD CHROME is
   rendered by the server page; this component is only the interactive body. */
import { Callout } from "@/components/ui/callout";
import { ConfirmModal } from "@/components/ui/modal";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useDeferredToast } from "@/components/ui/toast";
import { formatTzsCompact } from "@/lib/utils";
import {
  purgeCostAction, purgeStage1Action, purgeStage2Action, purgeAdvanceAction, purgeCancelAction, purgeJobAction,
} from "./purge-actions";
import { useMayAct, useActDisabledReason } from "@/components/admin/act-gate";
import type { PurgeCost, PurgeJob } from "@/lib/server/chain-purge";

/**
 * PURGE A CHAIN AND ITS HISTORY — the ceremony surface.
 *
 * ⛔ IT LIVES HERE, NOT ON /admin/updown. `/admin/updown` is a `trading` route, so a
 * `compliance` control there is Owner-only in practice and logs every legitimate compliance
 * click as `privilege_escalation_blocked` — the documented E-18/E-23 failure. /admin/updown
 * gets a LINK to this card, not the control.
 *
 * The shape follows `BulkConfirm` on the resolver queue: the cost is computed SERVER-side and
 * shown in a scrolling box inside the modal body, so the officer reads what it will cost in the
 * same breath as they type the word that arms it.
 */
type ArchivedChain = { id: string; label: string; rounds: number };

export function PurgeChainCard({ chains, stage1, viewerId }: {
  chains: ArchivedChain[];
  /** chainId → who signed first, so officer A sees they are waiting on someone else. */
  stage1: Record<string, { actorId: string; at: string } | undefined>;
  /** ⛔ WHO IS LOOKING. Without it the card cannot tell "I signed" from "someone else signed",
   *  and it offered officer A a "Confirm as second officer" button the server would refuse —
   *  the same defect as a trading page offering a compliance control. */
  viewerId: string;
}) {
  const [chainId, setChainId] = useState(chains[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const [basis, setBasis] = useState("POCA Cap 423 §16 — record retained; player-facing content redacted");
  const [cost, setCost] = useState<PurgeCost | null>(null);
  const [costError, setCostError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [job, setJob] = useState<PurgeJob | null>(null);
  const [pending, start] = useTransition();
  /* ⛔ A PURGE IS THE MOST DESTRUCTIVE CONTROL ON THE PLATFORM, and this card shipped
     without consulting the act gate at all — so a role granted READ access to retention
     was handed a working two-officer purge ceremony. Every other admin surface asks; the
     one that deletes a chain and its history must not be the exception. */
  const mayAct = useMayAct();
  const actReason = useActDisabledReason();
  const { toast } = useDeferredToast(pending);

  const chain = chains.find((c) => c.id === chainId);
  const signed = stage1[chainId];
  /** Officer A: a signature exists and it is mine — I am waiting on someone else. */
  const mine = signed && signed.actorId === viewerId;
  /** Officer B: a signature exists and it is NOT mine — I can complete the ceremony. */
  const theirs = signed && signed.actorId !== viewerId;
  const label = chain?.label ?? "";

  const loadCost = useCallback((id: string) => {
    if (!id) return;
    start(async () => {
      const r = await purgeCostAction(id);
      if (!r.ok) { setCost(null); setCostError(r.error); return; }
      setCostError(null);
      setCost(r.data);
    });
  }, []);

  useEffect(() => { setCost(null); setCostError(null); loadCost(chainId); }, [chainId, loadCost]);

  /**
   * ⛔ THE RESUME THE COMMENT BELOW PROMISES — it was asserted and never implemented.
   * `job` began as `null` on every mount and only became non-null by starting a purge IN
   * THIS TAB, so an officer who closed the tab mid-delete came back to a card showing no
   * job at all: the durable row said `deleting`, the chain was half-purged, and the only
   * surface that could finish it rendered a fresh "Start" button. The batches are driven by
   * the client, so an unadopted job is a job that never continues.
   *
   * Adoption is per chain and does not fight the advance loop: it takes the stored job only
   * when the card is not already holding one for this chain, and setting it is exactly what
   * makes the loop below pick the batches back up.
   */
  useEffect(() => {
    if (!chainId) return;
    let cancelled = false;
    (async () => {
      const r = await purgeJobAction(chainId);
      if (cancelled || !r.ok || !r.data) return;
      setJob((cur) => (cur && cur.chainId === chainId ? cur : r.data));
    })();
    return () => { cancelled = true; };
  }, [chainId]);

  /**
   * ⭐ THE CLIENT DRIVES THE BATCHES, and the bar is determinate because of it. There is no
   * background worker on this deployment that can be relied on to outlive the response, so a
   * job that "runs in the background" would report `deleting` for ever with nobody able to say
   * whether it had stopped. Each call commits one batch; `done` is a durable row, so closing
   * the tab pauses the job rather than corrupting it, and reopening resumes.
   */
  useEffect(() => {
    if (!job || job.phase === "done" || job.phase === "failed") return;
    let cancelled = false;
    (async () => {
      const r = await purgeAdvanceAction(job.chainId);
      if (cancelled) return;
      if (!r.ok) { toast({ title: "Purge stopped", description: r.error, variant: "danger" }); return; }
      setJob(r.data);
      if (r.data.phase === "done") toast({ title: `${r.data.chainLabel} purged`, variant: "success" });
      if (r.data.phase === "failed") toast({ title: "Purge failed", description: r.data.error ?? "", variant: "danger" });
    })();
    return () => { cancelled = true; };
  }, [job, toast]);

  const running = !!job && job.phase !== "done" && job.phase !== "failed";

  if (chains.length === 0) {
    return (
      <p className="text-caption text-text-tertiary">
          No archived chains. A chain must be <strong className="text-text">archived first</strong> — purging is the
          second door, and archiving is the one that can be undone.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <Callout tone="danger" title="This cannot be undone">
          Deletes every round, comment, watchlist entry and price snapshot on the chain. The markets
          themselves are <strong>kept as stamped tombstones</strong> — pools, fees and outcomes stay,
          so the books still balance and every ledger entry still names a market that exists.
          Positions, transactions, ledger entries and the audit log are never touched, and the
          shared price observations are never chain-scoped.
        </Callout>

        <Field label="Archived chain" hint="Only archived chains can be purged.">
          <Select
            ariaLabel="Archived chain"
            value={chainId}
            onChange={setChainId}
            disabled={running}
            options={chains.map((c) => ({ value: c.id, label: `${c.label} · ${c.rounds.toLocaleString()} rounds` }))}
          />
        </Field>

        {costError && <Callout tone="warning" title="Refused">{costError}</Callout>}

        {cost && <CostPanel cost={cost} />}

        {job && (
          <div className="rounded-md border border-border bg-bg-overlay p-3 space-y-2">
            <p className="font-mono text-micro uppercase tracking-widest text-text-tertiary">
              {job.phase === "exporting" && "Writing the evidence pack…"}
              {job.phase === "deleting" && "Deleting rounds…"}
              {job.phase === "verifying" && "Verifying nothing remains…"}
              {job.phase === "done" && "Purged"}
              {job.phase === "failed" && "Failed"}
              {running && <span className="ml-2 inline-block align-middle"><Spinner size={12} /></span>}
            </p>
            <ProgressBar value={job.done} max={job.total} tone="claret" label={`Purging ${job.chainLabel}`} />
            {job.packHash && (
              <p className="font-mono text-micro text-text-subtle break-all">
                evidence pack sha256 {job.packHash.slice(0, 32)}…
              </p>
            )}
            {job.error && <Callout tone="danger" title="Nothing was recorded as purged">{job.error}</Callout>}
          </div>
        )}

        {/* ⛔ OFFICER A IS SHOWN THE RAIL AND NO CONFIRM BUTTON. The first version offered
            "Confirm as second officer" to whoever was looking, including the person who had just
            signed — a control the server refuses through `twoOfficerGate`, which is the same
            defect as a trading route offering a compliance control. They can still WITHDRAW: it
            is their own ceremony, and a first signature that cannot be taken back is a gate the
            signer is locked inside. */}
        {!job && mine && (
          <>
            <AttestationRail tone="blocked" title={{ en: "Second officer required", sw: "Afisa wa pili anahitajika" }}>
              You recorded the reason for this chain. A different compliance officer must complete it.
            </AttestationRail>
            <Button
              type="button" variant="ghost" loading={pending} disabled={!mayAct} title={actReason}
              onClick={() => start(async () => {
                const r = await purgeCancelAction(chainId);
                toast(r.ok ? { title: "Ceremony withdrawn", variant: "success" } : { title: "Couldn't withdraw", description: r.error, variant: "danger" });
              })}
            >
              Withdraw
            </Button>
          </>
        )}

        {!job && !signed && (
          <>
            <Field label="Reason (audited)" hint="At least 5 characters — recorded against your name.">
              <Input value={reason} onChange={(e) => setReason(e.currentTarget.value)} placeholder="e.g. chain retired after the 3m pilot" />
            </Field>
            <Field label="Statutory basis" hint="Written into the completion record.">
              <Input value={basis} onChange={(e) => setBasis(e.currentTarget.value)} />
            </Field>
            <Button
              type="button"
              variant="ghost"
              loading={pending}
              disabled={!mayAct || !cost || reason.trim().length < 5}
              title={actReason}
              onClick={() => start(async () => {
                const fd = new FormData();
                fd.set("chainId", chainId); fd.set("reason", reason); fd.set("basis", basis);
                const r = await purgeStage1Action(fd);
                toast(r.ok
                  ? { title: "Reason recorded — a second officer must now confirm", variant: "success" }
                  : { title: "Couldn't record it", description: r.error, variant: "danger" });
              })}
            >
              Record the reason (step 1 of 2)
            </Button>
          </>
        )}

        {!job && theirs && (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="danger" disabled={!mayAct || !cost} title={actReason} onClick={() => setConfirming(true)}>
              Confirm as second officer
            </Button>
            <Button
              type="button" variant="ghost" loading={pending} disabled={!mayAct} title={actReason}
              onClick={() => start(async () => {
                const r = await purgeCancelAction(chainId);
                toast(r.ok ? { title: "Ceremony withdrawn", variant: "success" } : { title: "Couldn't withdraw", description: r.error, variant: "danger" });
              })}
            >
              Withdraw
            </Button>
          </div>
        )}
      </div>

      <ConfirmModal
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          start(async () => {
            const fd = new FormData();
            /* The modal only fires onConfirm once the officer has typed the label, so this is
               the word it accepted. ⚠️ The server re-checks it anyway — that check is not about
               this human, it is about a scripted caller POSTing straight at the action. */
            fd.set("chainId", chainId); fd.set("typedWord", label);
            const r = await purgeStage2Action(fd);
            if (!r.ok) { toast({ title: "Refused", description: r.error, variant: "danger" }); return; }
            setJob(r.data);
          });
        }}
        tone="claret"
        size="lg"
        maxWidth={620}
        eyebrow="Irreversible · Hatua ya mwisho"
        title={`Purge ${label} and all its history?`}
        confirmLabel="Purge the chain"
        loading={pending}
        /* ⛔ THE CHAIN'S OWN LABEL, not "DELETE" — typing the specific thing is what stops
           muscle memory firing on the wrong row. The server re-checks it too: this input is a
           deliberate speed bump, not the gate. */
        tier="hard"
        typedWord={label}
        body={
          <div className="space-y-2">
            <p>
              Officer A recorded the reason. You are the second officer. This deletes the price story
              and the player-facing content, and stamps every market as purged.
            </p>
            {cost && (
              <div className="max-h-[38vh] overflow-y-auto rounded-md border border-border bg-bg-sunken p-2">
                <CostPanel cost={cost} dense />
              </div>
            )}
            {/* ⛔ NO TYPED-WORD INPUT HERE. `ConfirmModal` renders its own when `tier="hard"`
                carries a `typedWord`, and it is that one which arms the confirm button. A second
                input in the body would be the more prominent of the two and would arm NOTHING —
                an officer could type the label correctly into it and still find Confirm dead,
                or worse, read the armed button as proof their input was accepted. One gate. */}
          </div>
        }
      />
    </>
  );
}

/**
 * ⛔ ITEMISED WITH REAL NUMBERS, NEVER ESTIMATES (A-5). Every figure here was counted
 * server-side; if any of them could not be, the action refuses and this panel never renders.
 * The three "kept" lines are as important as the deletions — they are what an officer needs in
 * order to sign something irreversible without guessing at its blast radius.
 */
function CostPanel({ cost, dense = false }: { cost: PurgeCost; dense?: boolean }) {
  const Row = ({ k, v, note }: { k: string; v: string; note?: string }) => (
    <div className="flex items-baseline justify-between gap-3 py-0.5">
      <span className="text-caption text-text-secondary">{k}</span>
      <span className="font-mono text-caption text-text tabular-nums text-right">
        {v}
        {note && <span className="block text-micro text-text-tertiary">{note}</span>}
      </span>
    </div>
  );
  return (
    <div className={dense ? "" : "rounded-md border border-border bg-bg-overlay p-3"}>
      <p className="font-mono text-micro uppercase eyebrow text-claret-300 font-bold mb-1">
        What this deletes
      </p>
      <Row k="Rounds" v={cost.rounds.toLocaleString()} note={cost.firstAt && cost.lastAt ? `${cost.firstAt.slice(0, 10)} → ${cost.lastAt.slice(0, 10)}` : undefined} />
      <Row k="Comments" v={cost.comments.toLocaleString()} />
      <Row k="Watchlist entries" v={cost.watchlists.toLocaleString()} />
      <Row k="Price snapshots" v={cost.snapshots.toLocaleString()} />
      <Row k="Observations" v="0" note={cost.observationsNote} />

      <p className="font-mono text-micro uppercase eyebrow text-text-tertiary font-bold mt-2 mb-1">
        What survives, redacted
      </p>
      <Row k="Markets (kept as tombstones)" v={cost.markets.toLocaleString()} />
      <Row k="Positions (untouched)" v={cost.positions.toLocaleString()} />
      <Row k="Distinct players affected" v={cost.distinctPlayers.toLocaleString()} />
      <Row k="Staked through this chain" v={formatTzsCompact(cost.stakedTzs)} />
      <Row k="Paid out through this chain" v={formatTzsCompact(cost.paidOutTzs)} />
      <Row k="Ledger entries (untouched)" v={cost.ledgerEntries.toLocaleString()} note="would have dangled under a delete" />
      <Row k="House-pool entries (untouched)" v={cost.housePoolEntries.toLocaleString()} note="would have dangled under a delete" />
      <Row k="Open objections" v={cost.objections.toLocaleString()} />
    </div>
  );
}
