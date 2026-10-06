/**
 * test:journey-account — THE AKAUNTI HUB, HELD BEFORE ANY PHONE IS SENT TO IT (the Vodacom plan S6, SJ-17;
 * `docs/design-system/v5-2026-09-29-simplified-journey/S6-PLAN.md` WP5, amendments A2, A3, A9, A14 and A17).
 *
 *   npm run test:journey-account     (in predeploy)
 *   npm run red:journey-account      (--prove-red: every defect below is planted IN MEMORY and must be caught)
 *
 *   §1 THE GATE — `/account` asks the one resolver and calls notFound() before it reads a session, a word or a row, so a
 *      classic visitor gets today's not-found page and nothing else; it has no loading file of its own (A3); and its
 *      doors come only through `loadHubViewer` → `viewerDoorsFor` — the page reads no store and re-spells no rule.
 *   §2 THE TITLE — `generateMetadata` asks the resolver first and, for a request the journey is not shown to, answers the
 *      not-found page's own metadata with noindex (A2); a journey word is read only after that.
 *   §3 THE ROWS — `hubRowsFor` for every kind of reader: guest, player, held wallet, agent in standing, SUPPORT, ADMIN,
 *      invite closed, proposals DISABLED, "Verify ID" not offered. The play-safe card sits above invite (A17); Pumzika
 *      and Jizuie are two rows landing on #break and #exclude, and both sections exist on the page they land on; every
 *      door names a route on disk.
 *   §4 THE WORDS — every word in the rows data, and every word the page and its islands read by path, resolves in en,
 *      sw and zh; Msaada's second line names no number (§0h point 10); the hub carries no helpline row (the owner's
 *      ruling of 2026-10-06), and no phone number is typed into the hub.
 *   §5 THE CONSOLE — no console href in the rows data, and the page's one plain console link is drawn only behind the
 *      staff door (E-70; `test:shell-boundary` §2b holds its tag).
 *   §6 THE READER, IN MEMORY — `loadHubViewer` over the in-memory store for each reader: a guest is read nothing, every
 *      failed read closes a door and never opens one, and the doors are exactly `viewerDoorsFor`'s.
 *   §7 THE READER, ON THE PRISMA TWIN — the same reads in this file's own process over a fake client (the session law's
 *      two stores), failed reads included.
 *   §8 THE ISLANDS — the Arifa row reads once (A1), the language row takes the menu's own list, the sign-out row asks
 *      before it POSTs to /auth/logout, and `test:popup-fit` has reviewed it.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION. `--prove-red` hands §1–§6 and §8 defective implementations and edited source TEXT held
 * in memory, and requires the check named for each defect to fail. Nothing here touches a file on disk, so
 * `test:red-anchors` §4 counts it in the in-process class. §7 runs in the plain run only, as `test:simple-journey-flag`
 * §12 does.
 * ⚠️ This file carries no escape sequences (line breaks are built from their code points): a tool that rewrites an
 * escape on the way to disk cannot corrupt it.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const THIS = fileURLToPath(import.meta.url);
const REPO = join(THIS, "..", "..");
const PROVE_RED = process.argv.includes("--prove-red");
const DB_MODE = process.env.JAH_MODE === "db";
const FAKE_DATABASE_URL = "postgresql://journey-account:fake@127.0.0.1:1/never_a_real_database";
const LF = String.fromCharCode(10);
const CR = String.fromCharCode(13);

// ── 0 · THE GUARD — before a single repo module is loaded ─────────────────────────────────────────────────
if (process.env.NODE_ENV === "production") {
  console.log("FAIL 0.guard · ⛔ REFUSED — NODE_ENV=production.");
  process.exit(1);
}
if (DB_MODE) {
  if (process.env.DATABASE_URL !== FAKE_DATABASE_URL || process.env.USE_PRISMA_DAL === "false") {
    console.log("FAIL 0.guard · ⛔ REFUSED — database mode runs only on this suite's own fake URL, with the Prisma twin on.");
    process.exit(1);
  }
} else if (process.env.DATABASE_URL !== undefined) {
  console.log("FAIL 0.guard · ⛔ REFUSED — DATABASE_URL is set. This suite runs on the in-memory store (and a fake client for §7): unset it.");
  process.exit(1);
}
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";
// The invite's product state is read from the environment at call time: every reader here is judged on the shipped
// constant.
delete process.env.FEATURE_INVITE;

// ── The fake client for §7 (database mode only) — the four tables the hub reads, keyed as the Prisma twin asks ──
type Row = Record<string, unknown>;
const TABLES = {
  user: new Map<string, Row>(),
  wallet: new Map<string, Row>(),
  kycSubmission: new Map<string, Row>(),
  affiliateAgent: new Map<string, Row>(),
};
type Table = keyof typeof TABLES;
/** "table:key" pairs whose read throws, as a dropped connection does. */
const FAIL_READ = new Set<string>();
if (DB_MODE) {
  const table = (name: Table) => new Proxy({}, {
    get: (_t, method) => {
      if (typeof method !== "string") return undefined;
      return async (args?: { where?: { id?: string; userId?: string } }) => {
        const key = args?.where?.id ?? args?.where?.userId ?? "";
        if (method === "findUnique" || method === "findFirst") {
          if (FAIL_READ.has(`${name}:${key}`)) throw new Error(`fake ${name}: the read of ${key} failed (simulated)`);
          const row = TABLES[name].get(key);
          return row ? { ...row } : null;
        }
        if (method === "findMany" || method === "groupBy") return [];
        if (method === "count") return 0;
        return null;
      };
    },
  });
  const benign = () => new Proxy({}, {
    get: (_t, method) => {
      if (typeof method !== "string") return undefined;
      return async () => {
        switch (method) {
          case "findMany": case "groupBy": return [];
          case "count": return 0;
          case "createMany": case "updateMany": case "deleteMany": return { count: 0 };
          default: return null;
        }
      };
    },
  });
  const fake: Record<string, unknown> = new Proxy({} as Record<string, unknown>, {
    get: (_t, prop) => {
      if (typeof prop !== "string" || prop === "then") return undefined;
      if (prop in TABLES) return table(prop as Table);
      if (prop === "$transaction") return async (arg: unknown) => (typeof arg === "function" ? (arg as (tx: unknown) => unknown)(fake) : Promise.all(arg as unknown[]));
      if (prop === "$queryRaw" || prop === "$queryRawUnsafe") return async () => [];
      if (prop.startsWith("$")) return async () => undefined;
      return benign();
    },
  });
  (globalThis as { __50PICK_PRISMA?: unknown }).__50PICK_PRISMA = fake;
}

// ── THE MODULES ───────────────────────────────────────────────────────────────────────────────────────────
const ROWS = await import("../src/components/journey/account/hub-rows.ts");
const HV = await import("../src/lib/server/hub-viewer.ts");
const DOORS = await import("../src/lib/journey/viewer-doors.ts");
const { db } = await import("../src/lib/server/store.ts");
const { inviteViewerFor } = await import("../src/lib/server/affiliate-service.ts");
const { displayLabel } = await import("../src/lib/display-label.ts");
const { maskPhone } = await import("../src/lib/phone-normalize.ts");
const { dict } = await import("../src/lib/i18n-dict.ts");
const { decomment } = await import("./lib/decomment.mts");

type HubViewer = import("../src/components/journey/account/hub-rows.ts").HubViewer;
type HubMember = import("../src/components/journey/account/hub-rows.ts").HubMember;
type HubGroup = import("../src/components/journey/account/hub-rows.ts").HubGroup;
type HubRow = import("../src/components/journey/account/hub-rows.ts").HubRow;
type Deps = import("../src/lib/server/hub-viewer.ts").HubViewerDeps;
type ProposalsState = import("../src/lib/server/proposals-config.ts").ProposalsState;
type InviteViewer = import("../src/lib/feature-state.ts").InviteViewer;

type Ok = (label: string, cond: boolean, detail?: string) => void;
const show = (v: unknown) => JSON.stringify(v) ?? String(v);
const count = (s: string, needle: string) => s.split(needle).length - 1;
const STAFF = ["ADMIN", "COMPLIANCE", "MODERATOR", "FINANCE", "GROWTH", "AUDITOR", "SUPPORT"];

// ── THE READS — the shipped deps with the cached config reads held still ─────────────────────────────────
/** The config reads, fixed, so a row answers for the reader and not for whatever an officer saved last. */
const FIXED = { invitePayable: async () => false, agentEnabled: () => false, proposalsState: (): ProposalsState => "COMING_SOON" };
const base = (): Deps => ({ ...HV.HUB_VIEWER_DEPS, ...FIXED });
const boom = (what: string): never => {
  throw new Error(`${what}: the read failed (simulated)`);
};
/** The shipped reads with ONE of them failing. */
function broken(part: keyof Deps): Deps {
  const d = base();
  switch (part) {
    case "user": return { ...d, user: async () => boom(part) };
    case "wallet": return { ...d, wallet: async () => boom(part) };
    case "kyc": return { ...d, kyc: async () => boom(part) };
    case "inviteViewer": return { ...d, inviteViewer: async () => boom(part) };
    case "invitePayable": return { ...d, invitePayable: async () => boom(part) };
    case "agentEnabled": return { ...d, agentEnabled: () => boom(part) };
    case "proposalsState": return { ...d, proposalsState: () => boom(part) };
  }
}
/** The same reads, counted — so "a guest is read nothing" is a number, not a hope. */
function counted(d: Deps): { deps: Deps; calls: () => number } {
  let n = 0;
  const tick = () => { n++; };
  return {
    deps: {
      user: (id) => { tick(); return d.user(id); },
      wallet: (id) => { tick(); return d.wallet(id); },
      kyc: (id) => { tick(); return d.kyc(id); },
      inviteViewer: (id) => { tick(); return d.inviteViewer(id); },
      invitePayable: () => { tick(); return d.invitePayable(); },
      agentEnabled: () => { tick(); return d.agentEnabled(); },
      proposalsState: () => { tick(); return d.proposalsState(); },
    },
    calls: () => n,
  };
}

// ══ §7 · THE PRISMA TWIN — this file's own process, a fake client ═══════════════════════════════════════════
async function g7Twin(ok: Ok) {
  const at = new Date("2026-09-01T00:00:00.000Z");
  const user = (id: string, role: string, displayName: string | null = null) =>
    TABLES.user.set(id, { id, phoneE164: "+255712345678", role, status: "ACTIVE", displayName, locale: "SW", createdAt: at, updatedAt: at });
  const wallet = (userId: string, balance: number, status = "ACTIVE") =>
    TABLES.wallet.set(userId, { id: `wal_${userId}`, userId, balance, pending: 0, hold: 0, bonusBalance: 0, status, freezeReasons: [], createdAt: at, updatedAt: at });
  const kyc = (userId: string, status: string, rejectReason: string | null = null) =>
    TABLES.kycSubmission.set(userId, { id: `kyc_${userId}`, userId, status, rejectReason, rejectNote: null, fullName: null, dob: null, documents: [], reviewerId: null, reviewedAt: null, submittedAt: at, createdAt: at, updatedAt: at });
  const agentRow = (userId: string) =>
    TABLES.affiliateAgent.set(userId, { userId, code: "AGTZZZZZ1", totalRecruits: 0, totalCommission: 0, approvedAt: at, approvedBy: "officer", active: true, deactivatedAt: null, commissionPct: 20, createdAt: at, updatedAt: at });

  user("db_player", "PLAYER", "Jina Lako"); wallet("db_player", 2_000);
  user("db_held", "PLAYER"); wallet("db_held", 500, "FROZEN");
  user("db_agent", "AGENT"); wallet("db_agent", 0); agentRow("db_agent");
  user("db_support", "SUPPORT"); wallet("db_support", 0);
  user("db_kyc_ok", "PLAYER"); wallet("db_kyc_ok", 0); kyc("db_kyc_ok", "APPROVED");
  user("db_kyc_final", "PLAYER"); wallet("db_kyc_final", 0); kyc("db_kyc_final", "REJECTED", "UNDERAGE");
  user("db_kyc_retry", "PLAYER"); wallet("db_kyc_retry", 0); kyc("db_kyc_retry", "REJECTED", "BLURRY_IMAGE");
  user("db_fail_user", "ADMIN"); wallet("db_fail_user", 0); FAIL_READ.add("user:db_fail_user");
  user("db_fail_kyc", "PLAYER"); wallet("db_fail_kyc", 0); FAIL_READ.add("kycSubmission:db_fail_kyc");
  user("db_fail_wallet", "PLAYER"); wallet("db_fail_wallet", 0); FAIL_READ.add("wallet:db_fail_wallet");

  const d = base();
  const p = await HV.loadHubViewer("db_player", d);
  ok("7.player · on the twin: the name and its initials, the shared phone mask, the balance, nothing held, Verify ID offered (no KYC row), no console",
    p.signedIn && p.name === "Jina Lako" && p.initials === "JL" && p.phone === maskPhone("+255712345678") && p.balance === 2_000
      && !p.walletHeld && p.kycOffered && !p.doors.staffConsole, show(p));
  const h = await HV.loadHubViewer("db_held", d);
  ok("7.held · a frozen wallet row is held, its balance still read", h.signedIn && h.walletHeld && h.balance === 500, show(h));
  const a = await HV.loadHubViewer("db_agent", d);
  ok("7.agent · an approved, active agent: in standing, the agent door open with the programme closed, the invite theirs",
    a.signedIn && a.agentInStanding && a.doors.agentDoorVisible && a.doors.inviteVisible && !a.doors.staffConsole, show(a));
  const s = await HV.loadHubViewer("db_support", d);
  ok("7.console · SUPPORT gets the staff console (every staff role, SJ-23)", s.signedIn && s.doors.staffConsole, show(s));
  for (const [id, offered] of [["db_kyc_ok", false], ["db_kyc_final", false], ["db_kyc_retry", true]] as const) {
    const v = await HV.loadHubViewer(id, d);
    ok(`7.kyc.${id} · Verify ID ${offered ? "offered (a refusal that can be retried)" : "not offered (approved, or refused for good)"}`, v.signedIn && v.kycOffered === offered, show(v));
  }
  const fu = await HV.loadHubViewer("db_fail_user", d);
  ok("7.fail.user · the user row's read fails: the generic name, no phone, no console for an ADMIN row, no invite (its own read failed too)",
    fu.signedIn && fu.name === displayLabel({ id: "db_fail_user", displayName: null }) && fu.phone === maskPhone(null)
      && !fu.doors.staffConsole && !fu.doors.inviteVisible, show(fu));
  const fk = await HV.loadHubViewer("db_fail_kyc", d);
  ok("7.fail.kyc · the KYC read fails: Verify ID is not offered", fk.signedIn && !fk.kycOffered, show(fk));
  const fw = await HV.loadHubViewer("db_fail_wallet", d);
  ok("7.fail.wallet · the wallet read fails: no figure, not held", fw.signedIn && fw.balance === null && !fw.walletHeld, show(fw));
  const shipped = await HV.loadHubViewer("db_player");
  ok("7.defaults · the shipped reads answer on the twin — the invite switch, the agent programme and proposals through their own caches, none throws",
    shipped.signedIn && shipped.balance === 2_000 && !shipped.doors.invitePaid, show(shipped));
}

if (DB_MODE) {
  let checks = 0, fails = 0;
  await g7Twin((label, cond, detail = "") => {
    checks++;
    if (!cond) fails++;
    console.log(`${cond ? "PASS" : "FAIL"} ${label}${!cond && detail ? ` — ${detail}` : ""}`);
  });
  if (checks === 0) { console.log("⛔ 0 checks — a zero-assertion run is a SKIPPED run."); process.exit(1); }
  process.exit(fails ? 1 : 0);
}

// ══ THE SOURCE WORLD — read once; the red twin plants edits in memory ════════════════════════════════════════
const read = (rel: string) => (existsSync(join(REPO, rel)) ? readFileSync(join(REPO, rel), "utf8").split(CR + LF).join(LF) : "");
const code = (rel: string) => decomment(read(rel));

/** `test:route-census`'s population: every non-admin, non-api `page.tsx`, route groups stripped. */
function routesOnDisk(): string[] {
  const app = join(REPO, "src", "app");
  const out = new Set<string>();
  const walk = (dir: string) => {
    for (const e of readdirSync(dir)) {
      const p = join(dir, e);
      if (statSync(p).isDirectory()) { walk(p); continue; }
      if (e !== "page.tsx") continue;
      const segs = relative(app, dir).split(sep).filter((s) => s.length > 0 && !(s.startsWith("(") && s.endsWith(")")) && !s.startsWith("@"));
      if (segs[0] === "admin" || segs[0] === "api") continue;
      out.add(`/${segs.join("/")}`);
    }
  };
  walk(app);
  return [...out].sort();
}
/** Every loading file that would stream before /account's gate: the segment's own, under any route group. */
function accountLoaders(): string[] {
  const app = join(REPO, "src", "app");
  const dirs = [join(app, "account"), ...readdirSync(app).filter((n) => n.startsWith("(") && n.endsWith(")")).map((g) => join(app, g, "account"))];
  const out: string[] = [];
  for (const d of dirs) {
    if (!existsSync(d)) continue;
    for (const f of readdirSync(d)) if (f.startsWith("loading.")) out.push(relative(REPO, join(d, f)).split(sep).join("/"));
  }
  return out;
}

type World = {
  page: string; rows: string; hubRow: string; viewer: string; rgPage: string; notFound: string;
  unread: string; language: string; languageMenu: string; signOut: string; cardSize: string; popupFit: string;
  loaders: readonly string[]; routes: readonly string[]; dicts: Readonly<Record<string, unknown>>;
};
type TextKey = "page" | "rows" | "hubRow" | "viewer" | "rgPage" | "unread" | "language" | "signOut" | "cardSize" | "popupFit";
const WORLD: World = {
  page: code("src/app/account/page.tsx"),
  rows: code("src/components/journey/account/hub-rows.ts"),
  hubRow: code("src/components/journey/account/hub-row.tsx"),
  viewer: code("src/lib/server/hub-viewer.ts"),
  rgPage: code("src/app/profile/responsible-gambling/page.tsx"),
  notFound: code("src/app/not-found.tsx"),
  unread: code("src/components/journey/account/unread-row.tsx"),
  language: code("src/components/journey/account/language-row.tsx"),
  languageMenu: code("src/components/ui/language-menu.tsx"),
  signOut: code("src/components/journey/account/sign-out-row.tsx"),
  cardSize: code("src/components/journey/account/card-size-row.tsx"),
  popupFit: code("scripts/popup-fit.test.mts"),
  loaders: accountLoaders(),
  routes: routesOnDisk(),
  dicts: { en: dict.en, sw: dict.sw, zh: dict.zh },
};

const after = (s: string, head: string) => { const at = s.indexOf(head); return at < 0 ? "" : s.slice(at); };
const between = (s: string, head: string, end: string) => { const a = s.indexOf(head); if (a < 0) return ""; const b = s.indexOf(end, a + head.length); return b < 0 ? s.slice(a) : s.slice(a, b); };
/** The statements a function's body opens with, in order, whitespace between them ignored. */
function opensWith(fn: string, steps: readonly string[]): boolean {
  const brace = fn.indexOf("{");
  if (brace < 0) return false;
  let rest = fn.slice(brace + 1);
  for (const s of steps) {
    rest = rest.trimStart();
    if (!rest.startsWith(s)) return false;
    rest = rest.slice(s.length);
  }
  return true;
}
/** A run of nine or more digits, single spaces or hyphens allowed between them: a phone number typed by hand. */
function phoneLike(s: string): boolean {
  let digits = 0;
  let gap = false;
  for (const c of s) {
    if (c >= "0" && c <= "9") { digits++; gap = false; if (digits >= 9) return true; continue; }
    if ((c === " " || c === "-") && digits > 0 && !gap) { gap = true; continue; }
    digits = 0;
    gap = false;
  }
  return false;
}

// ══ THE IMPLEMENTATIONS UNDER TEST — passed in, so the red twin can hand in defective ones ══════════════════
type Impl = {
  rows: typeof ROWS.hubRowsFor;
  load: (userId: string | null, deps?: Deps) => Promise<HubViewer>;
  words: typeof ROWS.hubWordProblems;
};
const REAL: Impl = { rows: ROWS.hubRowsFor, load: HV.loadHubViewer, words: ROWS.hubWordProblems };

// ══ §1 · THE GATE ════════════════════════════════════════════════════════════════════════════════════════════
const GATE_STEPS = ["const { journey } = await resolveSimpleJourney();", "if (!journey) notFound();"];
const READS = ["currentSession(", "getServerT(", "loadHubViewer(", "hubRowsFor(", "cookies(", "headers("];
const RULES = ["inviteIsLiveFor(", "inviteViewerFor(", "invitePaysPlayersNow(", "getAgentConfig(", "getProposalsConfig(", "viewerDoorsFor(",
  "isStaffRole(", "hasRole(", "ADMIN_CONSOLE_ROLES", "db.user", "db.wallet", "db.kyc", "db.affiliate"];
const RESPELT = ["inviteIsLiveFor(", "isStaffRole(", "hasRole(", "ADMIN_CONSOLE_ROLES", '!== "DISABLED"', "|| inviteViewer.agentInGoodStanding", "agentInGoodStanding ||"];

function g1Gate(W: World, ok: Ok) {
  const body = after(W.page, "export default async function");
  ok("1.gate · the page's first two statements ask the one resolver and call notFound() for every request the journey is not shown to",
    opensWith(body, GATE_STEPS), body.slice(0, 200));
  const gate = body.indexOf(GATE_STEPS[1]);
  const early = READS.filter((r) => { const i = body.indexOf(r); return i >= 0 && (gate < 0 || i < gate); });
  ok("1.gate.order · nothing is read above the gate — not the session, not the words, not the reader", gate > 0 && early.length === 0, early.join(", "));
  const late = READS.slice(0, 4).filter((r) => body.indexOf(r) <= gate);
  ok("1.gate.c · CONTROL · the page does read below the gate (the words, the session, the reader and its rows), so 1.gate.order is not vacuous",
    gate > 0 && late.length === 0, late.join(", "));
  ok("1.dynamic · rendered per request", W.page.includes('export const dynamic = "force-dynamic";'));
  ok("1.loading · no loading file of /account's own (A3) — a skeleton would stream to every classic visitor before the gate",
    W.loaders.length === 0, W.loaders.join(", "));
  const spelt = RULES.filter((r) => W.page.includes(r));
  ok("1.doors · the page reads no store and spells no product rule: its reader comes from loadHubViewer, its rows from hubRowsFor",
    spelt.length === 0 && count(W.page, "loadHubViewer(") === 1 && count(W.page, "hubRowsFor(") === 1, spelt.join(", "));
  const respelt = RESPELT.filter((r) => W.viewer.includes(r));
  ok("1.doors.viewer · loadHubViewer composes the doors through viewerDoorsFor, once, and re-spells none of its formulas",
    count(W.viewer, "viewerDoorsFor(") === 1 && respelt.length === 0, respelt.join(", "));
}

// ══ §2 · THE TITLE ═══════════════════════════════════════════════════════════════════════════════════════════
const META_STEPS = ["const { journey } = await resolveSimpleJourney();", "if (!journey) return { ...(await notFoundMetadata()), robots: { index: false, follow: false } };"];
function g2Title(W: World, ok: Ok) {
  const meta = between(W.page, "export async function generateMetadata", "export default async function");
  ok("2.meta · the tab title asks the resolver FIRST, and everybody the journey is not shown to gets the not-found page's metadata with noindex (A2)",
    opensWith(meta, META_STEPS), meta.slice(0, 220));
  const answered = meta.indexOf("if (!journey) return");
  const words = meta.indexOf("t.journey.");
  ok("2.meta.words · a journey word is read only after that answer", answered > 0 && words > answered, `answer at ${answered}, words at ${words}`);
  ok("2.meta.source · the not-found answer is the not-found page's own — imported, never retyped — and that page still exports it",
    W.page.includes('import { generateMetadata as notFoundMetadata } from "@/app/not-found";') && W.notFound.includes("export async function generateMetadata()"));
}

// ══ §3 · THE ROWS ════════════════════════════════════════════════════════════════════════════════════════════
const layout = (groups: readonly HubGroup[]) => groups.map((g) => `${g.key}:${g.rows.map((r) => r.id).join(",")}`).join(" | ");
const rowOf = (groups: readonly HubGroup[], id: string): HubRow | undefined => groups.flatMap((g) => g.rows).find((r) => r.id === id);
const hrefOf = (r: HubRow | undefined): string | null => (r && "href" in r ? r.href : null);
type Facts = { role?: string; held?: boolean; kyc?: boolean; standing?: boolean; eligible?: boolean; agentEnabled?: boolean; proposals?: ProposalsState };
/** A signed-in reader whose doors the REAL `viewerDoorsFor` composes from the facts given. */
function member(o: Facts = {}): HubMember {
  const role = o.role ?? "PLAYER";
  const inviteViewer = { role, agentInGoodStanding: !!o.standing, playerInviteEligible: o.eligible ?? !o.standing } as InviteViewer;
  const proposalsState = o.proposals ?? "COMING_SOON";
  return {
    signedIn: true, userId: "jah_rows", name: "Jina Lako", initials: "JL", phone: "+255••••78", balance: 2_000,
    walletHeld: !!o.held, kycOffered: o.kyc ?? true, agentInStanding: !!o.standing, proposalsState,
    doors: DOORS.viewerDoorsFor({ inviteViewer, invitePayable: false, agentEnabled: !!o.agentEnabled, proposalsState, role }),
  };
}
const GUEST: HubViewer = { signedIn: false };
const GUEST_LAYOUT = "play:language,results,live,leaderboard | fairnessHelp:fairness,help | safety:limits,break,exclude | legal:privacy,aml,terms,rules";
type Shape = { invite: boolean; proposals: boolean; kyc: boolean; held: boolean; agent: boolean };
/** The canvas's signed-in cards, in A17's order, for a reader of this shape. */
function memberLayout(s: Shape): string {
  const share = [s.invite ? "invite" : "", s.proposals ? "proposals" : ""].filter((x) => x.length > 0);
  return [
    `money:${s.held ? "wallet" : "wallet,withdraw"}`,
    "play:results,live,leaderboard",
    "safety:limits,break,exclude",
    ...(share.length > 0 ? [`invite:${share.join(",")}`] : []),
    `profile:${s.kyc ? "profile,kyc,fairness" : "profile,fairness"}`,
    "help:help,notifications",
    "settings:language,cardSize,needle,search",
    ...(s.agent ? ["agent:agent"] : []),
  ].join(" | ");
}

function g3Rows(I: Impl, W: World, ok: Ok) {
  const guest = I.rows(GUEST);
  ok("3.guest · signed out: the canvas's four cards — play (with the language), fairness and help, play safe, the legal pages — and no wallet, ticket or account door",
    layout(guest) === GUEST_LAYOUT, layout(guest));
  const player = member();
  const want = (over: Partial<Shape> = {}) => memberLayout({ invite: player.doors.inviteVisible, proposals: true, kyc: true, held: false, agent: false, ...over });
  ok("3.player · a player: money, play, play safe, invite, profile, help, settings — the canvas's cards in A17's order",
    layout(I.rows(player)) === want(), layout(I.rows(player)));
  const pInvite = rowOf(I.rows(player), "invite");
  ok("3.invite.label · a player's invite door is the page's own name (Alika marafiki), never a paid word",
    player.doors.inviteVisible ? pInvite?.kind === "link" && pInvite.label === "profile.inviteFriends" : pInvite === undefined, show(pInvite));
  const held = I.rows(member({ held: true }));
  const wallet = rowOf(held, "wallet");
  ok("3.held · a held wallet: Pochi says it is frozen, and no money door is offered (the wallet sheet's rule)",
    layout(held) === want({ held: true }) && wallet?.kind === "link" && wallet.sub === "common.balanceFrozen", layout(held));
  const agent = I.rows(member({ role: "AGENT", standing: true }));
  const aInvite = rowOf(agent, "invite");
  ok("3.agent · an agent in standing: the invite door is their dashboard, and Kuwa wakala stays with the programme closed",
    layout(agent) === want({ invite: true, agent: true }) && aInvite?.kind === "link" && aInvite.label === "agent.dashTitle", layout(agent));
  ok("3.agent.door · Kuwa wakala follows the footer's rule exactly: there when the programme is open, absent for a player when it is closed",
    layout(I.rows(member({ agentEnabled: true }))) === want({ agent: true }) && !layout(I.rows(player)).includes("agent:"),
    layout(I.rows(member({ agentEnabled: true }))));
  for (const role of ["SUPPORT", "ADMIN"]) {
    const staff = member({ role });
    ok(`3.staff.${role} · ${role}: the same rows as a player — the console is the page's plain link, never data`,
      layout(I.rows(staff)) === want() && staff.doors.staffConsole, layout(I.rows(staff)));
  }
  const closed = I.rows(member({ eligible: false }));
  ok("3.closed · invite closed to this reader (a closed, suspended or self-excluded account): no Alika, and Pendekeza stays",
    layout(closed) === want({ invite: false }), layout(closed));
  const off = I.rows(member({ proposals: "DISABLED" }));
  ok("3.proposals · proposals DISABLED: no Pendekeza", layout(off) === want({ proposals: false }), layout(off));
  const neither = I.rows(member({ eligible: false, proposals: "DISABLED" }));
  ok("3.invite.empty · both closed: the invite card is not drawn at all", layout(neither) === want({ invite: false, proposals: false }), layout(neither));
  const noKyc = I.rows(member({ kyc: false }));
  ok("3.kyc · Verify ID not offered (approved, or refused for good — decided by loadHubViewer, §6): no Thibitisha ID row",
    layout(noKyc) === want({ kyc: false }), layout(noKyc));
  const keys = I.rows(player).map((g) => g.key);
  ok("3.order · the play-safe card sits above invite and rewards (A17)", keys.indexOf("safety") >= 0 && keys.indexOf("safety") < keys.indexOf("invite"), keys.join(" "));

  const rgOf = (groups: readonly HubGroup[]) => ["limits", "break", "exclude"].map((id) => hrefOf(rowOf(groups, id)));
  const signedIn = I.rows(player);
  ok("3.rg · signed in: Weka mipaka, Pumzika and Jizuie are three rows — the limits page, its #break and its #exclude (A17)",
    show(rgOf(signedIn)) === show(["/profile/responsible-gambling", "/profile/responsible-gambling#break", "/profile/responsible-gambling#exclude"]), show(rgOf(signedIn)));
  ok("3.rg.guest · signed out: all three land on the public policy page (the limits page is behind a sign-in)",
    show(rgOf(guest)) === show(["/legal/responsible-gambling", "/legal/responsible-gambling", "/legal/responsible-gambling"]), show(rgOf(guest)));
  const limits = rowOf(signedIn, "limits");
  ok("3.rg.sub · Weka mipaka says what it holds — Mipaka · Pumzika · Jizuie", limits?.kind === "link" && limits.sub === "journey.hubLimitsSub", show(limits));
  ok('3.anchor · the limits page carries both sections the rows land on, once each (id "break", id "exclude")',
    count(W.rgPage, 'id="break"') === 1 && count(W.rgPage, 'id="exclude"') === 1, show({ break: count(W.rgPage, 'id="break"'), exclude: count(W.rgPage, 'id="exclude"') }));

  const readers: HubViewer[] = [GUEST, player, member({ held: true }), member({ role: "AGENT", standing: true }), member({ agentEnabled: true }),
    member({ eligible: false }), member({ proposals: "DISABLED" }), member({ kyc: false })];
  const hrefs = [...new Set(readers.flatMap((v) => I.rows(v).flatMap((g) => g.rows)).map(hrefOf).filter((h): h is string => h !== null))];
  const missing = hrefs.filter((h) => !W.routes.includes(h.split("#")[0]));
  ok("3.routes · every door the hub draws, for every kind of reader, names a route on disk", hrefs.length >= 20 && missing.length === 0,
    missing.length > 0 ? missing.join(", ") : `${hrefs.length} doors`);
  const doubled = readers.filter((v) => { const ids = I.rows(v).flatMap((g) => g.rows.map((r) => r.id)); return new Set(ids).size !== ids.length; });
  ok("3.unique · no reader is offered the same row twice", doubled.length === 0, show(doubled));
}

// ══ §4 · THE WORDS ═══════════════════════════════════════════════════════════════════════════════════════════
/** A dictionary path read by this suite's own walk — not `hubWord`, so the module under test is not its own oracle. */
function wordAt(t: unknown, path: string): string {
  let v: unknown = t;
  for (const part of path.split(".")) v = v !== null && typeof v === "object" ? (v as Record<string, unknown>)[part] : undefined;
  return typeof v === "string" ? v : "";
}
/**
 * Every `t.<namespace>.<key>` the page and its islands read straight from the dictionary — the words outside the rows
 * data, which `hubWordProblems` never sees. Read from the decommented source, so a word added to a file is held the day
 * it is written, with no list here to forget.
 */
function directWords(W: World): string[] {
  const found = new Set<string>();
  for (const s of [W.page, W.hubRow, W.unread, W.language, W.signOut, W.cardSize]) {
    for (const m of s.matchAll(/(?<![A-Za-z0-9_$.])t[.]([A-Za-z]+)[.]([A-Za-z0-9]+)/g)) found.add(`${m[1]}.${m[2]}`);
  }
  return [...found].sort();
}
/** One word per file, so a scan that stopped reading a file is seen. */
const DIRECT_SEEN = ["journey.tabAccount", "proposals.comingSoonTag", "notif.unreadN", "common.language", "profile.signOutConfirmTitle", "nav.cardSpacingHint"];

function g4Words(I: Impl, W: World, ok: Ok) {
  const problems = I.words(W.dicts);
  ok("4.words · every word in the rows data resolves in en, sw and zh", Object.keys(W.dicts).length === 3 && problems.length === 0, problems.slice(0, 4).join(" · "));
  const direct = directWords(W);
  const unseen = DIRECT_SEEN.filter((p) => !direct.includes(p));
  const missing = direct.flatMap((p) => Object.entries(W.dicts).filter(([, t]) => !wordAt(t, p).trim()).map(([locale]) => `"${p}" is missing in ${locale}`));
  ok("4.words.direct · every word the page and its islands read by path, outside the rows data, resolves in en, sw and zh",
    Object.keys(W.dicts).length === 3 && unseen.length === 0 && missing.length === 0,
    unseen.length > 0 ? `the scan did not see ${unseen.join(", ")}` : missing.length > 0 ? missing.slice(0, 4).join(" · ") : `${direct.length} words`);
  const numbered = Object.entries(W.dicts)
    .map(([locale, t]) => [locale, ROWS.hubWord(t, "journey.hubHelpSub")] as const)
    .filter(([, s]) => s.length === 0 || [...s].some((c) => c >= "0" && c <= "9"));
  ok("4.nonumber · Msaada's second line names no number in any language (§0h point 10)",
    numbered.length === 0, show(numbered));
  // ⭐ The owner's ruling of 2026-10-06: no player surface shows the helpline — the hub's play-safe card included.
  ok("4.helpline · the hub carries no helpline row and reads no helpline (the owner's ruling, 2026-10-06)",
    !/\bHELPLINE(?:_TEL)?\b/.test(W.hubRow) && !/kind:\s*"helpline"/.test(W.rows) && !W.rows.includes('"footer.helpline"'));
  const files: Array<[string, string]> = [["page", W.page], ["rows", W.rows], ["hubRow", W.hubRow], ["viewer", W.viewer], ["unread", W.unread], ["language", W.language], ["signOut", W.signOut], ["cardSize", W.cardSize]];
  const typed = files.filter(([, s]) => phoneLike(s)).map(([k]) => k);
  ok("4.literal · no phone number is typed into any hub file", typed.length === 0, typed.join(", "));
  ok("4.literal.c · CONTROL · the detector sees the helpline's own shape and passes a stake and a size",
    phoneLike("Simu 0800 11 0011") && !phoneLike("TZS 2,000 · s={20}"));
}

// ══ §5 · THE CONSOLE ═════════════════════════════════════════════════════════════════════════════════════════
function g5Console(W: World, ok: Ok) {
  const cross = ['"/admin', "'/admin", "`/admin"].filter((q) => W.rows.includes(q));
  ok("5.rows · the rows data carries no console href — a row renders as a soft link, and a soft link into the console is E-70",
    W.rows.includes("export function hubRowsFor") && cross.length === 0, cross.join(" "));
  const at = W.page.indexOf('<a href="/admin"');
  ok("5.page · the page draws exactly one console link, and it is a plain document link",
    count(W.page, 'href="/admin"') === 1 && at > 0, `${count(W.page, 'href="/admin"')} found`);
  const gate = at > 0 ? W.page.lastIndexOf("viewer.doors.staffConsole && (", at) : -1;
  ok("5.page.gate · …drawn only behind the staff door (viewerDoorsFor's rule: every staff role, SJ-23)",
    at > 0 && gate > 0 && at - gate < 400, `${gate < 0 ? "no gate" : `${at - gate} characters apart`}`);
}

// ══ §6 · THE READER, IN MEMORY ═══════════════════════════════════════════════════════════════════════════════
const ID = {
  player: "jah_player", held: "jah_held", agent: "jah_agent", support: "jah_support", admin: "jah_admin",
  suspended: "jah_suspended", kycOk: "jah_kyc_ok", kycFinal: "jah_kyc_final", kycRetry: "jah_kyc_retry",
} as const;
async function fixtures() {
  const { mkFixtureUser, approveFixtureAgent } = await import("./lib/agent-fixtures.mts");
  const kycRow = async (userId: string, status: "APPROVED" | "REJECTED", rejectReason: string | null) => {
    const now = new Date().toISOString();
    await db.kyc.upsert({ id: `kyc_${userId}`, userId, status, rejectReason, rejectNote: null, fullName: null, dob: null, documents: [], reviewerId: null, reviewedAt: null, submittedAt: now, createdAt: now, updatedAt: now });
  };
  await mkFixtureUser(ID.player);
  await db.user.update(ID.player, { displayName: "Jina Lako" } as never);
  await db.wallet.update(`wal_${ID.player}`, { balance: 2_000 } as never);
  await mkFixtureUser(ID.held, { walletStatus: "FROZEN" });
  await mkFixtureUser(ID.agent);
  await approveFixtureAgent(ID.agent);
  await mkFixtureUser(ID.support, { role: "SUPPORT" });
  await mkFixtureUser(ID.admin, { role: "ADMIN" });
  await mkFixtureUser(ID.suspended, { status: "SUSPENDED" });
  await mkFixtureUser(ID.kycOk);
  await kycRow(ID.kycOk, "APPROVED", null);
  await mkFixtureUser(ID.kycFinal);
  await kycRow(ID.kycFinal, "REJECTED", "UNDERAGE");
  await mkFixtureUser(ID.kycRetry);
  await kycRow(ID.kycRetry, "REJECTED", "BLURRY_IMAGE");
}

async function g6Reader(I: Impl, ok: Ok) {
  const tally = counted(base());
  const g = await I.load(null, tally.deps);
  ok("6.guest · a guest is read nothing at all — not a row, not a switch, not a config", !g.signedIn && tally.calls() === 0, `${tally.calls()} read(s)`);
  const load = (id: string, deps: Deps = base()) => I.load(id, deps);

  const p = await load(ID.player);
  const stored = await db.user.findById(ID.player);
  ok("6.player · a player: the name and its initials, the shared phone mask, the balance, nothing held, Verify ID offered (no KYC row yet), no console",
    p.signedIn && p.name === "Jina Lako" && p.initials === "JL" && p.phone === maskPhone(stored?.phoneE164) && p.balance === 2_000
      && !p.walletHeld && p.kycOffered && !p.agentInStanding && !p.doors.staffConsole, show(p));
  const h = await load(ID.held);
  ok("6.held · a frozen wallet is held", h.signedIn && h.walletHeld, show(h));
  const a = await load(ID.agent);
  ok("6.agent · an approved agent in standing: the standing is read, the agent door stays open with the programme closed, and the invite is theirs",
    a.signedIn && a.agentInStanding && a.doors.agentDoorVisible && a.doors.inviteVisible && a.doors.invitePaid, show(a));
  for (const [id, staff] of [[ID.support, true], [ID.admin, true], [ID.player, false], [ID.agent, false]] as const) {
    const v = await load(id);
    ok(`6.console.${id} · the staff console ${staff ? "for a staff role (SUPPORT included, SJ-23)" : "for nobody but staff"}`,
      v.signedIn && v.doors.staffConsole === staff, show(v.signedIn ? v.doors : v));
  }
  const s = await load(ID.suspended);
  ok("6.suspended · a suspended account holds no invite link", s.signedIn && !s.doors.inviteVisible, show(s));
  for (const [id, offered] of [[ID.player, true], [ID.kycOk, false], [ID.kycFinal, false], [ID.kycRetry, true]] as const) {
    const v = await load(id);
    ok(`6.kyc.${id} · Verify ID ${offered ? "offered" : "not offered"} — /profile's own predicate (approved, or refused for good, is never asked again)`,
      v.signedIn && v.kycOffered === offered, show(v));
  }
  for (const id of Object.values(ID)) {
    const v = await load(id);
    const u = await db.user.findById(id);
    const wantDoors = DOORS.viewerDoorsFor({ inviteViewer: await inviteViewerFor(id), invitePayable: false, agentEnabled: false, proposalsState: "COMING_SOON", role: u?.role ?? null });
    ok(`6.doors.${id} · the doors are exactly viewerDoorsFor's answer for this reader's stored facts`,
      v.signedIn && show(v.doors) === show(wantDoors), show({ got: v.signedIn ? v.doors : null, want: wantDoors }));
  }

  const fu = await load(ID.admin, broken("user"));
  ok("6.fail.user · a failed user read: the generic name, no phone, and NO console — even for an admin (a failure never opens a door)",
    fu.signedIn && fu.name === displayLabel({ id: ID.admin, displayName: null }) && fu.phone === maskPhone(null) && !fu.doors.staffConsole, show(fu));
  const fw = await load(ID.player, broken("wallet"));
  ok("6.fail.wallet · a failed wallet read: no figure, and not called held", fw.signedIn && fw.balance === null && !fw.walletHeld, show(fw));
  const fk = await load(ID.kycRetry, broken("kyc"));
  ok("6.fail.kyc · a failed KYC read: Verify ID is NOT offered — nobody is told to verify on the strength of a failed query", fk.signedIn && !fk.kycOffered, show(fk));
  const fi = await load(ID.agent, broken("inviteViewer"));
  ok("6.fail.invite · a failed invite read: no invite door, no standing, nothing paid", fi.signedIn && !fi.doors.inviteVisible && !fi.agentInStanding && !fi.doors.invitePaid, show(fi));
  const fp = await load(ID.player, broken("invitePayable"));
  ok("6.fail.switch · a failed switch read: not paid", fp.signedIn && !fp.doors.invitePaid, show(fp));
  const fa = await load(ID.player, broken("agentEnabled"));
  ok("6.fail.agent · a failed programme read: no agent door for a player", fa.signedIn && !fa.doors.agentDoorVisible, show(fa));
  const open = await load(ID.player, { ...base(), agentEnabled: () => true });
  ok("6.fail.agent.c · CONTROL · with the programme open the same player IS offered the agent door — the read is asked, so a closed door after a failed read is the failure's doing",
    open.signedIn && open.doors.agentDoorVisible, show(open.signedIn ? open.doors : open));
  const fs = await load(ID.player, broken("proposalsState"));
  ok("6.fail.proposals · a failed proposals read: no proposals door", fs.signedIn && !fs.doors.proposalsVisible, show(fs));
}

// ══ §8 · THE ISLANDS ═════════════════════════════════════════════════════════════════════════════════════════
const isClient = (s: string) => s.trimStart().startsWith('"use client"');
function g8Islands(W: World, ok: Ok) {
  ok("8.unread · the Arifa row is a client island that reads the count ONCE (A1) and speaks it inside the row's own name",
    isClient(W.unread) && count(W.unread, 'useUnreadCount({ userId, mode: "once" })') === 1 && !W.unread.includes('"poll"')
      && W.unread.includes("<CountBadge") && W.unread.includes('tone="brand"') && W.unread.includes("t.notif.unreadOne") && W.unread.includes("t.notif.unreadN"));
  ok("8.language · the language row is a client disclosure that takes the header menu's own list and calls the same setLocale",
    isClient(W.language) && W.language.includes('import { LANGS, NAMES } from "@/components/ui/language-menu";') && W.language.includes("setLocale(code)")
      && W.language.includes('role="listbox"') && W.language.includes('role="option"') && !W.language.includes('"Kiswahili"')
      && W.languageMenu.includes("export const LANGS: Locale[] =") && W.languageMenu.includes("export const NAMES: Record<Locale, string> ="));
  ok("8.signout · sign-out asks first — the kit ConfirmDialog, claret, the profile.signOutConfirm words — and then POSTs to /auth/logout",
    isClient(W.signOut) && W.signOut.includes("<ConfirmDialog") && W.signOut.includes('tone="claret"')
      && ["Title", "Body", "Yes", "No"].every((k) => W.signOut.includes(`t.profile.signOutConfirm${k}`))
      && W.signOut.includes('action="/auth/logout"') && W.signOut.includes('method="POST"'));
  ok("8.signout.page · the page offers sign-out to a signed-in reader only", W.page.includes("{viewer.signedIn && <SignOutRow />}"));
  const reviewed = between(W.popupFit, "const REVIEWED", "];");
  ok("8.popup · test:popup-fit has reviewed the sign-out row by name — a dialog is a popup, and its words may not leave their box",
    reviewed.includes('"src/components/journey/account/sign-out-row.tsx"') && W.signOut.includes("<ConfirmDialog"));
}

// ══ THE RUN ══════════════════════════════════════════════════════════════════════════════════════════════════
async function run(I: Impl, W: World, log: (l: string) => void): Promise<{ failed: string[]; total: number }> {
  const failed: string[] = [];
  let total = 0;
  const ok: Ok = (label, cond, detail = "") => {
    total++;
    if (cond) log(`PASS ${label}`);
    else { failed.push(label); log(`FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
  };
  log(""); log("§1 · the gate — the resolver first, notFound() before any read, no loading file, no rule re-spelt");
  g1Gate(W, ok);
  log(""); log("§2 · the title — the resolver first, the not-found metadata and noindex for everybody else");
  g2Title(W, ok);
  log(""); log("§3 · the rows — hubRowsFor for every kind of reader, A17's order and the two play-safe rows");
  g3Rows(I, W, ok);
  log(""); log("§4 · the words — three languages, no number under Msaada, no helpline row");
  g4Words(I, W, ok);
  log(""); log("§5 · the console — never data, one plain link behind the staff door");
  g5Console(W, ok);
  log(""); log("§6 · the reader, in memory — a guest read nothing, every failure closed, the doors viewerDoorsFor's");
  await g6Reader(I, ok);
  log(""); log("§8 · the islands — Arifa once, one list of languages, sign-out confirmed, the dialog reviewed");
  g8Islands(W, ok);
  return { failed, total };
}

await fixtures();

if (!PROVE_RED) {
  console.log("journey-account — the Akaunti hub (Vodacom plan S6, WP5)");
  const { failed, total } = await run(REAL, WORLD, (l) => console.log(l));
  console.log("");
  console.log("§7 · the reader on the Prisma twin — its own process, a fake client");
  const tsxCli = createRequire(import.meta.url).resolve("tsx/cli");
  const env = { ...process.env };
  delete env.DATABASE_URL; delete env.USE_PRISMA_DAL; delete env.REDIS_URL; delete env.REDIS_ENABLED;
  const child = spawnSync(process.execPath, [tsxCli, THIS], { env: { ...env, JAH_MODE: "db", DATABASE_URL: FAKE_DATABASE_URL }, encoding: "utf8", timeout: 180_000 });
  const out = `${child.stdout ?? ""}${child.stderr ?? ""}`;
  let childChecks = 0;
  for (const raw of out.split(LF)) {
    const line = raw.split(CR).join("");
    if (line.startsWith("PASS ")) { childChecks++; console.log(line); }
    else if (line.startsWith("FAIL ")) { childChecks++; failed.push(line.slice(5)); console.log(line); }
  }
  const ran = child.status === 0 && childChecks > 0 && out.includes("PASS 7.");
  if (!ran) failed.push("7.ran · the database-mode process ran its checks and exited clean");
  console.log(`${ran ? "PASS" : "FAIL"} 7.ran · the database-mode process ran its checks and exited clean${ran ? "" : ` — exit ${child.status} · ${out.slice(-600)}`}`);
  const checks = total + childChecks + 1;
  console.log("");
  console.log(`JOURNEY ACCOUNT — ${total === 0 ? "0 checks ran: a zero-assertion run is a SKIPPED run" : failed.length === 0 ? `all ${checks} checks passed` : `${failed.length} of ${checks} failed`}`);
  for (const f of failed) console.log(`  · ${f}`);
  process.exit(total > 0 && failed.length === 0 ? 0 : 1);
}

// ══ THE RED TWIN — every plant must be caught by the check named for it ═════════════════════════════════════
const quiet = () => {};
let pass = 0, fail = 0;
const proof = (label: string, cond: boolean, extra = "") => {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};
console.log("RED CONTROL — journey-account's defects, planted in memory");
console.log("");
const baseline = await run(REAL, WORLD, quiet);
if (baseline.total === 0 || baseline.failed.length > 0) {
  console.log(`INCONCLUSIVE: the clean run already fails (${baseline.failed[0] ?? "0 checks ran"}) — a plant could not be told from it`);
  process.exit(1);
}
proof(`baseline · the shipped hub passes all ${baseline.total} in-process checks before anything is planted`, true);

const withText = (key: TextKey, f: (s: string) => string): World => ({ ...WORLD, [key]: f(WORLD[key]) });
const changed = (w: World, key: TextKey) => w[key] !== WORLD[key];
/** Edit only the page's default export (its body), or only its metadata function. */
const inBody = (f: (body: string) => string) => (page: string) => {
  const at = page.indexOf("export default async function");
  return at < 0 ? page : page.slice(0, at) + f(page.slice(at));
};
const inMeta = (f: (meta: string) => string) => (page: string) => {
  const a = page.indexOf("export async function generateMetadata");
  const b = page.indexOf("export default async function");
  return a < 0 || b < a ? page : page.slice(0, a) + f(page.slice(a, b)) + page.slice(b);
};
const patchWord = (t: unknown, ns: string, key: string, value: string): unknown => {
  const d = t as Record<string, Record<string, unknown>>;
  return { ...d, [ns]: { ...d[ns], [key]: value } };
};
const rowsWith = (f: (v: HubMember) => HubMember): Impl["rows"] => (v) => ROWS.hubRowsFor(v.signedIn ? f(v) : v);
const mapRows = (f: (r: HubRow) => HubRow): Impl["rows"] => (v) => ROWS.hubRowsFor(v).map((g) => ({ ...g, rows: g.rows.map(f) }));

// §1 · §2 — the page
const sessionFirst = withText("page", inBody((b) => b.replace(GATE_STEPS[0], "const early = await currentSession();" + LF + "  " + GATE_STEPS[0])));
const noGate = withText("page", inBody((b) => b.replace(GATE_STEPS[1], "")));
const withLoader: World = { ...WORLD, loaders: ["src/app/account/loading.tsx"] };
const pageRespells = withText("page", (s) => s + LF + "const again = inviteIsLiveFor(null);");
const viewerRespells = withText("viewer", (s) => s + LF + "const desk = isStaffRole(role);");
const titleFirst = withText("page", inMeta((m) => m.replace(META_STEPS[0], "const early = (await getServerT()).t.journey.tabAccount;" + LF + "  " + META_STEPS[0])));
const indexable = withText("page", (s) => s.replace("robots: { index: false, follow: false }", "robots: { index: true, follow: true }"));
const retyped = withText("page", (s) => s.replace('import { generateMetadata as notFoundMetadata } from "@/app/not-found";', 'const notFoundMetadata = async () => ({ title: "Page not found · 404" });'));
const notDynamic = withText("page", (s) => s.replace('export const dynamic = "force-dynamic";', ""));
// §3 — the anchor the rows land on
const anchorGone = withText("rgPage", (s) => s.replace('id="exclude"', 'id="exclusion"'));
// §4 — the words
const helpNumbered: World = { ...WORLD, dicts: { ...WORLD.dicts, sw: patchWord(WORLD.dicts.sw, "journey", "hubHelpSub", "Maswali ya kawaida · Simu 0800 11 0011 · Barua pepe") } };
const zhMissing: World = { ...WORLD, dicts: { ...WORLD.dicts, zh: patchWord(WORLD.dicts.zh, "journey", "hubGroupSafety", "") } };
const zhDirect: World = { ...WORLD, dicts: { ...WORLD.dicts, zh: patchWord(WORLD.dicts.zh, "profile", "signOutConfirmYes", "") } };
const scanBlind = withText("cardSize", (s) => s.split("t.nav.").join("words.nav."));
const wordGone = (w: World, locale: string, path: string) => wordAt(WORLD.dicts[locale], path) !== "" && wordAt(w.dicts[locale], path) !== wordAt(WORLD.dicts[locale], path);
const numberTyped = withText("hubRow", (s) => s.replace("const Glyph = I[row.glyph];", 'const typed = "0800 11 0011";\n  const Glyph = I[row.glyph];'));
const helplineBack = withText("hubRow", (s) => s.replace("const Glyph = I[row.glyph];", 'if (row.id === "help") return <li><a href={`tel:${HELPLINE_TEL()}`}>{HELPLINE()}</a></li>;\n  const Glyph = I[row.glyph];'));
// §5 — the console
const consoleInRows = withText("rows", (s) => s + LF + 'const desk = "/admin";');
const consoleForAll = withText("page", (s) => s.replace("viewer.doors.staffConsole && (", "("));
// §8 — the islands
const unreadPolls = withText("unread", (s) => s.replace('mode: "once"', 'mode: "poll"'));
const ownLanguages = withText("language", (s) => s.replace('import { LANGS, NAMES } from "@/components/ui/language-menu";',
  'const LANGS = ["en", "sw", "zh"] as const; const NAMES = { en: "English", sw: "Kiswahili", zh: "中文" };'));
const noConfirm = withText("signOut", (s) => s.split("<ConfirmDialog").join("<SubmitAtOnce"));
const signOutGets = withText("signOut", (s) => s.replace('method="POST"', 'method="GET"'));
const unreviewed = withText("popupFit", (s) => s.replace('"src/components/journey/account/sign-out-row.tsx",', ""));
const guestsSignOut = withText("page", (s) => s.replace("{viewer.signedIn && <SignOutRow />}", "<SignOutRow />"));

// §3 — the rows
const inviteUngated = rowsWith((v) => ({ ...v, doors: { ...v.doors, inviteVisible: true } }));
const heldWithdraws = rowsWith((v) => ({ ...v, walletHeld: false }));
const oneRgRow: Impl["rows"] = (v) => ROWS.hubRowsFor(v).map((g) => ({ ...g, rows: g.rows.filter((r) => r.id !== "exclude") }));
const excludeOnBreak = mapRows((r) => (r.id === "exclude" && r.kind === "link" ? { ...r, href: r.href.split("#exclude").join("#break") } : r));
const safetyLast: Impl["rows"] = (v) => { const g = ROWS.hubRowsFor(v); return [...g.filter((x) => x.key !== "safety"), ...g.filter((x) => x.key === "safety")]; };
const agentForAll = rowsWith((v) => ({ ...v, doors: { ...v.doors, agentDoorVisible: true } }));
const proposalsAlways = rowsWith((v) => ({ ...v, doors: { ...v.doors, proposalsVisible: true } }));
const guestAsMember: Impl["rows"] = (v) => ROWS.hubRowsFor(v.signedIn ? v : member());
const kycAlways = rowsWith((v) => ({ ...v, kycOffered: true }));
const agentAsPlayer = rowsWith((v) => ({ ...v, agentInStanding: false }));
const searchMisspelt = mapRows((r) => (r.id === "search" && r.kind === "link" ? { ...r, href: "/marketz" } : r));
const resultsTwice: Impl["rows"] = (v) => ROWS.hubRowsFor(v).map((g) => (g.key === "play" ? { ...g, rows: [...g.rows, ...g.rows.filter((r) => r.id === "results")] } : g));
const labelOf = (r: HubRow | undefined): string | null => (r && r.kind === "link" ? r.label : null);

// §6 — the reader
const guestReads: Impl["load"] = async (id, deps = base()) => {
  if (id === null) { await deps.wallet(ID.player); return { signedIn: false }; }
  return HV.loadHubViewer(id, deps);
};
const roleFromInvite: Impl["load"] = async (id, deps = base()) => {
  const v = await HV.loadHubViewer(id, deps);
  if (!v.signedIn) return v;
  const iv = await Promise.resolve().then(() => deps.inviteViewer(v.userId)).catch(() => null);
  return { ...v, doors: { ...v.doors, staffConsole: v.doors.staffConsole || STAFF.includes(String(iv?.role)) } };
};
const kycSwallowed: Impl["load"] = (id, deps = base()) => HV.loadHubViewer(id, { ...deps, kyc: async (u) => { try { return await deps.kyc(u); } catch { return null; } } });
const standingDropped: Impl["load"] = async (id, deps = base()) => {
  const v = await HV.loadHubViewer(id, deps);
  let open = false;
  try { open = deps.agentEnabled(); } catch { open = false; }
  return v.signedIn ? { ...v, doors: { ...v.doors, agentDoorVisible: open } } : v;
};
const paidOnFailure: Impl["load"] = (id, deps = base()) => HV.loadHubViewer(id, { ...deps, invitePayable: async () => { try { return await deps.invitePayable(); } catch { return true; } } });
const walletMadeUp: Impl["load"] = async (id, deps = base()) => {
  const v = await HV.loadHubViewer(id, deps);
  return v.signedIn && v.balance === null ? { ...v, balance: 0 } : v;
};
/** `isFinalRefusal` dropped: every refusal is asked again, a final one included. */
const finalAskedAgain: Impl["load"] = async (id, deps = base()) => {
  const v = await HV.loadHubViewer(id, deps);
  if (!v.signedIn) return v;
  const k = await Promise.resolve().then(() => deps.kyc(v.userId)).catch(() => null); // the memory store reads synchronously: wrap before .catch
  return k?.status === "REJECTED" ? { ...v, kycOffered: true } : v;
};
/** The account's status dropped from the invite decision: every player is taken as eligible. */
const statusIgnored: Impl["load"] = (id, deps = base()) => HV.loadHubViewer(id, { ...deps, inviteViewer: async (u) => ({ ...(await deps.inviteViewer(u)), playerInviteEligible: true }) });
const inviteFailsAsAgent: Impl["load"] = (id, deps = base()) => HV.loadHubViewer(id, { ...deps, inviteViewer: async (u) => {
  try { return await deps.inviteViewer(u); } catch { return { role: "AGENT", agentInGoodStanding: true, playerInviteEligible: false } as InviteViewer; }
} });
const proposalsFailOpen: Impl["load"] = (id, deps = base()) => HV.loadHubViewer(id, { ...deps, proposalsState: (): ProposalsState => { try { return deps.proposalsState(); } catch { return "COMING_SOON"; } } });
const agentFailOpen: Impl["load"] = (id, deps = base()) => HV.loadHubViewer(id, { ...deps, agentEnabled: () => { try { return deps.agentEnabled(); } catch { return true; } } });
/** The programme never asked: the door is closed for a player whatever the switch says. */
const agentNeverAsked: Impl["load"] = (id, deps = base()) => HV.loadHubViewer(id, { ...deps, agentEnabled: () => false });

const differs = (planted: Impl["rows"], v: HubViewer) => layout(planted(v)) !== layout(ROWS.hubRowsFor(v));
const guestTally = counted(base());
await guestReads(null, guestTally.deps);
const role = await roleFromInvite(ID.admin, broken("user"));
const swallowed = await kycSwallowed(ID.kycRetry, broken("kyc"));
const dropped = await standingDropped(ID.agent, base());
const paidAnyway = await paidOnFailure(ID.player, broken("invitePayable"));
const madeUp = await walletMadeUp(ID.player, broken("wallet"));
const askedAgain = await finalAskedAgain(ID.kycFinal, base());
const suspendedInvites = await statusIgnored(ID.suspended, base());
const asAgent = await inviteFailsAsAgent(ID.agent, broken("inviteViewer"));
const proposalsOpen = await proposalsFailOpen(ID.player, broken("proposalsState"));
const agentOpen = await agentFailOpen(ID.player, broken("agentEnabled"));
const agentShut = await agentNeverAsked(ID.player, { ...base(), agentEnabled: () => true });
const AGENT_READER = member({ role: "AGENT", standing: true });

type Plant = { name: string; expect: string[]; impl?: Partial<Impl>; world?: World; landed: boolean };
const plants: Plant[] = [
  { name: "the page reads the session before it asks the resolver", expect: ["1.gate"], world: sessionFirst, landed: changed(sessionFirst, "page") },
  { name: "the hub renders without the journey (its notFound() is gone)", expect: ["1.gate"], world: noGate, landed: changed(noGate, "page") },
  { name: "an account loading file streams a skeleton before the gate (A3)", expect: ["1.loading"], world: withLoader, landed: withLoader.loaders.length > 0 },
  { name: "the page re-spells the invite rule for itself", expect: ["1.doors ·"], world: pageRespells, landed: changed(pageRespells, "page") },
  { name: "loadHubViewer decides the console with its own role check", expect: ["1.doors.viewer"], world: viewerRespells, landed: changed(viewerRespells, "viewer") },
  { name: "the tab title reads a journey word before it asks the resolver", expect: ["2.meta"], world: titleFirst, landed: changed(titleFirst, "page") },
  { name: "a classic visitor's /account is indexable", expect: ["2.meta ·"], world: indexable, landed: changed(indexable, "page") },
  { name: "the not-found title is retyped instead of imported", expect: ["2.meta.source"], world: retyped, landed: changed(retyped, "page") },
  { name: "the page is no longer rendered per request", expect: ["1.dynamic"], world: notDynamic, landed: changed(notDynamic, "page") },
  { name: "the limits page loses the #exclude section Jizuie lands on", expect: ["3.anchor"], world: anchorGone, landed: changed(anchorGone, "rgPage") },
  { name: "Msaada's second line names the helpline's number", expect: ["4.nonumber"], world: helpNumbered, landed: wordGone(helpNumbered, "sw", "journey.hubHelpSub") },
  { name: "a hub card's name is missing in Chinese", expect: ["4.words ·"], world: zhMissing, landed: wordGone(zhMissing, "zh", "journey.hubGroupSafety") },
  { name: "the sign-out dialog's Yes is missing in Chinese (a word outside the rows data)", expect: ["4.words.direct"], world: zhDirect, landed: wordGone(zhDirect, "zh", "profile.signOutConfirmYes") },
  { name: "the card-size row reads its words through a name the scan does not see", expect: ["4.words.direct"], world: scanBlind, landed: changed(scanBlind, "cardSize") },
  { name: "a phone number is typed into the row file", expect: ["4.literal"], world: numberTyped, landed: changed(numberTyped, "hubRow") },
  { name: "a helpline row comes back to the hub", expect: ["4.helpline"], world: helplineBack, landed: changed(helplineBack, "hubRow") },
  { name: "the console is put into the rows data", expect: ["5.rows"], world: consoleInRows, landed: changed(consoleInRows, "rows") },
  { name: "the console link is drawn for every signed-in reader", expect: ["5.page.gate"], world: consoleForAll, landed: changed(consoleForAll, "page") },
  { name: "the Arifa row polls like the tab's dot", expect: ["8.unread"], world: unreadPolls, landed: changed(unreadPolls, "unread") },
  { name: "the language row keeps its own list of languages", expect: ["8.language"], world: ownLanguages, landed: changed(ownLanguages, "language") },
  { name: "sign-out POSTs without asking", expect: ["8.signout ·"], world: noConfirm, landed: changed(noConfirm, "signOut") },
  { name: "sign-out is sent as a GET, which the logout route neuters", expect: ["8.signout ·"], world: signOutGets, landed: changed(signOutGets, "signOut") },
  { name: "popup-fit stops reviewing the sign-out row", expect: ["8.popup"], world: unreviewed, landed: changed(unreviewed, "popupFit") },
  { name: "sign-out is offered to a guest", expect: ["8.signout.page"], world: guestsSignOut, landed: changed(guestsSignOut, "page") },
  { name: "Alika is offered where the reader may not hold a link", expect: ["3.closed", "3.invite.empty"], impl: { rows: inviteUngated }, landed: differs(inviteUngated, member({ eligible: false })) },
  { name: "a held wallet is offered Toa pesa", expect: ["3.held"], impl: { rows: heldWithdraws }, landed: differs(heldWithdraws, member({ held: true })) },
  { name: "Pumzika and Jizuie are one row again", expect: ["3.rg ·"], impl: { rows: oneRgRow }, landed: differs(oneRgRow, member()) },
  { name: "Jizuie lands on #break", expect: ["3.rg ·"], impl: { rows: excludeOnBreak }, landed: hrefOf(rowOf(excludeOnBreak(member()), "exclude")) !== hrefOf(rowOf(ROWS.hubRowsFor(member()), "exclude")) },
  { name: "the play-safe card falls below invite (A17 undone)", expect: ["3.order"], impl: { rows: safetyLast }, landed: differs(safetyLast, member()) },
  { name: "Kuwa wakala shown to every player", expect: ["3.agent.door"], impl: { rows: agentForAll }, landed: differs(agentForAll, member()) },
  { name: "Pendekeza offered with proposals DISABLED", expect: ["3.proposals"], impl: { rows: proposalsAlways }, landed: differs(proposalsAlways, member({ proposals: "DISABLED" })) },
  { name: "a guest is drawn a member's cards", expect: ["3.guest"], impl: { rows: guestAsMember }, landed: differs(guestAsMember, GUEST) },
  { name: "Verify ID offered to a verified player", expect: ["3.kyc"], impl: { rows: kycAlways }, landed: differs(kycAlways, member({ kyc: false })) },
  { name: "an agent in standing is handed the player's invite words", expect: ["3.agent ·"], impl: { rows: agentAsPlayer },
    landed: labelOf(rowOf(agentAsPlayer(AGENT_READER), "invite")) !== labelOf(rowOf(ROWS.hubRowsFor(AGENT_READER), "invite")) },
  { name: "Tafuta points at a route that is not on disk", expect: ["3.routes"], impl: { rows: searchMisspelt }, landed: hrefOf(rowOf(searchMisspelt(member()), "search")) === "/marketz" },
  { name: "Matokeo is drawn twice in one card", expect: ["3.unique"], impl: { rows: resultsTwice }, landed: differs(resultsTwice, member()) },
  { name: "a guest's visit reads a wallet", expect: ["6.guest"], impl: { load: guestReads }, landed: guestTally.calls() > 0 },
  { name: "a failed user read falls back to the invite read's role (an admin keeps the console)", expect: ["6.fail.user"], impl: { load: roleFromInvite }, landed: role.signedIn && role.doors.staffConsole },
  { name: "a failed KYC read is swallowed as 'not started'", expect: ["6.fail.kyc"], impl: { load: kycSwallowed }, landed: swallowed.signedIn && swallowed.kycOffered },
  { name: "the agent door loses its standing clause", expect: ["6.doors.", "6.agent"], impl: { load: standingDropped }, landed: dropped.signedIn && !dropped.doors.agentDoorVisible },
  { name: "a failed switch read is taken as paid", expect: ["6.fail.switch"], impl: { load: paidOnFailure }, landed: paidAnyway.signedIn && paidAnyway.doors.invitePaid },
  { name: "a failed wallet read is shown as TZS 0", expect: ["6.fail.wallet"], impl: { load: walletMadeUp }, landed: madeUp.signedIn && madeUp.balance === 0 },
  { name: "a refusal for good is asked again (isFinalRefusal dropped)", expect: ["6.kyc."], impl: { load: finalAskedAgain }, landed: askedAgain.signedIn && askedAgain.kycOffered },
  { name: "a suspended account is taken as eligible for an invite link", expect: ["6.suspended"], impl: { load: statusIgnored }, landed: suspendedInvites.signedIn && suspendedInvites.doors.inviteVisible },
  { name: "a failed invite read is taken as an agent in standing", expect: ["6.fail.invite"], impl: { load: inviteFailsAsAgent }, landed: asAgent.signedIn && asAgent.agentInStanding },
  { name: "a failed proposals read is taken as open", expect: ["6.fail.proposals"], impl: { load: proposalsFailOpen }, landed: proposalsOpen.signedIn && proposalsOpen.doors.proposalsVisible },
  { name: "a failed programme read is taken as open", expect: ["6.fail.agent ·"], impl: { load: agentFailOpen }, landed: agentOpen.signedIn && agentOpen.doors.agentDoorVisible },
  { name: "the programme is never asked (the agent door shut whatever the switch says)", expect: ["6.fail.agent.c"], impl: { load: agentNeverAsked }, landed: agentShut.signedIn && !agentShut.doors.agentDoorVisible },
];

let caught = 0;
for (const p of plants) {
  proof(`PLANT LANDED · ${p.name}`, p.landed);
  const r = await run({ ...REAL, ...(p.impl ?? {}) }, p.world ?? WORLD, quiet);
  const hit = r.failed.some((f) => p.expect.some((e) => f.startsWith(e)));
  if (hit && p.landed) caught++;
  proof(`  └─ fires: ${p.expect.join(" | ")}`, hit, r.failed.length === 0 ? "NOTHING failed — the gate cannot see this defect" : `failed instead: ${r.failed.slice(0, 2).join(" | ")}`);
}
console.log("");
console.log(`RED CONTROL — ${caught}/${plants.length} caught${fail === 0 ? ` · all ${pass} proofs held` : ` · ${fail} of ${pass + fail} proofs FAILED`}`);
process.exit(fail === 0 && caught === plants.length ? 0 : 1);
