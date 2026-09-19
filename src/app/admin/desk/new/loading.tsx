import { AdminPageHead } from "@/components/admin/admin-shell";
import { AdminBody } from "@/components/admin/admin-body";
import { SkChip, SkFormCard } from "@/components/admin/admin-skeletons";

/**
 * What is coming on the designation wizard, card for card and in the page's own order (C7-SPEC rulings 313, 417):
 * the head with its one back link, the step line and its bar, then the step's own card.
 *
 * ⛔ IT CARRIES THE PAGE'S REAL TITLE, AND THAT IS ONLY SAFE BECAUSE THE TITLE IS NEUTRAL (rulings 313, 453). A
 * `loading.tsx` is a Suspense fallback: it has no session and no viewer, so it cannot repeat the page's audience
 * check, and whatever it renders is rendered for whoever asked. "Designate an account" names an account and nothing
 * else — it is the same words the desk's own head action carries, and the console's convention is that a loader
 * carries its real title (measured 2026-09-18: 52 admin loaders, 51 render `AdminPageHead`, `totp-verify` the one
 * exception). ⛔ The ACCOUNT page's loader is this section's one exception, because its real title is a gated value.
 *
 * ⛔ EVERY GHOST STATES THE PAGE'S REAL FACTS: the head's own back link at its own height, the step line's two rows
 * (the eyebrow and the 10px bar) at the geometry `ProgressBar` really renders, and ONE form card — because the page
 * renders exactly one card on every step, and the widest of the four is the consent step's two fields. ⛔ NO PAGER
 * GHOST and no table ghost: this route renders neither on any step.
 */
export default function AdminDeskNewLoading() {
  return (
    <>
      {/* The head's action is a text link, not a button, so its ghost is a text-height chip rather than a 44px one:
          a ghost the wrong height is a layout jump, which is the rule `/admin/house`'s own loader states. */}
      <AdminPageHead title="Designate an account" actions={<SkChip className="h-[20px] w-28" />} />
      <AdminBody>
        <div className="space-y-1.5">
          <SkChip className="h-[14px] w-56" />
          <div className="h-[10px] w-full rounded-pill bg-bg-overlay kp-shimmer-track" aria-hidden />
        </div>
        <SkFormCard fields={2} title sw={false} cols="grid-cols-1" fieldH={44} />
      </AdminBody>
    </>
  );
}
