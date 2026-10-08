/**
 * `npm run db:scratch` — a throwaway Postgres for `db:verify-backup` to restore into.
 *
 * WHY THIS EXISTS. `db:verify-backup` is the only thing allowed to call a backup
 * healthy, and it earns that by restoring the artifact into a real cluster and
 * re-running the platform's own `trialBalance()` and `verifyChainFull()` on the result.
 * It therefore needs somewhere to `CREATE DATABASE`. Until now there was nowhere:
 *
 *   · the machine this repo is worked on has no Postgres and no Docker;
 *   · `pg` in package.json is the client library, not a server;
 *   · and the verifier REFUSES every `rlwy.net` / `railway.app` / `railway.internal`
 *     host outright, so a second Railway Postgres cannot be the target either — by
 *     design, because verification restores a FULL copy of the money database and must
 *     never be pointed at the live cluster.
 *
 * So the drill in `docs/BACKUP-RUNBOOK.md` could not be run at all, which is why it
 * never had been.
 *
 * WHY ON-BOX AND NOT A FREE MANAGED POSTGRES. The artifact being restored is every
 * phone number, NIDA, KYC OCR string and email address on the platform. Sealing the
 * dump and then restoring it onto a third party's infrastructure to check it would give
 * back exactly what the sealing protects. This cluster listens on 127.0.0.1 only.
 *
 * WHY THE 18.3 LINE. Production is PostgreSQL 18.3, and a restore is only evidence if
 * it happens on the version that would actually be recovering. `embedded-postgres` ships
 * the matching binaries per platform.
 *
 * ⚠️ WHY IT IS NOT IN package.json. Those binaries are **107 MB**, and the platform
 * packages are optional deps selected by `os`/`cpu` — so listing it as a devDependency
 * made Railway's Linux builder download `@embedded-postgres/linux-x64` into EVERY
 * production build and image, to support a drill that only ever runs on a laptop. CI does
 * not need it either: `.github/workflows/backup-nightly.yml` uses a `postgres:18` service
 * container. So it is installed on demand, the specifier is computed so `tsc` does not
 * need it present, and the message below tells you the exact command.
 *
 * Usage:
 *   npm run db:scratch                    # boot, print the export line, hold (Ctrl-C stops)
 *   npm run db:scratch -- --reset         # discard the old cluster and re-initialise
 *   npm run db:scratch -- --run <cmd...>  # boot, run cmd with VERIFY_DATABASE_URL set, stop
 */
import pgLib from "pg";
import { execFileSync, spawn } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

// Deliberately not 5432 — never collide with a real local server.
//
// ⚠️ OVERRIDABLE BECAUSE EVERY WORKTREE OF THIS REPO PINS THE SAME PORT, AND THE ORPHAN
// KILLER BELOW ONLY TAKES THIS CHECKOUT'S OWN CLUSTER. When a parallel session has a
// cluster up in a sibling checkout (`F:\kipindi-house-bots`), a `--reset` here dies with
// "the cluster failed to start and gave no reason" — and anything that then connects to
// 5433 is talking to THEIR database, with THEIR schema, while looking perfectly healthy.
// That happened on 2026-09-21 and is why `backup-schema-gate.mts` checks `data_directory`
// before it writes. Give the second checkout its own port instead:
//     KP_SCRATCH_PORT=5443 npm run verify:backup-schema
const PORT = Number(process.env.KP_SCRATCH_PORT ?? 5433);
if (!Number.isInteger(PORT) || PORT < 1024 || PORT > 65535) {
  console.error(`!! KP_SCRATCH_PORT must be an integer 1024-65535 (got ${process.env.KP_SCRATCH_PORT}).`);
  process.exit(2);
}
const USER = "postgres";
const PASSWORD = "scratch";
const DATA_DIR = resolve(process.cwd(), ".pgscratch");
const URL = `postgresql://${USER}:${PASSWORD}@127.0.0.1:${PORT}/postgres`;

// A disposable cluster holding a copy of the money database must never be started by
// something that thinks it is production.
if (process.env.NODE_ENV === "production") {
  console.error("!! db:scratch refuses to run with NODE_ENV=production.");
  process.exit(2);
}
// The data directory is deleted on --reset. Refuse if it ever resolves outside the repo.
if (!DATA_DIR.startsWith(resolve(process.cwd()))) {
  console.error(`!! refusing: the scratch data directory resolved outside the repo (${DATA_DIR}).`);
  process.exit(2);
}

const has = (f: string): boolean => process.argv.includes(`--${f}`);
/** True when THIS process started the cluster, so --run only stops what it started. */
let startedHere = false;

/**
 * Kill postgres processes belonging to THIS repo's cluster, and nothing else.
 *
 * 🔴 WHY THIS IS NEEDED. PostgreSQL 18 runs `io_worker` children, and an unclean exit —
 * Ctrl-C, a crashed verifier, a killed npm — leaves one alive holding the cluster's shared
 * memory. Every later start then dies with "pre-existing shared memory block is still in
 * use", including `--reset`, and the data directory is unusable until someone finds the
 * process by hand. That cost this session three restarts.
 *
 * ⚠️ Other projects on this machine run their OWN embedded clusters (the sibling AWARKEH
 * repo keeps one on :54330), and killing those would break somebody else's work in a way
 * that looks like a random failure. So on Windows a process is taken only if it is:
 *   · a postmaster whose `-D` argument is THIS checkout's data directory, the whole argument, or
 *   · a child (`--forkchild`) of such a postmaster, or of a dead one named in `deadParents`
 *     (a pid this tool read from the cluster's own pid file), or
 *   · an orphaned child — its parent gone — whose binary lives under this checkout. Run from a
 *     checkout that other worktrees' `node_modules` junctions point at, that includes THEIR
 *     orphans too, and that is harmless: an orphan's postmaster is dead, so it serves no live
 *     cluster, and all it can still do is block its own data directory's next start.
 * Each is killed inside the same PowerShell run that listed it, and only while it is still the
 * process listed (the same start time): a pid freed by `taskkill` between a listing here and a
 * kill in another process could name a stranger by then.
 *
 * 🔴 WHY NOT SIMPLY "THE REPO PATH IS IN ITS COMMAND LINE", AS THIS ONCE WAS. A child's
 * command line is only `"<bin>/postgres.exe" --forkchild="io_worker" <handle>`: the data
 * directory is not in it, only the binary's path. In a worktree whose `node_modules` is a
 * junction to another checkout (most worktrees on the shared PC are), that path names the
 * OTHER checkout, so the sweep never found its own io_worker and every later start failed:
 * on 2026-10-07 one leftover from the first database suite of a `test:all` in
 * `F:\kipindi-wp12` made the next twelve fail with "gave no reason". And the same test,
 * run from the checkout the junctions point at, matched every sibling's LIVE cluster,
 * because all of them run its binaries.
 */
function killOwnOrphans(deadParents: number[] = []): number {
  const norm = (p: string): string => resolve(p).replace(/\\/g, "/").toLowerCase();
  const marker = norm(process.cwd());
  try {
    if (process.platform === "win32") {
      // Inside a single-quoted PowerShell string, where PowerShell reads the typographic single quotes as quotes too.
      const ps = (s: string): string => s.replace(/['‘’‚‛]/g, "$&$&");
      const dir = norm(DATA_DIR).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // `-D <dir>` as Node wrote it — quoted only when the path holds a space — and nothing after it but a space or the
      // end: not `.pgscratch\sub`, not `.pgscratch - Copy`. `\x22` is the double quote, kept out of the command line.
      const dirRe = ps(`\\s-d\\s+(\\x22${dir}\\x22|${dir})(\\s|$)`);
      const known = deadParents.filter((p) => Number.isInteger(p) && p > 0).join(",");
      const out = execFileSync(
        "powershell",
        ["-NoProfile", "-Command",
         `$all = @(Get-CimInstance Win32_Process -Filter "Name='postgres.exe'"); ` +
         `$live = @{}; Get-Process | ForEach-Object { $live[[int]$_.Id] = 1 }; ` +
         `$pm = @($all | Where-Object { $c = ([string]$_.CommandLine).Replace('\\','/').ToLower(); ` +
         `-not $c.Contains('--forkchild') -and ($c -match '${dirRe}') } | ForEach-Object { [int]$_.ProcessId }); ` +
         `$gone = @(@(${known}) | Where-Object { -not $live.ContainsKey([int]$_) }); ` +
         `$par = @($pm + $gone); ` +
         `$kids = @($all | Where-Object { $c = ([string]$_.CommandLine).Replace('\\','/').ToLower(); $p = [int]$_.ParentProcessId; ` +
         `$c.Contains('--forkchild') -and (($par -contains $p) -or (-not $live.ContainsKey($p) -and $c.Contains('${ps(marker)}/'))) } | ` +
         `ForEach-Object { [int]$_.ProcessId }); ` +
         `$take = @($pm + $kids); ` +
         `foreach ($x in @($all | Where-Object { $take -contains [int]$_.ProcessId })) { ` +
         `$q = Get-Process -Id ([int]$x.ProcessId) -ErrorAction SilentlyContinue; ` +
         `if ($q -and [Math]::Abs(($q.StartTime - $x.CreationDate).TotalMilliseconds) -lt 1) { try { $q.Kill(); [int]$x.ProcessId } catch {} } }`],
        { encoding: "utf8", timeout: 20_000 },
      );
      return out.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).length; // one line per process killed
    }
    const out = execFileSync("bash", ["-c", `pgrep -f '${marker}.*postgres' || true`], { encoding: "utf8", timeout: 20_000 });
    const pids = out.split("\n").map((l) => l.trim()).filter(Boolean);
    for (const pid of pids) { try { process.kill(Number(pid), "SIGKILL"); } catch { /* already gone */ } }
    return pids.length;
  } catch {
    return 0; // best effort: the caller reports the original failure either way
  }
}

/**
 * The postmaster's pid, from the first line of the cluster's own pid file while it is
 * there. Read BEFORE a stop or a start: a killed postmaster leaves the file behind, and its
 * pid is the one thing that still names the children it orphaned. A start that fails
 * removes the file, so afterwards it is too late to read it.
 */
function postmasterPid(): number | null {
  try {
    const n = Number(readFileSync(join(DATA_DIR, "postmaster.pid"), "utf8").split(/\r?\n/, 1)[0]);
    return Number.isInteger(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}
const runIdx = process.argv.indexOf("--run");
const runCmd = runIdx === -1 ? [] : process.argv.slice(runIdx + 1);

/**
 * Load the binaries on demand. The specifier is computed so TypeScript does not need the
 * package present to check this file — the same trick `monitoring.ts` uses for
 * `@sentry/node`, and for the same reason: an optional 107 MB dependency must not be a
 * build-time requirement.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadEmbeddedPostgres(): Promise<any> {
  const spec = ["embedded", "postgres"].join("-");
  try {
    const mod = await import(/* @vite-ignore */ spec);
    return (mod as { default: unknown }).default;
  } catch {
    console.error(
      `\n!! The scratch cluster needs PostgreSQL binaries, which are NOT a dependency of\n` +
        `   this repo — they are 107 MB and would be downloaded into every Railway build.\n\n` +
        `   Install them once, locally:\n\n` +
        `     npm i -D --no-save embedded-postgres@18.3.0-beta.17\n\n` +
        `   (18.3 matches production. CI does not need this: the nightly workflow uses a\n` +
        `   postgres:18 service container instead.)\n`,
    );
    process.exit(2);
  }
}

const EmbeddedPostgres = await loadEmbeddedPostgres();

// Postgres's own last lines. `start()` rejects with NOTHING when the server exits early, so
// a start that died on "pre-existing shared memory block is still in use" reported only
// "the cluster failed to start and gave no reason": the reason was printed by postgres and
// thrown away here. The failure report below now shows them.
const lastLog: string[] = [];

const pg = new EmbeddedPostgres({
  databaseDir: DATA_DIR,
  port: PORT,
  user: USER,
  password: PASSWORD,
  authMethod: "password",
  // 🔴 WITHOUT THIS THE FIRST VERIFICATION RUN DIED. initdb takes its encoding from the
  // host OS locale, which on this Windows machine is WIN1252, and production is UTF8 —
  // so replaying the dump failed on 至 (`no equivalent in encoding "WIN1252"`), a Chinese
  // market title, of which prod has 1,464. A scratch cluster that cannot hold the data is
  // not a verification target. C collation keeps the cluster reproducible across
  // machines; the verifier creates each throwaway database with the SOURCE's own
  // collation from the manifest, so ordering is still checked against production's.
  initdbFlags: ["--encoding=UTF8", "--lc-collate=C", "--lc-ctype=C"],
  // Keep the cluster between runs so a repeat drill does not pay initdb again. The
  // verifier creates and drops its own database inside it either way.
  persistent: true,
  // 🔴 The only line here that is a security control: bind to loopback. This cluster
  // holds a restored copy of every player record on the platform for the length of a
  // verification run, and the default would accept connections from the LAN.
  postgresFlags: ["-c", "listen_addresses=127.0.0.1"],
  onLog: (m: unknown) => {  // initdb/postgres chatter is noise unless it fails: keep the last few lines
    lastLog.push(...String(m).split(/\r?\n/).map((l) => l.trim()).filter(Boolean));
    lastLog.splice(0, Math.max(0, lastLog.length - 12));
  },
  onError: (e: unknown) => console.error(`   pg: ${e instanceof Error ? e.message : String(e)}`),
});

/**
 * Stop the cluster and leave nothing behind.
 *
 * `pg.stop()` alone was not enough: it took the postmaster down but left an `io_worker`
 * child alive holding shared memory, so the NEXT run could not start. Sweeping our own
 * processes afterwards makes the tool idempotent, which is the only way a nightly job can
 * depend on it. On Windows the stop is `taskkill /f`, so the postmaster cannot remove its
 * pid file: the pid read first is how the sweep knows which children were its.
 */
async function stopCleanly(): Promise<void> {
  const pm = postmasterPid();
  // ⛔ BOUNDED, like the failure handler's stop below. When the postmaster is already gone (it crashed, or something
  // killed it), pg.stop() waits for an `exit` that has already happened and NEVER SETTLES: `--run` then never reached
  // its process.exit(code), the event loop emptied, and embedded-postgres's exit hook (async-exit-hook) ended the
  // process with 0 ten seconds later — a failing suite reported as passing.
  await Promise.race([
    pg.stop().catch((e: unknown) => console.error(`   stop failed: ${e instanceof Error ? e.message : String(e)}`)),
    new Promise((r) => setTimeout(r, 10_000)),
  ]);
  const left = killOwnOrphans(pm ? [pm] : []);
  if (left) console.log(`   swept ${left} lingering postgres process(es).`);
}

/**
 * One cluster step (initdb, or the start), and if it fails, a sweep of this checkout's leftovers and one more try —
 * rather than making the operator do it. Almost always the failure is an orphaned io_worker from a killed run holding
 * the cluster's shared memory, and initdb's bootstrap meets the same block as a start does, because the block's name
 * comes from the data directory's path. Postgres's own lines are kept per attempt, so a failure reports its own.
 */
async function withSweep(step: () => Promise<unknown>, deadParents: number[]): Promise<void> {
  lastLog.length = 0;
  try {
    await step();
  } catch (e) {
    const killed = killOwnOrphans(deadParents);
    if (!killed) throw e;
    console.log(`   cleared ${killed} orphaned postgres process(es) from a previous run; retrying...`);
    await new Promise((r) => setTimeout(r, 1500));
    lastLog.length = 0;
    await step();
  }
}

async function main(): Promise<void> {
  // Read the old postmaster's pid FIRST: `--reset` deletes the directory, and a failed start deletes the file, and
  // after either it is too late to know which orphans were this cluster's.
  const stale = postmasterPid();
  const staleList = stale ? [stale] : [];
  if (has("reset") && existsSync(DATA_DIR)) {
    // A leftover child of the old cluster holds its shared memory whatever happens to the directory: sweep it first.
    const swept = killOwnOrphans(staleList);
    if (swept) console.log(`   cleared ${swept} postgres process(es) of the old cluster.`);
    console.log(`Discarding the existing cluster at ${DATA_DIR}`);
    rmSync(DATA_DIR, { recursive: true, force: true });
  }

  // Is a usable cluster of OURS already up? A killed run can leave the postmaster
  // listening with its pid file gone, and `start()` then fails with a bare `undefined`
  // that tells the operator nothing. Reusing it is both faster and one less way for the
  // nightly verification to fail for a reason that has nothing to do with the backup.
  let alreadyUp = false;
  if (!has("reset")) {
    const probe = new pgLib.Client({ connectionString: URL, connectionTimeoutMillis: 1500 });
    let foreign = "";
    try {
      await probe.connect();
      // 🔴 "IT ANSWERED" IS NOT "IT IS OURS", AND THE DIFFERENCE IS DESTRUCTIVE.
      //
      // The catch below used to carry the comment "nothing there, or not ours" while nothing
      // in this block distinguished the two: connecting was the whole test. But EVERY worktree
      // of this repo runs this same file with the same hardcoded postgres/scratch credentials,
      // and (until KP_SCRATCH_PORT) the same port — so a sibling checkout's cluster accepts the
      // connection, `alreadyUp` goes true, and VERIFY_DATABASE_URL is handed to the `--run`
      // wrappers pointing at SOMEBODY ELSE'S DATABASE. That is not hypothetical: it happened on
      // 2026-09-21, when F:\kipindi-main's work silently ran against F:\kipindi-house-bots.
      //
      // ⛔ The worst of it is not the wrong reading — it is that these wrappers WRITE.
      // `test:house-bot-migrations` issues `DROP DATABASE ... WITH (FORCE)` on names both
      // checkouts compute identically, so a run here terminates the other session's
      // connections and destroys its in-flight test database. `db:verify-backup` restores a
      // full production artifact — every wallet, phone, NIDA and KYC string — into whichever
      // `.pgscratch` answered, a directory this checkout's `--reset` cannot clean.
      //
      // So identity is asked of the cluster itself, and a stranger is refused rather than
      // adopted. `backup-schema-gate.mts` keeps its own copy of this assertion as a control;
      // this is the one that protects every other consumer.
      const dir = (await probe.query<{ setting: string }>(
        `select setting from pg_settings where name = 'data_directory'`,
      )).rows[0]?.setting ?? "";
      const norm = (p: string): string => resolve(p).replace(/\\/g, "/").toLowerCase();
      if (norm(dir) !== norm(DATA_DIR)) foreign = dir || "(unreported)";
      else {
        alreadyUp = true;
        console.log(`Reusing this checkout's cluster on 127.0.0.1:${PORT}.`);
      }
    } catch {
      /* nothing usable answered — start our own below */
    } finally {
      await probe.end().catch(() => {});
    }
    if (foreign) {
      console.error(
        `\n!! 127.0.0.1:${PORT} is serving a DIFFERENT checkout's scratch cluster.\n` +
          `     its data directory : ${foreign}\n` +
          `     this checkout's    : ${DATA_DIR}\n\n` +
          `   Refusing to reuse it: these suites CREATE and DROP databases, and db:verify-backup\n` +
          `   restores real production data into whatever answers. Give this checkout its own port:\n` +
          `     KP_SCRATCH_PORT=5443 npm run <your script>\n`,
      );
      process.exit(2);
    }
  }

  if (!alreadyUp) {
    const fresh = !existsSync(join(DATA_DIR, "PG_VERSION"));
    if (fresh) {
      console.log(`Initialising a fresh cluster in ${DATA_DIR} ...`);
      await withSweep(() => pg.initialise(), staleList); // initdb removes what it made when it fails
    }
    console.log(`Starting Postgres on 127.0.0.1:${PORT} ...`);
    await withSweep(() => pg.start(), staleList);
    startedHere = true;
  }

  const client = new pgLib.Client({ connectionString: URL });
  await client.connect();
  const { rows } = await client.query<{ v: string }>("select version() as v");
  await client.end();
  console.log(`Ready:   ${rows[0].v.split(" on ")[0]}\n`);

  if (runCmd.length) {
    const code = await new Promise<number>((done) => {
      const child = spawn(runCmd[0], runCmd.slice(1), {
        stdio: "inherit",
        // npm/npx/pnpm/yarn are .cmd shims on Windows and cannot be spawned without a
        // shell — but a shell CONCATENATES the arguments instead of escaping them, which
        // silently corrupted the first `--run node -e "…"` this was tested with. So the
        // shell is used only for the shims that actually require it.
        shell: process.platform === "win32" && /^(npm|npx|pnpm|yarn)$/i.test(runCmd[0]),
        env: { ...process.env, VERIFY_DATABASE_URL: URL },
      });
      child.on("exit", (c) => done(c ?? 1));
      child.on("error", (e) => { console.error(`!! could not run: ${e.message}`); done(1); });
    });
    if (startedHere) await stopCleanly();
    console.log(`\nScratch cluster ${startedHere ? "stopped" : "left running (it was already up)"}. Command exited ${code}.`);
    process.exit(code);
  }

  console.log("Export this, then run the verifier in the same shell:\n");
  console.log(`   bash:        export VERIFY_DATABASE_URL='${URL}'`);
  console.log(`   PowerShell:  $env:VERIFY_DATABASE_URL = '${URL}'\n`);
  console.log("   npm run db:verify-backup -- --file backups/<artifact> --record\n");
  console.log("Ctrl-C to stop the cluster. (--reset next time for a clean one.)");

  // Stop cleanly on Ctrl-C. A killed run that leaves a listening postmaster behind is
  // how the sibling repo ended up chasing a phantom "port already held" for an hour.
  let stopping = false;
  const shutdown = async (): Promise<void> => {
    if (stopping) return;
    stopping = true;
    console.log("\nStopping...");
    // The same sweep as --run (a bare pg.stop() left an io_worker behind), and only for a
    // cluster started here: the sweep would kill a reused one, which pg.stop() leaves alone.
    if (startedHere) await stopCleanly();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

main().catch(async (e: unknown) => {
  // embedded-postgres rejects with a non-Error on some failures, and `String(undefined)`
  // printed a bare "undefined" that said nothing about what went wrong.
  const msg =
    e instanceof Error ? (e.stack ?? e.message) : e ? JSON.stringify(e) : "(the cluster failed to start and gave no reason)";
  const said = lastLog.length ? `\n   postgres said:\n     ${lastLog.join("\n     ")}` : "";
  console.error("\n!! db:scratch failed:", msg + said);

  // The one failure worth explaining, because the message Postgres gives is not the
  // instruction you need. Killing a run (Ctrl-C at the wrong moment, a crashed verifier)
  // can leave a child postmaster alive holding the cluster's shared memory, and every
  // later `--reset` then dies on "pre-existing shared memory block is still in use".
  // The sibling AWARKEH repo lost an hour to exactly this, twice. `--reset`, initdb and the
  // start above have already swept what they could prove was this checkout's, so what is
  // left is a process they could not attribute (a killed run whose pid file is gone): list
  // them and let the operator judge, rather than offering a kill-by-path that would also take
  // every cluster sharing a junctioned node_modules.
  if (/shared memory block is still in use|could not create shared memory/i.test(msg + said)) {
    console.error(
      "\n   A postgres.exe from a previous run is still alive, holding this cluster's shared\n" +
        "   memory, and it could not be proven to be this checkout's. List them (in PowerShell):\n\n" +
        "     Get-CimInstance Win32_Process -Filter \"Name='postgres.exe'\" | Select-Object ProcessId, ParentProcessId," +
        " @{n='ParentAlive';e={[bool](Get-Process -Id $_.ParentProcessId -EA 0)}}, CommandLine | Format-List\n\n" +
        "   Stop only an orphan (ParentAlive False) whose binary is this checkout's — or, when\n" +
        "   node_modules is a junction, the junction target's — since other checkouts and\n" +
        "   projects on this machine run their own clusters. Then re-run.\n",
    );
  }
  // 🔴 SET THE CODE BEFORE AWAITING ANYTHING. THIS HANDLER USED TO REPORT **EXIT 0** ON EVERY
  // FAILURE, AND `process.exit(1)` TWO LINES DOWN IS WHY IT LOOKED IMPOSSIBLE.
  //
  // `pg.stop()` on an instance that never started returns a promise that NEVER SETTLES. The
  // await below therefore never returns, `process.exit(1)` is never reached, the event loop
  // empties with nothing left to do, and **Node exits normally — code 0**. No throw, no
  // unhandled rejection, no stack: the last thing printed is "!! db:scratch failed:" and the
  // shell is handed a success.
  //
  // ⛔ WHAT THAT COSTS IS NOT THIS SCRIPT. 26 suites run THROUGH `db:scratch --run`, and
  // `scripts/test-all.mjs` judges each one by its exit code. A cluster that could not start
  // means the wrapped command NEVER RAN — and it was scored **green**. A suite that did not
  // execute reporting PASS is the worst shape a guard can take: [[verified means EXECUTED]].
  //
  // Reproduced deliberately on 2026-09-21 by holding the port with a non-postgres listener:
  // exit 0 both through npm and through tsx directly, so npm was never the culprit.
  //
  // `process.exitCode` is the fix rather than a bigger try/catch, because it survives BOTH
  // ways out — the explicit exit below, and a natural exit if anything here hangs again. The
  // race bounds the stop so a hang costs five seconds instead of the signal.
  process.exitCode = 1;
  await Promise.race([
    pg.stop().catch(() => {}),
    new Promise((r) => setTimeout(r, 5_000)),
  ]);
  process.exit(1);
});
