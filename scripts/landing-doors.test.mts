/**
 * test:landing-doors — THE CLASSIC LANDING'S DOOR ROW (Ali, 2026-10-22; the landing's ruling R19 in
 * `docs/design-system/v4-2026-09-26-landing-ten/INHERIT-MANIFEST.md` §2, and DESIGN_AUTHORITY §M8a item 21 for its Millionea
 * door). One row of the hero's quiet links under its own actions: LIVE for every reader ("a very brief link for Live … on
 * mobile"), then MILLIONEA'S LINE while it is offered ("a small line … 'Be this week's winner?' with a clickable link to
 * Millionea, the same colour as … the Millionea tab").
 *
 *   npx tsx scripts/landing-doors.test.mts               (npm run test:landing-doors)
 *   npx tsx scripts/landing-doors.test.mts --prove-red   (npm run red:landing-doors)
 *
 *   §1 WHEN: `millioneaLandingOffered` (millionea-doors.ts), RUN over the visibility matrix — WITHDRAWN, a STAFF_PREVIEW
 *      player, STAFF_PREVIEW staff with and without a drive week on sale, ACTIVE for a visitor and a player, a player on a
 *      break or self-excluded, no week on sale, the sales paused, a read that fails: offered only where the card is
 *      (`millioneaCardShown`) AND the hub's own `week.selling` is true
 *   §2 THE MILLIONEA DOOR: the words in sw/en/zh (the lead's), the product's name as every nav draws it
 *      (`t.millionea.productLabel` in `.kp-millionea-ink`, the class reused and no colour of its own), the family's
 *      chevron, ONE link to the hub
 *   §3 THE LIVE DOOR (a classic change every reader sees — R19): in every reader's hero, the row's first door, one link to
 *      /live in the nav's own words (`t.nav.live`) after the family's live glyph, the hero's quiet link, no figure
 *   §4 WHERE: the row stands under the hero's own actions — a visitor's two CTAs (before the sign-off), a player's block
 *      (the act's last child); dark, it is Live alone and the rest of the hero is byte for byte what the release this
 *      branch starts from (3771ef634) drew; drawn, Live keeps its place and the Millionea door follows it — never to a
 *      frozen wallet or a break; the landing hands the answer only while true
 *   §5 HOW IT LOOKS: the row's rule (it wraps only between its doors) and the door's (a 44px reach at the 13px type: the
 *      box is padded, never the type; the link ink); the tab's ink untouched, no motion
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION. `--prove-red` plants each defect in an IN-MEMORY copy (a source string or a dictionary
 *    value, compiled from the planted copy at the real file's place) and requires the check it targets to fail; a plant
 *    whose text is not in its file exactly once is INCONCLUSIVE, never a pass. No file is written.
 * ⚠️ What a render cannot see — each door's box and line count at each width, the row's wrap, the ink as painted, the
 *    hover's lift, the focus ring, Live's place in both states, the payload of a hidden reader — `qa:landing-doors` (a real
 *    server, dark and drawn: every width × sw/en/zh, hover/focus/reduced-motion frames) and `qa:maswali-door-dark`
 *    (WITHDRAWN with its plant, STAFF_PREVIEW) read from a real server.
 * Pure: it reads source files and renders components. No server, no database, no network.
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import NodeModule from "node:module";
import ts from "typescript";
import { decomment, decommentCss } from "./lib/decomment.mts";

process.exitCode = 1;
const PROVE_RED = process.argv.includes("--prove-red");
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const req = createRequire(import.meta.url);
const raw = (rel: string) => readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const squash = (s: string) => s.replace(/\s+/g, " ");
const j = (v: unknown) => JSON.stringify(v);
const count = (s: string, needle: string) => s.split(needle).length - 1;
const reEsc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** The release head this branch starts from (claude/maswali-s5-release at 3771ef634): "as before" is measured against it. */
const BASE_REV = "3771ef634";
const atRelease = (rel: string) => execFileSync("git", ["show", `${BASE_REV}:${rel}`], { cwd: ROOT, encoding: "utf8" }).replace(/\r\n/g, "\n");

type Locale = "sw" | "en" | "zh";
const LOCALES: Locale[] = ["sw", "en", "zh"];
const React = req("react") as typeof import("react");
const h = React.createElement;
const { renderToStaticMarkup } = req("react-dom/server") as typeof import("react-dom/server");
const { dict } = req("../src/lib/i18n-dict.ts") as { dict: Record<Locale, Record<string, Record<string, unknown>>> };
const { I18nProvider } = req("../src/lib/i18n.tsx") as { I18nProvider: unknown };
const { AppRouterContext } = req("next/dist/shared/lib/app-router-context.shared-runtime") as { AppRouterContext: import("react").Context<unknown> };
const ROUTER = { push() {}, replace() {}, refresh() {}, prefetch() {}, back() {}, forward() {}, hmrRefresh() {} };
const inApp = (l: Locale, el: unknown) => renderToStaticMarkup(h(AppRouterContext.Provider, { value: ROUTER }, h(I18nProvider as never, { initial: l } as never, el as never)));
const textOf = (m: string) => m.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"');

/** A module compiled from `source` as if it stood at `rel` — its imports resolve from there (the live module's paths). */
function compiled<T>(rel: string, source: string): T {
  const at = req.resolve(`../${rel}`);
  const out = ts.transpileModule(source, {
    fileName: at,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const m = new NodeModule(at);
  m.filename = at;
  m.paths = (NodeModule as unknown as { _nodeModulePaths(d: string): string[] })._nodeModulePaths(join(at, ".."));
  (m as NodeModule & { _compile(s: string, f: string): void })._compile(out, at);
  return m.exports as T;
}

const FILES = {
  doors: "src/lib/server/millionea-doors.ts",
  line: "src/components/maswali/maswali-landing-line.tsx",
  hero: "src/components/home/landing-hero.tsx",
  landing: "src/components/home/legacy-landing.tsx",
  css: "src/app/globals.css",
} as const;
type FileKey = keyof typeof FILES;
type Dict = Record<string, Record<string, unknown>>;
type World = { src: Record<FileKey, string>; dict: Record<Locale, Dict> };
const REAL: World = { src: Object.fromEntries(Object.entries(FILES).map(([k, f]) => [k, raw(f)])) as Record<FileKey, string>, dict };
const mln = (w: World, l: Locale) => w.dict[l].millionea as Record<string, string>;
const navLive = (w: World, l: Locale) => (w.dict[l].nav as Record<string, string>).live;

/* ── §1's world: the doors' own dependencies stood in, so `millionea-doors.ts` runs as the server runs it ─────────────── */
type Ask = {
  state: "WITHDRAWN" | "STAFF_PREVIEW" | "ACTIVE"; visible: boolean; preview: boolean; userId: string | null;
  lock: "none" | "cooling_off" | "self_exclusion"; week: null | { selling: boolean }; hubThrows?: boolean; rolloutThrows?: boolean;
};
const ASK: Ask = { state: "WITHDRAWN", visible: false, preview: false, userId: null, lock: "none", week: null };
const reads: string[] = [];
const stub = (rel: string, exports: Record<string, unknown>) => {
  const at = req.resolve(`../${rel}`);
  const m = new NodeModule(at);
  m.filename = at; m.loaded = true; m.exports = exports;
  (req.cache as Record<string, unknown>)[at] = m;
};
const FUTURE = () => new Date(Date.now() + 86_400_000).toISOString();
stub("src/lib/server/millionea-preview.ts", {
  resolveMillionea: async () => { reads.push("rollout"); if (ASK.rolloutThrows) throw new Error("rollout unread"); return { state: ASK.state, visible: ASK.visible, preview: ASK.preview }; },
});
stub("src/lib/server/session.ts", { getSession: async () => (ASK.userId ? { userId: ASK.userId } : null) });
stub("src/lib/server/responsible-gambling.ts", {
  isLockedOut: async () => {
    reads.push("break");
    return ASK.lock === "none" ? { locked: false, until: null, reason: null, coolingUntil: null, exclusionUntil: null }
      : { locked: true, until: FUTURE(), reason: ASK.lock, coolingUntil: ASK.lock === "cooling_off" ? FUTURE() : null, exclusionUntil: ASK.lock === "self_exclusion" ? FUTURE() : null };
  },
});
stub("src/lib/server/maswali-player.ts", {
  millioneaHub: async () => { reads.push("hub"); if (ASK.hubThrows) throw new Error("hub unread"); return { week: ASK.week, lastWeek: null, paused: false }; },
});
stub("src/lib/server/maswali-config.ts", { getMaswaliConfig: () => ({ jackpotFeeRate: 0.13, openWeekday: 1, openAt: "00:00" }) });
stub("src/lib/server/maswali-service.ts", { frozenRules: () => null });
stub("src/lib/server/maswali-dal.ts", { ticketStore: { listForUser: async () => [] }, weekStore: { get: async () => null } });
stub("src/lib/server/millionea-gate.ts", { millioneaTicketAdmission: async () => "NONE" });
type DoorsMod = { millioneaLandingOffered: () => Promise<boolean> };
/** A fresh module per answer (its React caches fresh too), compiled from the world's source at the real file's place. */
const offeredFor = async (w: World, ask: Partial<Ask>) => {
  Object.assign(ASK, { state: "WITHDRAWN", visible: false, preview: false, userId: null, lock: "none", week: null, hubThrows: false, rolloutThrows: false }, ask);
  reads.length = 0;
  const mod = compiled<DoorsMod>(FILES.doors, w.src.doors);
  return { offered: await mod.millioneaLandingOffered(), reads: [...reads] };
};
/** Every reader the line may meet, and the one answer each must get. */
const MATRIX: Array<{ who: string; ask: Partial<Ask>; want: boolean }> = [
  { who: "WITHDRAWN (production today): a visitor", ask: { state: "WITHDRAWN", week: { selling: true } }, want: false },
  { who: "WITHDRAWN: a signed-in player", ask: { state: "WITHDRAWN", userId: "usr_p", week: { selling: true } }, want: false },
  { who: "STAFF_PREVIEW: a player (the rollout hides it from them)", ask: { state: "STAFF_PREVIEW", visible: false, userId: "usr_p", week: { selling: true } }, want: false },
  { who: "STAFF_PREVIEW: staff, a drive week on sale to them", ask: { state: "STAFF_PREVIEW", visible: true, preview: true, userId: "usr_staff", week: { selling: true } }, want: true },
  { who: "STAFF_PREVIEW: staff, the public week open but not sold to them (rolloutSells)", ask: { state: "STAFF_PREVIEW", visible: true, preview: true, userId: "usr_staff", week: { selling: false } }, want: false },
  { who: "ACTIVE: a visitor, a week on sale", ask: { state: "ACTIVE", visible: true, week: { selling: true } }, want: true },
  { who: "ACTIVE: a player, a week on sale", ask: { state: "ACTIVE", visible: true, userId: "usr_p", week: { selling: true } }, want: true },
  { who: "ACTIVE: a player on a cooling-off break", ask: { state: "ACTIVE", visible: true, userId: "usr_p", lock: "cooling_off", week: { selling: true } }, want: false },
  { who: "ACTIVE: a self-excluded player", ask: { state: "ACTIVE", visible: true, userId: "usr_p", lock: "self_exclusion", week: { selling: true } }, want: false },
  { who: "ACTIVE: no week (between weeks)", ask: { state: "ACTIVE", visible: true, week: null }, want: false },
  { who: "ACTIVE: the week not on sale (closed, or its sales paused)", ask: { state: "ACTIVE", visible: true, week: { selling: false } }, want: false },
  { who: "ACTIVE: the hub cannot be read", ask: { state: "ACTIVE", visible: true, week: { selling: true }, hubThrows: true }, want: false },
  { who: "the rollout cannot be read", ask: { state: "ACTIVE", visible: true, week: { selling: true }, rolloutThrows: true }, want: false },
];

/* ── the checks ───────────────────────────────────────────────────────────────────────────────────────────────────── */
type Check = { id: string; label: string; run: (w: World) => Promise<string[]> | string[] };
const CHECKS: Check[] = [];
const check = (id: string, label: string, run: Check["run"]) => CHECKS.push({ id, label, run });
const need = (d: string[], cond: boolean, why: string) => { if (!cond) d.push(why); };

check("1.1", `WHEN · RUN as the server runs it, Millionea's door is offered to exactly the readers the card is offered to AND who can buy into the hub's week now (its own \`week.selling\`) — ${MATRIX.length} readers: WITHDRAWN, a STAFF_PREVIEW player, STAFF_PREVIEW staff with and without a drive week on sale, ACTIVE visitor and player, a break, a self-exclusion, no week, a week not on sale, an unread hub, an unread rollout`, async (w) => {
  const d: string[] = [];
  for (const r of MATRIX) {
    const got = await offeredFor(w, r.ask);
    need(d, got.offered === r.want, `${r.who}: ${got.offered} (reads ${got.reads.join(" → ") || "none"})`);
  }
  // A hidden product reads no break and no hub (MR-2: below the rollout's answer, nothing is read).
  const hidden = await offeredFor(w, { state: "WITHDRAWN", week: { selling: true } });
  need(d, j(hidden.reads) === j(["rollout"]), `a hidden product read more than the rollout: ${hidden.reads.join(" → ")}`);
  return d;
});

/* ── §2 · the Millionea door ─────────────────────────────────────────────────────────────────────────────────────── */
type LineMod = { MaswaliLandingLine: unknown };
const lineOf = (w: World) => (w.src.line === REAL.src.line ? req("../src/components/maswali/maswali-landing-line.tsx") : compiled(FILES.line, w.src.line)) as LineMod;
const WORDS: Record<Locale, string> = { en: "Be this week's winner?", sw: "Kuwa mshindi wa wiki hii?", zh: "成为本周赢家？" };
const lineMarkup = (w: World, l: Locale) => inApp(l, h(lineOf(w).MaswaliLandingLine as never, { t: w.dict[l], locale: l } as never));
check("2.1", "MILLIONEA · the words, in sw/en/zh: the lead's question, then the product's name as every nav draws it (`t.millionea.productLabel`), with a space only where Latin meets Latin (zh's full-width ？ carries its own) — and nothing else (no figure)", (w) => {
  const d: string[] = [];
  for (const l of LOCALES) {
    const M = mln(w, l), m = lineMarkup(w, l);
    need(d, M.landingInvite === WORDS[l], `${l}: the question reads "${M.landingInvite}"`);
    const want = `${WORDS[l]}${l === "zh" ? "" : " "}${M.productLabel}`;
    need(d, textOf(m) === want, `${l}: the line reads "${textOf(m)}", want "${want}"`);
    need(d, !/\d/.test(textOf(m)), `${l}: a figure in the line`);
  }
  return d;
});
const { I } = req("../src/components/ui/glyphs.tsx") as { I: Record<string, unknown> };
/** The family's chevron as the glyph component draws it at the line's size (never a typed ›). */
const CHEVRON = renderToStaticMarkup(h(I.chevronRight as never, { s: 14, edge: "end", text: "body-600" } as never));
check("2.2", "MILLIONEA · the link's two parts, as every quiet link of the hero has: its words — the question and the product's name in the tab's own ink (the one class every nav gives it, `kp-millionea-ink`, around exactly the name) as ONE run of text, spaced as text is — then the family's chevron (`chevronRight`, never a typed ›)", (w) => {
  const d: string[] = [];
  for (const l of LOCALES) {
    const m = lineMarkup(w, l), name = mln(w, l).productLabel;
    const words = `<span>${WORDS[l].replace(/'/g, "&#x27;")}${l === "zh" ? "" : " "}<span class="kp-millionea-ink">${name}</span></span>`;
    need(d, new RegExp(`^<a [^>]*>${reEsc(words)}${reEsc(CHEVRON)}</a>$`).test(m), `${l}: not the question and the inked name as one run, then the family's chevron (${m.slice(0, 260)})`);
    need(d, count(m, "kp-millionea-ink") === 1 && count(m, "<svg") === 1 && !/[›»]/.test(textOf(m)), `${l}: more than one inked word or glyph, or a typed chevron`);
  }
  // The navs' own spelling of the same word (the classic top bar): the line's name is the tab's.
  need(d, squash(decomment(raw("src/components/layout/top-app-bar.tsx"))).includes('label: t.millionea.productLabel, ink: true'), "the tab no longer draws `t.millionea.productLabel` (the premise moved)");
  return d;
});
check("2.3", "MILLIONEA · ONE link, to the hub (`MILLIONEA_HREF.hub`, \"/millionea\"), holding the whole line — the hero's quiet link (`kp-mine__limits`), its handle `millionea-landing-line` (the drives' and qa:live's dark matcher's)", (w) => {
  const d: string[] = [];
  for (const l of LOCALES) {
    const m = lineMarkup(w, l);
    need(d, count(m, "<a ") === 1 && m.startsWith("<a ") && m.endsWith("</a>") && /^<a [^>]*href="\/millionea"/.test(m) && /^<a class="kp-mine__limits"/.test(m) && m.includes('data-testid="millionea-landing-line"'), `${l}: not one quiet link to /millionea holding the line (${m.slice(0, 160)})`);
  }
  return d;
});

/* ── the hero, rendered ──────────────────────────────────────────────────────────────────────────────────────────── */
type HeroMod = { LandingHero: unknown };
const heroOf = (w: World) => (w.src.hero === REAL.src.hero && w.src.line === REAL.src.line ? req("../src/components/home/landing-hero.tsx") : compiledHero(w)) as HeroMod;
/** The hero compiled from the world's source; a planted line module reaches it through the cache, as `compiledWith` does. */
function compiledHero(w: World): HeroMod {
  req("../src/components/home/landing-hero.tsx");
  const at = req.resolve(`../${FILES.line}`), cache = req.cache as Record<string, NodeModule>, live = cache[at];
  const stand = new NodeModule(at);
  stand.filename = at; stand.loaded = true; stand.exports = lineOf(w);
  cache[at] = stand;
  try { return compiled<HeroMod>(FILES.hero, w.src.hero); } finally { cache[at] = live; }
}
const heroOld = compiled<HeroMod>(FILES.hero, atRelease(FILES.hero));
const { heroFigures } = req("../src/lib/markets/hero.ts") as { heroFigures: (rows: unknown[], now: number, lens: string) => unknown };
const NOW = Date.parse("2026-12-02T07:00:00.000Z");
const MINE = { picks: { open: 2, awaiting: 1, paidThisWeekTzs: 4_000 }, balance: 10_000, held: false, breakEnd: null };
type Who = "visitor" | "player";
/** The hero's props for a reader in a world: the world's own dictionary, so a planted word reaches the hero too. */
const heroProps = (w: World, l: Locale, who: Who, more: Record<string, unknown> = {}) => ({
  figures: heroFigures([], NOW, "closing"), t: w.dict[l], locale: l, isAuthed: who === "player", nowMs: NOW,
  cards: { charts: new Map(), traders: new Map() }, mine: who === "player" ? MINE : null, rails: [], journey: false, ...more,
});
const heroMarkup = (w: World, mod: HeroMod, l: Locale, who: Who, more: Record<string, unknown> = {}) =>
  inApp(l, h(mod.LandingHero as never, heroProps(w, l, who, more) as never));
/** Every reader the row meets: a visitor, a player, a frozen wallet, a player on a break. */
const READERS: Array<[string, Who, Record<string, unknown>]> = [
  ["a visitor", "visitor", {}], ["a player", "player", {}], ["a frozen wallet", "player", { mine: { ...MINE, held: true } }],
  ["a player on a break", "player", { mine: { ...MINE, breakEnd: { exclusion: false, date: "3 Dec" } } }],
];
const ROW_OPEN = '<div class="kp-mine__links" data-testid="landing-doors">';
/** The row's own markup (it holds links, spans and glyphs, never a div), or "" when there is none. */
const rowOf = (m: string) => { const at = m.indexOf(ROW_OPEN); return at < 0 ? "" : m.slice(at, m.indexOf("</div>", at) + 6); };
const LINE_OPEN = 'data-testid="millionea-landing-line"';
const lineIn = (row: string) => { const at = row.indexOf(LINE_OPEN); return at < 0 ? "" : row.slice(row.lastIndexOf("<a ", at), row.indexOf("</a>", at) + 4); };

/* ── §3 · the Live door ──────────────────────────────────────────────────────────────────────────────────────────── */
/** The family's live glyph as the glyph component draws it at the door's size, its ink on the row's start edge. */
const LIVE_GLYPH = renderToStaticMarkup(h(I.live as never, { s: 14, edge: "start" } as never));
check("3.1", "LIVE · in EVERY reader's hero — a visitor, a player, a frozen wallet, a break; Millionea dark or drawn; sw/en/zh — the row's FIRST door: one link to /live, the hero's quiet link (`kp-mine__limits`, the link ink: no colour of its own), its handle `landing-live`, the family's live glyph on its start edge, then the nav's own words for Live (`t.nav.live`) and nothing else — no figure", (w) => {
  const d: string[] = [];
  const now = heroOf(w);
  for (const l of LOCALES) for (const [who, as, more] of READERS) for (const drawn of [false, true]) {
    const row = rowOf(heroMarkup(w, now, l, as, drawn ? { ...more, millionea: true } : more));
    const first = row.slice(ROW_OPEN.length, row.indexOf("</a>") + 4);
    const live = /^<a ([^>]*)>([\s\S]*)<\/a>$/.exec(first), attrs = live?.[1] ?? "";
    const where = `${l} ${who}${drawn ? " (Millionea drawn)" : ""}`;
    // Its three attributes and nothing else: the quiet link's class alone (no colour of its own), its handle, /live.
    need(d, row !== "" && live !== null && /^class="kp-mine__limits" /.test(attrs) && attrs.includes('data-testid="landing-live"') && attrs.includes('href="/live"') && count(attrs, "=") === 3,
      `${where}: the row's first door is not the Live link as ruled (${(first || row || "no row").slice(0, 200)})`);
    need(d, live?.[2] === `${LIVE_GLYPH}${navLive(w, l)}`, `${where}: Live is not the live glyph, then the nav's own words "${navLive(w, l)}" and nothing else (${(live?.[2] ?? "").replace(/<svg[\s\S]*?<\/svg>/g, "<svg/>").slice(0, 120)})`);
    need(d, count(row, 'href="/live"') === 1, `${where}: Live is drawn more than once`);
  }
  // The classic phone rail names /live with the same key and glyph (the premise: one wording, one glyph).
  need(d, squash(decomment(raw("src/components/layout/bottom-nav.tsx"))).includes('{ href: "/live", glyph: "live" as const, label: t.nav.live }'), "the phone rail no longer names /live `t.nav.live` with the `live` glyph (the premise moved)");
  return d;
});

/* ── §4 · where the row stands ───────────────────────────────────────────────────────────────────────────────────── */
check("4.1", "WHERE · DARK (Millionea not offered — production today): the row is Live ALONE, under the hero's own actions — a visitor's directly after the two CTAs and before the sign-off, a player's directly under their block as the act's last child (the block's two doors stay its own, R17) — and the rest of the hero is byte for byte what the release this branch starts from (3771ef634) drew, for every reader in sw/en/zh", (w) => {
  const d: string[] = [];
  const now = heroOf(w);
  for (const l of LOCALES) for (const [who, as, more] of READERS) {
    const m = heroMarkup(w, now, l, as, more), row = rowOf(m);
    need(d, count(m, ROW_OPEN) === 1 && count(row, "<a ") === 1 && !row.includes(LINE_OPEN), `${l} ${who}: the dark row is not Live alone, once (${row.slice(0, 120)})`);
    if (as === "visitor") need(d, row !== "" && m.includes(`</div>${row}<p class="kp-hero__signoff">`) && m.indexOf('class="kp-hero__ctas"') < m.indexOf(ROW_OPEN), `${l} ${who}: the row is not directly between the CTAs and the sign-off`);
    else need(d, row !== "" && m.includes(`${row}</div></div></section>`) && m.indexOf('data-testid="landing-mine"') < m.indexOf(ROW_OPEN) && m.slice(0, m.indexOf(ROW_OPEN)).endsWith("</a></div></div>"), `${l} ${who}: the row is not directly under the player's block, the act's last child`);
    need(d, m.replace(row, "") === heroMarkup(REAL, heroOld, l, as, more), `${l} ${who}: more than the row changed against ${BASE_REV}`);
  }
  return d;
});
check("4.2", "WHERE · DRAWN (handed the answer): the row holds Live, then Millionea's door — Live FIRST and unmoved (the drawn row is the dark row with the line added after Live, nothing else changed) — for a visitor and a player; never the line to a frozen wallet or a player on a break (their row stays Live alone)", (w) => {
  const d: string[] = [];
  const now = heroOf(w);
  for (const l of LOCALES) for (const [who, as, more] of READERS) {
    const dark = heroMarkup(w, now, l, as, more), drawn = heroMarkup(w, now, l, as, { ...more, millionea: true });
    if (!("mine" in more)) {
      const row = rowOf(drawn), darkRow = rowOf(dark), line = lineIn(row);
      need(d, count(drawn, LINE_OPEN) === 1 && line !== "" && darkRow !== "" && row === `${darkRow.slice(0, -6)}${line}</div>`, `${l} ${who}: the drawn row is not the dark row with the line after Live (${row.slice(0, 200)})`);
      need(d, line !== "" && drawn.replace(line, "") === dark, `${l} ${who}: more than the line changed between dark and drawn`);
      need(d, line === lineMarkup(w, l), `${l} ${who}: the row's Millionea door is not the line itself`);
    } else need(d, drawn === dark && !drawn.includes(LINE_OPEN), `${l} ${who}: the line is drawn, or the row changed`);
  }
  return d;
});
check("4.3", "WHERE · the landing asks the doors' one answer beside its other reads, and hands the hero `millionea` only while true (the census's accepted shape: server code, so nothing is written into the page)", (w) => {
  const d: string[] = [];
  const s = squash(decomment(w.src.landing));
  need(d, s.includes("searchParams, millioneaLandingOffered(), ]);") && s.includes("const [{ t, locale }, liveRaw, updownLiveRaw, session, stats, rules, railPauses, sources, sp, millionea] = await Promise.all(["), "the landing does not read the answer beside its reads");
  need(d, s.includes("{...(millionea ? { millionea: true as const } : {})}") && !/\bmillionea=\{/.test(s), "the hero is not handed the answer only while true");
  return d;
});

/* ── §5 · how it looks (globals.css) ─────────────────────────────────────────────────────────────────────────────── */
check("5.1", "HOW IT LOOKS · the row wraps only BETWEEN its doors (`.kp-mine__links`: a wrapping flex row with a row gap, so two 44px doors never touch) and each door is the hero's quiet link (`.kp-mine__limits`): the link ink, a one-line flex run, the 13px type and a 44px reach — the box padded, never the type", (w) => {
  const d: string[] = [];
  const css = decommentCss(w.src.css);
  const row = /\.kp-mine__links \{([^}]*)\}/.exec(css)?.[1] ?? "";
  need(d, /display: flex;/.test(row) && /flex-wrap: wrap;/.test(row) && /gap: var\(--sp-2\) var\(--sp-5\);/.test(row), `the row's rule moved: ${row.trim()}`);
  const door = /\.kp-mine__limits \{([^}]*)\}/.exec(css)?.[1] ?? "";
  need(d, /display: inline-flex;/.test(door) && !/flex-wrap: wrap/.test(door) && /min-height: var\(--h-control-md\)/.test(door) && /font-size: var\(--type-small\)/.test(door) && /color: var\(--brand-300\)/.test(door)
    && /--h-control-md: 44px/.test(css) && /--type-small: +13px/.test(css), `the door's rule moved: ${door.trim().slice(0, 200)}`);
  return d;
});
check("5.2", "HOW IT LOOKS · the name's ink is the tab's class untouched — no animation, a forced-colours fallback — and no rule recolours it inside the row", (w) => {
  const d: string[] = [];
  const css = decommentCss(w.src.css);
  const ink = css.slice(css.indexOf(".kp-millionea-ink { color: var(--gold-300); }"), css.indexOf(".kp-millionea-glyph { color: var(--gold-300); }"));
  need(d, ink.length > 0 && !/animation|transition/.test(ink) && /-webkit-text-fill-color: transparent/.test(ink), "the tab's ink moved, or gained motion");
  need(d, /@media \(forced-colors: active\) \{\s*\.kp-millionea-ink, :is\(a, button\):hover \.kp-millionea-ink/.test(css), "the forced-colours fallback is gone");
  need(d, !/kp-mine__(?:limits|links)[^{]*kp-millionea-ink|kp-millionea-ink[^{]*kp-mine__(?:limits|links)/.test(css), "a rule recolours the name inside the row");
  return d;
});

/* ── run ─────────────────────────────────────────────────────────────────────────────────────────────────────────── */
const runAll = async (w: World, quiet: boolean) => {
  const failed: string[] = [];
  for (const c of CHECKS) {
    let d: string[];
    try { d = await c.run(w); } catch (e) { d = [`threw: ${(e as Error).message.split("\n")[0]}`]; }
    if (d.length) failed.push(c.id);
    if (!quiet) console.log(`${d.length ? "FAIL" : "PASS"} ${c.id} · ${c.label}${d.length ? ` — ${d.join(" | ")}` : ""}`);
  }
  return { failed };
};
if (!PROVE_RED) {
  const r = await runAll(REAL, false);
  console.log(`\nLANDING DOORS: ${CHECKS.length - r.failed.length} passed, ${r.failed.length} failed`);
  process.exit(r.failed.length === 0 ? 0 : 1);
}
const problems: string[] = [];
{
  const r = await runAll(REAL, true);
  if (r.failed.length) problems.push(`the real tree fails ${r.failed.join(", ")} — fix it before proving it red`);
}
const plantSrc = (k: FileKey, from: string, to: string, w: World = REAL): World | null =>
  count(w.src[k], from) === 1 ? { ...w, src: { ...w.src, [k]: w.src[k].replace(from, to) } } : null;
/** Several replacements in one file, each held to "exactly once" as `plantSrc` holds one. */
const plantSrcs = (k: FileKey, pairs: ReadonlyArray<readonly [string, string]>): World | null =>
  pairs.reduce<World | null>((w, [from, to]) => (w ? plantSrc(k, from, to, w) : null), REAL);
const plantWord = (l: Locale, block: string, key: string, value: string): World =>
  ({ ...REAL, dict: { ...REAL.dict, [l]: { ...REAL.dict[l], [block]: { ...REAL.dict[l][block], [key]: value } } } });
const LIVE_LINK = '      <Link href={"/live" as never} className="kp-mine__limits" data-testid="landing-live">\n        <I.live s={14} edge="start" />\n        {t.nav.live}\n      </Link>\n';
const LINE_CALL = "      {millionea && <MaswaliLandingLine t={t} locale={locale} />}\n";
const PLAYER_ROW = "          {isAuthed && <HeroDoors t={t} locale={locale} millionea={millionea === true && !mine?.held && !mine?.breakEnd} />}\n";
const VISITOR_ROW = "              <HeroDoors t={t} locale={locale} millionea={millionea === true} />\n";
const SIGNOFF = '              <p className="kp-hero__signoff">\n';
const PLANTS: Array<[string, string, World | null]> = [
  ["the line offered whenever the card is (no week on sale asked)", "1.1", plantSrc("doors", "  return (await millioneaHubNow(door.userId, door.state))?.week?.selling === true;", "  return !!door;")],
  ["the line offered on a break (the card's answer skipped)", "1.1", plantSrc("doors", "  if (!(await millioneaCardShown())) return false;\n  const door = await millioneaDoor();", "  const door = await millioneaDoor();\n  if (!door.visible) return false;")],
  ["the line offered when the week is merely open (not the hub's `selling`)", "1.1", plantSrc("doors", "?.week?.selling === true;", "?.week != null;")],
  ["an unread hub taken as a week on sale", "1.1", plantSrc("doors", "?.week?.selling === true;\n});", "?.week?.selling !== false;\n});")],
  ["the en question changed", "2.1", plantWord("en", "millionea", "landingInvite", "Win this week's jackpot!")],
  ["the zh name spaced from the full-width mark", "2.1", plantSrc("line", '{locale === "zh" ? null : " "}', '{" "}')],
  ["a figure in the line", "2.1", plantSrc("line", "{t.millionea.landingInvite}", "{t.millionea.landingInvite} 1,000,000")],
  ["the name in the line's own ink (not the tab's class)", "2.2", plantSrc("line", '<span className="kp-millionea-ink">{t.millionea.productLabel}</span>', '<span className="text-gold-300">{t.millionea.productLabel}</span>')],
  ["the name its own flex part (a zh gap after ？, and the words no longer one run)", "2.2", plantSrc("line", '        <span className="kp-millionea-ink">{t.millionea.productLabel}</span>\n      </span>\n', '      </span>\n      <span className="kp-millionea-ink">{t.millionea.productLabel}</span>\n')],
  ["a typed chevron for the family's", "2.2", plantSrc("line", '      <I.chevronRight s={14} edge="end" text="body-600" />\n', '      {" ›"}\n')],
  ["the link to the slip instead of the hub", "2.3", plantSrc("line", "href={MILLIONEA_HREF.hub as never}", "href={MILLIONEA_HREF.slip as never}")],
  ["the line in a link of its own class", "2.3", plantSrc("line", 'className="kp-mine__limits" data-testid="millionea-landing-line"', 'className="text-text-link underline" data-testid="millionea-landing-line"')],
  ["Live dropped for a player (the player's row without it)", "3.1", plantSrc("hero", PLAYER_ROW, '          {isAuthed && millionea === true && !mine?.held && !mine?.breakEnd && <div className="kp-mine__links" data-testid="landing-doors"><MaswaliLandingLine t={t} locale={locale} /></div>}\n')],
  ["Live after Millionea's door (its place moves when the line shows)", "3.1", plantSrcs("hero", [[LIVE_LINK, ""], [LINE_CALL, LINE_CALL + LIVE_LINK]])],
  ["Live in other words (the board's, not the nav's)", "3.1", plantSrc("hero", "        {t.nav.live}\n", "        {t.common.markets}\n")],
  ["Live with a count beside it", "3.1", plantSrc("hero", "        {t.nav.live}\n", "        {t.nav.live} (24)\n")],
  ["Live linked to the board", "3.1", plantSrc("hero", '<Link href={"/live" as never} className="kp-mine__limits" data-testid="landing-live">', '<Link href={"/markets" as never} className="kp-mine__limits" data-testid="landing-live">')],
  ["Live without its glyph", "3.1", plantSrc("hero", '        <I.live s={14} edge="start" />\n', "")],
  ["Live in a colour of its own", "3.1", plantSrc("hero", 'className="kp-mine__limits" data-testid="landing-live"', 'className="kp-mine__limits text-gold-300" data-testid="landing-live"')],
  ["the visitor's row after the sign-off", "4.1", plantSrcs("hero", [[VISITOR_ROW, ""], ["            </>\n          )}\n", VISITOR_ROW + "            </>\n          )}\n"]])],
  ["the player's row inside their block (a third row of its doors)", "4.1", plantSrcs("hero", [
    [PLAYER_ROW, ""],
    ['          {t.footer.setLimits}\n          <I.arrowRight s={14} edge="end" text="body-600" />\n        </Link>\n      </div>\n', '          {t.footer.setLimits}\n          <I.arrowRight s={14} edge="end" text="body-600" />\n        </Link>\n      </div>\n      <HeroDoors t={t} locale={"en"} millionea={false} />\n'],
  ])],
  ["the visitor's row above the CTAs", "4.1", plantSrcs("hero", [[VISITOR_ROW, ""], ['              <div className="kp-hero__ctas">\n', VISITOR_ROW + '              <div className="kp-hero__ctas">\n']])],
  ["a second Live link beside the sign-off (more than the row changed)", "4.1", plantSrc("hero", SIGNOFF, '              <Link href={"/live" as never} className="kp-mine__limits">{t.nav.live}</Link>\n' + SIGNOFF)],
  ["the visitor's line drawn for every reader (not gated on the answer)", "4.2", plantSrc("hero", VISITOR_ROW, "              <HeroDoors t={t} locale={locale} millionea={true} />\n")],
  ["the player's line drawn to a frozen wallet and a break", "4.2", plantSrc("hero", "millionea={millionea === true && !mine?.held && !mine?.breakEnd}", "millionea={millionea === true}")],
  ["the line drawn before Live", "4.2", plantSrcs("hero", [[LINE_CALL, ""], [LIVE_LINK, LINE_CALL + LIVE_LINK]])],
  ["the hero handed the answer as a plain attribute (its false written too)", "4.3", plantSrc("landing", "{...(millionea ? { millionea: true as const } : {})}", "millionea={millionea || undefined}")],
  ["the row no longer wraps (two doors crushed onto one line)", "5.1", plantSrc("css", ".kp-mine__links { display: flex; flex-wrap: wrap; align-items: center; gap: var(--sp-2) var(--sp-5); }", ".kp-mine__links { display: flex; align-items: center; gap: var(--sp-2) var(--sp-5); }")],
  ["a door's reach cut to its text (no 44px box)", "5.1", plantSrc("css", "align-self: flex-start; min-height: var(--h-control-md); font-weight: 600; font-size: var(--type-small);", "align-self: flex-start; font-weight: 600; font-size: var(--type-small);")],
  ["a rule recolours the name inside the row", "5.2", plantSrc("css", ".kp-mine__limits:hover { text-decoration-color: currentColor; }", ".kp-mine__limits:hover { text-decoration-color: currentColor; }\n.kp-mine__limits .kp-millionea-ink { color: var(--brand-300); }")],
  ["the tab's ink gains motion", "5.2", plantSrc("css", ".kp-millionea-ink { color: var(--gold-300); }", ".kp-millionea-ink { color: var(--gold-300); transition: filter 0.2s; }")],
];
let caught = 0;
for (const [name, target, world] of PLANTS) {
  if (!world) { console.log(`INCONCLUSIVE (plant did not apply)  ${target} · ${name}`); problems.push(`inconclusive: ${name}`); continue; }
  const r = await runAll(world, true);
  const hit = r.failed.includes(target);
  if (hit) caught++; else problems.push(`BLIND: ${target} stayed green with "${name}" planted`);
  console.log(`${(hit ? "PROVED" : "BLIND").padEnd(12)} ${target} · ${name}`);
}
for (const p of problems) console.log(`!! ${p}`);
const untested = CHECKS.map((c) => c.id).filter((id) => !PLANTS.some(([, t]) => t === id));
if (untested.length) console.log(`!! checks with no plant: ${untested.join(", ")}`);
console.log(`\n${caught}/${PLANTS.length} caught`);
process.exit(caught === PLANTS.length && problems.length === 0 && untested.length === 0 ? 0 : 1);
