"use client";

/**
 * Up & Down admin controls.
 *
 * KIT-ONLY. Every control here is a kit primitive (`Input`, `Select`, `Toggle`,
 * `ConfirmDialog`, `.btn`, `.chip`) or the same hand-rolled idiom the neighbouring
 * admin pages already use. Nothing is invented locally — if a control is needed that
 * the kit lacks, it gets added to the kit and used everywhere, never forked here.
 *
 * Interaction contract, matching the rest of admin:
 *  · every mutation goes through useTransition + useDeferredToast, so success toasts
 *    fire on the falling edge of pending (when router.refresh() commits), not on a
 *    setTimeout;
 *  · a consequential action confirms through the kit `ConfirmDialog` — never the
 *    native browser confirm();
 *  · server refusals are shown VERBATIM. The service layer explains exactly why
 *    (e.g. "Stop this asset's 2 running chain(s) first"), and rewriting that into a
 *    generic "failed" would throw away the only useful part.
 */

import { useTransition, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDeferredToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ConfirmModal } from "@/components/ui/modal";
import {
  createAssetAction, toggleAssetAction, updateAssetAction,
  createChainAction, setChainStateAction, updateChainAction, generateRoundAction,
  updateThresholdsAction, updateReadingMethodAction,
} from "./actions";
import { ALLOWED_DURATIONS } from "@/lib/updown-durations";
// ⛔ Same rule as the durations above: the reading-method dropdown is rendered from the shared
// provider list, never a literal array in this file. A hand-copied list is how a server comes
// to accept a value no screen can ask for.
import { FEED_PROVIDERS, findProvider, type FeedProviderId } from "@/lib/updown-providers";
/**
 * ⛔ THE READINESS ARRIVES AS PROPS, COMPUTED ON THE SERVER — it is NOT imported here.
 *
 * `symbolReadiness` lives in `lib/server/updown-symbols.ts`, which reaches the market calendar
 * and the whole symbol catalogue. Importing it from a `"use client"` file would pull all of that
 * into the browser bundle — the exact failure `updown-durations.ts` and `updown-providers.ts`
 * were created as no-imports modules to avoid.
 *
 * ⭐ And it keeps the guarantee that matters: the level and reason shown here are produced by
 * the SAME function `createChain` refuses with, so the greyed option and the server's refusal
 * are one answer rather than two that can drift.
 */
export type DurationReadiness = { minutes: number; level: 1 | 2 | 3; mark: string; reason: string };

// ⛔ E-62 · ONE SOURCE FOR THE DURATIONS — see `src/lib/updown-durations.ts`. This was a
// hand-copied `[5, 15, 30]`; a duration added server-side would have been unreachable here.
const DURATIONS = ALLOWED_DURATIONS;
const ICONS = ["gold", "silver", "platinum", "copper", "oil", "fx", "crypto"] as const;
const CATEGORIES = ["macro", "crypto", "other"] as const;

/** Shared label shell — one definition, used by every field on this page. */
function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle mb-1">{label}</span>
      {children}
    </label>
  );
}

// ── Asset enable/disable ─────────────────────────────────────────────────────

export function ToggleAsset({ id, enabled, label }: { id: string; enabled: boolean; label: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);
  const onClick = () => {
    start(async () => {
      try {
        const fd = new FormData();
        fd.set("id", id);
        fd.set("enabled", String(!enabled));
        const r = await toggleAssetAction(fd);
        if (!r.ok) {
          // Verbatim: the service says WHY (source no longer trusted / chains still
          // running), and that reason is the actionable part.
          toast({ title: `Couldn't ${enabled ? "disable" : "enable"} ${label}`, description: r.error, variant: "danger" });
          return;
        }
        router.refresh();
        deferToast({ title: enabled ? `${label} disabled` : `${label} enabled`, variant: "success" });
      } catch {
        toast({ title: "Couldn't update asset", variant: "danger" });
      }
    });
  };
  return <Toggle on={enabled} onClick={onClick} disabled={pending} aria-label={`Toggle ${label} enabled`} />;
}

// ── Asset EDIT — finding E-31 ────────────────────────────────────────────────

/**
 * Edit an existing asset: its symbol, names, precision and — the one that matters —
 * its PRICE SOURCE.
 *
 * 🔴 WHY THIS EXISTS (E-31, live QA campaign 2026-08-02). `updateAssetAction` was
 * written, gated on `accounting`, and audited — and `grep -rn` found exactly one
 * reference to it: its own definition. No form, no button, no route. So the link that
 * real money settles against **could not be changed through the product at all**.
 * That is E-23's shape exactly ("a remedy that only exists in a script is not a remedy
 * an operator has"), and it bit on the critical path: driving the price feed live, the
 * GOLD asset could not be moved off `goldprice.org` — an HTML page the feed reader can
 * never quote — and the only alternative would have been hand-writing the live database
 * on the control that decides what settles real money.
 *
 * ⚠️ THE SOURCE LOCK IS THE SERVICE'S JOB, NOT THIS FORM'S. `updateAsset` refuses while
 * any round on the asset is unresolved, because a round resolves against the link it
 * captured at open; the refusal names the rounds and the money riding on them, and it is
 * shown VERBATIM. Do not pre-empt it here — a client-side guess at that state would be a
 * second source of truth about money.
 */
export function EditAssetForm({
  id, symbol, nameEn, nameSw, priceSourceUrl, decimals, minMoveTicks, label,
}: {
  id: string; symbol: string; nameEn: string; nameSw: string;
  priceSourceUrl: string; decimals: number; minMoveTicks: number; label: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);
  const [open, setOpen] = useState(false);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("id", id);
    start(async () => {
      const r = await updateAssetAction(fd);
      if (!r.ok) {
        toast({ title: `Couldn't update ${label}`, description: r.error, variant: "danger" });
        return;
      }
      setOpen(false);
      router.refresh();
      deferToast({
        title: `${label} updated`,
        description: "Rounds already open keep the source they captured; the next round captures the new one.",
        variant: "success",
      });
    });
  };

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)} variant="ghost" size="sm">
        Edit
      </Button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-border bg-bg-elevated p-4 space-y-3 text-left">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle">Edit {label}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Symbol"><Input name="symbol" defaultValue={symbol} size="sm" /></Field>
        <Field label="Name (EN)"><Input name="nameEn" defaultValue={nameEn} size="sm" /></Field>
        <Field label="Name (SW)"><Input name="nameSw" defaultValue={nameSw} size="sm" /></Field>
        <Field label="Decimals"><Input name="decimals" type="number" defaultValue={String(decimals)} min="0" max="8" size="sm" /></Field>
        {/* ⛔ `min="2"`, NOT 1. The server floor is `MIN_MOVE_TICKS_FLOOR = 2`, so a form that
            accepts 1 offers a value that is refused on submit — the operator types a number,
            presses save and is told no, with no way to know that in advance. A control must not
            offer what the thing behind it will reject. */}
        <Field label="Min move (ticks)"><Input name="minMoveTicks" type="number" defaultValue={String(minMoveTicks)} min="2" size="sm" /></Field>
        <Field label="Price source URL" className="sm:col-span-2">
          <Input name="priceSourceUrl" defaultValue={priceSourceUrl} size="sm" />
        </Field>
      </div>
      <p className="text-[11.5px] leading-[1.55] text-text-subtle max-w-[80ch]">
        The host must be an <strong>enabled trusted source in this asset&rsquo;s own category</strong> —
        the allowlist is per category, so one domain approved for <span className="font-mono text-[11px]">macro</span>{" "}
        does not cover a <span className="font-mono text-[11px]">crypto</span> asset. The source cannot be
        changed while any round on this asset is still unresolved; pause its chains and let them settle first.
      </p>
      <div className="flex gap-2">
        <Button type="submit" loading={pending} variant="primary" size="md">
          {pending ? "Saving…" : "Save asset"}
        </Button>
        <Button type="button" onClick={() => setOpen(false)} variant="ghost" size="md">Cancel</Button>
      </div>
    </form>
  );
}

// ── Chain EDIT — finding E-31, and the half that blocks E-32 ─────────────────

/**
 * Edit a chain's stake bounds and its winning MARGIN.
 *
 * 🔴 The same orphan as `EditAssetForm` above, and this is the half that turned a
 * one-field change into a delete-and-recreate. `updateChainAction` existed with zero
 * callers, so a chain's margin was fixed **at creation, forever**.
 *
 * ⚠️ WHY THAT MATTERS RIGHT NOW (E-32). `defaultMarginBps` is 50 = 0.5% for every
 * duration and asset class. On BTC at ~63,250 that demands a ±$316 move inside five
 * minutes: measured on production, two real rounds that moved 0.168% and 0.047% both
 * resolved cleanly at margin 0 and would BOTH have voided at the default — i.e. a chain
 * on the default fills its history with `no-move` voids while the feed works perfectly,
 * which is indistinguishable from E-16. Tuning that per chain is the remedy, and until
 * this form existed there was no way to apply it.
 *
 * ⚠️ `marginPct` is sent even when blank, deliberately. `updateChainAction` only touches
 * the margin when the field is PRESENT (blank-but-present = inherit the default), so
 * omitting it would make "clear this override" unexpressible.
 */
export function EditChainForm({
  id, label, minStake, maxStake, marginBps, inheritMarginBps,
}: {
  id: string; label: string;
  minStake: number | null; maxStake: number | null;
  marginBps: number | null;
  /** What a BLANK margin box inherits for this chain — the E-32 ladder rung for its asset
   *  class and duration, else the flat product default. ⚠️ Not `cfg.defaultMarginBps`: on
   *  every chain the platform actually runs those two now differ (0.02-0.05% vs 0.50%), and
   *  a placeholder showing the wrong one tells an operator the band is 25x what it is. */
  inheritMarginBps: number;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);
  const [open, setOpen] = useState(false);
  // ⚠️ Still named `marginPct` and still carrying a PERCENTAGE, because `updateChainAction`
  // reads that field and nothing else. Renaming it to `marginBpsChoice` to match the add form
  // would have submitted a field the action ignores — the dropdown would have LOOKED like it
  // worked and the margin would silently never have changed. Same control, same shape, same
  // wire name: the SHAPE was what was wrong, not the name.
  const [marginPct, setMarginPct] = useState(marginBps != null ? (marginBps / 100).toFixed(2) : "");

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("id", id);
    start(async () => {
      const r = await updateChainAction(fd);
      if (!r.ok) {
        toast({ title: `Couldn't update ${label}`, description: r.error, variant: "danger" });
        return;
      }
      setOpen(false);
      router.refresh();
      deferToast({
        title: `${label} updated`,
        description: "Rounds already open keep the margin and bounds they froze at open.",
        variant: "success",
      });
    });
  };

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)} variant="ghost" size="sm">
        Edit
      </Button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-border bg-bg-elevated p-4 space-y-3 text-left">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle">Edit {label}</p>
      {/* ⛔ NO VIEWPORT BREAKPOINT HERE. This panel renders inside the LAST TABLE CELL of a chain
          row — about 390px wide — but `sm:grid-cols-3` responds to the 1440px VIEWPORT, not to the
          space the panel actually has. So it laid three columns into 390px and the band dropdown
          rendered as "Sma…": the operator could not read which band was selected on the one
          control that decides what winning means. Found by LOOKING at the screenshot taken for the
          operator guide, not by any check. Stacked, because stacked is what fits. */}
      <div className="grid grid-cols-1 gap-3">
        {/* ⛔ THE SAME DROPDOWN AS THE ADD FORM. This was a typed percentage while the add form
            next to it was already a dropdown — one control in two shapes, which is the drift
            "one control, one place" exists to stop. An operator who cannot type a bad band into
            a NEW chain could still type it into an existing one, which is the more dangerous of
            the two because that chain already has players on it. */}
        <Field label="Winning band">
          <Select
            name="marginPct"
            value={marginPct}
            onChange={setMarginPct}
            options={[
              { value: "", label: `Inherit · ${inheritMarginBps === 0 ? "smallest possible step" : `${(inheritMarginBps / 100).toFixed(2)}%`}`,
                hint: "Follows the product setting, so changing that setting once changes every chain that inherits it." },
              ...MARGIN_CHOICES.map((m) => ({
                value: (m.bps / 100).toFixed(2), label: m.label, hint: m.hint,
              })),
            ]}
          />
        </Field>
        <Field label="Min stake (blank = inherit)">
          <Input name="minStake" type="number" size="sm" defaultValue={minStake != null ? String(minStake) : ""} placeholder="inherit" />
        </Field>
        <Field label="Max stake (blank = inherit)">
          <Input name="maxStake" type="number" size="sm" defaultValue={maxStake != null ? String(maxStake) : ""} placeholder="inherit" />
        </Field>
      </div>
      {/* ⛔ THIS PARAGRAPH WARNED AGAINST THE CURRENT DESIGN. It said 0 "lets a single tick
          decide real money" — written when an asset could carry `minMoveTicks: 1`. It cannot
          any more (`MIN_MOVE_TICKS_FLOOR = 2`, and gold carries 40 measured ticks), 0 is the
          live default, and the smallest band is the deliberate choice that took the pay rate
          from 63% to ~99%. Help text that argues against the recommended option is worse than
          none: it teaches the operator to pick the one that refunds every round. */}
      <p className="text-[11.5px] leading-[1.55] text-text-subtle max-w-[80ch]">
        The band is the winning distance: <strong>UP at open + band, DOWN at open − band</strong>, and a close
        anywhere between the two refunds every stake and earns no fee. A band wider than the asset actually
        moves in one round refunds nearly every round <em>even when the price feed is working perfectly</em> —
        measured on production, 0.50% needs a ±$316 move on BTC inside five minutes and refunded 5 rounds out
        of 5. <strong>The smallest possible step is the recommendation</strong>: it is the asset&rsquo;s own
        minimum move, which is 2 ticks on BTC and 40 on gold — never one, so no round can be decided by
        rounding. Changes affect FUTURE rounds only; rounds already open keep what they froze at open.
      </p>
      <div className="flex gap-2">
        <Button type="submit" loading={pending} variant="primary" size="md">
          {pending ? "Saving…" : "Save chain"}
        </Button>
        <Button type="button" onClick={() => setOpen(false)} variant="ghost" size="md">Cancel</Button>
      </div>
    </form>
  );
}

// ── Chain run / pause / stop ─────────────────────────────────────────────────

export function ChainStateControls({
  id, state, label,
}: { id: string; state: "RUNNING" | "PAUSED" | "STOPPED"; label: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);

  const go = (next: "RUNNING" | "PAUSED" | "STOPPED") => {
    start(async () => {
      try {
        const fd = new FormData();
        fd.set("id", id);
        fd.set("state", next);
        const r = await setChainStateAction(fd);
        if (!r.ok) {
          toast({ title: `Couldn't change ${label}`, description: r.error, variant: "danger" });
          return;
        }
        router.refresh();
        deferToast({
          title: next === "RUNNING" ? `${label} started` : next === "PAUSED" ? `${label} paused` : `${label} stopped`,
          description: next === "RUNNING" ? undefined : "Rounds already open settle normally.",
          variant: next === "RUNNING" ? "success" : "warning",
        });
      } catch {
        toast({ title: "Couldn't change chain state", variant: "danger" });
      }
    });
  };

  /**
   * ⭐ E-67 · GENERATE ROUND — the control that replaced automatic emission.
   *
   * Ali, 2026-08-03: *"my admins will enter and generate every 5 min… sometimes we might not
   * generate, other times we would."* Every chain is STOPPED, so this is how a round is born.
   *
   * ⛔ The refusal is shown VERBATIM and it is the useful half. `generateRoundNow` refuses when
   * the market is shut, when a round is already live, or — the one that matters — when the
   * price cannot be READ, and it says which. Under the automatic path that last case opened a
   * priceless round anyway and voided it (E-63); here the operator is simply told, and no round
   * exists to mislead a player.
   */
  // Which action is in flight. `pending` is shared by every control in this row (one
  // `useTransition`), so on its own it cannot say WHICH button to label. Generating takes
  // several seconds of real provider time — the price is read before the round is written —
  // and a spinner with an unchanged label leaves the operator guessing whether the click
  // landed. That is the same complaint E-64 is about, one surface up.
  const [busy, setBusy] = useState<null | "generate">(null);

  const generate = () => {
    setBusy("generate");
    start(async () => {
      try {
        const fd = new FormData();
        fd.set("chainId", id);
        const r = await generateRoundAction(fd);
        if (!r.ok) {
          toast({ title: `No round created for ${label}`, description: r.error, variant: "danger" });
          return;
        }
        router.refresh();
        deferToast({
          title: `${label} — round open`,
          description: r.openPrice != null
            ? `Opened at ${r.openPrice}. Closes ${new Date(r.closesAt).toLocaleTimeString()}.`
            : undefined,
          variant: "success",
        });
      } catch {
        toast({ title: "Couldn't generate a round", variant: "danger" });
      } finally {
        // On every path — a refusal and a throw both end the spinner, or the button would sit
        // labelled "Reading price…" over a request that already failed.
        setBusy(null);
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* First, because it is now the action an operator comes to this page to perform.
          `loading` disables the button, sets aria-busy and swaps in the kit spinner, so a
          double-click cannot open two rounds; the label says which of the two slow steps is
          running, because "did my click register?" is exactly the doubt E-64 was filed about. */}
      <Button type="button" onClick={generate} loading={pending && busy === "generate"} variant="primary" size="sm">
        {pending && busy === "generate" ? "Reading price…" : "Generate round"}
      </Button>
      {state !== "RUNNING" && (
        <Button type="button" onClick={() => go("RUNNING")} loading={pending} variant="ghost" size="sm">
          {state === "PAUSED" ? "Resume" : "Start"}
        </Button>
      )}
      {state === "RUNNING" && (
        <Button type="button" onClick={() => go("PAUSED")} loading={pending} variant="ghost" size="sm">
          Pause
        </Button>
      )}
      {state !== "STOPPED" && (
        <ConfirmDialog
          trigger={
            <button
              type="button"
              disabled={pending}
              className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-subtle hover:text-no-300 transition-colors px-2 py-1.5"
            >
              Stop
            </button>
          }
          title={`Stop ${label}?`}
          body="No new rounds will open. Rounds already open keep running and settle normally — no player is left holding an unsettled stake. You can start it again at any time."
          confirmLabel="Stop chain"
          tone="claret"
          onConfirm={() => go("STOPPED")}
        />
      )}
    </div>
  );
}

// ── Add asset ────────────────────────────────────────────────────────────────

/**
 * ADD ASSET — guided, so the three configurations that broke production cannot be typed.
 *
 * ⛔ WHAT THIS REPLACED, and why (findings E-45 / E-46). The old form took the SYMBOL as
 * free text, the CATEGORY as an unrelated dropdown, and the SOURCE URL as free text. In
 * one afternoon on production that produced `ETH` (not `ETH/USD`) pointed at coingecko —
 * 100% void, 27 of 27 rounds — and `BNB` filed as `macro`, so the FX/metals calendar shut
 * a 24/7 coin every weekend. Neither was rejected, and neither was visible until rounds
 * had already run and voided.
 *
 * Now: pick an asset class, then a symbol. Everything the symbol determines — category,
 * names, icon, decimals, source URL — is FILLED AND LOCKED from the catalogue, and the
 * form runs the real feed probe before you can add it. The category field is deliberately
 * NOT editable: it selects the trading calendar, so it is a property of the instrument.
 *
 * ⚠️ The server enforces the same rule in `createAsset` via `validateSymbolCategory`.
 * This form is the courtesy; that is the control.
 */
type SymbolOption = {
  symbol: string; suggestedKey: string; nameEn: string; nameSw: string; nameZh: string;
  category: string; iconKey: string; decimals: number; minMoveTicks: number;
  group: string; unsupported?: string;
  /**
   * ⭐ THE SAME ①②③ SIGNAL THE DURATION LIST CARRIES, on the symbol itself.
   *
   * ⛔ An operator picking an asset should not have to open a SECOND dropdown to discover the
   * first one was a bad idea. Driven live 2026-08-04: the asset list showed "XAU · Gold" with
   * no mark at all, and only the duration list revealed that gold cannot run below 15 minutes.
   * The warning belongs at the moment of the choice, not one step after it.
   */
  mark?: string;
  readinessLevel?: 1 | 2 | 3;
  readinessReason?: string;
  /** Shortest round this symbol may run, when the symbol itself is the limit. */
  minDurationMinutes?: number;
};
type SymbolCheck = {
  verdict?: "would-confirm" | "stale" | "market-closed" | "unreadable" | "error";
  supported?: boolean; reason?: string; hours?: string; marketOpen?: boolean;
  opensAt?: string | null; closureDetail?: string | null;
  price?: number; quotedAt?: string; skewSec?: number | null;
  maxStalenessSeconds?: number; detail?: string; error?: string;
};

export function AddAssetForm({ catalogue }: { catalogue: SymbolOption[] }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);
  const [open, setOpen] = useState(false);

  const groups = [...new Set(catalogue.map((s) => s.group))];
  const [group, setGroup] = useState(groups[0] ?? "Crypto");
  const inGroup = catalogue.filter((s) => s.group === group);
  const [symbol, setSymbol] = useState(inGroup[0]?.symbol ?? "");
  const spec = catalogue.find((s) => s.symbol === symbol);
  const [key, setKey] = useState(spec?.suggestedKey ?? "");
  const [check, setCheck] = useState<SymbolCheck | null>(null);
  const [checking, setChecking] = useState(false);

  // Changing the asset class re-points the symbol, which re-points everything else.
  // Without this the form can sit on a symbol that is not in the visible group — the
  // cascading-dropdown bug that makes a "guided" form worse than a free-text one.
  const pickGroup = (g: string) => {
    setGroup(g);
    const first = catalogue.find((s) => s.group === g);
    setSymbol(first?.symbol ?? "");
    setKey(first?.suggestedKey ?? "");
    setCheck(null);
  };
  const pickSymbol = (s: string) => {
    setSymbol(s);
    setKey(catalogue.find((x) => x.symbol === s)?.suggestedKey ?? "");
    setCheck(null);
  };

  /** Ask the REAL feed, through the same functions the money path uses. */
  const runCheck = async () => {
    if (!symbol) return;
    setChecking(true);
    try {
      const res = await fetch(`/api/admin/updown/symbol-check?symbol=${encodeURIComponent(symbol)}`);
      setCheck(await res.json());
    } catch (e) {
      setCheck({ verdict: "error", detail: String(e).slice(0, 160) });
    } finally { setChecking(false); }
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    start(async () => {
      const r = await createAssetAction(fd);
      if (!r.ok) {
        toast({ title: "Could not add asset", description: r.error, variant: "danger" });
        return;
      }
      form.reset();
      setOpen(false);
      router.refresh();
      deferToast({ title: "Asset added", description: "It starts disabled — enable it when the source is confirmed.", variant: "success" });
    });
  };

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)} variant="primary" size="md">
        + Add asset
      </Button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-border bg-bg-elevated p-4 space-y-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle">Add tradable asset</p>

      {/* ── The two choices an operator actually makes ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Asset class">
          <Select
            value={group} onChange={pickGroup} size="sm" ariaLabel="Asset class"
            options={groups.map((g) => ({ value: g, label: g }))}
          />
        </Field>
        <Field label="Symbol">
          <Select
            value={symbol} onChange={pickSymbol} size="sm" ariaLabel="Symbol to quote"
            // ⭐ The mark and the reason travel WITH the option, and a symbol the platform
            // cannot feed is greyed rather than merely labelled "unavailable" — a label an
            // operator can still select is not a control.
            options={inGroup.map((s) => ({
              value: s.symbol,
              label: `${s.mark ?? ""} ${s.symbol} · ${s.nameEn}`.trim(),
              disabled: s.readinessLevel === 3,
              hint: s.readinessReason ||
                (s.minDurationMinutes ? `Rounds of ${s.minDurationMinutes} minutes or longer only.` : undefined),
            }))}
          />
        </Field>
        <Field label="Key (yours, never renamed)">
          <Input name="key" required value={key} onChange={(e) => setKey(e.currentTarget.value.toUpperCase())} size="sm" />
        </Field>
      </div>

      {/* Everything the SYMBOL determines. Shown so it is auditable, posted as hidden
          fields so it cannot be edited into disagreement with the symbol. */}
      {spec && (
        <>
          <input type="hidden" name="symbol" value={spec.symbol} />
          <input type="hidden" name="category" value={spec.category} />
          <input type="hidden" name="iconKey" value={spec.iconKey} />
          <input type="hidden" name="nameEn" value={spec.nameEn} />
          <input type="hidden" name="nameSw" value={spec.nameSw} />
          <input type="hidden" name="nameZh" value={spec.nameZh} />
          <input type="hidden" name="decimals" value={spec.decimals} />
          <input type="hidden" name="minMoveTicks" value={spec.minMoveTicks} />
          <input type="hidden" name="priceSourceUrl" value="https://api.twelvedata.com/quote" />

          <div className="rounded-lg border border-border bg-bg p-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle mb-2">
              Set by the symbol — not editable
            </p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11.5px] sm:grid-cols-3">
              <div><dt className="text-text-subtle">Category</dt><dd className="font-mono">{spec.category}</dd></div>
              <div><dt className="text-text-subtle">Name</dt><dd>{spec.nameEn} · {spec.nameSw} · {spec.nameZh}</dd></div>
              <div><dt className="text-text-subtle">Decimals</dt><dd className="font-mono">{spec.decimals}</dd></div>
              <div><dt className="text-text-subtle">Min move</dt><dd className="font-mono">{spec.minMoveTicks} tick</dd></div>
              <div className="col-span-2"><dt className="text-text-subtle">Price source</dt>
                <dd className="font-mono text-[10.5px] break-all">https://api.twelvedata.com/quote</dd></div>
            </dl>
            <p className="mt-2 text-[11px] leading-[1.55] text-text-subtle max-w-[80ch]">
              <strong>The category decides the trading calendar</strong>, so it belongs to the instrument, not to
              you — <span className="font-mono text-[10.5px]">crypto</span> is 24/7, everything else follows the
              FX/metals week. A coin filed as <span className="font-mono text-[10.5px]">macro</span> is shut every
              weekend for no reason, which is exactly what happened to BNB.
            </p>
          </div>

          {spec.unsupported && (
            <div className="rounded-lg border border-danger-border bg-danger-bg p-3 text-[12px] leading-[1.55] text-danger-fg">
              <strong>{spec.symbol} cannot be used.</strong> {spec.unsupported}
            </div>
          )}

          {/* ── Trading hours, stated before anything is created ── */}
          <div className="rounded-lg border border-border bg-bg p-3 text-[11.5px] leading-[1.6] text-text-subtle max-w-[85ch]">
            <strong className="text-text">When this asset can settle rounds.</strong>{" "}
            {spec.category === "crypto"
              ? `${spec.symbol} trades 24/7 — rounds can run at any hour, weekends included.`
              : `${spec.symbol} follows the FX/metals week: it opens Sunday 22:00 UTC (Monday 01:00 EAT) and closes Friday 21:00 UTC (Saturday 00:00 EAT), and is shut all Saturday. While it is shut the platform refuses to open or read a round, so you will see NO RESULTS AT ALL until it reopens — that is deliberate, not a fault.`}
          </div>

          {/* ── THE PRE-FLIGHT. E-45: this is the check nothing in the console could do. ── */}
          <div className="rounded-lg border border-border bg-bg p-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" onClick={runCheck} loading={checking} variant="secondary" size="sm">
                {checking ? "Checking the live feed…" : "Check the live feed"}
              </Button>
              <span className="text-[11px] text-text-subtle">
                Asks the real provider, through the same functions that settle money.
              </span>
            </div>

            {check?.verdict === "would-confirm" && (
              <p className="text-[12px] leading-[1.55] text-success-fg">
                <strong>Would confirm.</strong> {spec.symbol} quoted{" "}
                <span className="font-mono">{check.price}</span> at{" "}
                <span className="font-mono">{check.quotedAt?.slice(11, 19)}Z</span> — skew{" "}
                <strong>{check.skewSec}s</strong> against the {check.maxStalenessSeconds}s window.
                This asset can settle rounds now.
              </p>
            )}
            {check?.verdict === "stale" && (
              <p className="text-[12px] leading-[1.55] text-danger-fg">
                <strong>Readable, but too slow — do not arm this.</strong> The provider&rsquo;s quote for{" "}
                {spec.symbol} is <strong>{check.skewSec}s</strong> old against a{" "}
                {check.maxStalenessSeconds}s window, so a round cannot confirm its opening price and{" "}
                <strong>every round will void and refund</strong> while looking perfectly healthy. This is
                exactly what SOL did — 100% void, 8 of 8. Either the plan needs a faster feed for this
                symbol, or the staleness window has to change (platform-wide), or pick another symbol.
              </p>
            )}
            {check?.verdict === "market-closed" && (
              <p className="text-[12px] leading-[1.55] text-warning-fg">
                <strong>The market is shut right now, so the feed cannot be judged.</strong>{" "}
                {check.closureDetail ?? ""} It reopens{" "}
                <span className="font-mono">{check.opensAt?.slice(0, 16).replace("T", " ")}Z</span>. Come back
                then and check again — a quote read while the market is shut proves nothing.
              </p>
            )}
            {(check?.verdict === "unreadable" || check?.verdict === "error") && (
              <p className="text-[12px] leading-[1.55] text-danger-fg">
                <strong>The provider could not quote {spec.symbol}.</strong> {check.detail ?? check.error ?? ""}{" "}
                An asset the feed cannot read voids every round — this is what ETH on coingecko did, 27 of 27.
              </p>
            )}
            {check?.supported === false && (
              <p className="text-[12px] leading-[1.55] text-danger-fg"><strong>Unavailable.</strong> {check.reason}</p>
            )}
          </div>
        </>
      )}

      <p className="text-[11.5px] leading-[1.55] text-text-subtle max-w-[80ch]">
        The source domain must already be an <strong>enabled trusted source</strong> in the matching category — a round
        captures this exact link when it opens and resolves against the same link. Add it at{" "}
        <span className="font-mono text-[11px]">/admin/sources</span> first if it is not there yet.
      </p>
      <p className="text-[11.5px] leading-[1.55] text-text-subtle max-w-[80ch]">
        Because a round resolves against the link it captured, <strong>the source cannot be changed while any round on
        the asset is still unresolved</strong>. To move it: pause the asset&rsquo;s chains, let the in-flight rounds
        settle, then edit — the next round captures the new link.
      </p>
      <div className="flex gap-2">
        <Button type="submit" loading={pending} variant="primary" size="md">
          {pending ? "Adding…" : "Add asset"}
        </Button>
        <Button type="button" onClick={() => setOpen(false)} variant="ghost" size="md">Cancel</Button>
      </div>
    </form>
  );
}

// ── Add chain ────────────────────────────────────────────────────────────────

/**
 * The winning bands an operator may choose, each stating its CONSEQUENCE.
 *
 * ⛔ A LIST, NOT A NUMBER FIELD (Ali's decision, 2026-08-04). The margin decides what winning
 * IS, and a free field let an operator type a band that voids every round the chain will ever
 * emit — which is E-32, the finding this console already carries scar tissue from: 0.5% on a
 * 5-minute BTC round is a ±$316 move, so the chain fills its history with `no-move` VOIDs while
 * the price feed works perfectly. Indistinguishable, from the outside, from an outage.
 *
 * ⭐ The default is the TICK FLOOR (0 bps), and the labels say what each choice does to the pay
 * rate rather than naming a percentage — because "0.02%" tells an operator nothing about whether
 * players get paid, and the measured void rate tells them everything.
 *
 * ⚠️ The percentages are from the 5,000-bar-per-asset study (§6ad); they are measured on BTC at
 * 5 minutes and are indicative for other assets, which is why each hint says "about".
 */
const MARGIN_CHOICES: ReadonlyArray<{ bps: number; label: string; hint: string }> = [
  { bps: 0, label: "Smallest possible (recommended)",
    hint: "The price only has to move one step either way. About 99 in 100 rounds pay a winner." },
  { bps: 2, label: "Narrow · 0.02%",
    hint: "About 1 round in 3 refunds instead of paying — the price has to travel further than a typical 5-minute move." },
  { bps: 5, label: "Wide · 0.05%",
    hint: "Most rounds refund. Only for a long round, or an asset that moves far in the time." },
  { bps: 50, label: "Very wide · 0.50%",
    hint: "Almost every short round refunds and earns no fee. This was the old default and it is why E-32 was filed." },
];

export function AddChainForm({
  assets, readinessByAsset, assetReadiness, marginSchedule, defaultMarginBps,
}: {
  /**
   * ⭐ `symbol` is required, not decorative: the duration dropdown's readiness is a property of
   * the SYMBOL, not of the asset row. Gold at 5 minutes is refused because XAU/USD's own feed
   * disagrees with itself by up to $0.87 at one instant — a fact about the instrument.
   */
  assets: Array<{ id: string; key: string; nameEn: string; category: string; symbol: string }>;
  /** Per asset id → what each duration's readiness is, computed on the server. */
  readinessByAsset: Record<string, DurationReadiness[]>;
  /** Per asset id → the SYMBOL's own readiness, so the asset dropdown warns at the moment of
   *  the choice rather than one dropdown later. */
  assetReadiness?: Record<string, { mark: string; level: 1 | 2 | 3; reason: string }>;
  /** The E-32 ladder, so the margin placeholder shows what THIS asset class and duration
   *  will actually inherit. It was a hard-coded "inherit (0.5)" before, which is now wrong
   *  for every combination the form can produce — and a chain created at 0.5% voids
   *  essentially every round it ever emits. */
  marginSchedule: Array<{ category: string; maxDurationMinutes: number; bps: number }>;
  defaultMarginBps: number;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);
  const [open, setOpen] = useState(false);
  // Mirrors what the picker currently shows, so the placeholder tracks the selection.
  const [assetId, setAssetId] = useState(assets[0]?.id ?? "");
  const [dur, setDur] = useState("5");
  const [marginChoice, setMarginChoice] = useState("0");

  // ⭐ THE READINESS OF EACH DURATION, FOR THE ASSET CURRENTLY PICKED. Recomputed on every
  // asset change, because it is a property of the SYMBOL: switching from Bitcoin to Gold must
  // grey 3/5/10 immediately, with gold's own measured reason attached.
  const durationOptions = (readinessByAsset[assetId] ?? []).map((r) => ({
    value: String(r.minutes),
    label: `${r.mark} ${r.minutes} min`,
    disabled: r.level === 3,
    hint: r.reason || undefined,
  }));

  // ⚠️ If the picked asset cannot run the currently-selected duration, move the selection to
  // the first one it CAN. Otherwise the form sits on a greyed option and the operator has to
  // work out for themselves that the disabled row is the one that will be submitted.
  useEffect(() => {
    const current = durationOptions.find((o) => o.value === dur);
    if (current?.disabled) {
      const firstUsable = durationOptions.find((o) => !o.disabled);
      if (firstUsable) setDur(firstUsable.value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId]);

  /** The same resolution the server does (`resolveScheduledMarginBps`): exact category
   *  before `"*"`, then the tightest window that still covers this duration. */
  const inherited = (() => {
    const cat = assets.find((a) => a.id === assetId)?.category ?? "";
    const minutes = Number(dur) || 0;
    const m = marginSchedule
      .filter((r) => (r.category === cat || r.category === "*") && minutes <= r.maxDurationMinutes)
      .sort((a, b) => (a.category === "*" ? 1 : 0) - (b.category === "*" ? 1 : 0) ||
        a.maxDurationMinutes - b.maxDurationMinutes)[0];
    return m?.bps ?? defaultMarginBps;
  })();

  if (assets.length === 0) {
    return (
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle">
        add an asset first
      </span>
    );
  }

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    start(async () => {
      const r = await createChainAction(fd);
      if (!r.ok) {
        toast({ title: "Could not add chain", description: r.error, variant: "danger" });
        return;
      }
      form.reset();
      setOpen(false);
      router.refresh();
      deferToast({ title: "Chain added", description: "It starts stopped — start it when you are ready.", variant: "success" });
    });
  };

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)} variant="primary" size="md">
        + Add chain
      </Button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-border bg-bg-elevated p-4 space-y-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-subtle">Add chain</p>
      {/* ⚠️ SIX COLUMNS, NOT FIVE, SO THE BAND CAN SAY WHICH OPTION IS RECOMMENDED (E-85).
          Five equal columns put "Smallest possible (recommended)" in the same width as a
          numeric stake box, and the kit trigger's `.truncate` clipped it to "Smallest
          possible…" — so the closed control hid the single word that tells an operator which
          band to choose, on the field that decides whether rounds pay or refund. The two
          optional stake boxes need a fraction of that room; the band gets the spare column. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {/* ⭐ THE ASSET CARRIES ITS OWN SIGNAL TOO, and this was the gap.
            Driven live: the asset list read plainly "XAU · Gold", and ONLY the duration list
            revealed that gold cannot run below 15 minutes. An operator should not have to open
            a second dropdown to learn the first choice was a bad one — the warning belongs at
            the moment of the choice. The mark here is the SYMBOL's readiness (weekend market,
            unsupported by the plan), and the hint names any minimum round length. */}
        <Field label="Asset">
          <Select name="assetId" value={assetId} onChange={setAssetId}
            options={assets.map((a) => {
              const r = assetReadiness?.[a.id];
              return {
                value: a.id,
                label: `${r?.mark ?? ""} ${a.key} · ${a.nameEn}`.trim(),
                // ⛔ An asset unusable at EVERY duration is greyed; one that is merely limited
                // stays selectable and says what the limit is.
                disabled: r?.level === 3,
                hint: r?.reason || undefined,
              };
            })} />
        </Field>
        {/* ⭐ EVERY OPTION CARRIES A NUMBERED READINESS SIGNAL, and an unusable one is GREYED
            WITH ITS REASON rather than hidden. Ali: "I don't know how knowledgeable my admins
            are in typing asset names" — and which durations an asset can honestly run is a far
            harder question than a symbol. ⛔ The levels come from `symbolReadiness`, the SAME
            function `createChain` refuses with, so the console and the money path cannot
            disagree about what is allowed. */}
        <Field label="Duration">
          <Select name="durationMinutes" value={dur} onChange={setDur} options={durationOptions} />
        </Field>
        {/* ⛔ A DROPDOWN, NOT A TYPED PERCENTAGE. This was a free number field, which let an
            operator type a band that voids every round the chain ever emits — E-32 exactly, and
            the reason that finding exists. The options are the few values that mean something,
            each stating its consequence. */}
        <Field label="Winning band" className="lg:col-span-2">
          <Select name="marginBpsChoice" value={marginChoice} onChange={setMarginChoice}
            options={MARGIN_CHOICES.map((m) => ({
              value: String(m.bps),
              label: m.label,
              hint: m.hint,
            }))} />
        </Field>
        <Field label="Min stake (optional)"><Input name="minStake" type="number" placeholder="inherit" size="sm" /></Field>
        <Field label="Max stake (optional)"><Input name="maxStake" type="number" placeholder="inherit" size="sm" /></Field>
      </div>
      {/* ⛔ NEVER PRINT A CONFIGURED NUMBER AS A LITERAL. This line said "blank inherits the
          product default (0.5%)" — a hardcoded string, while the live `defaultMarginBps` is 0,
          the tick floor. So the form told the operator the band was 0.5% when it was $0.02 on
          BTC: a 25-fold error, in the sentence whose whole job is to explain the field. The
          figure now comes from the same value the server resolves with. */}
      <p className="font-mono text-[9.5px] leading-[1.5] text-text-faint">
        The winning band is ± this much from the opening price, frozen onto each round at open.
        This chain inherits <strong>{inherited === 0 ? "the smallest possible step" : `${(inherited / 100).toFixed(2)}%`}</strong> if
        you leave it on the recommended choice. Anything between the two targets refunds every stake.
      </p>
      <div className="flex gap-2">
        <Button type="submit" loading={pending} variant="primary" size="md">
          {pending ? "Adding…" : "Add chain"}
        </Button>
        <Button type="button" onClick={() => setOpen(false)} variant="ghost" size="md">Cancel</Button>
      </div>
    </form>
  );
}

// ── Reading method — which reader produces the price money settles against ───

/**
 * The most consequential control on this page, so it is the most explicit one.
 *
 * Three UX obligations, all deliberate:
 *  1. **The consequence is shown before the save, not after.** The panel below the selects
 *     restates, in plain words, what the current selection means for a live round — because
 *     "feed / mock" tells an operator nothing about whether prices are real.
 *  2. **Choosing the simulated feed is a typed confirmation**, matching the payment-provider
 *     switch. Not a second gate for its own sake: the code refuses a simulated feed in
 *     production outright, and this stops a mis-click putting invented prices on a TEST-mode
 *     round that real staff are reading.
 *  3. **The AI method carries its measured warning inline.** It is not a hypothetical
 *     downside — it is why the feed is the default.
 */
export function ReadingMethodForm({
  observationMethod, feedProvider, twelveDataKeyPresent, maxStalenessSeconds,
}: {
  observationMethod: "feed" | "ai";
  feedProvider: FeedProviderId;
  twelveDataKeyPresent: boolean;
  maxStalenessSeconds: number;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);
  const [method, setMethod] = useState<"feed" | "ai">(observationMethod);
  const [provider, setProvider] = useState<FeedProviderId>(feedProvider);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const spec = findProvider(provider);
  const dirty = method !== observationMethod || provider !== feedProvider;
  // ⚠️ Derived from the shared spec, not from an id comparison. A new simulated or
  // key-requiring provider then arrives with its warnings already wired, instead of silently
  // bypassing the type-to-arm gate because nobody remembered to extend a literal check.
  const simulated = method === "feed" && Boolean(spec?.simulated);
  const keyMissing = method === "feed" && Boolean(spec?.needsKey) && !twelveDataKeyPresent;

  const save = () => {
    const fd = new FormData();
    fd.set("observationMethod", method);
    fd.set("feedProvider", provider);
    // The server demands this word independently; the modal's type-to-arm gate is the UX,
    // not the authority. A crafted POST without it is refused there.
    if (simulated) fd.set("confirm", "SIMULATED");
    start(async () => {
      const r = await updateReadingMethodAction(fd);
      setConfirmOpen(false);
      if (!r.ok) {
        toast({ title: "Could not change the reading method", description: r.error, variant: "danger" });
        return;
      }
      router.refresh();
      deferToast({
        title: "Reading method saved",
        description: r.warn ?? (simulated
          ? "Prices are SIMULATED — new rounds will not settle against a real market."
          : "Takes effect at the next grid boundary. Rounds already open keep their captured source."),
        variant: r.warn || simulated ? "warning" : "success",
      });
    });
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (simulated) { setConfirmOpen(true); return; }
    save();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Reading method">
          <Select
            value={method}
            onChange={(v) => setMethod(v as "feed" | "ai")}
            ariaLabel="Price reading method"
            size="sm"
            options={[
              { value: "feed", label: "Market data feed (recommended)" },
              { value: "ai", label: "AI reads the source page" },
            ]}
          />
        </Field>
        <Field label="Feed provider">
          {/* ⛔ RENDERED FROM THE SHARED LIST, never a hand-written array. This dropdown used
              to carry its own `["twelvedata", "mock"]`, so a provider added server-side was
              accepted by the action and offered by no screen — the same defect that made both
              consoles hold their own copy of the durations. One list, one answer. */}
          <Select
            value={provider}
            onChange={(v) => setProvider(v as FeedProviderId)}
            ariaLabel="Feed provider"
            size="sm"
            options={FEED_PROVIDERS.map((p) => ({ value: p.id, label: p.label }))}
          />
        </Field>
      </div>

      {/* ── What the current selection MEANS, stated before the save, not after.
             "feed / mock" tells an operator nothing about whether prices are real. ── */}
      <div
        className={
          "rounded-lg border p-3 text-[11.5px] leading-[1.55] max-w-[80ch] " +
          (simulated || keyMissing || method === "ai"
            ? "border-warning-border bg-warning-bg text-warning-fg"
            : "border-border bg-[var(--bg-inset)] text-text-subtle")
        }
      >
        {method === "ai" ? (
          <>
            <strong>AI page reading refuses almost every short round.</strong> Measured, not
            theoretical: across seven approved gold and index pages the AI returned no quoted
            timestamp at all, or a quote 9–12 hours old — one was 7.3 days old — because those
            pages render their price in JavaScript the fetch tool does not execute. At{" "}
            {maxStalenessSeconds}s staleness every 5- and 15-minute round will refuse, retry, then{" "}
            <strong>void and refund in full</strong>. Use it only for an asset no feed carries, and
            only with a staleness window that suits it.
          </>
        ) : simulated ? (
          <>
            <strong>Prices would be invented, not observed.</strong> A simulated feed is for local
            development and test money mode. It is <strong>refused outright in production</strong> —
            a live round fails its reading, then voids and refunds rather than settle on a made-up
            number.
          </>
        ) : keyMissing ? (
          <>
            <strong>TWELVEDATA_API_KEY is not set</strong>, so this provider cannot quote — and it
            will <strong>not</strong> fall back to simulated prices. Every reading refuses by name
            and rounds void and refund in full until the key is added to the Railway service
            variables.
          </>
        ) : (
          <>
            Real quotes, each carrying the provider&rsquo;s own timestamp, with the endpoint checked
            against the asset&rsquo;s approved domain and refused if further than{" "}
            {maxStalenessSeconds}s from the round boundary. This is the production setting.
          </>
        )}
      </div>

      <p className="text-[11.5px] leading-[1.55] text-text-subtle max-w-[80ch]">
        A change takes effect at the <strong>next grid boundary</strong>. Rounds already open keep
        the source link they captured and resolve against it — changing the reader never changes the
        terms of a round players have already staked on.
      </p>

      <div className="flex items-center gap-2">
        <Button type="submit" loading={pending} disabled={!dirty} variant="primary" size="md">
          {dirty ? "Save reading method" : "Saved"}
        </Button>
        {dirty && !pending && (
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={() => { setMethod(observationMethod); setProvider(feedProvider); }}
          >
            Discard
          </Button>
        )}
      </div>

      {/* Kit type-to-arm gate — the same one the payment provider switch uses for MOCK. */}
      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={save}
        title="Switch to simulated prices?"
        tone="claret"
        tier="hard"
        typedWord="SIMULATED"
        confirmLabel="Use simulated prices"
        body={
          <>
            <p>
              Every new round would open and close on an <strong>invented</strong> price. This is
              for development and test money mode only — production refuses it outright.
            </p>
            <p className="mt-2">
              Rounds already open are unaffected: they keep the source they captured.
            </p>
          </>
        }
      />
    </form>
  );
}

// ── Thresholds ───────────────────────────────────────────────────────────────

export function ThresholdsForm({
  maxStalenessSeconds, confidenceThreshold, maxObservationAttempts, defaultMinStake, defaultMaxStake, defaultMarginBps,
}: {
  maxStalenessSeconds: number; confidenceThreshold: number; maxObservationAttempts: number;
  defaultMinStake: number; defaultMaxStake: number; defaultMarginBps: number;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const { deferToast, toast } = useDeferredToast(pending);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await updateThresholdsAction(fd);
      if (!r.ok) {
        toast({ title: "Could not save thresholds", description: r.error, variant: "danger" });
        return;
      }
      router.refresh();
      deferToast({ title: "Thresholds saved", description: r.warn, variant: r.warn ? "warning" : "success" });
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Fallback margin (%)">
          <Input name="defaultMarginPct" type="number" step="0.01" min="0" max="20" defaultValue={(defaultMarginBps / 100).toFixed(2)} size="sm" />
        </Field>
        <Field label="Staleness (s)">
          <Input name="maxStalenessSeconds" type="number" defaultValue={String(maxStalenessSeconds)} min="5" max="300" size="sm" />
        </Field>
        <Field label="Confidence floor">
          <Input name="confidenceThreshold" type="number" defaultValue={String(confidenceThreshold)} min="50" max="100" size="sm" />
        </Field>
        <Field label="Max attempts">
          <Input name="maxObservationAttempts" type="number" defaultValue={String(maxObservationAttempts)} min="1" max="10" size="sm" />
        </Field>
        <Field label="Default min stake">
          <Input name="defaultMinStake" type="number" defaultValue={String(defaultMinStake)} min="1" size="sm" />
        </Field>
        <Field label="Default max stake">
          <Input name="defaultMaxStake" type="number" defaultValue={String(defaultMaxStake)} min="1" size="sm" />
        </Field>
      </div>
      <p className="text-[11.5px] leading-[1.55] text-text-subtle max-w-[80ch]">
        <strong>The margin</strong>{" "}is the ± band around each round&rsquo;s opening price. UP wins if the price
        reaches <em>open + margin</em>, DOWN if it reaches <em>open − margin</em>; a smaller move voids the round and
        refunds every stake in full. ⚠️ The box above is the <strong>fallback only</strong>: every duration this
        platform actually runs is priced by the measured ladder (E-32) — <strong>0.02%</strong> at 5 min,
        <strong>0.03%</strong> at 15, <strong>0.05%</strong> at 30 — and the fallback applies solely to a window
        longer than the ladder&rsquo;s top rung. Measured on real provider data, 0.5% voids 96&ndash;100% of rounds at
        every duration offered here; it is roughly right for a <em>one-day</em> round, because the typical move grows
        with the square root of the window. The margin is frozen onto each round at open, so a change affects only{" "}
        <strong>new</strong> rounds; override it per chain with <em>Edit</em> to tune a single asset or duration.
      </p>
      <p className="text-[11.5px] leading-[1.55] text-text-subtle max-w-[80ch]">
        <strong>Staleness</strong>{" "}is how far the source&rsquo;s own quoted time may sit from the round boundary
        before a reading is refused. A refused reading is retried; a boundary that never confirms voids its rounds and
        refunds every stake in full — we never settle on a guessed price.
      </p>
      <Button type="submit" loading={pending} variant="primary" size="md">
        {pending ? "Saving…" : "Save thresholds"}
      </Button>
    </form>
  );
}
