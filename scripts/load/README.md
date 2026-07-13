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
