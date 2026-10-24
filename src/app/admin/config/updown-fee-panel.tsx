"use client";

/**
 * ⭐ UP & DOWN · THE DEFAULT FEE PROFILE AND EVERY CHAIN, IN ONE ACT — `/admin/config`'s Fees & taxes card (FEE-TAX-2026-10,
 * R2c; FEE-TAX-PLAN §4 R2 and §5's "Up & Down" save).
 *
 * WHAT IT SHOWS. The product's default profile as stored (read fresh by the page) and every chain counted by the fee model
 * its profile resolves to, per chain state (`chainFeeCensus` — the rule `boardFeeSummary` and the act's own dry run read).
 * A chain carries its OWN profile, so moving the default alone changes nothing a player sees; this card exists so the two
 * can only move together.
 *
 * WHAT IT DOES. "Apply to every chain…" first asks the server for the DRY RUN (`previewUpDownFeeProfileAction`, nothing
 * written) and shows its counts in a confirm; only the confirm runs the act (`applyUpDownFeeProfileAction` →
 * `applyFeeProfileToEveryChain`: the default and every chain — running, paused, stopped and archived — in one transaction,
 * with one audit row and the officer's reason). Rounds already open keep the rates they froze.
 *
 * ⛔ GATED. While `fee-law-gate.ts` is shut the act is refused by the server, dry run included, so the fields and the button
 * are drawn DISABLED with the gate's own words — never hidden, never a button that can only fail.
 */
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDeferredToast } from "@/components/ui/toast";
import { Input, Field } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/modal";
import { UnsavedChangesGuard, useFormDirty } from "@/components/ui/unsaved-changes";
import { useMayAct, useActDisabledReason } from "@/components/admin/act-gate";
import { describeFeeModel, type FeeModel, type FeeRates } from "@/lib/payout";
import { feeLawLive } from "@/lib/fee-law-gate";
import { CHAIN_STATES_IN_ORDER, type ChainFeeCensus } from "@/lib/updown-fee-profile";
import { previewUpDownFeeProfileAction, applyUpDownFeeProfileAction } from "./actions";
import { lawNotInForce } from "./config-form";

/** The words for each model a chain can resolve to, as this card says them. */
const MODEL_WORD: Record<FeeModel | "unreadable", string> = {
  "loser-share": "loser-share",
  "stake-share": "stake-share",
  "capped-commission": "capped commission",
  "jackpot-payout": "jackpot (Millionea)",
  unreadable: "unreadable profile",
};
const STATE_WORD: Record<string, string> = { RUNNING: "Running", PAUSED: "Paused", STOPPED: "Stopped", ARCHIVED: "Archived" };

/** A stored rate as the form draws it — percent to the hundredth, trimmed ("3", "6.5") — or empty when there is none. */
const pctText = (rate: unknown): string =>
  typeof rate === "number" && Number.isFinite(rate) ? String(Number((rate * 100).toFixed(2))) : "";

type Counts = { model: FeeModel; total: number; moved: number; byState: Record<string, { total: number; moved: number }> };

export function UpDownFeePanel({ defaultProfile, census }: { defaultProfile: Partial<FeeRates>; census: ChainFeeCensus }) {
  const mayAct = useMayAct();
  const disabledReason = useActDisabledReason();
  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);

  const lawLive = feeLawLive();
  const lawShut = lawNotInForce();
  const locked = !mayAct || !lawLive;

  // The default as stored — its caption and model. ⛔ An unreadable profile is SAID, never captioned as some other law.
  const current = useMemo(() => {
    try {
      const d = describeFeeModel(defaultProfile);
      return { model: d.model as FeeModel | "unreadable", caption: d.caption };
    } catch {
      return { model: "unreadable" as const, caption: "unreadable — the engine refuses this profile" };
    }
  }, [defaultProfile]);
  const startModel: string = current.model === "unreadable" || current.model === "jackpot-payout" ? "loser-share" : current.model;

  const [model, setModel] = useState<string>(startModel);
  const [counts, setCounts] = useState<Counts | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const sent = useRef<FormData | null>(null);
  const { dirty: fieldsDirty, markSaved, formProps } = useFormDirty(formRef);
  const dirty = fieldsDirty || model !== startModel;

  const formData = () => {
    const fd = new FormData(formRef.current ?? undefined);
    fd.set("feeModel", model);
    return fd;
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (locked) return;
    const fd = formData();
    // The DRY RUN — nothing is written; its counts are what the confirm shows.
    start(async () => {
      const r = await previewUpDownFeeProfileAction(fd);
      if (!r.ok) {
        toast({ title: "Couldn't preview the change", description: r.error, variant: "danger" });
        return;
      }
      sent.current = fd;
      setCounts(r.counts);
    });
  };

  const apply = () => {
    const fd = sent.current;
    if (!fd) { setCounts(null); return; }
    // The confirm stays open, held (`loading`), until the act answers.
    start(async () => {
      const r = await applyUpDownFeeProfileAction(fd);
      setCounts(null);
      if (!r.ok) {
        toast({ title: "Nothing was changed", description: r.error, variant: "danger" });
        return;
      }
      markSaved();
      router.refresh();
      deferToast({
        title: `Every chain is on ${MODEL_WORD[r.counts.model]}`,
        description: `${r.counts.moved} of ${r.counts.total} chains moved, with the default. Rounds already open keep the rates they froze.`,
        variant: "success",
      });
    });
  };

  const pool = model !== "capped-commission";

  return (
    <div className="rounded-lg border border-border bg-bg-overlay p-3 space-y-3" data-updown-fee-panel="">
      <div>
        <p className="font-mono text-micro uppercase eyebrow text-text-subtle">Up &amp; Down · default profile and every chain</p>
        <p className="mt-0.5 text-body-sm text-text-muted">
          Every chain carries its own profile, so the default alone changes nothing a player sees. This moves the default
          and every chain together, in one act. Rounds already open keep the rates they froze.
        </p>
      </div>

      {/* What is stored now, and where every chain stands. */}
      <div className="rounded-md border border-border/70 bg-bg-base/40 px-3 py-2 text-body-sm leading-relaxed text-text-muted space-y-1.5">
        <p>
          <strong className="text-text">Default profile:</strong> <span className="font-mono">{current.caption}</span>
          {current.model === "unreadable" ? " — the engine refuses it, so a chain that inherits it cannot open a round." : null}
        </p>
        <p>
          <strong className="text-text">{census.total} {census.total === 1 ? "chain" : "chains"}</strong>
          {census.total > 0 ? ":" : " yet."}{" "}
          {Object.entries(census.byModel).map(([m, n], i) => (
            <span key={m}>{i > 0 ? " · " : ""}{n} {MODEL_WORD[m as FeeModel | "unreadable"] ?? m}</span>
          ))}
        </p>
        {census.total > 0 ? (
          <ul className="space-y-0.5">
            {CHAIN_STATES_IN_ORDER.map((s) => {
              const row = census.byState[s];
              if (!row || row.total === 0) return null;
              return (
                <li key={s}>
                  {STATE_WORD[s] ?? s} · {row.total}:{" "}
                  {Object.entries(row.byModel).map(([m, n], i) => (
                    <span key={m}>{i > 0 ? " · " : ""}{n} {MODEL_WORD[m as FeeModel | "unreadable"] ?? m}</span>
                  ))}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      <form ref={formRef} {...formProps} onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Fee model (every chain)">
            <Select
              ariaLabel="Fee model for the Up & Down default and every chain"
              size="sm"
              value={model}
              onChange={setModel}
              disabled={locked}
              disabledReason={!mayAct ? disabledReason : lawShut ?? undefined}
              options={[
                { value: "loser-share", label: "Loser-share — % of the losing pool" },
                { value: "stake-share", label: "Stake-share — % of every stake", disabled: !lawLive, ...(lawShut ? { hint: lawShut } : {}) },
                { value: "capped-commission", label: "Capped commission — % of the pool, capped" },
              ]}
            />
          </Field>
          {pool ? (
            <>
              <Field label={model === "stake-share" ? "Platform fee (% of every stake)" : "Platform fee (% of the losing pool)"}>
                <Input name="platformFeeRate" type="number" step="0.01" min="0" max="100" defaultValue={pctText(defaultProfile.platformFeeRate)} mono disabled={locked} />
              </Field>
              <Field label={model === "stake-share" ? "Operator fee (% of every stake)" : "Operator fee (% of the losing pool)"}>
                <Input name="operatorFeeRate" type="number" step="0.01" min="0" max="100" defaultValue={pctText(defaultProfile.operatorFeeRate)} mono disabled={locked} />
              </Field>
            </>
          ) : (
            <p className="text-body-sm text-text-muted md:col-span-1">
              Capped commission keeps the default profile&apos;s own commission and ceiling.
            </p>
          )}
        </div>
        {model === "stake-share" ? (
          <p className="text-body-sm text-text-muted">
            No winning tax is set here: each round takes the platform&apos;s saved winning tax when it opens (above).
          </p>
        ) : null}
        <Field label="Reason (goes on the audit record)" hint="A sentence: why every chain moves now.">
          <Textarea name="reason" rows={2} disabled={locked} />
        </Field>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button type="submit" variant="primary" loading={pending} disabled={locked} title={!mayAct ? disabledReason : lawShut ?? undefined}>
            Apply to every chain…
          </Button>
          {lawShut ? <p className="text-body-sm text-text-subtle">{lawShut}</p> : null}
        </div>
      </form>

      <UnsavedChangesGuard
        dirty={dirty && !locked}
        body="The Up & Down fee profile has been changed but not applied. Leaving now discards the change."
      />

      <ConfirmModal
        open={counts !== null}
        onClose={() => setCounts(null)}
        onConfirm={apply}
        loading={pending}
        title="Apply to every chain?"
        body={counts ? (
          <div className="space-y-2">
            <p>
              The Up &amp; Down default and <strong>{counts.moved} of {counts.total}</strong> chains move to{" "}
              <strong>{MODEL_WORD[counts.model]}</strong>; the rest are on it already and keep their own rates.
            </p>
            <ul className="space-y-0.5">
              {CHAIN_STATES_IN_ORDER.map((s) => {
                const row = counts.byState[s];
                return row && row.total > 0 ? (
                  <li key={s}>{STATE_WORD[s] ?? s}: {row.moved} of {row.total} move</li>
                ) : null;
              })}
            </ul>
            <p>Each chain&apos;s next round freezes the new profile. Rounds already open keep the rates they froze.</p>
          </div>
        ) : null}
        confirmLabel="Apply to every chain"
        tone="warning"
        tier="medium"
      />
    </div>
  );
}
