"use client";

/**
 * UD-13 · the board's asset/duration tabs — a FILTER, not a page reload.
 *
 * 🔴 WHAT THIS REPLACES. The tabs were plain `<Link>`s, so every filter click was a
 * full route navigation: the live board — tape, heartbeat, three cards, a countdown
 * mid-tick — fell to `loading.tsx`'s shimmer skeleton and re-entered from scratch,
 * with the countdown restarting its `--:--` pre-hydration tick. A tab that blanks
 * the screen it filters reads as a reload, not a tab.
 *
 * The navigation now runs inside `startTransition`, so Next keeps the CURRENT board
 * visible while the new one streams in; this shell dims it (`data-pending` +
 * `aria-busy`, the kit's disabled-opacity token — no new CSS) and the active chip
 * moves instantly off the pending href. `loading.tsx` still covers cold entries.
 *
 * ⚠️ Real `<Link>`s are kept underneath: modifier/middle clicks and new-tab
 * behaviour fall through to the browser (the same cases NavProgress ignores —
 * UD-10); only a plain left-click becomes a transition.
 */
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { FilterPill } from "@/components/ui/filter-pill";
import { FilterSheet, FilterSheetGroup } from "@/components/markets/filter-sheet";

export type BoardTab = { key: string; href: string; label: string };

/**
 * How long the optimistic/blocked window may last before the rail is handed back to the player.
 *
 * ⚠️ 6 SECONDS IS A CEILING, NOT A TIMING. It is not tuned to how long a board takes — a healthy
 * transition on a bad connection is well under it, so this never fires on a working navigation.
 * It exists solely so a transition that never ends cannot leave the duration rail dead for the
 * rest of the page's life. Lower it and a slow-but-fine network starts un-blocking mid-flight;
 * raise it much and a player sits in front of a dead rail long enough to leave.
 */
const PENDING_CEILING_MS = 6000;

export function UpDownBoardTabs({
  assetTabs,
  durationTabs,
  activeAssetKey,
  activeDuration,
  assetsLabel,
  durationsLabel,
  minLabel,
  sheetTitle,
  sheetLabel,
  sheetAria,
  sheetClose,
  sheetDone,
  children,
}: {
  assetTabs: BoardTab[];
  durationTabs: { d: number; href: string }[];
  activeAssetKey: string | null;
  activeDuration: number | null;
  assetsLabel: string;
  durationsLabel: string;
  minLabel: string;
  /** UD-13b · the phone sheet's own copy, from the dictionary. */
  sheetTitle: string;
  /** UD-13c · the trigger's KEY — the word for what the control does, beside the value it
   *  currently holds. Reuses `market.filtersOpen` ("Filters"), which already exists in all
   *  three languages for the /markets trigger, rather than minting a second word for it. */
  sheetLabel: string;
  sheetAria: string;
  sheetClose: string;
  sheetDone: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const go = (hrefTarget: string, blocked = false) => (e: React.MouseEvent) => {
    // Let the browser own anything that is not a plain left-click (new tab etc.).
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    /* 🔴 E-290's BLOCK WAS POINTER-ONLY, AND A KEYBOARD WALKS STRAIGHT PAST IT.
       `.kp-fchip-waiting` is `pointer-events: none` (globals.css), which stops a MOUSE from ever
       reaching the element — so this handler was never consulted on that path and nobody noticed
       it was not consulting itself. But Enter on a focused `<a>` dispatches a real click event,
       which `pointer-events` does not touch: a keyboard or screen-reader user pressed Enter on a
       greyed duration chip and fired exactly the backwards navigation E-290 exists to prevent
       (tap Ethereum, activate `5 min`, land back on Bitcoin — and UD-13f's `replace` left no
       history entry to walk back out of). ⛔ The rule now lives in the handler, where BOTH input
       paths meet, and the CSS is the visual half of it rather than the whole of it. */
    if (blocked) { e.preventDefault(); return; }
    e.preventDefault();
    setPendingHref(hrefTarget);
    /* 🔴 UD-13f (2026-09-05) · `replace`, AND `scroll: false`, BECAUSE A FILTER IS NOT A
       NAVIGATION (kit README §3). `/markets` has bound both as an explicit invariant since the
       discovery bar shipped — `<Link replace scroll={false}>`, i.e. `replaceState` — and this
       board used a plain `router.push` with default scrolling. MEASURED on production:
         · a player scrolled to `scrollY 400` to see the board, tapped one asset, and was
           thrown back to **0** — the board they were reading jumps out from under the tap;
         · two filter taps added **two history entries**, so Back no longer leaves the board,
           it walks backwards through filter states one at a time.
       ⛔ Both are the same rule, and the rule already existed and already had a call site
       obeying it. ⚠️ The `<Link>` underneath carries the same two props, so the intercepted
       path and the fallback path cannot disagree. */
    startTransition(() => router.replace(hrefTarget, { scroll: false }));
  };

  /* Optimistic `aria-current`: the chip moves the moment the tap lands, off the
     pending href — the board follows when the data does.

     🔴 UD-13d (2026-09-05) · AND THE OPTIMISM USED TO OUTLIVE THE TRANSITION, WHICH MADE THE
     RAIL LIE ABOUT THE BOARD PERMANENTLY. `pendingHref` was set on every click and cleared by
     nothing, so `pendingHref != null` won for the rest of the page's life. Tapping an ASSET
     navigates to `?asset=ETH`, which is equal to no duration href at all, so every duration
     chip read OFF — for ever, not for a frame.

     ⭐ MEASURED ON PRODUCTION, the same URL reached two ways:
       · direct load `/updown?asset=ETH` → trigger `Ethereum · 5 min`, rail `[5 min]`
       · TAP `Ethereum` on the board     → trigger `Ethereum · Duration`, rail: nothing on
       · reload                          → correct again
     The board was filtered to the 5-minute round while its own control said no duration was
     chosen. ⛔ That is a false statement about what a player is betting on, and it survived
     because a bounding box, a screenshot and every source-grepping guard all agree with it.

     ⭐ THE FIX IS TO TIE THE OPTIMISM TO THE TRANSITION THAT OWNS IT — `isPending` — rather
     than to clear the state in an effect. A `useEffect` would clear it one render LATE and
     flash the true state through; deriving it means the optimistic answer simply stops
     existing the moment React commits the new board, which is the same instant the props
     become right. There is no window in which both are wrong.

     ⚠️ AND THE PENDING HREF IS PARSED, NOT SUBSTRING-MATCHED. `includes("asset=" + key)` was
     true for any key that is a PREFIX of another (`BTC` inside a future `BTCX`), and it could
     match the `d=` segment of a different parameter. `URLSearchParams` answers the question
     that was actually being asked.
     ⚠️ An asset-only href carries no `d`, so while it is in flight the duration keeps showing
     the one the board is still on — the best available knowledge, and true a moment later in
     the overwhelming majority of cases. Never "none", which is true in none of them. */
  const pending = isPending && pendingHref != null ? new URLSearchParams(pendingHref.split("?")[1] ?? "") : null;
  const assetOn = (tab: BoardTab) =>
    pending != null ? pending.get("asset") === tab.key : tab.key === activeAssetKey;
  const durationOn = (t: { d: number; href: string }) =>
    pending != null && pending.has("d") ? Number(pending.get("d")) === t.d : t.d === activeDuration;

  /**
   * 🔴 E-290 · A DURATION CHIP MUST NOT BE PRESSABLE WHILE ITS ASSET IS STILL IN FLIGHT.
   * `durationTabs` is built by the server from the ACTIVE asset — `page.tsx:119` maps
   * `activeAsset.durations` into hrefs carrying `activeAsset.key`. So during an asset switch
   * the Assets group has already flipped to the new chip (optimistic `aria-current`) while the
   * Durations group below it still lists the OLD asset's hrefs.
   * ⛔ THE TWO-TAP FLOW THE SHEET IS DESIGNED AROUND THEN NAVIGATES BACKWARDS: tap `Ethereum`,
   * tap `5 min` inside the same round trip, and `go("/updown?asset=BTC&d=5")` fires — the
   * player lands back on Bitcoin having chosen Ethereum. ⚠️ And UD-13f's `replace` removed the
   * recovery: Back no longer walks out of it, because there is no history entry to walk.
   * ⭐ Blocking the chip is the honest answer rather than rewriting its href to the pending
   * asset: the new asset's duration LIST is exactly what has not arrived yet, so a rewritten
   * `?asset=ETH&d=60` could ask for a chain Ethereum does not run. The chips return the moment
   * the board does — one round trip — and until then they say so instead of lying.
   */
  const assetSwitching = pending != null && pending.get("asset") !== activeAssetKey;

  /**
   * 🔴 THE BLOCK ABOVE HAD NO UPPER BOUND, AND THAT IS THE REPORTED DEFECT'S MOST LIKELY SHAPE.
   *
   * `assetSwitching` is derived from `isPending`, and `isPending` stays true for as long as the
   * transition runs. `/updown` is `force-dynamic` and its render reads the DB and a price feed,
   * so on a poor mobile connection — which is most of this product's traffic — that is seconds,
   * and on a stalled or dropped RSC fetch it is **for ever**. For the whole of that window every
   * duration chip is `pointer-events: none`.
   *
   * ⭐ Ali, relaying players, 2026-09-09: *"not all timings are clickable."* That is this state,
   * described from the outside. It is intermittent because it depends on the network, it affects
   * only the DURATION rail because only that rail is blocked, and it clears on reload — which is
   * why it never reproduced for anyone looking for it.
   *
   * ⛔ SO THE OPTIMISM GETS A DEADLINE. After `PENDING_CEILING_MS` the optimistic href is
   * dropped: `pending` becomes null, the rail falls back to the props it already has, and the
   * chips come back to life. ⚠️ THAT IS THE HONEST STATE, not a guess — the board on screen is
   * still the old asset's board, so the old asset's durations are exactly what is being shown.
   * The player gets a live control back and can tap again; before this they had a dead rail and
   * no way to know why.
   *
   * ⛔ THIS IS NOT THE `useEffect` UD-13d ARGUES AGAINST. That note refuses an effect that clears
   * the optimism when the transition SUCCEEDS — correct, because it would run a render late and
   * flash the true state through. This one never fires on a healthy transition: the ceiling is an
   * order of magnitude longer than any successful navigation, so it is reached only when the
   * derivation UD-13d installed has already failed to end.
   */
  useEffect(() => {
    if (!isPending || pendingHref == null) return;
    const t = setTimeout(() => setPendingHref(null), PENDING_CEILING_MS);
    return () => clearTimeout(t);
  }, [isPending, pendingHref]);

  /* ── UD-13b · WHAT THE PHONE SHOWS INSTEAD ────────────────────────────────────────────
     🔴 THE DEFECT, MEASURED ON PRODUCTION 2026-08-25 BEFORE ANY CODE MOVED. At 360 and 414
     these two rails wrap to FOUR rows of chips — 100px of assets over 96px of durations,
     **196px** — and the first game card sits at **top 652 of a 900px viewport**. Seventy-two
     percent of the first screen is spent on filters before a single round is visible. At 768
     and 1280 both rails are a single 44px row (88px total) and there is nothing wrong with
     them, which is why the split below is at `sm` and not at `lg`.

     ⭐ THIS INVENTS NOTHING. `FilterSheet` already exists and is already the phone home for the
     /markets filters; the pills inside are the same `FilterPill` the rails render. The only new
     thing is the composition — and the trigger's label.

     ⚠️ THE TRIGGER NAMES THE ACTIVE SELECTION, and that is the requirement, not decoration. A
     collapsed filter whose trigger says only "Filters" is WORSE than four rows of visible chips,
     because the player loses the answer to "what am I looking at?". Both axes always carry a
     value on this board, so the trigger always reads e.g. `Bitcoin · 3 min`.

     🔴 UD-13c (2026-09-05) · AND NAMING THE SELECTION IS EXACTLY WHY PLAYERS STOPPED SEEING IT.
     Ali, from real reports: *"users are reporting they are not noticing that there is a filter
     … we want, as he sees maybe Bitcoin for example, he knows that there is a filter and other
     options to select."* Both facts are true at once and they are not in tension: the label was
     right and the AFFORDANCE was missing. `⚙ Bitcoin · 5 min` in a hug pill sits under a tape
     reading `BITCOIN $79,811.94` and over a card reading `Bitcoin Up & Down · 5 MIN`, so it
     reads as a third caption — and an OUTLINED pill is this product's own word for "selected"
     (`.kp-fchip[data-on]`), so the one control on the screen wore the costume of a settled
     answer. It also had no caret, while every other disclosure in the product has one.

     ⭐ SO THE VALUE STAYS AND THE SHAPE CHANGES: `label` is now the KEY ("Filters") and `value`
     carries the same two axes, in `FilterSheet`'s field shape — a full-width row with a caret
     that rotates on open. ⛔ The two-axis text is still composed here and still passed whole,
     because §2 of `test:updown-filter-sheet` is the assertion that keeps it honest.

     ⛔ `count={0}` ON PURPOSE, so no badge renders. `FilterSheet`'s badge counts NON-DEFAULT
     axes; here both axes are always set, so a badge would read `2` on every board for ever — a
     number announcing its own irrelevance, which is the same argument that file's own comment
     makes against a `0` badge. The state is carried by the label, where it is legible.

     ⛔ AND THE SHEET IS NOT RE-STYLED. `FilterSheet` carries `lg:hidden` itself; the wrapper
     below narrows that to `sm:hidden` so tablets keep the chips they already handle well.
     Motion, material and the focus contract come from the sheet unchanged — no `--ease-*`, no
     new keyframe, nothing at this call site. */
  const activeAsset = assetTabs.find((a) => assetOn(a));
  const activeDur = durationTabs.find((d) => durationOn(d));
  // ⛔ Composed here, not in the dictionary: `"{asset} · {duration}"` has nothing to translate,
  // and `test:i18n`'s untranslated-values check correctly refused it as a key.
  const activeAssetText = activeAsset?.label ?? assetsLabel;
  const activeDurText = activeDur ? `${activeDur.d} ${minLabel}` : durationsLabel;

  return (
    <>
      {/* ── The phone sheet — ONE trigger, naming what the board is showing ───────────── */}
      <div className="mt-4 sm:hidden">
        <FilterSheet
          label={sheetLabel}
          value={`${activeAssetText} · ${activeDurText}`}
          title={sheetTitle}
          ariaLabel={sheetAria.replace("{asset}", activeAssetText).replace("{duration}", activeDurText)}
          closeLabel={sheetClose}
          applyLabel={sheetDone}
          count={0}
        >
          <FilterSheetGroup label={assetsLabel}>
            {assetTabs.map((tab) => (
              <FilterPill
                key={tab.key}
                href={tab.href}
                label={tab.label}
                on={assetOn(tab)}
                semantics="tab"
                replace
                scroll={false}
                onClick={go(tab.href)}
              />
            ))}
          </FilterSheetGroup>
          {durationTabs.length > 0 && (
            /* ⭐ PRIMARY IN HERE, SECONDARY ON THE RAIL — and that is the rank prop being used
               for what it is for, not an inconsistency. `rank` expresses "the asset is the
               subject, the duration refines it", and on the rail the two sit in one visual
               field where only the type treatment can say so. Inside the sheet the axes are
               already separated by their own labelled groups, so the hierarchy is carried by
               the STRUCTURE — and paying for it twice costs legibility at the moment of
               choosing: `secondary` is 11.5px mono, which under a 10px key, on a phone, in a
               44px target, is the smallest text in the sheet on half its choices. The
               selection idiom is untouched; only the measure is. */
            <FilterSheetGroup label={durationsLabel}>
              {durationTabs.map((tItem) => (
                <FilterPill
                  key={tItem.d}
                  href={tItem.href}
                  label={`${tItem.d} ${minLabel}`}
                  className={assetSwitching ? "kp-fchip-waiting" : undefined}
                  blocked={assetSwitching}
                  on={durationOn(tItem)}
                  semantics="tab"
                  replace
                  scroll={false}
                  onClick={go(tItem.href, assetSwitching)}
                />
              ))}
            </FilterSheetGroup>
          )}
        </FilterSheet>
      </div>

      {/* ── Asset tabs (primary) ─────────────────────────────────────────────────────────
          🔴 THESE WERE THE WORST DIVERGENCE IN THE PRODUCT — measured on production
          2026-08-14, not argued: `h-9` reads like 36px and renders **64px** on this repo's
          overridden spacing scale, every one of the five was OUTLINED, and all four paint
          values were written inline at the call site. They are the pill now, like every other
          filter rail. ⛔ No count: `BoardAsset` carries none and the board reads rounds for the
          ACTIVE chain only, so a number here would be invented — A-5 forbids that, and
          `durations.length` is a count of chains wearing the costume of a count of games. */}
      <nav aria-label={assetsLabel} data-filter-rail className="mt-4 hidden flex-wrap gap-2 sm:flex">
        {assetTabs.map((tab) => (
          <FilterPill
            key={tab.key}
            href={tab.href}
            label={tab.label}
            on={assetOn(tab)}
            semantics="tab"
            replace
            scroll={false}
            /* ⚠️ `go()` needs the RAW MouseEvent — it reads `e.button` and the four modifier
               keys to hand new-tab clicks back to the browser. The primitive passes it through
               untouched for exactly this. */
            onClick={go(tab.href)}
          />
        ))}
      </nav>

      {/* ── Duration tabs (secondary — deliberately quieter) ──────────────────────────────
          ⭐ The hierarchy is REAL and it survives: the asset is the subject, the duration
          refines it. It is now expressed as `rank="secondary"` — a decision made once, inside
          the primitive — rather than as four inline style values per control. Consistency
          means one control language, not one volume.
          These were the only genuinely sub-floor controls in the product at **40px** (`h-7`);
          they are 44px now, so this is a hit-area fix as well as a shape one. */}
      {durationTabs.length > 0 && (
        <nav aria-label={durationsLabel} data-filter-rail className="mt-2 hidden flex-wrap gap-1.5 sm:flex">
          {durationTabs.map((tItem) => (
            <FilterPill
              key={tItem.d}
              href={tItem.href}
              label={`${tItem.d} ${minLabel}`}
                  className={assetSwitching ? "kp-fchip-waiting" : undefined}
                  blocked={assetSwitching}
              on={durationOn(tItem)}
              semantics="tab"
              replace
              scroll={false}
              rank="secondary"
              onClick={go(tItem.href, assetSwitching)}
            />
          ))}
        </nav>
      )}

      {/* The board itself — kept on screen, dimmed while the filtered one streams in. */}
      <div
        data-pending={isPending || undefined}
        aria-busy={isPending || undefined}
        style={{
          opacity: isPending ? "var(--state-disabled-opacity)" : undefined,
          transition: "opacity var(--t-base) var(--m-glide)",
        }}
      >
        {children}
      </div>
    </>
  );
}
