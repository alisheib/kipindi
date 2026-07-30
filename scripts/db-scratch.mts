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
import { existsSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const PORT = 5433; // deliberately not 5432 — never collide with a real local server
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
 * ⚠️ The filter is the repo path. Other projects on this machine run their OWN embedded
 * clusters (the sibling AWARKEH repo keeps one on :54330), and killing those would break
 * somebody else's work in a way that looks like a random failure.
 */
function killOwnOrphans(): number {
  const marker = resolve(process.cwd()).replace(/\\/g, "/").toLowerCase();
  try {
    if (process.platform === "win32") {
      const out = execFileSync(
        "powershell",
        ["-NoProfile", "-Command",
         `Get-CimInstance Win32_Process -Filter "Name='postgres.exe'" | ` +
         `Where-Object { $_.CommandLine -and $_.CommandLine.Replace('\\','/').ToLower().Contains('${marker}') } | ` +
         `ForEach-Object { $_.ProcessId }`],
        { encoding: "utf8", timeout: 20_000 },
      );
      const pids = out.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      for (const pid of pids) { try { process.kill(Number(pid), "SIGKILL"); } catch { /* already gone */ } }
      return pids.length;
    }
    const out = execFileSync("bash", ["-c", `pgrep -f '${marker}.*postgres' || true`], { encoding: "utf8", timeout: 20_000 });
    const pids = out.split("\n").map((l) => l.trim()).filter(Boolean);
    for (const pid of pids) { try { process.kill(Number(pid), "SIGKILL"); } catch { /* already gone */ } }
    return pids.length;
  } catch {
    return 0; // best effort: the caller reports the original failure either way
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
  onLog: () => {},          // initdb/postgres chatter is noise unless it fails
  onError: (e: unknown) => console.error(`   pg: ${e instanceof Error ? e.message : String(e)}`),
});

/**
 * Stop the cluster and leave nothing behind.
 *
 * `pg.stop()` alone was not enough: it took the postmaster down but left an `io_worker`
 * child alive holding shared memory, so the NEXT run could not start. Sweeping our own
 * processes afterwards makes the tool idempotent, which is the only way a nightly job can
 * depend on it.
 */
async function stopCleanly(): Promise<void> {
  await pg.stop().catch((e: unknown) => console.error(`   stop failed: ${e instanceof Error ? e.message : String(e)}`));
  const left = killOwnOrphans();
  if (left) console.log(`   swept ${left} lingering postgres process(es).`);
}

async function main(): Promise<void> {
  if (has("reset") && existsSync(DATA_DIR)) {
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
    try {
      await probe.connect();
      await probe.query("select 1");
      alreadyUp = true;
      console.log(`Reusing the cluster already listening on 127.0.0.1:${PORT}.`);
    } catch {
      /* nothing there, or not ours — start our own below */
    } finally {
      await probe.end().catch(() => {});
    }
  }

  if (!alreadyUp) {
    const fresh = !existsSync(join(DATA_DIR, "PG_VERSION"));
    if (fresh) {
      console.log(`Initialising a fresh cluster in ${DATA_DIR} ...`);
      await pg.initialise();
    }
    console.log(`Starting Postgres on 127.0.0.1:${PORT} ...`);
    try {
      await pg.start();
    } catch (e) {
      // Almost always an orphaned io_worker from a killed run holding shared memory.
      // Clear our own and try once more, rather than making the operator do it.
      const killed = killOwnOrphans();
      if (!killed) throw e;
      console.log(`   cleared ${killed} orphaned postgres process(es) from a previous run; retrying...`);
      await new Promise((r) => setTimeout(r, 1500));
      await pg.start();
    }
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
    await pg.stop().catch((e: unknown) => console.error(`   stop failed: ${(e as Error).message}`));
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
  console.error("\n!! db:scratch failed:", msg);

  // The one failure worth explaining, because the message Postgres gives is not the
  // instruction you need. Killing a run (Ctrl-C at the wrong moment, a crashed verifier)
  // can leave a child postmaster alive holding the cluster's shared memory, and every
  // later `--reset` then dies on "pre-existing shared memory block is still in use".
  // The sibling AWARKEH repo lost an hour to exactly this, twice.
  if (/shared memory block is still in use|could not create shared memory/i.test(msg)) {
    console.error(
      "\n   A postgres.exe from a previous run of THIS repo is still alive. Find and stop\n" +
        "   only those — other projects on this machine run their own clusters:\n\n" +
        "     powershell -Command \"Get-CimInstance Win32_Process -Filter \\\"Name='postgres.exe'\\\" |\n" +
        "       Where-Object { $_.CommandLine -like '*kipindi-main*' } |\n" +
        "       ForEach-Object { Stop-Process -Id $_.ProcessId -Force }\"\n\n" +
        "   Then re-run with --reset.\n",
    );
  }
  await pg.stop().catch(() => {});
  process.exit(1);
});
