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
 * ⛔ The heights are the rendered ones, not approximations: `h-11` matches the `lg` button and
 * the panel's `p-4` plus a `text-title-sm` line is the masked number's box.
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
        <div className="h-11 w-full rounded-lg bg-bg-overlay/60" />
      </div>
    </PageContainer>
  );
}
