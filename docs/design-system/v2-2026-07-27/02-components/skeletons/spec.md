> 📑 **RECORD, NOT RULE.** The rulebook is **`docs/DESIGN_AUTHORITY.md`**.
> This is the designer's original redline for this component (July 2026).
> 🔴 **Do NOT paste the fenced CSS below into `src/`.** Those blocks are a scrape of
> `globals.css` frozen at this folder's date: some carry button fills that FAIL WCAG AA
> (superseded by E-119) and several carry the one-sided `inset 0 1px 0` lamp that
> §M1 now bans outright. The live values are in `src/app/globals.css`.

# Skeletons — spec

GIVEN — .skeleton: linear-gradient(90deg, --bg-overlay 0%, --border 50%, --bg-overlay 100%), background-size 200%, skel keyframe sweep, default radius r-sm. Reduced motion: animation clamped by the global rule; the static gradient remains.
RULE: skeleton layouts mirror the target component anatomy exactly (same boxes, radii, heights) so loaded content lands without reflow — e.g. the D1 card skeleton keeps the 40px avatar circle, 52px countdown band, 44px stake row and 2×46px buttons.

## Authoritative CSS
```css
/* ---------- Skeleton ---------- */
.skeleton {
  background: linear-gradient(90deg, var(--bg-overlay) 0%, var(--border) 50%, var(--bg-overlay) 100%);
  background-size: 200% 100%;
  animation: skel 1.4s ease-in-out infinite;
  border-radius: var(--r-sm);
}

(no dedicated CSS block — inline recipe, see preview source)
```
