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
