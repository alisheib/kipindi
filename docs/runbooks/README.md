# Runbooks

## `50pick-updown-runbook.pdf` — Up & Down, for operators and players

Nine pages: who can do what, the navigation, the five steps that generate rounds, how
resolution works against Twelve Data, how a player plays, and how to read a failure. Every
screenshot is from live production, captured 2026-08-02.

Written for Ali's admin testers, owners and players (his request, 2026-08-02). Deliberately
lean — no internals, no code, no commentary a tester does not need.


## `50pick-markets-runbook.pdf` — Markets, for admins

The companion volume, added 2026-08-03 at Ali's request: *"give me a finalised PDF… another one
from it with new screenshots to guide admins with more info on markets."* Where a market comes
from (four doors), the money settings frozen into it at creation, resolving, settlement, what to
do when something is wrong, what the player sees, and a worked example driven end to end on
production while the guide was being written.

Source is `markets-runbook.html` plus `markets-assets/*.png`. Rebuild from the repo root:

```bash
npm run runbook:markets
```

Re-shoot the figures with:

```bash
SHOT_DIR=docs/runbooks/markets-assets node scripts/live-markets-guide-shots.mjs
SHOT_DIR=docs/runbooks/markets-assets node scripts/live-markets-guide-shots2.mjs
```

⚠️ **Every figure is shot as the role that owns the surface**, never as the Owner. A runbook shot
entirely as ADMIN shows controls its reader will not have, and teaches them the product is broken
when a promised button is missing. The role is named in every caption, and the shot script asserts
the refusal figure is *actually* a refusal — the first pass captured `/admin/settlement` as the
compliance officer expecting one, and compliance is not refused there (it holds accounting VIEW).
The figure was real; the caption would have been a lie.

⚠️ **`mkpdf.mjs` derives the page footer from the document's own `<title>`.** It used to hardcode
"50pick · Up & Down runbook", which would have printed the wrong book's name on every page of this
one.

## Rebuilding the Up & Down runbook

Source is `updown-runbook.html` plus `updown-assets/*.png`. The screenshots were captured from
production by `live/s11-guide-shots.mjs` + `s11-guide-shots2.mjs` (element-scoped, as the role
that owns each surface) and cropped by `s11-crop.mjs`. To re-render after editing the HTML,
**from the repo root**:

```bash
node docs/runbooks/mkpdf.mjs      # Chromium print-to-PDF; inlines every image as a data URI
```

⚠️ **`mkpdf.mjs` now lives here, in the repo.** The original existed only in a session
scratchpad, so this instruction was one nobody else could follow and the PDF was effectively
un-regenerable — which is how a runbook goes stale by default. It also now **fails hard** on a
missing image instead of warning: a figure that renders blank leaves a caption asserting
something the reader cannot see.

⚠️ Close the PDF in your viewer before rebuilding — Windows locks it and the write fails
`EBUSY`.

⚠️ Re-shoot the screenshots whenever the console changes shape. A runbook whose pictures no
longer match the product is worse than none — a tester following it will conclude the platform
is broken.

⚠️ The worked example in the footer is a real production round, `udr_0c015a854aa105600373`. If
you change it, change it to another real one — an invented example in a testing guide teaches
people to accept numbers that were never measured.
