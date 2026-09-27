# C1 · one price rule everywhere — build spec

> **⭐ RULED by Ali, 2026-09-27 (asked in session, both answered as recommended) — build these, not the interim defaults:**
> **1a** — retire "One-sided win": the state is **"One side only"** everywhere; the detail callout loses that heading;
> a NEW dated entry in `docs/COMPLIANCE-DECISIONS.md` supersedes the 2026-07-21 one (keep both, the pair is the record).
> **2a** — ONE tipping rule: `TIPPING_BAND = 3` (|YES − 50| ≤ 3) exported from `price-state.ts`, read by the bar's lean
> word, the card badge, the share preview and the /live count. To be recorded as INHERIT-MANIFEST **R6**.


Repo `C:\kipindi-landing-v3`, branch `landing-v3`, HEAD **`541a9e76`**. WP14b is committed (`871b0844`) and `origin/main` is merged in. I only read files: nothing was edited, built or run. I re-checked every line cited below against HEAD.

## 0 · State before building (read first)

- **Line numbers.** The detail page, `side-picker.tsx`, `/live`, `/results` and `market-card.tsx` have the same line numbers the readers cited at `16f96489`.
- **⛔ Another lane is editing this worktree right now, uncommitted.**
  - Modified: `src/lib/server/updown-board.ts`.
  - Untracked: `src/lib/updown-match.ts`, `src/lib/updown-quote-age.ts`, `src/lib/use-replay-anchor.ts`, `docs/design-system/v4-2026-09-26-landing-ten/specs/`.
  - This is the R5 Up & Down band. Because of it, `BoardRound.upPct` moved from `:439` to `:442` (cite it by symbol).
  - Rules for C1:
    - Stage files by name only; never `git add -A`.
    - Commit F (Up & Down) waits until that lane has committed. Then merge, never rebase.
- **What the readers missed (found while checking):** the settled one-sided resolution panel states a fee that was never charged. This is a false money statement. See A7.
- **Where I overrode the readers:**
  1. The refund note sits at the **money control** while betting is open. On a phone the bet panel paints first (`page.tsx:579` `order-1`), so a note under the bar comes after the buttons.
  2. The detail caption stays **one** `text-[11px]` element. A second one would raise the `test:type-scale` ratchet.
  3. `SidePicker` works out its price from the pools itself. It gets no `yesPct` prop, so no caller can hand it a price.

## 1 · Owner rulings (numbered one-line choices)

**Ruling 1 · the licence term "One-sided win"** (`COMPLIANCE-DECISIONS.md:4476-4507`, 2026-07-21, "Critical for the GBT licence — apply everywhere"). Its last on-screen use is the detail page callout (`page.tsx:812`/`:815`).
- **1a (recommended).** Retire it. The state is called "One side only" everywhere, as on every card since WP6. The callout loses its heading, and the rail's "One side only" label names the state. A new dated entry supersedes 07-21. Reason: an open market has no "win", and the 07-21 guardrail itself forbids implying a cash win.
- **1b.** Keep "One-sided win" as the callout heading and change only the body. The page would then show two names for one state ("One side only" under the bar, "One-sided win" in the box).
- **Until he answers, build 1b.** A dated decision stands until he rules. Switching to 1a is the A6 swap plus retiring the keys (§4).

**Ruling 2 · one "tipping" rule.** Today there are four thresholds:
- the bar's lean word: `brand.tsx:347` `< 3`
- the card badge: `market-card.tsx:141` `<= 3`
- the share preview: `share-preview.ts:29` `< 4`
- the /live header count: `live/page.tsx:155` `< 8`

Choices:
- **2a (recommended).** One exported `TIPPING_BAND = 3` (|YES − 50| ≤ 3) in `price-state.ts`, read by all four. The /live "n tipping" count shrinks.
- **2b.** Leave all four as they are.
- **Until he answers, build 2b**, with `LIVE_TIPPING_BAND = 8` in B1 so there is no visible change.

Nothing else here needs Ali. Other calls are decided by the laws: L22 puts the note on every unsettled one-sided card, Q5 decides the /results crown, and his 2026-09-27 standing order brings in Up & Down and admin.

## 2 · The rule, and the money boundary

Every surface below reads `priceState(yesPool, noPool)` (`src/lib/markets/price-state.ts`), never a rounded percentage:

| State | What shows |
|---|---|
| `none` | Dashed rail. Named "No bets yet" only if `predictorCount === 0`, otherwise "No pool yet" (D29). A settled market is named by its outcome word first. |
| `oneSided{emptySide}` | Dashed rail named "One side only" (outcome word first once settled). No "@ n%". The `oneSidedNote` sentence in every unsettled phase; nothing once settled, except the resolution panel, which can see what was paid. |
| `priced{yesPct}` | 1–99, and NO is always `100 − yesPct`. |

**Display reads `priceState`:** detail bar, caption, note, JSON-LD and SidePicker; /live pulse card and carousel; /results featured card and notable pick; the chart points and card sparkline/24h move; OG image and description; Up & Down card and round page; admin bars.

**These keep the raw pools. Do not touch them:**
- `conviction-dial.tsx:529` `payoutFor({ yesPool, noPool, side, stake }, rates)`, `:530` `leanFor`, `:1607` (the loser-share estimate reads no pools), and the inline one-sided tests at `:1648`/`:1723`. Swapping those two to `priceState(...).kind === "oneSided"` is optional; the result is the same boolean.
- `bet-confirm-modal.tsx` receives only `lean`/`isOneSided`.
- Detail page: `cashOutValue` `:329`, `poolFee(...)` `:179`, and the panel's TZS rows.
- Up & Down: `impliedMultiplier`, `emptySideOf`, `refundWarningFor`, `myExactPayout`, and the round page's `upTzs`/`downTzs`.
- `settleMarket`'s `isOneSided` (`market-service.ts:3591`) and the settlement `poolFee` (`:3561`). These are the rule's source of truth, pinned by `test:one-sided` §6.
- The stored `yes` value in `recordSnapshot` (`market-history.ts:196`). Do not change the write; the read rule covers old rows too.
- `hero.ts:147` `yesShare` and `landing.ts:174` `leanYesPct` are `pricedYesPct` totals over many markets and stay as they are (`test:hero-contract` pins them).

## 3 · Ordered edits

**Build order:**
1. Step 0: the drive and seed tooling, then a RED run on the untouched tree.
2. Commits A–E, then one local drive and **one push**.
3. F after R5 lands, with its own drive and push.
4. G (admin), its own push.

Update the docs in the same commit as the code each time (§8).

### Step 0 · tooling (no product change)

- `src/app/api/dev-test/resolve-seed-markets/route.ts` (dev-only, 404 in prod):
  - Add body fields `side?: "YES" | "NO"` and `settle?: boolean`.
  - In the bettor loop (`:79`): `const side: Side = body.side ?? (i % 2 === 0 ? "YES" : "NO");`
  - After the stage-2 `resolveMarket` (`:89`): `if (body.settle) await settleMarket(m.id, { force: true, actorId: officerB });` (the precedent is `seed-player-portfolio/route.ts:186`).
  - Import `settleMarket`.
- New `scripts/qa/landing-v3/verify-c1.sh`, `scripts/qa/landing-v3/c1-drive.mjs` and `package.json` `"qa:landing-v3:c1"` (§6).
- Run it once on this tree. It must be **RED** on the cells named in §6.

### Commit A · `/markets/[id]` (detail page), SidePicker, resolution panel

**`src/app/markets/[id]/page.tsx`**

**A1 · imports.**
- `:22`: drop `impliedYesPct`.
- `:23`: `import { priceState } from "@/lib/markets/price-state";` (remove `shownYesPct`).
- `:24` already imports `sharePreviewDescription`, `sharePreviewPrice`.

**A2 · replace `:153-158`** (the old comment is stale):
```ts
  // ⭐ C1 · the card's price rule on the page the card links to (`price-state.ts`; ruling 13, L14, D29).
  // Display only: the dial prices from the raw pools; `cashOutValue` and `poolFee` read the pools.
  const price = priceState(m.yesPool, m.noPool);
  const yesPct = price.kind === "priced" ? price.yesPct : null;
  const emptySide = price.kind === "oneSided" ? price.emptySide : null;
  const neverBet = m.predictorCount === 0;
  const outcomeLabel = m.resolvedOutcome ? outcomeWord(t, m.resolvedOutcome, "MARKET") : null;
  const sharePrice = sharePreviewPrice(m.yesPool, m.noPool, m.predictorCount);
```
`t` is defined at `:121`; `outcomeWord` is imported at `:49`.

**A3 · phase flags.**
- After `isResolved` (`:222`): `const settled = !!m.resolvedOutcome || isResolved;` (the card's expression, `market-card.tsx:352`).
- Replace `isOneSided` (`:268-271`) with:
```ts
  // The refund rule (WP6 · L22): ONE conditional sentence in every UNSETTLED phase. Once settled, the resolution panel says what was paid.
  const oneSidedNote = emptySide && !settled ? t.market.oneSidedNote.replace("{side}", sideWord(t, emptySide, "MARKET")) : null;
```
- Delete `noPriceMarket` and its comment (`:291-300`); the bar was its only reader. Keep `freshMarket`.
- After `freshMarket`, add:
```ts
  // The empty rail's words (the card's caption rule): "No bets yet" only where nobody EVER bet; "Be the first" only while it is open.
  const railCaption = price.kind === "none" && neverBet ? (freshMarket ? `${t.market.noBetsYet} · ${t.market.beFirst}` : t.market.noBetsYet) : null;
  // A settled split is the pool's FINAL shape, not a lean (the /results spotlight and the settled share image say the same).
  const leanWords = isResolved
    ? { tipping: t.market.resFinalPool, leansYes: t.market.resFinalPool, leansNo: t.market.resFinalPool }
    : { tipping: t.market.tipping, leansYes: t.market.leansYes, leansNo: t.market.leansNo };
```
- Define the note element **once** (it goes in one of two mutually exclusive places, A6):
```tsx
  const oneSidedCallout = oneSidedNote ? ( /* 1b shape: */
    <div data-one-sided-note="" className="rounded-lg border border-warning-border bg-warning-bg px-4 py-3 flex items-start gap-2.5">
      <I.warning s={15} className="shrink-0 mt-0.5 text-warning-fg" />
      <div>
        <p className="font-mono text-micro font-bold uppercase eyebrow text-warning-fg mb-1">{t.market.oneSidedMarket}</p>
        <p className="text-body-sm leading-relaxed text-text-muted">{oneSidedNote}</p>
      </div>
    </div>
  ) : null;
```
- **1a shape**, to swap in on the ruling. It is informational, not an alarm, matching the card's note and the Up & Down G5 rule:
```tsx
    <p data-one-sided-note="" className="mcardp-onesided-note flex items-start gap-1.5">
      <I.info s={13} className="mt-0.5 shrink-0 text-text-subtle" /><span>{oneSidedNote}</span>
    </p>
```

**A4 · JSON-LD (`:438`).** Use `description: sharePreviewDescription(sharePrice),`. og:description, twitter and JSON-LD then come from one string. On an empty pool this removes the invented "YES 50% · NO 50%", and on a one-sided pool the 100/0.

**A5 · bar (`:747-758`).**
- `yesPct={yesPct ?? undefined}`
- `empty={yesPct === null}`
- `emptyLabel={outcomeLabel ?? (emptySide ? t.market.oneSideOnly : neverBet ? t.market.noBetsYet : t.market.noPoolYet)}` (the card's D29 expression, `market-card.tsx:489`)
- `labels={{ yes: sideWord(t, "YES", "MARKET"), no: sideWord(t, "NO", "MARKET"), ...leanWords }}`
- Keep `resolved={isResolved}` and the probability label.

Because a printed price is 1–99, the full pill can no longer draw. The empty branch returns before `yesPct` is read (`brand.tsx:295`).

**A6 · caption and note placement.**
- Replace `:759-763` with the **same single element** (the `test:type-scale` count does not change), plus a label row made with a class only:
```tsx
          {railCaption && (
            <p className="-mt-3 text-center font-mono text-[11px] tracking-[0.06em] text-text-faint">{railCaption}</p>
          )}
          {emptySide && <p className="-mt-3 flex justify-center"><span className="mcardp-oneside">{t.market.oneSideOnly}</span></p>}
          {!bettingOpen && oneSidedCallout}
```
  - The one-sided label shows in every phase, like the card's label row.
  - Keep each JSX run on one line (the SWC space-loss trap).
- **Money control, open phases.** In the aside:
  - signed-in branch: `{oneSidedCallout}` directly after the sr-only `<h2 id={BET_PANEL_HEADING}>` at `:590`, before the hedge warning;
  - signed-out branch (`:648`): wrap the call-to-action in `<>{oneSidedCallout}<div …CTA…/></>`.
- **Delete the old callout block at `:806-819`.**
- The result: on a phone, open → the note sits at the top of the bet panel; closed but unsettled → it sits under the rail; settled → no note, and the panel explains (A7).

**A7 · `src/components/markets/resolution-panel.tsx` (the new money-truth fix).**
- **The defect.** `poolFee(yes, no, rates, winner)` under the default **loser-share** model (`payout.ts:471-478`; `DEFAULT_FEE_MODEL`, `payout.ts:176`) charges `rate × losingPool`. Take a YES-only pool resolved **NO**: it computes a positive "Platform fee", and the panel prints it (`:266`). It also marks the TZS 0 NO pool as the winner (`:259`). But `settleMarket`'s one-sided branch refunded every stake at fee 0. Under capped-commission, `fee = 0` with `capped` true, so the "fee was capped" callout (`:278`) can also appear over a refund.
- **The fix.** Import `priceState` and add, after `:117`:
```ts
  // ⭐ C1 · settlement refunds EVERY stake at zero fee when one pool is empty, whatever the verdict (`settleMarket`'s one-sided
  // branch, rules §7). `poolFee(…, winner)` would still price a loser-share fee off the funded side: a fee nobody was charged.
  const refundedAll = isVoid || priceState(yesPool, noPool).kind === "oneSided";
```
- `:247`: change `{isVoid ? (` to `{refundedAll ? (`. The body is `{isVoid || settledAt ? t.market.resVoidRefund : t.market.resOneSidedPending}`. Void keeps its sentence exactly as today; `resVoidRefund` = "All stakes were refunded in full — no fee taken."
- `:278` and `:292`: change `!isVoid` to `!refundedAll`.
- The header chip (`:137-138`) keeps the verdict.
- This is display only: the panel stops stating a fee that settlement never took.

**`src/components/markets/side-picker.tsx`**

- **A8.**
  - `:27`: delete `yesPct: number;` from Props; `:53`: remove it from the destructure.
  - Import `priceState`.
  - Replace `hasPool` and its comment (`:57-63`) with:
```ts
  // ⭐ C1 · the card's rule: a figure only where both pools hold money (1–99, L14); bare side words on an empty or one-sided
  // pool (ruling 13). Display only — the dial below prices from the raw pools it is handed.
  const price = priceState(yesPool, noPool);
  const yesPct = price.kind === "priced" ? price.yesPct : null;
```
  - `:75`: `{sideWord(t, side, "MARKET")}{yesPct !== null ? ` ${side === "YES" ? yesPct : 100 - yesPct}%` : ""}`
  - `:138`/`:153`: `yesPct !== null ? t.market.backYesAria.replace("{pct}", String(yesPct)) : t.market.backYesAriaNoPrice`, and the same for NO with `100 - yesPct`.
  - `:147`: `{sideWord(t, "YES", "MARKET")} {yesPct !== null && <span className="font-mono text-[12.5px]">@ {yesPct}%</span>}`
  - `:155`: the same with `@ {100 - yesPct}%`.
  - Update the `impliedYesPct` note at `:125`.
- **A9.** `page.tsx:636`: delete `yesPct={yesPct}` from `<SidePicker>`.

### Commit B · `/live`

**B1.** New file `src/lib/markets/live-contest.ts`. It is pure: it imports only `./price-state`, with no `"use client"`.
```ts
/** /live's "n tipping" count and "Most contested" carousel through the ONE price rule (landing v3 C1).
 *  An empty or one-sided pool has no price (ruling 13, D29), so it is not a contest: never counted, never featured,
 *  however thin the wall. A lopsided two-sided market stays, at its 1–99 price (L14). Before C1 the carousel dropped only
 *  the empty pool, so a one-sided market could be featured as a 32px "100% · 0%" pill. */
import { shownYesPct } from "./price-state";
export const LIVE_TIPPING_BAND = 8; // ruling 2: → `TIPPING_BAND` (≤ 3) from price-state.ts if Ali picks 2a
export function liveContest<T extends { yesPool: number; noPool: number }>(rows: readonly T[], take = 6) {
  const priced = rows.flatMap((row) => {
    const yesPct = shownYesPct(row.yesPool, row.noPool);
    return yesPct === null ? [] : [{ row, yesPct }];
  });
  return {
    tipping: priced.filter((p) => Math.abs(p.yesPct - 50) < LIVE_TIPPING_BAND).length,
    // Ties go to the bigger pool, as /markets' "Closest call" (discovery.ts:493).
    mostContested: [...priced].sort((a, b) =>
      Math.abs(a.yesPct - 50) - Math.abs(b.yesPct - 50) || (b.row.yesPool + b.row.noPool) - (a.row.yesPool + a.row.noPool)).slice(0, take),
  };
}
```

**B2 · `src/app/live/page.tsx`.**
- `:16`: drop the unused `impliedYesPct` import.
- `:21-22`: import `liveContest` instead of `pricedYesPct`.
- `:135-141`: replace `yesPct: pricedYesPct(...)` with `yesPool: m.yesPool, noPool: m.noPool,`. Rewrite the comment: the card gets the pools, never a finished price.
- `:151-169`:
```ts
  const { tipping: tippingMarkets, mostContested } = liveContest(markets);
  const topContested = mostContested.map(({ row: m, yesPct }) => ({
    id: m.id, title: pickLocalized(locale, m.titleEn, m.titleSw, m.titleZh), yesPct, productLine: m.productLine, roundId: m.roundId,
  }));
```
- Move the PV-06 history comments into the helper's header. `:212` and `data-result-count` stay as they are.

**B3 · `src/app/live/pulse-grid.tsx`.**
- Import `priceState`.
- In `Market` (`:19-20`), replace `yesPct` with `yesPool: number; noPool: number;`.
- Delete the stale "amber border" sentence at `:39-40`.
- Replace `const yes = market.yesPct;` (`:167`), after `isUpDown`, with:
```ts
  const productLine = isUpDown ? "UPDOWN" : "MARKET";
  const price = priceState(market.yesPool, market.noPool);
  const noPriceWord = price.kind === "oneSided" ? t.market.oneSideOnly
    : market.predictors === 0 ? t.market.noBetsYet : t.market.noPoolYet;
```
- Add `data-price-state={price.kind}` to the `<Link>` (`:172`); it is a data attribute, not a class.
- Replace `:217-240` with:
```tsx
      <div className="mt-3">
        {price.kind !== "priced" ? (
          <TippingBar height={9} showLabels={false} recastOnHover={false}
            empty emptyLabel={noPriceWord} />
        ) : (
          <TippingBar yesPct={price.yesPct} height={9} showLabels={false} recastOnHover={false}
            probabilityLabel={t.market.probBarAria.replace("{side}", sideWord(t, "YES", productLine))} />
        )}
      </div>
      <div className="mt-2.5">
        {price.kind !== "priced" ? (
          <div className="text-center font-mono text-[12px] text-text-subtle">{noPriceWord}</div>
        ) : (
          <div className="flex items-center justify-between font-mono text-[12px] tabular-nums">
            <span className="font-bold text-yes-300">{sideWord(t, "YES", productLine)} <span className="opacity-75">@ {price.yesPct}%</span></span>
            <span className="font-bold text-no-300">{sideWord(t, "NO", productLine)} <span className="opacity-75">@ {100 - price.yesPct}%</span></span>
          </div>
        )}
      </div>
      {price.kind === "oneSided" && (
        <p className="mcardp-onesided-note mt-2">{t.market.oneSidedNote.replace("{side}", sideWord(t, price.emptySide, productLine))}</p>
      )}
```
- The note follows L22 (every unsettled one-sided card). /live shows no settled rows. For Up & Down tiles too, `oneSidedNote` is used rather than `udNobodyBacked`, which addresses someone who holds a stake.
- `mt-2` and `mt-2.5` are not inverted keys, and `text-[12px]` stays at 2 in this file.

**B4 · `src/app/live/featured-contest.tsx`.**
- `FeaturedMarket` (`:24`) gains `roundId: string | null` (required).
- One `const href = m.productLine === "UPDOWN" ? (m.roundId ? `/updown/${m.roundId}` : "/updown") : `/markets/${m.id}`;` used at `:145` and `:176`. This removes a redirect hop for Up & Down.
- Rewrite `:158-165`: the guarantee is now `liveContest` via `shownYesPct`, and it covers one-sided pools too.
- Up & Down lean words: add `leanWords(t, productLine)` to `src/lib/side-label.ts`, returning `{ leansYes, leansNo }`. Use `udLeansUp`/`udLeansDown` for UPDOWN (§4); these are new keys. Spread it into the bar's `labels` at `:168`, so an Up & Down round no longer reads "inaelekea ndiyo".

### Commit C · `/results` featured card and notable pick

**C1 · `src/lib/results/archive.ts`** (no server imports): add `import { priceState } from "@/lib/markets/price-state";` and:
```ts
/** Whether a settled row may be the page's NOTABLE result (the gilt spotlight). ⭐ C1: only a verdict over a TWO-SIDED pool.
 *  A one-sided market refunded every stake (`settleMarket`, rules §7) and a void refunded everyone: nothing was earned, so
 *  neither wears the crown (Q5). ⛔ Read from the POOLS, never a rounded 0/100. */
export function isNotableResult(m: { status: string; resolvedOutcome?: string | null; yesPool: number; noPool: number }): boolean {
  return m.status === "RESOLVED"
    && (m.resolvedOutcome === "YES" || m.resolvedOutcome === "NO")
    && priceState(m.yesPool, m.noPool).kind === "priced";
}
```

**C2 · `src/app/results/page.tsx`.**
- Delete `:10-11` (the `pricedYesPct` import and its comment).
- Import `priceState`, `isNotableResult` (in the `:19-29` block) and `marketCategoryLabel`, alongside `pickLocalized` at `:35`.
- `:293`: `? paged.filter(isNotableResult).sort((a, b) => (b.yesPool + b.noPool) - (a.yesPool + a.noPool)).slice(0, all.length >= 8 ? 3 : 1)`
- When nothing qualifies there is no carousel (`:488`). The grid keeps every row, so `data-result-count` does not change.

**C3 · `FeaturedResult`.**
- Replace `:574-579` with:
  - `const price = priceState(m.yesPool, m.noPool);`
  - `const outcomeLabel = m.resolvedOutcome ? outcomeWord(t, m.resolvedOutcome, m.productLine) : null;`
  - `const railWords = price.kind === "oneSided" ? t.market.oneSideOnly : m.predictorCount === 0 ? t.market.noBetsYet : null;`
  - A comment explaining that the pick and the render are two separate decisions, and that the render stays honest for every shape.
- Replace `:606-613` with:
```tsx
      {price.kind === "priced" ? (
        <TippingBar yesPct={price.yesPct} height={28} showLabels resolved={!isVoid} recastOnHover={false}
          probabilityLabel={t.market.probBarAria.replace("{side}", sideWord(t, "YES", m.productLine))}
          labels={{ yes: sideWord(t, "YES", m.productLine), no: sideWord(t, "NO", m.productLine), tipping: t.market.resFinalPool, leansYes: t.market.resFinalPool, leansNo: t.market.resFinalPool }} />
      ) : (
        <>
          <TippingBar height={28} showLabels={false} recastOnHover={false}
            empty emptyLabel={outcomeLabel ?? railWords ?? t.market.noPoolYet} />
          {railWords && <p className="mt-1.5 flex justify-center"><span className="mcardp-oneside">{railWords}</span></p>}
        </>
      )}
```
- No refund sentence on this card (WP6's settled rule).
- `:596`: `<Chip variant="cat" size="sm">{marketCategoryLabel(t, m.category)}</Chip>`. It printed the raw enum ("SPORTS") on sw/zh, the §L3 defect the grid card already fixed.

### Commit D · chart history (detail chart, card sparkline, 24h move, "Biggest move" sort)

**`src/lib/server/market-history.ts`.** Import `priceState`, then:
```ts
/** A chart point needs a PRICE (`price-state.ts`, C1): an empty or one-sided snapshot is not plotted. It would draw an
 *  invented 50 or a 100/0 certainty (ruling 13, D29), and a two-sided 99.6% plots 99 (L14). Dropping the point is the only
 *  option: a whitespace point does not break the series (chart-series.ts D46). */
function pricedPoints<T extends { yesPool: number; noPool: number }>(snaps: readonly T[]): { s: T; pct: number }[] {
  return snaps.flatMap((s) => { const p = priceState(s.yesPool, s.noPool); return p.kind === "priced" ? [{ s, pct: p.yesPct }] : []; });
}
```

**`getProbabilityChart` (`:267-287`):**
- `const all = pricedPoints(await getHistory(marketId));`
- The windows filter on `x.s.t`.
- `compress(slice, 24).map(({ s, pct }) => ({ t: labelFor(s.t), ts: Date.parse(s.t), p: pct }))`.
- Keep the rule "a range needs ≥2 points, else no chart".

**`cardChartFrom` (`:300-324`):**
- Its signature becomes `(points: { t: string; yes: number; yesPool: number; noPool: number }[])`.
- Return `EMPTY_CARD` if the last point is not priced: no price now means no line and no move.
- `const priced = pricedPoints(points)`; if there are fewer than 2, return `EMPTY_CARD`.
- `spark = compress(priced, 16).map((x) => x.pct)`.
- `dayAgo = priced.find(...)`.
- `move24h = priced.at(-1)!.pct - dayAgo.pct`. A one-sided 100 baseline can no longer print "−38".

**`getCardCharts`:**
- `:356`: `select: { marketId: true, t: true, yes: true, yesPool: true, noPool: true }`.
- In the loop, push `{ t, yes, yesPool: num(r.yesPool), noPool: num(r.noPool) }`. The pools are non-null Decimals (`schema.prisma:1807-1808`); `num` is defined at `:38`.

### Commit E · share preview for a settled market (OG image, og:description, JSON-LD)

**`src/lib/markets/share-preview.ts`:**
- Add `sharePreviewSettled(status, resolvedOutcome, productLine)`. It returns `{ tone, caption: dict.en.market.result, word, poolCaption: dict.en.market.resFinalPool }`, or `null` unless the status is `RESOLVED` or `VOIDED`.
- The outcome is `resolvedOutcome ?? (status === "VOIDED" ? "VOID" : null)`. A null outcome gives the word `statusResolved` and tone `null`: no side is better than a wrong side.
- `sharePreviewDescription(p, settled = null)`: when settled, it returns `` `${settled.caption}: ${settled.word}.${p.kind === "oneSided" ? ` ${p.label}.` : ""} Predict on 50pick.` ``.
- Import `outcomeWordIn, type StoredOutcome` from `"../side-label"`.

**`src/app/api/og/market/[id]/route.tsx`:**
- `:22`: import `sharePreviewSettled`.
- After `:53`:
  - `const settled = sharePreviewSettled(m.status, m.resolvedOutcome, m.productLine);`
  - `outcomeInk`: `C.yesLabel` for YES, `C.noLabel` for NO, else `C.tipLabel`.
- As the first child of the bar column: a "RESULT {word}" row (15px caption, 48px word).
- `:191`: `{settled ? settled.poolCaption : price.lean}`.
- `:208-210`: hide the label row when `settled && price.kind === "none"` ("yet" is wrong on a finished market).
- Check a three-line title at 1200×630 (about 604px of 630).

**`src/app/markets/[id]/page.tsx`:**
- In `generateMetadata`, compute `settled` and use `sharePreviewDescription(preview, settled)` (`:83`).
- JSON-LD: `sharePreviewDescription(sharePrice, sharePreviewSettled(m.status, m.resolvedOutcome, "MARKET"))`.
- `scripts/qa/landing-v3/og-prod.mjs:30-33`: `stateOf` must end its slice at the next `data-row-id`, not at a fixed 6,000 characters.

### Commit F · Up & Down (only after the R5 band lane has committed `updown-board.ts`)

- `src/lib/server/updown-board.ts`:
  - delete `BoardRound.upPct` (`:98-100` at HEAD, `:101-103` in the dirty tree) and its producer line `upPct: pricedYesPct(m.yesPool, m.noPool),`;
  - delete the `pricedYesPct` import and its PV-06 header (`:22-29`).
  - The pools already travel in `pricing`.
- `src/app/updown/page.tsx:325`: delete `upPct={r.upPct}`.
- `src/components/updown/updown-card.tsx`:
  - delete `upPct` from Props (`:113-121`) and from the destructure (`:471`);
  - import `priceState`;
  - replace `:647` with:
```ts
  const price = priceState(pricing.upPool, pricing.downPool);
  const upPct = price.kind === "priced" ? price.yesPct : null;
  const downPct = upPct === null ? null : 100 - upPct;
```
  - Split row `:901-906`: `{upPct !== null && downPct !== null ? (…today's row, `{upPct}%`/`{downPct}%`…) : price.kind === "oneSided" ? (<div className="flex"><span className="mcardp-oneside">{t.market.oneSideOnly}</span></div>) : null}`
  - Rail `:913`: `emptyLabel={price.kind === "oneSided" ? t.market.oneSideOnly : players === 0 ? t.market.noBetsYet : t.market.noPoolYet}`.
  - Keep `{upPct === null ? (` at `:911` byte-identical; `split-bar.anchors.mjs:27` anchors on it.
  - `udNobodyBacked` (`:726-731`) stays the card's only refund sentence; do not add `oneSidedNote`.
- `src/app/updown/[roundId]/page.tsx:172-173`: `const price = priceState(round.pricing.upPool, round.pricing.downPool); const upPct = price.kind === "priced" ? price.yesPct : null; const downPct = upPct === null ? null : 100 - upPct;`. Make the same split-row and rail changes at `:527-540`, using `round.players`. The TZS row (`:541-544`) stays.
- Before this change, "Up 100% · 0% Down" printed directly above "Nobody has backed Down yet…" on the same card.
- `scripts/live/pv06-cold-start-drive.mjs`: the invariant "split ⟺ volume > 0" becomes "split ⟹ both sides funded; a round the drive funded on one side shows the dashed rail named 'One side only'".
- LANDING-TEN R5(c): the next `/updown` card build **must keep** `priceState` here.

### Commit G · C1-admin (English-only, no dictionary keys)

- `src/components/markets/probability-bar.tsx`: make `yesPct` optional, add `empty?`/`emptyLabel?` and forward them to `TippingBar`. Then delete its `TIPPING_COLD_START_OK` entry (`ui-consistency.test.mts:208`ff; the list may only shrink).
- `src/app/admin/markets/page.tsx:173`: `const price = priceState(m.yesPool, m.noPool)`.
  - Settled YES/NO: priced → `closed at {n}% YES`; one-sided → `one side only · refunded`.
  - Live: priced → the bar and `{n}% YES`; one-sided → `<ProbabilityBar empty emptyLabel="One side only" …/>` and "One side only · refunds at settlement"; none → empty and "No bets" (or "No pool" when `predictorCount > 0`).
- `src/app/admin/markets/[id]/page.tsx:159`, `:230-231`: the same. Its ONE-SIDED callout (`:312`) no longer contradicts a 100/0 bar.
- `src/app/admin/resolver-queue/page.tsx:380`: the `CircularProgress` dial (`:403-407`) only when priced, else a "—" with the label "no price". The same applies to the bar at `:444` and the "Crowd:" line at `:456`.
- `src/app/admin/resolver/[id]/page.tsx:43`, `:166-170`: one-sided → dashed bar and "One side only — this verdict moves no money: every stake is refunded in full at settlement."; keep the TZS pool line.

## 4 · i18n keys (`src/lib/i18n-dict.ts`)

**Reused, no change:** `market.oneSideOnly` (en `:764`, sw `:3408`, zh `:5606`), `oneSidedNote` (`:765`/`:3410`/`:5608`), `noBetsYet`, `noPoolYet`, `beFirst`, `backYesAriaNoPrice`/`backNoAriaNoPrice` (`:1170`/`:3691`/`:5889`), `probBarAria`, `resFinalPool` (`:805`/`:3437`/`:5635`), `result`, `statusResolved`, `resVoidRefund` (`:813`/`:3442`/`:5640`), `leansYes`/`leansNo`, `tipping`, and `udUp`/`udDown` via `sideWord`.

**New.** Each sw/zh line carries `// drafted, marked for native review; English is binding.`

| Key | en | sw | zh |
|---|---|---|---|
| `market.resOneSidedPending` (A7) | "Only one side held stakes when betting closed, so every stake will be refunded in full, with no fee." | "Upande mmoja tu ulikuwa na dau wakati wa kufunga, kwa hiyo kila dau litarudishwa kamili, bila ada." | "截止时仅有一方持有下注，因此全部下注将全额退还，不收取任何费用。" |
| `market.udLeansUp` (B4) | "leans up" | "inaelekea juu" | "倾向涨" |
| `market.udLeansDown` (B4) | "leans down" | "inaelekea chini" | "倾向跌" |

"Will be refunded" is safe here: a RESOLVED market cannot be reopened (`adminReopenMarket` accepts only `CLOSED`, `market-service.ts:4338`).

**Retired, only under ruling 1a:** `market.oneSidedMarket` and `market.oneSidedBody` (en `:782-783`, sw `:3419-3420`, zh `:5617-5618`). Their only consumer is `page.tsx:812`/`:815`, which A6 deletes. Also update `COMPLIANCE-DECISIONS.md:4484`/`:4500`, which say these keys keep their names.

**Leave the rules page alone.** `legal/rules/_content-yes-no.tsx:204`/`:377`/`:521` "One-sided market:" is legal text. The new 1a entry should state that it stays.

## 5 · CSS

Tokens only; nothing added to `globals.css`.
- Reused: `.mcardp-oneside` (`globals.css:4793`) and `.mcardp-onesided-note` (`:4802`); neither needs a `.mcardp` parent. Extend its comment to say it is used by the detail page, the /live pulse card, the /results spotlight and the Up & Down label row.
- No inline style is added, so the `test:design-frozen` budgets hold (detail 2, results 1, updown-card 1).
- The count of `text-[11px]`/`text-[12px]` does not change, so `test:type-scale` stays at 906.
- The spacing keys used (`mt-0.5`, `mt-1.5`, `mt-2`, `-mt-3`) are not inverted keys, so `test:spacing-scale` stays at 473.

## 6 · Guards

### `scripts/one-sided.test.mts`

- **Amend 7.3** (`:237-238`) to `/const yesPct = price\.kind === "priced" \? price\.yesPct : null;/` and `!/impliedYesPct|shownYesPct\(/` in the detail page.
- Every section below opens with a slice-sanity control (the slice is the real component and is under N characters). Every refusal has a paired control.

**§8 detail (commit A)**

| Check | What it asserts |
|---|---|
| 8.1 | `const price = priceState(m.yesPool, m.noPool);` and the null-yesPct line. |
| 8.2 | `empty={yesPct === null}`, and `emptyLabel={outcomeLabel ?? (emptySide ? t.market.oneSideOnly : neverBet ? t.market.noBetsYet : t.market.noPoolYet)}`. |
| 8.3 | The JSON-LD reads `sharePreviewDescription(sharePrice`, with no `` `YES ${ `` template. |
| 8.4 | `railCaption`'s expression; exactly **one** `text-[11px]` caption element; the `mcardp-oneside` row keyed on `emptySide`. |
| 8.5 | The `oneSidedNote` expression with `sideWord(t, emptySide, "MARKET")`; `{!bettingOpen && oneSidedCallout}` inside the section slice; `{oneSidedCallout}` inside the `<aside` slice; no `oneSidedBody` anywhere in the page. |
| 8.6 | SidePicker: no `yesPct:` in Props; `const price = priceState(yesPool, noPool);`; no `hasPool`; exactly two `@ {` figures, both behind `yesPct !== null &&`; the page's `<SidePicker` has no `yesPct=`. |
| 8.7 | en `resOneSidedPending` says "refunded in full" and "no fee". |
| 8.8 | Panel: `const refundedAll = isVoid || priceState(yesPool, noPool).kind === "oneSided";` and the three gates read `refundedAll`. Behaviour: `poolFee(35_000, 0, {feeModel:"loser-share",…}, "NO").fee > 0`. That is the control proving the display guard is needed. |
| 8.9 | 1a only: no `oneSidedMarket`/`oneSidedBody` in the dictionary or `src/`. |

**§9 /live (commit B)**

| Check | What it asserts |
|---|---|
| 9.1 | `page.tsx` has `yesPool: m.yesPool,`, `noPool: m.noPool,` and `liveContest(markets)`, and no `pricedYesPct(`/`impliedYesPct(`. |
| 9.2 | The `PulseCard` slice contains `kp-rise` (control) and `const price = priceState(market.yesPool, market.noPool);`. |
| 9.3 | The `noPriceWord` one-sided arm, plus `empty emptyLabel={noPriceWord}` and the caption `{noPriceWord}`. |
| 9.4 | `market.predictors === 0 ? t.market.noBetsYet : t.market.noPoolYet;` |
| 9.5 | The note: `oneSidedNote` with `sideWord(t, price.emptySide, productLine)` inside `{price.kind === "oneSided" && (`. |
| 9.6 | Thin-wall behaviour, `[25000/0, 0/9000, 0/0, 200000/1000]`: `mostContested` ids are exactly `["lopsided"]` at 99, and `tipping === 0`. |
| 9.6-control | Adding `10000/9000` puts it first and makes `tipping === 1`. |
| 9.7 | `featured-contest.tsx` builds one `href` with `/updown/${m.roundId}`, and `leanWords(t, m.productLine)`. |

**§10 /results (commit C)**

| Check | What it asserts |
|---|---|
| 10.0 | The slice from `function FeaturedResult(` to the next `\nfunction ` contains `t.results.notableResult` and is under 8,000 characters. |
| 10.1 | The `priceState(m.yesPool, m.noPool)` line. |
| 10.2 | No `pricedYesPct` anywhere in the page. |
| 10.3 | `price.kind === "priced" ?` and `yesPct={price.yesPct}`. |
| 10.4 | `empty emptyLabel={outcomeLabel ?? railWords ?? t.market.noPoolYet}` |
| 10.5 | The one-sided `railWords` arm, and `className="mcardp-oneside"`. |
| 10.6 | No `oneSidedNote` in the slice. |
| 10.7 | `leansYes: t.market.resFinalPool` |
| 10.8 | `!isNotableResult({status:"RESOLVED",resolvedOutcome:"YES",yesPool:35_000,noPool:0})` |
| 10.9 | A priced void and an empty pool are not notable. |
| 10.10 | `RESOLVED` with a null outcome is not notable. |
| 10.11 | `paged.filter(isNotableResult)` |
| 10.12 | The category chip is `marketCategoryLabel(t, m.category)`. |
| Controls | The old `pricedYesPct` line and `emptyLabel={t.market.noBetsYet}` are both detected; `isNotableResult` of RESOLVED/NO on 25,000 v 100 is `true`. |

**§11 history (commit D, source pins).** `function pricedPoints` exists; both `getProbabilityChart` and `cardChartFrom` call `pricedPoints(`; the batched select has `yesPool: true, noPool: true`; no `Math.round(s.yes * 100)` remains. Behaviour lives in `scripts/history-fabrication.test.mts` (`test:history`, in predeploy), new §5:

| Check | What it asserts |
|---|---|
| 5.1 | Snapshots `(1000,0)×2, (600,400), (700,300)` plot only `{60, 70}`. |
| 5.2 | A final `(0,0)` void point is not plotted, and the card chart is `EMPTY`. |
| 5.3 | `(25000,100)×2` plots 99, not 100. |
| 5.4 (control) | Two priced points give a 2-point series. |
| 5.5 | A move measured from a one-sided baseline is `undefined`. |

**§12 share preview (commit E).** This goes in `scripts/share-preview.test.mts` as a new §4:

| Check | What it asserts |
|---|---|
| 4.1 | `LIVE`/`CLOSED` → `null`. |
| 4.2 | RESULT NO → tone NO, word NO. |
| 4.3 | `VOIDED` with null outcome → `Void`. |
| 4.4 | `RESOLVED` with null outcome → tone `null`, word `Resolved`. |
| 4.5 | Up & Down YES → `Up`. |
| 4.6 | Settled one-sided description = "Result: YES. One side only. Predict on 50pick." and contains no `%`. |
| 4.7 | Settled priced description = "Result: NO. Predict on 50pick." |
| 4.8 | The route contains `sharePreviewSettled(m.status, m.resolvedOutcome, m.productLine)` and `settled ? settled.poolCaption : price.lean`. |

Also re-point 3.3 to `sharePreviewDescription\(preview, settled\)`.

**§13 Up & Down (commit F).** In both the card slice and the round page:
- `const price = priceState(pricing.upPool, pricing.downPool);` (the round page uses `round.pricing.`);
- the null `upPct` line;
- the `emptyLabel` expression with `players === 0` (the round page uses `round.players`);
- `mcardp-oneside` inside `.ud-split`.

Also: `updown-board.ts` has no `upPct` and no `pricedYesPct`, and `updown/page.tsx` has no `upPct=`.

**§14 sweep (lands with A, shrinks each commit).** Decomment `src/app/**` and `src/components/**`; no `\b(impliedYesPct|pricedYesPct)\(` except an `ALLOW` list:
- after A: `live/page.tsx`, `results/page.tsx` and the four admin files;
- after C: the four admin files;
- after G: empty.

Controls: a planted `const y = impliedYesPct(m);` string is detected, and every `ALLOW` entry still contains a call (a stale entry fails).

### `scripts/anchors/one-sided.anchors.mjs` (`red:one-sided`)

Copy each `from` byte-for-byte from the edited file; `test:red-anchors` §3 requires exactly one match per file.

| File | from | to | expect |
|---|---|---|---|
| `markets/[id]/page.tsx` | `  const yesPct = price.kind === "priced" ? price.yesPct : null;` | the pre-C1 line `  const yesPct = shownYesPct(m.yesPool, m.noPool) ?? impliedYesPct(m);` | 8.1 |
| same | `            empty={yesPct === null}` | `            empty={price.kind === "none"}` | 8.2 |
| same | `{!bettingOpen && oneSidedCallout}` | `{false && oneSidedCallout}` | 8.5 |
| `side-picker.tsx` | `  const yesPct = price.kind === "priced" ? price.yesPct : null;` | `  const yesPct = yesPool + noPool > 0 ? Math.round((yesPool / (yesPool + noPool)) * 100) : null;` | 8.6 |
| `resolution-panel.tsx` | the `refundedAll` line | `  const refundedAll = isVoid;` | 8.8 |
| `live-contest.ts` | `    const yesPct = shownYesPct(row.yesPool, row.noPool);` | the raw `Math.round` share (null only at 0/0) | 9.6 |
| `pulse-grid.tsx` | `  const noPriceWord = price.kind === "oneSided" ? t.market.oneSideOnly` | `  const noPriceWord = false ? t.market.oneSideOnly` | 9.3 |
| same | `: market.predictors === 0 ? t.market.noBetsYet : t.market.noPoolYet;` | `: t.market.noBetsYet;` | 9.4 |
| `results/page.tsx` | `{price.kind === "priced" ? (` | `{price.kind !== "none" ? (` | 10.3 |
| `archive.ts` | `    && priceState(m.yesPool, m.noPool).kind === "priced";` | `…!== "none";` | 10.8 |
| `results/page.tsx` | `empty emptyLabel={outcomeLabel ?? railWords ?? t.market.noPoolYet}` | `empty emptyLabel={t.market.noBetsYet}` | 10.4 |
| `market-history.ts` | `return p.kind === "priced" ? [{ s, pct: p.yesPct }] : [];` | `return [{ s, pct: Math.round((s as { yes?: number }).yes! * 100) }];` | 11.1 |
| `updown-card.tsx` | the card's `const upPct = price.kind === …` line | the raw share from `pricing` | 13.1 |
| same | the card's `emptyLabel={price.kind === "oneSided" …}` | `emptyLabel={t.market.noBetsYet}` | 13.3 |

`share-preview.anchors.mjs` gets two more mutations: `  const settled = sharePreviewSettled(…);` → `  const settled = null;` (expect 4.8), and the null-outcome line → `tone: "YES", word: dict.en.common.yes` (expect 4.4).

### Other anchors to re-pin in the same commit

- `scripts/anchors/split-bar.anchors.mjs:47-60` (the pulse-grid case, commit B). `from` = the new `{price.kind !== "priced" ? (…)}` bar block; `to` = only the `<TippingBar yesPct={price.yesPct} … />` line; `expect` unchanged. The UD cases at `:27`/`:34` must still match once after F.
- `scripts/red-labels.mjs:109-110` (§3b, commit A). The `from` becomes the new `:147` line with `yesPct !== null &&`; the `to` is `YES {yesPct !== null && …}`. This harness is inline and not audited by `test:red-anchors`, so run `red:labels` by hand.
- `scripts/anchors/contrast-callsite.anchors.mjs:25`: `<span className="font-mono text-[12.5px]">@ {yesPct}%</span>` still resolves exactly once. Confirm it.
- `scripts/anchors/count-truth.anchors.mjs:63` (`pages-overlap`, commit C): the `from` becomes the C2 `:293` line; `to` unchanged.
- `scripts/ui-consistency.test.mts:196-205`: reword the `featured-contest.tsx` reason to point at `liveContest`/`shownYesPct` (B). Remove the `probability-bar.tsx` entry in G.

### Checked; these pass with the code above

- `test:outcome` PROB (`outcome-display.test.mts:60-66`): every new ternary keys on `price.kind`, `!== null`, `isResolved`, `neverBet` or `predictors === 0`, never on a number or pool compared with a digit.
- `test:labels`: side words go through `sideWord`/`outcomeWord`; the new `leanWords` lives in `side-label.ts`, the lexicon's home.

### Run, through the lock, one hold each

- `typecheck`, then: `test:one-sided`, `test:share-preview`, `test:history`, `test:outcome`, `test:labels`, `test:ui-consistency`, `test:type-scale`, `test:spacing-scale`, `test:design-frozen`, `test:i18n`, `test:trilingual`, `test:red-anchors`, `test:gold-is-money`, `test:hero-contract`, `test:landing-contract`, `test:discovery-contract`, `test:density-contract`, `test:updown-pricing` (F).
- Then **each alone**: `red:one-sided`, `red:share-preview`, `red:split-bar`, `red:labels`, `red:contrast-callsite`, `red:count-truth`.
  - After each, `git status --short` must list only intended files; a red harness plants a mutation in the repo.
  - Pipe nothing into `tail`; a pipe hides the exit code.
- Then `npm run build` once. A build is not a render; the drive below renders.

## 7 · Verification drive (local)

Launch it detached: `bash ~/heavy-node-lock.sh run landing bash scripts/qa/landing-v3/verify-c1.sh c1`. It writes a `verify.done` marker. Never wrap the lock in `timeout`.

It is modelled on `verify-wp6.sh`: dev server on `localhost:3057`, in-memory store, `DISABLE_ADMIN_TOTP=true`.

**Seeding:**
1. `seed-markets`, `updown-seed`, `updown-advance`.
2. `resolve-seed-markets` three times, all outputs concatenated into `resolve-seed.json` so the seats below skip them:
   - **S1** `{markets:1,bettors:2,stake:1000,side:"YES",outcome:"YES",stage:"complete",settle:true}`: settled one-sided.
   - **S2** `{markets:1,bettors:2,stake:1000,side:"YES",outcome:"NO",stage:"complete"}`: resolved **against** the money, unsettled. This is the phantom-fee case.
   - Default `{markets:3,bettors:4,stake:1000}`: **P1** settled two-sided, one stage-1, one contested LIVE.
3. `seed-onesided.mjs` PHASE=1: **O1** YES 2×25,000, **O2** NO 30,000, **O3** YES 12,000.
4. `fast-forward-market {seconds:-60}` on one untouched market: **E2**, closed and never bet. One more untouched market: **F**, fresh.
5. `stress-bulk-bet` on one open Up & Down round's market with `yesRatio:1`: **UD1**, one-sided. Another with 0.5: **UD2**. If the endpoint refuses UPDOWN markets, place the bets as the demo player through the round's own bet route.
6. PHASE=2: **C1–C3** contested, **L** 200,000 v 1,000.

**Drive: `c1-drive.mjs`.**
- Grid: 360/768/1280 × sw/en/zh (cookie `kp-locale`), signed out and signed in (`/auth/demo?deposit=1`; no bets placed by the drive).
- Viewport tiles only, never full-page.
- DEGEN is V17's pattern, imported or copied from `landing-ten.mjs:776`. It is checked only inside price regions: the detail bar wrapper, `[data-testid=side-picker]`, the JSON-LD `<script>`, `a[data-price-state]`, `[aria-roledescription="carousel"]`, `.ud-split`, and the `/results` gilt card.

| State | Assertions |
|---|---|
| O1–O3 detail | Bar `aria-label` = locale `oneSideOnly`; `.mcardp-oneside` under the rail; signed-in: `[data-one-sided-note]` **inside `<aside>`** = `oneSidedNote` with the locale's empty-side word, buttons without "@" and with aria = the `*AriaNoPrice` keys; JSON-LD = "One side only. Predict on 50pick."; no DEGEN. |
| L detail + /live | "@ 99%"/"@ 1%"; bar aria contains 99; JSON-LD "YES 99% · NO 1%."; on /live it is priced and in the carousel. |
| C1–C3 (positive control) | "@ n%" with 1 ≤ n ≤ 99 and a `.tipbar-rail` exists. The matcher must be able to say yes. |
| F | Rail aria = `noBetsYet`; caption = "noBetsYet · beFirst"; JSON-LD "No bets yet. Predict on 50pick."; no "50%". |
| E2 (closed, empty) | Dashed rail `noBetsYet`, caption `noBetsYet`, no 50/50 pill (it drew one before C1). |
| S1 | Rail aria = outcome word; `.mcardp-oneside` label; no `[data-one-sided-note]`; panel text `resVoidRefund`; no `resPlatformFee` row; JSON-LD "Result: YES. One side only. Predict on 50pick."; not the /results gilt card; its grid card shows "One side only" and no %. |
| S2 | Panel text `resOneSidedPending`; **no fee row**. Pre-C1 this printed a positive loser-share fee. |
| P1 | The lean slot reads `resFinalPool`; shimmer present; it is (or may be) the gilt card; the category chip is localized (≠ raw enum on sw/zh). |
| /live | `a[data-price-state="oneSided"]` for O1–O3 and UD1 carry `oneSideOnly` and `.mcardp-onesided-note`; the carousel holds no O/UD1 id; Up & Down carousel links go to `/updown/…`. |
| /updown + `/updown/<UD1>` | Dashed rail named `oneSideOnly` and the label row; no "100%"/"0%" in `.ud-split`. UD2 shows 1–99 (positive control). |
| OG PNGs | S1, O1, L, P1 and a three-line title: 200, `image/png`, 1200×630. Saved and looked at. |

**Controls:**
- Precondition: the seed JSON pools confirm every state (O one-sided, L 200,000/1,000, S1/S2 one-sided resolved). Otherwise report the premise as absent, never green.
- **RED:** step 0's run on the untouched tree must report at least these, or the drive is blind:
  - O1/O2 JSON-LD "YES 100% · NO 0%" / "YES 0% · NO 100%";
  - E2 50/50 pill;
  - F JSON-LD "YES 50%";
  - S2 fee row;
  - /live O1 "@ 100%";
  - UD1 "Up 100%".
- **Frames:** look at every tile. In particular: the aside note at 360 in all three languages, the rail label, the pulse-card height with the note at 360/768/1280, "Final pool" on the spotlight, the Up & Down label row, and the OG image.

## 8 · Production check, and docs

**Before pushing:**
1. Run `c1-drive` in `BASE=https://www.50pick.tz --discover` mode. It finds one-sided markets from `/markets` HTML (`.mcardp-oneside` + `data-row-id`) and settled one-sided rows from `/results`. It runs signed out, and signed in as `mobile01` (read-only, no bets).
2. Record the RED baseline.
3. **Count the settled one-sided markets whose panel shows a positive fee.** Every one is a false money statement shown to players on production. Log it in the LIVE-QA register and tell Ali.

**Push:**
1. `git fetch`, **merge** `origin/main`, check `git log origin/main..HEAD`, then `git push origin HEAD:main`.
2. Confirm production serves the new sha via `?dpl=<sha>` on the asset URLs, or `/api/health` commit.

**After the deploy:**
1. The same drive must report **0 findings**, with the positive controls seen.
2. Run `qa:landing-v3:og-prod` (with the fixed `stateOf`).
3. curl the served HTML of a one-sided detail page, with the WhatsApp user agent and a normal one. Check the JSON-LD, the bar `aria-label`, that the note sentence keeps its spaces (the Next/SWC space-loss trap), and that under 1a no "One-sided win" remains.
4. Take frames at 360/768/1280 × sw/en/zh: detail (one-sided, priced, settled), `/live`, `/results`, `/updown`. Look at them.
5. The C1 row turns 🔵 when its commit is live, and ✅ only after production is measured and the frames looked at.

**Docs, in the same commits:**
- `docs/LANDING-TEN.md`: §0 (C1 state, next step); a new C1 row in the table in §1; the §2.1 WP6 bullet at `:279-283`, which becomes "delivered by C1"; the R5 row: carry `priceState` into the next `/updown` card build.
- `docs/MOBILE-VISUAL-PLAN.md`: `:1438-1441`, and the U32 row `:577`.
- `docs/COMPLIANCE-DECISIONS.md`: a new dated entry if Ali picks 1a.
- The LIVE-QA register: the phantom-fee entry.
- The end-of-session handover.

## 9 · Found outside C1, for the orchestrator (not in this batch)

- **The phantom fee is also in admin and finance readers.** `analytics.ts:142`, `platform-stats.ts:95` (`netPool`), `admin/house/[marketId]/page.tsx:133` and `admin/markets/[id]/page.tsx:174` all call `poolFee(…, resolvedOutcome)`. On a one-sided pool resolved against its money, reports would count fee revenue that settlement never took.
  - Recommendation: a pure `chargedFee(m, rates)` in `lib/payout.ts` that mirrors `settleMarket`'s one-sided branch. It needs its own money review; the Finance Seal lane is closed, so this is Ali's call on who takes it.
  - Do not change `poolFee` itself; settlement calls it.
- **Retire `impliedYesPct`** after G. It is left only in the `market:odds` emits (`market-service.ts:1724`, `:3171`; nobody listens) and in 10 scripts that mention it, including `share-preview.anchors.mjs:21`'s `to`. That needs a separate sweep.
- **Swahili uses two words for "pool":** "bwawa" in `noPoolYet` (`:3406`) and "dimbwi" in `resFinalPool` (`:3437`). A question for native review.
- **`red-labels.mjs` anchors are inline,** so `test:red-anchors` cannot audit them (§3b rotted once). Declare them into `scripts/anchors/labels.anchors.mjs`.

## 10 · Added by the orchestrator, 2026-09-27 (seen on production frames after WP14b)

- **The result word's ink.** On every settled card the outcome word in the price slot (`market-card.tsx`, the
  `resolvedOutcome ?` arm: `<div className="mcardp-pct">{outcomeLabel}</div>`) inherits `.mcardp-pct`'s
  `color: var(--yes-400)` — so "HAPANA" (a NO result) and "Batili" (a void) are painted YES-green on `/results`,
  `/watchlist` and the `/markets` resolved strip. A result must wear its own side's ink (NO → the no ink, UP/DOWN via
  the lexicon) and a void a neutral one (`--text-muted`), with a guard (`test:one-sided` §8 or `test:outcome`) and a
  plant. Build it with commit A (same file family, same drive).
