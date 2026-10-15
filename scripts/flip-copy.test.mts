/**
 * test:flip-copy — THE COPY READY FOR THE FLIP: what a journey reader is told now, and the census of what the S15 flip
 * must still change (the Vodacom plan S11 WP5–WP7; VODACOM-PLAN §3.9; `docs/design-system/v5-2026-09-29-simplified-journey/
 * S11-PLAN.md` WP7 and Open points 14, 15, 17, 22-24).
 *
 *   npm run test:flip-copy     (in test:all; run at each S11 push — S11-PLAN Open point 22)
 *   npm run red:flip-copy      (--prove-red: every defect below is planted IN MEMORY, and each must turn its own check red)
 *
 *   §5 /HELP FOR A JOURNEY READER (WP5): the FAQ's journey copies — faq2's question and answer, faq3, faq5 and faq6 — are
 *      read in the SAME slots as today's keys, for a reader the journey is shown to and for no other: the journey arm first,
 *      today's expression the else arm, word for word; the keys exist in three languages, name none of the surfaces a
 *      journey reader no longer meets, and type no figure (`{max}` is the cap, formatted and held whole).
 *   §6 THE CHAT (WP6), built from its text and run: the live action's two prompts — the journey's is today's with the named
 *      passages swapped, every money, responsible-gambling, identity and email line shared verbatim, and no dial in it; the
 *      offline helper — a classic reader's answers the branch base's word for word, a journey reader's naming no dial,
 *      teaching betting by the How-to steps with /?howto=1, and giving the journey's doors; the panel's words by the reader.
 * ⛔ No backslash in this file: an editing tool decodes them (`test:source-bytes`). Patterns use character classes.
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { transformSync } from "esbuild";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { REPO_ROOT } from "./lib/tracked-files.mts";
import { decomment } from "./lib/decomment.mts";
import { dict } from "../src/lib/i18n-dict.ts";
import { keepFigures } from "../src/components/ui/keep-words.tsx";
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
type World = { files: Map<string, string>; journey: Record<Loc, JourneyWords>; base: Map<string, string>; baseSha: string };

const git = (...args: string[]) => execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 32 * 1024 * 1024 });
function load(): World {
  const files = new Map<string, string>();
  for (const f of [HELP, CHAT, STUB, EMPTY, CHAT_ROOT]) files.set(f, read(f));
  const journey = Object.fromEntries(LOCS.map((l) => [l, { ...(dict[l].journey as Record<string, string>) }])) as Record<Loc, JourneyWords>;
  const base = new Map<string, string>();
  let baseSha = "";
  try {
    baseSha = git("merge-base", "HEAD", "origin/main").trim();
    base.set(STUB, git("show", `${baseSha}:${STUB}`).split(CR + LF).join(LF));
  } catch { /* no history here: §6's classic check reports NOT MEASURED and fails */ }
  return { files, journey, base, baseSha };
}
const text = (w: World, f: string) => w.files.get(f) ?? "";

type Ok = (id: string, label: string, cond: boolean, detail?: string) => void;

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
    answer: count(flat, `{own ? keepFigures(fill(t.journey[own.a], { max: formatTzs(WITHDRAW_MAX_TZS) })) : ${CLASSIC_A}`) === 1,
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
    const html = renderToStaticMarkup(keepFigures(fill(w.journey[l].faq3a ?? "", { max })) as never);
    return html.includes(`<span class="whitespace-nowrap">${max}</span>`);
  });
  ok("5.max", `{max} is the per-withdrawal cap (${max}), formatted, and held whole in each language`,
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
    "@/lib/server/support-config": { SUPPORT_EMAIL: () => "support@50pick.tz", SUPPORT_PHONE: () => "+255 700 000 000" },
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
const word = (l: Loc, k: string, v: (old: string) => string) => (w: World): World => ({
  ...w, journey: { ...w.journey, [l]: { ...w.journey[l], [k]: v(w.journey[l][k] ?? "") } },
});

const PLANTS: Plant[] = [
  { name: "a classic reader handed the journey copies (the resolver's answer dropped)", expect: /^5[.]slot /, alone: true,
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
  { name: "the panel's chip offers the journey's words to every reader", expect: /^6[.]panel /, alone: true,
    plant: edit(EMPTY, "journeyOn ? t.journey.chatStarterHowTo : t.chat.starterDial,", "t.journey.chatStarterHowTo,") },
  { name: "ChatRoot no longer hands the helper the reader's answer", expect: /^6[.](panel|stub) /,
    plant: edit(CHAT_ROOT, "await sendMessage([...messages, user], text, { journey: journeyOn });", "await sendMessage([...messages, user], text);") },
  { name: "the cap printed bare (no keep)", expect: /^5[.](max|slot) /,
    plant: edit(HELP, "{own ? keepFigures(fill(t.journey[own.a], { max: formatTzs(WITHDRAW_MAX_TZS) })) :", "{own ? fill(t.journey[own.a], { max: formatTzs(WITHDRAW_MAX_TZS) }) :") },
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
