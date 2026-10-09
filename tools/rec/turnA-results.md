# Turn A (wa-chain) results — WP12 on ec4734af (012cccbc base), OMEGA-COMPILE01, 2026-10-07 15:54:45Z-17:45:39Z

15:54:46 WP12 tree at ec4734af, fingerprint 8c0fa0db9851, clean: yes
15:55:47 typecheck exit=0 — 0 error(s)
16:02:08 battery exit=1 —   437/467 green · 377.3s total   FAILED: test:audit-drain, test:live-target-safe, test:type-scale, test:red-anchors, test:contacts-staging-db, test:revoked-deadend, test:a
16:02:08 fingerprint after the battery: 8c0fa0db9851
17:45:39 fingerprint after red:all: 8c0fa0db9851 — tree same

red:all: 185/234 harness(es) green · 6210.8s total
  TIME (300 s, ran on beside later harnesses on the old runner): red:dal-parity red:house-bot-console red:kyc-gate
  DIRTY (15, all in the two overlaps: house-bot-console 16:19-16:31Z, kyc-gate from ~16:46Z): red:agent-policy red:player-invite-unpaid red:invite-payable-db red:programme-isolation red:no-double-pay red:commission-bounded red:agent-eligibility red:rg-doors red:webhook-money red:css-vars-defined red:tax-report red:icon-sizes red:ai-vocabulary red:section-rail red:validation-focus
  FAIL: red:house-bot-engine red:house-bot-money red:house-bot-c5 red:policy-lines red:kyc-copy-truth red:withdraw-email-gate red:icon-sizes-slack red:tap-floor red:tap-rung red:contrast red:updown-chain-stats red:updown-digest red:cert-expiry red:updown-bet-feedback red:updown-result-announce red:margin-series red:admin-charts red:bonus-one-side red:failure-reasons red:updown-handover red:decomment red:ai-cycles red:tab-anchors red:bar-geometry red:count-truth red:social-home red:social-token red:social-rel red:social-promo red:footer-reachable red:social-panel
  UNRESOLVED ANCHORS: red:updown-chain-stats(2), red:updown-digest(2), red:updown-bet-feedback(3), red:updown-result-announce(2), red:updown-handover(1), red:decomment(6)
  tree after red:all: same as before (8c0fa0db9851) — no residue survived.

Static check (wp12/anchor-diff.mjs, 2026-10-07 ~17:55Z): all 2,151 declared red mutations (105 anchor files) resolve
the same way on main b2e9db81 and on WP12 311a03da — 0 differ; 2 are unresolved on both (e.g. updown-handover's
no-handover-at-all in src/lib/updown-card-phase.ts: 0 on main, on WP12 and on 012cccbc). So no declared anchor is
WP12's doing; undeclared inline anchors are covered by A2's control on main.
