import { Callout } from "@/components/ui/callout";

/**
 * FeatureStateBanner — THE inline banner for a feature that is not currently usable.
 * One definition, one box, one padding.
 *
 * ⭐ WHY IT EXISTS (2026-09-03), AND THE GUARD IS THE REASON. `proposals-state-views.tsx` had the
 * only copy of this box. When Invite & Earn needed the same state, the obvious move was to paste
 * its five lines into the invite page — and `test:spacing-scale` immediately counted the pasted
 * `p-3.5` as a **NEW inverted-spacing usage** on a ratchet that may only shrink. **A duplicate is
 * not free: the guards can see it even when the pixels agree.**
 *
 * ⚠️ AND THE FIRST EXTRACTION WAS STILL WRONG. Pulling out only the COMING_SOON arm left
 * `p-3.5` in two files (here and the maintenance arm) — 1 → 2, so the ratchet did not move and
 * said so. The honest shape is ONE banner whose tone and glyph are props; "coming soon" and
 * "temporarily unavailable" are two STATES of one box, not two boxes. §B9: new design merges in,
 * it never sits beside.
 *
 * ⚠️ TITLE + BODY ARE CHILDREN, NOT `title`, AND THAT IS DELIBERATE — carried over verbatim,
 * because the reasoning is unchanged: this banner's lead line is 13px bold in the BODY face,
 * while `Callout`'s `md` title rung is 13.5px semibold in `font-display`. Passing `title` would
 * swap the typeface on a live player surface, which is a design decision and not a refactor's to
 * take. `leading-normal` restates the 1.5 the title would otherwise lose to `leading-snug`.
 *
 * ⚠️ `p-3.5` (14px) is the box's uniform inset and is INHERITED, not introduced: the `md` rung is
 * 20px/14px, and this value shipped on the proposals banner with that reason written beside it.
 * It is now one use in one file, which is the only reason it is defensible at all.
 */
export function FeatureStateBanner({
  title,
  body,
  tone = "gold",
  glyph = "clock",
}: {
  title: string;
  body: string;
  /** `gold` = coming soon (aspirational) · `maintenance` = temporarily unavailable. */
  tone?: "gold" | "maintenance";
  glyph?: "clock" | "pause";
}) {
  return (
    <Callout role="status" size="md" surface="panel" tone={tone} glyph={glyph} className="p-3.5">
      <p className="text-[13px] font-bold leading-normal text-text">{title}</p>
      <p className="mt-1 text-body-sm leading-relaxed text-text-muted">{body}</p>
    </Callout>
  );
}

/**
 * The coming-soon state, named. Every "not open yet" surface renders this rather than choosing a
 * tone at the call site — so the gilt/clock pairing is stated once and cannot drift feature to
 * feature. (`proposals-state-views.tsx`'s header: *"COMING_SOON → gilt, aspirational"*.)
 */
export function ComingSoonBanner({ title, body }: { title: string; body: string }) {
  return <FeatureStateBanner title={title} body={body} />;
}
