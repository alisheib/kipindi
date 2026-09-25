import { PageContainer } from "@/components/layout/page-container";

/**
 * The LOADING state — one of U8's six, and the one people see on the connection this page is
 * actually reached over.
 *
 * ⭐ IT DESCRIBES THE PAGE THAT IS COMING, AND NOTHING ELSE: a heading, the masked-number
 * panel, then the two buttons. A skeleton that promises a shape the page does not render is a
 * layout that jumps the moment the data lands, and this page's whole job is a button somebody
 * taps once — a button that moves under a thumb is a tap that lands somewhere else.
 *
 * ⛔ The heights are the rendered ones, not approximations: the bar reads the `lg` button's own
 * token, `--h-control-lg`, and the panel's `p-4` plus a `text-title-sm` line is the masked number's box.
 * 🔴 Corrected 2026-09-25 (marketing S6, caught by `test:ui-consistency`): this bar was a size-11
 * spacing utility, which this repo's OVERRIDDEN spacing scale renders at 96px — twice the 48px
 * button — so the page jumped by 48px the moment it landed, the one thing this file says it prevents.
 */
export default function OptOutLoading() {
  return (
    <PageContainer tier="receipt" className="space-y-5" aria-busy="true">
      <div className="h-6 w-56 rounded bg-bg-overlay/60" aria-hidden />
      <div className="h-4 w-full rounded bg-bg-overlay/40" aria-hidden />
      <div className="rounded-xl glass-panel p-4" aria-hidden>
        <div className="h-6 w-40 rounded bg-bg-overlay/60" />
      </div>
      <div className="flex flex-col gap-2" aria-hidden>
        <div className="h-[var(--h-control-lg)] w-full rounded-lg bg-bg-overlay/60" />
      </div>
    </PageContainer>
  );
}
