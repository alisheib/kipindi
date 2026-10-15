# Responsive soft-warning triage — 15 October 2026

## Evidence and limits

The integrated `c191a9580` local run of `BASE=http://localhost:3046 npm run test:responsive` reported **7,286 pass, 0 fail, 335 warnings** across ten widths. Its 260 screenshots are in `C:\50pick-ssd\kipindi-payout-proof-1015\.50pick-shots\responsive`. The full warning stream was not retained; the script prints only its first 60 warnings. Consequently this note classifies the known families and source mechanics, **not an exact count per family** or a claim that every warning has been audited. An integrated rerun should capture the entire stream before release.

`scripts/responsive-audit.mjs` emits one touch warning per route/width when one or more elements are small. It reports only the first six labels for that cell. The measurement is `getBoundingClientRect()` and the current predicate is height under 40px **or width under 24px**, despite the “≥40” label. It cannot see pseudo-element reach, and it exempts every anchor whose computed display contains `inline`, including standalone `inline-flex` links. A green cell therefore does not establish that all links are 40×40.

## Classification against the 58-finding matrix

| Family | Disposition | Evidence / next proof |
| --- | --- | --- |
| Up & Down money stake chips | Real: F14, S12 owner. | The 1K/5K chips are under 40px and the row clips at 320 in the original audit. Confirm the S12 candidate on the integrated signed-in route; do not suppress the warning. |
| Seven empty-state alignment routes | Approved PV-03 pending soft ruling. | `EMPTY_ALIGN_PENDING` in the script names `/markets`, `/results`, `/live`, `/updown`, `/updown/history`, `/fairness`, `/wallet`. These warnings reflect the explicit 2026-09-04 tolerance decision; the script still hard-checks collection-owned empty states. |
| Market card Share/Details | Bounding-box false positives. | CSS expands the 13×17 Share and 53×17 Details paint boxes to roughly 42×41 and 65×41 reach through `::after`. The visual audit records `elementFromPoint` proof; repeat the tap-hit probe on integrated code. Raising their visible row would change card geometry. |
| Account email edit, password action, privacy radio choices | Real in `c191`, owned by `codex/profile-touch-candidate-1015` at `708e602a1`. | The branch adds 40px in-flow reach and focus styling; `scripts/profile-touch.test.mjs` guards the source. Rendered hit and keyboard proof at 320/360/390 remains due after integration. |
| KYC bottom Profile and Wallet links | Real in `c191`, same profile-touch owner. | The branch gives both links `min-h-[var(--tap-min)]`; repeat rendered signed-in KYC proof. Inline links within explanatory prose are intentionally exempt. |
| Responsible-gambling / feedback switches | Bounding-box false positives. | The kit's track is 44×26 by design; `.toggle-switch::after` supplies 40px vertical reach. The production `qa:toggle-hit` probe uses `elementFromPoint`; repeat against the integrated build if this component changes. |
| Standalone wallet grant-history link | Unowned issue found in source, missed by the audit's broad inline-anchor exemption. | `src/app/wallet/wallet-client.tsx` now gives the Show all/Show live link a 40×40 minimum in-flow box and 11px ladder type. This view is currently conditional on existing grants or a live bonus feature. Render its populated state to verify reach and spacing before release. |

Other small controls named in the visual matrix retain their own owners: F03/F04/F05/F06/F07/F08/F27/F30/F45 and related classic surfaces belong to V2/S12 checkpoints. F54 is not a touch warning; its cited chart component was deleted and the TradingView replacement needs a rendered repro. F20/F29 are handled in the separate legal presentation checkpoint `8301595ef` without changing binding copy.

## Integration proof still owed

Capture the full warning stream on the integrated build and group it by route plus the first six element labels. Repeat `qa:toggle-hit` and market-card `elementFromPoint` checks; run the signed-in account, KYC, and bonus-wallet states at 320/360/390 with keyboard focus. A full warning total can be compared only after retaining every warning line: ten breakpoints and approved PV-03 warnings make raw totals misleading.
