/**
 * test:maswali-register — THE WEEK REGISTER, AS THE TILE READ ASKED (MASWALI-BUILD S5 VIS-R, 2026-10-19: the consolidated
 * findings' §B R1–R11 and §A on the register's two pages; MASWALI-PLAN §7b S5 item 1; DESIGN_AUTHORITY §M8a).
 *
 *   npx tsx scripts/maswali-register.test.mts               (npm run test:maswali-register)
 *   npx tsx scripts/maswali-register.test.mts --prove-red   (npm run red:maswali-register)
 *
 *   §1 R3 · the outcome stamp says "Result ·" once: its default text is unchanged wherever it is drawn, `label={false}`
 *      says the outcome alone, and the component passes the choice through
 *   §2 R11 · H4 · how each result was attested: every real seal is a staff officer's (`requireStaff` on `trading`), so the
 *      dev seed seals as a real staff account — a MODERATOR, created before the first seal — and the register says, per
 *      question, how many officers attested it ("One officer" / "Two officers", /fairness's glyphs), never a name
 *   §3 R1 · R2 · R8 · M2 · M3 · H4 · the fifteen: cards below 1024 and a six-column table on its panel from 1024; each card a
 *      ticket's clause (category, question, criterion, "Event … · source ↗", then the outcome's lines); the table's
 *      category under its question; dates and the source never break; the source /fairness's link, its domain without
 *      "www." (`sourceLabel`, unit-tested); how each question counted, on the final record only
 *   §4 R3 · the register draws the stamp with `label={false}` — the column head or the card's label says "Outcome"
 *   §5 R4 · R7 · M1 · M9 · the head: the week as the title, its state as its own chip (slate, never the resolved gold,
 *      §M8a 7) beside its code, its facts and its times under it (the sunset's top score first), the eyebrow the
 *      product's, the register named once (the back link); the ledger before the questions
 *   §6 R6 · M12 · the commitments a titled section of nouns (`WeekCommitments`); a past week's questions named by the week
 *   §7 R9 · H2 · M11 · the index: one row pattern — the week, its state chip, its facts (`weekFacts`, rendered in three
 *      languages), the facts' separators shown only from 768; the weeks still running first, with their phase chips and
 *      no money; an intro paragraph; launch day the kit's own empty state, filling its column, with the way to the hub
 *   §8 R10 · "Week register" in sentence case, and the page's title and its door say the same words in every language
 *   §9 A1 · H1 · no "·" can open or close a line on the register: the ledger's notes on their own line, the levies one
 *      line, the standing in three columns, every week, amount, % and date inside a label one run (`kept`, rendered); the
 *      log names each void, each stand-in, the objection window and a voided week's counts
 *   §10 A3 · one rule sets every Millionea eyebrow in Chinese at no tracking and 12px, under the pinned keep-all rule
 *   §11 §D · L4 · L5 · L8 · the decided words on the register's keys, in Swahili and Chinese
 *   §12 the loading drawings open on the bands the pages open on: the chip and code under the head, the ledger's card,
 *      the commitments, cards below 1024 and the table from 1024; the index's intro and its list's own top edge
 *   §13 A2 · no Chinese run in the register's body text is longer than its narrowest column holds without a phrase break
 *      (U+200B), so keep-all never has to split a word (the zh 320 tile split 备选/题)
 *   §14 M4 · M5 · H2 · the ledger and the standing at the receipt's measure, with no right lane; a running week's page
 *      prints no money — its ledger's place says when the ledger comes
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
import { fill, formatTzs, formatTzsSigned } from "../src/lib/utils.ts";
import { outcomeWord } from "../src/lib/side-label.ts";
import { outcomeStampText } from "../src/components/maswali/maswali-outcome-stamp.tsx";
import { sourceLabel } from "../src/components/maswali/maswali-format.ts";
import { keepFact } from "../src/components/maswali/maswali-facts.tsx";
import { kept, liveWeekFacts, registerLedgerRows, ticketSalesRuns, weekFacts } from "../src/app/millionea/register/register-parts.tsx";
import { STATUS_TONE, TONE_CHIP } from "../src/lib/status-tone.ts";
import { DEFAULT_GRANTS } from "../src/lib/server/roles.ts";
import type { MillioneaRegisterLiveWeek, MillioneaRegisterWeek, MillioneaWeekSummary } from "../src/lib/server/maswali-player.ts";
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
  // S5-DESIGN-REGISTER (2026-10-21): the week's ledger rows are the ONE Millionea ledger's (`maswali-ledger.tsx`).
  ledger: "src/components/maswali/maswali-ledger.tsx",
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
  liveFacts: typeof liveWeekFacts;
  kept: typeof kept;
  ledger: typeof registerLedgerRows;
  weekChip: string;
};
const REAL: World = {
  src: Object.fromEntries(Object.entries(FILES).map(([k, f]) => [k, raw(f)])) as Record<FileKey, string>,
  dict,
  stampText: outcomeStampText,
  sourceLabel,
  ticketSalesRuns,
  weekFacts,
  liveFacts: liveWeekFacts,
  kept,
  ledger: registerLedgerRows,
  // S5-DESIGN-REGISTER (L2): a settled week's chip reads its own Millionea row in status-tone (slate, an exception to
  // RESOLVED's seal written with its reason) — not VOID's ink borrowed for it.
  weekChip: TONE_CHIP[STATUS_TONE.MILLIONEA_WEEK_SETTLED.player],
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
// ⚠️ RE-PINNED IN THE OPEN 2026-10-21 (S5-DESIGN-REGISTER, the critic's H4c): the role line was one constant on all fifteen
// ("Results officer"), which could never say two officers. Each question now says how it was attested — the count of
// officers, /fairness's own glyphs — read from the confirmed record (`attestationsOf`), never a name.
check("2.3", "H4 · each attested question says how — \"One officer\" (the shield) or \"Two officers\" (the pair), /fairness's own glyphs — in both layouts, beside its time; never a name, never one role line for all fifteen", (w) => {
  const s = code(w, "week");
  const fn = s.slice(s.indexOf("function Signoff("), s.indexOf("function MarkWords("));
  const glyphs = fn.includes('{s === "two" ? <I.users s={12} className="shrink-0" /> : <I.shieldcheck s={12} className="shrink-0" />}')
    && fn.includes('{s === "two" ? t.millionea.signoffTwo : t.millionea.signoffOne}');
  const both = count(s, "<Signoff ") === 2 && count(s, "s={att.signoff} />") === 2;
  const old = /officerRole|sealerRole|regColOfficer|sealedBy/.test(s);
  return [glyphs && both && !old, j({ glyphs, both, old })];
});

// ── §3 · R1 · R2 · R8 · the fifteen ─────────────────────────────────────────────────────────────────────────────────
// ⚠️ RE-PINNED 2026-10-21 (S5-DESIGN-REGISTER, the tile read — §16 says why): the cards stand at the receipt's measure.
check("3.1", "R1 · L18 · the fifteen are cards below 1024 (`lg:hidden`) and the table from 1024 (`hidden lg:block`) on its glass panel, as /fairness's and the rules pages' tables sit — never the old 768 switch", (w) => {
  const s = code(w, "week");
  const cards = s.includes('<div className="flex max-w-receipt flex-col lg:hidden" data-testid="millionea-register-cards">');
  const table = s.includes('<ScrollX label={heading} className="glass-panel hidden lg:block">');
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
// ⚠️ RE-PINNED IN THE OPEN 2026-10-21 (S5-DESIGN-REGISTER, the critic's M2): a card reads as a ticket's clause — the category
// above its question — and in the table the category rides UNDER the question and its criterion, so every cell's first line
// shares one baseline (the question sat on its cell's second line beside the other cells' first).
check("3.3", "R2 · R8 · M2 · the category is drawn ONCE (one `Category`, the Millionea mono capitals, never split) — above its question on a card, under its question and criterion in the table (every cell's first line on one baseline)", (w) => {
  const s = code(w, "week");
  const once = count(s, "marketCategoryLabel(t, q.category)") === 1;
  const drawing = s.includes('<span className="whitespace-nowrap font-mono text-micro uppercase eyebrow text-text-subtle">{marketCategoryLabel(t, q.category)}</span>');
  const uses = count(s, "<Category t={t} q={q} />") === 2;
  const card = s.slice(s.indexOf("const card = (q: Q) => ("), s.indexOf("const row = (q: Q) => {"));
  const row = s.slice(s.indexOf("const row = (q: Q) => {"), s.indexOf("const band ="));
  const cardOrder = card.indexOf("<Category t={t} q={q} />") >= 0 && card.indexOf("<Category t={t} q={q} />") < card.indexOf("{textIn(locale, q.text)}");
  const at = (x: string) => row.indexOf(x);
  const rowOrder = at("{textIn(locale, q.text)}") >= 0 && at("{textIn(locale, q.text)}") < at("{textIn(locale, q.criterion)}") && at("{textIn(locale, q.criterion)}") < at("<Category t={t} q={q} />");
  return [once && drawing && uses && cardOrder && rowOrder, j({ once, drawing, uses, cardOrder, rowOrder })];
});
check("3.4", "R2 · the dates and the source never break in the table (nowrap), the attestation's time and its officers' count each one run, and no table cell may break anywhere", (w) => {
  const s = code(w, "week");
  const row = s.slice(s.indexOf("const row = (q: Q) => {"), s.indexOf("const band ="));
  const src = row.includes('<td className="whitespace-nowrap"><SourceLink q={q} /></td>') && s.includes('className="kp-mln-hit inline-flex items-center gap-1 whitespace-nowrap text-text-link hover:text-text-linkHover"');
  const event = row.includes('<td className="whitespace-nowrap font-mono text-text-muted">{registerWhen(t, locale, q.eventStartsAt, nowMs) ?? "—"}</td>');
  const attested = row.includes('<time className="whitespace-nowrap font-mono" dateTime={att.attestedAt ?? undefined}>{when}</time>')
    && s.includes('<span className="inline-flex items-center gap-1 whitespace-nowrap"> {s === "two" ?');
  const anywhere = row.includes("overflow-wrap:anywhere");
  return [src && event && attested && !anywhere, j({ src, event, attested, anywhere })];
});
check("3.5", "R2 · the question and the outcome are the columns that wrap, each with its floor (240px, 160px), so the table never squeezes them", (w) => {
  const s = code(w, "week");
  const row = s.slice(s.indexOf("const row = (q: Q) => {"), s.indexOf("const band ="));
  return [row.includes('<td className="min-w-[240px]">') && row.includes('<td className="min-w-[160px]">'), "min widths"];
});
check("3.6", "R2 · `sourceLabel` drops a leading \"www.\" and nothing else: www.nbc.co.tz → nbc.co.tz; a bare domain, another subdomain and a look-alike are untouched", (w) => {
  const cases: Array<[string, string]> = [["www.nbc.co.tz", "nbc.co.tz"], ["WWW.tff.or.tz", "tff.or.tz"], ["nbc.co.tz", "nbc.co.tz"], ["m.www.x.com", "m.www.x.com"],
    ["wwwx.com", "wwwx.com"], ["www2.meteo.go.tz", "www2.meteo.go.tz"], ["api.coingecko.com", "api.coingecko.com"]];
  const off = cases.filter(([i, o]) => w.sourceLabel(i) !== o).map(([i]) => `${i} → ${w.sourceLabel(i)}`);
  return [off.length === 0, j(off)];
});
// ⚠️ RE-PINNED IN THE OPEN 2026-10-21 (S5-DESIGN-REGISTER, the critic's H4a): the source was plain text while /fairness links
// every source — a result could not be checked from the page. ONE drawing (`SourceLink`) for both layouts.
check("3.7", "R2 · H4 · the source is /fairness's link — its URL in a new tab, `noopener noreferrer`, the family's external mark — its domain through `sourceLabel` (never raw), ONE drawing for both layouts", (w) => {
  const s = code(w, "week");
  const fn = s.slice(s.indexOf("function SourceLink("), s.indexOf("function Signoff("));
  const link = fn.includes('<a href={q.sourceUrl} target="_blank" rel="noopener noreferrer"') && fn.includes("<span>{sourceLabel(q.sourceDomain)}</span>")
    && fn.includes('<I.ext s={12} edge="end" text="body-400" className="shrink-0" />');
  const once = count(s, "{sourceLabel(q.sourceDomain)}") === 1 && count(s, "<SourceLink ") === 2;
  const raw = s.includes("{q.sourceDomain}") || s.includes(": ${q.sourceDomain}");
  return [link && once && !raw, j({ link, once, raw })];
});
check("3.7s", "R2 · the ticket slip and the register name a source through the same `sourceLabel` helper", (w) => {
  const s = code(w, "slip");
  const call = "fill(t.millionea.sourceLine, { source: sourceLabel(q.source) })";
  return [s.includes(call) && !s.includes("source: q.source }"), j({ call: s.includes(call), raw: s.includes("source: q.source }") })];
});
// ⚠️ RE-PINNED IN THE OPEN 2026-10-21 (S5-DESIGN-REGISTER, the critic's M2 and H4b): a card was a five-row label/value list
// (~225px each at 320, ~3,300px for the fifteen). It is the ticket's clause grammar now, with the criterion the critic found on
// no Millionea surface: category → question → criterion → "Event … · source ↗" (a fact list: no "·" opens or ends a line) →
// the stamp and how it counted → how and when it was attested → a void's reason.
check("3.8", "M2 · H4 · each card reads as a ticket's clause — category, question, criterion, \"Event … · source ↗\" as a fact list, then the stamp, how it counted, how and when it was attested, a void's reason — never a label/value list, never a hand-joined \" · \"", (w) => {
  const s = code(w, "week");
  const card = s.slice(s.indexOf("const card = (q: Q) => ("), s.indexOf("const row = (q: Q) => {"));
  const order = ["<Category t={t} q={q} />", "{textIn(locale, q.text)}", "{textIn(locale, q.criterion)}", '<MaswaliFacts facts={[event(q), <SourceLink key="src" q={q} />]} />', "<OutcomeLines "].map((x) => card.indexOf(x));
  const inOrder = order.every((x, i) => x >= 0 && (i === 0 || x > order[i - 1]));
  const lines = s.slice(s.indexOf("function OutcomeLines("), s.indexOf("function Questions("));
  const outcome = ["<MaswaliOutcomeStamp ", "<MarkWords ", "<Signoff ", "{reasonOf(t, q)}"].map((x) => lines.indexOf(x));
  const outcomeOrder = outcome.every((x, i) => x >= 0 && (i === 0 || x > outcome[i - 1]));
  const list = /<dl\b|<dt\b|<dd\b/.test(card);
  const joined = /\} · \$\{/.test(card);
  // The question and its criterion are an officer's prose: they break as Chinese prose does (`break-normal`) in both layouts,
  // never kept whole by keep-all (the tile read: "若 TMA" left alone on a zh line at 320).
  const prose = count(s, 'text-pretty break-normal">{textIn(locale, q.text)}</span>') === 2 && count(s, 'text-pretty break-normal">{textIn(locale, q.criterion)}</span>') === 2;
  return [inOrder && outcomeOrder && !list && !joined && prose, j({ order, outcome, list, joined, prose })];
});
// M3 · which ten counted, on the face of each row — from the FINAL record only (an objection can still reinstate a question
// while the window is open: never an un-carry, §M8a item 1).
check("3.9", "M3 · each question says how it counted on the final record — a voided main its number struck and \"↪ A1\", the reserve that stood in \"↪ 4\", an unused reserve \"Not used\" (a screen reader hears the log's own sentence) — and a running week marks a voided main as still waiting, never a carry", (w) => {
  const s = code(w, "week");
  const fin = s.slice(s.indexOf("function finalView("), s.indexOf("function liveView("));
  const live = s.slice(s.indexOf("function liveView("), s.indexOf("function Place("));
  const settledOnly = fin.includes('if (w.state === "SETTLED") { for (const s of w.substitutions) {')
    && fin.includes('marks.set(s.main, { kind: "standIn", reserve, main: s.main });') && fin.includes('marks.set(s.reserve, { kind: "stoodIn", reserve, main: s.main });')
    && fin.includes('if (q.role === "RESERVE" && !marks.has(q.slot) && q.outcome !== "VOID") marks.set(q.slot, { kind: "notUsed" });');
  const waiting = live.includes('marks.set(q.slot, { kind: "awaiting", certain: phase.kind === "voiding" });') && !/standIn|stoodIn|notUsed/.test(live);
  const words = s.includes('<I.standIn s={12} className="shrink-0" aria-hidden />') && s.includes('<span className="sr-only">{fill(t.millionea.logCarry, { n: mark.main, r: mark.reserve })}</span>')
    && s.includes("{t.millionea.notUsed}");
  const struck = s.includes('{q.role === "MAIN" && q.outcome === "VOID" ? <s className="decoration-current">{label}</s> : label}')
    // a void still waiting says the ticket's words after the stamp, opening with a capital (they often start their own line)
    && s.includes("{words.charAt(0).toLocaleUpperCase() + words.slice(1)}");
  return [settledOnly && waiting && words && struck, j({ settledOnly, waiting, words, struck })];
});

// ── §4 · R3 · the register's stamp ──────────────────────────────────────────────────────────────────────────────────
check("4.1", "R3 · the register draws the outcome stamp with `label={false}` in both layouts (the column head, or the card's place in its clause, already says what it is)", (w) => {
  const s = code(w, "week");
  const n = count(s, "<MaswaliOutcomeStamp ");
  return [n === 2 && count(s, "<MaswaliOutcomeStamp t={t} outcome={q.outcome} label={false} />") === 2, j({ n })];
});

// ── §5 · R4 · R7 · the head ─────────────────────────────────────────────────────────────────────────────────────────
// ⚠️ RE-PINNED IN THE OPEN 2026-10-21 (S5-DESIGN-REGISTER, the critic's M1): the chip stands beside the week's code (the
// critic: "show the week code"), and the phase and the sales pause reach it — the one chip, every state (L2).
check("5.1", "R4 · R7 · the head is the back link to the register, the product's eyebrow, the week as the title and its state as its own chip beside its code — never \"Week 48 · Voided\" in one heading", (w) => {
  const s = code(w, "week");
  const back = s.includes("<BackLink fallbackHref={MILLIONEA_HREF.register} label={t.millionea.registerTitle} />");
  const head = s.includes('<PageHeader eyebrow={t.millionea.productTitle} title={weekWord(t, week)} /> <div className="flex flex-wrap items-center gap-x-3 gap-y-1"> <WeekStateChip t={t} state={v.state} phase={v.phase} paused={v.paused} /> <span className="font-mono text-micro uppercase eyebrow text-text-subtle">{v.code}</span> </div>');
  const oldTitle = /title=\{`\$\{weekWord/.test(s) || s.includes("eyebrow={t.millionea.registerTitle}");
  return [back && head && !oldTitle, j({ back, head, oldTitle })];
});
// M1 · the answer at the top; M9 · the sunset's top score, which was computed and never shown.
check("5.3", "M1 · the answer at the top: under the chip the week's facts (the index row's own) and its times (\"Sales closed … · Settled …\"), each a fact list; and the ledger before the questions", (w) => {
  const s = code(w, "week");
  const facts = s.includes('{v.facts.length > 0 && <p className="text-body text-text" data-testid="millionea-week-head-facts"><MaswaliFacts facts={v.facts} /></p>}');
  const times = s.includes('{v.times.length > 0 && <p className="text-body-sm text-text-muted"><MaswaliFacts facts={v.times} /></p>}');
  const from = s.includes("facts, times: weekTimes(t, locale, w, nowMs),") && s.includes("facts: liveWeekFacts(t, locale, w, nowMs), times: weekTimes(t, locale, w, nowMs),");
  const first = s.indexOf('aria-labelledby="mln-reg-ledger"') >= 0 && s.indexOf('aria-labelledby="mln-reg-ledger"') < s.indexOf("<Questions ");
  return [facts && times && from && first, j({ facts, times, from, first })];
});
check("5.4", "M9 · a sunset week's head opens on its top score in the win ledger's own words (\"Highest score this week: 9 of 10 · 2 tickets\") and the jackpot it shared — never \"2 tickets won\" over a standing list that ends at 0", (w) => {
  const s = code(w, "week");
  const sunset = s.includes('const sunset = w.basis === "TOP_SCORE" && w.winningScore !== null;')
    && s.includes("...factsOf(counted(w.winners ?? 0, t.millionea.sunsetScoreOne, t.millionea.sunsetScore, { score: w.winningScore ?? 0 })).map((f) => keepFact(locale, f)),")
    && s.includes(": weekFacts(t, w);");
  return [sunset, j({ sunset })];
});
// ⚠️ RE-PINNED IN THE OPEN 2026-10-21 (S5-DESIGN-REGISTER, the critic's L2): the chip reads every week state's own status-tone
// row (`weekChipKey` → `playerStatusChip`); a settled week's is slate by a written exception. Every state, rendered in three
// languages, is test:maswali-design-register §3's.
check("5.2", "R4 · L2 · the state chip wears slate for a settled week — its own status-tone row, \"neutral\" — never the resolved gold (§M8a 7), and the chip names no variant of its own", (w) => {
  const p = code(w, "parts");
  const chip = p.includes('<Chip variant={playerStatusChip(weekChipKey(state, phase, paused)) ?? "neutral"} metrics="status"')
    && p.includes('case "SETTLED": return "MILLIONEA_WEEK_SETTLED";') && !/TONE_CHIP\[|STATUS_TONE\./.test(p);
  return [w.weekChip === "neutral" && chip, j({ chip: w.weekChip, reads: chip })];
});

// ── §6 · R5 · R6 · the commitments and the questions' heading ──────────────────────────────────────────────────────
// ⚠️ RE-PINNED IN THE OPEN 2026-10-21 (S5-DESIGN-REGISTER, the critic's M12 and L15, and the lead's H2 ruling): the commitments
// were sentences dressed as eyebrows ("SETI YA MASWALI IMECHAPISHWA 23 NOV, 00:01") and no heading. They are a titled section of
// nouns — the ONE drawing the hub's week section adopts (`WeekCommitments`) — shown the moment each is stamped.
// ⚠️ RE-PINNED 2026-10-21 (S5-DESIGN-REGISTER, the tile read — §16 says why): the heading balanced; the question set's eyebrow wears the glyph too.
check("6.1", "M12 · L15 · H2 · the commitments are a titled section of nouns: the question set's hash under \"Question set\" with \"Published {when}\"; the tickets' root under \"Tickets at the close\" with its glyph and \"Fixed {when} · {n} tickets\" (the lead's words) — or when it will be published; one explainer once both exist", (w) => {
  const s = code(w, "week"), p = code(w, "parts");
  const drawn = s.includes("<WeekCommitments t={t} locale={locale} nowMs={nowMs} hash={v.hash} publishedAt={v.publishedAt} root={v.root} closedAt={v.closedAt} tickets={v.tickets} />");
  const nouns = p.includes('<h2 id="mln-reg-commit" className="font-display text-title-sm font-bold text-text text-balance">{t.millionea.commitTitle}</h2>')
    && p.includes("<span>{t.millionea.stubHash}</span>") && p.includes("<I.commitment s={12} className=\"shrink-0\" /> <span>{t.millionea.commitTicketsAtClose}</span>")
    && p.includes("counted(tickets, t.millionea.commitFixedOne, t.millionea.commitFixed, { when: fixed })") && p.includes("{t.millionea.commitAtClose}")
    && p.includes("{hash && root && <p className=\"text-body-sm text-text-muted text-pretty\">{t.millionea.commitExplainer}</p>}");
  const words = LOCALES.map((l) => fill(mln(w, l).commitFixed, { when: "27 Nov, 18:00", n: "1,050" }));
  const old = /regHashPublished|regRoot/.test(s + p);
  return [drawn && nouns && !old && j(words) === j(["Fixed 27 Nov, 18:00 · 1,050 tickets", "Zimefungwa 27 Nov, 18:00 · tiketi 1,050", "锁定于 27 Nov, 18:00 · 1,050 张彩票"]), j({ drawn, nouns, old, words })];
});
check("6.2", "R6 · the questions' heading names the week — \"Week {week}'s questions\" — and the register never says \"this week's\"", (w) => {
  const s = code(w, "week");
  return [s.includes("const heading = fill(t.millionea.regWeekQuestions, { week: weekNumberOf(v.code) });") && !s.includes("t.millionea.weekQuestions"), "the heading"];
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
  // ⚠️ RE-PINNED IN THE OPEN 2026-10-21 (S5-DESIGN-REGISTER, the critic's L1): a week nobody won says "no 10/10" first, as
  // the hub's last-week line does (`settledRollover` + `feeZero`) — each a fact of its own here, so each opens with a capital
  // (the tile read of 2026-10-21: "no 10/10" and "fee 0" opened their phone lines in lower case beside "Jackpot …").
  en: { pending: ["Refunds on their way"], landed: ["Every ticket refunded"], wonOne: ["1 ticket won", "Jackpot TZS 1,013,000"],
    wonMany: ["3 tickets won", "Jackpot TZS 1,050,000"], rolled: ["No 10/10", "TZS 412,000 carried forward", "Fee 0"] },
  // ⚠️ RE-PINNED IN THE OPEN 2026-10-21 (S5-FIX-PLAYER P14): Swahili says each fact with ONE verb, §D's — a refund
  // "imerejeshwa" (it read "imerejeshewa" here and "imerejeshwa" on the ticket), a carry "imehamishwa" (it read
  // "imeletwa mbele" here and "linahamishiwa" in How to play). `test:maswali-i18n` §7 holds the whole namespace to it.
  sw: { pending: ["Marejesho yanakuja"], landed: ["Kila tiketi imerejeshwa"], wonOne: ["Tiketi 1 ilishinda", "Jackpot TZS 1,013,000"],
    wonMany: ["Tiketi 3 zilishinda", "Jackpot TZS 1,050,000"], rolled: ["Hakuna 10/10", "TZS 412,000 imehamishwa", "Ada 0"] },
  zh: { pending: ["退款处理中"], landed: ["每张彩票已退款"], wonOne: ["1 张彩票中奖", "大奖 TZS 1,013,000"],
    wonMany: ["3 张彩票中奖", "大奖 TZS 1,050,000"], rolled: ["无 10/10", "TZS 412,000 滚存至下周", "费用 0"] },
};
// ⚠️ RE-PINNED IN THE OPEN 2026-10-21 (S5-DESIGN-REGISTER, the critic's L3, and the DOORS lane's four gaps): ONE row for the
// register's index and /results' section — `WeekRow` in register-parts — whose facts are a fact list (`MaswaliFacts`,
// `phone`: one per line below 768, the platform's separators from 768, never opening or ending a line), whose facts end
// at the row's end from 1024, and which draws no rule of its own (the list divides its rows).
check("7.1", "R9 · L3 · every index row is the ONE shared row — the week, its state as the week page's chip, then `weekFacts` — never \"Week 48 · Voided\" beside \"Week 45: 1 ticket won\", and never a row drawn twice", (w) => {
  const s = code(w, "index"), p = code(w, "parts");
  const use = s.includes("<WeekRow key={w.id} t={t} code={w.code} chip={<WeekStateChip t={t} state={w.state} />} facts={weekFacts(t, w)} />");
  const row = p.includes('<span className="text-body font-semibold text-text">{weekWord(t, weekNumberOf(code))}</span> {chip}');
  const old = /settledWon|regStrataRow|WEEK_STATE_KEY|millioneaWord|function WeekRow/.test(s);
  return [use && row && !old, j({ use, row, old })];
});
check("7.2", "R9 · A1 · the facts are a fact list — one per line below 768, side by side from 768 between separators that never open or end a line (`MaswaliFacts`, `phone`) — ending at the row's end from 1024; the row draws no \"·\" and no rule of its own (the list divides its rows)", (w) => {
  const p = code(w, "parts"), s = code(w, "index");
  const facts = p.includes('<span className="min-w-0 text-body-sm text-text-muted lg:ml-auto" data-testid="millionea-week-facts"> <MaswaliFacts layout="phone" facts={facts} /> </span>');
  const row = p.slice(p.indexOf("export function WeekRow("), p.indexOf("/** An instant the register prints"));
  const hand = count(row, "·") > 0 || /<li className=/.test(row);
  // Both of the index's lists (the weeks still running, the final weeks) are the one list: it divides its rows and draws its
  // own top edge.
  const list = s.includes('const LIST = "flex flex-col divide-y divide-border border-t border-border";') && count(s, '<ul role="list" className={LIST}>') === 2;
  return [facts && !hand && list, j({ facts, hand, list })];
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
  const rolled = nowrapRuns(w.weekFacts(w.dict.en as never, WEEKS.rolled)[1]);
  return [won.includes('<span class="amount">TZS 1,013,000</span>') && rolled.includes("TZS 412,000"), j({ won, rolled })];
});
// ⭐ S5-DESIGN-REGISTER (2026-10-21) · the lead's H2 ruling: "the index lists the current week with its chip" — the weeks still
// running head the first page, each the one row with its phase chip (or the sales pause's) and its own facts: when sales
// close; the results so far and the objection window. ⛔ No money before a week is final.
const liveWeek = (over: Partial<MillioneaRegisterLiveWeek>): MillioneaRegisterLiveWeek => ({
  id: "w", code: "MLN-2026-W49", state: "OPEN", isFinal: false, opensAt: "2026-11-30T00:00:00+03:00", closesAt: "2026-12-04T18:00:00+03:00",
  closedAt: null, gradedSetFinalAt: null, objectionsCloseAt: null, questionSetHash: "ab".repeat(32), ticketMerkleRoot: null, tickets: null,
  paused: false, questions: [], attested: {}, resultsOut: 0, voidedMains: 0, voidedReserves: 0, usableReserves: 0, ...over,
});
check("7.5", "H2 · the weeks still running head the index's first page — the one row, the chip in its phase (or paused), its own facts (when sales close; the results so far and the objection window) — and no figure of money in any language", (w) => {
  const s = code(w, "index");
  const first = s.includes("const running = page === 1 ? current : [];");
  const row = s.includes("<WeekStateChip t={t} state={w.state} phase={millioneaWeekPhase(w, nowMs)} paused={w.paused} />") && s.includes("facts={liveWeekFacts(t, locale, w, nowMs)}");
  const order = s.indexOf('data-testid="millionea-register-running"') >= 0 && s.indexOf('data-testid="millionea-register-running"') < s.indexOf('data-testid="millionea-register-final"');
  const nowMs = Date.parse("2026-12-06T12:00:00+03:00");
  const cases = [liveWeek({}), liveWeek({ state: "RESOLVING", closedAt: "2026-12-04T18:00:00+03:00", ticketMerkleRoot: "cd".repeat(32), tickets: 1_050, resultsOut: 7,
    gradedSetFinalAt: "2026-12-06T09:00:00+03:00", objectionsCloseAt: "2026-12-07T09:00:00+03:00" })];
  const texts = LOCALES.flatMap((l) => cases.map((c) => w.liveFacts(w.dict[l] as never, l, c, nowMs).map(textOf).join(" | ")));
  const money = texts.filter((x) => /TZS/.test(x));
  return [first && row && order && texts.every((x) => x.length > 0) && money.length === 0, j({ first, row, order, texts })];
});
check("7.6", "M11 · the index says what it is (an intro at /fairness's reading measure), and launch day is the kit's own empty state — filling its column, the register's glyph, what will appear here, and the way to the hub", (w) => {
  const s = code(w, "index");
  // Its phrases kept whole and its dash held to the word before it (the tile read: "— mauzo, ada, …" opened a sw line at 320).
  const intro = s.includes('<p className="max-w-[68ch] text-body text-text-muted text-pretty" data-testid="millionea-register-intro">{keepFact(locale, t.millionea.regIntro)}</p>');
  const empty = s.includes("<EmptyState fill kind=\"fairness\" title={t.millionea.regEmpty} body={t.millionea.regEmptyBody} action={<EmptyStateLink href={MILLIONEA_HREF.hub}>{t.millionea.productTitle}</EmptyStateLink>} />");
  const words = LOCALES.map((l) => mln(w, l).regEmpty);
  return [intro && empty && j(words) === j(["No week is final yet.", "Bado hakuna wiki iliyokamilika.", "尚无已确定的周。"]), j({ intro, empty, words })];
});

// ── §8 · R10 · the register's name ──────────────────────────────────────────────────────────────────────────────────
check("8.1", "R10 · \"Week register\" in sentence case, and the page's title and its door (`register`) are the same words in every language (zh \"每周公示\")", (w) => {
  const got = LOCALES.map((l) => [mln(w, l).registerTitle, mln(w, l).register]);
  return [j(got) === j([["Week register", "Week register"], ["Daftari la wiki", "Daftari la wiki"], ["每周公示", "每周公示"]]), j(got)];
});

// ── §9 · A1 · no "·" opens or closes a line ─────────────────────────────────────────────────────────────────────────
/** The index's document title is browser text, not a line laid out in its body. The week file's metadata ends at `type Q`. */
const INDEX_TAB_TITLE = "`${t.millionea.registerTitle} · ${t.millionea.productLabel}`";
check("9.1", "A1 · no register body joins two facts into one string with \" · \" (the ledger's notes, the standing, the head); metadata titles excepted", (w) => {
  // S5-DESIGN-REGISTER: the ledger's rows are the one Millionea ledger's now, so its file is read too.
  const hits = (["week", "index", "parts", "ledger"] as const).flatMap((k) => {
    const full = code(w, k);
    const boundary = full.indexOf("type Q = MillioneaRegisterQuestion;");
    const body = k === "week" && boundary >= 0 ? full.slice(boundary) : full.split(INDEX_TAB_TITLE).join("");
    return [...body.matchAll(/\} · \$\{|` · \$\{|\} · `/g)].map(() => FILES[k]);
  });
  return [hits.length === 0, j(hits)];
});
// ⚠️ RE-PINNED IN THE OPEN 2026-10-21 (S5-FIX-PLAYER P3/P4/P11): the ledger's rows are built in register-parts.tsx
// (`registerLedgerRows`, pure, rendered by §15 below in three languages); the page draws them as receipt rows.
// ⚠️ RE-PINNED IN THE OPEN 2026-10-21 (S5-DESIGN-REGISTER, the critic's H3 and H5): the notes are the kit row's own `note`
// line, under the label; the levies are ONE muted line out of the fee (the critic's H5), drawn as facts — each fact one
// wrap unit, so no "·" can open or close a line (A1) — never one plain "TRA … · GBT …" string.
check("9.2", "A1 · the ledger's notes stand on their own line (the kit row's `note`), and the levies are one muted line under the fee drawn as facts (`factLine`: no \"·\" opens or closes a line) — never a plain \"TRA … · GBT …\" string", (w) => {
  const s = code(w, "ledger");
  const notes = s.includes("note: m.topUpNote") && s.includes("note: m.remainderNote");
  // ⚠️ RE-PINNED 2026-10-21 (the lead's ruling): a note's line is `noteLine` — its parts as facts, each ONE run.
  const levies = s.includes("note: f.levies && fee > 0 ? noteLine(locale, factsOf(fill(m.ledgerLevies, {")
    && s.includes("function noteLine(locale: Locale, parts: readonly string[]): ReactNode { return <MaswaliFacts facts={parts.map((p) => keepFact(locale, p, [p]))} />; }")
    && !s.includes("t.millionea.levies") && !s.includes("m.levies");
  return [notes && levies, j({ notes, levies })];
});
check("9.3", "A1 · the standing is three columns — the result's place, its time, the count (grouped) — never \"1 · 2 Dec, 00:00\" in one string; its list divides its rows (no rule of the row's own)", (w) => {
  const s = code(w, "week");
  return [s.includes('<li key={s.slot} className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-baseline gap-x-3 py-1.5 text-body-sm">')
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
// ⚠️ RE-PINNED IN THE OPEN 2026-10-21 (S5-DESIGN-REGISTER): the labels are the ONE Millionea ledger's (`maswali-ledger.tsx`),
// each drawn through `keepFact` with its runs named — the platform's kept runs and Millionea's own, every figure an `.amount`.
check("9.5", "A1 · every ledger label or note that carries a week, an amount or a % is drawn through `keepFact` with that run (the carries' weeks, the sales note's two phrases, the refunds' price, the fee's %, the split's \"÷ k\")", (w) => {
  const s = code(w, "ledger");
  const want = [
    "return week === null ? noWeek : keepFact(locale, fill(withWeek, { week }), [weekWord(t, week)]);",
    "note: keepFact(locale, sold, ticketSalesRuns(sold, price))",
    "label: keepFact(locale, fill(m.refundEachPending, { price }), [price])",
    "label: keepFact(locale, fill(m.refundEach, { price }), [price])",
    "keepFact(locale, fill(m.feeLine, { pct }), [`${pct}%`])",
    "label: keepFact(locale, perTicket, perTicket.match(/^÷ \\S+/) ?? [])",
  ];
  const missing = want.filter((x) => !s.includes(x));
  // Every carry — in, out, and a voided week's handed on again — names its week through the one `carryLabel`.
  const carries = count(s, "label: carryLabel(t, locale, m.carriedIn, m.carriedInNoWeek, carryIn.week)") + count(s, "label: carryLabel(t, locale, m.carriedOut, m.carriedOutNoWeek, out.week)")
    + count(s, "label: carryLabel(t, locale, m.carriedOutAgain, m.carriedForwardAgain, again.week)");
  return [missing.length === 0 && carries === 4, j({ missing, carries })];
});
check("9.5s", "R2 · a sold ticket's count and translated unit-price phrase are two separate kept runs at phone width — the sales row's note (\"1,050 tickets at TZS 1,000\" under \"Ticket sales\")", (w) => {
  const s = code(w, "ledger");
  const price = "TZS 1,000";
  const cases: Array<["en" | "sw" | "zh", string[]]> = [
    ["en", ["1,050 tickets", "at TZS 1,000"]],
    ["sw", ["Tiketi 1,050", "kwa TZS 1,000"]],
    ["zh", ["1,050 张，", "每张 TZS 1,000"]],
  ];
  const off = cases.flatMap(([locale, want]) => {
    const sold = fill(w.dict[locale].millionea.regTicketsSold, { n: "1,050", price });
    const runs = w.ticketSalesRuns(sold, price);
    const keptRuns = nowrapRuns(keepFact(locale, sold, runs));
    return j(runs) === j(want) && want.every((part) => keptRuns.includes(part)) ? [] : [`${locale}: ${j({ sold, runs, keptRuns })}`];
  });
  return [s.includes("note: keepFact(locale, sold, ticketSalesRuns(sold, price))") && off.length === 0, j(off)];
});

// ⚠️ RE-PINNED IN THE OPEN 2026-10-21 (S5-DESIGN-REGISTER, the critic's L7 and H1): the rule opens with the slip's own
// sentence — "Reserves A1–A5 count only when a main question voids, in order" — so its range is the platform's dash range,
// kept whole by `keepFact`'s own run rules, and it ends with what voids a week whole (MR-18).
check("9.6", "A1 · L7 · the reserve rule's range keeps its two ends together — \"A1–A5\" one run in every language (`keepFact`) — and the rule says what voids a week whole", (w) => {
  const s = code(w, "week");
  const drawn = s.includes("{keepFact(locale, t.millionea.regSubRule)}");
  const off = LOCALES.filter((l) => {
    const rule = mln(w, l).regSubRule;
    return !rule.includes("A1–A5") || !nowrapRuns(keepFact(l, rule)).some((r) => r.includes("A1–A5"));
  });
  const whole = [/whole week is void and every ticket is refunded/, /wiki nzima inabatilishwa na kila tiketi inarejeshwa/, /整周作废，​?每张彩票均退款/].every((re, i) => re.test(mln(w, LOCALES[i]).regSubRule));
  return [drawn && off.length === 0 && whole, j({ drawn, off, whole })];
});

// ⚠️ RE-PINNED 2026-10-21 (S5-DESIGN-REGISTER, the tile read — §16 says why): the time drawn through its kept runs.
check("9.7", "the reserve map's log is in time order with an untimed entry AFTER every timed one, and a voided week's closing line closes it untimed (no instant is stored for it) — never sorted first, never a \"—\" in a time's place (the zh 1024 tile opened on \"— 整周作废\")", (w) => {
  const s = code(w, "week");
  const order = s.includes("const order = (iso: string | null) => msOf(iso) ?? Number.MAX_SAFE_INTEGER;") && s.includes("return [...entries].sort((a, b) => order(a.at) - order(b.at));");
  const last = s.includes('log: inOrder(log).concat(w.state === "VOIDED" ? [{ at: null, text: weekVoidLine(t, rec.voidedMains, rec.usableReserves), time: null }] : []),');
  const untimed = s.includes('{l.time !== null && <span className="font-mono text-text-subtle">{keepFact(locale, l.time, l.runs ?? [l.time])}</span>}');
  const old = s.includes("(msOf(a.at) ?? 0)") || s.includes("logWeekVoid }");
  return [order && last && untimed && !old, j({ order, last, untimed, old })];
});
// H1 · L8 · P6 — the log says what happened: each void ("Question 1 voided"), each stand-in, the objection window by its one
// name with its two ends, and why a voided week voided, with its counts (MR-18).
// ⚠️ RE-PINNED 2026-10-21 (S5-DESIGN-REGISTER, the tile read — §16 says why): the window carries its two runs.
check("9.8", "H1 · L8 · P6 · the log names each void and each stand-in, the objection window (\"Objection window\" from → to) on running and final weeks alike, and a voided week's counts — \"Week voided: 6 main questions void, only 4 valid reserves\" — each count form in three languages", (w) => {
  const s = code(w, "week");
  const windows = count(s, "...windowEntry(t, locale, ") === 2 && s.includes("[{ at: from, text: t.millionea.regCheck, time: `${a} → ${b}`, runs: [a, b] }]");
  const forms = LOCALES.map((l) => {
    const m = mln(w, l);
    return [fill(m.logWeekVoidCounts, { mains: 6, reserves: 4 }), fill(m.logWeekVoidOneReserve, { mains: 6 }), fill(m.logWeekVoidNoReserve, { mains: 10 }), m.logWeekVoidNoReserveOne, fill(m.logVoid, { n: 1 })];
  });
  const want = [
    ["Week voided: 6 main questions void, only 4 valid reserves", "Week voided: 6 main questions void, only 1 valid reserve", "Week voided: 10 main questions void, no valid reserve", "Week voided: 1 main question void, no valid reserve", "Question 1 voided"],
    ["Wiki imebatilishwa: maswali makuu 6 batili, akiba halali 4 tu", "Wiki imebatilishwa: maswali makuu 6 batili, akiba halali 1 tu", "Wiki imebatilishwa: maswali makuu 10 batili, hakuna akiba halali", "Wiki imebatilishwa: swali kuu 1 batili, hakuna akiba halali", "Swali 1 limebatilishwa"],
    ["整周作废：6 道正选题作废，仅有 4 道有效备选题", "整周作废：6 道正选题作废，仅有 1 道有效备选题", "整周作废：10 道正选题作废，没有有效备选题", "整周作废：1 道正选题作废，没有有效备选题", "第1题已作废"],
  ];
  const line = s.includes("if (reserves === 0) return mains === 1 ? m.logWeekVoidNoReserveOne : fill(m.logWeekVoidNoReserve, { mains: formatNumber(mains) });")
    && s.includes("return reserves === 1 ? fill(m.logWeekVoidOneReserve, { mains: formatNumber(mains) }) : fill(m.logWeekVoidCounts, { mains: formatNumber(mains), reserves: formatNumber(reserves) });");
  return [windows && line && j(forms) === j(want), j({ windows, line, forms })];
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
// ⚠️ RE-PINNED IN THE OPEN 2026-10-21 (S5-DESIGN-REGISTER): the officer column, its role words and the root's label are gone
// (H4c, M12); the officer is still 认证人 in Chinese (the lead's L4 ruling: Millionea keeps §D's word), now in the attestation's
// count; the window is the platform's one name (L5); a void is past tense (L8: "Question 1 voided", 第1题已作废).
const DECIDED: Array<[(typeof LOCALES)[number], string, string]> = [
  ["sw", "floor", "Kiwango cha chini kilichohakikishwa"], ["sw", "voidAbandoned", "Limesitishwa, bila matokeo rasmi"], ["sw", "regColAttested", "Uthibitisho"],
  ["zh", "toWinners", "派发给中奖者"], ["zh", "regColEvent", "事件"], ["zh", "signoffOne", "一位认证人"], ["zh", "signoffTwo", "两位认证人"],
  ["zh", "regLegalOne", "已由认证人依据公布的公开来源结算"], ["zh", "regLegalTwo", "已通过双认证人规则确认"],
  ["en", "regCheck", "Objection window"], ["sw", "regCheck", "Dirisha la pingamizi"], ["zh", "regCheck", "异议窗口"],
  ["en", "logVoid", "Question {n} voided"], ["sw", "logVoid", "Swali {n} limebatilishwa"], ["zh", "logVoid", "第{n}题已作废"],
  ["zh", "logCarry", "第{n}题：备选题 {r} 替补"], ["zh", "logWeekVoidCounts", "整周作废：{mains} 道正选题作废，仅有 {reserves} 道有效备选题"],
  ["sw", "topUp", "Nyongeza hadi kiwango cha chini"],
];
check("11.1", "§D · L4 · L5 · L8 · L6 · the register's decided words: sw floor / voidAbandoned / Uthibitisho / one noun for the top-up; zh 派奖 (派发给中奖者), 事件, 认证人 in the attestation and the legal line, 第N题 unspaced, a past week's void never \"本周\"; the objection window by its one name; a void in the past tense", (w) => {
  const off = DECIDED.filter(([l, k, v]) => mln(w, l)[k] !== v).map(([l, k]) => `${l}.${k}=${j(mln(w, l)[k])}`);
  const main = mln(w, "zh").regSubRule.includes("作废正选题") && !mln(w, "zh").regSubRule.includes("作废主题");
  return [off.length === 0 && main, j({ off, main })];
});

// ── §13 · A2 · a Chinese word is never split ────────────────────────────────────────────────────────────────────────
/** The register's Chinese body text drawn in a narrow column: the reserve rule, and every void reason (the table's reason
 *  column has a 160px floor; a card's value column at 320 is about as wide). */
// S5-DESIGN-REGISTER (2026-10-21): the index intro too — keep-all held its runs whole and broke its 320 lines early.
const ZH_BODY = ["regSubRule", "regIntro", "voidNotPlayed", "voidAbandoned", "voidNoSource", "voidSettledBeforeClose", "voidCriterionWrong", "voidCriterionObjection"];
check("13.1", "A2 · no Chinese run in the register's body text is longer than 12 ideographs without a break — keep-all would otherwise split a word (\"备选/题\") at the 160px reason column or a 320 card; U+200B marks the phrase breaks", (w) => {
  const long = ZH_BODY.flatMap((k) => mln(w, "zh")[k].split(/[\s​，。：；、（）()]+/).filter((r) => [...r].length > 12).map((r) => `${k}: ${r}`));
  return [long.length === 0, j(long)];
});

// ── §12 · the loading drawings ──────────────────────────────────────────────────────────────────────────────────────
// ⚠️ RE-PINNED IN THE OPEN 2026-10-21 (S5-DESIGN-REGISTER): the ghosts open on the pages' new bands — the week's chip beside its
// code with its facts and times under the head (M1), the ledger's card before the commitments' (M4, M12), the table on its
// panel (L18); the index's intro (M11) and its list's own top edge, the row drawing no rule (L3).
// ⚠️ RE-PINNED 2026-10-21 (S5-DESIGN-REGISTER, the tile read — §16): the ghost's cards at the receipt's measure, as the page's.
check("12.1", "the week's ghost opens on the page's bands, in its order: the chip beside the code under the head, then the facts and times; the ledger's card at the receipt's measure; the commitments' card; cards below 1024 and the table on its panel from 1024", (w) => {
  const g = code(w, "weekGhost");
  const chip = g.includes('<MaswaliGhostHead eyebrowWidth="w-[144px]" titleWidth="w-[132px]" /> <div className="flex items-center gap-3" aria-hidden> <GhostBar className="h-[23px] w-[96px] rounded-pill" /> <GhostBar className="h-3 w-[112px]" /> </div>');
  const at = ['<div className="mat-flat flex max-w-receipt flex-col gap-2.5 rounded-card p-3">', '<div className="mat-flat flex max-w-receipt flex-col gap-4 rounded-card p-3">',
    '<div className="flex max-w-receipt flex-col lg:hidden">', '<div className="glass-panel hidden flex-col lg:flex">'].map((x) => g.indexOf(x));
  const order = at.every((x, i) => x >= 0 && (i === 0 || x > at[i - 1]));
  return [chip && order, j({ chip, at })];
});
check("12.2", "the index's ghost: the intro's lines under the head at the reading measure, then the list with its own top edge, dividing rows that carry the week, its chip and its facts as the rows do (beside the week from 768)", (w) => {
  const g = code(w, "indexGhost");
  const intro = g.includes('<div className="flex max-w-[68ch] flex-col gap-2" aria-hidden>');
  const list = g.includes('<div className="flex flex-col divide-y divide-border border-t border-border">') && !/border-b border-border py-3/.test(g);
  const row = g.includes('<GhostBar className="h-[23px] w-[88px] rounded-pill" />') && g.includes('<div className="flex flex-col gap-1 md:flex-row md:items-center md:gap-6">');
  return [intro && list && row, j({ intro, list, row })];
});

// ── §14 · the register week's right-aligned facts clear the resting fixed controls ──────────────────────────────────
// ⚠️ RE-PINNED IN THE OPEN 2026-10-21 (S5-DESIGN-REGISTER, the critic's M5): NO RIGHT LANE. The 56px lane was a second home
// for a platform rule — the resting Needle and the chat control keep clear of a page's text by their own rest rules
// (`needle-rest.ts`, the host's census), as on every other page — and it stopped the ledger's figures 56px short from 320 to
// 1279. The ledger stands at the receipt's measure (`max-w-receipt`, M4) and draws the ONE ledger's rows.
check("14.1", "M5 · M4 · the week ledger reserves no right lane (its figures end on its card's edge at every width), stands at the receipt's measure, and draws the shared builder's rows through the one ledger drawing", (w) => {
  const s = code(w, "week");
  // The section titled as the page's others are: its heading over its card (the commitments' rhythm).
  const card = s.includes('<section aria-labelledby="mln-reg-ledger" className="flex flex-col gap-2"> <h2 id="mln-reg-ledger" className={H2}>{t.millionea.regLedger}</h2> <div className="mat-flat flex max-w-receipt flex-col rounded-card p-3">');
  const rows = s.includes("<MaswaliLedger rows={registerLedgerRows(t, locale, rec.week)} />");
  const section = s.slice(s.indexOf('<section aria-labelledby="mln-reg-ledger"'), s.indexOf("<WeekCommitments "));
  const lane = /\bpr-(?:\[|\d)/.test(section);
  return [card && rows && !lane, j({ card, rows, lane })];
});
// ⚠️ RE-PINNED IN THE OPEN 2026-10-21 (S5-DESIGN-REGISTER, the critic's M5): the survivor list's 56px lane goes with the
// ledger's — the resting controls keep clear of a page's text by their own rest rules, as everywhere else.
check("14.2", "M5 · M4 · the survivor list reserves no right lane either: at the receipt's measure, its counts at its own edge, its rows divided by the list", (w) => {
  const s = code(w, "week");
  const heading = s.includes('<h2 id="mln-reg-standing"');
  const list = s.includes('<ol className="flex max-w-receipt flex-col divide-y divide-border border-t border-border"> {rec.week.standing.map(');
  const lane = /pr-\[56px\]|pr-14\b/.test(s);
  const counts = s.includes("{formatNumber(s.ticketsWithoutAMiss)}");
  return [heading && list && !lane && counts, j({ heading, list, lane, counts })];
});
// ⭐ H2 · the lead's ruling: a public week's page from its open — commitments, questions, confirmed outcomes — and money only
// once it is final.
// ⚠️ RE-PINNED 2026-10-21 (S5-DESIGN-REGISTER, the tile read — §16 says why): the waiting words wrap as the page's prose (`text-pretty`).
check("14.3", "H2 · a running week's page prints no money: the ledger's place says when the ledger comes, and the running week's view is built with no figure of money in it", (w) => {
  const s = code(w, "week");
  const later = s.includes("{rec.kind === \"final\" ? <MaswaliLedger rows={registerLedgerRows(t, locale, rec.week)} /> : <p className=\"text-body-sm text-text-muted text-pretty\">{t.millionea.regLedgerLater}</p>}");
  const live = s.slice(s.indexOf("function liveView("), s.indexOf("function Place("));
  const noMoney = live.length > 0 && !/formatTzs|\.sales|jackpot|\.fee\b|carryIn|carriedForward/.test(live);
  const read = s.includes('const v = rec.kind === "final" ? finalView(t, locale, rec, nowMs) : liveView(t, locale, rec.week, nowMs);');
  return [later && noMoney && read, j({ later, noMoney, read })];
});

// ── §15 · S5-FIX-PLAYER P3 · P4 · P11 · the ledger's figures, rendered ─────────────────────────────────────────────────
/** A settled week as the register reads it: a week with winners, `over` the case's own figures. */
const regWeek = (over: Partial<MillioneaRegisterWeek>): MillioneaRegisterWeek => ({
  id: "w", code: "MLN-2026-W48", state: "SETTLED", isFinal: false, closedAt: null, settledAt: null, tickets: 1_050, sales: 1_050_000, carryIn: 0,
  jackpot: 1_050_000, winners: 3, share: 304_500, fee: 136_500, topUp: 0, paid: 913_500, carriedForward: 0, refundsPending: false,
  opensAt: "2026-11-23T00:00:00+03:00", closesAt: "2026-11-27T18:00:00+03:00", questionSetHash: null, ticketMerkleRoot: null, ticketPrice: 1_000,
  floor: 1_000_000, feeRate: 0.13, traLevy: 13_650, gbtLevy: 6_825, toWinners: 913_500, remainder: 0, questions: [], substitutions: [], basis: "TEN_OF_TEN",
  winningScore: 10, resolution: "single", standing: null, scores: null, ...over,
} as MillioneaRegisterWeek);
/** The settlement's own arithmetic for the cases: a week with dust and no top-up (k = 7 over J = 1,050,000: share 130,500, dust
 *  0), one with dust (k = 7 over 1,051,000: J − F = 914,370, share 130,624, dust 2), and a floor week topped up (k = 7 over
 *  the floor: J − F = 870,000, share 124,285, dust 5 — which the top-up already left out). */
const LEDGER_CASES = {
  dust: regWeek({ sales: 1_051_000, tickets: 1_051, jackpot: 1_051_000, fee: 136_630, winners: 7, share: 130_624, paid: 914_368, toWinners: 914_370, remainder: 2,
    traLevy: 13_663, gbtLevy: 6_832, carriedForward: 2 }),
  topped: regWeek({ sales: 300_000, tickets: 300, jackpot: 1_000_000, fee: 130_000, winners: 7, share: 124_285, paid: 869_995, toWinners: 870_000, remainder: 5,
    topUp: 699_995, traLevy: 13_000, gbtLevy: 6_500, carriedForward: 0 }),
  rolled: regWeek({ sales: 412_000, tickets: 412, jackpot: null, fee: 0, winners: 0, share: null, paid: null, toWinners: null, remainder: null,
    traLevy: null, gbtLevy: null, topUp: null, carriedForward: 412_000 }),
};
// ⚠️ RE-PINNED IN THE OPEN 2026-10-21 (S5-DESIGN-REGISTER): the builder takes the reader's locale (its labels keep their runs
// through `keepFact`) and its values are nodes (every figure an `.amount` run), read here as the reader reads them.
type Rendered = Array<{ key: string; label: string; note: string; value: string }>;
const ledgerOf = (w: World, l: (typeof LOCALES)[number], week: MillioneaRegisterWeek): Rendered =>
  w.ledger(w.dict[l] as never, l, week).map((r) => ({ key: r.key, label: textOf(r.label as ReactNode), note: textOf((r.note ?? "") as ReactNode), value: textOf(r.value as ReactNode) }));
check("15.1", "P3 · \"To winners\" is J − F — the win ledger's and How to play's one figure — and stands BEFORE \"÷ k\": 914,370 over a share of 130,624 (never k × share, 914,368, under that label), in every language", (w) => {
  const off = LOCALES.flatMap((l) => {
    const rows = ledgerOf(w, l, LEDGER_CASES.dust);
    const keys = rows.map((r) => r.key);
    const winners = rows.find((r) => r.key === "winners");
    const ok = winners?.label === mln(w, l).toWinners && winners.value === formatTzs(914_370) && keys.indexOf("winners") >= 0 && keys.indexOf("winners") + 1 === keys.indexOf("share")
      && !rows.some((r) => r.value === formatTzs(914_368));
    return ok ? [] : [`${l}: ${j(rows.map((r) => [r.key, r.value]))}`];
  });
  return [off.length === 0, off.join(" | ")];
});
check("15.2", "P4 · the rounding remainder is printed in a week the house did not top up (TZS 2, carried) and NEVER in a topped-up week (its TZS 5 was left out of the top-up, so nothing carried)", (w) => {
  const off = LOCALES.flatMap((l) => {
    const dust = ledgerOf(w, l, LEDGER_CASES.dust).find((r) => r.key === "dust");
    const topped = ledgerOf(w, l, LEDGER_CASES.topped);
    const ok = dust?.value === formatTzs(2) && dust.label.startsWith(mln(w, l).remainder) && !topped.some((r) => r.key === "dust")
      && topped.some((r) => r.key === "topup" && r.value === formatTzs(699_995)) && topped.find((r) => r.key === "winners")?.value === formatTzs(870_000);
    return ok ? [] : [`${l}: ${j({ dust, topped: topped.map((r) => [r.key, r.value]) })}`];
  });
  return [off.length === 0, off.join(" | ")];
});
check("15.3", "P11 · a fee taken is the platform's signed money, \"−TZS 136,630\" (never \"TZS −136,630\"), and a week nobody won took \"TZS 0\"", (w) => {
  const off = LOCALES.flatMap((l) => {
    const taken = ledgerOf(w, l, LEDGER_CASES.dust).find((r) => r.key === "fee")?.value;
    const none = ledgerOf(w, l, LEDGER_CASES.rolled).find((r) => r.key === "fee")?.value;
    return taken === formatTzsSigned(-136_630) && taken === "−TZS 136,630" && none === "TZS 0" ? [] : [`${l}: ${j({ taken, none })}`];
  });
  return [off.length === 0, off.join(" | ")];
});
check("15.5", "P9 · the carry's weeks are the calendar chain's: Week 48 that carried in Week 46's pool across a voided Week 47 says \"Carried in from Week 46\" and hands on to the chain's next (\"Week 50\"); with no such week (yet), a label that names none — never Week 47 or 49 counted from its open", (w) => {
  const chain = regWeek({ code: "MLN-2026-W48", carryIn: 412_000, carryFromCode: "MLN-2026-W46", carryToCode: "MLN-2026-W50", winners: 0, jackpot: null, fee: 0, share: null,
    paid: null, toWinners: null, remainder: null, traLevy: null, gbtLevy: null, topUp: null, carriedForward: 1_462_000 });
  const none = { ...chain, carryFromCode: null, carryToCode: null };
  const off = LOCALES.flatMap((l) => {
    const d = mln(w, l);
    const a = ledgerOf(w, l, chain), b = ledgerOf(w, l, none);
    const lbl = (rows: Rendered, key: string) => rows.find((r) => r.key === key)?.label;
    const ok = lbl(a, "in") === fill(d.carriedIn, { week: 46 }) && lbl(a, "out") === fill(d.carriedOut, { week: 50 })
      && lbl(b, "in") === d.carriedInNoWeek && lbl(b, "out") === d.carriedOutNoWeek && ![...a, ...b].some((r) => /\b(?:47|49)\b|第4[79]周/.test(r.label));
    return ok ? [] : [`${l}: ${j([lbl(a, "in"), lbl(a, "out"), lbl(b, "in"), lbl(b, "out")])}`];
  });
  return [off.length === 0, off.join(" | ")];
});
// ⚠️ RE-PINNED IN THE OPEN 2026-10-21 (S5-DESIGN-REGISTER, the critic's H5): MR-26's two totals frame the week — "Money in"
// after the sales, "Money out" at the end — and the levies are one line out of the fee (its note), not two rows.
check("15.4", "the whole ledger of a won week, in order and to the shilling: sales, Money in, floor, jackpot, fee (its levies under it), to winners, ÷ k, remainder, carried forward, Money out", (w) => {
  const rows = ledgerOf(w, "en", LEDGER_CASES.dust);
  const want = [["sales", "TZS 1,051,000"], ["moneyIn", "TZS 1,051,000"], ["floor", "TZS 1,000,000"], ["jackpot", "TZS 1,051,000"], ["fee", "−TZS 136,630"],
    ["winners", "TZS 914,370"], ["share", "TZS 130,624"], ["dust", "TZS 2"], ["out", "TZS 2"], ["moneyOut", "TZS 1,051,000"]];
  const levies = rows.find((r) => r.key === "fee")?.note ?? "";
  return [j(rows.map((r) => [r.key, r.value])) === j(want) && levies.includes("TZS 13,663") && levies.includes("TZS 6,832"), j({ rows: rows.map((r) => [r.key, r.value]), levies })];
});

// ── §16 · the tile read of 2026-10-21 (S5-DESIGN-REGISTER) ──────────────────────────────────────────────────────────────
// Read on the states run's tiles: the zh objection window ran off the 320 page as one run (week-voided/-rolled zh-320-s10:
// "…11月26日 12" — its ":00" cut at the edge); the table's place number sat 2px above its row's first line (≥1024, sw-1024-s3
// rows 133–142 vs 135–144); the question set's eyebrow started 20px left of the root's (one glyph of two); the cards ran
// ~100 characters a line across a 768 page; a heading's last word stood alone (sw-360-s9 "tokeo").
check("16.1", "a log line's time breaks only between its kept runs — the objection window after its arrow (\"2026年11月25日 02:30 →\" / \"2026年11月26日 12:00\"), never off the page's edge as one run; a single instant stays whole", (w) => {
  const s = code(w, "week");
  const runs = s.includes("time: `${a} → ${b}`, runs: [a, b] }]");
  const drawn = s.includes('{l.time !== null && <span className="font-mono text-text-subtle">{keepFact(locale, l.time, l.runs ?? [l.time])}</span>}');
  const whole = /whitespace-nowrap font-mono text-text-subtle">\{l\.time\}/.test(s);
  return [runs && drawn && !whole, j({ runs, drawn, whole })];
});
check("16.2", "the table's place number stands on its row's first line: the row's header cell takes a cell's 12px top padding (`!pt-2`, 12px on the scale, over `.admin-tbl th`'s 10px) in a top-aligned row — never 2px above the question", (w) => {
  const s = code(w, "week");
  const row = s.includes('<tr key={q.slot} className="align-top" style={q.role === "RESERVE" ? RESERVE_WASH : undefined}>');
  const head = s.includes('<th scope="row" className="text-left !pt-2"><Place q={q} /></th>');
  return [row && head, j({ row, head })];
});
check("16.3", "both commitments wear the commitment glyph — the question set's eyebrow and the root's share one left edge", (w) => {
  const p = code(w, "parts");
  const glyphs = count(p, '<span className={`${EYEBROW} inline-flex items-center gap-1.5`}> <I.commitment s={12} className="shrink-0" /> <span>');
  const bare = p.includes("<span className={EYEBROW}>{t.millionea.stubHash}</span>");
  return [glyphs === 2 && !bare, j({ glyphs, bare })];
});
check("16.4", "M4 · the question cards stand at the receipt's measure (the ticket's tier, as the ledger's and the commitments' cards) — never ~100 characters a line across a 768 page", (w) => {
  const s = code(w, "week");
  const cards = s.includes('<div className="flex max-w-receipt flex-col lg:hidden" data-testid="millionea-register-cards">');
  return [cards, j({ cards })];
});
check("16.5", "the page's headings balance their lines (`text-balance`, the platform's heading wrap) and the ledger's waiting words wrap as the page's prose (`text-pretty`) — no word alone on a last line", (w) => {
  const s = code(w, "week"), p = code(w, "parts");
  const h2 = s.includes('const H2 = "font-display text-title-sm font-bold text-text text-balance";')
    && p.includes('<h2 id="mln-reg-commit" className="font-display text-title-sm font-bold text-text text-balance">{t.millionea.commitTitle}</h2>');
  const later = s.includes('<p className="text-body-sm text-text-muted text-pretty">{t.millionea.regLedgerLater}</p>');
  return [h2 && later, j({ h2, later })];
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
  const MIN_ASSERTIONS = 58; // S5-FIX-PLAYER §15 (P3, P4, P9, P11) added five; S5-DESIGN-REGISTER (3.9, 5.3, 5.4, 7.5, 7.6, 9.8, 14.3) seven, §16 (the tile read) five
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
  ["H4 undone — every attestation said as one officer (it could never say two)", "2.3", plantSrc("week", '{s === "two" ? t.millionea.signoffTwo : t.millionea.signoffOne}', "{t.millionea.signoffOne}")],
  ["H4 undone — one role line for all fifteen again", "2.3", plantSrc("week", "function Signoff(", 'const role = (q: Q) => (q.sealerRole ? t.millionea.officerRole : "—");\nfunction Signoff(')],
  // §3
  ["R1 undone — the cards hide from 768 again", "3.1", plantSrc("week", '<div className="flex max-w-receipt flex-col lg:hidden" data-testid="millionea-register-cards">', '<div className="flex max-w-receipt flex-col md:hidden" data-testid="millionea-register-cards">')],
  ["R1 undone — the table from 768 again", "3.1", plantSrc("week", '<ScrollX label={heading} className="glass-panel hidden lg:block">', '<ScrollX label={heading} className="glass-panel hidden md:block">')],
  ["L18 undone — the table off its panel", "3.1", plantSrc("week", '<ScrollX label={heading} className="glass-panel hidden lg:block">', '<ScrollX label={heading} className="hidden lg:block">')],
  ["R2 undone — a seventh column back in the head", "3.2", plantSrc("week", '<th scope="col" className="text-left">{t.millionea.regColOutcome}</th>', '<th scope="col" className="text-left">{t.millionea.regColOutcome}</th>\n              <th scope="col" className="text-left">{t.millionea.regColEvent}</th>')],
  ["R8 undone — the table's category as a plain column of its own", "3.3", plantSrc("week", '<td className="whitespace-nowrap"><SourceLink q={q} /></td>', '<td className="text-text-muted">{marketCategoryLabel(t, q.category)}</td>\n        <td className="whitespace-nowrap"><SourceLink q={q} /></td>')],
  ["M2 undone — the table's category above its question again (the question on its cell's second line)", "3.3", plantSrc("week",
    '            <span className="text-text text-pretty break-normal">{textIn(locale, q.text)}</span>\n            <span className="text-body-sm text-text-muted text-pretty break-normal">{textIn(locale, q.criterion)}</span>\n            <Category t={t} q={q} />',
    '            <Category t={t} q={q} />\n            <span className="text-text text-pretty break-normal">{textIn(locale, q.text)}</span>\n            <span className="text-body-sm text-text-muted text-pretty break-normal">{textIn(locale, q.criterion)}</span>')],
  ["R2 undone — the event's date free to break", "3.4", plantSrc("week", '<td className="whitespace-nowrap font-mono text-text-muted">{registerWhen(t, locale, q.eventStartsAt, nowMs) ?? "—"}</td>', '<td className="font-mono text-text-muted">{registerWhen(t, locale, q.eventStartsAt, nowMs) ?? "—"}</td>')],
  ["H4 undone — the source plain text again (a result cannot be checked from the page)", "3.7", plantSrc("week", '<a href={q.sourceUrl} target="_blank" rel="noopener noreferrer" className="kp-mln-hit', '<a className="kp-mln-hit')],
  ["R2 undone — the raw domain printed", "3.7", plantSrc("week", "<span>{sourceLabel(q.sourceDomain)}</span>", "<span>{q.sourceDomain}</span>")],
  ["R2 undone — the slip prints the raw source", "3.7s", plantSrc("slip", "source: sourceLabel(q.source)", "source: q.source")],
  ["R2 undone — the question's floor gone", "3.5", plantSrc("week", '<td className="min-w-[240px]">', "<td>")],
  ["a sourceLabel that keeps \"www.\"", "3.6", { ...REAL, sourceLabel: (d) => d }],
  ["a sourceLabel that strips any first label", "3.6", { ...REAL, sourceLabel: (d) => d.replace(/^[^.]+\./, "") }],
  ["H4 undone — a card without its criterion", "3.8", plantSrc("week", '        <span className="text-body-sm text-text-muted text-pretty break-normal">{textIn(locale, q.criterion)}</span>\n        <span className="text-body-sm text-text-muted"><MaswaliFacts', '        <span className="text-body-sm text-text-muted"><MaswaliFacts')],
  ["the card's question kept whole by keep-all again (\"若 TMA\" alone on a line)", "3.8", plantSrc("week", '<span className="text-body-sm text-text text-pretty break-normal">{textIn(locale, q.text)}</span>', '<span className="text-body-sm text-text text-pretty">{textIn(locale, q.text)}</span>')],
  ["M2 undone — a card's event and source joined with \" · \"", "3.8", plantSrc("week", '<MaswaliFacts facts={[event(q), <SourceLink key="src" q={q} />]} />', "{`${event(q)} · ${sourceLabel(q.sourceDomain)}`}")],
  ["M3 undone — a carry drawn before the week settled (an objection could still un-carry it)", "3.9", plantSrc("week", 'if (w.state === "SETTLED") {\n    for (const s of w.substitutions) {', "{\n    for (const s of w.substitutions) {")],
  ["a waiting void's words opening a line in lower case again", "3.9", plantSrc("week", "{words.charAt(0).toLocaleUpperCase() + words.slice(1)}", "{words}")],
  ["M3 undone — a voided main's number no longer struck", "3.9", plantSrc("week", '{q.role === "MAIN" && q.outcome === "VOID" ? <s className="decoration-current">{label}</s> : label}', "{label}")],
  // §4
  ["R3 undone — the card's stamp says \"Result ·\" again", "4.1", plantSrc("week", '{q.outcome !== null ? <MaswaliOutcomeStamp t={t} outcome={q.outcome} label={false} /> : <span className="text-body-sm text-text-muted">', '{q.outcome !== null ? <MaswaliOutcomeStamp t={t} outcome={q.outcome} /> : <span className="text-body-sm text-text-muted">')],
  // §5
  ["R4 undone — the state back in the title", "5.1", plantSrc("week", "<PageHeader eyebrow={t.millionea.productTitle} title={weekWord(t, week)} />", "<PageHeader eyebrow={t.millionea.productTitle} title={`${weekWord(t, week)} · ${v.state}`} />")],
  ["R7 undone — the eyebrow says the register again under its back link", "5.1", plantSrc("week", "<PageHeader eyebrow={t.millionea.productTitle} title={weekWord(t, week)} />", "<PageHeader eyebrow={t.millionea.registerTitle} title={weekWord(t, week)} />")],
  ["a settled week's chip in the resolved gold", "5.2", { ...REAL, weekChip: TONE_CHIP[STATUS_TONE.RESOLVED.player] }],
  ["M1 undone — no facts under the chip", "5.3", plantSrc("week", '{v.facts.length > 0 && <p className="text-body text-text"', '{false && <p className="text-body text-text"')],
  ["M1 undone — the ledger after the questions again", "5.3", (() => {
    const w = plantSrc("week", "        <Questions t={t} locale={locale} v={v} nowMs={nowMs} />\n", "");
    return w && plantSrc("week", '        <section aria-labelledby="mln-reg-ledger"', '        <Questions t={t} locale={locale} v={v} nowMs={nowMs} />\n        <section aria-labelledby="mln-reg-ledger"', w);
  })()],
  ["M9 undone — the sunset's top score never shown", "5.4", plantSrc("week", 'const sunset = w.basis === "TOP_SCORE" && w.winningScore !== null;', "const sunset = false;")],
  // §6
  ["M12 undone — the root's label a sentence again", "6.1", plantSrc("parts", "<span>{t.millionea.commitTicketsAtClose}</span>", "<span>{t.millionea.commitAtClose}</span>")],
  ["the lead's root words changed", "6.1", plantWord("en", "commitFixed", "Fixed {when}, {n} tickets")],
  ["the week page without its commitments", "6.1", plantSrc("week", "<WeekCommitments t={t} locale={locale}", "<WeekCommitmentsGone t={t} locale={locale}")],
  ["R6 undone — \"This week's questions\" on a past week", "6.2", plantSrc("week", "const heading = fill(t.millionea.regWeekQuestions, { week: weekNumberOf(v.code) });", "const heading = t.millionea.weekQuestions;")],
  ["R6 — zh says 本周 again", "6.3", plantWord("zh", "regWeekQuestions", "本周题目")],
  // §7
  ["R9 undone — the old two-grammar row line", "7.1", plantSrc("index", "facts={weekFacts(t, w)}", "facts={[counted(1, t.millionea.settledWonOne, t.millionea.settledWon, { week: 45 })]}")],
  ["L3 undone — the index draws its own row again", "7.1", plantSrc("index", "export default async function", "function WeekRow() { return null; }\nexport default async function")],
  ["R9 — the facts side by side at every width (a phone line can open on \"·\")", "7.2", plantSrc("parts", '<MaswaliFacts layout="phone" facts={facts} />', '<MaswaliFacts facts={facts} />')],
  ["the facts back after the week's column, far from the chevron", "7.2", plantSrc("parts", 'className="min-w-0 text-body-sm text-text-muted lg:ml-auto"', 'className="min-w-0 text-body-sm text-text-muted"')],
  ["the row drawing its own rule again", "7.2", plantSrc("parts", "<li>\n      <Link href={registerWeekHref(code) as never}", '<li className="border-b border-border">\n      <Link href={registerWeekHref(code) as never}')],
  ["R9 — a voided week says \"every ticket refunded\" before the refunds landed", "7.3", { ...REAL, weekFacts: (t, w) => (w.state === "VOIDED" ? [t.millionea.regRefunded] : weekFacts(t, w)) }],
  ["R9 — the carry's amount free to break", "7.4", { ...REAL, weekFacts: (t, w) => (w.state === "SETTLED" && (w.winners ?? 0) === 0 ? [...fill(t.millionea.settledRollover, { amount: "TZS 412,000" }).split(" · "), t.millionea.feeZero] : weekFacts(t, w)) }],
  ["L1 undone — a week nobody won says its carry without \"no 10/10\"", "7.3", { ...REAL, weekFacts: (t, w) => (w.state === "SETTLED" && (w.winners ?? 0) === 0 ? weekFacts(t, w).slice(1) : weekFacts(t, w)) }],
  ["a list without its own top edge", "7.2", plantSrc("index", 'const LIST = "flex flex-col divide-y divide-border border-t border-border";', 'const LIST = "flex flex-col divide-y divide-border";')],
  ["H2 undone — the weeks still running left off the index", "7.5", plantSrc("index", "const running = page === 1 ? current : [];", "const running: typeof current = [];")],
  ["H2 undone — a running week's row prints its pool", "7.5", { ...REAL, liveFacts: (t, l, w, n) => [...liveWeekFacts(t, l, w, n), "TZS 42,000"] }],
  ["M11 undone — the default empty box under a left heading", "7.6", plantSrc("index", "<EmptyState\n            fill\n            kind=\"fairness\"", "<EmptyState\n            kind=\"fairness\"")],
  ["M11 undone — the index says nothing of what it is", "7.6", plantSrc("index", "{keepFact(locale, t.millionea.regIntro)}", "{null}")],
  ["the intro's dash free to open a line again", "7.6", plantSrc("index", "{keepFact(locale, t.millionea.regIntro)}", "{t.millionea.regIntro}")],
  // §8
  ["R10 undone — \"Week Register\" in title case", "8.1", plantWord("en", "registerTitle", "Week Register")],
  ["zh's door and title disagree", "8.1", plantWord("zh", "register", "每周登记册")],
  // §9
  ["A1 undone — a ledger note after a \"·\"", "9.1", plantSrc("ledger", "label: m.topUp, note: m.topUpNote,", "label: `${m.topUp} · ${m.topUpNote}`,")],
  ["A1 undone — the levies one plain \"·\"-joined string", "9.2", plantSrc("ledger", "return <MaswaliFacts facts={parts.map((p) => keepFact(locale, p, [p]))} />;", 'return parts.join(" · ");')],
  ["A1 undone — the standing's count ungrouped", "9.3", plantSrc("week", "{formatNumber(s.ticketsWithoutAMiss)}", "{s.ticketsWithoutAMiss}")],
  ["a `kept` that keeps nothing", "9.4", { ...REAL, kept: (text) => text }],
  ["A1 undone — the refund's price free to break", "9.5", plantSrc("ledger", "label: keepFact(locale, fill(m.refundEach, { price }), [price])", "label: fill(m.refundEach, { price })")],
  ["R2 undone — the sold note uses its old multiplication split", "9.5s", plantSrc("ledger", "note: keepFact(locale, sold, ticketSalesRuns(sold, price))", 'note: keepFact(locale, sold, [sold.split(" × ")[0].trim(), `× ${price}`])')],
  ["R2 undone — the unit-price helper keeps the entire sold label", "9.5s", { ...REAL, ticketSalesRuns: (sold) => [sold] }],
  ["A1 undone — the reserve rule's range free to part", "9.6", plantSrc("week", "{keepFact(locale, t.millionea.regSubRule)}", "{t.millionea.regSubRule}")],
  ["H1 undone — the reserve rule silent on a week voided whole", "9.6", plantWord("en", "regSubRule", "Reserves A1–A5 count only when a main question voids, in order: the lowest-numbered voided main takes the first unused valid reserve.")],
  ["the log's old order — an untimed entry read as the earliest", "9.7", plantSrc("week", "return [...entries].sort((a, b) => order(a.at) - order(b.at));", "return [...entries].sort((a, b) => (msOf(a.at) ?? 0) - (msOf(b.at) ?? 0));")],
  ["the log printing a \"—\" where the week's void has no time", "9.7", plantSrc("week", '{l.time !== null && <span className="font-mono text-text-subtle">{keepFact(locale, l.time, l.runs ?? [l.time])}</span>}', '<span className="font-mono text-text-subtle">{l.time ?? "—"}</span>')],
  ["P6 undone — the objection window gone from a final week's log", "9.8", plantSrc("week", "    ...windowEntry(t, locale, rec.objections.from, rec.objections.to, nowMs),\n", "")],
  ["H1 undone — a voided week's line without its counts", "9.8", plantWord("en", "logWeekVoidCounts", "Week voided")],
  ["L8 undone — \"Question 1 void\" beside \"Week voided\"", "9.8", plantWord("sw", "logVoid", "Swali {n} batili")],
  // §13
  ["A2 undone — the reserve rule's Chinese without its phrase breaks", "13.1", plantWord("zh", "regSubRule", "备选规则：编号最小的作废正选题取第一道未使用的有效备选题，按 A1 至 A5 的顺序。")],
  ["A2 undone — the intro's Chinese without its phrase breaks", "13.1", plantWord("zh", "regIntro", "每个 Maswali Millionea 周自开放之日起在此公示：15 道题目及其来源、锁定题目与彩票的两枚数字指纹，以及每个经认证的结果。该周结果确定后，每一笔资金随之公示——销售、费用、补足、中奖者与滚存。不显示任何玩家。")],
  ["A2 undone — a void reason's Chinese without its phrase breaks", "13.1", plantWord("zh", "voidNoSource", "截止时间前，其来源及指定备用来源均无读数")],
  // §10
  ["A3 undone — the Chinese labels' rule gone", "10.1", plantSrc("css", ".kp-mln-zh:lang(zh) .eyebrow { letter-spacing: 0; }\n", "")],
  ["A3 — the rule moved away from the keep-all rule", "10.1", (() => {
    const w = plantSrc("css", ".kp-mln-zh:lang(zh) .eyebrow:is(.text-micro, .text-caption) { font-size: 12px; line-height: 16px; }\n", "");
    return w && { ...w, src: { ...w.src, css: `${w.src.css}\n.kp-mln-zh:lang(zh) .eyebrow:is(.text-micro, .text-caption) { font-size: 12px; line-height: 16px; }\n` } };
  })()],
  // §11
  ["§D · L4 — zh's officer is 官员 again", "11.1", plantWord("zh", "signoffOne", "一位官员")],
  ["§D — sw's attested head IMETHIBITISHWA again", "11.1", plantWord("sw", "regColAttested", "Imethibitishwa")],
  ["§D — a past week's void says 本周 again", "11.1", plantWord("zh", "logWeekVoidCounts", "本周作废：{mains} 道正选题作废，仅有 {reserves} 道有效备选题")],
  ["L5 undone — the window by its old name", "11.1", plantWord("sw", "regCheck", "Muda wa ukaguzi")],
  ["L6 undone — two sw nouns for the floor's top-up", "11.1", plantWord("sw", "topUp", "Nyongeza ya dhamana")],
  // §12
  ["the week's ghost without the table's bands from 1024", "12.1", plantSrc("weekGhost", '<div className="glass-panel hidden flex-col lg:flex">', '<div className="hidden">')],
  ["the week's ghost without the ledger's card", "12.1", plantSrc("weekGhost", '<div className="mat-flat flex max-w-receipt flex-col gap-2.5 rounded-card p-3">', '<div className="flex flex-col gap-2.5">')],
  ["the index ghost's rows without the chip", "12.2", plantSrc("indexGhost", '<GhostBar className="h-[23px] w-[88px] rounded-pill" />', "")],
  ["the index ghost without the intro", "12.2", plantSrc("indexGhost", '<div className="flex max-w-[68ch] flex-col gap-2" aria-hidden>', '<div className="flex flex-col gap-2" aria-hidden>')],
  // §14
  ["M5 undone — the ledger's 56px right lane back", "14.1", plantSrc("week", 'className="mat-flat flex max-w-receipt flex-col rounded-card p-3"', 'className="mat-flat flex max-w-receipt flex-col rounded-card p-3 pr-[56px] xl:pr-3"')],
  ["M4 undone — the ledger across the whole reading measure", "14.1", plantSrc("week", 'className="mat-flat flex max-w-receipt flex-col rounded-card p-3"', 'className="mat-flat flex flex-col rounded-card p-3"')],
  ["M5 undone — the survivor list's 56px lane back", "14.2", plantSrc("week", '<ol className="flex max-w-receipt flex-col divide-y divide-border border-t border-border">\n              {rec.week.standing', '<ol className="flex max-w-receipt flex-col divide-y divide-border border-t border-border pr-[56px] xl:pr-0">\n              {rec.week.standing')],
  ["the ledger's rows no longer the builder's (the page drawing its own again)", "14.1", plantSrc("week", "<MaswaliLedger rows={registerLedgerRows(t, locale, rec.week)} />", "<MaswaliLedger rows={[]} />")],
  ["H2 undone — a running week's ledger drawn before it is final", "14.3", plantSrc("week", '{rec.kind === "final"\n              ? <MaswaliLedger', "{true\n              ? <MaswaliLedger")],
  ["H2 undone — a running week's head states money", "14.3", plantSrc("week", "facts: liveWeekFacts(t, locale, w, nowMs), times:", "facts: [formatTzs(0)], times:")],
  // §15 — each fix undone in the builder itself
  ["P3 undone — \"To winners\" prints k × share, after the split", "15.1", { ...REAL, ledger: (t, l, wk) => { const rows = registerLedgerRows(t, l, wk); const i = rows.findIndex((r) => r.key === "winners"); const [row] = rows.splice(i, 1); rows.splice(i + 1, 0, { ...row, value: wk.paid === null ? "—" : formatTzs(wk.paid) }); return rows; } }],
  ["P4 undone — the remainder printed in a topped-up week", "15.2", { ...REAL, ledger: (t, l, wk) => { const rows = registerLedgerRows(t, l, wk); if ((wk.topUp ?? 0) > 0 && (wk.remainder ?? 0) > 0) rows.splice(rows.length - 1, 0, { key: "dust", label: t.millionea.remainder, value: formatTzs(wk.remainder ?? 0) }); return rows; } }],
  ["P11 undone — the fee unsigned (\"TZS −136,630\")", "15.3", { ...REAL, ledger: (t, l, wk) => registerLedgerRows(t, l, wk).map((r) => (r.key === "fee" && (wk.fee ?? 0) > 0 ? { ...r, value: formatTzs(-(wk.fee ?? 0)) } : r)) }],
  ["the levies dropped from under a won week's fee", "15.4", { ...REAL, ledger: (t, l, wk) => registerLedgerRows(t, l, wk).map((r) => (r.key === "fee" ? { ...r, note: undefined } : r)) }],
  ["P9 undone — the carry's weeks counted from the week's open (47 and 49 across the voided week)", "15.5", { ...REAL, ledger: (t, l, wk) => registerLedgerRows(t, l, { ...wk, carryFromCode: wk.carryFromCode ? "MLN-2026-W47" : null, carryToCode: wk.carryToCode ? "MLN-2026-W49" : null }) }],
  // §16 — the tile read's fixes undone
  ["the zh window one unbreakable run again (\":00\" off the 320 page)", "16.1", plantSrc("week", '<span className="font-mono text-text-subtle">{keepFact(locale, l.time, l.runs ?? [l.time])}</span>', '<span className="whitespace-nowrap font-mono text-text-subtle">{l.time}</span>')],
  ["the window's runs dropped (kept whole by its default run)", "16.1", plantSrc("week", ", runs: [a, b] }]", " }]")],
  ["the row's header back on `.admin-tbl th`'s 10px (the number 2px high)", "16.2", plantSrc("week", '<th scope="row" className="text-left !pt-2">', '<th scope="row" className="text-left">')],
  ["the row's header 4px too low (`!pt-3` is 16px on the scale)", "16.2", plantSrc("week", '<th scope="row" className="text-left !pt-2">', '<th scope="row" className="text-left !pt-3">')],
  ["the row baseline-aligned (the table's cells stay middle: `.admin-tbl td` wins)", "16.2", plantSrc("week", '<tr key={q.slot} className="align-top" style=', '<tr key={q.slot} className="align-baseline" style=')],
  ["the question set's eyebrow without its glyph (a ragged left edge)", "16.3", plantSrc("parts", '              <I.commitment s={12} className="shrink-0" />\n              <span>{t.millionea.stubHash}</span>', "              <span>{t.millionea.stubHash}</span>")],
  ["M4 undone — the cards across the whole page from 768", "16.4", plantSrc("week", 'className="flex max-w-receipt flex-col lg:hidden" data-testid="millionea-register-cards"', 'className="flex flex-col lg:hidden" data-testid="millionea-register-cards"')],
  ["the headings unbalanced again (\"tokeo\" alone)", "16.5", plantSrc("week", 'const H2 = "font-display text-title-sm font-bold text-text text-balance";', 'const H2 = "font-display text-title-sm font-bold text-text";')],
  ["the waiting words without the prose wrap (\"final.\" alone)", "16.5", plantSrc("week", '<p className="text-body-sm text-text-muted text-pretty">{t.millionea.regLedgerLater}</p>', '<p className="text-body-sm text-text-muted">{t.millionea.regLedgerLater}</p>')],
  ["P9 undone — \"Week 0\" where the chain names none", "15.5", { ...REAL, ledger: (t, l, wk) => registerLedgerRows(t, l, { ...wk, carryFromCode: wk.carryFromCode ?? "MLN-2026-W00", carryToCode: wk.carryToCode ?? "MLN-2026-W00" }) }],
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
