# Runbooks

## `50pick-updown-runbook.pdf` — Up & Down, for operators and players

Nine pages: who can do what, the navigation, the five steps that generate rounds, how
resolution works against Twelve Data, how a player plays, and how to read a failure. Every
screenshot is from live production, captured 2026-08-02.

Written for Ali's admin testers, owners and players (his request, 2026-08-02). Deliberately
lean — no internals, no code, no commentary a tester does not need.

### Rebuilding it

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
