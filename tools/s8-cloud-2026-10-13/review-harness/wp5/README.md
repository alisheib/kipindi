# S8 WP5's independent review — its behavioural harness (2026-10-13)

Written by the reviewer to A/B the kit `Input` before and after WP5 in a real Chromium (Playwright 1.59): `entry.tsx`
mounts old and new kits side by side, `build.mjs` bundles it (esbuild; the bundle is not committed), and the drives:
`ab.mjs` (11 configurations × 18 keyboard/paste steps, old vs new — value, caret, onChange sequence, parent state,
FormData, markup), `grouped.mjs` (the grouped box's own cases), `ime.mjs` / `ime-ab.mjs` (IME composition through CDP
`Input.imeSetComposition` + `insertText` — the case that multiplied the stake). Paths inside point at the reviewer's
worktree (`/tmp/rev-wp5`); re-point them to yours.
