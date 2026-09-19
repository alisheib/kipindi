import { AdminPageHead } from "@/components/admin/admin-shell";
import { AdminBody } from "@/components/admin/admin-body";
import { SkBar, SkChip, SkTitle } from "@/components/admin/admin-skeletons";
import { FormColumn } from "@/components/ui/form-column";

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
 * (the 10px bar and the bar's OWN default line beneath it) at the geometry `ProgressBar` really renders, and ONE
 * card — the FIND step's, because that is the step this route opens on with no account chosen. ⛔ NO PAGER GHOST
 * and no table ghost: this route renders neither on any step. ⛔ NO SUBMIT GHOST: the find step has no button.
 */
export default function AdminDeskNewLoading() {
  return (
    <>
      {/* The head's action is a text link, not a button, so its ghost is a text-height chip rather than a 44px one:
          a ghost the wrong height is a layout jump, which is the rule `/admin/house`'s own loader states. */}
      <AdminPageHead title="Designate an account" actions={<SkChip className="h-[20px] w-28" />} />
      <AdminBody>
        {/* ⛔ THE GHOST SITS AT THE PAGE'S OWN MEASURE, AND THE FIRST RENDER IS WHY (ruling 417). Without the
            column the card ghost laid out at 998px against the page's 640 — a card-for-card mismatch of 358px and a
            horizontal jump on every swap. `FormColumn measure="form"` is what the page itself wraps every step in. */}
        <FormColumn measure="form" className="space-y-4">
          {/* ⛔ THE STEP LINE IS THE BAR AND THE BAR'S OWN LINE, IN THAT ORDER (C7 step 6 review, visual-2).
              `ProgressBar` given no caption ALWAYS paints its default line BENEATH the bar, so a two-row ghost
              written as chip-then-bar was both a row short and the wrong way round: measured off the tiles, the
              card dropped 34px at 1280 and 43px at 360 on the swap. */}
          <div className="space-y-1.5">
            <div className="h-[10px] w-full rounded-pill bg-bg-overlay kp-shimmer-track" aria-hidden />
            <SkBar className="h-[14px] w-[104px]" />
          </div>
          {/* ⛔ AND THE CARD IS THE CARD THIS ROUTE OPENS WITH (C7 step 6 review, visual-3). With no `?u=` the
              wizard always resolves to the FIND step — an intro paragraph, ONE field and a hint, and NO submit
              button — while `SkFormCard` ghosts two fields and emits a submit placeholder unconditionally. A
              loader that stands in for step 3 on a route that opens at step 1 is a card-for-card mismatch. */}
          <div className="glass-panel p-4">
            <SkTitle titleW="w-36" sw={false} className="mb-3" />
            <div className="space-y-1.5 mb-4">
              <SkBar className="h-[13px] w-full" />
              <SkBar className="h-[13px] w-3/4" />
            </div>
            <div className="space-y-1.5">
              <SkBar className="h-[13px] w-[136px]" />
              <SkBar className="h-[44px] w-full rounded-md" />
              <SkBar className="h-[13px] w-[196px]" />
            </div>
          </div>
        </FormColumn>
      </AdminBody>
    </>
  );
}
