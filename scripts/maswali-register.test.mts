/**
 * test:maswali-register — THE WEEK REGISTER, AS THE TILE READ ASKED (MASWALI-BUILD S5 VIS-R, 2026-10-19: the consolidated
 * findings' §B R1–R11 and §A on the register's two pages; MASWALI-PLAN §7b S5 item 1; DESIGN_AUTHORITY §M8a).
 *
 *   npx tsx scripts/maswali-register.test.mts               (npm run test:maswali-register)
 *   npx tsx scripts/maswali-register.test.mts --prove-red   (npm run red:maswali-register)
 *
 *   §1 R3 · the outcome stamp says "Result ·" once: its default text is unchanged wherever it is drawn, `label={false}`
 *      says the outcome alone, and the component passes the choice through
 *   §2 R11 · the officer beside an attested time: every real seal is a staff officer's (`requireStaff` on `trading`), so
 *      the dev seed seals as a real staff account — a MODERATOR, created before the first seal — and the register reads
 *      its role ("Results officer"), never "—"
 *   §3 R1 · R2 · R8 · the fifteen: cards below 1024 and a six-column table from 1024; the category drawn once, above its
 *      question; dates, source, role and category never break; the source without "www." (`sourceLabel`, unit-tested)
 *   §4 R3 · the register draws the stamp with `label={false}` — the column head or the card's label says "Outcome"
 *   §5 R4 · R7 · the head: the week as the title, its state as its own chip (slate, never the resolved gold, §M8a 7), the
 *      eyebrow the product's, the register named once (the back link)
 *   §6 R5 · R6 · the commitments' label is one phrase with its date one run; a past week's questions are named by the week
 *   §7 R9 · the index: one row pattern — the week, its state chip, its facts (`weekFacts`, rendered in three languages),
 *      the facts' separators shown only from 768, one fact per line below it
 *   §8 R10 · "Week register" in sentence case, and the page's title and its door say the same words in every language
 *   §9 A1 · no "·" can open or close a line on the register: the ledger's notes on their own line, one row per levy, the
 *      standing in three columns, every week, amount, % and date inside a label one run (`kept`, rendered)
 *   §10 A3 · one rule sets every Millionea eyebrow in Chinese at no tracking and 12px, under the pinned keep-all rule
 *   §11 §D · the decided words on the register's keys, in Swahili and Chinese
 *   §12 the loading drawings open on the bands the pages open on: the chip under the head, cards below 1024 and the
 *      table from 1024, the index rows' chip
 *   §13 A2 · no Chinese run in the register's body text is longer than its narrowest column holds without a phrase break
 *      (U+200B), so keep-all never has to split a word (the zh 320 tile split 备选/题)
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION. `--prove-red` plants each defect in an IN-MEMORY copy — a source string, a dictionary
 *    value or a helper — and requires the check it targets to fail; a plant whose text is not in its file exactly once is
 *    INCONCLUSIVE, never a pass. No file is written.
 * ⚠️ What a source check cannot see — whether the table FITS the measure at 1024 in Chinese, whether a line starts with
 *    "·" in a browser — the re-shoot shows (`qa:maswali-player-shots`, scrolled tiles at 320–1920 in three languages).
 * Pure: it reads source files and runs the pure helpers. No server, no database, no network.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement, Fragment, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { dict } from "../src/lib/i18n-dict.ts";
import { fill } from "../src/lib/utils.ts";
import { outcomeWord } from "../src/lib/side-label.ts";
import { outcomeStampText } from "../src/components/maswali/maswali-outcome-stamp.tsx";
import { sourceLabel } from "../src/components/maswali/maswali-format.ts";
import { kept, ticketSalesRuns, weekFacts } from "../src/app/millionea/register/register-parts.tsx";
import { STATUS_TONE, TONE_CHIP } from "../src/lib/status-tone.ts";
import { DEFAULT_GRANTS } from "../src/lib/server/roles.ts";
import type { MillioneaWeekSummary } from "../src/lib/server/maswali-player.ts";
import { decomment, decommentCss } from "./lib/decomment.mts";

process.exitCode = 1;
const PROVE_RED = process.argv.includes("--prove-red");
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const raw = (rel: string) => readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const squash = (s: string) => s.replace(/\s+/g, " ");
const j = (v: unknown) => JSON.stringify(v);
const count = (s: string, needle: string) => s.split(needle).length - 1;
const LOCALES = ["en", "sw", "zh"] as const;
const OUTCOMES = ["YES", "NO", "VOID"] as const;
/** A node as the browser would hold it: its markup, and its text. */
const markup = (node: ReactNode) => renderToStaticMarkup(createElement(Fragment, null, node));
const textOf = (node: ReactNode) => markup(node).replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"');
/** The text of each `white-space: nowrap` run in a node's markup (keep-run draws a run as one such span). */
const nowrapRuns = (node: ReactNode) => [...markup(node).matchAll(/<span class="whitespace-nowrap">(.*?)<\/span>/g)].map((m) => m[1].replace(/<[^>]+>/g, ""));

/** The files the checks read, as written (comments are stripped per check, through the one shared scanner). */
const FILES = {
  stamp: "src/components/maswali/maswali-outcome-stamp.tsx",
  seed: "src/app/api/dev-test/seed-maswali/route.ts",
  gates: "src/lib/server/control-gates.ts",
  week: "src/app/millionea/register/[week]/page.tsx",
  slip: "src/components/maswali/maswali-slip.tsx",
  index: "src/app/millionea/register/page.tsx",
  parts: "src/app/millionea/register/register-parts.tsx",
  weekGhost: "src/app/millionea/register/[week]/register-week-ghost.tsx",
  indexGhost: "src/app/millionea/register/register-ghost.tsx",
  css: "src/app/globals.css",
} as const;
type FileKey = keyof typeof FILES;

/** Everything a check may look at — the real one, or a copy with one defect planted. */
type World = {
  src: Record<FileKey, string>;
  dict: typeof dict;
  stampText: typeof outcomeStampText;
  sourceLabel: typeof sourceLabel;
  ticketSalesRuns: typeof ticketSalesRuns;
  weekFacts: typeof weekFacts;
  kept: typeof kept;
  weekChip: string;
};
const REAL: World = {
  src: Object.fromEntries(Object.entries(FILES).map(([k, f]) => [k, raw(f)])) as Record<FileKey, string>,
  dict,
  stampText: outcomeStampText,
  sourceLabel,
  ticketSalesRuns,
  weekFacts,
  kept,
  weekChip: TONE_CHIP[STATUS_TONE.VOID.player],
};
const code = (w: World, k: FileKey) => squash(decomment(w.src[k]));
const mln = (w: World, l: (typeof LOCALES)[number]) => w.dict[l].millionea as unknown as Record<string, string>;

type Check = { id: string; label: string; run: (w: World) => [boolean, string] };
const CHECKS: Check[] = [];
const check = (id: string, label: string, run: (w: World) => [boolean, string]) => CHECKS.push({ id, label, run });

// ── §1 · R3 · the outcome stamp says "Result ·" once ────────────────────────────────────────────────────────────────
check("1.1", "the stamp's default text is unchanged — \"Result · <the platform's outcome word>\" in every language, for YES, NO and VOID (en \"Result · Void\")", (w) => {
  const off = LOCALES.flatMap((l) => OUTCOMES.filter((o) => w.stampText(w.dict[l] as never, o) !== `${w.dict[l].millionea.stampResult} · ${outcomeWord(w.dict[l] as never, o, "MASWALI")}`).map((o) => `${l}/${o}`));
  const en = w.stampText(w.dict.en as never, "VOID");
  return [off.length === 0 && en === "Result · Void", j({ off, en })];
});
check("1.2", "`label = false` says the outcome alone — the platform's own word, nothing before it (en \"Void\", sw \"Batili\", zh \"已作废\")", (w) => {
  const off = LOCALES.flatMap((l) => OUTCOMES.filter((o) => w.stampText(w.dict[l] as never, o, false) !== outcomeWord(w.dict[l] as never, o, "MASWALI")).map((o) => `${l}/${o}`));
  const got = LOCALES.map((l) => w.stampText(w.dict[l] as never, "VOID", false));
  return [off.length === 0 && j(got) === j(["Void", "Batili", "已作废"]), j({ off, got })];
});
check("1.3", "the component defaults to the label and hands its `label` prop to the text — every existing call site draws exactly what it did", (w) => {
  const s = code(w, "stamp");
  const sig = s.includes('export function MaswaliOutcomeStamp({ t, outcome, press, index = 0, size = "caption", label = true, className }: {');
  const pass = s.includes("const stampText = outcomeStampText(t, outcome, label);");
  return [sig && pass, j({ sig, pass })];
});

// ── §2 · R11 · the officer beside an attested time ──────────────────────────────────────────────────────────────────
check("2.1", "a seal needs the `trading` act grant, and a MODERATOR holds it by default (the seed's sealer is a role the product lets seal)", (w) => {
  const domain = /sealMaswaliQuestion:\s*"(\w+)"/.exec(decomment(w.src.gates))?.[1];
  const grant = (DEFAULT_GRANTS as Record<string, Record<string, { canAct: boolean } | undefined>>).MODERATOR?.[domain ?? ""];
  return [domain === "trading" && grant?.canAct === true, j({ domain, grant })];
});
check("2.2", "the dev seed creates its sealer as a MODERATOR account (role written to the user row) BEFORE the first seal, and every seal is made by that account", (w) => {
  const s = code(w, "seed");
  const id = s.includes('const SEALER = "usr_dev_sealer";');
  const roleWritten = s.includes('async function player(balance: number, role: "PLAYER" | "MODERATOR" = "PLAYER", id = `usr_${randomId(12)}`): Promise<string> {')
    && s.includes("failedLoginCount: 0, lockedUntil: null, role, status:");
  const made = s.indexOf('await player(0, "MODERATOR", SEALER);');
  const firstSeal = s.indexOf("await closeAndSeal(");
  const sealsBy = s.includes("officerId: SEALER,") && !s.includes('officerId: "usr_dev_sealer"');
  return [id && roleWritten && made > 0 && firstSeal > made && sealsBy, j({ id, roleWritten, made, firstSeal, sealsBy })];
});
check("2.3", "the register prints the officer's ROLE for every sealed question whose sealer has one — never a name, \"—\" only when no role can be read", (w) => {
  const s = code(w, "week");
  return [s.includes('const role = (q: Q) => (q.sealerRole ? t.millionea.officerRole : "—");'), "the role line"];
});

// ── §3 · R1 · R2 · R8 · the fifteen ─────────────────────────────────────────────────────────────────────────────────
check("3.1", "R1 · the fifteen are cards below 1024 (`lg:hidden`) and the table from 1024 (`hidden lg:block`) — never the old 768 switch", (w) => {
  const s = code(w, "week");
  const cards = s.includes('<div className="flex flex-col lg:hidden" data-testid="millionea-register-cards">');
  const table = s.includes('<ScrollX label={heading} className="hidden lg:block">');
  const old = /\bmd:hidden\b|\bhidden md:block\b/.test(s);
  return [cards && table && !old, j({ cards, table, old })];
});
check("3.2", "R2 · the table has exactly six heads, in order: #, Question, Source, Event, Attested, Outcome", (w) => {
  const s = code(w, "week");
  const head = s.slice(s.indexOf("<thead"), s.indexOf("</thead>"));
  const heads = [...head.matchAll(/<th scope="col" className="text-left">(.*?)<\/th>/g)].map((m) => m[1]);
  const want = ["#", "{t.millionea.regColQuestion}", "{t.millionea.regColSource}", "{t.millionea.regColEvent}", "{t.millionea.regColAttested}", "{t.millionea.regColOutcome}"];
  return [j(heads) === j(want), j(heads)];
});
check("3.3", "R2 · R8 · the category is drawn ONCE (one `Category`, the Millionea mono capitals, never split) and rides above its question in both layouts", (w) => {
  const s = code(w, "week");
  const once = count(s, "marketCategoryLabel(t, q.category)") === 1;
  const drawing = s.includes('<span className="whitespace-nowrap font-mono text-micro uppercase eyebrow text-text-subtle">{marketCategoryLabel(t, q.category)}</span>');
  const uses = count(s, "<Category t={t} q={q} />") === 2;
  return [once && drawing && uses, j({ once, drawing, uses })];
});
check("3.4", "R2 · the dates, the source, the officer's role never break in the table (nowrap), and no table cell may break anywhere", (w) => {
  const s = code(w, "week");
  const row = s.slice(s.indexOf("const row = (q: Q) => ("), s.indexOf("const band ="));
  const src = row.includes('<td className="whitespace-nowrap text-text-muted">{sourceLabel(q.sourceDomain)}</td>');
  const event = row.includes('<td className="whitespace-nowrap font-mono text-text-muted">{when(t, locale, q.eventStartsAt, nowMs)}</td>');
  const attested = row.includes('<span className="whitespace-nowrap font-mono">{when(t, locale, q.sealedAt, nowMs)}</span>') && row.includes('<span className="whitespace-nowrap text-text-subtle">{role(q)}</span>');
  const anywhere = row.includes("overflow-wrap:anywhere");
  return [src && event && attested && !anywhere, j({ src, event, attested, anywhere })];
});
check("3.5", "R2 · the question and the outcome are the columns that wrap, each with its floor (200px, 160px), so the table never squeezes them", (w) => {
  const s = code(w, "week");
  return [s.includes('<td className="min-w-[200px]">') && s.includes('<td className="min-w-[160px]"><Outcome t={t} q={q} /></td>'), "min widths"];
});
check("3.6", "R2 · `sourceLabel` drops a leading \"www.\" and nothing else: www.nbc.co.tz → nbc.co.tz; a bare domain, another subdomain and a look-alike are untouched", (w) => {
  const cases: Array<[string, string]> = [["www.nbc.co.tz", "nbc.co.tz"], ["WWW.tff.or.tz", "tff.or.tz"], ["nbc.co.tz", "nbc.co.tz"], ["m.www.x.com", "m.www.x.com"],
    ["wwwx.com", "wwwx.com"], ["www2.meteo.go.tz", "www2.meteo.go.tz"], ["api.coingecko.com", "api.coingecko.com"]];
  const off = cases.filter(([i, o]) => w.sourceLabel(i) !== o).map(([i]) => `${i} → ${w.sourceLabel(i)}`);
  return [off.length === 0, j(off)];
});
check("3.7", "R2 · both layouts print the source through `sourceLabel`, and the raw domain is never printed", (w) => {
  const s = code(w, "week");
  return [count(s, "{sourceLabel(q.sourceDomain)}") === 2 && !s.includes("{q.sourceDomain}") && !s.includes(": ${q.sourceDomain}"), j({ n: count(s, "{sourceLabel(q.sourceDomain)}") })];
});
check("3.7s", "R2 · the ticket slip and the register name a source through the same `sourceLabel` helper", (w) => {
  const s = code(w, "slip");
  const call = "fill(t.millionea.sourceLine, { source: sourceLabel(q.source) })";
  return [s.includes(call) && !s.includes("source: q.source }"), j({ call: s.includes(call), raw: s.includes("source: q.source }") })];
});
check("3.8", "R1 · each card labels every fact with the table's own head words (Source, Event, Officer, Attested, Outcome), one per line — no \"·\"-joined fact line", (w) => {
  const s = code(w, "week");
  const card = s.slice(s.indexOf("const card = (q: Q) => ("), s.indexOf("const row = (q: Q) => ("));
  const labels = ["regColSource", "regColEvent", "regColOfficer", "regColAttested", "regColOutcome"].every((k) => card.includes(`<dt className={FIELD}>{t.millionea.${k}}</dt>`));
  const joined = /\} · \$\{/.test(card);
  return [labels && !joined, j({ labels, joined })];
});

// ── §4 · R3 · the register's stamp ──────────────────────────────────────────────────────────────────────────────────
check("4.1", "R3 · the register draws the outcome stamp once, with `label={false}` (the column head or the card's label already says \"Outcome\")", (w) => {
  const s = code(w, "week");
  return [count(s, "<MaswaliOutcomeStamp ") === 1 && s.includes("<MaswaliOutcomeStamp t={t} outcome={q.outcome} label={false} />"), j({ n: count(s, "<MaswaliOutcomeStamp ") })];
});

// ── §5 · R4 · R7 · the head ─────────────────────────────────────────────────────────────────────────────────────────
check("5.1", "R4 · R7 · the head is the back link to the register, the product's eyebrow, the week as the title and its state as its own chip — never \"Week 48 · Voided\" in one heading", (w) => {
  const s = code(w, "week");
  const back = s.includes("<BackLink fallbackHref={MILLIONEA_HREF.register} label={t.millionea.registerTitle} />");
  const head = s.includes('<div className="flex flex-col gap-2"> <PageHeader eyebrow={t.millionea.productTitle} title={weekWord(t, week)} /> <WeekStateChip t={t} state={w.state} /> </div>');
  const oldTitle = /title=\{`\$\{weekWord/.test(s) || s.includes("eyebrow={t.millionea.registerTitle}");
  return [back && head && !oldTitle, j({ back, head, oldTitle })];
});
check("5.2", "R4 · the state chip wears slate — status-tone's VOID ink, \"neutral\" — for a settled week too: never the resolved gold (§M8a 7)", (w) => {
  const p = code(w, "parts");
  return [w.weekChip === "neutral" && p.includes("<Chip variant={TONE_CHIP[STATUS_TONE.VOID.player]} metrics=\"status\""), j({ chip: w.weekChip })];
});

// ── §6 · R5 · R6 · the commitments and the questions' heading ──────────────────────────────────────────────────────
check("6.1", "R5 · the commitments' label is ONE phrase (regHashPublished) with its date one run — no \"·\" between two halves that could open or close a line", (w) => {
  const s = code(w, "week");
  const one = s.includes("{kept(fill(t.millionea.regHashPublished, { when: published }), [published])}");
  const joined = /regHash\}? · /.test(s) || s.includes("regPublished");
  const words = LOCALES.map((l) => fill(mln(w, l).regHashPublished, { when: "23 Nov, 00:01" }));
  return [one && !joined && j(words) === j(["Question set published 23 Nov, 00:01", "Seti ya maswali imechapishwa 23 Nov, 00:01", "题目集发布于 23 Nov, 00:01"]), j({ one, joined, words })];
});
check("6.2", "R6 · the questions' heading names the week — \"Week {week}'s questions\" — and the register never says \"this week's\"", (w) => {
  const s = code(w, "week");
  return [s.includes("const heading = fill(t.millionea.regWeekQuestions, { week: weekNumberOf(w.code) });") && !s.includes("t.millionea.weekQuestions"), "the heading"];
});
check("6.3", "R6 · its words: en \"Week 48's questions\", sw \"Maswali ya Wiki 48\", zh \"第48周题目\" (the lead's ruling: 第N周 unspaced)", (w) => {
  const got = LOCALES.map((l) => fill(mln(w, l).regWeekQuestions, { week: 48 }));
  return [j(got) === j(["Week 48's questions", "Maswali ya Wiki 48", "第48周题目"]), j(got)];
});

// ── §7 · R9 · the index ─────────────────────────────────────────────────────────────────────────────────────────────
const summary = (over: Partial<MillioneaWeekSummary>): MillioneaWeekSummary => ({
  id: "w", code: "MLN-2026-W45", state: "SETTLED", isFinal: false, closedAt: null, settledAt: null, tickets: 6, sales: 6_000, carryIn: 0,
  jackpot: null, winners: 0, share: null, fee: 0, topUp: null, paid: null, carriedForward: 412_000, refundsPending: false, ...over,
});
const WEEKS = {
  pending: summary({ state: "VOIDED", refundsPending: true, carriedForward: null, fee: null }),
  landed: summary({ state: "VOIDED", refundsPending: false, carriedForward: null, fee: null }),
  wonOne: summary({ winners: 1, jackpot: 1_013_000, share: 881_310, fee: 131_690, carriedForward: 0 }),
  wonMany: summary({ winners: 3, jackpot: 1_050_000, share: 304_500, fee: 136_500, carriedForward: 0 }),
  rolled: summary({}),
};
const FACTS: Record<(typeof LOCALES)[number], Record<keyof typeof WEEKS, string[]>> = {
  en: { pending: ["Refunds on their way"], landed: ["Every ticket refunded"], wonOne: ["1 ticket won", "Jackpot TZS 1,013,000"],
    wonMany: ["3 tickets won", "Jackpot TZS 1,050,000"], rolled: ["TZS 412,000 carried forward", "fee 0"] },
  sw: { pending: ["Marejesho yanakuja"], landed: ["Kila tiketi imerejeshewa"], wonOne: ["Tiketi 1 ilishinda", "Jackpot TZS 1,013,000"],
    wonMany: ["Tiketi 3 zilishinda", "Jackpot TZS 1,050,000"], rolled: ["TZS 412,000 imeletwa mbele", "ada 0"] },
  zh: { pending: ["退款处理中"], landed: ["每张彩票已退款"], wonOne: ["1 张彩票中奖", "大奖 TZS 1,013,000"],
    wonMany: ["3 张彩票中奖", "大奖 TZS 1,050,000"], rolled: ["TZS 412,000 滚存", "费用 0"] },
};
check("7.1", "R9 · every index row is one pattern — the week, its state as the week page's chip, then `weekFacts` — never \"Week 48 · Voided\" beside \"Week 45: 1 ticket won\"", (w) => {
  const s = code(w, "index");
  const row = s.includes('<span className="text-body font-semibold text-text">{weekWord(t, weekNumberOf(w.code))}</span> <WeekStateChip t={t} state={w.state} />')
    && s.includes("const facts = weekFacts(t, w);");
  const old = /settledWon|regStrataRow|WEEK_STATE_KEY|millioneaWord/.test(s);
  return [row && !old, j({ row, old })];
});
check("7.2", "R9 · A1 · the facts share one line only from 768, their \"·\" drawn there alone; below 768 each fact is its own line, with no separator", (w) => {
  const s = code(w, "index");
  const stack = s.includes('<span className="flex min-w-0 flex-col gap-0.5 text-body-sm text-text-muted md:flex-row md:flex-wrap md:items-baseline md:gap-x-2" data-testid="millionea-week-facts">');
  const sep = s.includes('{i > 0 && <span aria-hidden className="hidden text-text-subtle md:inline">·</span>}');
  const row = s.slice(s.indexOf("function WeekRow("), s.indexOf("export default async function"));
  const others = count(row, "·") - count(row, '<span aria-hidden className="hidden text-text-subtle md:inline">·</span>');
  return [stack && sep && others === 0, j({ stack, sep, others })];
});
check("7.3", "R9 · each week's facts, rendered in three languages: refunds on their way until every refund landed, then every ticket refunded; winners and the jackpot; a rolled week's carry and fee 0", (w) => {
  const off: string[] = [];
  for (const l of LOCALES) for (const [k, s] of Object.entries(WEEKS) as Array<[keyof typeof WEEKS, MillioneaWeekSummary]>) {
    const got = w.weekFacts(w.dict[l] as never, s).map(textOf);
    if (j(got) !== j(FACTS[l][k])) off.push(`${l}/${k}: ${j(got)}`);
  }
  return [off.length === 0, off.join(" | ")];
});
check("7.4", "R9 · A1 · every amount in a fact is one unbroken run (the jackpot in `.amount`, the carry a kept run)", (w) => {
  const won = markup(w.weekFacts(w.dict.en as never, WEEKS.wonOne)[1]);
  const rolled = nowrapRuns(w.weekFacts(w.dict.en as never, WEEKS.rolled)[0]);
  return [won.includes('<span class="amount">TZS 1,013,000</span>') && rolled.includes("TZS 412,000"), j({ won, rolled })];
});

// ── §8 · R10 · the register's name ──────────────────────────────────────────────────────────────────────────────────
check("8.1", "R10 · \"Week register\" in sentence case, and the page's title and its door (`register`) are the same words in every language (zh \"每周公示\")", (w) => {
  const got = LOCALES.map((l) => [mln(w, l).registerTitle, mln(w, l).register]);
  return [j(got) === j([["Week register", "Week register"], ["Daftari la wiki", "Daftari la wiki"], ["每周公示", "每周公示"]]), j(got)];
});

// ── §9 · A1 · no "·" opens or closes a line ─────────────────────────────────────────────────────────────────────────
/** The document's <title> ("Week register · Millionea", the platform's page · product convention) is the browser tab's, not
 *  a line laid out on the page — the one " · " join a register file may hold. */
const TAB_TITLE = "`${t.millionea.registerTitle} · ${t.millionea.productLabel}`";
check("9.1", "A1 · no register file joins two facts into one string with \" · \" (the ledger's notes, the standing, the head) — the tab title alone excepted", (w) => {
  const hits = (["week", "index", "parts"] as const).flatMap((k) => [...code(w, k).split(TAB_TITLE).join("").matchAll(/\} · \$\{|` · \$\{|\} · `/g)].map(() => FILES[k]));
  return [hits.length === 0, j(hits)];
});
check("9.2", "A1 · the ledger's two notes stand on their own line (`noted`), and each levy is its own row — never one \"TRA … · GBT …\" row", (w) => {
  const s = code(w, "week");
  const notes = s.includes("label={noted(t.millionea.topUp, t.millionea.topUpNote)}") && s.includes("label={noted(t.millionea.remainder, t.millionea.remainderNote)}");
  const levies = s.includes("fill(t.millionea.regLevyTra, { pct: tra })") && s.includes("fill(t.millionea.regLevyGbt, { pct: gbt })") && !s.includes("t.millionea.levies");
  return [notes && levies, j({ notes, levies })];
});
check("9.3", "A1 · the standing is three columns — the result's place, its time, the count (grouped) — never \"1 · 2 Dec, 00:00\" in one string", (w) => {
  const s = code(w, "week");
  return [s.includes('<li key={s.slot} className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-baseline gap-x-3 border-b border-border py-1.5 text-body-sm">')
    && s.includes("{formatNumber(s.ticketsWithoutAMiss)}"), "the standing row"];
});
check("9.4", "A1 · `kept` draws each run it is given as ONE nowrap span, the words unchanged (a refund's price, a week, a percentage)", (w) => {
  const a = w.kept("Every ticket refunded TZS 1,000", ["TZS 1,000"]);
  const b = w.kept("Carried forward to Week 49", ["Week 49"]);
  const c = w.kept("TRA 12% of the fee", ["TRA 12%"]);
  const whole = textOf(a) === "Every ticket refunded TZS 1,000" && textOf(b) === "Carried forward to Week 49" && textOf(c) === "TRA 12% of the fee";
  const runs = nowrapRuns(a).some((r) => r.includes("TZS 1,000")) && nowrapRuns(b).some((r) => r.includes("Week 49")) && nowrapRuns(c).some((r) => r.includes("TRA 12%"));
  return [whole && runs, j({ a: nowrapRuns(a), b: nowrapRuns(b), c: nowrapRuns(c) })];
});
check("9.5", "A1 · every ledger label that carries a week, an amount or a % is drawn through `kept` with that run", (w) => {
  const s = code(w, "week");
  const want = [
    "label={kept(fill(t.millionea.carriedIn, { week: prev }), [weekWord(t, prev)])}",
    "label={kept(sold, ticketSalesRuns(sold, price))}",
    "label={kept(fill(t.millionea.refundEachPending, { price }), [price])}",
    "label={kept(fill(t.millionea.refundEach, { price }), [price])}",
    "kept(fill(t.millionea.feeLine, { pct }), [`${pct}%`])",
    "label={kept(perTicket, perTicket.match(/^÷ \\S+/) ?? [])}",
  ];
  const missing = want.filter((x) => !s.includes(x));
  const outs = count(s, "label={kept(fill(t.millionea.carriedOut, { week: next }), [weekWord(t, next)])}");
  return [missing.length === 0 && outs === 2, j({ missing, outs })];
});
check("9.5s", "R2 · a sold ticket's count and translated unit-price phrase are two separate kept runs at phone width", (w) => {
  const s = code(w, "week");
  const price = "TZS 1,000";
  const cases: Array<["en" | "sw" | "zh", string[]]> = [
    ["en", ["1,050 tickets", "at TZS 1,000"]],
    ["sw", ["Tiketi 1,050", "kwa TZS 1,000"]],
    ["zh", ["1,050 张，", "每张 TZS 1,000"]],
  ];
  const off = cases.flatMap(([locale, want]) => {
    const sold = fill(w.dict[locale].millionea.regTicketsSold, { n: "1,050", price });
    const runs = w.ticketSalesRuns(sold, price);
    const keptRuns = nowrapRuns(w.kept(sold, runs));
    return j(runs) === j(want) && want.every((part) => keptRuns.includes(part)) ? [] : [`${locale}: ${j({ sold, runs, keptRuns })}`];
  });
  return [s.includes("label={kept(sold, ticketSalesRuns(sold, price))}") && off.length === 0, j(off)];
});

check("9.6", "A1 · the reserve rule's range keeps its two ends together — \"A1 to A5\", \"A1 hadi A5\", \"A1 至 A5\" — one run in every language", (w) => {
  const s = code(w, "week");
  const drawn = s.includes("{kept(t.millionea.regSubRule, t.millionea.regSubRule.match(/A1\\s\\S+\\sA5/) ?? [])}");
  const ranges = LOCALES.map((l) => mln(w, l).regSubRule.match(/A1\s\S+\sA5/)?.[0] ?? null);
  return [drawn && j(ranges) === j(["A1 to A5", "A1 hadi A5", "A1 至 A5"]), j({ drawn, ranges })];
});

check("9.7", "the reserve map's log is in time order with an untimed entry AFTER every timed one, and the week's void closes it untimed (no instant is stored for it) — never sorted first, never a \"—\" in a time's place (the zh 1024 tile opened on \"— 整周作废\")", (w) => {
  const s = code(w, "week");
  const order = s.includes("const order = (iso: string | null) => msOf(iso) ?? Number.MAX_SAFE_INTEGER;") && s.includes("].sort((a, b) => order(a.at) - order(b.at));");
  const last = s.includes("w.state === \"VOIDED\" ? [...timed, { at: null, text: t.millionea.logWeekVoid }] : timed;");
  const untimed = s.includes('{l.at !== null && <span className="whitespace-nowrap font-mono text-text-subtle">{when(t, locale, l.at, nowMs)}</span>}');
  const old = s.includes("(msOf(a.at) ?? 0)") || s.includes("at: w.settledAt, text: t.millionea.logWeekVoid");
  return [order && last && untimed && !old, j({ order, last, untimed, old })];
});

// ── §10 · A3 · Millionea's Chinese labels ───────────────────────────────────────────────────────────────────────────
check("10.1", "A3 · ONE rule sets every Millionea eyebrow in Chinese at no tracking and at 12px — right under the keep-all rule, which stays byte-identical", (w) => {
  const css = decommentCss(w.src.css);
  const pin = ".kp-mln-zh:lang(zh) { word-break: keep-all; overflow-wrap: anywhere; }";
  const track = ".kp-mln-zh:lang(zh) .eyebrow { letter-spacing: 0; }";
  const size = ".kp-mln-zh:lang(zh) .eyebrow:is(.text-micro, .text-caption) { font-size: 12px; line-height: 16px; }";
  const order = css.indexOf(pin) >= 0 && css.indexOf(track) > css.indexOf(pin) && css.indexOf(size) > css.indexOf(track)
    && css.slice(css.indexOf(pin) + pin.length, css.indexOf(track)).trim() === ""
    && css.slice(css.indexOf(track) + track.length, css.indexOf(size)).trim() === "";
  return [count(css, track) === 1 && count(css, size) === 1 && order, j({ track: count(css, track), size: count(css, size), order })];
});

// ── §11 · §D · the decided words ────────────────────────────────────────────────────────────────────────────────────
const DECIDED: Array<[(typeof LOCALES)[number], string, string]> = [
  ["sw", "floor", "Kiwango cha chini kilichohakikishwa"], ["sw", "voidAbandoned", "Limesitishwa, bila matokeo rasmi"], ["sw", "regColAttested", "Uthibitisho"],
  ["zh", "toWinners", "派发给中奖者"], ["zh", "regColEvent", "事件"], ["zh", "regColOfficer", "认证人"], ["zh", "officerRole", "结果认证人"],
  ["zh", "regRoot", "截止时锁定的彩票记录（哈希）"], ["zh", "logVoid", "第{n}题作废"], ["zh", "logCarry", "第{n}题：备选题 {r} 替补"], ["zh", "logWeekVoid", "整周作废"],
];
check("11.1", "§D · the register's decided words: sw floor / voidAbandoned / Uthibitisho; zh 派奖 (派发给中奖者), 事件, 认证人, the tickets' record (哈希), 第N题 unspaced, a past week's void never \"本周\"", (w) => {
  const off = DECIDED.filter(([l, k, v]) => mln(w, l)[k] !== v).map(([l, k]) => `${l}.${k}=${j(mln(w, l)[k])}`);
  const main = mln(w, "zh").regSubRule.includes("作废正选题") && !mln(w, "zh").regSubRule.includes("作废主题");
  return [off.length === 0 && main, j({ off, main })];
});

// ── §13 · A2 · a Chinese word is never split ────────────────────────────────────────────────────────────────────────
/** The register's Chinese body text drawn in a narrow column: the reserve rule, and every void reason (the table's reason
 *  column has a 160px floor; a card's value column at 320 is about as wide). */
const ZH_BODY = ["regSubRule", "voidNotPlayed", "voidAbandoned", "voidNoSource", "voidSettledBeforeClose", "voidCriterionWrong", "voidCriterionObjection"];
check("13.1", "A2 · no Chinese run in the register's body text is longer than 12 ideographs without a break — keep-all would otherwise split a word (\"备选/题\") at the 160px reason column or a 320 card; U+200B marks the phrase breaks", (w) => {
  const long = ZH_BODY.flatMap((k) => mln(w, "zh")[k].split(/[\s​，。：；、（）()]+/).filter((r) => [...r].length > 12).map((r) => `${k}: ${r}`));
  return [long.length === 0, j(long)];
});

// ── §12 · the loading drawings ──────────────────────────────────────────────────────────────────────────────────────
check("12.1", "the week's ghost opens on the page's bands: the state chip under the head, cards below 1024 and the table's head and rows from 1024", (w) => {
  const g = code(w, "weekGhost");
  const chip = g.includes('<MaswaliGhostHead eyebrowWidth="w-[144px]" titleWidth="w-[132px]" /> <GhostBar className="h-[23px] w-[96px] rounded-pill" />');
  const split = g.includes('<div className="flex flex-col lg:hidden">') && g.includes('<div className="hidden flex-col lg:flex">');
  return [chip && split, j({ chip, split })];
});
check("12.2", "the index's ghost rows carry the week, its chip and its facts as the rows do (beside the week from 768)", (w) => {
  const g = code(w, "indexGhost");
  return [g.includes('<GhostBar className="h-[23px] w-[88px] rounded-pill" />') && g.includes('<div className="flex flex-col gap-1.5 md:flex-row md:items-center md:gap-6">'), "the row's shape"];
});

// ── the run ─────────────────────────────────────────────────────────────────────────────────────────────────────────
function runAll(w: World, quiet: boolean): { pass: number; fail: number; failed: string[] } {
  let pass = 0, fail = 0;
  const failed: string[] = [];
  for (const c of CHECKS) {
    let ok = false, detail = "";
    try { [ok, detail] = c.run(w); } catch (e) { detail = `threw: ${String((e as Error).message ?? e)}`; }
    if (ok) pass++; else { fail++; failed.push(c.id); }
    if (!quiet) console.log(`${ok ? "PASS" : "FAIL"} ${c.id} · ${c.label}${ok ? "" : ` — ${detail}`}`);
  }
  return { pass, fail, failed };
}

if (!PROVE_RED) {
  const { pass, fail } = runAll(REAL, false);
  console.log(`\n${"═".repeat(70)}\n  MASWALI REGISTER: ${pass} passed, ${fail} failed\n${"═".repeat(70)}`);
  /** The floor is the count a green run PRINTS; it only rises, to a printed number. */
  const MIN_ASSERTIONS = 39;
  if (pass < MIN_ASSERTIONS) { console.error(`!! FLOOR — ran ${pass}, fewer than ${MIN_ASSERTIONS}.`); process.exit(4); }
  process.exit(fail === 0 ? 0 : 1);
}

// ── --prove-red: every check must be able to fail. Each plant lives on an in-memory copy. ─────────────────────────────
const base = runAll(REAL, true);
if (base.fail !== 0) { console.log(`INCONCLUSIVE: the real tree already fails ${base.failed.join(", ")}`); process.exit(1); }
const problems: string[] = [];
/** A copy of the world with `from` replaced by `to` in one file — inconclusive unless `from` is there exactly once. */
const plantSrc = (k: FileKey, from: string, to: string, w: World = REAL): World | null => {
  const n = w.src[k].split(from).length - 1;
  if (n !== 1) { problems.push(`PLANT MISSED in ${FILES[k]}: ${j(from.slice(0, 80))} is there ${n} times, not once`); return null; }
  return { ...w, src: { ...w.src, [k]: w.src[k].replace(from, to) } };
};
/** A copy of the world with one Millionea word changed in one language. */
const plantWord = (l: (typeof LOCALES)[number], key: string, value: string): World =>
  ({ ...REAL, dict: { ...dict, [l]: { ...dict[l], millionea: { ...dict[l].millionea, [key]: value } } } as typeof dict });
const oldStampText: typeof outcomeStampText = (t, o) => `${t.millionea.stampResult} · ${outcomeWord(t, o, "MASWALI")}`;
const PLANTS: Array<[string, string, World | null]> = [
  // §1
  ["the stamp before R3 — the label always said (`label` ignored)", "1.2", { ...REAL, stampText: oldStampText }],
  ["the label dropped by default — every existing stamp loses \"Result ·\"", "1.1", { ...REAL, stampText: (t, o, label = false) => oldStampText(t, o).slice(label ? 0 : `${t.millionea.stampResult} · `.length) }],
  ["the component no longer hands its prop to the text", "1.3", plantSrc("stamp", "const stampText = outcomeStampText(t, outcome, label);", "const stampText = outcomeStampText(t, outcome);")],
  ["the component's default flipped to no label", "1.3", plantSrc("stamp", 'size = "caption", label = true, className }', 'size = "caption", label = false, className }')],
  // §2
  ["the seed before R11 — it seals as an id with no account behind it", "2.2", plantSrc("seed", '    await player(0, "MODERATOR", SEALER);\n', "")],
  ["the sealer made after the weeks were sealed", "2.2", (() => {
    const w = plantSrc("seed", '    await player(0, "MODERATOR", SEALER);\n', "");
    return w && plantSrc("seed", "    const w4 = await draft(", '    await player(0, "MODERATOR", SEALER);\n    const w4 = await draft(', w);
  })()],
  ["the sealer created as a player (the role never written)", "2.2", plantSrc("seed", "failedLoginCount: 0, lockedUntil: null, role, status:", 'failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status:')],
  ["a seal that no longer needs the trading grant", "2.1", plantSrc("gates", 'sealMaswaliQuestion: "trading"', 'sealMaswaliQuestion: "compliance"')],
  ["the register naming every sealer \"—\"", "2.3", plantSrc("week", '(q.sealerRole ? t.millionea.officerRole : "—")', '(q.sealerRole ? "—" : "—")')],
  // §3
  ["R1 undone — the cards hide from 768 again", "3.1", plantSrc("week", '<div className="flex flex-col lg:hidden" data-testid="millionea-register-cards">', '<div className="flex flex-col md:hidden" data-testid="millionea-register-cards">')],
  ["R1 undone — the table from 768 again", "3.1", plantSrc("week", '<ScrollX label={heading} className="hidden lg:block">', '<ScrollX label={heading} className="hidden md:block">')],
  ["R2 undone — a seventh column (the void reason) back in the head", "3.2", plantSrc("week", '<th scope="col" className="text-left">{t.millionea.regColOutcome}</th>', '<th scope="col" className="text-left">{t.millionea.regColOutcome}</th>\n              <th scope="col" className="text-left">{t.millionea.regColOfficer}</th>')],
  ["R8 undone — the table's category as a plain column of its own", "3.3", plantSrc("week", '<td className="whitespace-nowrap text-text-muted">{sourceLabel(q.sourceDomain)}</td>', '<td className="text-text-muted">{marketCategoryLabel(t, q.category)}</td>\n      <td className="whitespace-nowrap text-text-muted">{sourceLabel(q.sourceDomain)}</td>')],
  ["R2 undone — the event's date free to break", "3.4", plantSrc("week", '<td className="whitespace-nowrap font-mono text-text-muted">{when(t, locale, q.eventStartsAt, nowMs)}</td>', '<td className="font-mono text-text-muted">{when(t, locale, q.eventStartsAt, nowMs)}</td>')],
  ["R2 undone — the source breaking anywhere, raw", "3.7", plantSrc("week", '<td className="whitespace-nowrap text-text-muted">{sourceLabel(q.sourceDomain)}</td>', '<td className="text-text-muted [overflow-wrap:anywhere]">{q.sourceDomain}</td>')],
  ["R2 undone — the slip prints the raw source", "3.7s", plantSrc("slip", "source: sourceLabel(q.source)", "source: q.source")],
  ["R2 undone — the question's floor gone", "3.5", plantSrc("week", '<td className="min-w-[200px]">', "<td>")],
  ["a sourceLabel that keeps \"www.\"", "3.6", { ...REAL, sourceLabel: (d) => d }],
  ["a sourceLabel that strips any first label", "3.6", { ...REAL, sourceLabel: (d) => d.replace(/^[^.]+\./, "") }],
  ["R1 undone — a card's facts joined with \" · \"", "3.8", plantSrc("week", "<dt className={FIELD}>{t.millionea.regColOfficer}</dt>", "<dt className={FIELD}>{`${t.millionea.regColOfficer} · ${t.millionea.regColAttested}`}</dt>")],
  // §4
  ["R3 undone — the register's stamp says \"Result ·\" again", "4.1", plantSrc("week", "<MaswaliOutcomeStamp t={t} outcome={q.outcome} label={false} />", "<MaswaliOutcomeStamp t={t} outcome={q.outcome} />")],
  // §5
  ["R4 undone — the state back in the title", "5.1", plantSrc("week", "<PageHeader eyebrow={t.millionea.productTitle} title={weekWord(t, week)} />", "<PageHeader eyebrow={t.millionea.productTitle} title={`${weekWord(t, week)} · ${w.state}`} />")],
  ["R7 undone — the eyebrow says the register again under its back link", "5.1", plantSrc("week", "<PageHeader eyebrow={t.millionea.productTitle} title={weekWord(t, week)} />", "<PageHeader eyebrow={t.millionea.registerTitle} title={weekWord(t, week)} />")],
  ["a settled week's chip in the resolved gold", "5.2", { ...REAL, weekChip: TONE_CHIP[STATUS_TONE.RESOLVED.player] }],
  // §6
  ["R5 undone — the commitments' date free to break", "6.1", plantSrc("week", "{kept(fill(t.millionea.regHashPublished, { when: published }), [published])}", "{fill(t.millionea.regHashPublished, { when: published })}")],
  ["R5 — a word that splits the phrase with \"·\"", "6.1", plantWord("en", "regHashPublished", "Question set · published {when}")],
  ["R6 undone — \"This week's questions\" on a past week", "6.2", plantSrc("week", "const heading = fill(t.millionea.regWeekQuestions, { week: weekNumberOf(w.code) });", "const heading = t.millionea.weekQuestions;")],
  ["R6 — zh says 本周 again", "6.3", plantWord("zh", "regWeekQuestions", "本周题目")],
  // §7
  ["R9 undone — the old two-grammar row line", "7.1", plantSrc("index", "const facts = weekFacts(t, w);", "const facts = [counted(1, t.millionea.settledWonOne, t.millionea.settledWon, { week: 45 })];")],
  ["R9 — the separators drawn at every width (a phone line can open on \"·\")", "7.2", plantSrc("index", '{i > 0 && <span aria-hidden className="hidden text-text-subtle md:inline">·</span>}', '{i > 0 && <span aria-hidden className="text-text-subtle">·</span>}')],
  ["R9 — a voided week says \"every ticket refunded\" before the refunds landed", "7.3", { ...REAL, weekFacts: (t, w) => (w.state === "VOIDED" ? [t.millionea.regRefunded] : weekFacts(t, w)) }],
  ["R9 — the carry's amount free to break", "7.4", { ...REAL, weekFacts: (t, w) => (w.state === "SETTLED" && (w.winners ?? 0) === 0 ? [fill(t.millionea.regCarried, { amount: "TZS 412,000" }), t.millionea.feeZero] : weekFacts(t, w)) }],
  // §8
  ["R10 undone — \"Week Register\" in title case", "8.1", plantWord("en", "registerTitle", "Week Register")],
  ["zh's door and title disagree", "8.1", plantWord("zh", "register", "每周登记册")],
  // §9
  ["A1 undone — a ledger note after a \"·\"", "9.1", plantSrc("week", "label={noted(t.millionea.topUp, t.millionea.topUpNote)}", "label={`${t.millionea.topUp} · ${t.millionea.topUpNote}`}")],
  ["A1 undone — the levies in one \"·\"-joined row", "9.2", plantSrc("week", "fill(t.millionea.regLevyGbt, { pct: gbt })", "fill(t.millionea.levies, { tra, gbt })")],
  ["A1 undone — the standing's count ungrouped", "9.3", plantSrc("week", "{formatNumber(s.ticketsWithoutAMiss)}", "{s.ticketsWithoutAMiss}")],
  ["a `kept` that keeps nothing", "9.4", { ...REAL, kept: (text) => text }],
  ["A1 undone — the refund's price free to break", "9.5", plantSrc("week", "label={kept(fill(t.millionea.refundEach, { price }), [price])}", "label={fill(t.millionea.refundEach, { price })}")],
  ["R2 undone — the sold label uses its old multiplication split", "9.5s", plantSrc("week", "label={kept(sold, ticketSalesRuns(sold, price))}", 'label={kept(sold, [sold.split(" × ")[0].trim(), `× ${price}`])}')],
  ["R2 undone — the unit-price helper keeps the entire sold label", "9.5s", { ...REAL, ticketSalesRuns: (sold) => [sold] }],
  ["A1 undone — the reserve rule's range free to part", "9.6", plantSrc("week", "{kept(t.millionea.regSubRule, t.millionea.regSubRule.match(/A1\\s\\S+\\sA5/) ?? [])}", "{t.millionea.regSubRule}")],
  ["the log's old order — an untimed entry read as the earliest", "9.7", plantSrc("week", "].sort((a, b) => order(a.at) - order(b.at));", "].sort((a, b) => (msOf(a.at) ?? 0) - (msOf(b.at) ?? 0));")],
  ["the log printing a \"—\" where the week's void has no time", "9.7", plantSrc("week", '{l.at !== null && <span className="whitespace-nowrap font-mono text-text-subtle">{when(t, locale, l.at, nowMs)}</span>}', '<span className="whitespace-nowrap font-mono text-text-subtle">{when(t, locale, l.at, nowMs)}</span>')],
  // §13
  ["A2 undone — the reserve rule's Chinese without its phrase breaks", "13.1", plantWord("zh", "regSubRule", "备选规则：编号最小的作废正选题取第一道未使用的有效备选题，按 A1 至 A5 的顺序。")],
  ["A2 undone — a void reason's Chinese without its phrase breaks", "13.1", plantWord("zh", "voidNoSource", "截止时间前，其来源及指定备用来源均无读数")],
  // §10
  ["A3 undone — the Chinese labels' rule gone", "10.1", plantSrc("css", ".kp-mln-zh:lang(zh) .eyebrow { letter-spacing: 0; }\n", "")],
  ["A3 — the rule moved away from the keep-all rule", "10.1", (() => {
    const w = plantSrc("css", ".kp-mln-zh:lang(zh) .eyebrow:is(.text-micro, .text-caption) { font-size: 12px; line-height: 16px; }\n", "");
    return w && { ...w, src: { ...w.src, css: `${w.src.css}\n.kp-mln-zh:lang(zh) .eyebrow:is(.text-micro, .text-caption) { font-size: 12px; line-height: 16px; }\n` } };
  })()],
  // §11
  ["§D — zh's officer is 官员 again", "11.1", plantWord("zh", "regColOfficer", "官员")],
  ["§D — sw's attested head IMETHIBITISHWA again", "11.1", plantWord("sw", "regColAttested", "Imethibitishwa")],
  ["§D — a past week's void says 本周 again", "11.1", plantWord("zh", "logWeekVoid", "本周作废")],
  // §12
  ["the week's ghost without the table's bands from 1024", "12.1", plantSrc("weekGhost", '<div className="hidden flex-col lg:flex">', '<div className="hidden">')],
  ["the index ghost's rows without the chip", "12.2", plantSrc("indexGhost", '<GhostBar className="h-[23px] w-[88px] rounded-pill" />', "")],
];
let caught = 0;
for (const [name, target, world] of PLANTS) {
  if (!world) { console.log(`INCONCLUSIVE (plant did not apply)  ${name}`); continue; }
  const r = runAll(world, true);
  const hit = r.failed.includes(target);
  if (hit) caught++; else problems.push(`BLIND: ${target} stayed green with "${name}" planted`);
  console.log(`${(hit ? "PROVED" : "BLIND").padEnd(36)} ${target} · ${name}`);
}
for (const p of problems) console.log(`!! ${p}`);
const untested = CHECKS.map((c) => c.id).filter((id) => !PLANTS.some(([, t]) => t === id));
if (untested.length) console.log(`!! checks with no plant: ${untested.join(", ")}`);
console.log(`\n${caught}/${PLANTS.length} caught`);
process.exit(caught === PLANTS.length && problems.length === 0 && untested.length === 0 ? 0 : 1);
