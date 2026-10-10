/**
 * test:visual-pass-r8c — R8-C (2026-10-10): THE OWNER'S RULING (4) — DURING A PLAYER'S BREAK, NO OFFER TO EARN OR RECRUIT
 * (owner items 16 and 56: "During a player's break, the Invite, Propose & earn and Become an agent offers still show →
 * hide them during a break too").
 *
 * A break is the responsible-gambling time-out the player chose, or a self-exclusion still running (which signs the player
 * out; a session that survives one is treated the same). While it runs:
 *   · no door to the three programmes is drawn — the journey's Akaunti hub, avatar menu and footer, the classic bar's More,
 *     avatar menu, rail More and footer, and /profile's invite row — decided on the SERVER, per request, from the break read
 *     each surface already makes (the shell's `promoSuppressed`, the hub's `isLockedOut`, the page's own), failing open;
 *   · a direct visit is answered calmly where the offer stood: the invite page, the proposals board and its composer say the
 *     break's own sentence with its end (R6-A's `BetBreakNotice`), the agent pages the programme's own RG sentence
 *     (`agent.stateRgLocked`, which the service already refuses with); a reader's own records stay;
 *   · nothing else moves — the RG doors and notices, the money doors, the console — and a reader NOT on a break is served
 *     exactly today's doors.
 * EXECUTED wherever it can be: `viewerDoorsFor` and `loadHubViewer` run; the hub, the footer, the classic bar's More, the
 * rail's More and the avatar menu (opened) are rendered with react-dom/server; every page that answers a direct visit is RUN
 * from its own source (esbuild, only its data reads stood in for) and rendered — in sw, en and zh, on a break and off it.
 * The shell (`app-shell.tsx`) is read: its three answers are pinned, then executed against the one rule. A census of every
 * path to the three programmes fails on a new one until it is classified here. Each rule has a control or a plant beside it;
 * the on-disk mutation proof is S/r8/c/mutation-proof.cjs.
 * ⚠️ This file carries no backslash: line ends and escapes are built from code points, so no tool can rewrite one on the way
 * to disk.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, posix } from "node:path";
import { createRequire } from "node:module";
import { decomment } from "./lib/decomment.mts";

if (process.env.DATABASE_URL !== undefined) {
  console.log("FAIL 0.guard · REFUSED — DATABASE_URL is set: this suite runs on stand-ins and the in-memory store only.");
  process.exit(1);
}
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-aaaa";
process.env.OTP_PEPPER ??= "test-only-otp-pepper-16chars";

const req = createRequire(import.meta.url);
const LF = String.fromCharCode(10);
const CR = String.fromCharCode(13);
const ROOT = process.cwd().split(String.fromCharCode(92)).join("/");

let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};
const section = (s: string) => console.log(`${LF}── ${s} ${"─".repeat(Math.max(0, 110 - s.length))}`);
const raw = (p: string) => readFileSync(join(ROOT, p), "utf8").split(CR + LF).join(LF);
const code = (p: string) => decomment(raw(p));
const squash = (s: string) => s.split(LF).join(" ").replace(/[ ]+/g, " ");
const has = (src: string, snippet: string) => squash(src).includes(squash(snippet));
const count = (s: string, needle: string) => s.split(needle).length - 1;
const j = (v: unknown) => JSON.stringify(v);
const decode = (s: string) => s.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
const textOf = (markup: string) => decode(markup.replace(/<[^>]+>/g, ""));
const hrefsOf = (markup: string) => [...markup.matchAll(/<a [^>]*href="([^"]*)"/g)].map((m) => decode(m[1]));
/** Every button's words. `BackLink` is a button (history back, its fallback pushed on a direct visit), never an `<a>`. */
const BUTTON_RE = new RegExp("<button[^>]*>([^]*?)</button>", "g");
const buttonTexts = (markup: string) => [...markup.matchAll(BUTTON_RE)].map((m) => textOf(m[1]));
const backTo = (markup: string, label: string) => buttonTexts(markup).some((b) => b.includes(label));

/** The three programmes' routes — the population this ruling is about. */
type Fam = "invite" | "proposals" | "agent";
const familyOf = (href: string): Fam | null => {
  const path = href.split("?")[0].split("#")[0];
  if (path === "/profile/invite" || path.startsWith("/profile/invite/")) return "invite";
  if (path === "/proposals" || path.startsWith("/proposals/")) return "proposals";
  if (path === "/agent" || path.startsWith("/agent/")) return "agent";
  return null;
};
const offerHrefs = (markup: string) => hrefsOf(markup).filter((x) => familyOf(x) !== null);

/* ── the dictionary, the break, and the world a component renders in ────────────────────────────────────────────────── */
const { dict } = await import("../src/lib/i18n-dict.ts");
type L = "sw" | "en" | "zh";
const LOCALES: L[] = ["sw", "en", "zh"];
const T = dict as unknown as Record<L, typeof dict.en>;
const { breakSentence, breakStateOf } = req("../src/lib/break-end.ts") as typeof import("../src/lib/break-end.ts");
const NOW = Date.now();
const UNTIL = new Date(NOW + 26 * 3_600_000 + 7 * 60_000).toISOString(); // a running break, about a day ahead
type Lock = { locked: boolean; until: string | null; reason: string | null; coolingUntil: string | null; exclusionUntil: string | null };
const LOCK_BREAK: Lock = { locked: true, until: UNTIL, reason: "cooling_off", coolingUntil: UNTIL, exclusionUntil: null };
const LOCK_EXCL: Lock = { locked: true, until: UNTIL, reason: "self_exclusion", coolingUntil: null, exclusionUntil: UNTIL };
const LOCK_NONE: Lock = { locked: false, until: null, reason: null, coolingUntil: null, exclusionUntil: null };
type LockCase = Lock | "throws";
const sentenceOf = (l: L, exclusion: boolean) =>
  breakSentence(exclusion ? T[l].rg.exclusionActive : T[l].rg.breakActive, UNTIL, NOW, T[l].common.monthsShort, l);
const lockStub = (lock: LockCase, calls?: { lock: number }) => ({
  isLockedOut: async () => {
    if (calls) calls.lock++;
    if (lock === "throws") throw new Error("the settings row could not be read");
    return lock;
  },
});

const React = req("react") as typeof import("react");
const h = React.createElement;
const { renderToStaticMarkup } = req("react-dom/server") as typeof import("react-dom/server");
const { AppRouterContext } = req("next/dist/shared/lib/app-router-context.shared-runtime") as { AppRouterContext: import("react").Context<unknown> };
const { PathnameContext } = req("next/dist/shared/lib/hooks-client-context.shared-runtime") as { PathnameContext: import("react").Context<string | null> };
const ROUTER = { push() {}, replace() {}, refresh() {}, prefetch() {}, back() {}, forward() {}, hmrRefresh() {} };
const { I18nProvider } = req("../src/lib/i18n.tsx") as { I18nProvider: unknown };
const render = (l: L, el: unknown, path = "/") => renderToStaticMarkup(h(AppRouterContext.Provider, { value: ROUTER },
  h(PathnameContext.Provider, { value: path }, h(I18nProvider as never, { initial: l } as never, el as never))));

/* ── RUNNING A MODULE FROM ITS OWN SOURCE ─────────────────────────────────────────────────────────────────────────────
 * The file's text (or a planted copy) is compiled by esbuild to CommonJS and run with `require` answered here: a named
 * stand-in where the suite gives one (a data read, a heavy client island), the REAL module everywhere else. So a page's
 * own branches and markup run, on the real dictionary and the real kit, and only what it reads is stood in for. */
const esbuild = req("esbuild") as { transformSync: (c: string, o: Record<string, unknown>) => { code: string } };
const resolveSrc = (rel: string): string | null => {
  for (const ext of ["", ".tsx", ".ts", "/index.tsx", "/index.ts"]) {
    const p = `${rel}${ext}`;
    if (existsSync(join(ROOT, p)) && statSync(join(ROOT, p)).isFile()) return p;
  }
  return null;
};
type Stubs = Record<string, unknown>;
function runText(file: string, text: string, stubs: Stubs): Record<string, unknown> {
  const js = esbuild.transformSync(text, { loader: "tsx", format: "cjs", jsx: "automatic", target: "es2022", sourcefile: file }).code;
  const dir = posix.dirname(file);
  const own = (k: string) => Object.prototype.hasOwnProperty.call(stubs, k);
  const localRequire = (spec: string): unknown => {
    if (own(spec)) return stubs[spec];
    const rel = spec.startsWith("@/") ? `src/${spec.slice(2)}`
      : spec.startsWith("./") || spec.startsWith("../") ? posix.normalize(posix.join(dir, spec)) : null;
    if (rel === null) return req(spec);
    const path = resolveSrc(rel);
    if (path === null) throw new Error(`cannot resolve ${spec} from ${file}`);
    if (own(path)) return stubs[path];
    return req(join(ROOT, path));
  };
  const mod = { exports: {} as Record<string, unknown> };
  new Function("require", "module", "exports", js)(localRequire, mod, mod.exports);
  return mod.exports;
}
class Redirected extends Error { to: string; constructor(to: string) { super(`redirect ${to}`); this.to = to; } }
class NotFoundThrown extends Error { constructor() { super("notFound"); } }
const NAV = { redirect: (to: string) => { throw new Redirected(to); }, notFound: () => { throw new NotFoundThrown(); } };
const COMMON = (l: L): Stubs => ({
  "next/navigation": NAV,
  "@/lib/i18n-server": { getServerT: async () => ({ t: T[l], locale: l }) },
});
const HEADERS = { headers: async () => new Headers({ host: "50pick.tz", "x-forwarded-proto": "https" }) };

/* ══ §0 · REGISTRATION ═════════════════════════════════════════════════════════════════════════════════════════════════ */
section("0 · registered");
{
  const pkg = JSON.parse(raw("package.json")) as { scripts: Record<string, string> };
  ok("0.1 · test:visual-pass-r8c runs scripts/visual-pass-r8c.test.mts", pkg.scripts["test:visual-pass-r8c"] === "tsx scripts/visual-pass-r8c.test.mts");
}

/* ══ §1 · THE ONE RULE — `viewerDoorsFor` ══════════════════════════════════════════════════════════════════════════════ */
section("1 · viewerDoorsFor — on a break the three offers close, and only they do (executed over the whole grid)");
const DOORS = req("../src/lib/journey/viewer-doors.ts") as typeof import("../src/lib/journey/viewer-doors.ts");
const FS = req("../src/lib/feature-state.ts") as typeof import("../src/lib/feature-state.ts");
const ROLES = req("../src/lib/server/roles.ts") as { isStaffRole: (r: unknown) => boolean };
type DoorsIn = Parameters<typeof DOORS.viewerDoorsFor>[0];
type Doors = ReturnType<typeof DOORS.viewerDoorsFor>;
const VIEWERS: Array<[string, unknown, string | null]> = [
  ["guest", FS.NO_VIEWER, null],
  ["failed", null, null],
  ["player", { role: "PLAYER", agentInGoodStanding: false, playerInviteEligible: true }, "PLAYER"],
  ["player.closed", { role: "PLAYER", agentInGoodStanding: false, playerInviteEligible: false }, "PLAYER"],
  ["agent.standing", { role: "AGENT", agentInGoodStanding: true, playerInviteEligible: false }, "AGENT"],
  ["agent.lapsed", { role: "AGENT", agentInGoodStanding: false, playerInviteEligible: false }, "AGENT"],
  ["support", { role: "SUPPORT", agentInGoodStanding: false, playerInviteEligible: false }, "SUPPORT"],
];
const STATES = ["ACTIVE", "COMING_SOON", "MAINTENANCE", "DISABLED"] as const;
const GRID: DoorsIn[] = VIEWERS.flatMap(([, v, role]) => [false, true].flatMap((invitePayable) => [false, true].flatMap((agentEnabled) =>
  STATES.map((proposalsState) => ({ inviteViewer: v as never, invitePayable, agentEnabled, proposalsState, role, onBreak: false })))));
/** TODAY's formulas, written out here — the answer a reader NOT on a break must still get, door for door. */
const today = (i: DoorsIn): Doors => {
  const st = !!(i.inviteViewer as { agentInGoodStanding?: boolean } | null)?.agentInGoodStanding;
  return { inviteVisible: FS.inviteIsLiveFor(i.inviteViewer), invitePaid: i.invitePayable || st, agentDoorVisible: i.agentEnabled || st,
    proposalsVisible: i.proposalsState !== "DISABLED", staffConsole: ROLES.isStaffRole(i.role) };
};
const onBreakWant = (i: DoorsIn): Doors => ({ ...today(i), inviteVisible: false, agentDoorVisible: false, proposalsVisible: false });
const gridDefects = (impl: (i: DoorsIn) => Doors) => {
  const off = GRID.filter((i) => j(impl(i)) !== j(today(i))).length;
  const on = GRID.filter((i) => j(impl({ ...i, onBreak: true })) !== j(onBreakWant(i))).length;
  return { off, on };
};
{
  const real = gridDefects(DOORS.viewerDoorsFor);
  ok(`1.1 · EXECUTED · off a break, every one of the ${GRID.length} readers gets exactly today's five answers`, real.off === 0, `${real.off} differ`);
  ok(`1.2 · EXECUTED · on a break, invite, the agent door and proposals close for every reader — "paid" (a word) and the console stand as they were`, real.on === 0, `${real.on} differ`);
  const opens = { invite: GRID.filter((i) => today(i).inviteVisible).length, agent: GRID.filter((i) => today(i).agentDoorVisible).length, proposals: GRID.filter((i) => today(i).proposalsVisible).length };
  ok("1.2′ CONTROL · the grid holds readers to whom each of the three is open off a break (so 1.2 closes real doors)", opens.invite > 0 && opens.agent > 0 && opens.proposals > 0, j(opens));
  const plants: Array<[string, (i: DoorsIn) => Doors, "on" | "off"]> = [
    ["invite ignores the break", (i) => ({ ...DOORS.viewerDoorsFor(i), inviteVisible: today(i).inviteVisible }), "on"],
    ["the agent door ignores the break", (i) => ({ ...DOORS.viewerDoorsFor(i), agentDoorVisible: today(i).agentDoorVisible }), "on"],
    ["proposals ignores the break", (i) => ({ ...DOORS.viewerDoorsFor(i), proposalsVisible: today(i).proposalsVisible }), "on"],
    ["the break also takes the console", (i) => ({ ...DOORS.viewerDoorsFor(i), staffConsole: i.onBreak ? false : DOORS.viewerDoorsFor(i).staffConsole }), "on"],
    ["the term inverted (closed when NOT on a break)", (i) => DOORS.viewerDoorsFor({ ...i, onBreak: !i.onBreak }), "off"],
  ];
  const missed = plants.filter(([, impl, side]) => gridDefects(impl)[side] === 0).map(([n]) => n);
  ok(`1.3 PLANT · ${plants.map(([n]) => n).join(" · ")} — each reported`, missed.length === 0, missed.join(", "));
  const vd = code("src/lib/journey/viewer-doors.ts");
  ok("1.4 · `onBreak` is REQUIRED (no caller can forget it) and the three offers read one term, `const offers = !i.onBreak;`",
    /onBreak: boolean;/.test(vd) && !/onBreak[?]: /.test(vd) && has(vd, "const offers = !i.onBreak;") && has(vd, "inviteVisible: offers && inviteIsLiveFor(i.inviteViewer),")
      && has(vd, "agentDoorVisible: offers && (i.agentEnabled || inStanding),") && has(vd, 'proposalsVisible: offers && i.proposalsState !== "DISABLED",'));
}

/* ══ §2 · THE HUB'S READER — `loadHubViewer` ════════════════════════════════════════════════════════════════════════════ */
section("2 · loadHubViewer — the break it reads in its batch closes the three doors; a failed read is no break (executed)");
const HV = req("../src/lib/server/hub-viewer.ts") as typeof import("../src/lib/server/hub-viewer.ts");
const PLAYER_VIEWER = { role: "PLAYER", agentInGoodStanding: false, playerInviteEligible: true };
const AGENT_VIEWER = { role: "AGENT", agentInGoodStanding: true, playerInviteEligible: false };
const hubDeps = (lock: LockCase | "absent", agent = false) => ({
  user: async () => ({ id: "u1", phoneE164: "+255712345678", displayName: "Jina Lako", role: agent ? "AGENT" : "PLAYER", status: "ACTIVE" }) as never,
  wallet: async () => ({ balance: 5000, status: "ACTIVE" }) as never,
  kyc: async () => null,
  inviteViewer: async () => (agent ? AGENT_VIEWER : PLAYER_VIEWER) as never,
  invitePayable: async () => false,
  agentEnabled: () => true,
  proposalsState: () => "ACTIVE" as const,
  ...(lock === "absent" ? {} : { lockout: async () => { if (lock === "throws") throw new Error("down"); return lock; } }),
});
type Member = Extract<Awaited<ReturnType<typeof HV.loadHubViewer>>, { signedIn: true }>;
const member = async (lock: LockCase | "absent", agent = false) => (await HV.loadHubViewer("u1", hubDeps(lock, agent) as never)) as Member;
const offersOpen = (d: Doors) => [d.inviteVisible, d.agentDoorVisible, d.proposalsVisible];
{
  const b = await member(LOCK_BREAK), x = await member(LOCK_EXCL), n = await member(LOCK_NONE), f = await member("throws"), a = await member("absent");
  ok("2.1 · EXECUTED · a running break: no invite, no agent door, no proposals — and Pumzika's status still has its end",
    j(offersOpen(b.doors)) === j([false, false, false]) && b.breakEnd?.until === UNTIL && b.breakEnd.exclusion === false, j({ doors: b.doors, end: b.breakEnd }));
  ok("2.2 · EXECUTED · a self-exclusion running: the same three closed", j(offersOpen(x.doors)) === j([false, false, false]) && x.breakEnd?.exclusion === true, j(x.doors));
  ok("2.3 · EXECUTED · CONTROL · no break: the three are open, exactly viewerDoorsFor's answer for this reader",
    j(offersOpen(n.doors)) === j([true, true, true]) && n.breakEnd === null, j(n.doors));
  ok("2.4 · EXECUTED · a failed break read is NO break (it gates an offer, never a refusal): today's doors, no status",
    j(f.doors) === j(n.doors) && f.breakEnd === null, j(f.doors));
  ok("2.5 · EXECUTED · a reader composed with no break read at all: today's doors", j(a.doors) === j(n.doors) && a.breakEnd === null);
  const ag = await member(LOCK_BREAK, true), agOff = await member(LOCK_NONE, true);
  ok("2.6 · EXECUTED · an agent in standing on a break: the dashboard door and Kuwa wakala close too; 'paid' stays (a word, not a door)",
    !ag.doors.inviteVisible && !ag.doors.agentDoorVisible && ag.doors.invitePaid && agOff.doors.inviteVisible && agOff.doors.agentDoorVisible, j({ ag: ag.doors, off: agOff.doors }));
  const hv = code("src/lib/server/hub-viewer.ts");
  ok("2.7 · the reader reads the break ONCE, in its batch, and hands it to viewerDoorsFor as `onBreak: breakEnd !== null` (one definition, no re-spelling)",
    has(hv, 'const breakEnd = lock.status === "fulfilled" && lock.value ? breakStateOf(lock.value) : null;') && has(hv, "onBreak: breakEnd !== null,")
      && count(hv, "breakStateOf(") === 1 && count(hv, "viewerDoorsFor(") === 1);
}

/* ══ §3 · THE HUB, RENDERED ════════════════════════════════════════════════════════════════════════════════════════════ */
section("3 · the Akaunti hub (journey) — on a break no Alika, Mapendekezo or Kuwa wakala; everything else as it is (3 locales)");
const ROWS = req("../src/components/journey/account/hub-rows.ts") as typeof import("../src/components/journey/account/hub-rows.ts");
const { HubRowItem } = req("../src/components/journey/account/hub-row.tsx") as { HubRowItem: unknown };
type HubRowT = ReturnType<typeof ROWS.hubRowsFor>[number]["rows"][number];
const layout = (groups: ReturnType<typeof ROWS.hubRowsFor>) => groups.map((g) => `${g.key}:${g.rows.map((r) => r.id).join(",")}`).join(" | ");
const hubMarkup = (l: L, v: Member) => ROWS.hubRowsFor(v).flatMap((g) => g.rows).filter((r: HubRowT) => r.kind === "link")
  .map((row: HubRowT) => render(l, h(HubRowItem as never, { row, t: T[l], viewer: v, locale: l } as never), "/account")).join("");
{
  const on = await member(LOCK_BREAK), off = await member(LOCK_NONE), agOn = await member(LOCK_BREAK, true), agOff = await member(LOCK_NONE, true);
  const bad: string[] = [];
  for (const l of LOCALES) {
    const mOn = hubMarkup(l, on), mOff = hubMarkup(l, off), aOn = hubMarkup(l, agOn);
    if (offerHrefs(mOn).length) bad.push(`${l}: a door on a break: ${offerHrefs(mOn).join(",")}`);
    if (offerHrefs(aOn).length) bad.push(`${l}: an agent's door on a break: ${offerHrefs(aOn).join(",")}`);
    const want = [["/profile/invite", T[l].profile.inviteFriends], ["/proposals", T[l].proposals.title], ["/agent", T[l].agent.footerLink]];
    for (const [href, word] of want) if (!hrefsOf(mOff).includes(href) || !textOf(mOff).includes(word)) bad.push(`${l}: off a break ${href} (${word}) is not drawn`);
    if (!mOn.includes('data-testid="hub-status-break"')) bad.push(`${l}: Pumzika lost its status line`);
  }
  ok("3.1 · RENDERED · on a break (a player, an agent) no row leads to /profile/invite, /proposals or /agent; off a break all three are drawn in their own words", bad.length === 0, bad.join("; "));
  const keysOn = ROWS.hubRowsFor(on).map((g) => g.key), keysAg = ROWS.hubRowsFor(agOn).map((g) => g.key);
  ok("3.2 · on a break the invite card and the agent card are not drawn at all (a card with nothing for the reader is not drawn)",
    !keysOn.includes("invite") && !keysOn.includes("agent") && !keysAg.includes("invite") && !keysAg.includes("agent"), j({ keysOn, keysAg }));
  const offWithout = layout(ROWS.hubRowsFor(off).filter((g) => g.key !== "invite" && g.key !== "agent"));
  ok("3.3 · nothing else moves: every other card and row is the same on and off a break — money (Toa pesa too), play, play safe (Weka mipaka · Pumzika · Jizuie), profile, help, settings",
    layout(ROWS.hubRowsFor(on)) === offWithout && layout(ROWS.hubRowsFor(on)).includes("safety:limits,break,exclude") && layout(ROWS.hubRowsFor(on)).includes("money:wallet,withdraw"),
    j({ on: layout(ROWS.hubRowsFor(on)), off: offWithout }));
  const agentOffKeys = ROWS.hubRowsFor(agOff).map((g) => g.key);
  ok("3.3′ CONTROL · off a break the agent reader has both cards (the dashboard and Kuwa wakala)", agentOffKeys.includes("invite") && agentOffKeys.includes("agent"), j(agentOffKeys));
}

/* ══ §4 · THE SHELL — where the chrome's answers are decided ═══════════════════════════════════════════════════════════ */
section("4 · AppShell — one break term in its three answers, from the row it already holds, on the server (read, then executed)");
const SHELL_FILE = "src/components/layout/app-shell.tsx";
const SHELL = code(SHELL_FILE);
const L_PROPOSALS = `const proposalsState = promoSuppressed ? "DISABLED" : getProposalsConfig().state;`;
const L_INVITE = "const inviteVisible = !promoSuppressed && inviteIsLiveFor(inviteViewer);";
const L_AGENT = "const agentDoorVisible = !promoSuppressed && (getAgentConfig().enabled || inviteViewer.agentInGoodStanding);";
const shellAnswersOk = (src: string) => count(src, L_PROPOSALS) === 1 && count(src, L_INVITE) === 1 && count(src, L_AGENT) === 1;
const breakSourceOk = (src: string) => /let promoSuppressed = false;/.test(src) && has(src, "until(rg?.selfExclusionUntil) > now || until(rg?.coolingOffUntil) > now;")
  && has(src, "getRgSettings(session.userId),") && !src.includes("isLockedOut(") && !/^[ ]*["']use client["']/m.test(src);
{
  ok("4.1 · the break is the shell's own `promoSuppressed`: false by default (a guest, a failed read), the running timers of the settings row already in its batch, no second query, and the shell is a server component",
    breakSourceOk(SHELL));
  ok("4.1′ PLANT · a client directive on the shell, or the derivation from a fresh read, is reported",
    !breakSourceOk(`"use client";${LF}${SHELL}`) && !breakSourceOk(SHELL.replace("getRgSettings(session.userId),", "isLockedOut(session.userId),")));
  ok("4.2 · the three answers carry it: proposals DISABLED for a reader on a break, invite and the agent door `!promoSuppressed && …`", shellAnswersOk(SHELL));
  ok("4.2′ PLANT · each answer without its break term is reported",
    [L_PROPOSALS, L_INVITE, L_AGENT].every((line) => !shellAnswersOk(SHELL.replace(line, line.replace("!promoSuppressed && ", "").replace('promoSuppressed ? "DISABLED" : ', "")))));
  const props = { proposals: count(SHELL, "proposalsState={proposalsState}"), invite: count(SHELL, "inviteVisible={inviteVisible}"), agent: count(SHELL, "agentDoorVisible={agentDoorVisible}") };
  ok("4.3 · every chrome element is handed exactly these answers: proposals and invite to the journey bar, the classic bar, both footers and the rail (5 each), the agent door to both footers (2)",
    props.proposals === 5 && props.invite === 5 && props.agent === 2, j(props));
  // EXECUTED: the shell's three lines, as written, against the one rule — door for door, across the grid, on and off a break.
  const fn = new Function("promoSuppressed", "inviteIsLiveFor", "inviteViewer", "getAgentConfig", "getProposalsConfig",
    `${L_PROPOSALS}${LF}${L_INVITE}${LF}${L_AGENT}${LF}return { proposalsState, inviteVisible, agentDoorVisible };`) as
    (b: boolean, f: typeof FS.inviteIsLiveFor, v: unknown, a: () => { enabled: boolean }, p: () => { state: string }) => { proposalsState: string; inviteVisible: boolean; agentDoorVisible: boolean };
  const drift: string[] = [];
  for (const i of GRID) for (const onBreak of [false, true]) {
    // The shell holds NO_VIEWER where the hub may hold null (a failed read) — `let inviteViewer: InviteViewer = NO_VIEWER`.
    const s = fn(onBreak, FS.inviteIsLiveFor, i.inviteViewer ?? FS.NO_VIEWER, () => ({ enabled: i.agentEnabled }), () => ({ state: i.proposalsState }));
    const d = DOORS.viewerDoorsFor({ ...i, onBreak });
    if (s.inviteVisible !== d.inviteVisible || s.agentDoorVisible !== d.agentDoorVisible || (s.proposalsState !== "DISABLED") !== d.proposalsVisible) drift.push(j({ i, onBreak, s, d }));
  }
  ok(`4.4 · EXECUTED · the shell's three lines, as written, answer what viewerDoorsFor answers — ${GRID.length * 2} readers, on and off a break`, drift.length === 0, drift.slice(0, 2).join(" ; "));
  const CHROME = ["src/components/layout/top-app-bar.tsx", "src/components/layout/avatar-menu.tsx", "src/components/layout/bottom-nav.tsx",
    "src/components/layout/public-footer.tsx", "src/components/journey/journey-top-bar.tsx"];
  // A READ of the break, not a link to the RG pages (the footer's play-safe column links them, rightly).
  const reads = CHROME.filter((f) => { const s = code(f); return /isLockedOut|getRgSettings|coolingOffUntil|selfExclusionUntil/.test(s) || s.includes("@/lib/server/responsible-gambling"); });
  ok("4.5 · no chrome file reads the break itself — each door is gated only on the answer the server handed it (nothing a slow phone or a crawler could see first)",
    reads.length === 0, reads.join(", "));
  const gates = [
    has(code(CHROME[0]), '...(proposalsState !== "DISABLED" ? [{ href: "/proposals"') && has(code(CHROME[0]), '...(inviteVisible ? [{ href: "/profile/invite"'),
    has(code(CHROME[1]), '.filter((r) => (!r.proposals || proposalsState !== "DISABLED") && (!r.invite || inviteVisible)'),
    has(code(CHROME[2]), 'proposalsState !== "DISABLED" ? [{ href: "/proposals"') && has(code(CHROME[2]), 'inviteVisible ? [{ href: "/profile/invite"'),
    has(code(CHROME[3]), '{proposalsState !== "DISABLED" && ( <FooterLink href="/proposals"') && has(code(CHROME[3]), '{inviteVisible && <FooterLink href="/profile/invite">')
      && has(code(CHROME[3]), '{agentDoorVisible && <FooterLink href="/agent">'),
  ];
  ok("4.6 · and each chrome door IS gated on that answer: the bar's More, the avatar menu, the rail's More, the footer", gates.every(Boolean), j(gates));
}

/* ══ §5 · THE CHROME, RENDERED ═════════════════════════════════════════════════════════════════════════════════════════ */
section("5 · the chrome, rendered with the shell's answers — classic and journey, on and off a break (3 locales)");
const BREAK_PROPS = { proposalsState: "DISABLED", inviteVisible: false, agentDoorVisible: false };
const OPEN_PROPS = { proposalsState: "ACTIVE", inviteVisible: true, agentDoorVisible: true };
{
  const { PublicFooter } = req("../src/components/layout/public-footer.tsx") as { PublicFooter: unknown };
  // The support contacts come from their one owner (test:support-contact §8: no literal outside support-config.ts).
  const { SUPPORT_DEFAULTS } = req("../src/lib/support-config.ts") as typeof import("../src/lib/support-config.ts");
  const BASE = { supportEmail: SUPPORT_DEFAULTS.email, supportPhone: SUPPORT_DEFAULTS.phone, supportPhoneTel: SUPPORT_DEFAULTS.phoneTel };
  const foot = (l: L, props: Record<string, unknown>, journey: boolean) =>
    render(l, h(PublicFooter as never, { ...BASE, ...props, ...(journey ? { journeyShown: true, invitePaid: false, inviteAgent: false } : {}) } as never));
  const playSafe = (m: string) => { const a = m.indexOf(T.sw.footer.playSafe); return a; };
  const bad: string[] = [];
  for (const l of LOCALES) for (const journey of [false, true]) {
    const on = foot(l, BREAK_PROPS, journey), off = foot(l, OPEN_PROPS, journey);
    const tag = `${l}/${journey ? "journey" : "classic"}`;
    if (offerHrefs(on).length) bad.push(`${tag}: on a break ${offerHrefs(on).join(",")}`);
    const words = journey ? [T[l].proposals.title, T[l].profile.inviteFriends, T[l].agent.footerLink] : [T[l].footer.proposeGetPaid, T[l].profile.inviteFriends, T[l].agent.footerLink];
    for (const [href, w] of [["/proposals", words[0]], ["/profile/invite", words[1]], ["/agent", words[2]]]) if (!hrefsOf(off).includes(href) || !textOf(off).includes(w)) bad.push(`${tag}: off a break ${href} not drawn`);
    // The play-safe column and every other door are the same on and off a break.
    const rest = (m: string) => hrefsOf(m).filter((x) => familyOf(x) === null).join(" ");
    if (rest(on) !== rest(off)) bad.push(`${tag}: another door moved (${rest(on)} vs ${rest(off)})`);
    for (const x of ["/profile/responsible-gambling", "/legal/responsible-gambling", `tel:${SUPPORT_DEFAULTS.phoneTel}`, `mailto:${SUPPORT_DEFAULTS.email}`]) if (!hrefsOf(on).includes(x)) bad.push(`${tag}: ${x} missing on a break`);
    if (!textOf(on).includes(T[l].footer.stopGambling) || !textOf(on).includes(T[l].footer.takeABreak)) bad.push(`${tag}: an RG line missing on a break`);
  }
  ok("5.1 · RENDERED · the footer (both shells): on a break no Pendekeza, Alika or Kuwa wakala link; every other door, the play-safe column, the desk line and the RG sentence unchanged; off a break the three in today's words",
    bad.length === 0 && playSafe(foot("sw", OPEN_PROPS, false)) >= 0, bad.join("; "));

  // The classic bar's More (from 1024) — NavMore stood in by a drawing of exactly the items the bar hands it.
  const navMore = { NavMore: (p: { items: Array<{ href: string; label: string }> }) => h("div", { "data-stub": "nav-more" }, p.items.map((it) => h("a", { key: it.href, href: it.href }, it.label))) };
  const barMod = runText("src/components/layout/top-app-bar.tsx", raw("src/components/layout/top-app-bar.tsx"), {
    "@/components/layout/nav-more": navMore,
    "@/components/layout/avatar-menu": { AvatarMenu: (p: Record<string, unknown>) => h("span", { "data-stub": "avatar", "data-invite": String(p.inviteVisible), "data-proposals": String(p.proposalsState) }) },
    "@/components/layout/notifications-panel": { NotificationsPanel: () => null },
    "@/components/layout/wallet-balance-pill": { WalletBalancePill: () => null, useLiveBalance: (b: number) => b },
    "@/components/ui/language-menu": { LanguageMenu: () => null },
  });
  const USER = { initials: "JL", name: "Jina Lako", phone: "+255*****78", isAuthed: true, balance: 5000, walletHeld: false };
  const more = (m: string) => { const a = m.indexOf('data-stub="nav-more"'); return a < 0 ? "" : m.slice(a, m.indexOf("</div>", a)); };
  const barBad: string[] = [];
  for (const l of LOCALES) {
    const on = render(l, h(barMod.TopAppBar as never, { user: USER, proposalsState: "DISABLED", inviteVisible: false, invitePaid: false } as never), "/markets");
    const off = render(l, h(barMod.TopAppBar as never, { user: USER, proposalsState: "ACTIVE", inviteVisible: true, invitePaid: false } as never), "/markets");
    if (offerHrefs(more(on)).length) barBad.push(`${l}: More on a break ${offerHrefs(more(on))}`);
    if (!hrefsOf(more(off)).includes("/proposals") || !hrefsOf(more(off)).includes("/profile/invite")) barBad.push(`${l}: More off a break lost a door`);
    if (j(hrefsOf(more(on))) !== j(hrefsOf(more(off)).filter((x) => familyOf(x) === null))) barBad.push(`${l}: More's other rows moved`);
    if (!on.includes('data-invite="false" data-proposals="DISABLED"')) barBad.push(`${l}: the avatar menu was not handed the break's answers`);
  }
  ok("5.2 · RENDERED · the classic bar's More (signed in, from 1024): on a break no Pendekeza, no Alika marafiki — Pochi and Bingwa stay; off a break both; the avatar menu is handed the same answers",
    barBad.length === 0, barBad.join("; "));

  const railMod = runText("src/components/layout/bottom-nav.tsx", raw("src/components/layout/bottom-nav.tsx"), { "@/components/layout/nav-more": navMore });
  const railBad: string[] = [];
  for (const l of LOCALES) {
    const on = render(l, h(railMod.BottomNav as never, { isAuthed: true, proposalsState: "DISABLED", inviteVisible: false, walletHeld: false } as never), "/markets");
    const off = render(l, h(railMod.BottomNav as never, { isAuthed: true, proposalsState: "ACTIVE", inviteVisible: true, walletHeld: false } as never), "/markets");
    if (offerHrefs(more(on)).length) railBad.push(`${l}: rail More on a break ${offerHrefs(more(on))}`);
    if (!hrefsOf(more(off)).includes("/proposals") || !hrefsOf(more(off)).includes("/profile/invite")) railBad.push(`${l}: rail More off a break lost a door`);
    if (j(hrefsOf(more(on))) !== j(hrefsOf(more(off)).filter((x) => familyOf(x) === null))) railBad.push(`${l}: the rail's other rows moved`);
    const slots = (m: string) => hrefsOf(m.slice(0, m.indexOf('data-stub="nav-more"'))).join(" ");
    if (slots(on) !== slots(off) || !slots(on).includes("/wallet/deposit")) railBad.push(`${l}: the rail's slots moved (${slots(on)})`);
  }
  ok("5.3 · RENDERED · the classic rail's More (below 1024): on a break no Alika marafiki, no Pendekeza — Matokeo, Nafasi, Pochi, Bingwa stay, and the slots (the coin included) do not move",
    railBad.length === 0, railBad.join("; "));

  // The avatar menu, OPENED: its own `open` state starts true here, the portal draws in place (no DOM on the server).
  const openReact = { ...React, useState: (init: unknown) => (init === false ? [true, () => {}] : React.useState(init as never)) };
  const avatarMod = runText("src/components/layout/avatar-menu.tsx", raw("src/components/layout/avatar-menu.tsx"), {
    react: openReact,
    "react-dom": { createPortal: (node: unknown) => node },
    "@/components/ui/modal": { useExitPhase: (open: boolean) => ({ present: open, exiting: false }) },
    "@/components/ui/confirm-dialog": { ConfirmDialog: (p: { trigger: unknown }) => p.trigger },
    "@/components/layout/needle-drawer": { NeedleControlsDrawer: () => null },
  });
  const g = globalThis as unknown as { document?: unknown };
  const openMenu = (l: L, props: Record<string, unknown>) => {
    const had = "document" in g;
    if (!had) g.document = {};
    try {
      return render(l, h(avatarMod.AvatarMenu as never, { initials: "JL", name: "Jina Lako", phone: "+255••••78", isAuthed: true, seed: "u1", isAdmin: false, ...props } as never), "/markets");
    } finally { if (!had) delete g.document; }
  };
  const menuBad: string[] = [];
  for (const l of LOCALES) for (const journey of [false, true]) {
    const extra = journey ? { journey: true, kycOffered: true, inviteAgent: false } : {};
    const on = openMenu(l, { proposalsState: "DISABLED", inviteVisible: false, invitePaid: false, ...extra });
    const off = openMenu(l, { proposalsState: "ACTIVE", inviteVisible: true, invitePaid: false, ...extra });
    const tag = `${l}/${journey ? "journey" : "classic"}`;
    if (!/role="menu"/.test(on)) menuBad.push(`${tag}: the menu did not open`);
    if (offerHrefs(on).length) menuBad.push(`${tag}: on a break ${offerHrefs(on).join(",")}`);
    if (!hrefsOf(off).includes("/proposals") || !hrefsOf(off).includes("/profile/invite")) menuBad.push(`${tag}: off a break a door is missing`);
    const rest = (m: string) => hrefsOf(m).filter((x) => familyOf(x) === null).join(" ");
    if (rest(on) !== rest(off) || !rest(on).includes("/profile") || !rest(on).includes("/wallet")) menuBad.push(`${tag}: another row moved (${rest(on)})`);
    if (!textOf(on).includes(T[l].common.signOut)) menuBad.push(`${tag}: sign-out missing`);
  }
  ok("5.4 · RENDERED · the avatar menu, opened (classic and journey): on a break no Invite & Earn / Alika and no Propose & earn / Mapendekezo rows — Wasifu, Pochi, the tickets, Matokeo, Bingwa, the KYC row and Sign out stay; off a break both rows",
    menuBad.length === 0, menuBad.join("; "));
  ok("5.5 · the journey header hands its avatar menu the shell's answers unchanged (no door decided in the bar itself)",
    has(code("src/components/journey/journey-top-bar.tsx"), "proposalsState={proposalsState} inviteVisible={inviteVisible} inviteAgent={inviteAgent} kycOffered={kycOffered} invitePaid={invitePaid} journey"));
}

/* ══ §6 · /profile — its invite row ════════════════════════════════════════════════════════════════════════════════════ */
section("6 · /profile — on a break no row offers the invite (or an agent's dashboard); every other row stays (RUN, 3 locales)");
const PROFILE = "src/app/profile/page.tsx";
async function profileMarkup(l: L, lock: LockCase, agent = false, text = raw(PROFILE)): Promise<string> {
  const mod = runText(PROFILE, text, {
    ...COMMON(l),
    "@/lib/server/auth-service": { currentSession: async () => ({ userId: "u1", phoneE164: "+255712345678" }) },
    "@/lib/server/store": { db: {
      user: { findById: async () => ({ id: "u1", phoneE164: "+255712345678", displayName: "Jina Lako", role: agent ? "AGENT" : "PLAYER", status: "ACTIVE", avatarDataUrl: null, region: null, email: null, emailVerifiedAt: null }) },
      wallet: { findByUserId: async () => ({ balance: 5000, status: "ACTIVE" }) },
      kyc: { findByUserId: async () => null },
      sourceOfFunds: { get: async () => null },
    } },
    "@/lib/server/affiliate-service": { inviteViewerFor: async () => (agent ? AGENT_VIEWER : PLAYER_VIEWER) },
    "@/lib/server/market-service": { listPositionsForUser: async () => [] },
    "@/lib/server/achievements": { computeAchievementShelf: async () => [] },
    "@/lib/server/invite-rewards-switch": { invitePaysPlayersNow: async () => false },
    "@/lib/server/responsible-gambling": lockStub(lock),
    "@/components/profile/avatar-uploader": { AvatarUploader: () => null },
    "@/components/profile/name-editor": { ProfileNameEditor: () => null },
    "@/components/badges/Badge": { BadgeShelf: () => null },
  });
  return render(l, await (mod.default as () => Promise<unknown>)(), "/profile");
}
const profileDefects = async (text?: string) => {
  const bad: string[] = [];
  for (const l of LOCALES) {
    for (const lock of [LOCK_BREAK, LOCK_EXCL]) for (const agent of [false, true]) {
      const m = await profileMarkup(l, lock, agent, text);
      if (offerHrefs(m).length) bad.push(`${l}/${lock.reason}/${agent ? "agent" : "player"}: ${offerHrefs(m).join(",")}`);
      for (const x of ["/profile/responsible-gambling", "/profile/account", "/wallet/receipts", "/help", "/profile/kyc"]) if (!hrefsOf(m).includes(x)) bad.push(`${l}: ${x} missing on a break`);
    }
  }
  return bad;
};
{
  const bad = await profileDefects();
  ok("6.1 · RUN + RENDERED · on a break or a self-exclusion (a player, an agent) /profile draws no door to /profile/invite — the responsible-gambling row, the account, the receipts, help and identity stay",
    bad.length === 0, bad.join("; "));
  const offBad: string[] = [];
  for (const l of LOCALES) {
    const p = await profileMarkup(l, LOCK_NONE), a = await profileMarkup(l, LOCK_NONE, true), f = await profileMarkup(l, "throws");
    if (!hrefsOf(p).includes("/profile/invite") || !textOf(p).includes(T[l].profile.inviteFriends)) offBad.push(`${l}: the player's row`);
    if (!hrefsOf(a).includes("/profile/invite") || !textOf(a).includes(T[l].agent.dashTitle)) offBad.push(`${l}: the agent's dashboard row`);
    if (!hrefsOf(f).includes("/profile/invite")) offBad.push(`${l}: a failed read closed the row`);
  }
  ok("6.2 · RUN · CONTROL · off a break the row is today's (Alika marafiki for a player, Dashibodi ya wakala for an agent); a failed break read keeps it (it gates an offer only)",
    offBad.length === 0, offBad.join("; "));
  const planted = await profileDefects(raw(PROFILE).replace("breakEnd ? null : inviteViewer.agentInGoodStanding ? (", "inviteViewer.agentInGoodStanding ? ("));
  ok("6.2′ PLANT · the row without its break term is reported", planted.length > 0);
  ok("6.3 · the read joins the page's own batch, failing open, and the anchored gate line stays as it was",
    has(code(PROFILE), "Promise.resolve().then(() => isLockedOut(user.id)).then(breakStateOf).catch(() => null),") && raw(PROFILE).includes("          {inviteIsLiveFor(inviteViewer) && ("));
}

/* ══ §7 · /profile/invite — the page itself ════════════════════════════════════════════════════════════════════════════ */
section("7 · /profile/invite — a player on a break: the page's name and the break's notice, nothing minted; an agent's statement stays (RUN)");
const INVITE = "src/app/profile/invite/page.tsx";
const DASH_FILE = "src/app/profile/invite/agent-dashboard.tsx";
const AGENT_DASH = { approved: true, active: true, code: "50PICK-AG-ABC123", link: "https://50pick.tz/auth/register?ref=50PICK-AG-ABC123", commissionPct: 10,
  windowMonths: 12, capPerRecruitTzs: 0, destination: "CASH", approvedAt: "2026-09-01T00:00:00.000Z", recruits: [], recruitCount: 0, paidTzs: 0,
  pendingTzs: 0, reversedTzs: 0, thisMonthTzs: 0, preAgentRecruitCount: 0 };
const SUMMARY = { code: "PL-ABC123", link: "https://50pick.tz/auth/register?ref=PL-ABC123", recruitCount: 0, recruits: [], earnedTzs: 0, rewardsLive: false, promises: [], prizeTerms: null };
function AgentDashboardMark() { return null; }
const shareStub = { ReferralShare: (p: { link: string }) => h("div", { "data-stub": "referral-share", "data-link": p.link }) };
async function inviteRun(l: L, lock: LockCase, o: { agent?: boolean; live?: boolean } = {}, text = raw(INVITE)) {
  const calls = { summary: 0, lock: 0 };
  const viewer = o.live === false ? { role: "PLAYER", agentInGoodStanding: false, playerInviteEligible: false } : PLAYER_VIEWER;
  const mod = runText(INVITE, text, {
    ...COMMON(l),
    "next/headers": HEADERS,
    "@/lib/server/auth-service": { currentSession: async () => ({ userId: "u1" }) },
    "@/lib/server/store": { db: { affiliate: { findByUserId: async () => null } } },
    "@/lib/server/affiliate-service": {
      inviteViewerFor: async () => viewer,
      getAgentDashboard: async () => (o.agent ? AGENT_DASH : null),
      isApprovedAgent: () => !!o.agent,
      referralRewardDestination: () => "CASH",
      getPlayerReferralSummary: async () => { calls.summary++; return SUMMARY; },
    },
    "./agent-dashboard": { AgentDashboard: AgentDashboardMark },
    "./invite-client": shareStub,
    "@/lib/server/bonus-config": { getBonusConfig: () => ({ defaultWagerMultiplier: 1 }) },
    "@/lib/server/invite-rewards-switch": { invitePaysPlayersNow: async () => false },
    "@/lib/server/journey-preview": { resolveSimpleJourney: async () => ({ journey: false, preview: false }) },
    "@/lib/server/responsible-gambling": lockStub(lock, calls),
  });
  let el: unknown = null, threw: unknown = null;
  try { el = await (mod.default as (p: unknown) => Promise<unknown>)({ searchParams: Promise.resolve({}) }); } catch (e) { threw = e; }
  return { el, threw, calls };
}
const TITLE_ROW = (name: string) => `<div class="flex items-center justify-between"><div><p class="font-display text-[19px] font-bold leading-none">${name}</p></div></div>`;
const playerBreakDefects = async (text?: string) => {
  const bad: string[] = [];
  for (const l of LOCALES) for (const exclusion of [false, true]) {
    const r = await inviteRun(l, exclusion ? LOCK_EXCL : LOCK_BREAK, {}, text);
    if (r.threw) { bad.push(`${l}: threw ${String(r.threw)}`); continue; }
    const m = render(l, r.el, "/profile/invite");
    const name = T[l].profile.inviteFriends;
    if (!m.includes('data-testid="invite-break"') || !textOf(m).includes(sentenceOf(l, exclusion).text)) bad.push(`${l}: not the break's notice`);
    if (!m.includes(TITLE_ROW(name)) || !m.includes(`<h1 class="sr-only">${name}</h1>`)) bad.push(`${l}: not the page's own name`);
    if (/referral-share|<img|[?]ref=|&amp;ref=/.test(m)) bad.push(`${l}: a share surface is drawn`);
    if (r.calls.summary !== 0) bad.push(`${l}: the referral summary was read (a code minted)`);
  }
  return bad;
};
{
  const bad = await playerBreakDefects();
  ok("7.1 · RUN + RENDERED · a player on a break or a self-exclusion: the back link, the page's own name (its title row, its h1) and the break's notice with its end — no code, no link, no QR, and the referral summary is never read (nothing minted)",
    bad.length === 0, bad.join("; "));
  const offBad: string[] = [];
  for (const l of LOCALES) {
    const r = await inviteRun(l, LOCK_NONE), f = await inviteRun(l, "throws");
    const m = render(l, r.el, "/profile/invite");
    if (!m.includes('data-stub="referral-share"') || r.calls.summary !== 1 || !m.includes(TITLE_ROW(T[l].profile.inviteFriends)) || m.includes("invite-break")) offBad.push(`${l}: off a break`);
    if (!render(l, f.el, "/profile/invite").includes('data-stub="referral-share"')) offBad.push(`${l}: a failed read`);
  }
  ok("7.2 · RUN · CONTROL · off a break (and on a failed break read) the live body is drawn — its title row in the same box, the share surfaces, the summary read once",
    offBad.length === 0, offBad.join("; "));
  const planted = await playerBreakDefects(raw(INVITE).replace("  if (breakBody) {", "  if (breakBody && false) {"));
  const moved = await playerBreakDefects(raw(INVITE).replace("  if (!inviteIsLiveFor(inviteViewer)) notFound();", "  if (!inviteIsLiveFor(inviteViewer)) notFound();" + LF + "  await getPlayerReferralSummary(session.userId);"));
  ok("7.2′ PLANT · the break branch removed, and a summary read moved above it (a code minted for a reader on a break), are each reported", planted.length > 0 && moved.length > 0);
  const closed = await inviteRun("sw", LOCK_BREAK, { live: false });
  ok("7.3 · RUN · the standing gate stays first: an account that may hold no link is the not-found page, on a break too", closed.threw instanceof NotFoundThrown);
  const ag = await inviteRun("sw", LOCK_BREAK, { agent: true }), agOff = await inviteRun("sw", LOCK_NONE, { agent: true });
  const props = (x: unknown) => (x as { type?: unknown; props?: { breakBody?: { text?: string } | null } });
  ok("7.4 · RUN · an approved agent gets their dashboard on a break too — handed the break's sentence; off a break, none",
    props(ag.el).type === AgentDashboardMark && props(ag.el).props?.breakBody?.text === sentenceOf("sw", false).text && props(agOff.el).props?.breakBody === null);
}
async function dashMarkup(l: L, breakBody: unknown, dash: Record<string, unknown> = AGENT_DASH, text = raw(DASH_FILE)) {
  const mod = runText(DASH_FILE, text, {
    ...COMMON(l),
    "next/headers": HEADERS,
    "./invite-client": shareStub,
    "./recruits-bar": { RecruitsBar: () => h("div", { "data-stub": "recruits-bar" }) },
  });
  return render(l, await (mod.AgentDashboard as (p: unknown) => Promise<unknown>)({ dash, sp: {}, journey: false, breakBody }), "/profile/invite");
}
const dashDefects = async (text?: string) => {
  const bad: string[] = [];
  for (const l of LOCALES) {
    const m = await dashMarkup(l, sentenceOf(l, false), AGENT_DASH, text);
    if (!m.includes('data-testid="agent-dashboard-break"') || !textOf(m).includes(sentenceOf(l, false).text)) bad.push(`${l}: no notice`);
    if (/referral-share|<img|[?]ref=|&amp;ref=/.test(m) || m.includes(AGENT_DASH.code) || textOf(m).includes(T[l].common.youveBeenInvited)) bad.push(`${l}: a share surface is drawn`);
    if (textOf(m).includes(T[l].agent.dashEmptyBody)) bad.push(`${l}: the empty book still says to share`);
    for (const w of [T[l].agent.dashTitle, T[l].agent.dashRate, T[l].agent.dashPaid, T[l].agent.dashThisMonth, T[l].agent.dashEmpty]) if (!textOf(m).includes(w)) bad.push(`${l}: the statement lost "${w}"`);
  }
  return bad;
};
{
  const bad = await dashDefects();
  ok("7.5 · RUN + RENDERED · an agent's dashboard on a break: the statement stays (the rate, the money, the book) and the share card, the code, the link and the QR give way to the break's notice; the empty book no longer says to share",
    bad.length === 0, bad.join("; "));
  const offBad: string[] = [];
  for (const l of LOCALES) {
    const m = await dashMarkup(l, null);
    if (!m.includes('data-stub="referral-share"') || !m.includes(AGENT_DASH.code) || !m.includes("<img") || !textOf(m).includes(T[l].agent.dashEmptyBody) || m.includes("agent-dashboard-break")) offBad.push(l);
  }
  const paused = await dashMarkup("sw", sentenceOf("sw", false), { ...AGENT_DASH, active: false });
  ok("7.6 · RUN · CONTROL · off a break the dashboard is today's (card, code, QR, link, the empty book's line); a paused agent on a break shows no notice (it has no share surface to stand in for)",
    offBad.length === 0 && !paused.includes("agent-dashboard-break") && textOf(paused).includes(T.sw.agent.dashPausedBody), offBad.join("; "));
  const planted = await dashDefects(raw(DASH_FILE).replace("{dash.active && !breakBody && (", "{dash.active && ("));
  ok("7.6′ PLANT · the share card kept beside the notice is reported", planted.length > 0);
}

/* ══ §8 · /proposals — the board ═══════════════════════════════════════════════════════════════════════════════════════ */
section("8 · /proposals — on a break the board stays, and its offers (Pendekeza, the promo, the empty states' call) give way (RUN)");
const PROPOSALS = "src/app/proposals/page.tsx";
const PROPOSAL = (i: number) => ({ id: `prp_${i}`, status: "REVIEW", category: "sports", score: 1, isHot: false, isMine: false,
  createdAt: new Date(NOW - 3_600_000).toISOString(), resolutionDate: "2026-12-31", selectionCloseDate: null, titleEn: `Will thing ${i} happen?`, titleSw: null, titleZh: null,
  description: null, resolutionCriterion: "The official source says so.", proposerMasked: "J*** L***", up: 1, down: 0, myVote: null, bonusGrantedTzs: 0 });
async function proposalsRun(l: L, o: { session?: boolean; lock: LockCase; state?: string; rows?: number; sp?: Record<string, string> }, text = raw(PROPOSALS)) {
  const calls = { lock: 0 };
  const cfg = { state: o.state ?? "ACTIVE", prizeTzs: 10000, rateLimit: 3 };
  const views = Array.from({ length: o.rows ?? 2 }, (_, i) => PROPOSAL(i));
  const mod = runText(PROPOSALS, text, {
    ...COMMON(l),
    "../layout": { ROOT_OPEN_GRAPH: {} },
    "@/lib/server/auth-service": { currentSession: async () => (o.session === false ? null : { userId: "u1" }) },
    "@/lib/server/proposals-service": { listAllProposals: async () => ({ views, totalProposals: views.length, totalVotes: 1 }) },
    "@/lib/server/proposals-config": { getProposalsConfig: () => cfg, isProposalsActive: (x: { state: string }) => x.state === "ACTIVE" },
    "@/components/ui/propose-promo": { ProposePromo: (p: { href: string }) => h("a", { href: p.href, "data-stub": "propose-promo" }, "PROMO") },
    "@/components/proposals/vote-control": { VoteControl: () => h("span", { "data-stub": "vote" }) },
    "@/components/ui/search-box": { SearchBox: () => null },
    "./proposals-bar": { ProposalsBar: () => h("div", { "data-stub": "proposals-bar" }) },
    "@/lib/server/responsible-gambling": lockStub(o.lock, calls),
  });
  const el = await (mod.default as (p: unknown) => Promise<unknown>)({ searchParams: Promise.resolve(o.sp ?? {}) });
  return { m: render(l, el, "/proposals"), calls };
}
const boardDefects = async (text?: string) => {
  const bad: string[] = [];
  for (const l of LOCALES) for (const lock of [LOCK_BREAK, LOCK_EXCL]) {
    const exclusion = lock === LOCK_EXCL;
    const full = await proposalsRun(l, { lock }, text), empty = await proposalsRun(l, { lock, rows: 0 }, text), lens = await proposalsRun(l, { lock, sp: { lens: "declined" } }, text);
    for (const [k, r] of [["board", full], ["empty", empty], ["lens", lens]] as const) {
      if (hrefsOf(r.m).includes("/proposals/new") || r.m.includes("propose-promo")) bad.push(`${l}/${k}: an offer to propose is drawn`);
      if (!r.m.includes('data-testid="proposals-break"') || !textOf(r.m).includes(sentenceOf(l, exclusion).text)) bad.push(`${l}/${k}: no notice`);
      if (textOf(r.m).includes(T[l].proposals.noProposalsBody) || textOf(r.m).includes(T[l].proposals.noProposalsReward) || textOf(r.m).includes(T[l].proposals.noProposalsInFilterBody)) bad.push(`${l}/${k}: a call to propose`);
    }
    if (!hrefsOf(full.m).includes("/proposals/prp_0") || !full.m.includes('data-stub="vote"')) bad.push(`${l}: the board's own rows are gone`);
    if (!textOf(empty.m).includes(T[l].proposals.noProposalsYet) || !textOf(lens.m).includes(T[l].proposals.noProposalsInFilter)) bad.push(`${l}: an empty state lost its title`);
  }
  return bad;
};
{
  const bad = await boardDefects();
  ok("8.1 · RUN + RENDERED · a reader on a break (board · empty board · an empty lens): no Pendekeza, no promo, no 'be the first to propose' and no reward line — the break's notice in the promo's place, the board's own rows and votes kept",
    bad.length === 0, bad.join("; "));
  const offBad: string[] = [];
  for (const l of LOCALES) {
    const r = await proposalsRun(l, { lock: LOCK_NONE }), e = await proposalsRun(l, { lock: LOCK_NONE, rows: 0 }), f = await proposalsRun(l, { lock: "throws" });
    const lens = await proposalsRun(l, { lock: LOCK_NONE, sp: { lens: "declined" } });
    if (count(hrefsOf(r.m).join(" "), "/proposals/new") !== 2 || r.m.includes("proposals-break")) offBad.push(`${l}: board (Pendekeza + the promo)`);
    if (count(hrefsOf(e.m).join(" "), "/proposals/new") !== 3 || !textOf(e.m).includes(T[l].proposals.noProposalsBody)) offBad.push(`${l}: empty board`);
    if (count(hrefsOf(lens.m).join(" "), "/proposals/new") !== 3 || !textOf(lens.m).includes(T[l].proposals.noProposalsInFilterBody)) offBad.push(`${l}: empty lens`);
    if (!hrefsOf(f.m).includes("/proposals/new")) offBad.push(`${l}: a failed read`);
  }
  ok("8.2 · RUN · CONTROL · off a break (and on a failed read) the board is today's — Pendekeza, the promo, the empty board's and the empty lens's call and their doors", offBad.length === 0, offBad.join("; "));
  const guest = await proposalsRun("sw", { session: false, lock: LOCK_BREAK }), soon = await proposalsRun("sw", { lock: LOCK_BREAK, state: "COMING_SOON" });
  ok("8.3 · RUN · read only where it can change something: a guest and a closed programme are read nothing, and drawn as today",
    guest.calls.lock === 0 && hrefsOf(guest.m).includes("/proposals/new") && soon.calls.lock === 0 && !soon.m.includes("proposals-break"), j({ guest: guest.calls, soon: soon.calls }));
  const planted = await boardDefects(raw(PROPOSALS).replace("{active && !breakBody && (", "{active && ("));
  ok("8.3′ PLANT · Pendekeza kept on a break is reported", planted.length > 0);
}

/* ══ §9 · /proposals/new — the composer ════════════════════════════════════════════════════════════════════════════════ */
section("9 · /proposals/new — on a break the form gives way to the break's notice; the page keeps its head (RUN)");
const NEWP = "src/app/proposals/new/page.tsx";
async function newRun(l: L, lock: LockCase, state = "ACTIVE", text = raw(NEWP)) {
  const calls = { lock: 0, list: 0 };
  const mod = runText(NEWP, text, {
    ...COMMON(l),
    "@/lib/server/auth-service": { currentSession: async () => ({ userId: "u1" }) },
    "@/lib/server/proposals-config": { getProposalsConfig: () => ({ state, prizeTzs: 10000, rateLimit: 3 }), isProposalsActive: (x: { state: string }) => x.state === "ACTIVE" },
    "@/lib/server/platform-config": { getPlatformTimezone: () => "Africa/Dar_es_Salaam" },
    "@/lib/server/store": { db: { proposal: { listByProposer: async () => { calls.list++; return []; } } } },
    "./create-form": { CreateProposalForm: () => h("form", { "data-stub": "create-form" }) },
    "@/lib/server/responsible-gambling": lockStub(lock, calls),
  });
  return { m: render(l, await (mod.default as () => Promise<unknown>)(), "/proposals/new"), calls };
}
const composerDefects = async (text?: string) => {
  const bad: string[] = [];
  for (const l of LOCALES) for (const exclusion of [false, true]) {
    const r = await newRun(l, exclusion ? LOCK_EXCL : LOCK_BREAK, "ACTIVE", text);
    if (r.m.includes("create-form")) bad.push(`${l}: the form is drawn`);
    if (!r.m.includes('data-testid="proposal-new-break"') || !textOf(r.m).includes(sentenceOf(l, exclusion).text)) bad.push(`${l}: no notice`);
    if (!textOf(r.m).includes(T[l].common.suggestMarket) || !backTo(r.m, T[l].proposals.title)) bad.push(`${l}: the head or the way back is gone`);
  }
  return bad;
};
{
  const bad = await composerDefects();
  ok("9.1 · RUN + RENDERED · on a break or a self-exclusion: no form, the break's notice in its place, the page's head and its way back to the board", bad.length === 0, bad.join("; "));
  const offBad: string[] = [];
  for (const l of LOCALES) {
    const r = await newRun(l, LOCK_NONE), f = await newRun(l, "throws"), s = await newRun(l, LOCK_BREAK, "COMING_SOON");
    if (!r.m.includes("create-form") || r.m.includes("proposal-new-break") || r.calls.list !== 1) offBad.push(`${l}: off`);
    if (!f.m.includes("create-form")) offBad.push(`${l}: failed read`);
    if (s.calls.lock !== 0 || s.m.includes("proposal-new-break")) offBad.push(`${l}: a closed programme`);
  }
  ok("9.2 · RUN · CONTROL · off a break (and on a failed read) the form; a closed programme keeps its own blocked composer and is read nothing", offBad.length === 0, offBad.join("; "));
  ok("9.2′ PLANT · the form drawn on a break is reported", (await composerDefects(raw(NEWP).replace("breakBody ? <BetBreakNotice", "false ? <BetBreakNotice"))).length > 0);
}

/* ══ §10 · THE AGENT PROGRAMME'S PAGES ═════════════════════════════════════════════════════════════════════════════════ */
section("10 · /agent, /agent/apply, /agent/status, /agent/invite — on a break the offers give way to the programme's own RG sentence (RUN)");
const AGENT_CFG = { enabled: true, defaultCommissionPct: 10, feeVatTreatment: "INCLUSIVE", reviewSlaDays: 5, agentWithholdingTaxPct: 5, feeDestinationAccount: "",
  commissionWindowMonths: 12, capPerRecruitTzs: 0, refundDeadlineDays: 14 };
const AGENT_FILE = "src/app/agent/page.tsx";
async function agentRun(l: L, view: unknown, lock: LockCase, standing = false, text = raw(AGENT_FILE)) {
  const mod = runText(AGENT_FILE, text, {
    ...COMMON(l),
    "@/lib/server/auth-service": { currentSession: async () => ({ userId: "u1" }) },
    "@/lib/server/agent-config": { getAgentConfig: () => AGENT_CFG },
    "@/lib/server/market-config": { getGlobalConfig: async () => ({ platformFeeRate: 0.1, operatorFeeRate: 0.05, traTaxOnCommissionRate: 0.1, gbtLevyOnCommissionRate: 0.05 }) },
    "@/lib/server/lipa-config": { lipaDisplay: () => null },
    "@/lib/lipa": { LIPA_QR_RELEASED: false },
    "@/components/pay/lipa-qr-panel": { LipaQrPanel: () => null },
    "@/components/agent/commission-waterfall": { CommissionWaterfall: () => h("div", { "data-stub": "waterfall" }) },
    "@/lib/server/agent-application-service": { applicantView: async () => view, feeBreakdown: () => ({ totalTzs: 100000, netTzs: 100000, vatTzs: 0 }) },
    "@/lib/server/affiliate-service": { inviteViewerFor: async () => (standing ? AGENT_VIEWER : PLAYER_VIEWER) },
    "@/lib/id-documents": { MAX_DOC_BYTES: 5 * 1024 * 1024 },
    "./apply/actions": { startApplicationAction: async () => undefined },
    "@/lib/server/responsible-gambling": lockStub(lock),
  });
  return render(l, await (mod.default as (p: unknown) => Promise<unknown>)({ searchParams: Promise.resolve({}) }), "/agent");
}
const PAST = new Date(NOW - 60_000).toISOString();
const V = {
  none: { state: "none", eligibility: { ok: true } },
  noneRg: { state: "none", eligibility: { ok: false, refusal: "rg_locked", until: UNTIL } },
  inProgress: { state: "in_progress" },
  info: { state: "info_required" },
  rejectedOpen: { state: "rejected", reapplyAt: PAST },
  underReview: { state: "under_review" },
  agent: { state: "agent", active: true },
};
const rgCount = (l: L, m: string) => count(textOf(m), T[l].agent.stateRgLocked);
const agentDefects = async (text?: string) => {
  const bad: string[] = [];
  for (const l of LOCALES) {
    for (const [k, v] of [["in_progress", V.inProgress], ["info_required", V.info]] as const) {
      const m = await agentRun(l, v, LOCK_BREAK, false, text);
      if (hrefsOf(m).includes("/agent/apply") || textOf(m).includes(T[l].agent.ctaContinue)) bad.push(`${l}/${k}: Continue is offered`);
      if (rgCount(l, m) !== 1) bad.push(`${l}/${k}: the RG sentence is not said once`);
    }
    const rej = await agentRun(l, V.rejectedOpen, LOCK_EXCL, false, text);
    if (textOf(rej).includes(T[l].agent.ctaApply) || rgCount(l, rej) !== 1) bad.push(`${l}/rejected: Apply is offered`);
    const none = await agentRun(l, V.noneRg, LOCK_BREAK, false, text);
    if (rgCount(l, none) !== 1 || textOf(none).includes(T[l].agent.ctaApply)) bad.push(`${l}/none: not the one RG sentence`);
    const ag = await agentRun(l, V.agent, LOCK_BREAK, true, text);
    if (!hrefsOf(ag).includes("/profile/invite") || rgCount(l, ag) !== 0) bad.push(`${l}/agent: the dashboard is not the agent's way to their statement`);
    const st = await agentRun(l, V.underReview, LOCK_BREAK, false, text);
    if (!hrefsOf(st).includes("/agent/status") || rgCount(l, st) !== 0) bad.push(`${l}/under_review: the status link is a record and stays`);
  }
  return bad;
};
{
  const bad = await agentDefects();
  ok("10.1 · RUN + RENDERED · /agent on a break: no Continue (in progress, more info asked), no Apply (a refusal whose wait has passed) — the programme's RG sentence said once in their place; a reader with no application reads it once, as today; an agent's dashboard and an applicant's status stay",
    bad.length === 0, bad.join("; "));
  const offBad: string[] = [];
  for (const l of LOCALES) {
    if (!hrefsOf(await agentRun(l, V.inProgress, LOCK_NONE)).includes("/agent/apply")) offBad.push(`${l}: Continue`);
    if (!textOf(await agentRun(l, V.rejectedOpen, LOCK_NONE)).includes(T[l].agent.ctaApply)) offBad.push(`${l}: Apply`);
    if (!textOf(await agentRun(l, V.none, "throws")).includes(T[l].agent.ctaApply)) offBad.push(`${l}: a failed read`);
    if (rgCount(l, await agentRun(l, V.inProgress, LOCK_NONE)) !== 0) offBad.push(`${l}: an RG sentence off a break`);
  }
  ok("10.1′ RUN · CONTROL · off a break (and on a failed read) /agent offers today's CTA", offBad.length === 0, offBad.join("; "));
  ok("10.1″ PLANT · Continue kept on a break is reported", (await agentDefects(raw(AGENT_FILE).replace('if (rgHeld) cta = { kind: "none" };', ""))).length > 0);
}
const APPLY_FILE = "src/app/agent/apply/page.tsx";
const APPLY_VIEW = { state: "in_progress", documents: [], missing: [], app: { id: "agp_1", status: "DRAFT", source: "SELF_SERVICE", feeReference: null, feeDisposition: "NONE",
  feeFundingSource: null, infoRequestNote: null, refereeOneName: null, refereeOneContact: null, refereeTwoName: null, refereeTwoContact: null, refereeConsentAt: null } };
async function applyRun(l: L, lock: LockCase, text = raw(APPLY_FILE)) {
  const mod = runText(APPLY_FILE, text, {
    ...COMMON(l),
    "@/lib/server/auth-service": { currentSession: async () => ({ userId: "u1" }) },
    "@/lib/server/agent-config": { getAgentConfig: () => AGENT_CFG },
    "@/lib/server/lipa-config": { lipaDisplay: () => null },
    "@/lib/lipa": { LIPA_QR_RELEASED: false },
    "@/lib/server/agent-application-service": { applicantView: async () => APPLY_VIEW, feeBreakdown: () => ({ totalTzs: 100000, netTzs: 100000, vatTzs: 0 }), AGENT_REFEREE_DOC_HOLD_DAYS: 30 },
    "@/lib/server/kyc-service": { getKycStatus: async () => null },
    "@/lib/server/store": { db: { user: { findById: async () => ({ emailVerifiedAt: null }) }, wallet: { findByUserId: async () => ({ balance: 0 }) } } },
    "@/lib/id-documents": { MAX_DOC_BYTES: 5 * 1024 * 1024 },
    "@/lib/server/journey-preview": { resolveSimpleJourney: async () => ({ journey: false, preview: false }) },
    "./apply-client": { ApplyClient: () => h("div", { "data-stub": "apply-client" }) },
    "@/lib/server/responsible-gambling": lockStub(lock),
  });
  return render(l, await (mod.default as () => Promise<unknown>)(), "/agent/apply");
}
const applyDefects = async (text?: string) => {
  const bad: string[] = [];
  for (const l of LOCALES) for (const lock of [LOCK_BREAK, LOCK_EXCL]) {
    const m = await applyRun(l, lock, text);
    if (m.includes("apply-client")) bad.push(`${l}: the wizard (documents, referees, the fee from the wallet) is drawn`);
    if (rgCount(l, m) !== 1 || !textOf(m).includes(T[l].agent.applyTitle) || !backTo(m, T[l].agent.title)) bad.push(`${l}: not the title, the RG sentence and the way back`);
  }
  return bad;
};
{
  const bad = await applyDefects();
  ok("10.2 · RUN + RENDERED · /agent/apply on a break: the wizard — its documents, referees and the registration fee paid from the wallet — is not drawn; the page's title, the programme's RG sentence and the way back to /agent are",
    bad.length === 0, bad.join("; "));
  const offBad: string[] = [];
  for (const l of LOCALES) {
    const off = await applyRun(l, LOCK_NONE), f = await applyRun(l, "throws");
    if (!off.includes("apply-client") || !f.includes("apply-client") || rgCount(l, off) !== 0) offBad.push(l);
  }
  ok("10.2′ RUN · CONTROL · off a break (and on a failed read) the wizard is drawn, in every language", offBad.length === 0, offBad.join(", "));
  ok("10.2″ PLANT · the wizard drawn on a break is reported", (await applyDefects(raw(APPLY_FILE).replace("  if (breakEnd) {", "  if (breakEnd && false) {"))).length > 0);
}
const STATUS_FILE = "src/app/agent/status/page.tsx";
const APP = (status: string) => ({ id: "agp_1", status, submittedAt: null, reviewedAt: new Date(NOW - 86_400_000).toISOString(), rejectReason: "OTHER", rejectNote: null });
const SV = {
  none: { state: "none" },
  inProgress: { state: "in_progress", app: APP("DRAFT"), reviewSlaDays: 5, reapplyAt: null, refund: null },
  rejected: { state: "rejected", app: APP("REJECTED"), reviewSlaDays: 5, reapplyAt: PAST, refund: null },
  revoked: { state: "revoked", app: APP("REVOKED"), reviewSlaDays: 5, reapplyAt: PAST, refund: null },
  expired: { state: "expired", app: APP("EXPIRED"), reviewSlaDays: 5, reapplyAt: null, refund: null },
};
async function statusRun(l: L, view: unknown, lock: LockCase, text = raw(STATUS_FILE)) {
  const mod = runText(STATUS_FILE, text, {
    ...COMMON(l),
    "@/lib/server/auth-service": { currentSession: async () => ({ userId: "u1" }) },
    "@/lib/server/agent-application-service": { applicantView: async () => view },
    "@/lib/server/affiliate-service": { inviteViewerFor: async () => PLAYER_VIEWER },
    "../apply/actions": { startApplicationAction: async () => undefined },
    "@/lib/server/responsible-gambling": lockStub(lock),
  });
  return render(l, await (mod.default as () => Promise<unknown>)(), "/agent/status");
}
const statusDefects = async (text?: string) => {
  const bad: string[] = [];
  for (const l of LOCALES) {
    const ip = await statusRun(l, SV.inProgress, LOCK_BREAK, text);
    if (hrefsOf(ip).includes("/agent/apply") || rgCount(l, ip) !== 1 || !textOf(ip).includes("agp_1")) bad.push(`${l}/in_progress`);
    for (const [k, v] of [["rejected", SV.rejected], ["revoked", SV.revoked], ["expired", SV.expired]] as const) {
      const m = await statusRun(l, v, LOCK_BREAK, text);
      if (textOf(m).includes(T[l].agent.startOver) || rgCount(l, m) !== 1 || !textOf(m).includes("agp_1")) bad.push(`${l}/${k}`);
    }
    const none = await statusRun(l, SV.none, LOCK_EXCL, text);
    if (hrefsOf(none).includes("/agent") || !backTo(none, T[l].agent.title) || rgCount(l, none) !== 1 || textOf(none).includes(T[l].agent.noApplicationBody)) bad.push(`${l}/none`);
  }
  return bad;
};
{
  const bad = await statusDefects();
  ok("10.3 · RUN + RENDERED · /agent/status on a break: the application's own record stays (the reference, the decision), and Continue, 'Start a new application' and the programme's door give way to the RG sentence (the back link stays)",
    bad.length === 0, bad.join("; "));
  const offBad: string[] = [];
  for (const l of LOCALES) {
    if (!hrefsOf(await statusRun(l, SV.inProgress, LOCK_NONE)).includes("/agent/apply")) offBad.push(`${l}: Continue`);
    if (!textOf(await statusRun(l, SV.expired, "throws")).includes(T[l].agent.startOver)) offBad.push(`${l}: failed read`);
    if (!hrefsOf(await statusRun(l, SV.none, LOCK_NONE)).includes("/agent")) offBad.push(`${l}: the empty state's door`);
  }
  ok("10.3′ RUN · CONTROL · off a break (and on a failed read) the status page offers today's Continue, Start over and the programme's door", offBad.length === 0, offBad.join("; "));
  ok("10.3″ PLANT · 'Start a new application' kept on a break is reported",
    (await statusDefects(raw(STATUS_FILE).replace("{breakEnd ? rgLocked : <form action={startApplicationAction}>", "{false ? rgLocked : <form action={startApplicationAction}>"))).length > 0);
}
const INV_FILE = "src/app/agent/invite/[token]/page.tsx";
async function invRun(l: L, o: { session: boolean; lock: LockCase; valid: boolean }, text = raw(INV_FILE)) {
  const calls = { lock: 0 };
  const mod = runText(INV_FILE, text, {
    ...COMMON(l),
    "@/lib/server/auth-service": { currentSession: async () => (o.session ? { userId: "u1" } : null) },
    "@/lib/server/store": { db: { user: { findById: async () => ({ id: "u1", email: "a@b.tz", phoneE164: "+255712345678" }) } } },
    "@/lib/server/agent-application-service": { invitationPreview: async () => (o.valid
      ? { ok: true, addressMasked: "a•••@b.tz", channel: "EMAIL", expiresAt: new Date(NOW + 5 * 86_400_000).toISOString(), viewerMatches: true }
      : { ok: false, reason: "expired" }) },
    "./invite-client": { InviteClient: () => h("div", { "data-stub": "invite-client" }) },
    "@/lib/server/responsible-gambling": lockStub(o.lock, calls),
  });
  return { m: render(l, await (mod.default as (p: unknown) => Promise<unknown>)({ params: Promise.resolve({ token: "tok" }) }), "/agent/invite/tok"), calls };
}
const inviteDefects = async (text?: string) => {
  const bad: string[] = [];
  for (const l of LOCALES) {
    const v = await invRun(l, { session: true, lock: LOCK_BREAK, valid: true }, text);
    if (v.m.includes("invite-client") || rgCount(l, v.m) !== 1 || !textOf(v.m).includes("a•••@b.tz") || !textOf(v.m).includes(T[l].agent.inviteSentTo)) bad.push(`${l}/valid`);
    const x = await invRun(l, { session: true, lock: LOCK_BREAK, valid: false }, text);
    if (hrefsOf(x.m).includes("/agent") || rgCount(l, x.m) !== 1 || textOf(x.m).includes(T[l].agent.heroSub)) bad.push(`${l}/lapsed`);
  }
  return bad;
};
{
  const bad = await inviteDefects();
  ok("10.4 · RUN + RENDERED · an officer's invitation opened on a break: its facts stay (sent to, its end), and the code, the acceptance and the programme's door give way to the RG sentence; a lapsed one states itself with it, without the programme's pitch or door",
    bad.length === 0, bad.join("; "));
  const offBad: string[] = [];
  for (const l of LOCALES) {
    const off = await invRun(l, { session: true, lock: LOCK_NONE, valid: true }), guest = await invRun(l, { session: false, lock: LOCK_BREAK, valid: true });
    const lapsedOff = await invRun(l, { session: true, lock: LOCK_NONE, valid: false });
    if (!off.m.includes("invite-client") || !guest.m.includes("invite-client") || guest.calls.lock !== 0 || !hrefsOf(lapsedOff.m).includes("/agent")
      || !textOf(lapsedOff.m).includes(T[l].agent.heroSub)) offBad.push(l);
  }
  ok("10.4′ RUN · CONTROL · off a break the acceptance is drawn, and a guest is read nothing (no break is known) and drawn as today; a lapsed invitation off a break keeps its pitch and its door — in every language",
    offBad.length === 0, offBad.join(", "));
  ok("10.4″ PLANT · the acceptance drawn on a break is reported", (await inviteDefects(raw(INV_FILE).replace("      {breakEnd ? (", "      {false ? ("))).length > 0);
}

/* ══ §11 · THE CENSUS — every path to the three programmes ═════════════════════════════════════════════════════════════ */
section("11 · the census — every path to /profile/invite, /proposals or /agent in player code is a known door, gated or classified");
const walk = (dir: string): string[] => readdirSync(join(ROOT, dir)).flatMap((n) => {
  const p = `${dir}/${n}`;
  return statSync(join(ROOT, p)).isDirectory() ? walk(p) : /[.](tsx?|mts)$/.test(n) ? [p] : [];
});
const OUT_OF_SCOPE = /^src[/](app[/]admin|components[/]admin|app[/]api)[/]/;
const PATH_RES = [new RegExp(`"(/[^"${LF}]*)"`, "g"), new RegExp(`'(/[^'${LF}]*)'`, "g"), new RegExp("`(/[^`]*)`", "g")];
const literalsIn = (src: string) => PATH_RES.flatMap((re) => [...src.matchAll(re)].map((m) => m[1])).filter((x) => familyOf(x) !== null);
type Kind = "chrome" | "hub" | "page-gate" | "programme" | "sent" | "not-a-door";
/** Every file that names a path to the three programmes, how many it names, and what keeps each from a reader on a break. */
const CENSUS: Record<string, [number, Kind, string]> = {
  "src/components/layout/top-app-bar.tsx": [4, "chrome", "More's two rows and the proposals link's own 'you are here' — gated on the shell's answers (§4, §5.2)"],
  "src/components/layout/avatar-menu.tsx": [4, "chrome", "the invite and proposals rows and their journey names — gated on the shell's answers (§5.4)"],
  "src/components/layout/bottom-nav.tsx": [2, "chrome", "the rail's More rows — gated on the shell's answers (§5.3)"],
  "src/components/layout/public-footer.tsx": [3, "chrome", "the footer's three links — gated on the shell's answers (§5.1)"],
  "src/components/journey/account/hub-rows.ts": [3, "hub", "the hub's three rows — gated on viewerDoorsFor's onBreak (§2, §3)"],
  "src/app/profile/page.tsx": [2, "page-gate", "the invite / agent-dashboard row, behind the page's own break read (§6)"],
  "src/app/profile/invite/page.tsx": [0, "programme", "(names none)"],
  "src/app/proposals/page.tsx": [5, "programme", "Pendekeza, the promo's target and the empty states' Create — answered on a break (§8); a proposal's own record"],
  "src/components/ui/propose-promo.tsx": [1, "programme", "the promo card, drawn only by /proposals' non-break arm (§8)"],
  "src/app/proposals/new/page.tsx": [3, "programme", "the composer's ways back to the board and its DISABLED redirect"],
  "src/app/proposals/new/create-form.tsx": [2, "programme", "the form's success push — the form is drawn only off a break (§9)"],
  "src/app/proposals/[id]/page.tsx": [2, "programme", "a proposal's record: its DISABLED redirect and its way back to the board"],
  "src/app/proposals/[id]/not-found.tsx": [1, "programme", "the not-found way back to the board"],
  "src/app/proposals/error.tsx": [1, "programme", "the error boundary's way back to the board"],
  "src/app/agent/page.tsx": [4, "programme", "Continue / Apply (answered on a break, §10.1), an applicant's status and an agent's dashboard (records)"],
  "src/app/agent/apply/page.tsx": [4, "programme", "its redirect for a settled application and its back link, twice (the wizard's page and a reader on a break's) — the page answers a break (§10.2)"],
  "src/app/agent/apply/apply-client.tsx": [4, "programme", "the wizard's KYC return and its success push — drawn only off a break (§10.2)"],
  "src/app/agent/apply/actions.ts": [2, "not-a-door", "the start action's two redirects (a refused start, a started one) — the pages they land on answer a break"],
  "src/app/agent/status/page.tsx": [6, "programme", "redirects, the back link, the empty state's door and Continue — answered on a break (§10.3)"],
  "src/app/agent/error.tsx": [1, "programme", "the error boundary's way back to an applicant's status (a record)"],
  "src/app/agent/invite/[token]/page.tsx": [1, "programme", "a lapsed invitation's door to /agent — withheld on a break (§10.4)"],
  "src/app/agent/invite/[token]/invite-client.tsx": [4, "programme", "the acceptance's pushes and the mismatch door — drawn only off a break (§10.4)"],
  "src/lib/affiliate/recruits.ts": [1, "not-a-door", "the recruit book's query links, on the dashboard itself"],
  "src/lib/proposals/board.ts": [1, "not-a-door", "the board's query links, on the board itself"],
  "src/lib/nav/active-tab.ts": [2, "not-a-door", "which journey tab lights on these routes"],
  "src/lib/google-tag.ts": [1, "not-a-door", "the analytics path scrubber"],
  "src/proxy.ts": [3, "not-a-door", "the routes that ask for a sign-in"],
  "src/app/proposals/actions.ts": [1, "not-a-door", "revalidatePath after a proposal is created"],
  "src/lib/chat/send-message.ts": [2, "sent", "the chat's answer to a question about proposals cites the board — which answers a break (owner question: chat)"],
  "src/lib/server/email.ts": [11, "sent", "links in letters a player is sent — each lands on a page that answers a break (owner question: the referral and decline letters' lines)"],
  "src/lib/server/notification-service.ts": [15, "sent", "the bell's and the inbox's hrefs — each lands on a page that answers a break"],
};
const SOURCES = new Map(walk("src").filter((p) => !OUT_OF_SCOPE.test(p)).map((p) => [p, code(p)] as const));
const censusDefects = (sources: Map<string, string>) => {
  const bad: string[] = [];
  for (const [p, s] of sources) {
    const n = literalsIn(s).length;
    const entry = CENSUS[p];
    if (n > 0 && !entry) bad.push(`${p}: ${n} unclassified (${literalsIn(s).join(", ")})`);
    else if (entry && entry[0] !== n) bad.push(`${p}: ${n} named where the census holds ${entry[0]}`);
  }
  for (const p of Object.keys(CENSUS)) if (!sources.has(p)) bad.push(`${p}: stale — the file is gone`);
  return bad;
};
{
  const bad = censusDefects(SOURCES);
  const population = [...SOURCES].filter(([, s]) => literalsIn(s).length > 0).length;
  ok(`11.1 · every path to the three programmes in player code (${population} files) is a known door — chrome and hub gated on the server's answers, pages answering a break, the rest classified — none unclassified, none miscounted, none stale`,
    bad.length === 0, bad.join("; "));
  ok("11.1′ CONTROL · the census sees the chrome, the hub, /profile and the letters (≥ 25 files)",
    population >= 25 && ["src/components/layout/public-footer.tsx", "src/components/journey/account/hub-rows.ts", "src/app/profile/page.tsx", "src/lib/server/email.ts"].every((p) => literalsIn(SOURCES.get(p) ?? "").length > 0));
  const plantNew = new Map(SOURCES); plantNew.set("src/app/leaderboard/page.tsx", `${SOURCES.get("src/app/leaderboard/page.tsx")}${LF}const door = <a href="/profile/invite">x</a>;`);
  const plantMore = new Map(SOURCES); plantMore.set("src/components/layout/top-app-bar.tsx", `${SOURCES.get("src/components/layout/top-app-bar.tsx")}${LF}const door = "/agent/apply";`);
  ok("11.2 PLANT · a new door on a page the census does not know (the leaderboard), and one more in a known file (the bar), are each reported",
    censusDefects(plantNew).some((x) => x.includes("leaderboard")) && censusDefects(plantMore).some((x) => x.includes("top-app-bar")));
  const pages = ["src/app/profile/page.tsx", "src/app/profile/invite/page.tsx", "src/app/proposals/page.tsx", "src/app/proposals/new/page.tsx",
    "src/app/agent/page.tsx", "src/app/agent/apply/page.tsx", "src/app/agent/status/page.tsx", "src/app/agent/invite/[token]/page.tsx"];
  const unread = pages.filter((p) => { const s = code(p); return !(s.includes("isLockedOut(") && s.includes("breakStateOf") && s.includes('export const dynamic = "force-dynamic";')); });
  ok("11.3 · each page that answers a direct visit reads the break itself, on the server, per request (isLockedOut → breakStateOf, force-dynamic) — §6–§10 run what each then draws",
    unread.length === 0, unread.join(", "));
}

/* ══ §12 · THE RULE IS RECORDED ════════════════════════════════════════════════════════════════════════════════════════ */
section("12 · DESIGN_AUTHORITY records the rule with the ruling");
{
  const da = raw("docs/DESIGN_AUTHORITY.md");
  const at = da.indexOf("During a break, nothing a break pauses is offered — and no offer to earn or recruit.");
  const rule = at < 0 ? "" : da.slice(at, at + 3000);
  ok("12.1 · §C carries the rule — the owner's ruling (4) of 2026-10-10, the three programmes, the calm answer, what does not move, the server's per-request read, and this guard",
    at > da.indexOf("## C — What the interface may say") && at < da.indexOf("## L — The label law") && rule.includes("ruling (4)") && rule.includes("2026-10-10")
      && rule.includes("/profile/invite") && rule.includes("/proposals") && rule.includes("/agent") && rule.includes("test:visual-pass-r8c"), at < 0 ? "not found" : "");
}

console.log(`${LF}visual-pass-r8c: ${pass} passed, ${fails.length} failed${LF}`);
if (fails.length) {
  for (const f of fails) console.error(`  · ${f}`);
  process.exit(1);
}
process.exit(0);
