import { AdminBody } from "@/components/admin/admin-body";
import { SkCard, SkChip } from "@/components/admin/admin-skeletons";

/**
 * What is coming on one account's page, card for card and in the page's own order (C7-SPEC rulings 313, 417): the
 * head, the status strip, the section rail, then the overview's three cards.
 *
 * ⛔ **IT CARRIES NO TITLE, AND THAT IS THE WHOLE POINT** (rulings 313, 453). A `loading.tsx` is a Suspense fallback:
 * it has no session and no viewer, so it cannot repeat the page's audience check, and whatever it renders is rendered
 * for whoever asked. Every other loader in this console carries its page's real title because that title is neutral
 * after the rename — but this page's real title is the ACCOUNT'S OWN LABEL, which is a gated value. So this loader is
 * the measured exception the section's own convention names: a ghost where the heading would be, and no string.
 *
 * ⛔ **AND IT GHOSTS THE DEFAULT PANEL ONLY.** A `loading.tsx` receives no `searchParams`, so it cannot know which
 * tab is coming (replan ruling 545 measured that on the landing page and left the fix to the step that restructures
 * the panels). Here the default panel is the overview and its three cards are what is ghosted; the rules and targets
 * panels are each ONE card, so the worst mismatch this loader can produce is two card-heights rather than the
 * 1,189px jump 545 measured next door.
 */
export default function AdminDeskAccountLoading() {
  return (
    <>
      {/* The head's own shape: a title block and one action, at the control's own height, so the page does not drop
          on the swap. `AdminPageHead` is `flex items-end justify-between gap-4 flex-wrap`, so at 360 the action
          wraps onto its own row exactly as the real head does. */}
      <header className="px-4 lg:px-6 py-5 border-b border-dashed border-border-subtle flex items-end justify-between gap-4 flex-wrap">
        <SkChip className="h-[32px] w-56" />
        <SkChip className="h-[44px] w-40" />
      </header>
      <AdminBody>
        <SkCard lines={2} title={false} sw={false} />
        <div className="h-[44px] w-56 rounded-md bg-bg-overlay kp-shimmer-track" aria-hidden />
        <SkCard lines={7} title sw={false} />
        <SkCard lines={1} title sw={false} />
        <SkCard lines={1} title sw={false} />
      </AdminBody>
    </>
  );
}
