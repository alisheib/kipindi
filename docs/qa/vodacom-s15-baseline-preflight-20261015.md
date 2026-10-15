# S15 baseline preflight — 2026-10-15

At 17:10 UTC, I made SELECT-only reads of production `SiteVisitPage` and
`JourneyFunnelDay` through the existing Railway public database proxy. The live
app deployment was `f0a59f84c97fa889a7109f19be55d462f556a972`.
No account, payment, or identifying fields were read. This is a counter
completeness check, **not** the five-measure agency baseline or S15 approval.

The counters' first complete East Africa day is 2026-10-02. For every complete
day from October 2 through October 14, production had a home-page view row and
at least one old-journey funnel row:

| EAT day | Home views | Old funnel rows |
| --- | ---: | ---: |
| 2026-10-02 | 56 | 7 |
| 2026-10-03 | 80 | 7 |
| 2026-10-04 | 40 | 6 |
| 2026-10-05 | 64 | 7 |
| 2026-10-06 | 92 | 8 |
| 2026-10-07 | 229 | 10 |
| 2026-10-08 | 236 | 16 |
| 2026-10-09 | 128 | 12 |
| 2026-10-10 | 114 | 11 |
| 2026-10-11 | 88 | 12 |
| 2026-10-12 | 107 | 10 |
| 2026-10-13 | 66 | 7 |
| 2026-10-14 | 54 | 7 |

The 14-day window can first be October 2–15 inclusive, after October 15
finishes at **2026-10-16 00:00 EAT** (2026-10-15 21:00 UTC). At that point,
repeat the completeness read and use the integrated S13 definitions and
production data to calculate the actual five-measure baseline. If a counter
read fails or a day is missing, record the gap and keep the S15 gate closed.
The October 1 partial day must not be used to shorten the wait.
