# Craft / Polish Sprint — signature layer

Separate axis from `elevation-tracker.md` (which is correctness/infra). This sprint
is about the last 10% of design craft: hierarchy, restraint, motion with weight,
and the Needle as the product's through-line. Goal: the platform reads as *made by
a person who cares*, not template-generated.

**Guiding principle:** one hero + one shine per screen. Gilt is a soloist (money
moments only). The gilt Needle (logo = TippingBar = conviction dial) is the
signature motion — extend it, don't dilute it.

Workflow per surface: audit → name the specific tells → fix → show on live site.
Read `50Pick/design_handoff_prediction_market_kit/kit/` before any color/composition change.

Claude Design sync: run `/design-login` once (interactive) to mirror the component
library to claude.ai/design for visual iteration.

---

## Surface 1 — Markets board (audited 2026-07-04)

- [ ] **1. Featured live markets — KIT-FAITHFUL.** The kit (`kit/extras.jsx:396`) specs
      "FEATURED LIVE MARKETS · 3-card carousel · mobile swipeable · desktop static" —
      a 3-card row of NORMAL cards, NOT one giant hero. (The big hero-with-featured-
      preview is a LANDING-page element, not the board.) A first invented attempt
      (full-width marquee) was reverted 2026-07-04 for diverging from the kit.
- [ ] **2. Volume sparkline — KIT-FAITHFUL.** Use the kit's `VolumeSparkline`
      (`kit/microstructure.jsx:93`): aqua VOLUME BAR histogram, not a YES% line.
      NOTE: needs a 24h volume series; page currently fetches `spark` as a YES% series.
      Data-source check required before wiring.
      NOT IN KIT: trader crest-stack on cards → do not add without a Claude Design spec.
- [x] **3. Restrain the glow** — card hover now lift + border ring only (ambient
      `0 0 30px` brand glow removed); active filter chips no longer glow. Glow now
      reserved for marquee + live pulse. *(globals.css:1798, markets/page.tsx)*
- [x] **4. Heartbeat figure** — live count + TZS-in-play promoted to 12.5px, figures
      at full ink, labels quiet, aqua `SignalPip` live-tick. Aqua (not gilt) by
      design — gold is reserved for earned-money moments. *(markets/page.tsx)*
- [ ] **5. Odds tick on refresh** — flash changed % (gilt) + nudge needle on 30s poll.
      Verify existing value-change flash mechanism first. *(market-card.tsx, refresh-poller)*

### Session log
- 2026-07-04: Surface 1 audited. 5 items logged. Sprint doc created.
- 2026-07-04: Push A shipped — items 3 (restrain glow) + 4 (heartbeat figure).
  (Also ran `prisma generate` — pulled-in ledger.ts needed the regenerated client.)
- 2026-07-04: Push B (invented full-width marquee + line sparkline + crest-stack)
  REVERTED before commit. Rule reaffirmed: build only from `kit/`; if the kit is
  short, commission Claude Design (sharing our kit) rather than inventing.
  Items 1+2 rewritten to the kit's actual spec.
- 2026-07-04: Full kit-vs-live gap audit (6 lanes) → `docs/kit-gap-audit.md`.
  Bucket B verified mostly false alarms (MarketStats + GiltCorner are actually USED).
- 2026-07-04: Bucket A shipped (kit-faithful): button per-size padding + radius,
  spinner 0.7s, card "YES @ %"/"NO @ %" labels, leaderboard @handle, empty-state
  widened + bare illustration. A-5 (detail VolumeSparkline) BLOCKED on real 24h-volume
  data. VISUALLY VERIFIED on desktop + mobile (board card buttons, empty state,
  leaderboard, auth buttons) before push — no glitches. New standing rules: motion
  must be perfect; every UI change must be visually verified before push.
