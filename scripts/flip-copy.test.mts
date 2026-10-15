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
 * ⛔ No backslash in this file: an editing tool decodes them (`test:source-bytes`). Patterns use character classes.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { REPO_ROOT } from "./lib/tracked-files.mts";
import { decomment } from "./lib/decomment.mts";
import { dict } from "../src/lib/i18n-dict.ts";
import { keepFigures } from "../src/components/ui/keep-words.tsx";
import { fill, formatTzs } from "../src/lib/utils.ts";
import { WITHDRAW_MAX_TZS } from "../src/lib/server/validators.ts";

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
type World = { files: Map<string, string>; journey: Record<Loc, JourneyWords> };

function load(): World {
  const files = new Map<string, string>();
  for (const f of [HELP]) files.set(f, read(f));
  const journey = Object.fromEntries(LOCS.map((l) => [l, { ...(dict[l].journey as Record<string, string>) }])) as Record<Loc, JourneyWords>;
  return { files, journey };
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

async function run(w: World, log: (l: string) => void): Promise<string[]> {
  const failures: string[] = [];
  const ok: Ok = (id, label, cond, detail = "") => {
    if (!cond) failures.push(`${id} · ${label}`);
    log(`${cond ? "PASS" : "FAIL"} ${id} · ${label}${!cond && detail ? ` — ${detail}` : ""}`);
  };
  log("§5 · /help for a journey reader");
  s5(w, ok);
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
