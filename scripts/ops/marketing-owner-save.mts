/**
 * ops:marketing-owner-save — THE AUDITED DOOR THROUGH WHICH CLAUDE SAVES WHAT ALI APPROVES IN THE CLAUDE SESSION: the
 * marketing wordings (G4), the campaign source line (G5) and the public policy lines (G10). Ali's ruling of 2026-10-07: he
 * approves each one IN THE CHAT, and Claude saves it for him through this door — never with his login.
 *
 * ⛔ NO BUSINESS LOGIC OF ITS OWN (the live switch door's rule). Every decision — the approval file, the digests, the row as
 * it is now, the card's own rules and request, the record written FIRST, the SAME writer the card calls, the read-back, the
 * factory's ADMIN row confirmed, every ending recorded — is `src/lib/server/marketing/owner-save.ts`'s. This file checks
 * where it runs, hands the door the audit log's durable reader, and prints what the door says. It writes nothing itself.
 *
 * ⛔ THE PUBLIC PROXY FIRST, THEN THE IMPORT. `railway run` hands this PC the app's PRIVATE database host, which resolves only
 * inside Railway. The two records hydrate AS THEY LOAD (`defineConfig` reads its row at import, and that builds the Prisma
 * client with whatever URL is set then), so the URL is rewritten BEFORE the door is loaded, and the door is loaded with a
 * dynamic `import()` — a static import would run first and fix the private host into the client for good, and every read
 * would come back unreadable. (The URL is never printed.)
 * ⛔ PRODUCTION'S OWN ENVIRONMENT for check and apply, as `railway run --service 50pick` injects it — the door's COMPLIANCE
 * rows must be signed by the key production verifies with: `RAILWAY_ENVIRONMENT_NAME=production`,
 * `RAILWAY_SERVICE_NAME=50pick`, and an `AUDIT_CHAIN_SECRET` that is set and is not `SESSION_SECRET` (the live switch door's
 * check: the realistic mistake — a local `.env` run — closed; not a cryptographic proof of the key). Status only reads.
 * ⛔ THE CLOCK: an apply is refused from a PC whose clock is more than 20 s off the database's — the audit rows carry this
 * PC's instant, while the saved versions carry the database's. A check only warns. A database clock that cannot be READ
 * is no PC clock to sync: the database is out of reach, and both commands refuse, saying so.
 *
 * Run it through Railway, from a checkout of the commit production runs:
 *   railway run --service 50pick npm run ops:marketing-owner-save -- status
 *   railway run --service 50pick npm run ops:marketing-owner-save -- check --file <approval.json>
 *   railway run --service 50pick npm run ops:marketing-owner-save -- apply --file <approval.json> --by "Claude for Ali (G5)" --reason "approved by Ali in the Claude session" --expect "source.phrase=<sha12>"
 * `check` prints the exact apply line, with every digest; show Ali the words `check` prints, never words from memory.
 *
 * THE APPROVAL FILE — UTF-8 JSON with every character written as itself (no escapes), kept with the session's evidence:
 *   { "gate": "G4" | "G5", "approvedOn": "YYYY-MM-DD", "wordings": { "<key>": "<words>" } }
 *   { "gate": "G10", "approvedOn": "YYYY-MM-DD", "lines": { "<key>": { "en": "…", "sw": "…", "zh": "…" } | "review" } }
 * G4 holds any of the nine wordings other than the source line, G5 the source line alone, G10 any of the five public lines.
 * An approval is carried out within seven days of its `approvedOn` (EAT); after that Ali is asked again.
 *
 * ⭐ ALI'S APPROVALS, COMMITTED BY DAY (`docs/marketing-approvals/<day>/`; `test:marketing-owner-save` O19 holds every text to
 * what he approved, and every digest below to its file's own):
 *   · 2026-10-07 — G5 his sentence, G4 the code's suggestions as they stood that day, G10 spec Appendix B.2–B.6 as he
 *     approved it. APPLIED on production on 2026-10-07/08, and kept as evidence: ⛔ never run again — an apply of that
 *     day's G4 or G10 after 2026-10-09's would save the stop-link words back as a newer version.
 *   · 2026-10-09 — the owner's ruling of that day (a marketing SMS is sent exactly as the officer wrote it: no stop link).
 *     G4 holds the licence basis's suggestion re-worded ("…if they ask us to stop, the stop is kept for good."); G10 the
 *     two privacy lines, `privacy.smsGateway` and `privacy.lawfulLicence`, each the 2026-10-07 words less the stop-link
 *     clause, every other word kept. ⛔ Shown to Ali, and applied only once he approves them (`approvedOn` is that day —
 *     another day is a new file). In order — status first, one apply per gate, ONE redeploy after the last:
 *   railway run --service 50pick npm run ops:marketing-owner-save -- status
 *   railway run --service 50pick npm run ops:marketing-owner-save -- check --file docs/marketing-approvals/2026-10-09/approval-G4.json
 *   railway run --service 50pick npm run ops:marketing-owner-save -- apply --file docs/marketing-approvals/2026-10-09/approval-G4.json --by "Claude for Ali (G4)" --reason "approved by Ali in the Claude session" --expect "basis.LICENCE_OUTREACH=734a90eecf04"
 *   railway run --service 50pick npm run ops:marketing-owner-save -- check --file docs/marketing-approvals/2026-10-09/approval-G10.json
 *   railway run --service 50pick npm run ops:marketing-owner-save -- apply --file docs/marketing-approvals/2026-10-09/approval-G10.json --by "Claude for Ali (G10)" --reason "approved by Ali in the Claude session" --expect "privacy.lawfulLicence=35bbe7134230,privacy.smsGateway=ad36a53b7683"
 *   railway redeploy --service 50pick
 *
 * Exit: 0 done or nothing to do · 1 refused or not confirmed (the reason is printed) · 2 not run (usage, no database, not
 * production's own environment, the database's clock unreadable, an approval file that can't be opened, or — for apply —
 * this PC's clock off the database's).
 */
import { readFileSync } from "node:fs";

/** ⛔ The public proxy, BEFORE the door loads (see the header): without it every read here is unreadable. */
const PRIVATE_DB_HOST = new RegExp("@postgres[.]railway[.]internal(?::[0-9]+)?");
if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(PRIVATE_DB_HOST, "@turntable.proxy.rlwy.net:40357");
}

const LF = String.fromCharCode(10);
const USAGE = [
  "usage: npm run ops:marketing-owner-save -- status",
  "       npm run ops:marketing-owner-save -- check --file <approval.json>",
  '       npm run ops:marketing-owner-save -- apply --file <approval.json> --by "<who>" --reason "<why>" --expect "<key>=<sha12>,…"',
  "Ali's approvals are filed by day under docs/marketing-approvals/ (2026-10-07: applied, never run again; 2026-10-09: G4 and",
  "G10, the stop-link clause out). The exact check and apply lines of the files to apply, with every digest, are in this",
  "door's header (scripts/ops/marketing-owner-save.mts).",
].join(LF);

/** The flags each command takes — each once, every one required, nothing else. */
const FLAGS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  status: [],
  check: ["file"],
  apply: ["file", "by", "reason", "expect"],
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
    console.log("REFUSING: no DATABASE_URL — nothing can be read or saved without the database. Run it through the runner (see the header).");
    return 2;
  }
  // ⛔ ONLY NOW — after the rewrite above — the door, and the audit log's durable reader it is handed.
  const DOOR = await import("../../src/lib/server/marketing/owner-save.ts");
  const AUDIT = await import("../../src/lib/server/audit.ts");
  const deps = DOOR.ownerSaveDeps((targetType: string, targetId: string) => AUDIT.getAuditForTargetDurable(targetType, targetId, { limit: 25 }));
  if (command === "status") return say(await DOOR.ownerSaveStatus(deps));

  const auditKey = process.env.AUDIT_CHAIN_SECRET ?? "";
  const viaRailway = process.env.RAILWAY_ENVIRONMENT_NAME === "production" && process.env.RAILWAY_SERVICE_NAME === "50pick";
  if (!viaRailway || auditKey.trim() === "" || auditKey === (process.env.SESSION_SECRET ?? "")) {
    console.log("REFUSING: this is not production's own environment (run it through `railway run --service 50pick`, which sets RAILWAY_ENVIRONMENT_NAME and the audit secret) — the door's COMPLIANCE rows would not verify.");
    return 2;
  }
  // This PC's clock against the database's, measured across one round trip: it gates an APPLY; a check only warns.
  const askedAt = Date.now();
  const dbMs = await DOOR.readDatabaseClockMs();
  // ⛔ A clock that could not be READ is the database out of reach — no clock of this PC's to sync, and nothing to check
  // or apply with: said as itself, for both commands.
  if (dbMs === null) {
    console.log("REFUSING: the database's clock couldn't be read — the database could not be reached, so nothing was read or written. Run it again.");
    return 2;
  }
  const clockProblem = DOOR.opsClockProblem(dbMs, askedAt, Date.now());
  if (command === "apply" && clockProblem !== null) {
    console.log(`REFUSING: ${clockProblem} — sync it (Windows: Settings → Time & language → Date & time → Sync now) and run it again.`);
    return 2;
  }
  if (clockProblem !== null) console.log(`WARNING: ${clockProblem} — an apply from this PC is refused until it is synced.`);

  const file = flags.get("file") ?? "";
  let fileBytes: Uint8Array;
  try {
    fileBytes = readFileSync(file);
  } catch {
    console.log(`REFUSING: the approval file couldn't be opened (${file}).`);
    return 2;
  }
  if (command === "check") return say(await DOOR.checkOwnerSave({ fileBytes, filePath: file }, deps));
  return say(await DOOR.applyOwnerSave({ fileBytes, by: flags.get("by"), reason: flags.get("reason"), expect: flags.get("expect") }, deps));
}

process.exitCode = await main();
// The audit queue and the database pool keep the event loop alive; every write above was awaited and flushed, so leave now.
process.exit(process.exitCode);
