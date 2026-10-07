/**
 * `ops-provision-staff.mts` — create staff logins after the pre-launch reset.
 *
 *   npm run ops:provision-staff -- --plan                    # read-only
 *   npm run ops:provision-staff -- --execute --confirm "PROVISION 50PICK STAFF"
 *
 * Ali, 2026-09-11, on the UT support directory: *"assign roles as needed for the ones in the
 * PDF with the correct access"*, then *"if no account, create please"*.
 *
 * ⛔ THE PRODUCT DELIBERATELY HAS NO ADMIN-SIDE ACCOUNT CREATION, AND THIS DOES NOT CHANGE
 * THAT. `/admin/staff` says so in its own header — *"already have a normal 50pick account —
 * we never create logins here"* — and that is the right default: an account minted by a
 * script has not seen the register flow, has not accepted the terms itself, and has no
 * verified phone. This script exists for ONE bounded job: standing up the named operations
 * team on a freshly reset platform, before any player exists, where asking four colleagues
 * to self-register is slower than provisioning them and is the only thing standing between
 * the desk and a working inbox.
 *
 * ⭐ SELF-REGISTRATION REMAINS THE BETTER PATH AND THE DEFAULT RECOMMENDATION. Use it whenever
 * the person can spare two minutes: they accept the terms in their own name, the phone is
 * theirs, and the Owner's promotion at `/admin/staff` is separately audited. Reach for this
 * script when that is genuinely impractical, and say in `--reason` why.
 *
 * FOUR THINGS IT DOES THAT A RAW INSERT WOULD NOT:
 *
 *  1. **It writes an AUDIT ROW per account** (`staff.provisioned`, category SECURITY) naming
 *     the operator, the role, and the typed reason. A role that appears with no record of who
 *     granted it is the exact defect `/admin/staff` was built to prevent; a script that
 *     bypasses the form must not also bypass the ledger. ⚠️ Run this AFTER the reset — before
 *     it, `--execute` deletes the very rows this writes.
 *  2. **It leaves `acceptedTermsVersion` / `acceptedTermsAt` NULL** — the holder has not
 *     accepted the terms, and a stamped version is indistinguishable at every read site
 *     from someone who clicked it. ⛔ Do not copy the registration path's stamp as if
 *     they had: that turns an operational shortcut into a false compliance record.
 *  3. **It creates the Wallet row.** Several admin surfaces read `Wallet` directly and a
 *     missing row renders as a crash rather than a zero.
 *  4. **It refuses to touch an existing account.** If the phone already resolves, it reports
 *     and skips — promotion of an existing account belongs at `/admin/staff`, where it is
 *     audited with a typed reason and cannot be done by a script nobody reviewed.
 *
 * ⛔ ADMIN (Owner) IS NOT PROVISIONABLE HERE. `EDITABLE_ROLES` excludes it deliberately so the
 * Owner seat cannot be handed out through a form; a script must not be the loophole. The
 * Owner path is `ADMIN_BOOTSTRAP_PHONES` + first login, which is one-shot and audited.
 *
 * ⭐ RUN FROM A PC, THROUGH RAILWAY (2026-10-07 — the QA GROWTH login management approved, COMPLIANCE-DECISIONS §
 * "2026-10-07 · Management's answers for the first marketing campaign …" item 6):
 *   railway run --service 50pick npm run ops:provision-staff -- --list <file outside the repo> --plan
 *   railway run --service 50pick npm run ops:provision-staff -- --list <file> --execute --confirm "PROVISION 50PICK STAFF" \
 *     --operator "<who>" --reason "<why>" [--secrets-file <git-ignored file> --secrets-prefix <NAME>]
 * FOUR GUARDS, each before anything is read or written:
 *  · the PUBLIC PROXY: `railway run` hands this PC the app's PRIVATE database host, which resolves only inside
 *    Railway — the URL is rewritten first and the store is loaded with a dynamic `import()` only after it;
 *  · NO DATABASE, NO RUN: without `DATABASE_URL` the store is the in-memory map, so an account "provisioned" there would
 *    exist nowhere and its password would be handed out for nothing;
 *  · `--execute` only in PRODUCTION'S OWN ENVIRONMENT (the live-switch door's check): its audit row must be signed by the
 *    key production verifies with, and a local `.env` run would sign it with the wrong one;
 *  · the LIST and the SECRETS FILE never where `git add` could take them: the list names people's phones and emails,
 *    the secrets file holds a password — each must be outside every checkout or git-ignored.
 * `--secrets-file` (one account per run) writes `<NAME>_PHONE` and `<NAME>_PASSWORD` into that file and PRINTS NO
 * PASSWORD — for an account Claude holds, whose password must never land in a session transcript (the persona minter's
 * rule, `scripts/live-mint-read-tier-personas.mjs`).
 */
// house-bot: covered by L2 sweep — this writes account rows directly, so no in-app hook fires; the holder
// sweep re-reads every bot holder once a minute and applies whatever changed (04 F8, A2).
import { readFileSync, existsSync, appendFileSync, writeFileSync, rmSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { basename, dirname, resolve } from "node:path";
import type { StoredUser, StoredWallet } from "../src/lib/server/store.ts";

/** ⛔ The public proxy, BEFORE the store loads (see the header). The URL is never printed. */
if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(/@postgres\.railway\.internal(:\d+)?/, "@turntable.proxy.rlwy.net:40357");
}

const argv = process.argv.slice(2);
const has = (f: string) => argv.includes(f);
const val = (f: string) => {
  const i = argv.indexOf(f);
  return i >= 0 ? argv[i + 1] : undefined;
};
const CONFIRM = "PROVISION 50PICK STAFF";
const LIST = val("--list") ?? "prelaunch-staff.json";
const REASON = val("--reason") ?? "";
const SECRETS_FILE = val("--secrets-file");
const SECRETS_PREFIX = val("--secrets-prefix");

/** True when `path` can never be committed: it is outside every git checkout, or git ignores it there. */
function outsideOrIgnored(path: string): boolean {
  const abs = resolve(path);
  try {
    execFileSync("git", ["-C", dirname(abs), "rev-parse", "--show-toplevel"], { stdio: "ignore" });
  } catch {
    return true;
  }
  try {
    execFileSync("git", ["-C", dirname(abs), "check-ignore", "-q", basename(abs)], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

if (!process.env.DATABASE_URL) {
  console.error("✖ REFUSING: no DATABASE_URL — without it the store is the in-memory map and the account would exist nowhere. Run it through `railway run --service 50pick` (see the header). Nothing was read or written.");
  process.exit(2);
}
if (has("--execute")) {
  const auditKey = process.env.AUDIT_CHAIN_SECRET ?? "";
  const viaRailway = process.env.RAILWAY_ENVIRONMENT_NAME === "production" && process.env.RAILWAY_SERVICE_NAME === "50pick";
  if (!viaRailway || auditKey.trim() === "" || auditKey === (process.env.SESSION_SECRET ?? "")) {
    console.error("✖ REFUSING: --execute runs only in production's own environment (`railway run --service 50pick`, which sets RAILWAY_ENVIRONMENT_NAME and the audit secret) — the audit row would be signed with the wrong key. Nothing was read or written.");
    process.exit(2);
  }
}
if (existsSync(LIST) && !outsideOrIgnored(LIST)) {
  console.error(`✖ REFUSING: ${LIST} sits in a checkout where git would commit it, and it names people's phones and emails — move it outside the repo (or to a git-ignored name) and pass --list. Nothing was read or written.`);
  process.exit(2);
}
if (SECRETS_FILE !== undefined || SECRETS_PREFIX !== undefined) {
  if (!SECRETS_FILE || !SECRETS_PREFIX || !/^[A-Z][A-Z0-9_]{1,40}$/.test(SECRETS_PREFIX)) {
    console.error("✖ REFUSING: --secrets-file and --secrets-prefix go together, and the prefix is an UPPER_SNAKE name such as QA_GROWTH. Nothing was read or written.");
    process.exit(2);
  }
  if (!outsideOrIgnored(SECRETS_FILE)) {
    console.error(`✖ REFUSING: ${SECRETS_FILE} is not git-ignored — a password must never sit where git would commit it. Nothing was read or written.`);
    process.exit(2);
  }
  if (existsSync(SECRETS_FILE) && new RegExp(`^${SECRETS_PREFIX}_PASSWORD=`, "m").test(readFileSync(SECRETS_FILE, "utf8"))) {
    console.error(`✖ REFUSING: ${SECRETS_FILE} already holds ${SECRETS_PREFIX}_PASSWORD — this run would add a second one. Nothing was read or written.`);
    process.exit(2);
  }
}

// ⭐ Only now, after the rewrite and the refusals, does anything load that can reach the database.
const { db } = await import("../src/lib/server/store.ts");
const { hashPassword, randomId } = await import("../src/lib/server/crypto.ts");
const { EDITABLE_ROLES } = await import("../src/lib/server/roles.ts");
const { audit, auditFlush } = await import("../src/lib/server/audit.ts");

type Row = { phone: string; email?: string; displayName?: string; role: string; note?: string };

if (!existsSync(LIST)) {
  console.error(
    `✖ No ${LIST}. Write it as:\n\n` +
      `[\n` +
      `  { "phone": "+255XXXXXXXXX", "email": "Fulgence.kijuu@50pick.tz",\n` +
      `    "displayName": "Fulgence Kijuu", "role": "SUPPORT", "note": "Customer Care (UT directory)" }\n` +
      `]\n\n` +
      `  ⛔ The phone is REQUIRED and is the login. \`phoneE164\` is the only unique column on\n` +
      `     User; email is not unique and cannot identify an account.\n` +
      `  Roles available: ${EDITABLE_ROLES.join(", ")}`
  );
  process.exit(1);
}

const rows = JSON.parse(readFileSync(LIST, "utf8")) as Row[];
const problems: string[] = [];
const ready: Array<Row & { tempPassword: string }> = [];

for (const [i, r] of rows.entries()) {
  const label = r.phone ?? `entry #${i}`;
  if (!r.phone || !/^\+255\d{9}$/.test(r.phone)) {
    problems.push(`${label}: phone must be +255 followed by 9 digits`);
    continue;
  }
  if (!EDITABLE_ROLES.includes(r.role as (typeof EDITABLE_ROLES)[number])) {
    problems.push(
      `${label}: role "${r.role}" is not provisionable here` +
        (r.role === "ADMIN" ? " — ADMIN is Owner-only, use ADMIN_BOOTSTRAP_PHONES + first login" : "") +
        `. Allowed: ${EDITABLE_ROLES.join(", ")}`
    );
    continue;
  }
  const existing = await db.user.findByPhone(r.phone);
  if (existing) {
    problems.push(
      `${label}: account ALREADY EXISTS (${existing.id}, role ${existing.role}) — ` +
        `promote it at /admin/staff instead, where the grant is audited with a reason`
    );
    continue;
  }
  // 18 chars of base64url ≈ 108 bits. Shown once; the holder changes it at first sign-in.
  ready.push({ ...r, tempPassword: randomBytes(14).toString("base64url") });
}

if (problems.length) {
  console.error("✖ Not provisioning. Nothing has been written.\n");
  for (const p of problems) console.error("   • " + p);
  if (!has("--skip-bad")) process.exit(1);
  console.error("\n  --skip-bad given: continuing with the rest.\n");
}

console.log(`\nWould provision ${ready.length} account(s):`);
for (const r of ready)
  console.log(`  ${r.role.padEnd(11)} ${r.phone}  ${r.email ?? "-"}  ${r.displayName ?? "-"}  ${r.note ?? ""}`);

if (!has("--execute")) {
  console.log(`\n(read-only. Re-run with --execute --confirm "${CONFIRM}" --reason "<why not self-registration>")`);
  process.exit(0);
}
if (val("--confirm") !== CONFIRM) {
  console.error(`✖ --execute needs --confirm "${CONFIRM}"`);
  process.exit(1);
}
if (REASON.trim().length < 10) {
  console.error(
    "✖ --reason is required and must say WHY these are not self-registering.\n" +
      "  It is written into the audit payload. A provisioned role with no stated reason is\n" +
      "  the thing /admin/staff's typed-reason field exists to prevent."
  );
  process.exit(1);
}

if (SECRETS_FILE && ready.length !== 1) {
  console.error(`✖ --secrets-file takes exactly ONE account per run (this list has ${ready.length} to provision). Nothing has been written.`);
  process.exit(1);
}

const operator = val("--operator") ?? "ops-provision-staff";
const created: Array<{ phone: string; role: string; id: string; tempPassword: string }> = [];

for (const r of ready) {
  const now = new Date().toISOString();
  const id = `usr_${randomId(12)}`;
  const salt = randomId(16);
  const passwordHash = await hashPassword(r.tempPassword, salt);
  // ⭐ --secrets-file: the password is written BEFORE the account, so a failed file write leaves no account whose
  // password nobody holds; a failed account write takes the lines back out again.
  const before = SECRETS_FILE && existsSync(SECRETS_FILE) ? readFileSync(SECRETS_FILE, "utf8") : null;
  if (SECRETS_FILE && SECRETS_PREFIX) {
    appendFileSync(SECRETS_FILE,
      `\n# ${now} ops:provision-staff — ${r.role} ${r.displayName ?? r.phone}, created by ${operator}\n` +
      `${SECRETS_PREFIX}_PHONE=${r.phone}\n${SECRETS_PREFIX}_PASSWORD=${r.tempPassword}\n`);
  }

  const u: StoredUser = {
    id,
    phoneE164: r.phone,
    email: r.email ?? null,
    passwordHash,
    passwordSalt: salt,
    failedLoginCount: 0,
    lockedUntil: null,
    role: r.role as StoredUser["role"],
    status: "ACTIVE",
    locale: "EN",
    displayName: r.displayName ?? null,
    dob: null,
    region: "TZ",
    // ⛔ LEFT NULL DELIBERATELY — THEY HAVE NOT ACCEPTED THE TERMS.
    // The first draft stamped the current version with a payload flag saying an operator
    // accepted on their behalf. That is the defect this file's own header warns about, one
    // level down: a stamped `acceptedTermsVersion` is INDISTINGUISHABLE at every read site
    // from someone who clicked it, and the honest flag sat in an audit payload nobody joins
    // to the user row. Null is the true statement, and it is the one the product can act on.
    // (`TERMS_VERSION` lives in `src/lib/terms-version.ts` since 2026-09-13 so the Terms page
    // and registration read one value — importing it HERE would be exactly the defect above.)
    acceptedTermsVersion: null,
    acceptedTermsAt: null,
    marketingOptIn: false,
    twoFactorEnabled: false,
    avatarDataUrl: null,
    emailVerifiedAt: null,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
    closedAt: null,
  };
  try {
    await db.user.create(u);
  } catch (e) {
    // No account was written, so the password just stored names nothing: take it back out.
    if (SECRETS_FILE) {
      if (before === null) rmSync(SECRETS_FILE, { force: true });
      else writeFileSync(SECRETS_FILE, before);
    }
    throw e;
  }

  const w: StoredWallet = {
    id: `wal_${randomId(12)}`,
    userId: id,
    balance: 0,
    pending: 0,
    hold: 0,
    currency: "TZS",
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
  };
  await db.wallet.create(w);

  await audit({
    category: "SECURITY",
    action: "staff.provisioned",
    actorId: operator,
    targetType: "User",
    targetId: id,
    payload: {
      role: r.role,
      phoneE164: r.phone,
      email: r.email ?? null,
      displayName: r.displayName ?? null,
      reason: REASON,
      termsAccepted: false,
      note:
        "Created by ops-provision-staff.mts — NOT self-registered, no phone verification, " +
        "and acceptedTermsVersion/acceptedTermsAt left NULL because the holder has not " +
        "accepted the terms. Both facts are true on the User row itself, not only here.",
    },
  });

  created.push({ phone: r.phone, role: r.role, id, tempPassword: r.tempPassword });
}

await auditFlush();

console.log(`\n✔ Provisioned ${created.length} account(s). Audit rows written (staff.provisioned).\n`);
if (SECRETS_FILE && SECRETS_PREFIX) {
  for (const c of created) console.log(`   ${c.role.padEnd(11)} ${c.phone}   ${c.id}`);
  console.log(`\n⛔ The temporary password is NOT shown: it is in ${SECRETS_FILE} as ${SECRETS_PREFIX}_PASSWORD (git-ignored).`);
} else {
  console.log("⛔ TEMPORARY PASSWORDS — shown ONCE, not stored anywhere, not recoverable.");
  console.log("   Hand each to its owner over a channel you trust and have them change it at first sign-in.\n");
  for (const c of created) console.log(`   ${c.role.padEnd(11)} ${c.phone}   ${c.tempPassword}`);
}
console.log("\n⚠️ These accounts have NOT verified their phone and did NOT accept the terms themselves.");
console.log("   Both facts are recorded in each audit row rather than hidden.");
