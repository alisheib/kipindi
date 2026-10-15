/**
 * test:flip-copy — THE COPY READY FOR THE FLIP: what a journey reader is told now, and the census of what the S15 flip
 * must still change (the Vodacom plan S11 WP5–WP7; VODACOM-PLAN §3.9; `docs/design-system/v5-2026-09-29-simplified-journey/
 * S11-PLAN.md` WP7 and Open points 14, 15, 17, 22-24).
 *
 *   npm run test:flip-copy     (in test:all; run at each S11 push — S11-PLAN Open point 22)
 *   npm run red:flip-copy      (--prove-red: every defect below is planted IN MEMORY, and each must turn its own check red)
 *
 *   §0 THE POPULATION: every src file (decommented), every text file under public/, the whole dictionary in three languages.
 *   §1 THE DIAL WORDS (WP7): the keys whose English names the dial or the conviction are an allowlist exactly — each row its
 *      readers and the reason it stands until the flip (a shelved surface, S15's convergence, S16's sweep), shrink-only; the
 *      Swahili and Chinese backstops find no key outside it; no file a journey reader alone is served reads one; and the
 *      three a journey reader could still meet today (chat.helpline, chat.starterDial, help.faq2a) are read in classic arms.
 *   §2 THE RETIRED SLOGAN (WP7): no file spells it outside the dictionary but the manifest's two named lines; the tagline's
 *      one home, auth.railTagline, is read by exactly the surfaces of S11-PLAN "The tagline"; the manifest's name is
 *      "50pick — " + the English key; in the dictionary only the key itself and the shelved primer.card1Title spell it.
 *   §3 THE LEGAL FLIP LINES (WP7): Terms §4's dial paragraph and Rules §3's indicator line once each in three languages, and
 *      none of the parked S15 lines published early (`PUBLISHED_AT_S15` flips both, in the S15 commit).
 *   §4 THE OVERCLAIM PATTERN (WP7): test:hero-copy's own pattern, read from its one definition, over S11's words.
 *   §5 /HELP FOR A JOURNEY READER (WP5): the FAQ's journey copies — faq2's question and answer, faq3, faq5 and faq6 — are
 *      read in the SAME slots as today's keys, for a reader the journey is shown to and for no other: the journey arm first,
 *      today's expression the else arm, word for word; the keys exist in three languages, name none of the surfaces a
 *      journey reader no longer meets, and type no figure (`{max}` is the cap, formatted and drawn as money: one `.amount`).
 *   §6 THE CHAT (WP6), built from its text and run: the live action's two prompts — the journey's is today's with the named
 *      passages swapped, every money, responsible-gambling, identity and email line shared verbatim, and no dial in it; the
 *      offline helper — a classic reader's answers the branch base's word for word, a journey reader's naming no dial,
 *      teaching betting by the How-to steps with /?howto=1, and giving the journey's doors; the panel's words by the reader.
 * ⛔ No backslash in this file: an editing tool decodes them (`test:source-bytes`). Patterns use character classes.
 */
import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { transformSync } from "esbuild";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { REPO_ROOT, srcFiles } from "./lib/tracked-files.mts";
import { decomment } from "./lib/decomment.mts";
import { dict } from "../src/lib/i18n-dict.ts";
import { fillNodes } from "../src/lib/fill-nodes.tsx";
import { fill, formatTzs } from "../src/lib/utils.ts";
import * as Utils from "../src/lib/utils.ts";
import { WITHDRAW_MAX_TZS } from "../src/lib/server/validators.ts";
import * as Validators from "../src/lib/server/validators.ts";
import * as Payout from "../src/lib/payout.ts";

const LF = String.fromCharCode(10);
const CR = String.fromCharCode(13);
const PROVE_RED = process.argv.includes("--prove-red");
const j = (x: unknown) => JSON.stringify(x);
const read = (rel: string) => readFileSync(join(REPO_ROOT, rel), "utf8").split(CR + LF).join(LF);
const count = (s: string, t: string) => (t ? s.split(t).length - 1 : 0);
const TAB = String.fromCharCode(9);
const WS = new RegExp(`[ ${TAB}]*[${LF}${CR}][${LF}${CR}${TAB} ]*`, "g");
const squash = (s: string) => s.replace(WS, " ");
const LOCS = ["en", "sw", "zh"] as const;
type Loc = (typeof LOCS)[number];
type JourneyWords = Record<string, string>;

const HELP = "src/app/help/page.tsx";
const CHAT = "src/app/_actions/chat.ts";
const STUB = "src/lib/chat/send-message.ts";
const EMPTY = "src/components/chat/messages/EmptyState.tsx";
const CHAT_ROOT = "src/components/chat/ChatRoot.tsx";
/** `base`: files as they stand at the merge base with origin/main (what a classic reader is served today). */
/** `files`: every src file, every text file under public/ and test:hero-copy, as written; `words`: the dictionary, flattened
 *  ("ns.key" → text) per language; `base`: files as they stand at the merge base with origin/main. */
type World = { files: Map<string, string>; journey: Record<Loc, JourneyWords>; base: Map<string, string>; baseSha: string;
  words: Record<Loc, Record<string, string>> };

/** The text files under public/ — a static file a reader is served as written (the manifest, the service worker, the SVGs). */
const PUBLIC_TEXT = /[.](json|js|mjs|svg|txt|html|css|xml|webmanifest)$/;
function publicTextFiles(): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of readdirSync(join(REPO_ROOT, d), { withFileTypes: true })) {
      const rel = `${d}/${e.name}`;
      if (e.isDirectory()) walk(rel);
      else if (PUBLIC_TEXT.test(e.name)) out.push(rel);
    }
  };
  walk("public");
  return out.sort();
}
/** The dictionary of one language, flattened: "ns.key" (and "ns.list.0") → its text. */
function flatten(t: unknown, prefix = "", out: Record<string, string> = {}): Record<string, string> {
  if (typeof t === "string") out[prefix] = t;
  else if (t && typeof t === "object") for (const [k, v] of Object.entries(t)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  return out;
}

const git = (...args: string[]) => execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 32 * 1024 * 1024 });
function load(): World {
  const files = new Map<string, string>();
  for (const f of [...srcFiles(), ...publicTextFiles(), "scripts/hero-copy.test.mts"]) files.set(f, read(f));
  for (const f of [HELP, CHAT, STUB, EMPTY, CHAT_ROOT]) if (!files.has(f)) files.set(f, read(f));
  const words = Object.fromEntries(LOCS.map((l) => [l, flatten(dict[l])])) as Record<Loc, Record<string, string>>;
  const journey = Object.fromEntries(LOCS.map((l) => [l, { ...(dict[l].journey as Record<string, string>) }])) as Record<Loc, JourneyWords>;
  const base = new Map<string, string>();
  let baseSha = "";
  try {
    baseSha = git("merge-base", "HEAD", "origin/main").trim();
    base.set(STUB, git("show", `${baseSha}:${STUB}`).split(CR + LF).join(LF));
  } catch { /* no history here: §6's classic check reports NOT MEASURED and fails */ }
  return { files, journey, base, baseSha, words };
}
const text = (w: World, f: string) => w.files.get(f) ?? "";

type Ok = (id: string, label: string, cond: boolean, detail?: string) => void;

/* ══ §1-§4 · THE CENSUS OF WHAT THE FLIP MUST STILL CHANGE (WP7) ═════════════════════════════════════════════════════ */

/**
 * ⭐ THE STAGE. False until the S15 commit publishes the parked copy (`codex/vodacom-s15-copy`, S11 WP9), which flips it in
 * the same commit as the words it describes: §2's retired slogan leaves the tagline's key and the manifest, §3's legal lines
 * trade places and §4 reads the tagline too. A census that cannot tell "before" from "after" would pass either way.
 */
const PUBLISHED_AT_S15 = true;

const QUOTES = String.fromCharCode(34, 39, 96);
/** Whether code reads dictionary key `ns.k`: `t.ns.k`, `dict.en.ns.k`, or the key named whole in quotes. */
function readsKey(code: string, key: string): boolean {
  const [ns, k] = key.split(".");
  return new RegExp(`[.]${ns}[.]${k}(?![A-Za-z0-9_])|[${QUOTES}]${ns}[.]${k}[${QUOTES}]`).test(code);
}
const decommented = new Map<string, string>();
/** A file as code: comments gone for a script or a component (a census never counts a comment's words); data as written. */
function codeOf(w: World, f: string): string {
  const raw = text(w, f);
  if (!/[.](tsx?|m?ts|[cm]?js)$/.test(f)) return raw;
  let c = decommented.get(raw);
  if (c === undefined) { c = decomment(raw); decommented.set(raw, c); }
  return c;
}
const SRC_FILES = (w: World) => [...w.files.keys()].filter((f) => f.startsWith("src/") && f !== "src/lib/i18n-dict.ts");
/** The files that read a key — a substring test first, since most files never name it. */
function readersOf(w: World, key: string): string[] {
  const last = key.slice(key.lastIndexOf(".") + 1);
  return SRC_FILES(w).filter((f) => { const c = codeOf(w, f); return c.includes(last) && readsKey(c, key); }).sort();
}

/* ── §1 · the dial words ─────────────────────────────────────────────────────────────────────────────────────────── */

/** A key's English names the dial or the conviction. */
const DIAL_EN = /(?<![A-Za-z])dial(?![A-Za-z])|conviction/i;
/** The backstops in the other two languages (the English loan "dial" too): a key whose English escaped the census.
 *  ⚠️ Swahili's is kipima-dau, never bare "kipima", which is ordinary Swahili for a meter or a timer too (Amendment B9). */
const DIAL_BACKSTOP: Record<Loc, RegExp> = {
  en: DIAL_EN,
  sw: /kidhibiti|imani|kipima-dau|(?<![A-Za-z])dial(?![A-Za-z])/i,
  zh: /刻度盘|转盘|信念|(?<![A-Za-z])dial(?![A-Za-z])/i,
};
const DIAL_FILE = "src/components/markets/conviction-dial.tsx";
const CONFIRM = "src/components/markets/bet-confirm-modal.tsx";
const PRIMER = "src/components/onboarding/first-visit-primer.tsx";
const LANDING_BAND = "src/components/home/how-it-works.tsx";
/** Why a key that still names the dial may stand until the flip: its readers, exactly, and when it goes. */
type DialEntry = { readers: readonly string[]; why: string };
const DIAL_ITSELF = "a shelved surface — the conviction dial (docs/SHELVED.md at the S15 flip, the bet sheet replaces it everywhere; test:dial-stake keeps it running)";
const CONFIRM_MODAL = "a shelved surface — BetConfirmModal (docs/SHELVED.md at the S15 flip: the bet sheet's named-amount CTA confirms a bet)";
const PRIMER_CARD = "a shelved surface — the first-visit primer (docs/SHELVED.md, S11 WP2)";
/**
 * ⭐ THE ALLOWLIST — exactly the keys whose English names the dial or the conviction today, each with its readers and the
 * reason it may stand until the flip. SHRINK-ONLY: a key the census no longer finds must leave this table (a stale row is a
 * failure), and a key it finds that is not here is a failure — so the table is always the flip's own to-do list.
 */
const DIAL_KEYS: Record<string, DialEntry> = {
  "common.noConviction": { readers: [DIAL_FILE], why: DIAL_ITSELF },
  "common.dragTheDial": { readers: [DIAL_FILE], why: DIAL_ITSELF },
  "common.highConvictionHint": { readers: [DIAL_FILE], why: DIAL_ITSELF },
  "market.dragSetSide": { readers: [DIAL_FILE], why: DIAL_ITSELF },
  "market.dialUnlock": { readers: [DIAL_FILE], why: DIAL_ITSELF },
  "market.lockDialAria": { readers: [DIAL_FILE], why: DIAL_ITSELF },
  "market.unlockDialAria": { readers: [DIAL_FILE], why: DIAL_ITSELF },
  "market.stakeInputAria": { readers: [DIAL_FILE], why: DIAL_ITSELF },
  "market.multInputAria": { readers: [DIAL_FILE], why: DIAL_ITSELF },
  "dialog.conviction": { readers: [CONFIRM], why: CONFIRM_MODAL },
  "dialog.thenReaim": { readers: [CONFIRM], why: CONFIRM_MODAL },
  "market.chooseSideHelp": { readers: ["src/components/markets/side-picker.tsx"], why: "a shelved surface — the “Pick your side” gate (at the S15 flip the market page shows the two big buttons)" },
  "primer.card2Title": { readers: [PRIMER], why: PRIMER_CARD },
  "primer.card2Body": { readers: [PRIMER], why: PRIMER_CARD },
  "primer.card1Body": { readers: [LANDING_BAND, PRIMER].sort(), why: "the shelved primer, and the classic landing's how-it-works band — S15: the journey home replaces the landing for every reader" },
  "home.howStep1B": { readers: [LANDING_BAND], why: "the classic landing's how-it-works band — S15: the journey home replaces it for every reader" },
  "market.noBetYet": { readers: ["src/app/markets/[id]/page.tsx"], why: "the classic market page's own positions box (a journey reader is shown JourneyHolder) — S15: the dictionary's convergence of the classic keys" },
  "chat.helpline": { readers: [EMPTY], why: "the chat panel's classic arm (S11 WP6: a journey reader is shown journey.chatIntro) — S16, with the classic chat keys" },
  "chat.starterDial": { readers: [EMPTY], why: "the chat panel's classic arm (S11 WP6: a journey reader is shown journey.chatStarterHowTo) — S16" },
  "help.faq2a": { readers: [HELP], why: "/help's classic arm, read by its key's name (S11 WP5: a journey reader is shown journey.faq2a) — S16" },
  "lipa.ussdLabel": { readers: ["src/components/pay/lipa-qr-panel.tsx"], why: "the verb — dial a USSD code — never the conviction dial: it stays" },
  "home.priceCompetitionPool": { readers: [], why: "no reader: a dead key — S16's sweep" },
};
/** Keys read by their name built at run time, never spelled whole: how each reader names it. */
const DYNAMIC_READS: Record<string, { file: string; spelled: string }> = {
  "help.faq2a": { file: HELP, spelled: "t.help[`${key}a` as keyof typeof t.help]" },
};
/** Files a journey reader alone is served: none may read a key above. */
const JOURNEY_ONLY = (f: string) => f.startsWith("src/components/journey/") || f.startsWith("src/lib/journey/")
  || f === "src/components/onboarding/how-to-play-sheet.tsx" || f === "src/components/onboarding/how-to-host.tsx";

function s1(w: World, ok: Ok) {
  const keys = Object.keys(w.words.en).sort();
  const found = keys.filter((k) => DIAL_EN.test(w.words.en[k] ?? ""));
  const listed = Object.keys(DIAL_KEYS).sort();
  const unlisted = found.filter((k) => !DIAL_KEYS[k]), stale = listed.filter((k) => !found.includes(k));
  ok("1.census", `the keys whose English names the dial or the conviction are the allowlist exactly — ${found.length} today, each with its readers and the reason it stands until the flip (shrink-only: a key found and not listed fails, and so does a listed key no longer found)`,
    found.length >= 1 && unlisted.length === 0 && stale.length === 0, j({ unlisted, stale }));
  const outside = LOCS.flatMap((l) => Object.keys(w.words[l]).filter((k) => DIAL_BACKSTOP[l].test(w.words[l][k] ?? "") && !DIAL_KEYS[k]).map((k) => `${l}.${k}`));
  ok("1.backstop", "the Swahili and Chinese backstops (kidhibiti, imani, kipima-dau, 刻度盘, 转盘, 信念, and the loan “dial”) find no key outside the allowlist", outside.length === 0, j(outside));
  const drift: string[] = [];
  for (const [key, entry] of Object.entries(DIAL_KEYS)) {
    const dyn = DYNAMIC_READS[key];
    const readers = dyn ? (count(squash(codeOf(w, dyn.file)), dyn.spelled) === 1 ? [dyn.file] : []) : readersOf(w, key);
    if (j(readers) !== j([...entry.readers].sort())) drift.push(`${key}: ${j(readers)}`);
  }
  ok("1.readers", "each allowlisted key is read by exactly the files its row names (help.faq2a by its name built from the FAQ's key)", drift.length === 0, drift.join("; "));
  const journeyReads = SRC_FILES(w).filter(JOURNEY_ONLY).flatMap((f) => listed.filter((k) => readsKey(codeOf(w, f), k)).map((k) => `${f}: ${k}`));
  ok("1.journey", "no file a journey reader alone is served reads one (src/components/journey, src/lib/journey, the How-to sheet and host)", journeyReads.length === 0, j(journeyReads));
  const empty = squash(codeOf(w, EMPTY)), help = squash(codeOf(w, HELP));
  const arms = {
    starterDial: count(empty, "t.chat.starterDial") === 1 && count(empty, "journeyOn ? t.journey.chatStarterHowTo : t.chat.starterDial,") === 1,
    helpline: count(empty, "t.chat.helpline") === 1 && count(empty, "{journeyOn ? t.journey.chatIntro : t.chat.helpline}") === 1,
    faq2a: count(help, DYNAMIC_READS["help.faq2a"].spelled) === 1 && count(help, `faq2: { q: "faq2q", a: "faq2a" },`) === 1
      && count(help, "const own = journey ? JOURNEY_FAQ[key] : undefined;") === 1 && count(help, "{own ? fillNodes(t.journey[own.a]") === 1,
  };
  ok("1.arms", "the three a journey reader could still meet today — chat.helpline, chat.starterDial and help.faq2a — are read once each, in their classic arms only (the journey's words are the other arm)",
    Object.values(arms).every(Boolean), j(arms));
}

/* ── §2 · the retired slogan ─────────────────────────────────────────────────────────────────────────────────────── */

/** The retired slogan as it is spelled anywhere (SJ-20 retires it; the deck's tagline replaces it at S15) — and the
 *  manifest's wide-screenshot variant and the shelved primer's Chinese card, so a copy of either is found too. */
const RETIRED = ["Predict events. Not chance.", "Predict events, not chance", "Tabiri matukio. Si bahati.", "预测事件，而非运气。", "预测事件。不是碰运气。"];
const spells = (s: string) => RETIRED.filter((r) => s.toLowerCase().includes(r.toLowerCase()));
const MANIFEST = "public/manifest.json";
/** Every reader of the tagline's one home (S11-PLAN "The tagline" rows 1-9), exactly. */
const TAGLINE_READERS = [
  "src/app/layout.tsx",                         // og:title, the default <title>, twitter:title (SITE_TITLE)
  "src/components/auth/auth-shell.tsx",         // the auth rail, from 1024
  "src/app/page.tsx",                           // the home's own tab title
  "src/app/auth/register/page.tsx",             // the sign-up share card's sub-line
  "src/app/api/og/market/[id]/route.tsx",       // the market share card's footer, twice
  "src/lib/server/reports/brand.ts",            // the officers' PDF and XLSX reports
  "src/app/legal/rules/yes-no/page.tsx",        // the rules page's subtitle
  ...(PUBLISHED_AT_S15 ? ["src/app/api/og/page/route.tsx"] : []), // the generic share card joins at the flip
].sort();

function s2(w: World, ok: Ok) {
  const spelled = [...w.files.keys()].filter((f) => f.startsWith("src/") || f.startsWith("public/"))
    .filter((f) => f !== "src/lib/i18n-dict.ts").flatMap((f) => spells(codeOf(w, f)).map((r) => `${f}: ${r}`));
  let manifest: { name?: string; screenshots?: Array<{ form_factor?: string; label?: string }>;
    shortcuts?: Array<{ name?: string; short_name?: string; url?: string }> } = {};
  try { manifest = JSON.parse(text(w, MANIFEST)); } catch { /* reported below */ }
  const wide = (manifest.screenshots ?? []).filter((s) => s.form_factor === "wide").map((s) => s.label ?? "");
  const named = PUBLISHED_AT_S15 ? [] : [`${MANIFEST}: Predict events. Not chance.`, `${MANIFEST}: Predict events, not chance`];
  ok("2.files", PUBLISHED_AT_S15
      ? "no file in src/ or public/ spells the retired slogan outside the dictionary (decommented: page.tsx and not-found.tsx spell it in comments)"
      : "no file in src/ or public/ spells the retired slogan outside the dictionary but the manifest's name and its wide screenshot's label, each named (decommented: page.tsx and not-found.tsx spell it in comments)",
    j(spelled.sort()) === j(named.sort()) && (PUBLISHED_AT_S15 || (spells(manifest.name ?? "").length === 1 && wide.length === 1 && spells(wide[0]).length === 1)),
    j({ spelled, name: manifest.name, wide }));
  const readers = readersOf(w, "auth.railTagline");
  ok("2.readers", `every surface of the tagline reads its one home, auth.railTagline — exactly ${TAGLINE_READERS.length} readers: the site's titles, the auth rail, the home's tab, the sign-up card, the market card, the reports and the rules page`,
    j(readers) === j(TAGLINE_READERS), j(readers));
  ok("2.manifest", "the manifest's name is “50pick — ” + the English tagline (a static file the parked commit edits by hand: this is what holds it to the key)",
    manifest.name === `50pick — ${w.words.en["auth.railTagline"]}`, j({ name: manifest.name, key: w.words.en["auth.railTagline"] }));
  const shortcuts = (manifest.shortcuts ?? []).map(({ name, short_name, url }) => ({ name, short_name, url }));
  ok("2.shortcuts", "the installed app opens Questions directly at / and My tickets at /positions, without a /markets redirect",
    j(shortcuts.slice(0, 2)) === j([
      { name: "Questions", short_name: "Questions", url: "/" },
      { name: "My tickets", short_name: "Tickets", url: "/positions" },
    ]), j(shortcuts));
  const inDict = [...new Set(LOCS.flatMap((l) => Object.keys(w.words[l]).filter((k) => spells(w.words[l][k] ?? "").length > 0)))].sort();
  const exceptions = PUBLISHED_AT_S15 ? ["primer.card1Title"] : ["auth.railTagline", "primer.card1Title"];
  const primerReaders = readersOf(w, "primer.card1Title");
  ok("2.dictionary", PUBLISHED_AT_S15
      ? "in the dictionary only primer.card1Title still spells it: the named shelved exception, read by the shelved primer and the classic landing's band alone (Open point 17)"
      : "in the dictionary only auth.railTagline (until the S15 commit) and primer.card1Title spell it — the named shelved exception, read by the shelved primer and the classic landing's band alone (Open point 17)",
    j(inDict) === j(exceptions) && j(primerReaders) === j([LANDING_BAND, PRIMER].sort()), j({ inDict, primerReaders }));
}

/* ── §3 · the legal flip lines ───────────────────────────────────────────────────────────────────────────────────── */

const TERMS = "src/app/legal/terms/page.tsx";
const RULES_YN = "src/app/legal/rules/_content-yes-no.tsx";
/** Today's lines the flip replaces — Terms §4's dial paragraph and Rules §3's indicator — and the parked lines that take
 *  their place (S11-PLAN "The rules page" and "The Terms"), each by its opening words, in en, sw and zh. */
const LEGAL_TODAY: ReadonlyArray<readonly [string, string]> = [
  [TERMS, "The probabilities shown on the dial are <em>implied</em>"],
  [TERMS, "Uwezekano unaoonyeshwa kwenye kipima-dau <em>unadokezwa</em>"],
  [TERMS, "转盘上显示的概率是由当前资金池构成所<em>隐含</em>的"],
  [RULES_YN, "The conviction indicator shows where the crowd&apos;s money sits. It is information, not advice."],
  [RULES_YN, "Kipimo cha msimamo huonyesha pesa za umati zilipo. Ni taarifa, si ushauri."],
  [RULES_YN, "信心指示器显示资金分布，仅供参考，不构成建议。"],
];
const LEGAL_S15: ReadonlyArray<readonly [string, string]> = [
  [TERMS, "Before you bet, a market may show what its pools imply"],
  [TERMS, "Kabla hujaweka dau, soko linaweza kuonyesha kile ambacho mabwawa yake yanadokeza"],
  [TERMS, "下注前，市场可能会显示其资金池所隐含的信息"],
  [RULES_YN, "What a market shows before you bet"],
  [RULES_YN, "Kile ambacho soko linaonyesha kabla hujaweka dau"],
  [RULES_YN, "市场在您下注前显示的内容"],
];

function s3(w: World, ok: Ok) {
  const [present, absent] = PUBLISHED_AT_S15 ? [LEGAL_S15, LEGAL_TODAY] : [LEGAL_TODAY, LEGAL_S15];
  const bad = [
    ...present.filter(([f, s]) => count(squash(codeOf(w, f)), s) !== 1).map(([f, s]) => `not once: ${f}: ${s}`),
    ...absent.filter(([f, s]) => count(squash(codeOf(w, f)), s) !== 0).map(([f, s]) => `present: ${f}: ${s}`),
  ];
  ok("3.legal", PUBLISHED_AT_S15
      ? "Terms §4 and Rules §3 read the parked lines once each in en, sw and zh, and today's dial paragraph and indicator line are gone"
      : "Terms §4's dial paragraph and Rules §3's indicator line are each present exactly once in en, sw and zh, and none of the parked lines is published before S15",
    bad.length === 0, bad.join("; "));
}

/* ── §4 · the overclaim pattern ─────────────────────────────────────────────────────────────────────────────────── */

const HERO_COPY = "scripts/hero-copy.test.mts";
/** S11's words: the seven journey keys it added (every language) and the four Chinese How-to values it corrected. */
const S11_KEYS = ["faq2q", "faq2a", "faq3a", "faq5a", "faq6a", "chatIntro", "chatStarterHowTo"];
const S11_ZH_CORRECTED = ["howStep1Body", "howStep2Title", "howStep3Body", "howExampleBody"];
/** The pattern, read from `test:hero-copy` itself (its one definition: an official source, a machine, the crowd, chance). */
function overclaimOf(w: World): RegExp | null {
  const line = text(w, HERO_COPY).split(LF).find((l) => l.startsWith("const OVERCLAIM = /"));
  if (!line) return null;
  const body = line.slice("const OVERCLAIM = /".length, line.lastIndexOf("/"));
  try { return new RegExp(body, line.slice(line.lastIndexOf("/") + 1).replace(";", "").trim()); } catch { return null; }
}

function s4(w: World, ok: Ok) {
  const re = overclaimOf(w);
  ok("4.pattern", "test:hero-copy's OVERCLAIM pattern is read from its one definition, and it still finds what it names (official, rasmi, the crowd, chance)",
    re !== null && ["official", "chanzo rasmi", "the crowd", "umati", "群众", "not chance", "bahati"].every((s) => re.test(s)) && !re.test("Pick. See what you win."), String(re));
  if (re === null) return;
  const texts: Array<[string, string]> = [
    ...LOCS.flatMap((l) => S11_KEYS.map((k) => [`${l}.journey.${k}`, w.journey[l][k] ?? ""] as [string, string])),
    ...S11_ZH_CORRECTED.map((k) => [`zh.journey.${k}`, w.journey.zh[k] ?? ""] as [string, string]),
    ...(PUBLISHED_AT_S15 ? LOCS.map((l) => [`${l}.auth.railTagline`, w.words[l]["auth.railTagline"] ?? ""] as [string, string]) : []),
  ];
  const claims = texts.filter(([, v]) => v === "" || re.test(v)).map(([k, v]) => `${k}: ${v === "" ? "missing" : v.match(re)?.[0]}`);
  ok("4.overclaim", PUBLISHED_AT_S15
      ? `none of S11's words (${texts.length} texts) nor the new tagline claims an official source, a machine, the crowd or chance`
      : `none of S11's words (${texts.length} texts: the seven journey keys in three languages, the four corrected Chinese How-to values) claims an official source, a machine, the crowd or chance`,
    claims.length === 0, j(claims));
}

/* ══ §5 · /HELP FOR A JOURNEY READER ════════════════════════════════════════════════════════════════════════════════ */

/** The journey copies, as the page's table states them: FAQ item → the journey keys read for it. */
const WANT_TABLE = { faq2: { q: "faq2q", a: "faq2a" }, faq3: { a: "faq3a" }, faq5: { a: "faq5a" }, faq6: { a: "faq6a" } };
/** Today's expressions, word for word — the else arms a classic reader is served (S11-PLAN WP5: "not re-indented"). */
const CLASSIC_Q = "t.help[`${key}q` as keyof typeof t.help]";
const CLASSIC_A = [
  `key === "faq1" && cfg.feeModel === "loser-share"`,
  "? fill(t.help.faq1aLoser, { pct: pctNum((cfg.platformFeeRate ?? 0) + (cfg.operatorFeeRate ?? 0)) })",
  ": fill(t.help[`${key}a` as keyof typeof t.help], { pct: pctNum(cfg.commissionRate), ceiling: fmtRate(cfg.feeCeilingRate), hours: durationHours(locale, cfg.objectionWindowHours) })}",
].join(" ");
/** Words that name a surface a journey reader no longer meets, per language (the classic answers' own doors). */
const SHELVED_WORDS: Record<Loc, RegExp> = {
  en: /dial|confirm popup|bet-confirm|Wallet →|Profile →|Sell-now|Sell now|Responsible gambling|odds|5 minutes|10 seconds/i,
  sw: /kipimo|kipima|dial|Kidirisha cha kuthibitisha|Pochi →|Wasifu →|Uza-sasa|Vikomo|dakika 5|sekunde 10/i,
  zh: /转盘|刻度盘|确认弹窗|钱包 →|个人资料 →|立即卖出|负责任博彩|5 分钟|10 秒|赔率/,
};

function s5(w: World, ok: Ok) {
  const page = decomment(text(w, HELP));
  const flat = squash(page);
  const tableAt = flat.indexOf("const JOURNEY_FAQ:");
  const tableText = tableAt < 0 ? "" : flat.slice(tableAt, flat.indexOf("};", tableAt) + 2);
  const entries = [...tableText.matchAll(/(faq[0-9]): [{] (?:q: "(faq[0-9]q)", )?a: "(faq[0-9]a)" [}]/g)]
    .map((m) => [m[1], m[2] ? { q: m[2], a: m[3] } : { a: m[3] }] as const);
  const table = Object.fromEntries(entries);
  ok("5.table", "the page's one table of journey copies is faq2 (question and answer), faq3, faq5 and faq6 — Open point 14",
    j(table) === j(WANT_TABLE), j(table));
  const slot = {
    resolver: count(flat, "const { journey } = await resolveSimpleJourney();") === 1,
    own: count(flat, "const own = journey ? JOURNEY_FAQ[key] : undefined;") === 1,
    question: count(flat, `<span>{own?.q ? t.journey[own.q] : ${CLASSIC_Q}}</span>`) === 1,
    answer: count(flat, `{own ? fillNodes(t.journey[own.a], { max: <span className="amount">{formatTzs(WITHDRAW_MAX_TZS)}</span> }) : ${CLASSIC_A}`) === 1,
    noOtherJourneyRead: count(flat, "t.journey[") === 2,
  };
  ok("5.slot", "each copy is read in today's slot, for a journey reader alone (the shell's own resolver), the journey arm first and today's expression the else arm, word for word",
    Object.values(slot).every(Boolean), j(slot));
  const keyDefects: string[] = [];
  const keys = ["faq2q", "faq2a", "faq3a", "faq5a", "faq6a"];
  for (const l of LOCS) {
    for (const k of keys) {
      const v = w.journey[l][k];
      if (typeof v !== "string" || v.trim() === "") { keyDefects.push(`${l}.${k} missing`); continue; }
      const shelved = SHELVED_WORDS[l].exec(v);
      if (shelved) keyDefects.push(`${l}.${k} names "${shelved[0]}"`);
      if (/TZS|%|×/.test(v)) keyDefects.push(`${l}.${k} types a figure`);
      if (/[0-9]/.test(v.replace(/[{][a-z]+[}]/g, ""))) keyDefects.push(`${l}.${k} types a digit`);
    }
    if (!w.journey[l].faq3a?.includes("{max}")) keyDefects.push(`${l}.faq3a has no {max}`);
  }
  ok("5.keys", "the five journey copies exist in sw, en and zh, name no surface a journey reader no longer meets (the dial, the confirm popup, Wallet → Withdraw, Profile → limits, Sell-now, typed minutes), and type no figure — the cap is {max}",
    keyDefects.length === 0, keyDefects.join("; "));
  const max = formatTzs(WITHDRAW_MAX_TZS);
  const held = LOCS.filter((l) => {
    const html = renderToStaticMarkup(createElement("p", null, ...fillNodes(w.journey[l].faq3a ?? "", { max: createElement("span", { className: "amount" }, max) })));
    return count(html, `<span class="amount">${max}</span>`) === 1 && !html.includes("{max}");
  });
  ok("5.max", `{max} is the per-withdrawal cap (${max}), formatted, and drawn as money in each language: one .amount figure (mono, tabular, untracked, whole — §M4; test:type-scale §1/§2), never the answer's body face`,
    j(held) === j([...LOCS]) && slot.answer, j(held));
}

/* ══ §6 · THE CHAT (WP6) ═════════════════════════════════════════════════════════════════════════════════════════════ */

type Mod = Record<string, any>;
const builtCode = new Map<string, string>();
/** `text` built (esbuild, in memory) and evaluated with its imports from `deps` — `test:howto`'s method. */
function buildModule(file: string, text: string, deps: Record<string, unknown>): Mod {
  const key = file + LF + text;
  let code = builtCode.get(key);
  if (code === undefined) {
    code = transformSync(text, { loader: file.endsWith(".tsx") ? "tsx" : "ts", format: "cjs", target: "es2022" }).code;
    builtCode.set(key, code);
  }
  const mod: { exports: Mod } = { exports: {} };
  const need = (spec: string) => {
    if (spec in deps) return deps[spec];
    throw new Error(`${file} imports ${spec}, which test:flip-copy does not provide`);
  };
  new Function("require", "module", "exports", code)(need, mod, mod.exports);
  return mod.exports;
}
const STUB_DEPS = { "@/lib/server/validators": Validators, "@/lib/payout": Payout, "@/lib/utils": Utils };
/** The offline helper's intent table, built from a text with `stubReply` exported for the run (the file exports it not). */
const stubOf = (src: string) => buildModule(STUB, `${src}${LF}export { stubReply };${LF}`, STUB_DEPS).stubReply as
  (userText: string, lang: "en" | "sw" | "zh", journey?: boolean) => Record<string, unknown>;
/** The helper's public door, built from the same text: `sendMessage`, whose 600 ms typing pause is skipped for the run. */
async function sendOf(src: string, q: string, opts?: { journey?: boolean }): Promise<Record<string, unknown>> {
  const send = buildModule(STUB, src, STUB_DEPS).sendMessage as (h: unknown[], q: string, o?: { journey?: boolean }) => Promise<Record<string, unknown>>;
  const real = globalThis.setTimeout;
  globalThis.setTimeout = ((fn: () => void) => real(fn, 0)) as unknown as typeof setTimeout;
  try { return await (opts === undefined ? send([], q) : send([], q, opts)); } finally { globalThis.setTimeout = real; }
}
/** The live action's two prompts, built from its text with the two builders exported for the run; no server is reached. */
function promptsOf(src: string): { today: string; journey: string } {
  const m = buildModule(CHAT, `${src}${LF}export { buildSystemPrompt as __today, systemPrompt as __prompt };${LF}`, {
    "@/lib/server/session": { getSession: async () => null },
    "@/lib/server/rate-limit": { rateCheckAsync: async () => ({ allowed: true }) },
    "@/lib/server/config-store": { loadConfig: async () => null, saveConfig: async () => undefined },
    "@/lib/server/market-config": { getGlobalConfig: async () => ({ objectionWindowHours: 24 }) },
    // Stand-ins, never the real contact (test:support-contact §8: a contact is written once, in support-config.ts).
    "@/lib/server/support-config": { SUPPORT_EMAIL: () => "SUPPORT_EMAIL()", SUPPORT_PHONE: () => "SUPPORT_PHONE()" },
    "@/lib/server/validators": Validators, "@/lib/payout": Payout, "@/lib/utils": Utils,
    "@/lib/server/simple-journey-switch": { simpleJourneyStateNow: async () => "STAFF_PREVIEW" },
  });
  return { today: m.__prompt("en", 24, false), journey: m.__prompt("en", 24, true) };
}
/** The questions the helper is asked: every intent, in the languages it answers. */
const ASKED: Array<[string, "en" | "sw" | "zh"]> = [
  ["How do I deposit?", "en"], ["What's the conviction dial?", "en"], ["How do I play?", "en"], ["How do I place a bet?", "en"],
  ["How do I withdraw my winnings?", "en"], ["How does KYC work?", "en"], ["Can I invite a friend?", "en"], ["Tell me a joke", "en"],
  ["Which side will win?", "en"], ["How do I propose a market?", "en"], ["Talk to support", "en"], ["purple elephants", "en"],
  ["Ninawezaje kuweka amana?", "sw"], ["Ninawezaje kucheza?", "sw"], ["Dial ya imani ni nini?", "sw"], ["Nataka kutoa pesa, malipo", "sw"],
  ["uthibitisho wa KYC", "sw"], ["alika rafiki", "sw"], ["Jinsi ya kuweka dau", "sw"], ["如何充值？", "zh"],
];
const words = (r: Record<string, unknown>) => [r.text, ...(Array.isArray(r.paragraphs) ? r.paragraphs : [])].filter((x): x is string => typeof x === "string").join(LF);
const DIAL = /dial|conviction|kidhibiti|imani|kipima|刻度盘|转盘|信念/i;
/** Passages a money, responsible-gambling, identity or email fact opens with — shared verbatim by both prompts (Open point 16). */
const SHARED_FACTS = ["- Winners share the pool. Our commission is 13% OF THE LOSING SIDE.", "- BECAUSE THE FEE COMES ONLY OUT OF THE LOSING SIDE",
  "- If nobody bets the other side", "- Deposits via M-Pesa", "- A CONFIRMED EMAIL ADDRESS IS NEEDED BEFORE A WITHDRAWAL", "- IDENTITY VERIFICATION IS ASKED BEFORE",
  "- If a player is ALREADY VERIFIED", "- Withdrawal mechanics, once verified:", "- Responsible gambling:", "- INVITING IS FREE AND PAYS NOTHING",
  "- THERE IS NO BONUS WALLET.", "- EARNING COMMISSION", "- Resolution:", "- 18+ only", "- That desk belongs to 50pick.", "RULES:", "1. NEVER", "2. If the user shows signs", "3. If you don't know"];

async function s6(w: World, ok: Ok) {
  // 6.prompt — the two prompts, built.
  let P: { today: string; journey: string } | null = null;
  try { P = promptsOf(text(w, CHAT)); } catch (e) { ok("6.prompt", "both prompts build from chat.ts", false, (e as Error).message); return; }
  const lines = { today: P.today.split(LF), journey: P.journey.split(LF) };
  const changed = lines.today.filter((l) => !lines.journey.includes(l));
  const shared = SHARED_FACTS.map((f) => {
    const t = lines.today.filter((l) => l.startsWith(f)), jl = lines.journey.filter((l) => l.startsWith(f));
    return { f, ok: t.length === 1 && j(t) === j(jl) };
  }).filter((x) => !x.ok).map((x) => x.f);
  const journeyAdds = ["A player chooses a question and taps YES or NO", "**Place bet · TZS X** places exactly that bet", "The estimate shown before a bet is marked ≈",
    "- Selling a bet: in **My tickets**", "- HOW TO PLAY:", "/?howto=1", "1. Tap **+ Deposit**", "KEY PAGES: / (the questions)"];
  const missing = journeyAdds.filter((a) => !P!.journey.includes(a));
  ok("6.prompt", "the journey prompt is today's with the named passages swapped — the format example, scope, the refusal, the first fact, the estimate, the Sell line and three new facts, the key pages — and every money, responsible-gambling, identity and email line shared verbatim (Open point 16)",
    P.today !== P.journey && changed.length >= 5 && changed.length <= 8 && shared.length === 0 && missing.length === 0,
    j({ changed: changed.length, shared, missing }));
  ok("6.dial", "the journey prompt names neither the dial nor the conviction; today's still does (it is every reader's until the flip)",
    !DIAL.test(P.journey) && DIAL.test(P.today), (P.journey.match(DIAL) ?? [""])[0]);
  // 6.stub — the offline helper, run.
  let today: ReturnType<typeof stubOf> | null = null, base: ReturnType<typeof stubOf> | null = null;
  try { today = stubOf(text(w, STUB)); } catch (e) { ok("6.stub", "the offline helper builds", false, (e as Error).message); return; }
  const baseSrc = w.base.get(STUB);
  if (baseSrc === undefined) {
    ok("6.classic", "a classic reader's offline answers are the branch base's, word for word", false, `NOT MEASURED — git holds no ${STUB} at the merge base`);
  } else {
    try { base = stubOf(baseSrc); } catch (e) { base = null; ok("6.classic", "the base's helper builds", false, (e as Error).message); }
    if (base) {
      const drift = ASKED.filter(([q, l]) => j({ ...today!(q, l, false), ticketId: 0 }) !== j({ ...base!(q, l), ticketId: 0 })).map(([q]) => q);
      ok("6.classic", `a classic reader's offline answers are the branch base's, word for word (${ASKED.length} questions; the base ${w.baseSha.slice(0, 9)})`,
        drift.length === 0, j(drift));
    }
  }
  const replies = ASKED.map(([q, l]) => ({ q, l, r: today!(q, l, true) }));
  const dialSaid = replies.filter((x) => DIAL.test(words(x.r))).map((x) => x.q);
  const teaching = replies.filter((x) => ["How do I play?", "How do I place a bet?", "What's the conviction dial?", "Ninawezaje kucheza?", "Dial ya imani ni nini?", "Jinsi ya kuweka dau"].includes(x.q));
  const uncited = teaching.filter((x) => !j(x.r.citations ?? []).includes("/?howto=1")).map((x) => x.q);
  const zh = replies.find((x) => x.l === "zh");
  const doors = {
    deposit: words(replies[0].r).includes("1. Tap **+ Deposit** at the top"),
    withdraw: words(replies[4].r).includes("tap your balance at the top and choose **Withdraw** (or open **Account → Withdraw**)"),
    kyc: words(replies[5].r).includes("**Account → Identity verification**"),
    invite: words(replies[6].r).includes("Account → Invite friends") && !words(replies[6].r).includes("Profile →"),
    zh: !!zh && words(zh.r).includes("「玩法说明」（/?howto=1）") && !words(zh.r).includes("人工"),
  };
  // 6.send — the public door hands the reader's answer on: a journey reader asking how to play is taught it; nobody else is.
  try {
    const asked = { journey: await sendOf(text(w, STUB), "How do I play?", { journey: true }), classic: await sendOf(text(w, STUB), "How do I play?"),
      classicExplicit: await sendOf(text(w, STUB), "How do I play?", { journey: false }) };
    const cites = (r: Record<string, unknown>) => j(r.citations ?? []).includes("/?howto=1");
    ok("6.send", "sendMessage hands the reader's answer to the helper: a journey reader asking how to play is taught it with /?howto=1; a classic reader (no answer, or false) gets today's reply",
      cites(asked.journey) && !cites(asked.classic) && !cites(asked.classicExplicit) && j({ ...asked.classic, id: 0 }) === j({ ...asked.classicExplicit, id: 0 }),
      j({ journey: asked.journey.kind, classic: asked.classic.kind }));
  } catch (e) { ok("6.send", "sendMessage runs", false, (e as Error).message); }
  ok("6.stub", "a journey reader's offline answers name no dial, teach betting by the How-to sheet's steps citing /?howto=1 (also when asked about “the dial”), and give the journey's doors — + Deposit, the balance's Withdraw, Account → …, How to play first in Chinese",
    dialSaid.length === 0 && uncited.length === 0 && teaching.length === 6 && Object.values(doors).every(Boolean), j({ dialSaid, uncited, doors }));
  // 6.panel — the chat panel's words, by the reader.
  const empty = squash(decomment(text(w, EMPTY)));
  const panel = {
    reads: count(empty, "const journeyOn = useJourneyOn();") === 1,
    chip: count(empty, "journeyOn ? t.journey.chatStarterHowTo : t.chat.starterDial,") === 1,
    intro: count(empty, `<div className="cm-empty-sub">{journeyOn ? t.journey.chatIntro : t.chat.helpline}</div>`) === 1,
    keysClean: LOCS.every((l) => !DIAL.test(w.journey[l].chatIntro ?? "x dial") && !DIAL.test(w.journey[l].chatStarterHowTo ?? "x dial")),
    root: count(squash(decomment(text(w, CHAT_ROOT))), "await sendMessage([...messages, user], text, { journey: journeyOn });") === 1,
  };
  ok("6.panel", "the panel's intro and second chip are the journey's for a journey reader (the shell's answer, useJourneyOn) and today's keys otherwise; neither journey word names the dial; ChatRoot hands the helper the same answer",
    Object.values(panel).every(Boolean), j(panel));
}

async function run(w: World, log: (l: string) => void): Promise<string[]> {
  const failures: string[] = [];
  const ok: Ok = (id, label, cond, detail = "") => {
    if (!cond) failures.push(`${id} · ${label}`);
    log(`${cond ? "PASS" : "FAIL"} ${id} · ${label}${!cond && detail ? ` — ${detail}` : ""}`);
  };
  log("§0 · the population");
  const srcCount = SRC_FILES(w).length, pubCount = [...w.files.keys()].filter((f) => f.startsWith("public/")).length;
  const keyCount = Object.keys(w.words.en).length;
  ok("0.population", `the census reads ${srcCount} src files, ${pubCount} text files under public/ (the manifest among them) and the whole dictionary (${keyCount} English keys) — a census over nothing would pass`,
    srcCount >= 700 && pubCount >= 3 && w.files.has(MANIFEST) && keyCount >= 2000 && LOCS.every((l) => Object.keys(w.words[l]).length >= 2000), j({ srcCount, pubCount, keyCount }));
  log("§1 · the dial words");
  s1(w, ok);
  log("§2 · the retired slogan");
  s2(w, ok);
  log("§3 · the legal flip lines");
  s3(w, ok);
  log("§4 · the overclaim pattern");
  s4(w, ok);
  log("§5 · /help for a journey reader");
  s5(w, ok);
  log("§6 · the chat");
  await s6(w, ok);
  return failures;
}

/* ══ THE PLANTS ══════════════════════════════════════════════════════════════════════════════════════════════════════ */

type Plant = { name: string; expect: RegExp; plant: (w: World) => World; alone?: boolean };
function swap(t: string, from: string, to: string): string {
  const n = count(t, from);
  if (n !== 1) throw new Error(`the anchor ${j(from.slice(0, 70))} occurs ${n} times`);
  return t.replace(from, () => to);
}
const edit = (f: string, from: string, to: string) => (w: World): World => ({ ...w, files: new Map(w.files).set(f, swap(text(w, f), from, to)) });
const add = (f: string, body: string) => (w: World): World => ({ ...w, files: new Map(w.files).set(f, body) });
const dictWord = (l: Loc, k: string, v: (old: string) => string) => (w: World): World => ({
  ...w, words: { ...w.words, [l]: { ...w.words[l], [k]: v(w.words[l][k] ?? "") } },
});
const word = (l: Loc, k: string, v: (old: string) => string) => (w: World): World => ({
  ...w, journey: { ...w.journey, [l]: { ...w.journey[l], [k]: v(w.journey[l][k] ?? "") } },
});

const PLANTS: Plant[] = [
  // §1
  { name: "a new key names the dial (a journey hint: “Drag the dial”)", expect: /^1[.]census /,
    plant: dictWord("en", "journey.dialHint", () => "Drag the dial to set your stake") },
  { name: "an allowlisted key leaves the dictionary and stays in the table (a stale row)", expect: /^1[.]census /, alone: true,
    plant: (w) => ({ ...w, words: Object.fromEntries(LOCS.map((l) => { const c = { ...w.words[l] }; delete c["market.dialUnlock"]; return [l, c]; })) as World["words"] }) },
  { name: "a Swahili word says kidhibiti where its English names nothing", expect: /^1[.]backstop /, alone: true,
    plant: dictWord("sw", "journey.howCta", (o) => `${o} (kidhibiti)`) },
  { name: "a Chinese word says 转盘 where its English names nothing", expect: /^1[.]backstop /, alone: true,
    plant: dictWord("zh", "journey.howCta", (o) => `${o}（转盘）`) },
  { name: "a journey file reads a dial key (a hint under the How-to card)", expect: /^1[.](readers|journey) /,
    plant: add("src/components/journey/home/dial-hint.tsx", "export const dialHint = (t: { market: { dialUnlock: string } }) => t.market.dialUnlock;") },
  { name: "the chat chip's two arms both read starterDial (a journey reader offered the dial)", expect: /^(1[.]arms|6[.]panel) /,
    plant: edit(EMPTY, "journeyOn ? t.journey.chatStarterHowTo : t.chat.starterDial,", "journeyOn ? t.chat.starterDial : t.chat.starterDial,") },
  { name: "faq2 leaves the journey's table (a journey reader handed faq2a, the dial's answer)", expect: /^(1[.]arms|5[.]table) /,
    plant: edit(HELP, `  faq2: { q: "faq2q", a: "faq2a" },${LF}`, "") },
  // §2
  { name: "a new strip types the retired slogan", expect: /^2[.]files /, alone: true,
    plant: add("src/components/layout/tagline-strip.tsx", "export const TaglineStrip = () => <p>Predict events. Not chance.</p>;") },
  { name: "the layout types its title again (SITE_TITLE a literal)", expect: /^2[.](files|readers) /,
    plant: edit("src/app/layout.tsx", "const SITE_TITLE = `50pick — ${dict.en.auth.railTagline}`;", 'const SITE_TITLE = "50pick — Predict events. Not chance.";') },
  { name: "the market card's footer types the slogan again", expect: /^2[.](files|readers) /,
    plant: (w) => ({ ...w, files: new Map(w.files).set("src/app/api/og/market/[id]/route.tsx",
      text(w, "src/app/api/og/market/[id]/route.tsx").split("<span>{dict.en.auth.railTagline}</span>").join("<span>Predict events. Not chance.</span>")) }) },
  { name: "a new surface reads the tagline outside the table", expect: /^2[.]readers /, alone: true,
    plant: add("src/components/markets/tagline-chip.tsx", "export const chip = (t: { auth: { railTagline: string } }) => t.auth.railTagline;") },
  { name: "the manifest's name drifts from the key", expect: /^2[.](manifest|files) /,
    plant: (w) => edit(MANIFEST, `"name": "50pick — ${w.words.en["auth.railTagline"]}",`, '"name": "50pick — Words drift",')(w) },
  { name: "a second dictionary key spells the slogan (a hero line)", expect: /^2[.]dictionary /, alone: true,
    plant: dictWord("en", "journey.heroTagline", () => "Predict events. Not chance.") },
  // §3
  { name: "Terms §4's dial paragraph rewritten before S15 (the parked text half-applied)", expect: /^3[.]legal /, alone: true,
    plant: edit(TERMS, "Before you bet, a market may show what its pools imply", "The probabilities shown on the dial are <em>implied</em>") },
  { name: "a parked rules line published before S15", expect: /^3[.]legal /, alone: true,
    plant: edit(RULES_YN, "<li>市场在您下注前显示的内容——资金分布，或某笔投注可获回报的预估——仅供参考，不构成建议。</li>", "<li>信心指示器显示资金分布，仅供参考，不构成建议。</li>") },
  { name: "the Swahili indicator line doubled", expect: /^3[.]legal /, alone: true,
    plant: edit(RULES_YN, "<li>Kile ambacho soko linaonyesha kabla hujaweka dau — pesa zilipo, au makadirio ya kiasi ambacho dau litalipa — ni taarifa, si ushauri.</li>", "<li>Kile ambacho soko linaonyesha kabla hujaweka dau — pesa zilipo, au makadirio ya kiasi ambacho dau litalipa — ni taarifa, si ushauri.</li><li>Kile ambacho soko linaonyesha kabla hujaweka dau — pesa zilipo, au makadirio ya kiasi ambacho dau litalipa — ni taarifa, si ushauri.</li>") },
  // §4
  { name: "an S11 word claims the crowd (the chat's intro)", expect: /^4[.]overclaim /, alone: true,
    plant: word("en", "chatIntro", (o) => `${o} The crowd knows best.`) },
  { name: "a corrected Chinese How-to value claims chance (运气)", expect: /^4[.]overclaim /, alone: true,
    plant: word("zh", "howStep3Body", (o) => `${o}全凭运气。`) },
  { name: "test:hero-copy's pattern renamed (the census would read nothing)", expect: /^4[.]pattern /, alone: true,
    plant: edit(HERO_COPY, "const OVERCLAIM = /", "const OVERCLAIMS = /") },
  // §0
  { name: "the census reads no src file (a walker gone blind)", expect: /^0[.]population /,
    plant: (w) => ({ ...w, files: new Map([...w.files].filter(([f]) => !f.startsWith("src/") || [HELP, CHAT, STUB, EMPTY, CHAT_ROOT].includes(f))) }) },
  { name: "a classic reader handed the journey copies (the resolver's answer dropped)", expect: /^5[.]slot /,
    plant: edit(HELP, "const own = journey ? JOURNEY_FAQ[key] : undefined;", "const own = JOURNEY_FAQ[key];") },
  { name: "the question slot reads the classic key in its journey arm", expect: /^5[.]slot /, alone: true,
    plant: edit(HELP, "<span>{own?.q ? t.journey[own.q] :", "<span>{own?.q ? t.help.faq2q :") },
  { name: "the classic answer re-written (its loser-share branch dropped)", expect: /^5[.]slot /,
    plant: edit(HELP, `: key === "faq1" && cfg.feeModel === "loser-share"`, `: false`) },
  { name: "faq5's journey copy dropped from the table", expect: /^5[.]table /, alone: true,
    plant: edit(HELP, `  faq5: { a: "faq5a" },${LF}`, "") },
  { name: "the cap typed into the English answer", expect: /^5[.](keys|max) /,
    plant: word("en", "faq3a", (o) => o.replace("{max}", "TZS 5,000,000")) },
  { name: "the dial named in the Swahili answer", expect: /^5[.]keys /, alone: true,
    plant: word("sw", "faq2a", (o) => `${o} Tumia kipima kuona bei.`) },
  { name: "the Chinese faq6 copy says 5 minutes", expect: /^5[.]keys /, alone: true,
    plant: word("zh", "faq6a", (o) => `${o}下注后 5 分钟内可卖出。`) },
  // §6
  { name: "the journey prompt swaps nothing (the old prompt sent at the flip)", expect: /^6[.](prompt|dial) /,
    plant: edit(CHAT, "  return journey ? journeyPrompt(prompt) : prompt;", "  return prompt;") },
  { name: "a money line swapped in the journey prompt (the commission restated)", expect: /^6[.]prompt /, alone: true,
    plant: edit(CHAT, "const JOURNEY_SWAPS: readonly JourneySwap[] = [", "const JOURNEY_SWAPS: readonly JourneySwap[] = [" + LF + '  { phrase: "Our commission is 13% OF THE LOSING SIDE.", to: "Our commission is small." },') },
  { name: "the journey prompt keeps “the conviction dial” in its scope", expect: /^6[.](dial|prompt) /,
    plant: edit(CHAT, '  { phrase: "deposits/withdrawals, the conviction dial, payouts", to: "deposits/withdrawals, placing a bet (the bet sheet and its estimate), How to play, payouts" },' + LF, "") },
  { name: "the offline helper ignores the reader (no journey branch)", expect: /^6[.]send /, alone: true,
    plant: edit(STUB, "  const reply = stubReply(userText, lang, opts.journey === true);", "  const reply = stubReply(userText, lang, false);") },
  { name: "the how-to answer cites /help instead of the guide", expect: /^6[.](stub|send) /,
    plant: edit(STUB, '      citations: [{ n: 1, href: "/?howto=1", label: "/?howto=1" }],', '      citations: [{ n: 1, href: "/help", label: "/help" }],') },
  { name: "a classic reply changed under the journey's cover (the classic deposit step)", expect: /^6[.]classic /, alone: true,
    plant: edit(STUB, ': "1. Open your **Wallet** and tap **Deposit**[1]",', ': "1. Open **Wallet** and tap **Deposit**[1]",') },
  { name: "the journey's Chinese hand-off says “human” again", expect: /^6[.]stub /, alone: true,
    plant: edit(STUB, "如需进一步协助，我可以为您转接支持团队。", "如需人工协助，我可以为您转接支持团队。") },
  { name: "the panel's chip offers the journey's words to every reader", expect: /^6[.]panel /,
    plant: edit(EMPTY, "journeyOn ? t.journey.chatStarterHowTo : t.chat.starterDial,", "t.journey.chatStarterHowTo,") },
  { name: "ChatRoot no longer hands the helper the reader's answer", expect: /^6[.](panel|stub) /,
    plant: edit(CHAT_ROOT, "await sendMessage([...messages, user], text, { journey: journeyOn });", "await sendMessage([...messages, user], text);") },
  { name: "the cap printed in the answer's body face (no .amount: what test:type-scale found)", expect: /^5[.](max|slot) /,
    plant: edit(HELP, '{ max: <span className="amount">{formatTzs(WITHDRAW_MAX_TZS)}</span> }', "{ max: formatTzs(WITHDRAW_MAX_TZS) }") },
];

const REAL = load();
if (!PROVE_RED) {
  console.log("flip-copy — the copy ready for the flip (the Vodacom plan S11)");
  const failed = await run(REAL, (l) => console.log(l));
  console.log(`${LF}FLIP COPY — ${failed.length === 0 ? "all checks passed" : `${failed.length} failed`}${LF}`);
  process.exitCode = failed.length === 0 ? 0 : 1;
} else {
  const quiet = () => {};
  let caught = 0, fail = 0;
  const say = (label: string, cond: boolean, extra = "") => { if (!cond) fail++; console.log(`${cond ? "PROVED  " : "MISSED  "} ${label}${extra ? ` — ${extra}` : ""}`); };
  const judge = (failures: string[], p: Pick<Plant, "expect" | "alone">) => {
    const hit = failures.some((f) => p.expect.test(f));
    const beside = p.alone ? failures.filter((f) => !p.expect.test(f)) : [];
    return { proved: hit && beside.length === 0, hit, beside };
  };
  {
    const lone = { expect: /^5[.]slot /, alone: true };
    const cases: Array<[string[], boolean]> = [[["5.slot · x"], true], [["5.slot · x", "5.keys · y"], false], [["5.slots · x"], false], [[], false]];
    const wrong = cases.filter(([f, want]) => judge(f, lone).proved !== want);
    say("the verdict's control: a lone failure of the check proves it; a second failure beside it, a neighbouring id or nothing does not", wrong.length === 0, j(wrong));
  }
  const clean = await run(REAL, quiet);
  say("the REAL tree passes every check", clean.length === 0, clean.join(" | "));
  for (const p of PLANTS) {
    let failures: string[];
    try { failures = await run(p.plant(REAL), quiet); }
    catch (e) { say(p.name, false, `the plant is broken: ${(e as Error).message}`); continue; }
    const { proved, hit, beside } = judge(failures, p);
    if (proved) caught++;
    say(p.name, proved, proved ? ""
      : !hit ? (failures.length === 0 ? "NOTHING failed — the gate cannot see this defect" : `failed instead: ${failures.slice(0, 2).join(" | ")}`)
      : `its check failed, but so did another, so the check is not proved to catch it alone: ${beside.slice(0, 2).join(" | ")}`);
  }
  console.log(`${LF}RED CONTROL — ${caught}/${PLANTS.length} caught${fail === 0 ? "" : ` · ${fail} FAILED`}${LF}`);
  process.exitCode = fail === 0 ? 0 : 1;
}
