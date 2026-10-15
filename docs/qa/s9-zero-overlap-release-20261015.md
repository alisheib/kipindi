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
replica in `us-west2`. The actual production service settings and the current
`dfb8432b9e0248c56d174902170e1f567a29fa5f` deployment manifest were read at
2026-10-15 16:23 UTC: healthcheck
`/api/health`, timeout 300 seconds, overlap 60 seconds, and drain 30 seconds.
Recheck the **selected deployment's manifest** before the outage; a source file
or service setting alone does not prove the running image used those values.
Railway says the old deployment is stopped *after* the new one is active; setting
overlap to zero does not prove that an old in-flight request cannot race a new one.
Its [deployment teardown](https://docs.railway.com/deployments/deployment-teardown)
and [deployment lifecycle](https://docs.railway.com/deployments/reference) describe
this order. The existing maintenance and payment switches hydrate once per process,
so a switch changed in one process cannot prove every old worker has stopped.

The `dfb8432b9e` production deployment (`e55f621c-968a-4175-94e9-7e7ddf5b11d5`)
became `SUCCESS` at 16:20:06 UTC while the prior `9068cb19ba` deployment
(`95b4ea2a-c057-42ac-9871-d16f389b6565`) still showed `SUCCESS` with a running instance.
The prior deployment became `REMOVED` at 16:21:43 UTC, about 97 seconds after
the new one became successful. The observed delay is consistent with the configured
60-second overlap and 30-second drain plus scheduling; two `SUCCESS` deployments
during this interval are **expected**, and both can run old/new app code. At
16:23 UTC, `railway status --json` and Railway's environment status showed only
the new deployment selected and one `RUNNING` app instance, with no pending work.
This is why the cutover preflight below requires the prior deployment to be
`REMOVED` and exactly one active instance; elapsed time alone is never the gate.

Stop **only the `50pick` app deployment**, leaving Postgres and Redis running.
The app is intentionally unavailable during this window. Do not roll back to a
pre-claim app after S9 has processed a funding key; keep the app down or fix
forward if release validation fails.

The Railway 5.63.1 CLI does **not** achieve an all-app stop here with
[`railway scale us-west2=0`](https://docs.railway.com/cli/scale). An isolated
same-source rehearsal on 2026-10-15 returned `{"regions":{"us-west2":null}}`
and triggered another deployment; its app stayed configured and running at one
replica. The Railway connector also rejects a zero replica count. Do not use
`scale` for this cutover. The measured stop mechanism is
[`railway down --yes`](https://docs.railway.com/cli/down), which removes the
latest successful app deployment but preserves the service and GitHub source.
It can expose an older successful deployment, so require exactly one `SUCCESS`
deployment before stopping and verify **all** app instances gone afterwards.

Railway status exposes a nullable `serviceInstances[50pick].numReplicas` even
while one app instance runs. After `down` removed the final rehearsal deployment,
`railway service list --json` reported the app's status, selected deployment ID,
and replica counters as `null`, while `railway status --json` reported
`activeDeployments=[]`. The stopped gate below requires no selected deployment,
no active deployment, no instance, and no pending build; it does not mistake a
nullable counter for a numeric zero.

## Isolated rehearsal evidence (2026-10-15)

The private `50pick-s9-cutover-rehearsal` Railway project
(`f494e809-5d2c-41ab-b560-7c8b92b1e2c2`) has a fresh Postgres service and one
app service. It has no public app domain, copied production secrets, payment
provider configuration, or real users. The app's source is
`codex/s9-rehearsal-1015`; its marker commit is
`bc4cff29af557889dd015e15611d7c7cc4c3737b`. The Postgres service has a
persistent volume and remains provisioned; keep the project for the final
candidate rehearsal. To retire it afterwards, delete the **rehearsal project**
by its ID in Railway after confirming its name and contents. This is a
cost-bearing resource until removed.

The baseline app deployment on `650896cee2e96d5dcf10b971a900438a80f85eb4`
reached `SUCCESS` with 1/1 running. Repeated `railway scale us-west2=0` attempts
did not stop it and created extra successful deployments, so we explicitly
removed each exposed successful deployment with `railway down --yes`. After the
final removal, the app had no selected deployment, no active deployments or
instances, and no pending deployment; this remained true beyond 35 seconds of
drain. Postgres stayed running. A Git push of the marker SHA then triggered
deployment `c989e2d4-fddd-4b84-a0c8-573c9e896a8a`; it reached `SUCCESS` at
about 15:09 UTC, became the sole selected/running app deployment, and all older
app deployments were `REMOVED`. The deployment manifest recorded
`/api/health`, 300-second timeout, 60-second overlap, and 30-second drain;
Railway's configured healthcheck gate passed. The app log recorded 105 applied
migrations, no pending migrations, and Next ready. No public-domain HTTP probe
was possible in this intentionally private project. We then removed the marker
app deployment again; the app is stopped while Postgres and the project remain
for the final candidate. This proves the Railway stop and Git restart behavior
for the tested SHA, not the final S9 SHA or the production service settings.

## Exact sequence (PowerShell, from the final release checkout)

1. Freeze the verified release SHA, confirm `main` has not advanced, and prepare
   the required production backup. Confirm the isolated `down`/new Git push
   rehearsal above passed **again for the final candidate SHA**. Before the
   outage, require the production app's **actual selected deployment manifest**
   to have healthcheck path `/api/health`, timeout 300 seconds, overlap 60 seconds,
   and drain 30 seconds, plus a direct 200/`ok:true` response from `/api/health`
   on every public host. These values were verified on deployment `e55f621c`
   at 16:23 UTC; repeat the check for whichever deployment is selected at cutover.
   If service settings need correction, allow the resulting deployment and its
   predecessor's overlap/drain to finish before preflight. Freeze other pushes
   and Railway deploy actions for this app.
   Confirm the public database URL is present in `F:\kipindi-main\.env.qa.local`
   without printing it. The local migration command below uses only that Railway
   public proxy, not `railway run`'s private host.
2. After the last ordinary deployment, wait for its predecessor to become
   `REMOVED`: the 60-second overlap and 30-second drain begin after the replacement
   is active, and the observed removal took about 97 seconds. If two deployments
   still show `SUCCESS`, keep waiting and inspect Railway status; do **not** call
   `railway down` yet. Require exactly one current successful app deployment, one
   selected `RUNNING` instance, and no pending build or staged/applying change,
   then remove that deployment with `railway down`. The command may expose an
   older `SUCCESS` deployment, so the preflight and stopped checks are both
   mandatory. Wait beyond the configured 30-second drain and repeat the stopped
   check. Abort if any old app instance remains. Do not stop Postgres or Redis.

   ```powershell
   $project = '5e87353c-1d59-433d-a683-a32b9149f74c'
   $service = 'baba8802-7f79-4306-9706-1e19a4b95e7c'
   $before = @(railway deployment list --project $project --environment production --service $service --limit 100 --json | ConvertFrom-Json)
   if ($LASTEXITCODE -ne 0) { throw 'Cannot read Railway deployment list.' }
   $success = @($before | Where-Object { $_.status -eq 'SUCCESS' })
   if ($success.Count -ne 1) { throw 'Expected exactly one SUCCESS app deployment. Stop and investigate.' }
   $liveDeploy = $success[0].meta.serviceManifest.deploy
   if ($liveDeploy.healthcheckPath -ne '/api/health' -or $liveDeploy.healthcheckTimeout -ne 300 -or
       $liveDeploy.overlapSeconds -ne 60 -or $liveDeploy.drainingSeconds -ne 30) {
     throw 'The actual production deployment lacks the required healthcheck/teardown settings.'
   }
   $pending = @($before | Where-Object { $_.status -notin @('SUCCESS', 'REMOVED', 'FAILED', 'CRASHED') })
   if ($pending.Count -ne 0) { throw 'An app deployment is pending. Stop and investigate.' }
   $selectedBefore = railway service status --project $project --environment production --service $service --json | ConvertFrom-Json
   if ($LASTEXITCODE -ne 0 -or $selectedBefore.deploymentId -ne $success[0].id -or $selectedBefore.status -ne 'SUCCESS') {
     throw 'The selected app deployment differs from the sole SUCCESS deployment.'
   }
   $stateBefore = railway status --project $project --environment production --json | ConvertFrom-Json
   if ($LASTEXITCODE -ne 0 -or -not $stateBefore) { throw 'Cannot read Railway status.' }
   $prodBefore = @($stateBefore.environments.edges | Where-Object { $_.node.name -eq 'production' })[0].node
   $appBefore = @($prodBefore.serviceInstances.edges | Where-Object { $_.node.serviceId -eq $service })[0].node
   $activeBefore = @($appBefore.activeDeployments)
   if ($activeBefore.Count -ne 1 -or $activeBefore[0].id -ne $success[0].id -or
       @($activeBefore[0].instances).Count -ne 1 -or $activeBefore[0].instances[0].status -ne 'RUNNING') {
     throw 'Expected exactly one running app instance on the sole SUCCESS deployment.'
   }
   railway down --project $project --environment production --service $service --yes
   if ($LASTEXITCODE -ne 0) { throw 'Railway app deployment removal failed.' }
   function Assert-AppStopped {
     $state = railway status --project $project --environment production --json | ConvertFrom-Json
     if ($LASTEXITCODE -ne 0 -or -not $state) { throw 'Cannot read Railway status.' }
     $prod = @($state.environments.edges | Where-Object { $_.node.name -eq 'production' })[0].node
     $app = @($prod.serviceInstances.edges | Where-Object { $_.node.serviceId -eq $service })[0].node
     if (-not $app) { throw 'The app service instance is missing from Railway status.' }
     if (@($app.activeDeployments).Count -ne 0) { throw 'An app deployment remains active or pending.' }
     $services = @(railway service list --project $project --environment production --json | ConvertFrom-Json)
     if ($LASTEXITCODE -ne 0) { throw 'Cannot read Railway services.' }
     $summary = @($services | Where-Object { $_.id -eq $service })[0]
     if (-not $summary -or $summary.deploymentId -or $summary.replicas.running -gt 0) { throw 'An app deployment is still selected or running.' }
     $instances = @($app.activeDeployments | ForEach-Object { $_.instances })
     if ($instances.Count -ne 0) { throw "App instances remain: $($instances.Count)" }
     $deployments = @(railway deployment list --project $project --environment production --service $service --limit 100 --json | ConvertFrom-Json)
     if ($LASTEXITCODE -ne 0) { throw 'Cannot read Railway deployment list.' }
     $notStopped = @($deployments | Where-Object { $_.status -notin @('REMOVED', 'FAILED', 'CRASHED') })
     if ($notStopped.Count -ne 0) { throw 'A successful or pending app deployment remains.' }
   }
   Assert-AppStopped
   Start-Sleep -Seconds 35
   Assert-AppStopped
   ```

3. Repeat the read-only duplicate scan with `default_transaction_read_only=on`;
   require every duplicate count to be zero. The script prints counts and index
   names only. **Stop** if it fails or reports duplicates. With the old writer
   still stopped, capture and verify the final pre-migration production backup.
   Record its restore point before any schema change. The earlier backup is not
   a substitute for this stopped-writer snapshot.

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
   child environment. On failure, keep the app stopped and investigate; do not
   restore the old writer against a partially migrated database.

   ```powershell
   node --input-type=module -e 'import dotenv from "dotenv"; import {spawnSync} from "node:child_process"; dotenv.config({path:process.env.PROD_S9_QA_ENV,quiet:true,override:true}); const raw=process.env.PROD_DATABASE_PUBLIC_URL??""; let u; try {u=new URL(raw)} catch {process.exit(2)}; if(!/\.rlwy\.net$|\.railway\.app$/.test(u.hostname))process.exit(2); for(const step of ["deploy","status"]){const r=spawnSync(process.execPath,["node_modules/prisma/build/index.js","migrate",step],{stdio:"inherit",env:{...process.env,DATABASE_URL:u.toString()}}); if(r.status!==0)process.exit(r.status??2)}'
   ```

5. Rerun `qa:provider-ref-uniqueness`; require **0 duplicates** and
   `Transaction_providerRef_key: UNIQUE`. Push only the verified fast-forward
   release SHA to `main`. The measured Git push starts a fresh deployment from
   the stopped app service. Observe the deployment's exact `meta.commitHash`,
   `SUCCESS` status, same selected ID, and only its one running instance. The
   production GitHub deployment currently exposes `meta.commitHash` in the JSON
   array returned by `railway deployment list`; verify it again at cutover.
   If an old or unknown app deployment appears, stop the release and investigate
   before allowing funding requests. On failure or timeout, remove the new app
   deployment if active, verify the app is fully stopped, and fix forward; do
   not revive an old writer.

   ```powershell
   $releaseSha = git rev-parse HEAD
   if (git status --porcelain) { throw 'Release checkout has uncommitted changes.' }
   git fetch origin main
   git merge-base --is-ancestor origin/main $releaseSha
   if ($LASTEXITCODE -ne 0) { throw 'Release SHA is not a fast-forward of main.' }
   git push origin "$($releaseSha):main"
   if ($LASTEXITCODE -ne 0) { throw 'Release push failed; keep the app stopped.' }
   $deadline = (Get-Date).AddMinutes(25) # Rehearsal took about nine minutes; retain an open outage window.
   $target = $null
   $selected = $null
   do {
     $deployments = @(railway deployment list --project $project --environment production --service $service --limit 10 --json | ConvertFrom-Json)
     if ($LASTEXITCODE -ne 0) { throw 'Cannot read Railway deployment list.' }
     $target = @($deployments | Where-Object { $_.meta.commitHash -eq $releaseSha } | Sort-Object createdAt -Descending | Select-Object -First 1)[0]
     if ($target -and $target.status -in @('FAILED', 'CRASHED', 'REMOVED')) { throw 'Target deployment failed or disappeared; stop the app and investigate.' }
     $selected = railway service status --project $project --environment production --service $service --json | ConvertFrom-Json
     if ($LASTEXITCODE -ne 0) { throw 'Cannot read selected Railway deployment.' }
     $state = railway status --project $project --environment production --json | ConvertFrom-Json
     if ($LASTEXITCODE -ne 0 -or -not $state) { throw 'Cannot read Railway status.' }
     $prod = @($state.environments.edges | Where-Object { $_.node.name -eq 'production' })[0].node
     $app = @($prod.serviceInstances.edges | Where-Object { $_.node.serviceId -eq $service })[0].node
     if (-not $app) { throw 'The app service instance is missing from Railway status.' }
     $other = @($app.activeDeployments | Where-Object { -not $target -or $_.id -ne $target.id })
     if ($other.Count -ne 0) { throw 'An old or unknown app deployment became active. Stop the release.' }
     if ($selected.deploymentId -and (-not $target -or $selected.deploymentId -ne $target.id)) {
       throw 'An old or unknown app deployment became selected. Stop the release.'
     }
     if ($target -and $target.status -eq 'SUCCESS' -and $selected.deploymentId -eq $target.id) { break }
     Start-Sleep -Seconds 15
   } while ((Get-Date) -lt $deadline)
   if (-not $target -or $target.status -ne 'SUCCESS' -or $selected.deploymentId -ne $target.id) {
     throw 'Target deployment is not proven successful and selected. Stop the app and investigate.'
   }
   $targetDeploy = $target.meta.serviceManifest.deploy
   if ($targetDeploy.healthcheckPath -ne '/api/health' -or $targetDeploy.healthcheckTimeout -ne 300 -or
       $targetDeploy.overlapSeconds -ne 60 -or $targetDeploy.drainingSeconds -ne 30) {
     throw 'Target deployment lacks required healthcheck/teardown settings.'
   }
   $live = @($app.activeDeployments | Where-Object { $_.id -eq $target.id })
   if ($live.Count -ne 1 -or @($live[0].instances).Count -ne 1 -or $live[0].instances[0].status -ne 'RUNNING' -or
       $selected.status -ne 'SUCCESS') { throw 'Target is not the sole healthy running app deployment.' }
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

If readback fails, run
`railway down --project $project --environment production --service $service --yes`,
then call `Assert-AppStopped`, wait past the drain,
and call it again. If another deployment becomes selected, remove it too and
repeat the stopped gate. Fix forward from the new schema. Do not redeploy or
restore a pre-S9 image once a claim has been written. The stopped-writer backup
is for disaster recovery planning, not permission to rewind committed money
events after the new app has accepted a funding key.

Railway's [deployment phase guide](https://docs.railway.com/deployments/troubleshooting/slow-deployments)
gives build as roughly 1–10+ minutes, container startup 30 seconds–2 minutes,
plus migration and up to the configured five-minute healthcheck. Treat the outage
as an open maintenance window until the actual new SHA and money readback pass;
there is no guaranteed short duration. A no-downtime cutover needs a separately
released, database-backed funding pause honored by *all* running writers, with
in-flight requests drained before this migration. That gate does not exist today.
