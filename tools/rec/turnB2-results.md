# Turn B2 (wb2-chain) — 2026-10-08 11:36Z–12:07Z, on 4c1a8dff (WP12 17693fdc + the db:scratch fix), OMEGA-COMPILE01

## The S6 v2 compare (S7-PLAN's start line: "WP12 done with its v2 compare recorded")
- Its first run (turn B, 2026-10-07 21:32) never started: the dev server's Turbopack Google-font import failed. Rerun
  with the checkout's `.next` cleared.
- `--compare parity-v2-7c859cdf-omega.json` (the v2 baseline re-captured here at 7c859cdf; prove-red and a null
  compare clean in turn B): REFUSED by A18 — 8 merges since 7c859cdf carried served files from other lanes (07b7cd60,
  d4ddc8f5, c2b90990, 5a8613eb, 8c8e3a7b, 6fd1f6d8, fc49aeb5, e0d70fad).
- With `--allow-base`: 37/38 — 4.1 "no unexpected difference in 224 cells" FAILS (224 differ); 4.2–4.6 pass; the 8 Sell
  cells hold every S6 expectation (sell-positions-wrap, sell-holder-stack, its layouts, sell-strip-whole, the confirm's
  whole figure and boxes — each seen in all of its cells).
- EVERY difference, grouped over all 224 cells from the two captures (wp12/v2-diff-groups.cjs), and attributed:
  1. footer.html, 224 cells — the rail reserve `pb-[calc(88px+…)]` → `pb-[calc(var(--rail-h)+…)]`: S6 WP11's own,
     declared (footer-rail-h);
  2. footer.html + footer.layout, 224 cells — the `tel:0800110011` helpline link gone, the footer 367px → 331–344.5px:
     0652f61f, "No helpline on any player surface" (the owner's ruling of 2026-10-06);
  3. emailBar.html + .count, 56 cells (the unconfirmed-email viewer) — the bar present → absent: money doors 012cccbc
     (the owner's ruling of 2026-10-07; parity 2.9 reads it);
  4. header.html, 56 cells (guest, en and sw) — a `<!--$-->` Suspense marker before the guest sign-in link, nothing
     drawn differently: 791afa8d ("sign-up keeps what was typed on a refusal…", main's sign-up change).
  ⇒ NO UNEXPECTED S6 DIFFERENCE. footer-rail-h reads "seen in 0 of 224" only because the same footer html also lost the
  helpline, so the declared replacement alone does not reproduce today's bytes; account-streams-200 and
  account-robots-noindex read "seen in 0 of 32": this PC's dev server answers /account the same way at 7c859cdf and
  today (4.2 accepts "in none").

## Header fit and its reds
- qa:journey-header-fit 6/6 over 66 cells; least slack 17.5px (sw 360, TZS 999,999, "Weka pesa"); the rail label
  "Tiketi zangu" wraps to two lines at sw 320 only (allowed below 360).
- red:header-fit 1/1 (deposit-label-stops-yielding: the account menu leaves the 1024 viewport in en and sw).
- red:journey-header-fit --alone 9/9 caught, 0 files left modified.
