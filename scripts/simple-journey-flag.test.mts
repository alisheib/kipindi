/**
 * THE NEW JOURNEY'S SWITCH AND PREVIEW — `test:simple-journey-flag` (Vodacom plan S1, `docs/VODACOM-PLAN.md`).
 *
 * Done-when: "Staff see a 'preview' marker on production and nobody else sees anything." Everything the journey
 * ships from S2 to S14 hides behind what this suite proves, so it proves the hiding from every side:
 *   §1  the ceiling — only the exact words in FEATURE_SIMPLEJOURNEY move it; a typo is the shipped constant.
 *   §2  the truth table — ceiling × stored switch; ABSENT is "no cap", UNREAD / MALFORMED are WITHDRAWN.
 *   §3  the three states are three different products (a state no consumer distinguishes gets deleted here).
 *   §4  the stored record parses STRICTLY — each malformed row beside a sealed control that parses.
 *   §5  the pass's seal: its own secret, a required and bounded expiry, no foreign token, no throw.
 *   §6  the pass's entitlement: issuer still staff (all seven roles) on an open account; a link live.
 *   §7  every viewer — guest, player, staff, pass holders, stale passes — on `/` and on `/admin`.
 *   §8  the Owner's ceremony — refusals in order, the attempt row BEFORE the write, kill, resume, links.
 *   §9  the doors (`/preview`) — on, off, and a preview link, with their refusals.
 *   §10 the wiring, read from source: ONE resolver, ONE reader and ONE writer of the cookie, the shell's order and its
 *       swap (S6 WP6b: the journey header and tabs only in the `journeyShown` arms, as lazy bindings in their own
 *       Suspense, since WP6c `next/dynamic` parts of the shell's one lazy module, today's bar and rail in the else arms,
 *       and nothing else rendering or loading them), the
 *       Akaunti hub's gate (S6 WP5: /account asks the resolver and calls notFound() before any read),
 *       the email-verify bar (S6 WP7: a classic request's on today's condition, never a journey request's), no-store,
 *       the health block, and nothing that grants access ever reading the pass.
 *   §11 `/api/health` reports the rollout.
 *   §12 database mode (its own process, a fake client): a kill written by another container, a failed read,
 *       an attempt row the database refuses, a write that does not land.
 *
 * ⭐ RED TWIN, IN PROCESS: `npm run red:simple-journey-flag` runs the same checks against planted defective
 * implementations and planted source text, and every plant must be caught by the check named for it. It never
 * touches a file (`test:red-anchors` counts it as in-process only while this script makes no file-system change).
 *
 *   npx tsx scripts/simple-journey-flag.test.mts            the suite
 *   npx tsx scripts/simple-journey-flag.test.mts --prove-red the red twin
 */
import { createHmac } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const THIS = fileURLToPath(import.meta.url);
const REPO = join(THIS, "..", "..");
const PROVE_RED = process.argv.includes("--prove-red");
const DB_MODE = process.env.SJF_MODE === "db";
const FAKE_DATABASE_URL = "postgresql://simple-journey-flag:fake@127.0.0.1:1/never_a_real_database";

// ── 0 · THE GUARD — before a single repo module is loaded ─────────────────────────────────────────────────
if (process.env.NODE_ENV === "production") {
  console.log("FAIL 0.guard · ⛔ REFUSED — NODE_ENV=production.");
  process.exit(1);
}
if (DB_MODE) {
  if (process.env.DATABASE_URL !== FAKE_DATABASE_URL) {
    console.log("FAIL 0.guard · ⛔ REFUSED — database mode runs only on this suite's own fake URL.");
    process.exit(1);
  }
} else if (process.env.DATABASE_URL !== undefined) {
  console.log("FAIL 0.guard · ⛔ REFUSED — DATABASE_URL is set. This suite runs on the in-memory store (and a fake client for §12): unset it.");
  process.exit(1);
}
const TEST_SECRET = "sjf-test-preview-secret-0123456789abcdef-long-enough";
process.env.JOURNEY_PREVIEW_SECRET = TEST_SECRET;
delete process.env.FEATURE_SIMPLEJOURNEY;

// ── The fake SystemConfig table for §12 (database mode only) ─────────────────────────────────────────────
const TABLE = new Map<string, unknown>();
const FAIL_READ = new Set<string>();
const DROP_SAVE = new Set<string>();
const AUDIT_FAIL = new Set<string>();
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
if (DB_MODE) {
  process.env.USE_PRISMA_DAL = "false";
  const systemConfig = {
    findUnique: async ({ where: { key } }: { where: { key: string } }) => {
      if (FAIL_READ.has(key)) throw new Error(`fake SystemConfig: the read of ${key} failed (simulated)`);
      return TABLE.has(key) ? { key, value: clone(TABLE.get(key)) } : null;
    },
    upsert: async ({ where: { key }, update }: { where: { key: string }; update: { value: unknown } }) => {
      if (!DROP_SAVE.has(key)) TABLE.set(key, clone(update.value));
      return { key, value: clone(update.value) };
    },
    deleteMany: async ({ where: { key } }: { where: { key: string } }) => ({ count: TABLE.delete(key) ? 1 : 0 }),
  };
  const benignModel = () => new Proxy({}, {
    get: (_t, method) => {
      if (typeof method !== "string") return undefined;
      return async (args?: { data?: unknown; create?: unknown }) => {
        switch (method) {
          case "findMany": case "groupBy": return [];
          case "findFirst": case "findUnique": return null;
          case "count": return 0;
          case "aggregate": return { _sum: {}, _count: {}, _avg: {}, _min: {}, _max: {} };
          case "createMany": case "updateMany": case "deleteMany": return { count: 0 };
          case "create": case "update": return { ...((args?.data ?? {}) as object) };
          case "upsert": return { ...((args?.create ?? {}) as object) };
          default: return null;
        }
      };
    },
  });
  const auditLog = new Proxy({}, {
    get: (_t, method) => {
      const benign = benignModel() as Record<string, (a?: { data?: { action?: string } }) => Promise<unknown>>;
      if (method !== "create") return benign[method as string];
      return async (args?: { data?: { action?: string } }) => {
        if (args?.data?.action && AUDIT_FAIL.has(args.data.action)) throw new Error(`fake AuditLog: the insert of ${args.data.action} failed (simulated)`);
        return benign.create(args);
      };
    },
  });
  const fake: Record<string, unknown> = new Proxy({} as Record<string, unknown>, {
    get: (_t, prop) => {
      if (prop === "systemConfig") return systemConfig;
      if (prop === "auditLog") return auditLog;
      if (typeof prop !== "string" || prop === "then") return undefined;
      if (prop === "$transaction") return async (arg: unknown) => (typeof arg === "function" ? (arg as (tx: unknown) => unknown)(fake) : Promise.all(arg as unknown[]));
      if (prop === "$executeRaw" || prop === "$executeRawUnsafe") return async () => 0;
      if (prop === "$queryRaw" || prop === "$queryRawUnsafe") return async () => [];
      if (prop.startsWith("$")) return async () => undefined;
      return benignModel();
    },
  });
  (globalThis as { __50PICK_PRISMA?: unknown }).__50PICK_PRISMA = fake;
}

// ── THE MODULES ───────────────────────────────────────────────────────────────────────────────────────────
const FS = await import("../src/lib/feature-state.ts");
const SW = await import("../src/lib/server/simple-journey-switch.ts");
const PV = await import("../src/lib/server/journey-preview.ts");
const DR = await import("../src/lib/server/journey-preview-doors.ts");
const CE = await import("../src/lib/server/simple-journey-ceremony.ts");
const { signSession } = await import("../src/lib/server/crypto.ts");
const { db } = await import("../src/lib/server/store.ts");
const { getAuditPage, auditFlush } = await import("../src/lib/server/audit.ts");
const { mkFixtureUser } = await import("./lib/agent-fixtures.mts");
const { decomment } = await import("./lib/decomment.mts");

type RolloutState = import("../src/lib/feature-state.ts").RolloutState;
type Stored = import("../src/lib/server/simple-journey-switch.ts").StoredJourneySwitch;
type Link = import("../src/lib/server/simple-journey-switch.ts").JourneyPreviewLink;

if (DB_MODE) {
  const { prisma, hasDatabase } = await import("../src/lib/server/prisma.ts");
  if (!hasDatabase() || prisma() !== (globalThis as { __50PICK_PRISMA?: unknown }).__50PICK_PRISMA) {
    console.log("FAIL 0.guard · ⛔ REFUSED — prisma() is not this suite's fake client.");
    process.exit(1);
  }
}

// ── OUTPUT ────────────────────────────────────────────────────────────────────────────────────────────────
type Result = { label: string; ok: boolean; detail: string };
let results: Result[] = [];
let quiet = false;
const ok = (label: string, cond: boolean, detail = "") => {
  results.push({ label, ok: !!cond, detail });
  if (!quiet) console.log(`${cond ? "PASS" : "FAIL"} ${label}${!cond && detail ? ` — ${detail}` : ""}`);
};
const j = (v: unknown) => JSON.stringify(v);
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

// ── THE IMPLEMENTATIONS UNDER TEST — passed in, so the red twin can hand in defective ones ────────────────
type Impl = {
  ceiling: typeof FS.simpleJourneyCeiling;
  compose: typeof SW.composeSimpleJourney;
  decide: typeof FS.simpleJourneyFor;
  parse: typeof SW.parseStoredJourneySwitch;
  readPass: typeof PV.readPreviewPass;
  resolvePass: typeof PV.resolvePreviewPass;
  resolveFor: typeof PV.resolveJourneyFor;
  doorOn: typeof DR.previewOnDoor;
  doorLink: typeof DR.previewLinkDoor;
};
const REAL: Impl = {
  ceiling: FS.simpleJourneyCeiling,
  compose: SW.composeSimpleJourney,
  decide: FS.simpleJourneyFor,
  parse: SW.parseStoredJourneySwitch,
  readPass: PV.readPreviewPass,
  resolvePass: PV.resolvePreviewPass,
  resolveFor: PV.resolveJourneyFor,
  doorOn: DR.previewOnDoor,
  doorLink: DR.previewLinkDoor,
};

// ── THE SOURCE WORLD — the wiring facts §10 reads, as text, so the red twin can plant edits in memory ─────
const read = (rel: string) => readFileSync(join(REPO, rel), "utf8").replace(/\r\n/g, "\n");
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dev-test" || name.startsWith(".")) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}
type World = { shell: string; route: string; health: string; files: Map<string, string> };
const WORLD: World = {
  shell: read("src/components/layout/app-shell.tsx"),
  route: read("src/app/preview/route.ts"),
  health: read("src/app/api/health/route.ts"),
  files: new Map(walk(join(REPO, "src")).map((p) => [relative(REPO, p).split(sep).join("/"), decomment(read(relative(REPO, p)))])),
};

// ── FIXTURES ──────────────────────────────────────────────────────────────────────────────────────────────
const STAFF_ROLES = ["ADMIN", "COMPLIANCE", "MODERATOR", "FINANCE", "GROWTH", "AUDITOR", "SUPPORT"] as const;
async function mkUser(id: string, role: string, status = "ACTIVE") {
  if (!(await db.user.findById(id))) await mkFixtureUser(id, { role: "PLAYER" });
  await db.user.update(id, { role, status } as never);
}
const iso = (ms: number) => new Date(ms).toISOString();
const mkLink = (id: string, over: Partial<Link> = {}): Link => ({
  id, label: "Agency — test", issuedBy: "owner", issuedAt: iso(Date.now() - HOUR), expiresAt: iso(Date.now() + 6 * DAY), revokedAt: null, revokedBy: null, ...over,
});
const record = (cap: RolloutState, links: Link[] = [], seq = 1) => ({ cap, links, seq, changedAt: iso(Date.now()), changedBy: "owner", reason: "suite record" });
const setMem = (value: unknown) => {
  SW.__setJourneySwitchStoreForTests(null);
  (globalThis as { __50PICK_JOURNEY_SWITCH_MEM?: { value: unknown } }).__50PICK_JOURNEY_SWITCH_MEM = { value: value === undefined ? null : clone(value) };
};
const withEnv = async <T,>(env: Record<string, string | undefined>, fn: () => Promise<T> | T): Promise<T> => {
  const saved: Record<string, string | undefined> = {};
  for (const k of Object.keys(env)) { saved[k] = process.env[k]; if (env[k] === undefined) delete process.env[k]; else process.env[k] = env[k]; }
  try { return await fn(); } finally { for (const k of Object.keys(saved)) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; } }
};
/** A token sealed the way the pass is sealed, with any payload — for the malformed cases. */
const craft = (payload: Record<string, unknown>, secret = TEST_SECRET) => {
  const b64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${b64}.${createHmac("sha256", secret).update(`kp-preview:${b64}`).digest("base64url")}`;
};
const passPayload = (over: Record<string, unknown> = {}) => {
  const now = Date.now();
  return { p: "journey.preview.pass", v: 1, k: "staff", iss: "u", iat: now, exp: now + HOUR, n: "0123456789abcdef0123456789abcdef", ...over };
};
const trail = async () => { await auditFlush(); return getAuditPage({ limit: 10_000 }); };

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
// THE CHECKS — each group takes the implementations and a run tag (unique ids per run)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
const STATES: RolloutState[] = ["WITHDRAWN", "STAFF_PREVIEW", "ACTIVE"];

async function g1Ceiling(I: Impl) {
  for (const w of STATES) {
    const c = await withEnv({ FEATURE_SIMPLEJOURNEY: w }, () => I.ceiling());
    ok(`1.env.exact.${w} · FEATURE_SIMPLEJOURNEY=${w} sets the ceiling, from the environment`, c.ceiling === w && c.source === "ENV", j(c));
  }
  const typos = ["active", "Active", " ACTIVE", "ACTIVE ", "STAFF-PREVIEW", "staff_preview", "withdrawn", "", "COMING_SOON", "1"];
  const bad = [];
  for (const t of typos) {
    const c = await withEnv({ FEATURE_SIMPLEJOURNEY: t }, () => I.ceiling());
    if (c.ceiling !== "STAFF_PREVIEW" || c.source !== "CODE") bad.push(`${j(t)}→${j(c)}`);
  }
  ok("1.env.typo · any other value (case, spaces, a dash, blank, a retired word) is the shipped STAFF_PREVIEW, from the code", bad.length === 0, bad.join(" "));
  const unset = await withEnv({ FEATURE_SIMPLEJOURNEY: undefined }, () => I.ceiling());
  ok("1.code · unset, the ceiling is the shipped STAFF_PREVIEW — nothing is launched by default", unset.ceiling === "STAFF_PREVIEW" && unset.source === "CODE", j(unset));
}

async function g2Table(I: Impl) {
  const set = (cap: RolloutState): Stored => ({ kind: "SET", ...record(cap) });
  const cases: Array<[RolloutState, string, Stored, RolloutState]> = [];
  const expectFor = (ceiling: RolloutState, stored: Stored): RolloutState => {
    if (stored.kind === "ABSENT") return ceiling;
    if (stored.kind !== "SET") return "WITHDRAWN";
    const r = { WITHDRAWN: 0, STAFF_PREVIEW: 1, ACTIVE: 2 } as const;
    return r[ceiling] <= r[stored.cap] ? ceiling : stored.cap;
  };
  for (const ceiling of STATES) {
    const rows: Array<[string, Stored]> = [
      ["ABSENT", { kind: "ABSENT" }], ["UNREAD", { kind: "UNREAD" }], ["MALFORMED", { kind: "MALFORMED", why: "x" }],
      ["SET W", set("WITHDRAWN")], ["SET SP", set("STAFF_PREVIEW")], ["SET A", set("ACTIVE")],
    ];
    for (const [name, stored] of rows) cases.push([ceiling, name, stored, expectFor(ceiling, stored)]);
  }
  const wrong = cases.filter(([c, , s, want]) => I.compose(c, s) !== want).map(([c, n, s, want]) => `${c}×${n}→${I.compose(c, s)} (want ${want})`);
  ok("2.table · ceiling × stored: ABSENT = the ceiling, SET = the lower of the two, UNREAD/MALFORMED = WITHDRAWN (18 cells)", wrong.length === 0, wrong.join("; "));
  ok("2.kill.beats.env · a stored kill holds even when the environment says ACTIVE (the env raises the ceiling, never overrules the Owner)",
    I.compose("ACTIVE", set("WITHDRAWN")) === "WITHDRAWN");
  ok("2.unread.closed · a read that failed shows nobody anything new, under every ceiling",
    STATES.every((c) => I.compose(c, { kind: "UNREAD" }) === "WITHDRAWN" && I.compose(c, { kind: "MALFORMED", why: "x" }) === "WITHDRAWN"));
  ok("2.absent.open · no record at all is no cap — a fresh database previews exactly as the code says",
    STATES.every((c) => I.compose(c, { kind: "ABSENT" }) === c));
  ok("2.bogus · a ceiling this function does not know composes to WITHDRAWN", I.compose("LIVE" as RolloutState, { kind: "ABSENT" }) === "WITHDRAWN");
}

async function g3ThreeStates(I: Impl) {
  const holder = { valid: true as const };
  const out = STATES.map((s) => ({ s, holder: I.decide(s, holder), plain: I.decide(s, null) }));
  const [w, sp, a] = out;
  ok("3.withdrawn · WITHDRAWN: nobody gets the journey — not even a browser holding a valid pass", !w.holder.journey && !w.holder.preview && !w.plain.journey && !w.plain.preview, j(w));
  ok("3.preview · STAFF_PREVIEW: only the pass holder gets it, and wears the marker; everyone else gets nothing new",
    sp.holder.journey && sp.holder.preview && !sp.plain.journey && !sp.plain.preview, j(sp));
  ok("3.active · ACTIVE: everybody gets it, and nobody wears the marker (it is the product now)",
    a.holder.journey && !a.holder.preview && a.plain.journey && !a.plain.preview, j(a));
  const shapes = new Set(out.map((o) => j([o.holder, o.plain])));
  ok("3.distinct · the three states are three different products (a state no consumer distinguishes would be deleted)", shapes.size === 3, j(out));
  ok("3.no.pass.object · a pass object that is not exactly { valid: true } counts for nothing",
    !I.decide("STAFF_PREVIEW", { valid: "true" } as never).journey && !I.decide("STAFF_PREVIEW", {} as never).journey);
}

async function g4Parse(I: Impl) {
  const good = SW.sealJourneySwitch(record("WITHDRAWN", [mkLink("0123456789abcdef")]));
  const control = I.parse(good);
  ok("4.control · a correctly sealed record parses as SET, with its cap and its link", control.kind === "SET" && control.cap === "WITHDRAWN" && control.links.length === 1, j(control));
  ok("4.absent · no row is ABSENT", I.parse(null).kind === "ABSENT" && I.parse(undefined).kind === "ABSENT");
  const sealed = (over: Record<string, unknown>) => ({
    token: signSession({ purpose: "journey.rollout.switch", v: 1, cap: "STAFF_PREVIEW", links: [], seq: 1, changedAt: iso(Date.now()), changedBy: "owner", reason: "suite record", ...over }),
  });
  const withKey = (k: string, v: unknown) => { const r = JSON.parse(JSON.stringify(sealed({}))); const rec = { purpose: "journey.rollout.switch", v: 1, cap: "STAFF_PREVIEW", links: [], seq: 1, changedAt: iso(Date.now()), changedBy: "owner", reason: "suite record", [k]: v }; r.token = signSession(rec); return r; };
  const bad: Array<[string, unknown]> = [
    ["cap", sealed({ cap: "active" })],
    ["cap.missing", (() => { const rec: Record<string, unknown> = { purpose: "journey.rollout.switch", v: 1, links: [], seq: 1, changedAt: iso(Date.now()), changedBy: "owner", reason: "suite record" }; return { token: signSession(rec) }; })()],
    ["purpose", sealed({ purpose: "invite.rewards.switch" })],
    ["version", sealed({ v: 2 })],
    ["extra", withKey("launch", true)],
    ["seq", sealed({ seq: "1" })],
    ["reason", sealed({ reason: "hey" })],
    ["link.extra", sealed({ links: [{ ...mkLink("0123456789abcdef"), admin: true }] })],
    ["link.id", sealed({ links: [mkLink("NOT-HEX-ID-12345")] })],
    ["link.dup", sealed({ links: [mkLink("0123456789abcdef"), mkLink("0123456789abcdef")] })],
    ["link.revoker", sealed({ links: [mkLink("0123456789abcdef", { revokedAt: iso(Date.now()), revokedBy: null })] })],
    ["unsigned", { token: "abc" }],
    ["tampered", { token: good.token.replace(/.$/, (c) => (c === "A" ? "B" : "A")) }],
    ["row.extra", { ...good, cap: "ACTIVE" }],
    ["not.object", "ACTIVE"],
  ];
  for (const [name, row] of bad) {
    const r = I.parse(row);
    ok(`4.malformed.${name} · ${name} is MALFORMED, beside a sealed control that parses`, r.kind === "MALFORMED" && control.kind === "SET", j(r));
  }
}

async function g5Seal(I: Impl) {
  const now = Date.now();
  const minted = PV.mintPreviewPass("staff", "u1", now + HOUR, now);
  const back = minted ? I.readPass(minted.token, now) : null;
  ok("5.roundtrip · a minted pass reads back with its kind, issuer and dates", !!back && back.kind === "staff" && back.issuer === "u1" && back.exp === now + HOUR, j(back));
  const capped = PV.mintPreviewPass("staff", "u1", now + 30 * DAY, now);
  ok("5.mint.cap · minting clamps the life to 24 hours whatever is asked", !!capped && capped.claim.exp - now === 24 * HOUR, j(capped?.claim));
  ok("5.ttl · a pass sealed with a life over 24 hours is refused on READ (exp is bounded where it is read, not only where it is made)",
    I.readPass(craft(passPayload({ iat: now, exp: now + 24 * HOUR + 1 })), now) === null && I.readPass(craft(passPayload({ iat: now, exp: now + 24 * HOUR })), now) !== null);
  ok("5.exp.required · a pass with no expiry is refused (verifySession's 'no exp never expires' does not apply)",
    I.readPass(craft((() => { const p = passPayload(); delete (p as Record<string, unknown>).exp; return p; })()), now) === null);
  ok("5.expired · an expired pass is refused", I.readPass(craft(passPayload({ iat: now - 2 * HOUR, exp: now - 1 })), now) === null);
  ok("5.future · a pass minted more than a minute in the future is refused", I.readPass(craft(passPayload({ iat: now + 5 * 60_000, exp: now + HOUR })), now) === null);
  ok("5.forged · a pass whose MAC is not the preview secret's is refused", I.readPass(craft(passPayload(), "some-other-secret-0123456789abcdef-xx"), now) === null);
  ok("5.foreign · a token sealed with SESSION_SECRET (signSession) — the session, 2FA, share and reset family — is refused",
    I.readPass(signSession(passPayload()), now) === null);
  ok("5.purpose · the link token's purpose is not a pass", I.readPass(craft(passPayload({ p: "journey.preview.link" })), now) === null);
  ok("5.extra · a pass carrying one field more is refused", I.readPass(craft({ ...passPayload(), role: "ADMIN" }), now) === null);
  ok("5.link.id · a link pass whose issuer is not a link id is refused", I.readPass(craft(passPayload({ k: "link", iss: "u1" })), now) === null);
  ok("5.junk · garbage, empty and oversized tokens are refused without a throw",
    [undefined, null, "", ".", "a.b.c", "x".repeat(5000)].every((t) => I.readPass(t as string, now) === null));
  const secretCases = await withEnv({ NODE_ENV: "production", JOURNEY_PREVIEW_SECRET: undefined }, () => {
    let threw = false; let r1: unknown = "unset"; let r2: unknown = "unset";
    try { r1 = PV.mintPreviewPass("staff", "u1", Date.now() + HOUR); r2 = PV.readPreviewPass(minted?.token); } catch { threw = true; }
    return { threw, r1, r2, secret: PV.previewSecret() };
  });
  ok("5.secret.missing · in production with no JOURNEY_PREVIEW_SECRET the preview is OFF: nothing mints, nothing reads, nothing throws",
    !secretCases.threw && secretCases.r1 === null && secretCases.r2 === null && secretCases.secret === null, j(secretCases));
  const same = await withEnv({ NODE_ENV: "production", SESSION_SECRET: "x".repeat(40), JOURNEY_PREVIEW_SECRET: "x".repeat(40) }, () => PV.previewSecret());
  const short = await withEnv({ NODE_ENV: "production", JOURNEY_PREVIEW_SECRET: "short" }, () => PV.previewSecret());
  const placeholder = await withEnv({ NODE_ENV: "production", JOURNEY_PREVIEW_SECRET: "PASTE_A_GENERATED_VALUE_HERE_0123456789" }, () => PV.previewSecret());
  const good = await withEnv({ NODE_ENV: "production", JOURNEY_PREVIEW_SECRET: "g".repeat(48) }, () => PV.previewSecret());
  ok("5.secret.unusable · a secret equal to SESSION_SECRET, shorter than 32, or a template placeholder is refused; a real one is used",
    same === null && short === null && placeholder === null && good === "g".repeat(48), j({ same, short, placeholder, good: !!good }));
}

async function g6Entitlement(I: Impl, tag: string) {
  const now = Date.now();
  const stored: Stored = { kind: "SET", ...record("ACTIVE", [
    mkLink("aaaaaaaaaaaaaaaa"),
    mkLink("bbbbbbbbbbbbbbbb", { revokedAt: iso(now - 1000), revokedBy: "owner" }),
    mkLink("cccccccccccccccc", { issuedAt: iso(now - 8 * DAY), expiresAt: iso(now - 1000) }),
    mkLink("dddddddddddddddd", { expiresAt: iso(now + 2 * HOUR) }),
  ]) };
  const staffPass = (id: string) => PV.mintPreviewPass("staff", id, now + HOUR, now)!.token;
  const roleOk: string[] = [];
  for (const role of STAFF_ROLES) {
    const id = `${tag}_st_${role.toLowerCase()}`;
    await mkUser(id, role);
    if (await I.resolvePass(staffPass(id), "STAFF_PREVIEW", stored, { now })) roleOk.push(role);
  }
  ok("6.staff.all · a pass issued by ANY of the seven staff roles counts — SUPPORT included (SJ-23)", roleOk.length === 7, j(roleOk));
  for (const role of ["PLAYER", "AGENT"]) {
    const id = `${tag}_np_${role.toLowerCase()}`;
    await mkUser(id, role);
    ok(`6.not.staff.${role} · a pass whose issuer is a ${role} counts for nothing`, (await I.resolvePass(staffPass(id), "STAFF_PREVIEW", stored, { now })) === null);
  }
  const demoted = `${tag}_demoted`;
  await mkUser(demoted, "SUPPORT");
  const token = staffPass(demoted);
  const before = await I.resolvePass(token, "STAFF_PREVIEW", stored, { now });
  await db.user.update(demoted, { role: "PLAYER" } as never);
  const after = await I.resolvePass(token, "STAFF_PREVIEW", stored, { now });
  ok("6.demoted · the issuer is RE-READ on every request: the same pass counts while they are staff and stops the moment their stored role is not",
    !!before && after === null, j({ before: !!before, after: !!after }));
  for (const status of ["SUSPENDED", "CLOSED", "SELF_EXCLUDED", "COOLED_OFF"]) {
    const id = `${tag}_closed_${status.toLowerCase()}`;
    await mkUser(id, "ADMIN", status);
    ok(`6.closed.${status} · a staff issuer whose account is ${status} vouches for nothing`, (await I.resolvePass(staffPass(id), "STAFF_PREVIEW", stored, { now })) === null);
  }
  const kyc = `${tag}_pending_kyc`;
  await mkUser(kyc, "SUPPORT", "PENDING_KYC");
  ok("6.pending.kyc · a staff member with no identity check still previews (staff need no KYC)", !!(await I.resolvePass(staffPass(kyc), "STAFF_PREVIEW", stored, { now })));
  ok("6.missing · a pass whose issuer does not exist counts for nothing", (await I.resolvePass(staffPass(`${tag}_ghost`), "STAFF_PREVIEW", stored, { now })) === null);
  const live = PV.mintPreviewPass("link", "aaaaaaaaaaaaaaaa", now + HOUR, now)!.token;
  ok("6.link.live · a pass from a live link counts", !!(await I.resolvePass(live, "STAFF_PREVIEW", stored, { now })));
  ok("6.link.revoked · a pass from a REVOKED link stops counting", (await I.resolvePass(PV.mintPreviewPass("link", "bbbbbbbbbbbbbbbb", now + HOUR, now)!.token, "STAFF_PREVIEW", stored, { now })) === null);
  ok("6.link.expired · a pass from an EXPIRED link stops counting", (await I.resolvePass(PV.mintPreviewPass("link", "cccccccccccccccc", now + HOUR, now)!.token, "STAFF_PREVIEW", stored, { now })) === null);
  ok("6.link.unknown · a pass from a link not in the record counts for nothing", (await I.resolvePass(PV.mintPreviewPass("link", "eeeeeeeeeeeeeeee", now + HOUR, now)!.token, "STAFF_PREVIEW", stored, { now })) === null);
  ok("6.link.outlives · a link pass that ends AFTER its link counts for nothing", (await I.resolvePass(PV.mintPreviewPass("link", "dddddddddddddddd", now + 3 * HOUR, now)!.token, "STAFF_PREVIEW", stored, { now })) === null);
  ok("6.link.absent.record · with no record there are no links", (await I.resolvePass(live, "STAFF_PREVIEW", { kind: "ABSENT" }, { now })) === null);
  const admin = `${tag}_st_admin`;
  ok("6.withdrawn · under WITHDRAWN a perfectly good pass is ignored", (await I.resolvePass(staffPass(admin), "WITHDRAWN", stored, { now })) === null);
  const threw = await I.resolvePass(staffPass(admin), "STAFF_PREVIEW", stored, { now, findUser: async () => { throw new Error("db down"); } }).then((r) => r, () => "threw");
  ok("6.lookup.fails · a failed issuer lookup is no pass — and no throw", threw === null, j(threw));
}

async function g7Viewers(I: Impl, tag: string) {
  const now = Date.now();
  const staff = `${tag}_v_staff`; const player = `${tag}_v_player`; const demoted = `${tag}_v_demoted`;
  await mkUser(staff, "SUPPORT"); await mkUser(player, "PLAYER"); await mkUser(demoted, "PLAYER");
  const link = mkLink("1111111111111111"); const revoked = mkLink("2222222222222222", { revokedAt: iso(now - 1000), revokedBy: "owner" });
  const staffPass = PV.mintPreviewPass("staff", staff, now + HOUR, now)!.token;
  const expired = craft(passPayload({ iss: staff, iat: now - 25 * HOUR, exp: now - HOUR }));
  const viewers: Array<[string, string | undefined, boolean]> = [
    ["guest", undefined, false],
    ["player (no pass)", undefined, false],
    ["staff (no pass — the preview is opt-in)", undefined, false],
    ["staff pass", staffPass, true],
    ["player holding a staff-issued pass (previewing as a player)", staffPass, true],
    ["expired pass", expired, false],
    ["pass from a demoted issuer", PV.mintPreviewPass("staff", demoted, now + HOUR, now)!.token, false],
    ["agency link pass", PV.mintPreviewPass("link", link.id, now + HOUR, now)!.token, true],
    ["revoked link pass", PV.mintPreviewPass("link", revoked.id, now + HOUR, now)!.token, false],
    ["garbage cookie", "not-a-pass", false],
  ];
  for (const state of STATES) {
    const cap: RolloutState = state;
    setMem(SW.sealJourneySwitch(record(cap, [link, revoked])));
    const rows = await withEnv({ FEATURE_SIMPLEJOURNEY: "ACTIVE" }, async () => {
      const out: string[] = [];
      for (const [name, cookie, holds] of viewers) {
        const want = state === "ACTIVE" ? { journey: true, preview: false } : state === "STAFF_PREVIEW" && holds ? { journey: true, preview: true } : { journey: false, preview: false };
        const page = await I.resolveFor({ cookie, path: "/" });
        const shell = await I.resolveFor({ cookie, path: "/" });
        if (page.state !== state || page.journey !== want.journey || page.preview !== want.preview) out.push(`${name}: ${j({ journey: page.journey, preview: page.preview, state: page.state })} want ${j(want)}`);
        if (j({ ...page, pass: !!page.pass }) !== j({ ...shell, pass: !!shell.pass })) out.push(`${name}: the shell's and the page's resolutions differ`);
        const admin = await I.resolveFor({ cookie, path: "/admin/journey" });
        if (admin.journey || admin.preview || admin.pass) out.push(`${name}: /admin resolved ${j({ journey: admin.journey, preview: admin.preview })}`);
      }
      return out;
    });
    ok(`7.viewers.${state} · every viewer under ${state}: only a counting pass previews (and wears the marker), nobody is previewed on /admin, and two asks of one request agree`,
      rows.length === 0, rows.join(" | "));
  }
  setMem(null);
  const absent = await I.resolveFor({ cookie: staffPass, path: "/" });
  ok("7.absent · with no record (a fresh database) a staff pass previews under the shipped STAFF_PREVIEW", absent.state === "STAFF_PREVIEW" && absent.preview, j({ state: absent.state, preview: absent.preview }));
  const envKill = await withEnv({ FEATURE_SIMPLEJOURNEY: "WITHDRAWN" }, () => I.resolveFor({ cookie: staffPass, path: "/" }));
  ok("7.env.kill · FEATURE_SIMPLEJOURNEY=WITHDRAWN hides it from a pass holder too", envKill.state === "WITHDRAWN" && !envKill.journey && !envKill.preview, j(envKill));
  const broken = await I.resolveFor({ cookie: staffPass, path: "/" }, { switchNow: async () => { throw new Error("boom"); } }).then((r) => r, () => "threw");
  ok("7.never.throws · a resolver whose switch read throws answers 'nothing new, no marker' — it never takes the page down",
    typeof broken === "object" && !broken.journey && !broken.preview, j(broken));
}

async function g8Ceremony(tag: string) {
  const owner = `${tag}_owner`; const growth = `${tag}_growth`;
  await mkUser(owner, "ADMIN"); await mkUser(growth, "GROWTH");
  setMem(null);
  const run = (who: string | null, input: unknown, totp: "ok" | "unverified" | "not-enrolled" = "ok") => CE.runJourneyCeremony(who, input as never, { totp });
  const r0 = await run(null, { op: "CAP", to: "WITHDRAWN", reason: "stop it now", expectSeq: 0 });
  ok("8.refuse.session · no session: 'Your session ended', nothing written", !r0.ok && /session ended/i.test(r0.error), j(r0));
  const before = (await trail()).filter((e) => e.action === "privilege_escalation_blocked" && e.actorId === growth).length;
  const r1 = await run(growth, { op: "CAP", to: "WITHDRAWN", reason: "stop it now", expectSeq: 0 });
  const after = (await trail()).filter((e) => e.action === "privilege_escalation_blocked" && e.actorId === growth).length;
  ok("8.refuse.officer · a GROWTH officer is refused (Owner only, on the STORED role) and a SECURITY row says so", !r1.ok && after === before + 1, j({ r1, rows: after - before }));
  const r2 = await run(owner, { op: "CAP", to: "WITHDRAWN", reason: "stop it now", expectSeq: 0 }, "unverified");
  ok("8.refuse.totp · the Owner without the console's two-step check is refused", !r2.ok && /two-step/i.test(r2.error), j(r2));
  const r3 = await run(owner, { op: "CAP", to: "WITHDRAWN", reason: "\u200b\u200b\u200b\u200b\u200b", expectSeq: 0 });
  ok("8.refuse.reason · five invisible characters are not a reason", !r3.ok && r3.field === "reason", j(r3));
  const r4 = await run(owner, { op: "CAP", to: "LIVE", reason: "stop it now", expectSeq: 0 });
  ok("8.refuse.to · a position that is not one of the three words is not understood", !r4.ok && r4.field === "to", j(r4));
  const r5 = await run(owner, { op: "CAP", to: "WITHDRAWN", reason: "stop it now", expectSeq: 7 });
  ok("8.refuse.seq · a page rendered on another record number is 'changed a moment ago'", !r5.ok && r5.field === "seq", j(r5));
  ok("8.refused.nothing · after every refusal the store is still ABSENT", SW.parseStoredJourneySwitch((globalThis as { __50PICK_JOURNEY_SWITCH_MEM?: { value: unknown } }).__50PICK_JOURNEY_SWITCH_MEM?.value).kind === "ABSENT");

  const staff = `${tag}_c_staff`; await mkUser(staff, "COMPLIANCE");
  const pass = PV.mintPreviewPass("staff", staff, Date.now() + HOUR)!.token;
  const pre = await PV.resolveJourneyFor({ cookie: pass, path: "/" });
  const kill = await run(owner, { op: "CAP", to: "WITHDRAWN", reason: "stop it now", expectSeq: 0 });
  const post = await PV.resolveJourneyFor({ cookie: pass, path: "/" });
  ok("8.kill · the Owner's Stop lands: the rollout is WITHDRAWN and a pass that counted a moment ago shows nothing",
    kill.ok && kill.changed && kill.state === "WITHDRAWN" && pre.preview && !post.journey && !post.preview, j({ kill, pre: pre.preview, post: post.preview }));
  const rows = (await trail()).filter((e) => e.actorId === owner && (e.action === "journey.rollout.attempt" || e.action === "journey.rollout.set"));
  const chron = [...rows].reverse();
  const iAttempt = chron.findIndex((e) => e.action === "journey.rollout.attempt");
  const iSet = chron.findIndex((e) => e.action === "journey.rollout.set");
  ok("8.attempt.first · the COMPLIANCE attempt row is on file BEFORE the outcome row, and the outcome carries reason, record number and confirmed",
    iAttempt >= 0 && iSet > iAttempt && chron[iSet].category === "COMPLIANCE" && (chron[iSet].payload as Record<string, unknown>)?.reason === "stop it now"
      && (chron[iSet].payload as Record<string, unknown>)?.seq === 1 && (chron[iSet].payload as Record<string, unknown>)?.confirmed === true, j(chron.map((e) => e.action)));
  const again = await run(owner, { op: "CAP", to: "WITHDRAWN", reason: "stop it again", expectSeq: 1 });
  ok("8.noop · pressing Stop on a stopped switch changes nothing and says so", again.ok && !again.changed, j(again));
  const issue = await run(owner, { op: "ISSUE_LINK", label: "Agency — Fred", reason: "agency review", expectSeq: 1 });
  const afterIssue = await SW.readJourneySwitchFresh();
  ok("8.issue.keeps.kill · issuing a link while stopped leaves the rollout stopped (a link act never moves the rollout)",
    issue.ok && issue.changed && issue.state === "WITHDRAWN" && afterIssue.kind === "SET" && afterIssue.cap === "WITHDRAWN", j({ issue, cap: afterIssue.kind === "SET" ? afterIssue.cap : afterIssue.kind }));
  const url = issue.ok ? issue.link?.url ?? "" : "";
  const t = /\/preview\?t=([^&]+)$/.exec(url)?.[1] ?? "";
  const claim = PV.readPreviewLinkToken(t);
  ok("8.issue.url · the new link is a /preview?t=… URL whose token names that link and its 7-day end",
    issue.ok && !!issue.link && !!claim && claim.linkId === issue.link.id && Math.abs(claim.exp - Date.parse(issue.link.expiresAt)) === 0
      && Math.abs(Date.parse(issue.link.expiresAt) - Date.now() - 7 * DAY) < 60_000, j({ url, claim }));
  const resume = await run(owner, { op: "CAP", to: "ACTIVE", reason: "resume the preview", expectSeq: 2 });
  const back = await PV.resolveJourneyFor({ cookie: pass, path: "/" });
  ok("8.resume · Resume (no cap) brings back the shipped STAFF_PREVIEW, and the same pass counts again", resume.ok && resume.state === "STAFF_PREVIEW" && back.preview, j({ resume, back: back.preview }));
  const linkId = issue.ok && issue.link ? issue.link.id : "";
  const linkPass = PV.mintPreviewPass("link", linkId, Date.now() + HOUR)!.token;
  const liveBefore = (await PV.resolveJourneyFor({ cookie: linkPass, path: "/" })).preview;
  const revoke = await run(owner, { op: "REVOKE_LINK", linkId, reason: "agency done", expectSeq: 3 });
  const liveAfter = (await PV.resolveJourneyFor({ cookie: linkPass, path: "/" })).preview;
  ok("8.revoke · revoking the link stops every pass minted from it (it counted a moment before)", revoke.ok && revoke.changed && liveBefore && !liveAfter, j({ revoke, liveBefore, liveAfter }));
  const revoke2 = await run(owner, { op: "REVOKE_LINK", linkId, reason: "agency done", expectSeq: 4 });
  ok("8.revoke.noop · revoking it again changes nothing and says so", revoke2.ok && !revoke2.changed, j(revoke2));
  const badLink = await run(owner, { op: "REVOKE_LINK", linkId: "ffffffffffffffff", reason: "agency done", expectSeq: 4 });
  ok("8.revoke.unknown · a link not in the record is refused", !badLink.ok && badLink.field === "link", j(badLink));
  const label = await run(owner, { op: "ISSUE_LINK", label: "x", reason: "agency review", expectSeq: 4 });
  ok("8.issue.label · a one-character label is refused", !label.ok && label.field === "label", j(label));
  const noSecret = await withEnv({ NODE_ENV: "production", JOURNEY_PREVIEW_SECRET: undefined }, () => run(owner, { op: "ISSUE_LINK", label: "Agency", reason: "agency review", expectSeq: 4 }));
  ok("8.issue.secret · with no usable secret no link is issued (it could never open)", !noSecret.ok && /JOURNEY_PREVIEW_SECRET/.test(noSecret.error), j(noSecret));
  const malformed = { token: signSession({ purpose: "journey.rollout.switch", v: 9 }) };
  setMem(malformed);
  const recover = await run(owner, { op: "CAP", to: "ACTIVE", reason: "re-seal after rotation", expectSeq: 0 });
  ok("8.recover · over an unreadable record (a secret rotation) the Owner can write a new one, and it reads", recover.ok && recover.changed && recover.state === "STAFF_PREVIEW", j(recover));
  setMem(malformed);
  const linkOverMalformed = await run(owner, { op: "ISSUE_LINK", label: "Agency", reason: "agency review", expectSeq: 0 });
  ok("8.issue.over.malformed · a link issued over an unreadable record keeps the rollout where it reads (WITHDRAWN)", linkOverMalformed.ok && linkOverMalformed.state === "WITHDRAWN", j(linkOverMalformed));

  // ⭐ THE LINK CAP (review SJ-CEREMONY-LINKCAP): a full record makes room from links that open nothing; a revoke frees a slot.
  const full = Array.from({ length: SW.JOURNEY_LINKS_MAX }, (_, i) => mkLink(i.toString(16).padStart(16, "0")));
  setMem(SW.sealJourneySwitch(record("ACTIVE", full, 1)));
  const refusedFull = await run(owner, { op: "ISSUE_LINK", label: "Agency — 26th", reason: "one more reviewer", expectSeq: 1 });
  ok("8.cap.full · with every slot holding a LIVE link a new one is refused, and the sentence says the links are live", !refusedFull.ok && /are live/.test(refusedFull.error), j(refusedFull));
  const revokeOne = await run(owner, { op: "REVOKE_LINK", linkId: full[0].id, reason: "reviewer finished", expectSeq: 1 });
  const afterRevoke = await run(owner, { op: "ISSUE_LINK", label: "Agency — 26th", reason: "one more reviewer", expectSeq: 2 });
  const capRec = await SW.readJourneySwitchFresh();
  ok("8.cap.revoke.frees · revoking one frees its slot at once: the new link is issued, the record holds 25 and still parses, and the revoked one is the one dropped",
    revokeOne.ok && afterRevoke.ok && afterRevoke.changed && capRec.kind === "SET" && capRec.links.length === SW.JOURNEY_LINKS_MAX && !capRec.links.some((l) => l.id === full[0].id),
    j({ revokeOne: revokeOne.ok, afterRevoke, n: capRec.kind === "SET" ? capRec.links.length : capRec.kind }));
  const t0 = Date.now();
  const endedLinks = Array.from({ length: SW.JOURNEY_LINKS_MAX }, (_, i) => mkLink(`e${i.toString(16).padStart(15, "0")}`, { issuedAt: iso(t0 - 20 * DAY + i * HOUR), expiresAt: iso(t0 - 13 * DAY + i * HOUR) }));
  setMem(SW.sealJourneySwitch(record("ACTIVE", endedLinks, 1)));
  const overEnded = await run(owner, { op: "ISSUE_LINK", label: "Agency — fresh", reason: "new reviewer", expectSeq: 1 });
  const endedRec = await SW.readJourneySwitchFresh();
  ok("8.cap.ended · a record full of ENDED links makes room from the one that ended first",
    overEnded.ok && endedRec.kind === "SET" && endedRec.links.length === SW.JOURNEY_LINKS_MAX && !endedRec.links.some((l) => l.id === endedLinks[0].id) && endedRec.links.some((l) => l.id === endedLinks[1].id),
    j({ overEnded }));
  setMem(null);
}

async function g9Doors(I: Impl, tag: string) {
  const staff = `${tag}_d_staff`; const player = `${tag}_d_player`;
  await mkUser(staff, "AUDITOR"); await mkUser(player, "PLAYER");
  setMem(null);
  const cross = await I.doorOn({ viewerUserId: staff, totp: "ok", secFetchSite: "cross-site" });
  ok("9.on.cross-site · a cross-site POST sets nothing", !cross.set && /preview=cross-site/.test(cross.to), j(cross));
  const anon = await I.doorOn({ viewerUserId: null, totp: "unverified", secFetchSite: "same-origin" });
  ok("9.on.session · no session is sent to the staff sign-in, and sets nothing", !anon.set && anon.to.startsWith("/auth/admin"), j(anon));
  const secBefore = (await trail()).filter((e) => e.action === "journey.preview.refused" && e.actorId === player).length;
  const p = await I.doorOn({ viewerUserId: player, totp: "ok", secFetchSite: "same-origin" });
  const secAfter = (await trail()).filter((e) => e.action === "journey.preview.refused" && e.actorId === player).length;
  ok("9.on.not-staff · a player cannot set a pass, and the attempt is on the SECURITY record", !p.set && /preview=not-staff/.test(p.to) && secAfter === secBefore + 1, j(p));
  const totp = await I.doorOn({ viewerUserId: staff, totp: "unverified", secFetchSite: "same-origin" });
  ok("9.on.totp · staff without the two-step check are sent to it, and nothing is set", !totp.set && totp.to.startsWith("/admin/totp-verify"), j(totp));
  setMem(SW.sealJourneySwitch(record("WITHDRAWN")));
  const off = await I.doorOn({ viewerUserId: staff, totp: "ok", secFetchSite: "same-origin" });
  ok("9.on.withdrawn · while the rollout is stopped no pass is set", !off.set && /preview=withdrawn/.test(off.to), j(off));
  setMem(null);
  const onBefore = (await trail()).filter((e) => e.action === "journey.preview.on" && e.actorId === staff).length;
  const on = await I.doorOn({ viewerUserId: staff, totp: "ok", secFetchSite: "same-origin" });
  const onAfter = (await trail()).filter((e) => e.action === "journey.preview.on" && e.actorId === staff).length;
  const res = on.set ? await PV.resolveJourneyFor({ cookie: on.set.token, path: "/" }) : null;
  ok("9.on.ok · staff get a pass that COUNTS, for at most 24 hours, land on /, and the act is on the record",
    !!on.set && on.to === "/" && on.set.maxAgeSec <= 24 * 3600 && on.set.maxAgeSec > 23 * 3600 && !!res?.preview && onAfter === onBefore + 1, j({ on: { ...on, set: on.set ? { maxAgeSec: on.set.maxAgeSec } : null }, preview: res?.preview }));
  const offDoor = await DR.previewOffDoor({ cookie: on.set?.token, back: "/admin/journey" });
  const offNoPass = await DR.previewOffDoor({ cookie: undefined, back: "https://evil.example/" });
  ok("9.off · Exit always clears the pass; it lands back on /admin/journey only when asked from there, and never off-site",
    offDoor.clear === true && offDoor.to === "/admin/journey" && offNoPass.clear === true && offNoPass.to === "/", j({ offDoor, offNoPass }));
  const link = mkLink("3333333333333333", { expiresAt: iso(Date.now() + 5 * DAY) });
  const revoked = mkLink("4444444444444444", { revokedAt: iso(Date.now() - 1000), revokedBy: "owner" });
  setMem(SW.sealJourneySwitch(record("ACTIVE", [link, revoked])));
  const tok = PV.previewLinkToken(link)!;
  const opened = await I.doorLink({ token: tok, ip: `${tag}.1` });
  const openedRes = opened.set ? await PV.resolveJourneyFor({ cookie: opened.set.token, path: "/" }) : null;
  const openedRow = (await trail()).find((e) => e.action === "journey.preview.link.opened" && e.targetId === link.id);
  ok("9.link.ok · a live link sets a pass that counts, lands on /, and the opening is recorded with the link id and no address",
    !!opened.set && opened.to === "/" && !!openedRes?.preview && !!openedRow && !openedRow.ip && !JSON.stringify(openedRow.payload ?? {}).includes(`${tag}.1`), j({ opened: !!opened.set, preview: openedRes?.preview, row: openedRow?.payload }));
  const rv = await I.doorLink({ token: PV.previewLinkToken(revoked)!, ip: `${tag}.2` });
  ok("9.link.revoked · a revoked link lands on / with no pass", !rv.set && rv.to === "/", j(rv));
  const forged = await I.doorLink({ token: craft({ p: "journey.preview.link", v: 1, lid: link.id, exp: Date.parse(link.expiresAt) }, "another-secret-0123456789abcdef-xxxxxxxx"), ip: `${tag}.3` });
  ok("9.link.forged · a link token not sealed with the preview secret sets nothing", !forged.set, j(forged));
  const reissued = await I.doorLink({ token: PV.previewLinkToken({ id: link.id, expiresAt: iso(Date.parse(link.expiresAt) + 1000) })!, ip: `${tag}.4` });
  ok("9.link.other.issue · a token for the same id but another end (another issue of the link) sets nothing", !reissued.set, j(reissued));
  setMem(SW.sealJourneySwitch(record("WITHDRAWN", [link])));
  const killed = await I.doorLink({ token: tok, ip: `${tag}.5` });
  ok("9.link.withdrawn · while the rollout is stopped a live link sets nothing", !killed.set, j(killed));
  setMem(SW.sealJourneySwitch(record("ACTIVE", [link])));
  let limited = 0;
  for (let i = 0; i < 12; i++) { const r = await I.doorLink({ token: tok, ip: `${tag}.flood` }); if (!r.set) limited++; }
  ok("9.link.rate · one address opening a link a dozen times is cut off after ten (link unfurlers, guessers)", limited >= 2, `refused ${limited}/12`);
  setMem(null);
}

function g10Wiring(W: World) {
  const shell = decomment(W.shell);
  const iAdmin = shell.indexOf('pathname.startsWith("/admin")');
  const iOpt = shell.indexOf("isOptOutPath(pathname)");
  const iResolve = shell.indexOf("resolveSimpleJourney()");
  ok("10.shell.order · AppShell asks the resolver AFTER the /admin and opt-out returns (the console is never previewed)",
    iAdmin > 0 && iOpt > iAdmin && iResolve > iOpt, j({ iAdmin, iOpt, iResolve }));
  ok("10.shell.marker · the marker renders only on the resolver's `preview`", /const journeyPreview = \(await journeyRead\)\.preview;/.test(shell) && /\{journeyPreview && <PreviewMarker /.test(shell));
  // ⭐ THE EMAIL-VERIFY BAR (S6 WP7; VODACOM-PLAN §3.2 item 2, "no email-verify bar on journey") is decided by the same
  // per-request answer as the marker: a classic request renders it on today's condition, a journey request never does,
  // and nothing else renders it. No gate held this bar before WP7. (A block, so its names cannot meet the chrome's.)
  {
    const EMAIL_BAR = "{emailVerifyState && !journeyShown && <EmailVerifyBanner email={emailVerifyState.email} />}";
    const tallyIn = (s: string, needle: string) => s.split(needle).length - 1;
    const barElsewhere = [...W.files].filter(([p, s]) => p !== "src/components/layout/app-shell.tsx" && s.includes("<EmailVerifyBanner")).map(([p]) => p);
    ok("10.shell.emailbar · the email-verify bar renders for a classic request on today's condition and never for a journey request (S6 WP7)",
      tallyIn(shell, EMAIL_BAR) === 1 && tallyIn(shell, "<EmailVerifyBanner") === 1
        && shell.includes("const journeyShown = (await journeyRead).journey;") && barElsewhere.length === 0,
      j({ gated: tallyIn(shell, EMAIL_BAR), mounts: tallyIn(shell, "<EmailVerifyBanner"), elsewhere: barElsewhere }));
  }
  const readers: string[] = []; const writers: string[] = []; const deciders: string[] = []; const passReaders: string[] = [];
  for (const [path, src] of W.files) {
    if (/\.get\(\s*JOURNEY_PREVIEW_COOKIE\s*\)|\.get\(\s*["']kp_preview["']\s*\)/.test(src)) readers.push(path);
    if (/\.set\(\s*JOURNEY_PREVIEW_COOKIE\b|\.set\(\s*["']kp_preview["']/.test(src)) writers.push(path);
    if (/\bsimpleJourneyFor\(/.test(src) && !/export function simpleJourneyFor\(/.test(src)) deciders.push(path);
    if (/\b(readPreviewPass|resolvePreviewPass)\(/.test(src)) passReaders.push(path);
  }
  const allowedReaders = new Set(["src/lib/server/journey-preview.ts", "src/app/preview/route.ts", "src/app/admin/journey/page.tsx"]);
  ok("10.census.read · the pass cookie is read only by the one resolver, the /preview door and the admin page's own status line",
    readers.length > 0 && readers.every((p) => allowedReaders.has(p) || p.startsWith("src/app/admin/journey/")), j(readers));
  ok("10.census.write · the pass cookie is written in ONE place, /preview", writers.length === 1 && writers[0] === "src/app/preview/route.ts", j(writers));
  ok("10.census.decide · only the resolver calls simpleJourneyFor — a page that decided for itself could disagree with the shell",
    deciders.length === 1 && deciders[0] === "src/lib/server/journey-preview.ts", j(deciders));
  const grants = ["src/proxy.ts", "src/lib/server/rbac-guard.ts", "src/lib/server/admin-guard.ts", "src/lib/server/roles.ts", "src/lib/server/session.ts", "src/app/admin/layout.tsx"];
  const leaking = grants.filter((p) => { const s = W.files.get(p) ?? ""; return /kp_preview|JOURNEY_PREVIEW_COOKIE|journey-preview/.test(s); });
  ok("10.no.grant · nothing that grants access (proxy, RBAC, 2FA, session, the admin layout) reads the pass — it opens a view, never access", leaking.length === 0, j(leaking));
  ok("10.pass.readers · pass reading stays inside the preview modules and the admin status line",
    passReaders.every((p) => p.startsWith("src/lib/server/journey-preview") || p.startsWith("src/app/admin/journey/")), j(passReaders));
  const route = decomment(W.route);
  ok("10.route.nostore · every /preview answer is `private, no-store`", /res\.headers\.set\("Cache-Control", "private, no-store/.test(route));
  const setBlock = /if \(door\.set\) \{([\s\S]*?)\n  \}/.exec(route)?.[1] ?? "";
  ok("10.route.cookie · the pass is SET HttpOnly, SameSite=Lax, Secure in production, path / (the set call itself, not the clear)",
    /res\.cookies\.set\(JOURNEY_PREVIEW_COOKIE, door\.set\.token, \{\s*httpOnly: true,\s*sameSite: "lax",\s*secure: process\.env\.NODE_ENV === "production",\s*path: "\/"/.test(setBlock), setBlock.slice(0, 200));
  ok("10.route.303 · every /preview answer is a 303 to the public host (a document navigation)", /NextResponse\.redirect\(`\$\{await publicBase\(req\)\}\$\{to\}`, 303\)/.test(route));
  ok("10.route.get · GET sets a pass only through the signed-link door", /export async function GET[\s\S]*previewLinkDoor/.test(route) && !/export async function GET[\s\S]*?previewOnDoor[\s\S]*?export async function POST/.test(route));
  ok("10.health · /api/health reports simpleJourney { ceiling, state }", /simpleJourney: \{\s*ceiling: simpleJourneyCeiling\(\)\.ceiling,\s*state: journeyState,/.test(decomment(W.health)));
  // ⭐ THE AKAUNTI HUB (S6 WP5) asks the same one resolver FIRST and calls notFound() before it reads anything, so a
  // request the shell treats as classic can never be served the hub by a page that decided for itself.
  const hub = W.files.get("src/app/account/page.tsx") ?? "";
  const hubBody = hub.slice(Math.max(0, hub.indexOf("export default async function")));
  const asked = hubBody.indexOf("await resolveSimpleJourney()");
  const gated = hubBody.indexOf("if (!journey) notFound();");
  const firstRead = Math.min(Infinity, ...["currentSession(", "getServerT(", "loadHubViewer(", "db."].map((s) => hubBody.indexOf(s)).filter((i) => i >= 0));
  ok("10.page.account · /account asks the one resolver and calls notFound() before it reads a session, a word or a row",
    hub.length > 0 && asked > 0 && gated > asked && Number.isFinite(firstRead) && firstRead > gated, j({ asked, gated, firstRead }));
  // ⭐ THE SHELL SWAP (S6 WP6b). The journey's header and tabs render only in the `journeyShown` arm of a ternary whose
  // else arm is today's classic element with today's props, written out here so a change to either arm is a decision:
  // a request the resolver does not show the journey to is served what it was served before. Each journey arm is a LAZY
  // binding in its own Suspense, since WP6c a `next/dynamic` part of the shell's one client module, `shell-lazy.tsx`
  // (AppShell's own `React.lazy` split nothing: VODACOM-PLAN §0h point 20), so the journey chrome's code stays out of
  // the first-load bundle every classic visitor downloads. The header's fallback is the bar's own empty box (its
  // height, panel and border), so a journey page does not jump while that code arrives; the tabs need none, because
  // the rail takes no room in the page. And nothing else renders or loads the journey chrome, or loads it into a
  // classic layout component.
  const SWAP_HEADER = '{journeyShown ? <Suspense fallback={<div aria-hidden="true" className="kp-jhdr" />}><LazyJourneyTopBar user={topUser} onBreak={promoSuppressed} proposalsState={proposalsState} inviteVisible={inviteVisible} invitePaid={invitePaid} /></Suspense> : <TopAppBar user={topUser} proposalsState={proposalsState} inviteVisible={inviteVisible} invitePaid={invitePaid} />}';
  const SWAP_RAIL = "{journeyShown ? <Suspense fallback={null}><LazyJourneyTabs userId={session?.userId ?? null} /></Suspense> : <BottomNav isAuthed={!!session} proposalsState={proposalsState} inviteVisible={inviteVisible} walletHeld={!!topUser.walletHeld} />}";
  const SHELL_LAZY = "src/components/layout/shell-lazy.tsx";
  /** The two journey arms' lines in the shell's one lazy module (S6 WP6c): `next/dynamic`, server render on, no option object, the lost-chunk guard last. */
  const DYNAMIC_LINES = [
    'export const LazyJourneyTopBar = dynamic(() => import("@/components/journey/journey-top-bar").then((m) => m.JourneyTopBar).catch(nothingIfLost));',
    'export const LazyJourneyTabs = dynamic(() => import("@/components/journey/journey-tabs").then((m) => m.JourneyTabs).catch(nothingIfLost));',
  ];
  const lazySrc = W.files.get(SHELL_LAZY) ?? "";
  const tally = (needle: string) => shell.split(needle).length - 1;
  const tallyLazy = (needle: string) => lazySrc.split(needle).length - 1;
  ok("10.shell.chrome.header · the journey header renders only in the journeyShown arm, lazily, over the bar's own empty box, and the else arm is today's TopAppBar with today's props",
    tally(SWAP_HEADER) === 1 && tally("<LazyJourneyTopBar") === 1 && tally("<TopAppBar") === 1,
    j({ swap: tally(SWAP_HEADER), journey: tally("<LazyJourneyTopBar"), classic: tally("<TopAppBar") }));
  ok("10.shell.chrome.tabs · the journey tabs render only in the journeyShown arm, lazily, and the else arm is today's BottomNav with today's props",
    tally(SWAP_RAIL) === 1 && tally("<LazyJourneyTabs") === 1 && tally("<BottomNav") === 1,
    j({ swap: tally(SWAP_RAIL), journey: tally("<LazyJourneyTabs"), classic: tally("<BottomNav") }));
  const staticJourney = tally('from "@/components/journey/');
  const fromModule = shell.split(";").filter((stmt) => stmt.includes('from "./shell-lazy"')).join(" ");
  const armsImported = ["LazyJourneyTopBar", "LazyJourneyTabs"].filter((b) => fromModule.includes(b)).length;
  const lazyCall = new RegExp("(?<![A-Za-z0-9_$])(?:React[.])?lazy[ ]*[(]").test(shell);
  ok("10.shell.chrome.lazy · AppShell renders the journey header and tabs through the shell's one lazy module, which declares each with next/dynamic (S6 WP6c); AppShell declares no React lazy binding and imports nothing from the journey's components statically",
    DYNAMIC_LINES.every((line) => tallyLazy(line) === 1) && armsImported === 2 && !lazyCall && staticJourney === 0,
    j({ dynamic: DYNAMIC_LINES.map(tallyLazy), armsImported, lazyCall, staticImports: staticJourney }));
  const SHELL_FILE = "src/components/layout/app-shell.tsx";
  const CHROME_MODULES = ["@/components/journey/journey-top-bar", "@/components/journey/journey-tabs"];
  const elsewhere = [...W.files]
    .filter(([p, s]) => p !== SHELL_FILE && p !== SHELL_LAZY && (s.includes("<JourneyTopBar") || s.includes("<JourneyTabs") || CHROME_MODULES.some((m) => s.includes(m))))
    .map(([p]) => p);
  const classicLoads = [...W.files].filter(([p, s]) => p.startsWith("src/components/layout/") && p !== SHELL_FILE && p !== SHELL_LAZY && s.includes("@/components/journey/")).map(([p]) => p);
  /** The shell's lazy module may name a journey module only inside a `next/dynamic` import, and renders none itself. */
  const lazyStrays = tallyLazy('"@/components/journey/') - tallyLazy('dynamic(() => import("@/components/journey/') + tallyLazy("<JourneyTopBar") + tallyLazy("<JourneyTabs");
  ok("10.shell.chrome.only · nothing but AppShell renders or loads the journey chrome (the shell's lazy module names it only in its next/dynamic imports, S6 WP6c), and no other classic layout component loads a journey module",
    elsewhere.length === 0 && classicLoads.length === 0 && lazyStrays === 0, j({ elsewhere, classicLoads, lazyStrays }));
}

async function g11Health() {
  setMem(null);
  const { GET } = await import("../src/app/api/health/route.ts");
  const res = await GET();
  const body = await res.json() as { simpleJourney?: { ceiling?: string; state?: string } };
  ok("11.health · GET /api/health: simpleJourney = { ceiling STAFF_PREVIEW, state STAFF_PREVIEW } with no record",
    body.simpleJourney?.ceiling === "STAFF_PREVIEW" && body.simpleJourney?.state === "STAFF_PREVIEW", j(body.simpleJourney));
  setMem(SW.sealJourneySwitch(record("WITHDRAWN")));
  await new Promise((r) => setTimeout(r, 5));
  const killed = await (await GET()).json() as { simpleJourney?: { state?: string } };
  ok("11.health.kill · after a stored kill the probe says WITHDRAWN", killed.simpleJourney?.state === "WITHDRAWN", j(killed.simpleJourney));
  setMem(null);
}

// ── §12 · DATABASE MODE (child process) ────────────────────────────────────────────────────────────────────
async function g12Database() {
  const KEY = SW.JOURNEY_SWITCH_KEY;
  SW.__setJourneySwitchStoreForTests(null);
  TABLE.clear();
  const a = await SW.journeySwitchNow(0);
  ok("12.db.absent · database mode, no row: the ceiling decides (STAFF_PREVIEW)", a.state === "STAFF_PREVIEW" && a.stored.kind === "ABSENT", j(a));
  TABLE.set(KEY, SW.sealJourneySwitch(record("WITHDRAWN")));
  const cached = await SW.journeySwitchNow();
  const fresh = await SW.journeySwitchNow(0);
  ok("12.db.other.container · a kill written by another container is read within the cache window (forced read: WITHDRAWN)",
    fresh.state === "WITHDRAWN" && (cached.state === "STAFF_PREVIEW" || cached.state === "WITHDRAWN"), j({ cached: cached.state, fresh: fresh.state }));
  TABLE.delete(KEY);
  FAIL_READ.add(KEY);
  const failed = await SW.journeySwitchNow(0);
  FAIL_READ.delete(KEY);
  ok("12.db.read.fails · a read that fails is WITHDRAWN — a surprise never shows the new journey", failed.state === "WITHDRAWN" && failed.stored.kind === "UNREAD", j(failed));
  await mkUser("sjf_db_owner", "ADMIN");
  SW.__setJourneySwitchStoreForTests(null);
  AUDIT_FAIL.add("journey.rollout.attempt");
  const refused = await CE.runJourneyCeremony("sjf_db_owner", { op: "CAP", to: "WITHDRAWN", reason: "stop it now", expectSeq: 0 }, { totp: "ok" });
  AUDIT_FAIL.delete("journey.rollout.attempt");
  ok("12.db.attempt.unrecorded · when the database refuses the attempt row, nothing is written and the Owner is told",
    !refused.ok && /compliance record could not be written first/i.test(refused.error) && !TABLE.has(KEY), j(refused));
  DROP_SAVE.add(KEY);
  const dropped = await CE.runJourneyCeremony("sjf_db_owner", { op: "CAP", to: "WITHDRAWN", reason: "stop it now", expectSeq: 0 }, { totp: "ok" });
  DROP_SAVE.delete(KEY);
  ok("12.db.not.stored · a write that does not land is read back and reported — never 'done'", !dropped.ok && /did not reach the database/i.test(dropped.error), j(dropped));
  const done = await CE.runJourneyCeremony("sjf_db_owner", { op: "CAP", to: "WITHDRAWN", reason: "stop it now", expectSeq: 0 }, { totp: "ok" });
  const row = SW.parseStoredJourneySwitch(TABLE.get(KEY));
  ok("12.db.kill · the Owner's Stop lands in the table as a sealed record that parses WITHDRAWN", done.ok && done.state === "WITHDRAWN" && row.kind === "SET" && row.cap === "WITHDRAWN", j({ done, row: row.kind }));
  AUDIT_FAIL.add("journey.rollout.set");
  const resume = await CE.runJourneyCeremony("sjf_db_owner", { op: "CAP", to: "ACTIVE", reason: "resume the preview", expectSeq: 1 }, { totp: "ok" });
  AUDIT_FAIL.delete("journey.rollout.set");
  ok("12.db.outcome.unrecorded · an act that LANDED but whose outcome row failed is reported as landed, with a warning",
    resume.ok && resume.changed && resume.state === "STAFF_PREVIEW" && resume.recorded === false && resume.warn === true, j(resume));
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
async function runAll(I: Impl, W: World, tag: string) {
  await g1Ceiling(I);
  await g2Table(I);
  await g3ThreeStates(I);
  await g4Parse(I);
  await g5Seal(I);
  await g6Entitlement(I, tag);
  await g7Viewers(I, tag);
  await g8Ceremony(tag);
  await g9Doors(I, tag);
  g10Wiring(W);
  await g11Health();
}

if (DB_MODE) {
  console.log("\n§12 · database mode (fake client)");
  await g12Database();
  const fails = results.filter((r) => !r.ok);
  if (results.length === 0) { console.log("⛔ 0 checks — a zero-assertion run is a SKIPPED run."); process.exit(1); }
  process.exit(fails.length ? 1 : 0);
}

if (!PROVE_RED) {
  await runAll(REAL, WORLD, "sjf");
  console.log("\n§12 · database mode — its own process");
  const tsxCli = createRequire(import.meta.url).resolve("tsx/cli");
  const base = { ...process.env };
  delete base.DATABASE_URL; delete base.USE_PRISMA_DAL; delete base.REDIS_URL; delete base.REDIS_ENABLED;
  const child = spawnSync(process.execPath, [tsxCli, THIS], { env: { ...base, SJF_MODE: "db", DATABASE_URL: FAKE_DATABASE_URL }, encoding: "utf8", timeout: 180_000 });
  const out = `${child.stdout ?? ""}${child.stderr ?? ""}`;
  for (const line of out.split(/\r?\n/)) if (/^(PASS|FAIL) /.test(line)) { const pass = line.startsWith("PASS"); results.push({ label: line.slice(5), ok: pass, detail: "" }); console.log(line); }
  ok("12.db.ran · the database-mode process ran its checks and exited clean", child.status === 0 && /PASS 12\./.test(out), `exit ${child.status}${child.status !== 0 ? ` — ${out.slice(-600)}` : ""}`);
  const fails = results.filter((r) => !r.ok);
  const passes = results.length - fails.length;
  console.log(`\n${passes} passed, ${fails.length} failed`);
  if (passes === 0) { console.log("⛔ 0 passed — a zero-assertion run is a SKIPPED run, never a green one."); process.exit(1); }
  process.exit(fails.length ? 1 : 0);
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
// THE RED TWIN — every plant must be caught by the check named for it
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════
type Plant = { name: string; expect: RegExp; impl?: Partial<Impl>; world?: (w: World) => World };
const files = (w: World, path: string, edit: (s: string) => string): World => { const m = new Map(w.files); m.set(path, edit(m.get(path) ?? "")); return { ...w, files: m }; };
const PLANTS: Plant[] = [
  { name: "the ceiling folds case (a lower-case 'active' launches the journey)", expect: /^1\.env\.typo/,
    impl: { ceiling: () => { const raw = (process.env.FEATURE_SIMPLEJOURNEY ?? "").trim().toUpperCase().replace("-", "_"); return FS.isRolloutState(raw) ? { ceiling: raw, source: "ENV" } : { ceiling: "STAFF_PREVIEW", source: "CODE" }; } } },
  { name: "the env ceiling overrules the Owner's stored kill", expect: /^2\.kill\.beats\.env/,
    impl: { compose: (c, s) => (s.kind === "SET" && c === "ACTIVE" ? "ACTIVE" : SW.composeSimpleJourney(c, s)) } },
  { name: "a failed read keeps the ceiling (fails OPEN)", expect: /^2\.unread\.closed/,
    impl: { compose: (c, s) => (s.kind === "UNREAD" ? c : SW.composeSimpleJourney(c, s)) } },
  { name: "no record means WITHDRAWN (a kill switch that starts killed)", expect: /^2\.absent\.open/,
    impl: { compose: (c, s) => (s.kind === "ABSENT" ? "WITHDRAWN" : SW.composeSimpleJourney(c, s)) } },
  { name: "a valid pass is honoured under WITHDRAWN", expect: /^3\.withdrawn/,
    impl: { decide: (s, p) => (p?.valid === true && s !== "ACTIVE" ? { journey: true, preview: true } : FS.simpleJourneyFor(s, p)) } },
  { name: "the marker shows under ACTIVE", expect: /^3\.active/,
    impl: { decide: (s, p) => (s === "ACTIVE" ? { journey: true, preview: p?.valid === true } : FS.simpleJourneyFor(s, p)) } },
  { name: "STAFF_PREVIEW shows the journey to everyone (a state that changes nothing)", expect: /^3\.(preview|distinct)/,
    impl: { decide: (s, p) => (s === "STAFF_PREVIEW" ? { journey: true, preview: p?.valid === true } : FS.simpleJourneyFor(s, p)) } },
  { name: "the parser folds a lower-case cap", expect: /^4\.malformed\.cap/,
    impl: { parse: (raw) => { const r = SW.parseStoredJourneySwitch(raw); if (r.kind === "MALFORMED" && r.why === "bad cap") return { kind: "SET", ...record("ACTIVE") }; return r; } } },
  { name: "the parser lets a link carry an extra field", expect: /^4\.malformed\.link\.extra/,
    impl: { parse: (raw) => { const r = SW.parseStoredJourneySwitch(raw); return r.kind === "MALFORMED" && r.why === "bad link" ? { kind: "SET", ...record("STAFF_PREVIEW") } : r; } } },
  { name: "a pass's life is not bounded on read (only when minted)", expect: /^5\.ttl/,
    impl: { readPass: (t, now) => { const n = now ?? Date.now(); const r = PV.readPreviewPass(t, n); if (r) return r; try { const p = JSON.parse(Buffer.from(String(t).split(".")[0], "base64url").toString()); if (p.exp > n && p.p === "journey.preview.pass" && String(t) === craft(p)) return { kind: p.k, issuer: p.iss, iat: p.iat, exp: p.exp, nonce: p.n }; } catch { /* no */ } return null; } } },
  { name: "a SESSION_SECRET token is accepted as a pass", expect: /^5\.foreign/,
    impl: { readPass: (t, now) => { const r = PV.readPreviewPass(t, now); if (r) return r; const n = now ?? Date.now(); try { const [b64] = String(t).split("."); const p = JSON.parse(Buffer.from(b64, "base64url").toString()); if (signSession(p) === t && p.exp > n) return { kind: p.k, issuer: p.iss, iat: p.iat, exp: p.exp, nonce: p.n }; } catch { /* no */ } return null; } } },
  { name: "the issuer is not re-read (a demoted staff member's pass keeps working)", expect: /^6\.demoted/,
    impl: { resolvePass: async (t, s, st, d) => { const c = PV.readPreviewPass(t, d?.now); if (c && c.kind === "staff" && s === "STAFF_PREVIEW") return { ...c, valid: true as const }; return PV.resolvePreviewPass(t, s, st, d); } } },
  { name: "a revoked link's pass keeps working", expect: /^6\.link\.revoked/,
    impl: { resolvePass: async (t, s, st, d) => { const c = PV.readPreviewPass(t, d?.now); if (c && c.kind === "link" && s === "STAFF_PREVIEW" && st.kind === "SET" && st.links.some((l) => l.id === c.issuer)) return { ...c, valid: true as const }; return PV.resolvePreviewPass(t, s, st, d); } } },
  { name: "SUPPORT is left out of the staff roles (ADMIN_CONSOLE_ROLES used instead of isStaffRole)", expect: /^6\.staff\.all/,
    impl: { resolvePass: async (t, s, st, d) => { const c = PV.readPreviewPass(t, d?.now); if (c?.kind === "staff") { const u = await db.user.findById(c.issuer); if (!u || !["ADMIN", "COMPLIANCE", "MODERATOR"].includes(u.role)) return null; } return PV.resolvePreviewPass(t, s, st, d); } } },
  { name: "the pass is honoured on /admin", expect: /^7\.viewers\./,
    impl: { resolveFor: async (input, deps) => PV.resolveJourneyFor({ ...input, path: "/" }, deps) } },
  { name: "the Owner's cross-site check is skipped", expect: /^9\.on\.cross-site/,
    impl: { doorOn: (input) => DR.previewOnDoor({ ...input, secFetchSite: "same-origin" }) } },
  { name: "a revoked link still opens", expect: /^9\.link\.revoked/,
    impl: { doorLink: async (input) => { const r = await DR.previewLinkDoor(input); if (r.set) return r; const c = PV.readPreviewLinkToken(input.token); if (!c) return r; const m = PV.mintPreviewPass("link", c.linkId, c.exp); return m ? { to: "/", set: { token: m.token, maxAgeSec: 60 } } : r; } } },
  { name: "AppShell asks the resolver before the /admin return", expect: /^10\.shell\.order/,
    world: (w) => ({ ...w, shell: w.shell.replace("  const h = await headers();", "  const early = resolveSimpleJourney();\n  const h = await headers();") }) },
  { name: "the marker renders for everyone", expect: /^10\.shell\.marker/,
    world: (w) => ({ ...w, shell: w.shell.replace("{journeyPreview && <PreviewMarker ", "{<PreviewMarker ") }) },
  { name: "the email bar is dropped for classic viewers (S6 WP7)", expect: new RegExp("^10[.]shell[.]emailbar"),
    world: (w) => ({ ...w, shell: w.shell.replace("{emailVerifyState && !journeyShown && <EmailVerifyBanner", "{emailVerifyState && journeyShown && <EmailVerifyBanner") }) },
  { name: "the email bar is shown to journey viewers (S6 WP7)", expect: new RegExp("^10[.]shell[.]emailbar"),
    world: (w) => ({ ...w, shell: w.shell.replace("{emailVerifyState && !journeyShown && <EmailVerifyBanner", "{emailVerifyState && <EmailVerifyBanner") }) },
  { name: "a page reads the pass cookie itself", expect: /^10\.census\.read/,
    world: (w) => files(w, "src/app/page.tsx", (s) => `${s}\nconst x = (await cookies()).get(JOURNEY_PREVIEW_COOKIE);`) },
  { name: "a second place writes the pass cookie", expect: /^10\.census\.write/,
    world: (w) => files(w, "src/app/auth/logout/route.ts", (s) => `${s}\nres.cookies.set(JOURNEY_PREVIEW_COOKIE, "", { maxAge: 0 });`) },
  { name: "a page decides the journey for itself", expect: /^10\.census\.decide/,
    world: (w) => files(w, "src/app/markets/page.tsx", (s) => `${s}\nconst d = simpleJourneyFor(state, null);`) },
  { name: "the proxy reads the pass", expect: /^10\.no\.grant/,
    world: (w) => files(w, "src/proxy.ts", (s) => `${s}\nconst p = req.cookies.get("kp_preview");`) },
  { name: "the /preview answer drops no-store", expect: /^10\.route\.nostore/,
    world: (w) => ({ ...w, route: w.route.replace('res.headers.set("Cache-Control", "private, no-store, max-age=0");', "") }) },
  { name: "the pass cookie loses HttpOnly", expect: /^10\.route\.cookie/,
    world: (w) => ({ ...w, route: w.route.replace("httpOnly: true,\n      sameSite", "httpOnly: false,\n      sameSite") }) },
  { name: "the health block is dropped", expect: /^10\.health/,
    world: (w) => ({ ...w, health: w.health.replace("simpleJourney: {", "journeyGone: {") }) },
  { name: "the Akaunti hub renders without the journey (no notFound before its reads)", expect: new RegExp("^10[.]page[.]account"),
    world: (w) => files(w, "src/app/account/page.tsx", (s) => s.replace("if (!journey) notFound();", "")) },
  { name: "the journey tabs render for everyone (S6 WP6b)", expect: new RegExp("^10[.]shell[.]chrome[.]tabs"),
    world: (w) => ({ ...w, shell: w.shell.replace("{journeyShown ? <Suspense fallback={null}><LazyJourneyTabs", "{true ? <Suspense fallback={null}><LazyJourneyTabs") }) },
  { name: "the classic rail is dropped (S6 WP6b)", expect: new RegExp("^10[.]shell[.]chrome[.]tabs"),
    world: (w) => ({ ...w, shell: w.shell.replace(" : <BottomNav isAuthed={!!session} proposalsState={proposalsState} inviteVisible={inviteVisible} walletHeld={!!topUser.walletHeld} />}", " : null}") }) },
  { name: "the journey header renders beside the classic one (S6 WP6b)", expect: new RegExp("^10[.]shell[.]chrome[.]header"),
    world: (w) => ({ ...w, shell: w.shell.replace("<HeaderScrollCast />", "<HeaderScrollCast /><LazyJourneyTopBar user={topUser} onBreak={false} proposalsState={proposalsState} />") }) },
  { name: "the journey header's fallback leaves no box, so a journey page jumps while its code arrives (S6 WP6b)", expect: new RegExp("^10[.]shell[.]chrome[.]header"),
    world: (w) => ({ ...w, shell: w.shell.replace('<Suspense fallback={<div aria-hidden="true" className="kp-jhdr" />}><LazyJourneyTopBar', "<Suspense fallback={null}><LazyJourneyTopBar") }) },
  { name: "AppShell imports the journey header statically, so every visitor downloads it (S6 WP6b)", expect: new RegExp("^10[.]shell[.]chrome[.]lazy"),
    world: (w) => ({ ...w, shell: w.shell.replace('import { BottomNav } from "./bottom-nav";', 'import { BottomNav } from "./bottom-nav"; import { JourneyTopBar } from "@/components/journey/journey-top-bar";') }) },
  { name: "a classic component imports a journey module (S6 WP6b)", expect: new RegExp("^10[.]shell[.]chrome[.]only"),
    world: (w) => files(w, "src/components/layout/top-app-bar.tsx", (s) => `${s} import { JourneyTabs } from "@/components/journey/journey-tabs";`) },
  { name: "the journey header's part turns its server render off (S6 WP6c)", expect: new RegExp("^10[.]shell[.]chrome[.]lazy"),
    world: (w) => files(w, "src/components/layout/shell-lazy.tsx", (s) => s.replace(".then((m) => m.JourneyTopBar).catch(nothingIfLost));", ".then((m) => m.JourneyTopBar).catch(nothingIfLost), { ssr: false });")) },
  { name: "AppShell declares the journey tabs with React lazy again (S6 WP6c)", expect: new RegExp("^10[.]shell[.]chrome[.]lazy"),
    world: (w) => ({ ...w, shell: w.shell.replace('import { BottomNav } from "./bottom-nav";', 'import { BottomNav } from "./bottom-nav"; const LazyRail = lazy(() => import("@/components/journey/journey-tabs").then((m) => ({ default: m.JourneyTabs })));') }) },
  { name: "the shell's lazy module imports the journey header statically (S6 WP6c)", expect: new RegExp("^10[.]shell[.]chrome[.]only"),
    world: (w) => files(w, "src/components/layout/shell-lazy.tsx", (s) => `${s} import { JourneyTopBar } from "@/components/journey/journey-top-bar";`) },
];

{
  quiet = true;
  results = [];
  await runAll(REAL, WORLD, "sjr0");
  const cleanFails = results.filter((r) => !r.ok);
  if (cleanFails.length) {
    console.log(`INCONCLUSIVE: the clean run already fails (${cleanFails[0].label} — ${cleanFails[0].detail})`);
    process.exit(1);
  }
  let caught = 0;
  let n = 0;
  for (const plant of PLANTS) {
    n++;
    results = [];
    const impl: Impl = { ...REAL, ...(plant.impl ?? {}) };
    const world = plant.world ? plant.world(WORLD) : WORLD;
    const planted = !!plant.impl || (plant.world ? j([world.shell, world.route, world.health, [...world.files.values()].join("")]) !== j([WORLD.shell, WORLD.route, WORLD.health, [...WORLD.files.values()].join("")]) : false);
    await runAll(impl, world, `sjr${n}`);
    const fired = results.some((r) => !r.ok && plant.expect.test(r.label));
    if (planted && fired) caught++;
    console.log(`${(!planted ? "INCONCLUSIVE (plant did not apply)" : fired ? "PROVED" : "BLIND").padEnd(36)} ${plant.name}`);
  }
  console.log(`\n${caught}/${PLANTS.length} caught`);
  process.exit(caught === PLANTS.length ? 0 : 1);
}
