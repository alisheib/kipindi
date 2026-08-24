/**
 * Set — and more importantly VERIFY — the GitHub repository secrets the nightly backup
 * reads. `.github/workflows/backup-nightly.yml` reads seven secrets from the *repository*,
 * not from Railway, so nothing in Railway can make the nightly work.
 *
 *   railway run node scripts/backup-secrets.mjs          # report only, no writes
 *   railway run node scripts/backup-secrets.mjs --set     # write the secrets
 *
 * Values are piped to `gh secret set` on STDIN — never on a command line (argv is visible
 * in process listings), never printed. Output is names, lengths and verdicts only.
 *
 * 🔴 THE REASON THIS SCRIPT EXISTS — the internal-host trap.
 * `BACKUP_SOURCE_DATABASE_URL` must be the Postgres service's `DATABASE_PUBLIC_URL`, NOT
 * its `DATABASE_URL`. The latter is `postgres.railway.internal`, which resolves only inside
 * Railway's private network; the workflow runs on a GitHub runner, outside it. Set wrongly,
 * the nightly dies in four seconds with `getaddrinfo ENOTFOUND` — at 00:15 UTC, unattended,
 * looking exactly like a transient blip. It happened on 2026-07-31. This script refuses to
 * write an internal host at all.
 */
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const REPO = process.env.BACKUP_SECRETS_REPO || "alisheib/kipindi";
const SET = process.argv.includes("--set");
// ⚠️ DERIVED FROM THIS FILE, NEVER A MACHINE'S CHECKOUT PATH. This read
// `"C:/kipindi-main/.env.backup.local"` — one laptop's path — so on the other, where the repo
// lives at `F:\kipindi-main`, `existsSync` returned false and the script behaved as though the
// backup key had never been created. 🔴 That is the worst possible failure for THIS file: a
// missing key here reads as "no key yet", and the fix is to mint one — which would have
// replaced the key the existing backups are encrypted with. Same defect `scripts/live/q.cjs`
// records for its `pg` import; the fix was applied there in isolation and eight other scripts
// kept the hardcoded path until 2026-08-24.
const KEY_FILE = fileURLToPath(new URL("../.env.backup.local", import.meta.url));

const isInternal = (url) => {
  try { return /\.railway\.internal$/.test(new URL(url).hostname); } catch { return false; }
};

/** Ask the Postgres service directly — the app service does not carry DATABASE_PUBLIC_URL. */
function postgresPublicUrl() {
  const r = spawnSync("railway", ["variables", "--service", "Postgres", "--environment", "production", "--json"], {
    encoding: "utf8", shell: true,
  });
  if (r.status !== 0) return null;
  try {
    const v = JSON.parse(r.stdout);
    return v.DATABASE_PUBLIC_URL && !isInternal(v.DATABASE_PUBLIC_URL) ? v.DATABASE_PUBLIC_URL : null;
  } catch { return null; }
}

// Reuse an existing key rather than minting a new one — regenerating orphans every artifact
// already sealed with the old key.
let backupKey = null, keyOrigin = "GENERATED — must be saved to a password manager";
if (existsSync(KEY_FILE)) {
  const m = readFileSync(KEY_FILE, "utf8").match(/^BACKUP_ENCRYPTION_KEY=(.+)$/m);
  if (m) { backupKey = m[1].trim(); keyOrigin = "reused from .env.backup.local"; }
}
backupKey ??= randomBytes(32).toString("base64");

const sourceUrl = postgresPublicUrl() ?? process.env.BACKUP_SOURCE_DATABASE_URL ?? process.env.DATABASE_URL;

const SECRETS = {
  BACKUP_SOURCE_DATABASE_URL: sourceUrl,
  AUDIT_CHAIN_SECRET: process.env.AUDIT_CHAIN_SECRET,
  R2_ENDPOINT: process.env.R2_ENDPOINT,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BACKUP_BUCKET: process.env.R2_BACKUP_BUCKET || "50pick-backups",
  BACKUP_ENCRYPTION_KEY: backupKey,
};

const missing = Object.entries(SECRETS).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) {
  console.error(`\n❌ no value for: ${missing.join(", ")}`);
  console.error("   Run through `railway run` so production's env is injected.\n");
  process.exit(1);
}

// Hard refusal, not a warning. A wrong host here fails nightly and unattended.
if (isInternal(SECRETS.BACKUP_SOURCE_DATABASE_URL)) {
  console.error(
    "\n❌ BACKUP_SOURCE_DATABASE_URL is an INTERNAL Railway host — refusing to write it.\n" +
      "   GitHub Actions runs outside Railway's private network and cannot resolve\n" +
      "   *.railway.internal. Use the Postgres service's DATABASE_PUBLIC_URL.\n" +
      "   Railway → Postgres → Settings → Networking → TCP proxy.\n",
  );
  process.exit(2);
}

console.log(`repo   : ${REPO}`);
console.log(`key    : ${keyOrigin}`);
console.log(`source : ${new URL(SECRETS.BACKUP_SOURCE_DATABASE_URL).host}  ✅ public\n`);

if (!SET) {
  for (const [k, v] of Object.entries(SECRETS)) console.log(`  · ${k.padEnd(28)} ready (${v.length} chars)`);
  console.log("\nreport only — re-run with --set to write.\n");
  process.exit(0);
}

let failed = 0;
for (const [name, value] of Object.entries(SECRETS)) {
  const r = spawnSync("gh", ["secret", "set", name, "--repo", REPO], { input: value, encoding: "utf8", shell: false });
  if (r.status !== 0) failed++;
  console.log(`  ${r.status === 0 ? "✅" : "❌"} ${name.padEnd(28)} (${value.length} chars)${r.status === 0 ? "" : " — " + (r.stderr || "").trim()}`);
}

if (keyOrigin.startsWith("GENERATED")) {
  console.log("\n🔴 A NEW BACKUP_ENCRYPTION_KEY was generated. Put it in a password manager NOW.");
  console.log("   The 2026-07-30 drill's key was written to .env.backup.local and then lost;");
  console.log("   a key that lives only where the database lives is not a key.");
}

console.log(failed ? `\n${failed} failed.\n` : "\nAll seven secrets set.\n");
process.exitCode = failed ? 1 : 0;
