import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBar, SkBody, SkChip } from "@/components/admin/admin-skeletons";
import { AdminBarList } from "@/components/admin/admin-charts";
import { LIVE_REASON_ROWS, LIVE_TILE, LIVE_TILES, LIVE_TILE_COUNT, RESULTS_ROW_BOX, RESULTS_ROW_COUNT } from "./live-geometry";

/**
 * The ghost for /admin/campaigns/[id] (U47b-2).
 *
 * ⭐ THE FIRST CARD'S TOP EDGE IS EQUAL BY CONSTRUCTION. The real page renders the same head (the same literal title, the
 * same gloss, no action) and then its status card as the first thing in the body, and so does this: the same `AdminPageHead`,
 * then `SkBody` — the page's own `AdminBody` — with the status card's ghost first. Nothing above that edge can move when the
 * page swaps in; the U47b-2 drive measures it at 1280 and 360.
 * ⭐ THE GHOST IS THE REAL BLOCKS, in the real order, drawn as the page draws them while a campaign is being sent — the state
 * an officer opens this page in: the status card (chip, name, headline, audience, confirmation), the controls card (five
 * buttons at the console's 44px rung, and the line that says why), the figures card (the bar and its caption, six tiles on
 * the page's own grid, the five reasons as the kit's bar list, and the status chips) and — U48a — the results card (its title,
 * the honesty line, and the rows every campaign has, the not-sent row carrying its five reasons). Its boxes are the real ones —
 * the figures' and the results' geometry is `live-geometry.ts`, read by both. ⛔ Heights that depend on the campaign (the audience line wrapping,
 * a callout, a campaign with nobody on its list yet, whose page has no figures card) are NOT equal by construction, said
 * rather than hidden: the drive RECORDS them at both widths. Only the card's top edge is claimed.
 * ⛔ `data-skeleton` stamps are the drive's handles — never match on class strings; each is the real block's `data-block`.
 * ⛔ Never interpolate a Tailwind height and never a numeric scale key that the spacing scale inverts: it is overridden.
 */
/** Written OUT, never interpolated: Tailwind scans source text, so `w-[${n}px]` would compile to nothing (§B8). */
const BUTTON_W = ["w-[96px]", "w-[80px]", "w-[96px]", "w-[80px]", "w-[112px]"];
const CHIP_W = ["w-[88px]", "w-[104px]", "w-[72px]", "w-[96px]"];

export default function Loading() {
  return (
    <>
      <AdminPageHead title="SMS campaign" sw="Kampeni" />
      <SkBody>
        <div data-skeleton="live-status">
          <div className="glass-panel p-4">
            <div className="space-y-2">
              {/* The chip beside the name, on one row at the name's line height. */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <SkChip className="h-[23px] w-[80px]" />
                <SkBar className="h-[24px] w-[200px]" />
              </div>
              {/* The headline (a 20px line), then the audience and the confirmation (18px lines). */}
              <SkBar className="h-[20px] w-[320px] max-w-full" />
              <SkBar className="h-[18px] w-[240px] max-w-full" />
              <SkBar className="h-[18px] w-[360px] max-w-full" />
            </div>
          </div>
        </div>
        <div data-skeleton="live-controls">
          <div className="glass-panel p-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {BUTTON_W.map((w, i) => <SkBar key={i} className={`h-[44px] rounded-md ${w}`} />)}
              </div>
              <SkBar className="h-[18px] w-[280px] max-w-full" />
            </div>
          </div>
        </div>
        <div data-skeleton="live-progress">
          <div className="glass-panel p-4">
            <div className="space-y-4">
              {/* The bar: the kit's 10px track over its caption's line. */}
              <div className="space-y-1.5">
                <SkBar className="h-[10px] w-full rounded-pill" />
                <SkBar className="h-[18px] w-[160px]" />
              </div>
              <div className={LIVE_TILES}>
                {Array.from({ length: LIVE_TILE_COUNT }, (_, i) => (
                  <div key={i} className={`rounded-md border border-border bg-bg-elevated p-3 ${LIVE_TILE}`}>
                    <SkBar className="h-[12px] w-[96px]" />
                    <SkBar className="mt-2 h-[18px] w-[56px]" />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <SkBar className="h-[18px] w-[160px]" />
                {/* The kit's own bar list with blank rows and empty tracks — its geometry, never a copy of it. */}
                <AdminBarList rows={Array.from({ length: LIVE_REASON_ROWS }, () => ({ label: String.fromCharCode(160), value: 0 }))} format={() => String.fromCharCode(160)} />
              </div>
              <div className="space-y-2">
                <SkBar className="h-[18px] w-[200px]" />
                <div className="flex flex-wrap gap-2">
                  {CHIP_W.map((w, i) => <SkChip key={i} className={`h-[23px] ${w}`} />)}
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* U48a · the results card: the card's title, the honesty line's box, then the rows every campaign has — a title and its count
            over one line of help — the not-sent row carrying the kit's bar list with its five blank rows. */}
        <div data-skeleton="live-results">
          <div className="glass-panel p-4">
            <div className="space-y-3">
              <SkBar className="h-[18px] w-[72px]" />
              <SkBar className="h-[44px] w-full rounded-md" />
              <div>
                {Array.from({ length: RESULTS_ROW_COUNT }, (_, i) => (
                  <div key={i} className={`space-y-1 ${RESULTS_ROW_BOX}`}>
                    <div className="flex items-baseline justify-between gap-3">
                      <SkBar className="h-[20px] w-[180px]" />
                      <SkBar className="h-[20px] w-[40px]" />
                    </div>
                    <SkBar className="h-[18px] w-[300px] max-w-full" />
                    {i === 3 && (
                      <div className="pt-1">
                        <AdminBarList rows={Array.from({ length: LIVE_REASON_ROWS }, () => ({ label: String.fromCharCode(160), value: 0 }))} format={() => String.fromCharCode(160)} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </SkBody>
    </>
  );
}
