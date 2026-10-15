# S15 baseline SELECT-only production preflight — 2026-10-15

The [aggregate snapshot](s15-baseline-select-read-20261015.json) was read at **2026-10-15 17:42:49 UTC** from Railway's production public database proxy. The session proved `transaction_read_only=on`; every SQL statement is guarded as a single SELECT. No account, market, phone, payment reference, campaign tag, connection URL or credential is in the snapshot.

The fixed S3b/S13 baseline starts with the first full counted East Africa day, **2026-10-02**, and ends **2026-10-15**. At this read only **13 of 14 full days** existed, through October 14, with **zero counting-gap days**. `complete` is `false`. The extractor takes its clock from the database and cannot mark the window complete before **2026-10-16 00:00 EAT**. Its `--require-complete` mode exited **3** on this 13-day production read. A new read after the boundary is required for the final baseline; this snapshot is not S15 launch approval.

| S13 measure | Current aggregate (13 full days) | Status |
| --- | ---: | --- |
| 1. Home → bet sheet | 87 / 1,354 = 6.4% | Partial 13/14 |
| 2. Bet sheet → bet placed | 90 / 542 = 16.6% | Partial 13/14 |
| 3. Short balance → deposit | 423 notices | No offer before launch; no share |
| 4. Deposit → bet completed | — | Not recorded before launch |
| 5. Time to first bet | 9 / 212 = 4.2%; median ≈11 minutes among the 9 | Partial 13/14 |
| 4b. Deposit → any bet within 30 minutes | 14 / 17 = 82.4% | Comparison only; small sample |

The S13 launch-watch baseline so far is **6.923 question bets per counted day** and a **58.62% deposit-confirm rate** over 29 decided deposits. These remain provisional until the 14th full day is read. The production launch-observation row is absent; the S13 view treats that as prelaunch. There were no waiting 24-hour first-bet cohorts or 30-minute deposit follow-ups at this read.

## Reproduce the final read

Run `npm run qa:s15-baseline -- --require-complete --out docs/qa/<dated-redacted-baseline>.json` after 2026-10-16 00:00 EAT. Supply `PROD_DATABASE_PUBLIC_URL` in the environment or in the local `.env.qa.local`, as `qa:short-title-fit` does. The tool refuses a non-Railway-public-proxy host, malformed or ACTIVE launch record, a session that does not prove read-only, and any incomplete 14-day window in `--require-complete` mode. `npm run test:s15-baseline-select` checks the SELECT guard, launch guard, 13/14-day boundary and fixed-window behavior without a connection.

The five definitions, 4b comparison and status words are imported from [`src/lib/journey/measures.ts`](../../src/lib/journey/measures.ts), matching [S13's definitions table](../design-system/v5-2026-09-29-simplified-journey/S13-PLAN.md). The script reads daily funnel and home-view aggregate tables and uses a SQL aggregate for the first-bet cohort. Rows remain in the database; only the aggregate result is written. It also reports the S13 rollback-watch baseline, because S15 will need the 70% bets-per-day and 80% deposit-confirm-rate thresholds.
