# S9 core production cutover — prepared, not executed

This procedure is for the final, fully validated S8 + S9 + payout-fail-close tip. Card
lost-redirect recovery is held until the real Selcom Card checkout host is verified.
Do not run this for the S9 checkpoint alone. Record the exact source SHA and full test,
backup-schema, build, browser, and money-gate results before the cutover.

At 2026-10-15 14:14:45 UTC, the SELECT-only `qa:provider-ref-uniqueness` read on the
Railway production proxy found **0** duplicate non-null `providerRef` groups, **0**
excess rows, **0** cross-provider groups, and **0** same-provider groups. Only the old
non-unique `Transaction_providerRef_idx` was installed. Repeat this read after old
writers have stopped; this result is a snapshot, not authority for a later migration.

## Why the app must stop before this migration

The new `DepositFundingClaim` primary key blocks a late reservation only in S9 code.
An old process does not read its terminal `REFUSED` state. This service has one app
replica in `us-west2`, and `railway.json` currently allows **60 seconds of deployment
overlap** plus **30 seconds of draining**. Railway says the old deployment is stopped
*after* the new one is active; setting overlap to zero does not prove that an old
in-flight request cannot race a new one. Its [deployment teardown](https://docs.railway.com/deployments/deployment-teardown)
and [deployment lifecycle](https://docs.railway.com/deployments/reference) describe
this order. The existing maintenance and payment switches hydrate once per process,
so a switch changed in one process cannot prove every old worker has stopped.

Railway documents that [`scale REGION=0` removes all replicas](https://docs.railway.com/cli/scale)
without a separate redeploy. Scale **only the `50pick` app**, leaving Postgres and
Redis running. The app is intentionally unavailable during this window. Do not
rollback to a pre-claim app after S9 has processed a funding key; keep the app down
or fix forward if release validation fails.

Railway's scale CLI accepts either friendly names or region IDs. The production
service's read-only config currently has exactly
`deploy.multiRegionConfig.us-west2.numReplicas = 1`; `us-west2` is the region ID
used below (and in Railway's [config-as-code example](https://docs.railway.com/config-as-code/reference#multi-region-configuration)).
Recheck the live `multiRegionConfig` before executing either scale command and
stop if its region set changed. Railway's public docs do **not** establish that
a Git push builds and selects a deployment while its replica count is zero.
Rehearse that sequence on a non-production Railway service with the same source
and deploy settings before this production window; record the new deployment
status and selected deployment ID at zero replicas. A missing or inconclusive
rehearsal blocks the production cutover.

## Exact sequence (PowerShell, from the final release checkout)

1. Freeze the verified release SHA, confirm `main` has not advanced, and take the
   required production backup. Confirm the zero-replica deployment rehearsal
   above passed and read the live service config to confirm its only replica
   region is still `us-west2`. Confirm the public database URL is present in
   `F:\kipindi-main\.env.qa.local` without printing it. The local migration command
   below uses only that Railway public proxy, not `railway run`'s private host.
2. Scale the app to zero, then check **every** app deployment for running instances.
   Wait beyond the configured 30-second drain and repeat the check. Abort if any old
   app instance remains. Do not scale Postgres or Redis.

   ```powershell
   $project = '5e87353c-1d59-433d-a683-a32b9149f74c'
   $service = 'baba8802-7f79-4306-9706-1e19a4b95e7c'
   $region = 'us-west2' # Must match the live multiRegionConfig region ID checked in step 1.
   railway scale --project $project --environment production --service $service --json "${region}=0"
   if ($LASTEXITCODE -ne 0) { throw 'Railway scale-to-zero failed.' }
   function Assert-AppZero {
     $state = railway status --project $project --environment production --json | ConvertFrom-Json
     if ($LASTEXITCODE -ne 0 -or -not $state) { throw 'Cannot read Railway status.' }
     $prod = @($state.environments.edges | Where-Object { $_.node.name -eq 'production' })[0].node
     $app = @($prod.serviceInstances.edges | Where-Object { $_.node.serviceId -eq $service })[0].node
     if (-not $app -or $app.numReplicas -ne 0) { throw 'The app is not configured for zero replicas.' }
     $instances = @($app.activeDeployments | ForEach-Object { $_.instances })
     if ($instances.Count -ne 0) { throw "App instances remain: $($instances.Count)" }
   }
   Assert-AppZero
   Start-Sleep -Seconds 35
   Assert-AppZero
   ```

3. Repeat the read-only duplicate scan with `default_transaction_read_only=on`;
   require every duplicate count to be zero. The script prints counts and index
   names only. **Stop** if it fails or reports duplicates.

   ```powershell
   $env:PROD_S9_QA_ENV = 'F:\kipindi-main\.env.qa.local'
   node --input-type=module -e 'import dotenv from "dotenv"; dotenv.config({path:process.env.PROD_S9_QA_ENV,quiet:true,override:true}); await import("./scripts/qa-provider-ref-uniqueness.mjs")'
   ```

4. Apply **all** exact-tip pending migrations while no old app instance exists.
   Prisma applies them in timestamp order: `20261013160000_deposit_return_intent`
   first (nullable `Position.origin` and `Transaction.pendingBet`, with bounded
   lock retries), then `20261015111500_provider_ref_global_unique`, then
   `20261015133000_deposit_funding_claim`. The return fields are additive and
   compatible with the prior app schema; the global uniqueness and terminal
   claim semantics require the old writer to remain stopped. Require all three
   named migrations to finish and `migrate status` to report the schema current.
   The hostname guard rejects a non-Railway target; the URL stays inside the
   child environment. On failure, keep the app at zero and investigate; do not
   restore the old writer against a partially migrated database.

   ```powershell
   node --input-type=module -e 'import dotenv from "dotenv"; import {spawnSync} from "node:child_process"; dotenv.config({path:process.env.PROD_S9_QA_ENV,quiet:true,override:true}); const raw=process.env.PROD_DATABASE_PUBLIC_URL??""; let u; try {u=new URL(raw)} catch {process.exit(2)}; if(!/\.rlwy\.net$|\.railway\.app$/.test(u.hostname))process.exit(2); for(const step of ["deploy","status"]){const r=spawnSync(process.execPath,["node_modules/prisma/build/index.js","migrate",step],{stdio:"inherit",env:{...process.env,DATABASE_URL:u.toString()}}); if(r.status!==0)process.exit(r.status??2)}'
   ```

5. Rerun `qa:provider-ref-uniqueness`; require **0 duplicates** and
   `Transaction_providerRef_key: UNIQUE`. Push only the verified fast-forward
   release SHA to `main`. Railway's docs do not guarantee the new Git commit
   builds at zero replicas, so **observe** a deployment with that exact
   `meta.commitHash`, `SUCCESS` status, and the same ID selected by
   `railway service status` before restoring one app replica. The production
   GitHub deployment currently exposes `meta.commitHash` in the JSON array
   returned by `railway deployment list`; verify it again at cutover. If any
   check fails or times out, keep the app at zero and investigate the platform
   behavior; never scale a service still selecting the old deployment. If
   Railway starts an app instance despite the zero-replica setting, stop the
   release and inspect it before any funding request is permitted.

   ```powershell
   $releaseSha = git rev-parse HEAD
   if (git status --porcelain) { throw 'Release checkout has uncommitted changes.' }
   git fetch origin main
   git merge-base --is-ancestor origin/main $releaseSha
   if ($LASTEXITCODE -ne 0) { throw 'Release SHA is not a fast-forward of main.' }
   git push origin "$($releaseSha):main"
   if ($LASTEXITCODE -ne 0) { throw 'Release push failed; keep the app stopped.' }
   $deadline = (Get-Date).AddMinutes(20) # Replace with the measured staging bound.
   $target = $null
   $selected = $null
   do {
     Assert-AppZero
     $deployments = @(railway deployment list --project $project --environment production --service $service --limit 10 --json | ConvertFrom-Json)
     if ($LASTEXITCODE -ne 0) { throw 'Cannot read Railway deployment list.' }
     $target = @($deployments | Where-Object { $_.meta.commitHash -eq $releaseSha } | Sort-Object createdAt -Descending | Select-Object -First 1)[0]
     if ($target -and $target.status -eq 'FAILED') { throw 'Target deployment failed; keep the app stopped.' }
     $selected = railway service status --project $project --environment production --service $service --json | ConvertFrom-Json
     if ($LASTEXITCODE -ne 0) { throw 'Cannot read selected Railway deployment.' }
     if ($target -and $target.status -eq 'SUCCESS' -and $selected.deploymentId -eq $target.id) { break }
     Start-Sleep -Seconds 15
   } while ((Get-Date) -lt $deadline)
   if (-not $target -or $target.status -ne 'SUCCESS' -or $selected.deploymentId -ne $target.id) {
     throw 'Target deployment is not proven built and selected at zero replicas; keep the app stopped.'
   }
   Assert-AppZero
   railway scale --project $project --environment production --service $service --json "${region}=1"
   if ($LASTEXITCODE -ne 0) { throw 'Railway scale-to-one failed.' }
   ```

6. Read back the new `Position.origin`, `Transaction.pendingBet`, and
   `DepositFundingClaim` table/primary key through the production read-only
   proxy, plus the unique `Transaction_providerRef_key` from step 5. Confirm
   exactly one running app instance on the new SHA, successful start logs
   (`prisma migrate deploy && next start`), healthy `/api/health`, all public hosts,
   production site check, and owner-visible deposit/recovery, classic wallet and
   payout-review screens. Read pending DEPOSIT/WITHDRAWAL counts and review markers
   without printing references or personal data. During the outage, provider
   callbacks can miss the app; after restart, the fast payout lane and conservative
   30-minute stale-payment sweep re-query persisted references. Keep unknown-ref
   and ambiguous payouts held for review; do not trigger a second charge/payout or
   manually force a FAILED result. Investigate any unreconciled callback with the
   provider's authoritative record.

If readback fails, run the same `railway scale … "${region}=0"` command from step 2,
verify zero running app instances, and fix forward from the new schema. Do not
redeploy or restore a pre-S9 image once a claim has been written.

Railway's [deployment phase guide](https://docs.railway.com/deployments/troubleshooting/slow-deployments)
gives build as roughly 1–10+ minutes, container startup 30 seconds–2 minutes,
plus migration and up to the configured five-minute healthcheck. Treat the outage
as an open maintenance window until the actual new SHA and money readback pass;
there is no guaranteed short duration. A no-downtime cutover needs a separately
released, database-backed funding pause honored by *all* running writers, with
in-flight requests drained before this migration. That gate does not exist today.
