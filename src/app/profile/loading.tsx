import { getServerT } from "@/lib/i18n-server";
import { PageContainer } from "@/components/layout/page-container";

export default async function ProfileLoading() {
  const { t } = await getServerT();
  return (
    <PageContainer tier="reading" className="space-y-6">
      {/* 🔴 DG-P-04 · §S1 — THE WRAPPER IS LOAD-BEARING, and it must move with `page.tsx`.
          `space-y-*` is `> :not([hidden]) ~ :not([hidden]) { margin-top }` — a SIBLING selector
          that counts DOM order, not layout — and `.sr-only` is `position:absolute; margin:-1px`.
          So this h1 held the "first child, no margin" slot while occupying no space, and the
          hero below was handed **32px** of margin-top nobody wrote. `page.tsx` had the identical
          defect, so the two agreed and no jump was visible; fixing only one would CREATE a 32px
          jump on every load of /profile. They move together.
          ⛔ The h1 must NOT go inside the `<section>`: that section is `aria-hidden`, and a
          heading inside it is a heading no screen reader can reach. Hence a wrapper. */}
      <div>
        <h1 className="sr-only">{t.profile.title}</h1>

        {/* Hero card skeleton */}
        <section
          className="rounded-xl border border-border overflow-hidden kp-shimmer-track"
          style={{ background: "var(--hero-panel-grad)" }}
          aria-hidden
        >
          <div className="p-5 lg:p-6 flex items-start gap-4 lg:gap-5">
            <div className="h-16 w-16 rounded-full bg-bg-overlay/20 shrink-0" />
            <div className="flex-1 min-w-0 pt-1 space-y-2">
              <div className="h-2.5 w-16 rounded bg-bg-overlay/20" />
              <div className="h-5 w-40 rounded bg-bg-overlay/20" />
              <div className="h-3 w-32 rounded bg-bg-overlay/15" />
              <div className="flex gap-1.5 mt-1">
                <div className="h-5 w-16 rounded-pill bg-bg-overlay/15" />
                <div className="h-5 w-20 rounded-pill bg-bg-overlay/15" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 border-t border-border/40 divide-x divide-border/40">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="px-4 py-3.5 space-y-1.5">
                <div className="h-2 w-14 rounded bg-bg-overlay/15" />
                <div className="h-5 w-20 rounded bg-bg-overlay/20" />
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Settings grid skeleton */}
      <section aria-hidden>
        <div className="h-3 w-20 rounded bg-bg-overlay mb-3 kp-shimmer-track" />
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-bg-elevated p-3.5 kp-shimmer-track">
              {/* ⚠️ LITERALS, not `h-10 w-10` — spacing is overridden
                  (tailwind.config.ts:200-215) so this drew 80px. It ghosts the profile
                  menu-row icon tile (profile/page.tsx), which is 40px. Move the two together. */}
              <div className="h-[40px] w-[40px] rounded-md bg-bg-overlay shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-28 rounded bg-bg-overlay" />
                <div className="h-2.5 w-36 rounded bg-bg-overlay" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </PageContainer>
  );
}
