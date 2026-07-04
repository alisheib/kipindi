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

- [ ] **1. Featured/marquee card** — kill the flat uniform grid. Hottest live market
      spans 2 cols: larger %, taller TippingBar, trader crest-stack visible. One hero.
      *(market-card.tsx, globals.css `.market-grid` / `.mcardp`)*
- [ ] **2. Wire dark-but-designed features** — sparkline (`spark` prop not even
      destructured) + trader crest-stack (`traders` destructured, unused). CSS already
      exists (`.mcardp-spark`, `.mcardp-traders`, `.av-stack`); page already fetches both.
      *(market-card.tsx)*
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
