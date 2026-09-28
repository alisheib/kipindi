/**
 * THE FIND STEP'S ACCOUNT LIST, GIVEN SOMETHING TO PAGE THROUGH — the local seed for RESUME-HERE §0c decision 4.
 *
 *   KP_SCRATCH_PORT=5453 npm run db:scratch                 # its own terminal; hold it
 *   export DATABASE_URL='postgresql://postgres:scratch@127.0.0.1:5453/<your own database>' USE_PRISMA_DAL=true
 *   npx prisma migrate deploy
 *   npx tsx scripts/seed-admin-local.mts && npx tsx scripts/seed-house-bots-local.mts
 *   npx tsx scripts/seed-desk-accounts-local.mts            # THIS — forty-five plain player accounts
 *
 * ── WHY IT EXISTS ─────────────────────────────────────────────────────────────────────────────────────────────────
 * The designate wizard's find step lists EVERY account, twenty to a page. A local desk seeded by the two scripts above
 * holds about a dozen accounts, so the list's pager never renders, the second page is never looked at, and the
 * sign-in chips filter a handful of rows that all say the same thing. Evidence taken off a hand-built database is not
 * reproducible, so the population is tracked here instead: forty-five PLAYER accounts, opened over half a year, most
 * of them signed in at spread-out times (inside seven days, inside thirty, older), some never, three opened in the same
 * millisecond (the list's id tie-break, visible), and four that cannot be chosen, one of each kind a plain player can be:
 * closed, suspended, an agent's, and one with no password. A few carry a neutral display name and an example.test
 * address, so a human can SEE that the list names every row by its handle alone.
 *
 * ⛔ WHAT IT WRITES, AND ALL IT WRITES: user rows (and the empty wallet every account has), through the test world's
 * `user()` — the platform DAL's own `create`, the one path that converts both instants on both stores (never raw SQL:
 * RESUME-HERE §1's naive-timestamp trap). No designation, no stake, no money, no switch.
 * ⛔ IT CAN BE RE-RUN. Every id is fixed (`usr_finder_local_NN`), and an id that already exists is skipped and counted,
 * never written twice.
 * ⛔ LOOPBACK ONLY, and it refuses anything else — the refusal is `seed-house-bot-panels-local.mts`'s, copied rather than
 * invented. The password below opens nothing anywhere but a loopback database this script was pointed at.
 * ⛔ D19: it prints to a terminal and names nothing a player can see.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;

const url = process.env.DATABASE_URL ?? "";
if (!url) {
  console.error("DATABASE_URL is required. Start `npm run db:scratch` and export the URL it prints.");
  process.exit(2);
}
if (/rlwy\.net|railway\.app|50pick\.tz|railway\.internal/i.test(url)) {
  console.error("REFUSED — that DATABASE_URL is production.");
  process.exit(2);
}
if (!/@(localhost|127\.0\.0\.1)[:/]/i.test(url)) {
  console.error("REFUSED — loopback only (localhost or 127.0.0.1).");
  process.exit(2);
}
if (process.env.NODE_ENV === "production") {
  console.error("REFUSED — NODE_ENV=production.");
  process.exit(2);
}
process.env.USE_PRISMA_DAL = "true";

const { loadWorld }: Any = await import("./lib/house-bot-world.mts");
const w: Any = await loadWorld();
const CRYPTO: Any = await import("../src/lib/server/crypto.ts");

/** A loopback fixture's password, the same one for every account here — so a human can walk the wizard end to end. */
const HOLDER_PASSWORD = "Finder-Local-2026!";
const SALT = CRYPTO.randomId(16);
const HASH: string = await CRYPTO.hashPassword(HOLDER_PASSWORD, SALT);

const DAY = 86_400_000;
const HOUR = 3_600_000;
const NOW = Date.now();
const ago = (ms: number): string => new Date(NOW - ms).toISOString();

type Kind = "choosable" | "closed" | "suspended" | "agent" | "noPassword";
type Seed = { id: string; joinedMs: number; signedMs: number | null; kind: Kind; named: boolean };

/**
 * The forty-five, derived rather than typed one by one, so the spread is stated once: opened 1–170 days ago, signed in
 * 1–1,400 hours ago (inside a week, inside a month, and older), every eighth never signed in, every sixth named.
 * ⛔ Numbers 30–32 share ONE opening instant, to the millisecond — the tie the list breaks by id.
 */
const SAME_INSTANT = NOW - 90 * DAY;
const SEEDS: Seed[] = Array.from({ length: 45 }, (_, i) => {
  const n = i + 1;
  const nn = String(n).padStart(2, "0");
  const kind: Kind = n === 5 ? "closed" : n === 12 ? "noPassword" : n === 19 ? "suspended" : n === 26 ? "agent" : "choosable";
  return {
    id: `usr_finder_local_${nn}`,
    joinedMs: n >= 30 && n <= 32 ? SAME_INSTANT : NOW - (((n * 11) % 170) + 1) * DAY,
    signedMs: n % 8 === 0 ? null : NOW - (((n * 29) % 1400) + 1) * HOUR,
    kind,
    named: n % 6 === 0,
  };
});

let created = 0;
let skipped = 0;
for (const s of SEEDS) {
  if (await w.db.user.findById(s.id)) { skipped++; continue; }
  await w.user({ id: s.id, role: s.kind === "agent" ? "AGENT" : "PLAYER", createdAt: new Date(s.joinedMs).toISOString(), lastLoginAt: s.signedMs === null ? null : new Date(s.signedMs).toISOString() });
  const nn = s.id.slice(-2);
  const patch: Record<string, unknown> = {};
  if (s.kind !== "noPassword") Object.assign(patch, { passwordHash: HASH, passwordSalt: SALT, passwordSetAt: ago(DAY), passwordSetVia: "SELF_CHANGE" });
  if (s.kind === "closed") Object.assign(patch, { status: "CLOSED", closedAt: ago(2 * DAY) });
  if (s.kind === "suspended") Object.assign(patch, { status: "SUSPENDED" });
  if (s.named) Object.assign(patch, { displayName: `Finder Sample ${nn}`, email: `finder-local-${nn}@example.test` });
  if (Object.keys(patch).length > 0) await w.setUserFields(s.id, patch);
  created++;
}

// ── READ BACK from the database, never from what this script believes it wrote ───────────────────────────────────
const everyone: Any[] = await w.db.user.list();
const mine = everyone.filter((u: Any) => typeof u.id === "string" && u.id.startsWith("usr_finder_local_"));
const admin = await w.db.user.findByPhone("+255700000000");
let listLine = "   the list        (no local admin found — run scripts/seed-admin-local.mts to read the list back)";
if (admin) {
  const GATE: Any = await import("../src/lib/server/house-console-read.ts");
  const view: Any = await GATE.houseAccountListForConsole(admin.id, "/admin/desk", {});
  const can: Any = await GATE.houseAccountListForConsole(admin.id, "/admin/desk", { show: "can-be-chosen" });
  listLine = view === null || view.total === null
    ? "   the list        ⚠️ the gated reader answered nothing for the local admin — check its role"
    : `   the list        ${view.total} accounts · ${Math.ceil(view.total / view.perPage)} page(s) of ${view.perPage} · ${can?.total ?? "?"} can be chosen`;
}

console.log("\n══ desk · the find step's account list · local seed ══");
console.log(`   database        ${url.replace(/:[^:@/]*@/, ":****@")}`);
console.log(`   this seed       ${created} created · ${skipped} already there · ${mine.length} of its 45 on the database`);
console.log(`   every account   ${everyone.length} on the database`);
console.log(listLine);
console.log(`   holder password ${HOLDER_PASSWORD}   (every choosable account above)`);
console.log("\n   next: open /admin/desk/new — the list is under the search card; ?page=2 is the second page\n");
process.exit(0);
