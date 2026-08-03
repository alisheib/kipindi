/**
 * RE-MINT the QA persona passwords on production, and print them once.
 *
 *   railway run --service 50pick -- npx tsx scripts/ops-remint-qa-passwords.mts
 *
 * WHY THIS EXISTS. `.env.qa.local` is gitignored, so it does not travel with the repo.
 * A second machine that pulls the tree has the whole campaign available EXCEPT the ability
 * to sign in as anybody — and since every claim in this campaign is made by driving a real
 * surface as the narrowest role that owns it, "no personas" means "no live testing at all".
 * That is exactly the state laptop A was in: 130 commits of tooling, and not one login.
 *
 * ⛔ IT REUSES THE APP'S OWN HASHING. `hashPassword` + `randomId` are imported from
 * `src/lib/server/crypto.ts`, the same pair `password-reset.ts` calls, with the same
 * `randomId(32)` salt. A hand-rolled scrypt here would drift from the verifier and produce
 * accounts that look correct in the database and cannot sign in — a defect that would be
 * blamed on the login page.
 *
 * ⛔ IT REFUSES TO TOUCH AN ADMIN. Ali's own console login (`777777777`) is never re-minted;
 * the guard is on the ROLE read back from the row, not on the phone list, so a QA persona
 * that has been promoted since is also refused rather than silently reset.
 *
 * Read-your-write: every row is re-read and the new secret verified against the stored
 * hash before the password is printed. A password that cannot verify is not reported as set.
 */
import { Client } from "pg";
import { hashPassword, verifyPassword, randomId } from "../src/lib/server/crypto.ts";

/** The six QA personas, by the phone `harness.mjs` signs in with. ⛔ 777777777 is absent. */
const PERSONAS = [
  { key: "alpha",   phone: "+255712000101", env: "QA_ALPHA_PASSWORD",   label: "player alpha" },
  { key: "echo",    phone: "+255712000105", env: "QA_ECHO_PASSWORD",    label: "player echo" },
  { key: "growth",  phone: "+255712000102", env: "QA_GROWTH_PASSWORD",  label: "GROWTH officer" },
  { key: "trading", phone: "+255712000104", env: "QA_TRADING_PASSWORD", label: "TRADING officer" },
  { key: "officer", phone: "+255712000106", env: "QA_OFFICER_PASSWORD", label: "COMPLIANCE officer" },
  { key: "finance", phone: "+255712000107", env: "QA_FINANCE_PASSWORD", label: "FINANCE officer" },
];

/** A password the login form will accept and a human can paste. */
function mintSecret(): string {
  return `qa-${randomId(10)}-${randomId(6)}`;
}

const url = (process.env.DATABASE_URL || "")
  .replace(/@postgres\.railway\.internal(:\d+)?/, "@turntable.proxy.rlwy.net:40357");
if (!url) { console.error("no DATABASE_URL — run under `railway run --service 50pick --`"); process.exit(2); }

const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await c.connect();

const results: { env: string; secret: string }[] = [];
const problems: string[] = [];

try {
  for (const p of PERSONAS) {
    const found = await c.query(
      `select id, role::text as role, status::text as status, "displayName"
         from "User" where "phoneE164" = $1`,
      [p.phone],
    );

    if (found.rowCount !== 1) {
      problems.push(`${p.key} (${p.phone}) — expected exactly 1 row, found ${found.rowCount}`);
      console.log(`  SKIP  ${p.key.padEnd(8)} ${p.phone} — ${found.rowCount} rows`);
      continue;
    }
    const row = found.rows[0];

    // ⛔ The guard that matters. Read the role back and refuse an ADMIN, whatever the
    // phone list says — the list is a memory, the row is the fact.
    if (row.role === "ADMIN") {
      problems.push(`${p.key} (${p.phone}) — role is ADMIN, refused`);
      console.log(`  REFUSE ${p.key.padEnd(7)} ${p.phone} — role ADMIN, never re-minted here`);
      continue;
    }

    const secret = mintSecret();
    const salt = randomId(32);                       // same width as password-reset.ts
    const hash = await hashPassword(secret, salt);

    // Clear the lockout counters too: a persona left locked by earlier failed runs
    // presents exactly like a wrong password, and costs a diagnosis every time.
    await c.query(
      `update "User"
          set "passwordHash" = $1, "passwordSalt" = $2,
              "failedLoginCount" = 0, "lockedUntil" = null
        where id = $3`,
      [hash, salt, row.id],
    );

    // Read-your-write, against the STORED row — not against the variables above.
    const back = await c.query(`select "passwordHash", "passwordSalt" from "User" where id = $1`, [row.id]);
    const ok = await verifyPassword(secret, back.rows[0].passwordSalt, back.rows[0].passwordHash);
    if (!ok) {
      problems.push(`${p.key} — stored hash does NOT verify; password not reported`);
      console.log(`  FAIL  ${p.key.padEnd(8)} stored hash does not verify`);
      continue;
    }

    results.push({ env: p.env, secret });
    console.log(`  ok    ${p.key.padEnd(8)} ${p.phone}  role=${row.role.padEnd(10)} status=${row.status}`);
  }
} finally {
  await c.end();
}

console.log(`\n--- paste into .env.qa.local (gitignored) ---`);
for (const r of results) console.log(`${r.env}=${r.secret}`);
console.log(`--- end ---\n`);
console.log(`${results.length}/${PERSONAS.length} re-minted and verified`);
if (problems.length) {
  console.log(`\n${problems.length} not done:`);
  for (const p of problems) console.log(`  · ${p}`);
}
process.exit(problems.length === 0 ? 0 : 1);
