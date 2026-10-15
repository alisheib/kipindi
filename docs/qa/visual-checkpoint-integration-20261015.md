# Visual audit checkpoint integration — 2026-10-15

This is a candidate map for the 58 findings in [visual-audit-20261015.md](visual-audit-20261015.md). A source checkpoint is not a visual release. Read the integrated build in a browser before closing any finding. This map was prepared against production `main` at `84fb176901e4012fcbf10d21457cdbffc3cf2190`; rerun the merge rehearsal at the release tip.

## Candidate ownership

| Audit rows | Candidate | State |
|---|---|---|
| F01, F02, F05, F10, F11, F31, F47, F48, F49, F52, F53 | `codex/visual-v2a-candidate-1015` `8986346a0` | Source checkpoint. F01 component/source preflight 5/0 and F10/F53 source geometry 11/0 on that tip. Browser geometry and card/skeleton parity remain. |
| F06 | `codex/visual-f06-candidate-1015` `eb56e7f64`, on top of V2a | Source checkpoint. The `/markets` results link now has a 40px hit box, 13px kit type and a wrap-safe heading row. Existing link-ink guard 89/0 and tap-target guard 30/0; rendered reach/row wrap remain. |
| F03, F04, F07, F08, F09, F13, F19, F21, F22, F23, F24, F25, F26, F27, F28, F40, F42, F45, F46, F51 | `codex/visual-v2b-candidate-1015` `4342d0022` | Source checkpoint. Its 21 fences across these 20 rows and in-memory red plants pass. No integrated browser read yet. |
| F54 | No valid source checkpoint | The audit names deleted `probability-chart.tsx`. Current chart is TradingView `src/components/charts/market-curve.tsx`. Reproduce the clipped right tick and drifting times on the integrated chart before changing the axis. |
| F41 | `codex/visual-f41-candidate-1015` `ea5c51227` | Guest/member loading ghost source guard and six red plants pass. First-paint comparison against real guest and member pages remains. |
| F38, F39 | `codex/visual-kit-candidate-1015` `a7fff9a07` | Partial kit cleanup: Chip and Stat rows plus five spacing usages. Its own backlog document explicitly leaves the rest open. Source guard 8/0; the broad F38/F39 census and changed-pixel read remain. |
| Additional account/KYC touch targets | `codex/profile-touch-candidate-1015` `708e602a1` | Five discovered targets, outside the original 58. Source guard 9/0 with eight in-memory red plants; rendered `elementFromPoint` reach and keyboard focus remain. |
| F15, F15b, F16, F17, F35, F37, F50 | V1 candidate `21fcd4b10` and S8 close branch | Reconcile overlapping bet-sheet geometry; S8 has its own F16 browser evidence. Rerun V1 exact-tip guard and sheet reads after S8, S11 and S12 merges. |
| F36 | S11 candidate `ac2bea747` | How-to source work present; visual read after V1 conflict resolution remains. |
| F12, F12b, F14, F18, F25b, F30, F32, F33, F34, F43, F44, F55 | S12 candidate `baf1cf551` and S12 visual follow-up | At `baf1cf551`, F14 and F25b have direct source fixes. The remaining ten rows still need their scoped visual implementation and measured reads. |
| F20, F29 | Legal/Privacy version integration | Held hash-bound body work. V2b's F19 heading alignment does not close F20. F29 belongs with the final Privacy revision from S11/S12; use a distinct version and update META, codeVersion, hash/tests and decision record together. |

## Read-only merge rehearsal

`git merge-tree --write-tree --name-only` was run pairwise against main, the payout hotfix, S8, S9, S10, S11, S12, S13, and between the visual branches. Results are syntax/merge checks, not behavioral compatibility proof.

- V2a plus F06, V2b, F41 and profile-touch merge cleanly with each other and with each listed release candidate, except V2a/F06 versus S12 in `src/app/live/loading.tsx`. Keep S12's trailing CTA arrow and V2a's 40px six-dot rail/phone second row when resolving; then compare the loading ghost with the actual featured carousel.
- Visual-kit merges cleanly with V2a/F06, V2b, F41, profile-touch, main, S10, S12 and S13. It conflicts with payout hotfix/S8 in `scripts/spacing-scale.test.mts`: recompute the exact inverted-usage count on the combined tree; do not choose any branch's old `CEILING` by inspection. It conflicts with S9 and S11 in `package.json`: retain both sets of scripts and predeploy entries without duplicates.
- V1 merges cleanly with S8 and V2a/V2b/F41 individually, but conflicts with S11 in `src/components/onboarding/how-to-play-sheet.tsx` and S12 in `src/components/journey/bet-sheet/bet-sheet.tsx`. Merge by owning behavior, then rerun the relevant source and browser gates.
- V2a/F06 versus S12 is the only pairwise V2 conflict found. A later stacked merge can reveal more; rerun at the actual integration tip.

## Integration and acceptance sequence

1. Land the payout safety release and S8/S9 money/journey gates first. Keep the visual checkpoints on GitHub until that exact tip is stable.
2. Reconcile V1 with S11 and S12, then merge F41 and profile-touch. Validate S11/S12 Privacy as separate effective versions: both candidates currently call their different content `2026-10-15`; the later one needs `2026-10-15.2` or the actual later date. Close F29 only with its body wrap, version, hash and compliance record. Decide F20's shared type/spacing and figure treatment in the same legal review.
3. Merge V2a through F06, then V2b. Resolve the S12 live-loading collision by retaining both visual and journey changes. Recalculate the shared spacing ratchet when merging the partial visual-kit branch. Keep F38/F39 open until the final census is measured.
4. Reproduce and repair F54 on `market-curve.tsx` in a dedicated browser-backed candidate. The old audit path cannot establish the current failure mechanism.
5. On the **integrated exact tip**, inspect affected routes at 320/360/390/768/1280/1920 in en/sw/zh. Include 320 `/markets` sort and F06 link hit tests, 320/1280 market card and skeleton heights in both densities, both carousels and loading ghosts, leaderboard disclosure/scroll, legal headings and dates, register DOB field, Up & Down controls, question loading before/after hydration, and account/KYC targets. Use `elementFromPoint` for tap reach, check keyboard focus, horizontal overflow, clipping and page-to-ghost alignment. Include the signed-in states omitted by the initial audit, with a local fixture. Run exact-tip source/red guards, typecheck/build, local site check and production read-back before claiming closure.

