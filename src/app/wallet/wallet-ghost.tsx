"use client";

import { cn } from "@/lib/utils";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { MoneyBarGhost } from "@/app/wallet/money-bar-ghost";
import { useT } from "@/lib/i18n";

/**
 * /wallet's loading picture (and the picture of every page below it while its own loads), drawn in the browser
 * (round 5's follow-up, R5-H · G-2): `loading.tsx` (this folder) answers on the server the one thing the browser cannot
 * read — whether the bonus programme is live (`bonusLive`) — and this reads its words from the client dictionary, so a
 * refresh of /wallet carries a reference, not this tree. `components/ui/page-loader.tsx` has the convention.
 */
export function WalletGhost({ bonusLive }: { bonusLive: boolean }) {
  const { t } = useT();
  return (
    <PageContainer tier="reading" className="space-y-6">
      {/* 🔴 DG-P-03 · §K — TWO DEFECTS, AND THE SECOND ONE ONLY SHOWS ON A PHONE.
          (1) The eyebrow + h1 were `PageHeader`'s recipe retyped by hand; `wallet-client.tsx`
          renders the component with these two keys, so this renders it too — the
          hand-typed copy also had no `mb-1` under the eyebrow, where `PageHeader` does.
          (2) 🔴 THE WRAPPER DID NOT MATCH THE PAGE. This was `flex items-end justify-between`,
          while `wallet-client.tsx:500` is `flex flex-col items-start gap-3 sm:flex-row
          sm:items-end sm:justify-between` — so **below 640 the real wallet STACKS its title
          above the two buttons and the skeleton put them on one row**. The header changed
          layout the instant the data landed, on the page a player opens to see their money.
          ⭐ THE PAGE'S OWN TWO KEYS since round 5's follow-up (R5-H): the eyebrow read `wallet.title` beside the page's
          `common.walletLabel` — one word in all three languages today, two keys that could part tomorrow (§L1 — one
          name per destination; same component, same props). */}
      <header className="flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader eyebrow={t.common.walletLabel} title={t.common.yourFunds} />
        <div className="flex items-center gap-2 shrink-0">
          {/* ⚠️ BOTH AXES ARE LITERALS, and for two DIFFERENT reasons — worth keeping straight.
              HEIGHT: not `h-10`, because spacing is overridden (tailwind.config.ts:211-224) and
              `h-10` drew an 80px pill for a `btn-md btn-pill` that is 44px. That one was a
              rendering bug.
              WIDTH: `w-24` painted 96px perfectly well — 24 is NOT an overridden key, so
              Tailwind's default applied and it read as written. It became a literal on
              2026-09-10 anyway, because the spacing ratchet counts key 24 as INVERTED: it TIES
              overridden key 11 at 96px, so a bigger-looking key paints no bigger a box. The
              literal is the remedy `ui-consistency`'s `numeric-size-utility` prescribes, and it
              is the same 96px either way. */}
          <div className="h-[44px] w-[96px] rounded-pill bg-bg-overlay kp-shimmer-track" />
          <div className="h-[44px] w-[96px] rounded-pill bg-bg-overlay kp-shimmer-track" />
        </div>
      </header>

      {/* B-29 / V-2 — the page renders TWO wallet cards side-by-side at lg
          (main + bonus). The old single full-width ghost snapped to half-width
          and popped a second card when the real page resolved — the most
          visible "cheap" moment on the money page. Mirror the real grid.

          🔴 …AND SINCE 2026-09-06 THE REAL GRID IS ONE CARD, so this mirrors that instead.
          The bonus programme is withdrawn (`feature-state.ts`), `BonusWalletCard` returns
          null for a player who holds no grant, and `wallet-client.tsx` drops `lg:grid-cols-2`
          to match. A skeleton left at two columns would ghost a card that never arrives and
          then snap the balance from half to full width — the same defect B-29 fixed, running
          in the opposite direction. ⛔ This repo has shipped exactly this before: loading
          skeletons that still described the page as it used to be.

          ⚠️ IT MIRRORS THE FEATURE STATE, NOT THE PLAYER. A skeleton has no data, so it
          cannot know whether THIS viewer still holds a legacy grant. It follows the state it
          can know, which means the rare grant-holder sees one ghost and gains a second card.
          That is the safe direction: under-promising costs a reflow, over-promising shows a
          player a money card that never comes. */}
      <div className={cn("grid grid-cols-1 gap-4 items-stretch", bonusLive && "lg:grid-cols-2")} aria-hidden>
        <div
          className="rounded-xl border border-border overflow-hidden kp-shimmer-track"
          style={{ height: 160, background: "linear-gradient(135deg, oklch(23% 0.075 268), oklch(16% 0.05 268))" }}
        >
          <div className="p-5 lg:p-6 space-y-4">
            <div className="h-3 w-[80px] rounded bg-bg-overlay/30" />
            {/* ⚠️ LITERAL, not `h-10` (80px on the overridden scale) — the real balance figure
                is 38px mono (wallet-client.tsx:74), so that is what the ghost must be. */}
            <div className="h-[38px] w-40 rounded bg-bg-overlay/20" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-[64px] rounded-md bg-bg-overlay/15" />
              <div className="h-[64px] rounded-md bg-bg-overlay/15" />
            </div>
          </div>
        </div>
        {/* Bonus wallet card — ghosted ONLY while the programme is live. ⭐ D5 (2026-08-21)
            — ROYAL, because the real card behind it is royal now. It used to ghost in a warm
            gold gradient, so the wallet loaded gold-on-the-right and then repainted; a
            skeleton that lies about the colour of the surface it stands in for is a flash of
            the exact hierarchy that ruling removed. `.mat-raised` is the same rung the real
            panel picks. ⛔ Kept, not deleted: it is what the ON path needs back the day the
            programme returns, and deleting it is how re-enablement ships a bare skeleton. */}
        {bonusLive && (
          <div
            className="mat-raised rounded-xl overflow-hidden kp-shimmer-track"
            style={{ height: 160 }}
          >
            <div className="p-5 lg:p-6 space-y-4">
              <div className="h-3 w-[96px] rounded bg-bg-overlay/30" />
              {/* ⚠️ LITERAL, not `h-10` — the bonus balance is also 38px (wallet-client.tsx:162). */}
              <div className="h-[38px] w-[128px] rounded bg-bg-overlay/20" />
              <div className="h-[64px] rounded-md bg-bg-overlay/15" />
            </div>
          </div>
        )}
      </div>

      {/* Tab skeleton — ⭐ THE RAIL'S OWN GEOMETRY (round 5 of the visual pass, R5-B, 2026-10-09, F6): the option box,
          its label and its underline as `Tabs variant="line"` draws them (tabs.tsx: `items-end gap-1`, a 44px box with
          `px-4`, the label `text-body-sm font-semibold` centred, the underline 2px at the box's foot 12px in), where the
          skeleton set the words in the display face on the box's first line, 14px in, under a box-wide underline — so the
          first word moved 6px right and about 10px down (baseline ~16.7 → 26.7 in the box) when the page landed. `data-rail-ghost` lets the journey's rail rule (globals.css,
          `[data-section-rail]`) draw this ghost exactly as it draws the rail: the first word on the column's edge. */}
      <nav className="flex items-end gap-1 border-b border-border" data-rail-ghost="" aria-hidden>
        {[t.common.activity, t.common.methods, t.common.limits].map((tab, i) => (
          /* ⚠️ LITERAL, not `h-9` — spacing is overridden (tailwind.config.ts:200-215) so this
             drew 64px for a tab row that renders at 44px (`Tabs variant="line"`, tabs.tsx),
             i.e. a guaranteed 20px content jump on every wallet load. PLAYER MONEY SURFACE. */
          /* ⭐ D5 — brand, not gold. The real rail is `<Tabs variant="line">`, whose active
             underline is `--brand-500` (tabs.tsx), and `wallet-client.tsx` states the reason
             in its own comment: section tabs are NAVIGATION, not earned money (§M3). The
             skeleton was drawing a gold underline that repainted brand a beat later — the
             one place on this page where the ghost disagreed with the page. */
          <div key={tab} className="relative inline-flex h-[44px] items-center whitespace-nowrap px-4 text-body-sm font-semibold text-text-subtle">
            {tab}
            {i === 0 && <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-pill bg-brand-500" />}
          </div>
        ))}
      </nav>

      {/* ⭐ THE PAGE'S BAR (`wallet-bar.tsx`), drawn since round 5's follow-up (R5-H · G-2b): this ghost had none, so the
          bar — 141px on a phone (row 1 10 + 44 + 8 + 17.25 − 4, row 2 12 + 44 + 10), 120 to 224px from 1024 — appeared
          from nothing between the rail and the list when the data landed (R5-B named it). It is the money books' one bar
          ghost (`money-bar-ghost.tsx`, /wallet/receipts' too), with a player's eight lenses in `lensLabel`'s words. */}
      <MoneyBarGhost t={t} lenses={[t.common.all, t.wallet.typeIn, t.wallet.typeOut, t.wallet.typeBet, t.wallet.typePayout, t.wallet.typeRefund, t.wallet.typeBonus, t.wallet.typeAdjust]} count={t.wallet.nResults.replace("{n}", "00")} />

      {/* The "All receipts" door (2026-10-07): a 44px row, right-aligned, over the list — as the page draws it for an
          account that has rows, which is the account that opens /wallet. ⭐ In the bar's rhythm by the page's own class
          (`.kp-wallet-door`, R5-B F13: 15px over it after a bar, −7 under it) — R5-H, G-2b. */}
      <div className="kp-wallet-door flex justify-end" aria-hidden>
        <div className="flex h-[44px] items-center">
          <div className="h-[14px] w-[112px] rounded bg-bg-overlay kp-shimmer-track" />
        </div>
      </div>

      {/* The spark and the list, as the page holds them: ONE section on its 16px rhythm (`space-y-3`, wallet-client.tsx),
          not two blocks on the container's 32px rung — the list stood 16px lower than it lands (R5-H, G-2b). */}
      <section className="space-y-3">
        {/* 30-day balance spark strip (46px svg + label padding on the page). */}
        <div className="rounded-xl border border-border bg-bg-elevated p-3 kp-shimmer-track" aria-hidden>
          <div className="h-2.5 w-36 rounded bg-bg-overlay mb-2" />
          <div className="h-[46px] w-full rounded bg-bg-overlay/40" />
        </div>

        {/* Transaction row skeletons */}
        <div className="rounded-xl border border-border bg-bg-elevated overflow-hidden" aria-hidden>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-3 px-3 border-b border-border last:border-b-0 kp-shimmer-track">
              <div className="h-[34px] w-[34px] rounded-md bg-bg-overlay" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-[128px] rounded bg-bg-overlay" />
                <div className="h-2.5 w-[96px] rounded bg-bg-overlay" />
              </div>
              <div className="text-right space-y-1.5">
                <div className="h-3.5 w-[80px] rounded bg-bg-overlay ml-auto" />
                <div className="h-2 w-14 rounded bg-bg-overlay ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </PageContainer>
  );
}
