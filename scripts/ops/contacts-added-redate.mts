/**
 * ops:contacts-added-redate — THE AUDITED DOOR THAT RE-DATES THE CONTACTS BACK-FILLED ON 2026-10-03 (C8b · B8; Ali's ruling
 * of 2026-10-09, question 3 (a): "The 54 contacts back-filled on 2026-10-03 are re-dated 'Added 3 Oct 2026' — a production
 * data fix through an audited door, so the 'Added' date never tells a masked officer who is a player").
 *
 * ⛔ NO BUSINESS LOGIC OF ITS OWN (the live switch door's rule). Which rows, the instant each one takes, the expected count,
 * the record written FIRST, the ONE all-or-nothing write, the read-back and every ending recorded are
 * `src/lib/server/contacts/added-redate.ts`'s. This file checks where it runs, hands the door the audit log's durable
 * reader, and prints what the door says. It writes nothing itself.
 *
 * ⛔ THE PUBLIC PROXY FIRST, THEN THE IMPORT. `railway run` hands this PC the app's PRIVATE database host, which resolves only
 * inside Railway, and the Prisma client takes whatever URL is set when it is first built — so the URL is rewritten BEFORE
 * the door is loaded, and the door is loaded with a dynamic `import()` (a static import would run first). The URL is never
 * printed.
 * ⛔ STATUS ONLY READS — counts and EAT days, never an id, a number or a name — and prints the exact apply line.
 * ⛔ APPLY RUNS ONLY WITH PRODUCTION'S OWN ENVIRONMENT, as `railway run --service 50pick` injects it — the door's COMPLIANCE
 * rows must be signed by the key production verifies with: `RAILWAY_ENVIRONMENT_NAME=production`,
 * `RAILWAY_SERVICE_NAME=50pick`, and an `AUDIT_CHAIN_SECRET` that is set and is not `SESSION_SECRET` (the live switch
 * door's check: the realistic mistake — a local `.env` run — closed; not a cryptographic proof of the key).
 * ⛔ AND FROM A PC WHOSE CLOCK IS WITHIN 20 s OF THE DATABASE'S (the owner-save door's rule): its records carry this PC's
 * instant. A database clock that cannot be READ is the database out of reach, and the apply refuses, saying so.
 * ⛔ IT IS NEVER RUN ON PRODUCTION BY A BUILDER: the integrator asks Ali, and runs status first.
 *
 * Run it through Railway, from a checkout of the commit production runs (C8b deployed — its writer no longer dates a row
 * with the sign-up, so the count cannot grow while you look):
 *   railway run --service 50pick npm run ops:contacts-added-redate -- status
 *   railway run --service 50pick npm run ops:contacts-added-redate -- apply --expect <the count status printed> --by "Claude for Ali (B8)" --reason "approved by Ali in the Claude session"
 * `status` prints the exact apply line. A second apply finds nothing to do (exit 0, nothing written or recorded).
 *
 * Exit: 0 done, read, or nothing to do · 1 refused, failed or not confirmed (the reason is printed), or a status that
 * could not be read · 2 not run (usage, no database, not production's own environment, the database's clock unreadable,
 * or this PC's clock off the database's).
 */

/** ⛔ The public proxy, BEFORE the door loads (see the header): without it every read here is unreadable. */
const PRIVATE_DB_HOST = new RegExp("@postgres[.]railway[.]internal(?::[0-9]+)?");
if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(PRIVATE_DB_HOST, "@turntable.proxy.rlwy.net:40357");
}

const LF = String.fromCharCode(10);
const USAGE = [
  "usage: npm run ops:contacts-added-redate -- status",
  '       npm run ops:contacts-added-redate -- apply --expect <count> --by "<who>" --reason "<why>"',
  "status prints the exact apply line, with the count; run both through `railway run --service 50pick` (see this door's header).",
].join(LF);

/** The flags each command takes — each once, every one required, nothing else. */
const FLAGS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  status: [],
  apply: ["expect", "by", "reason"],
});

function flagsOf(command: string, args: readonly string[]): Map<string, string> | null {
  if (!Object.prototype.hasOwnProperty.call(FLAGS, command)) return null;
  const allowed = FLAGS[command];
  const out = new Map<string, string>();
  for (let i = 0; i < args.length; i += 2) {
    const name = args[i];
    const value = args[i + 1];
    if (!name.startsWith("--") || value === undefined) return null;
    const flag = name.slice(2);
    if (!allowed.includes(flag) || out.has(flag)) return null;
    out.set(flag, value);
  }
  return allowed.every((f) => out.has(f)) ? out : null;
}

function say(o: { readonly exitCode: number; readonly lines: readonly string[] }): number {
  for (const line of o.lines) console.log(line);
  return o.exitCode;
}

async function main(): Promise<number> {
  const command = process.argv[2] ?? "";
  const flags = flagsOf(command, process.argv.slice(3));
  if (flags === null) {
    console.log(USAGE);
    return 2;
  }
  if (!process.env.DATABASE_URL) {
    console.log("REFUSING: no DATABASE_URL — nothing can be read or written without the database. Run it through the runner (see the header).");
    return 2;
  }
  // ⛔ ONLY NOW — after the rewrite above — the door, and the audit log's durable reader it is handed.
  const DOOR = await import("../../src/lib/server/contacts/added-redate.ts");
  const AUDIT = await import("../../src/lib/server/audit.ts");
  const deps = DOOR.addedRedateDeps((q) => AUDIT.getAuditForTargetsDurable(q));
  if (command === "status") return say(await DOOR.addedRedateStatus(deps));

  const auditKey = process.env.AUDIT_CHAIN_SECRET ?? "";
  const viaRailway = process.env.RAILWAY_ENVIRONMENT_NAME === "production" && process.env.RAILWAY_SERVICE_NAME === "50pick";
  if (!viaRailway || auditKey.trim() === "" || auditKey === (process.env.SESSION_SECRET ?? "")) {
    console.log("REFUSING: this is not production's own environment (run it through `railway run --service 50pick`, which sets RAILWAY_ENVIRONMENT_NAME and the audit secret) — the door's COMPLIANCE rows would not verify.");
    return 2;
  }
  // This PC's clock against the database's, measured across one round trip: an apply waits for a synced clock.
  const askedAt = Date.now();
  const dbMs = await DOOR.readDatabaseClockMs();
  if (dbMs === null) {
    console.log("REFUSING: the database's clock couldn't be read — the database could not be reached, so nothing was read or written. Run it again.");
    return 2;
  }
  const clockProblem = DOOR.opsClockProblem(dbMs, askedAt, Date.now());
  if (clockProblem !== null) {
    console.log(`REFUSING: ${clockProblem} — sync it (Windows: Settings → Time & language → Date & time → Sync now) and run it again.`);
    return 2;
  }
  return say(await DOOR.applyAddedRedate({ expect: flags.get("expect"), by: flags.get("by"), reason: flags.get("reason") }, deps));
}

process.exitCode = await main();
// The audit queue and the database pool keep the event loop alive; every write above was awaited and flushed, so leave now.
process.exit(process.exitCode);
