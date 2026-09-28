import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkBar } from "@/components/admin/admin-skeletons";
import { EMPTY_STATE_BOX, EMPTY_STATE_TITLE, EMPTY_STATE_BODY } from "@/components/ui/empty-state-classes";
import { CONTACTS_EMPTY } from "./contacts-copy";

/**
 * The ghost for /admin/contacts (U17).
 *
 * ⭐ EQUAL BY CONSTRUCTION, NOT BY A TUNED NUMBER. The 2026-09-27 rule (the `/s` skeleton) is that
 * a loader never re-types its page's geometry. So every dimension here comes from the same
 * definition the real block uses:
 *   · the box            → `EMPTY_STATE_BOX`, the string `EmptyState` itself renders;
 *   · the illustration   → the same `mx-auto mb-4 inline-flex` slot, at the 56x56 the
 *                          `kind="admin"` svg really is (`ui/empty-state.tsx`);
 *   · the two text lines → the same `EMPTY_STATE_TITLE` / `EMPTY_STATE_BODY` classes around the
 *                          same `CONTACTS_EMPTY` strings, painted `text-transparent` on a grey
 *                          background, so each line WRAPS exactly as the real sentence does.
 *
 * ⛔ WHY THE TEXT AND NOT A BAR, measured. The body takes ONE line at 1280 and THREE at 360, so the
 * real block is 230.38px at one width and 272.63px at the other. A single fixed-height bar cannot
 * be right at both whatever value it carries: the first version of this file, with hand-typed 20px
 * and 21px bars, measured 227px against the real 230.38px at 1280 — 3.38px short at the only width
 * where it could be compared at all. Laying out the real strings transparently is the only shape
 * that agrees at every width, including widths nobody measured.
 *
 * ⛔ WHEN U20 REPLACES THE BODY WITH THE LIST, REBUILD THIS. The nine-column table, the KPI band
 * and the filter rail are a different block; inheriting this ghost would jump the swap.
 * ⛔ Never interpolate a Tailwind height (`h-[${n}px]` compiles to nothing) and never a numeric
 * `h-`/`w-` key here: this repo's spacing scale is overridden (`w-16` is 96px, not 64).
 */
export default function Loading() {
  return (
    <>
      <AdminPageHead title="Contacts" sw="Anwani" />
      <SkBody>
        {/* `data-skeleton` is the handle the drive measures this box by — the same contract the /s
            skeleton fix used. A guard matching the CLASS string would stop working the day someone
            restyles the box; the stamp says which block this ghost stands in for. */}
        <div data-skeleton="contacts-empty" className={`${EMPTY_STATE_BOX} w-full`} aria-hidden>
          <div className="mx-auto mb-4 inline-flex items-center justify-center">
            <SkBar className="h-[56px] w-[56px] rounded-lg" />
          </div>
          {/* The <p> keeps the real element's BLOCK flow (an `inline-block` here flows in beside the
              `inline-flex` illustration above and collapses the box by 56px — measured), while the
              inner span hugs the text so the grey stands where the words will, not across the column. */}
          <p className={EMPTY_STATE_TITLE}>
            <span className="rounded bg-bg-overlay text-transparent">{CONTACTS_EMPTY.title}</span>
          </p>
          <p className={EMPTY_STATE_BODY}>
            <span className="rounded bg-bg-overlay text-transparent">{CONTACTS_EMPTY.body}</span>
          </p>
        </div>
      </SkBody>
    </>
  );
}
