# Load & Scale Suite

The first harness that runs 50pick against **real Postgres**. Every `test:*` suite, the
dev server, and every `stress-*` endpoint select the DAL on `!!DATABASE_URL` — and no `.env`
exists, so they all run against an in-memory `Map`. This suite sets `DATABASE_URL` and drives
the services directly under `tsx`, so the advisory-lock + connection-pool path finally executes.

**Findings so far: `docs/LOAD_DAY1_FINDINGS.md`.**

## Local Postgres (no Docker, no admin, disposable)

A user-space PG 16 cluster lives at `F:\pg-loadtest`, on **port 5433** (never collides with a
default install). It is disposable — `fsync=off`, so it measures our code, not the SSD.

```powershell
# start it (if not already running)
& F:\pg-loadtest\pgsql\bin\pg_ctl.exe -D F:\pg-loadtest\data -l F:\pg-loadtest\pg.log start

# stop it
& F:\pg-loadtest\pgsql\bin\pg_ctl.exe -D F:\pg-loadtest\data stop

# connection string (set before every run)
$env:DATABASE_URL='postgresql://postgres:pw@localhost:5433/kipindi_load?schema=public'
```

Fresh box? Re-create the cluster: download the PG16 **binaries** zip from EnterpriseDB, unzip
to `F:\pg-loadtest\pgsql`, `initdb -D F:\pg-loadtest\data -U postgres --pwfile=... --locale=C`,
append `port = 5433` + `fsync = off` + `shared_preload_libraries = 'pg_stat_statements'` to
`postgresql.conf`, start, `createdb kipindi_load`, then `npx prisma migrate deploy`.

## Safety — three independent gates

The harness refuses to touch any DB that is not certified disposable:
1. **Hostname denylist** — a prod host (`rlwy.net`, `railway.app`, `50pick.tz`, …) aborts.
2. **localhost only** — the reset script refuses any remote host.
3. **Marker row** — `SystemConfig['__LOAD_TEST_TARGET__']` must equal
   `'I_AM_A_DISPOSABLE_LOAD_TEST_DB'`. A human plants it by hand in each throwaway DB; prod
   never has it. This gate is a property of the **database**, so a wrong env var cannot bypass it.

## Running

```powershell
$env:DATABASE_URL='postgresql://postgres:pw@localhost:5433/kipindi_load?schema=public'

node scripts/load/reset-db.mjs                                # clean + migrate + re-plant marker

npx tsx scripts/load/spike-a-proof.mts                        # A: pool deadlock + money loss
npx tsx --expose-gc scripts/load/spike-b-read-oom.mts         # B: read-path OOM curve
npx tsx scripts/load/spike-c-settlement-cliff.mts             # C: settlement cliff / void mint
npx tsx scripts/load/spike-d-density.mts --pool=60            # D: single-market throughput ceiling
npx tsx scripts/load/spike-e-census.mts                       # E: per-bet round-trip census
npx tsx scripts/load/s10-cross-instance.mts                   # S10: cross-instance double-spend
```

Always `reset-db.mjs` before a run that asserts on money totals — a persistent DB carries
state across runs (fixed IDs collide, audit chains don't chain across runs).

## Millionea (MASWALI-BUILD S7) — self-contained

These three boot the on-box scratch cluster themselves (`scripts/db-scratch.mts`), create their own
database, migrate it and drop it at the end, so they need no `DATABASE_URL`, no marker row and no
`reset-db.mjs`. Every act is several OS processes on one database, started at one instant by a barrier.

```powershell
npm run load:maswali-cross-instance   # S16: the cap, a key, a reference, the close, two releases, a correction,
                                      #      a void — each from two instances at once — and 10,000 tickets settled
                                      #      in both shapes (3 winners; ~7,000 distinct winning players), timed
npm run load:maswali-rush             # S17 (MB-31): the Friday 18:00 rush at 10× the synthetic S7 test reference on two
                                      #      instances, Up & Down running, the close on the real clock; latency
                                      #      percentiles, refusals by reason, then POOL, drift and the trial balance;
                                      #      MB-97 beside it: the week page read per request, the pool frames fanned
                                      #      out to live streams (coalesced), and the inclusion proofs' cost
npm run load:maswali-objection-cross-instance   # S18 (MB-23): the objection door on two instances at once — a filing
                                      #      against the release, a REVERSE against the release, two officers on one
                                      #      case, two REVERSEs of one question, two filings on one question
```

S17's latency targets are named constants at `TBD-BASELINE`: the lead sets them from the first measured
baseline (S7's acceptance) and records them beside their results. Set on 2026-10-22: a landed purchase at most
1,000 ms at p95 and 2,000 ms at p99, and no purchase answered BUSY after its retries (`docs/MASWALI-PLAN.md` §7b S7);
the refusal, Up & Down and close-stamp targets still print without a verdict, and so do MB-97's three (the week-page
read's p95, a pool frame's reach to its last live stream, one inclusion proof's p95). MB-97's identities are judged on
every run that loads them: every page read answered and naming the week, every stream given every frame, the frames
coalesced, the live figure never ahead of the money, every sampled proof under the committed root.
The purchase-rate reference is a disposable load target chosen in `docs/MASWALI-PLAN.md` §7b S7, not a measured
production peak, and MB-97's page-read rate (one read a planned purchase) and stream count are test inputs too, not a
measured audience. S17 fails if the planned arrival load does not reach the purchase and Up & Down paths.

Knobs and what each act asserts are in each script's header.

## The instrumentation hook

Each spike installs its **own** pool-limited `PrismaClient` on `globalThis.__50PICK_PRISMA`
**before** any service import (dynamic `import()` — ESM hoisting defeats a static one), and
asserts the singleton identity. This gives a pool *we* size (the load-bearing knob — the
deadlock will not reproduce on a many-core box without pinning `connection_limit`) and a full
`$on("query")` census. Zero new dependencies.

## ⚠ Do NOT

- Add any `load:*` script to `test:all` or `predeploy` — those run **without** `DATABASE_URL`
  by design and must stay green (56/56). A DB-dependent suite there breaks the baseline.
- Point the harness at production. The three gates make it hard; don't try anyway.
