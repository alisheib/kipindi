/**
 * test:maswali-doors — THE DOORS INTO MILLIONEA, AS THEY ARE DRAWN (MASWALI-BUILD S5-DESIGN-DOORS; the design critics' R1-doors,
 * 2026-10-21; DESIGN_AUTHORITY §M8a item 11).
 *
 *   npx tsx scripts/maswali-doors.test.mts     (npm run test:maswali-doors)
 *
 *   §1 the card, every state its model draws, in en, sw and zh, on both hosts (the journey home, the classic board) —
 *      rendered by the card itself from the card's own model (`scripts/lib/maswali-door-fixtures.mts`), never re-drawn:
 *      M2 one order · M3 zh tickets · M4 the identity plate · M6 no jackpot after a rollover · M7 the price to a reader
 *      who holds none · L3 the figure's rung · L5 zh headline · L7 a time's numerals `.mono`, its words the body's · L8
 *      paused words · L9 the register's won words · L10 the presale's date, its numerals `.mono` · L11 its name and
 *      description · L12 the preview chip · P6 the objection window · L2 each host's box · and the tile read of 2026-10-21:
 *      every state line opening as a sentence opens, a figure not read drawn as the hub's quiet dash, the final week's line
 *      never ending on a connective
 *   §2 its loading picture (H1): the ghost is the card's anatomy and the common card's words, hidden over bars but for its
 *      name; the journey home's ghost and the board's draw it where the card lands, and only when told the card is offered
 *   §3 the stylesheet: the door's one anatomy per width, its hover, the ghost's hidden words
 *   §4 controls: each check above is shown failing on a planted copy
 *   §5 the dark payload (round 2's blocker): a Millionea answer crosses into client code only while it is true — the two
 *      loading files RUN for every reader, what they hand their client drawings read as Flight writes it; a census of every
 *      place in src that hands one, each classified by the side of the server/client line it stands on; with its plants
 * The browser half — the ghost's box against the card's at 320/360/768/1280 in three languages, and every state shot — is
 * `qa:maswali-player-shots`' door pages (MASWALI_SHOTS_PAGES=door-states,door-ghosts); the dark payload's real bytes are
 * qa:live's dark section (`scripts/live/millionea-dark.mjs`), run against a WITHDRAWN and a STAFF_PREVIEW server.
 * Pure: it reads source files and renders components. No server, no database, no network, no file written.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { dict } from "../src/lib/i18n-dict.ts";
import { fill, formatTzs } from "../src/lib/utils.ts";
import { decomment } from "./lib/decomment.mts";
import { isDirective } from "./lib/is-directive.mts";
import { HOSTS, LOCALES, STATES, cardMarkup, doorFixtures, inApp, type DoorHost } from "./lib/maswali-door-fixtures.mts";
import NodeModule, { createRequire } from "node:module";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const code = (rel: string) => decomment(read(rel));
const squash = (s: string) => s.replace(/\s+/g, " ");
const count = (s: string, needle: string) => s.split(needle).length - 1;
const j = (v: unknown) => JSON.stringify(v);
type L = (typeof LOCALES)[number];

process.exitCode = 1;
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
};
const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const textOf = (m: string) => decode(m.replace(/<[^>]+>/g, ""));
/** The element whose opening tag carries `marker`, through its balanced close (`tag` its element name). */
const elementAt = (m: string, marker: string, tag = "span"): string => {
  const at = m.indexOf(marker);
  if (at < 0) return "";
  const start = m.lastIndexOf(`<${tag}`, at);
  let depth = 0;
  for (let i = start; i < m.length; i++) {
    if (m.startsWith(`<${tag}`, i) && /[\s>]/.test(m[i + tag.length + 1] ?? "")) depth++;
    else if (m.startsWith(`</${tag}>`, i) && --depth === 0) return m.slice(start, i + tag.length + 3);
  }
  return "";
};
const FX = doorFixtures();
const idx = (name: string) => { const i = STATES.findIndex((s) => s.name.startsWith(name)); if (i < 0) throw new Error(`no state "${name}"`); return i; };
const card = (l: L, name: string, host: DoorHost = "journey") => FX.cards[l][host][idx(name)];
const ruleOf = (m: string) => elementAt(m, 'class="kp-mln-door__rule');
const stateOf = (m: string) => elementAt(m, 'class="kp-mln-door__state');
const headOf = (m: string) => elementAt(m, 'class="kp-mln-door__head');

// ── §1 · the card ─────────────────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§1 · the card, every state, three languages, two hosts");
ok(`1.0 · the fixtures draw ${STATES.length} states × ${LOCALES.length} languages × ${HOSTS.length} hosts, each a door linking to the hub`,
  STATES.length >= 16 && LOCALES.every((l) => HOSTS.every((h) => FX.cards[l][h].length === STATES.length && FX.cards[l][h].every((m) => m.startsWith('<a ') && m.includes('href="/millionea"')))));

// M2 · one order: the figure, the carry that adds to it, the 10/10 share, the fee — then the state.
const orderDefects = (l: L, m: string) => {
  const d = dict[l].millionea, head = d.ruleWithFigure.split(" · ");
  const marks = [head[0].replace("{amount}", "").trim(), fill(d.pendingCarry, { week: 46 }), head[1], fill(head[2], { pct: 13 }), d.salesCloseAt.replace("{when}", "").trim()];
  const text = textOf(m), at = marks.map((x) => text.indexOf(x));
  return at.some((x, i) => x < 0 || (i > 0 && x <= at[i - 1])) ? [`${l}: ${j(at)} in "${text}"`] : [];
};
{
  const d = LOCALES.flatMap((l) => HOSTS.flatMap((h) => orderDefects(l, card(l, "open · carry", h))));
  ok("1.1 · M2 · ONE ORDER on both hosts in three languages: the figure, the carry that adds to it, the 10/10 share, the fee at payout, then the close — never the carry after the fee", d.length === 0, d.join(" | "));
}

// M3 · zh counts tickets in its own words, never "3/10" under "10/10".
{
  const held = (l: L) => textOf(stateOf(card(l, "open · 3 of 10")));
  const WANT: Record<L, string> = { en: "Your tickets this week: 3 of 10", sw: "Tiketi zako wiki hii: 3 kati ya 10", zh: "您本周的彩票：3 张，上限 10 张" };
  const wrong = LOCALES.filter((l) => !held(l).includes(WANT[l]) || /\b3\/10\b/.test(held(l)));
  ok("1.2 · M3 · a holder's line counts tickets of the cap in every language — zh \"您本周的彩票：3 张，上限 10 张\", never \"3/10\" under the rule's \"10/10\"", wrong.length === 0, j(LOCALES.map(held)));
}

// M4 · the identity plate, its tint never typed at the call site; the mark asked in duotone (PHOSPHOR W5).
// ⏳ The family draws `millionea` in bold and fill only (a shell key): until its duotone joins `DUO_KEYS` (scripts/glyphs,
// routed by the lead) the family's own fallback draws bold — so the check reads what the family draws for the asked tier.
const { GLYPH_REGISTRY } = (await import("../src/components/ui/glyph-registry.generated.ts")) as { GLYPH_REGISTRY: Record<string, { i: Record<string, unknown> }> };
const MARK_TIER = GLYPH_REGISTRY.millionea?.i.duo ? "duo" : "bold";
const plateDefects = (m: string) => {
  const plate = elementAt(m, "kp-mln-door__plate");
  const d: string[] = [];
  if (!/class="[^"]*kp-plate--identity[^"]*"/.test(plate)) d.push("not the identity plate");
  if (!/style="width:48px;height:48px"/.test(plate)) d.push(`a typed tint or size (${/style="([^"]*)"/.exec(plate)?.[1]})`);
  if (!plate.includes(`data-g="millionea.${MARK_TIER}"`) || !plate.includes('width="24"')) d.push(`the mark is not the family's ${MARK_TIER} 24px glyph of a 48px plate`);
  return d;
};
{
  const d = LOCALES.flatMap((l) => HOSTS.flatMap((h) => FX.cards[l][h].flatMap((m, i) => plateDefects(m).map((x) => `${l} ${h} ${STATES[i].name}: ${x}`))));
  const asked = squash(code("src/components/maswali/maswali-home-card.tsx")).includes('<IconPlate size={48} variant="identity" aria-hidden className="kp-mln-door__plate"> <MillioneaGlyph name="millionea" s={plateGlyph(48)} tier="duo" /> </IconPlate>');
  ok(`1.3 · M4 · every state's plate is the kit's identity plate (\`variant="identity"\`), no tint typed at the call site, the product mark asked in duotone at plateGlyph(48) (drawn: ${MARK_TIER}${MARK_TIER === "duo" ? "" : " — ⏳ the family holds no duotone millionea yet"})`,
    d.length === 0 && asked, d.slice(0, 3).join(" | "));
}

// M6 · a week nobody won states no jackpot; nor does a void. CONTROL: a won week does.
{
  const noRule = ["settled · no 10/10", "voiding", "voided · refunds", "voided · every"];
  const leaked = LOCALES.flatMap((l) => noRule.filter((n) => ruleOf(card(l, n)) !== "" || textOf(card(l, n)).includes(dict[l].millionea.ruleWithFigure.split(" · ")[1])).map((n) => `${l}: ${n}`));
  const carried = LOCALES.filter((l) => !textOf(stateOf(card(l, "settled · no 10/10"))).includes(formatTzs(601_000)));
  const won = LOCALES.filter((l) => ruleOf(card(l, "settled · 3")) === "");
  ok("1.4 · M6 · a week nobody won draws no \"Jackpot —\" and no live rule — only its own line (\"No 10/10 · TZS 601,000 carried forward\") — nor does a void; CONTROL: a won week keeps its headline",
    leaked.length === 0 && carried.length === 0 && won.length === 0, j({ leaked, carried, won }));
}

// M7 · a reader who holds no ticket (a guest too) is told what a ticket costs; a holder is told their count, not the price.
{
  const WANT: Record<L, string> = { en: "Ticket TZS 1,000", sw: "Tiketi TZS 1,000", zh: "每张彩票 TZS 1,000" };
  const price = LOCALES.filter((l) => !textOf(stateOf(card(l, "open · no ticket"))).includes(WANT[l]) || textOf(stateOf(card(l, "open · no ticket"))).includes(fill(dict[l].millionea.yourTicketsThisWeek, { n: 0, cap: 10 })));
  const holder = LOCALES.filter((l) => textOf(stateOf(card(l, "open · 3 of 10"))).includes(WANT[l]));
  const keys = LOCALES.filter((l) => dict[l].millionea.cardPrice !== WANT[l].replace("TZS 1,000", "{price}"));
  ok("1.5 · M7 · the common card tells a reader who holds no ticket what one costs — \"Ticket TZS 1,000\" / \"Tiketi TZS 1,000\" / \"每张彩票 TZS 1,000\", the week's frozen price — and a holder their count instead",
    price.length === 0 && holder.length === 0 && keys.length === 0, j({ price, holder, keys }));
}

// L3 · the figure on the body's large rung at every width; L5 · zh's headline.
{
  const figure = LOCALES.flatMap((l) => HOSTS.map((h) => elementAt(card(l, "open · no ticket", h), 'class="amount')));
  const rung = figure.every((f) => /class="amount text-body-lg font-semibold text-text"/.test(f) && !/\b(?:md|lg|xl):text-/.test(f));
  ok("1.6 · L3 · the figure is `text-body-lg` at every width (it was 13px below 1280 and 16px from 1280)", rung && figure.length === 6, j(figure.slice(0, 1)));
  const zh = textOf(ruleOf(card("zh", "open · carry")));
  ok("1.7 · L5 · zh says \"大奖：至少 TZS 1,000,000\" — never \"大奖 至少\", two Han words parted by a space", zh.includes("大奖：至少 TZS 1,000,000") && !/大奖 至少/.test(zh), zh);
}

// L7 · a time as §T5 sets a numeral (the lead's ruling, 2026-10-21): the weekday in the body face, the clock `.mono`, one run.
const TIME_RUN = /<span class="whitespace-nowrap">([^<]+) <span class="mono">(\d{2}:\d{2})<\/span><\/span>/;
const timeDefects = (l: L, state: string) => {
  const WEEKDAY: Record<L, string> = { en: "Friday", sw: "Ijumaa", zh: "周五" };
  const m = TIME_RUN.exec(state);
  return m && m[1] === WEEKDAY[l] && m[2] === "18:00" && !/font-mono|tabular-nums">[^<]*\d/.test(state) ? [] : [`${l}: ${m?.[0] ?? state.slice(0, 160)}`];
};
{
  const wrong = LOCALES.flatMap((l) => timeDefects(l, stateOf(card(l, "open · no ticket"))));
  ok("1.8 · L7 · the close is set as §T5 sets a numeral — the weekday in the sentence's face, the clock \"18:00\" a `.mono` numeral (JetBrains Mono, tabular), the whole run never parted (\"Ijumaa 18:00\"); it was one mono run, weekday and all",
    wrong.length === 0, wrong.join(" | "));
  ok("1.8′ PLANT · the old all-mono run, and an all-body-face one, are both reported",
    timeDefects("en", '<span class="whitespace-nowrap font-mono">Friday 18:00</span>').length > 0 && timeDefects("en", '<span class="whitespace-nowrap tabular-nums">Friday 18:00</span>').length > 0);
}
/** An instant's run (`doorTime`, `doorDay`): one unparted run whose every number is a `.mono` numeral and whose words are not. */
const instantDefects = (state: string) => {
  // the run that holds a numeral (a kept phrase is a nowrap run too: "Matokeo 15 kati ya 15 yametolewa")
  const at = state.search(/<span class="whitespace-nowrap">[^<]*<span class="mono">/);
  const run = at < 0 ? "" : elementAt(state.slice(at), 'class="whitespace-nowrap"');
  if (run === "") return ["no instant run"];
  const d: string[] = [];
  const monos = [...run.matchAll(/<span class="mono">([^<]*)<\/span>/g)].map((m) => m[1]);
  // S5 integration (2026-10-21): a count of a total is one numeral run too ("15/15" in HUB's zh resultsOut, as "10/10"),
  // which keepFact's numeralRuns sets as one `.mono` token — digits, a clock's colon or a count's slash, never a word.
  if (monos.length === 0 || monos.some((x) => !/^[\d:/]+$/.test(x))) d.push(`numerals ${j(monos)}`);
  if (/\d/.test(textOf(run.replace(/<span class="mono">[^<]*<\/span>/g, "")))) d.push(`a number in the body face: "${textOf(run)}"`);
  return d;
};

// L8 · paused says what is paused; L9 · the register's won words; L10 · the presale's date.
{
  const WANT: Record<L, string> = { en: "Sales paused for now", sw: "Mauzo yamesimamishwa kwa muda", zh: "暂时停售" };
  const paused = LOCALES.filter((l) => textOf(stateOf(card(l, "paused"))) !== WANT[l]);
  ok("1.9 · L8 · paused says what is paused: \"Sales paused for now\" / \"Mauzo yamesimamishwa kwa muda\" / \"暂时停售\"", paused.length === 0, j(LOCALES.map((l) => textOf(stateOf(card(l, "paused"))))));
  const won = LOCALES.filter((l) => textOf(stateOf(card(l, "settled · 3"))) !== fill(dict[l].millionea.regWon, { n: 3 }) || textOf(stateOf(card(l, "settled · 1"))) !== dict[l].millionea.regWonOne);
  ok("1.10 · L9 · a won week says the register's words (\"3 tickets won\", \"1 ticket won\") — the title names the week, so the line never repeats it in R9's retired colon grammar", won.length === 0, j(LOCALES.map((l) => textOf(stateOf(card(l, "settled · 3"))))));
  const DATE: Record<L, string> = { en: "Opens Monday 23 Nov", sw: `Inafunguliwa Jumatatu 23 ${dict.sw.common.monthsShort[10]}`, zh: "周一 2026年11月23日开放" };
  const presale = LOCALES.filter((l) => textOf(stateOf(card(l, "presale"))) !== DATE[l]);
  ok("1.11 · L10 · the presale names the day AND its date (the next open is always within seven days: a bare \"Opens Monday\" read on a Monday could mean today)", presale.length === 0, j(LOCALES.map((l) => textOf(stateOf(card(l, "presale"))))));
  const faces = LOCALES.flatMap((l) => HOSTS.flatMap((h) => ["presale", "open · no ticket", "closed · 15 of 15, objection"].flatMap((n) => instantDefects(stateOf(card(l, n, h))).map((x) => `${l} ${h} ${n}: ${x}`))));
  ok("1.11′ · L10 · §T5 · every instant the card prints is one unparted run, its numbers `.mono` numerals and its words the sentence's — the presale's date as the close's time (the lead's ruling): \"Monday 23 Nov\" with \"23\" a numeral, zh \"周一 2026年11月23日\" with 2026, 11 and 23",
    faces.length === 0, faces.slice(0, 3).join(" | "));
}

// L11 · its name is the title and the figure; its description the rest.
const nameDefects = (l: L, m: string) => {
  const d: string[] = [];
  const by = /aria-labelledby="([^"]*)"/.exec(m)?.[1]?.split(" ") ?? [];
  const desc = /aria-describedby="([^"]*)"/.exec(m)?.[1]?.split(" ") ?? [];
  const textById = (id: string) => textOf(elementAt(m, `id="${id}"`));
  for (const id of [...by, ...desc]) if (!m.includes(`id="${id}"`)) d.push(`${id} names nothing`);
  const name = by.map(textById).join(" ");
  const want = `${dict[l].millionea.productLabel} · ${fill(dict[l].millionea.week, { week: 47 })} ${fill(dict[l].millionea.ruleWithFigure.split(" · ")[0], { amount: formatTzs(1_000_000) })}`;
  if (name !== want) d.push(`name "${name}" ≠ "${want}"`);
  if (!desc.includes("mln-card-state") || desc.length < 3) d.push(`description ${j(desc)}`);
  return d;
};
{
  const d = LOCALES.flatMap((l) => nameDefects(l, card(l, "open · no ticket")).map((x) => `${l}: ${x}`));
  const voidName = LOCALES.filter((l) => /aria-labelledby="mln-card-title"/.test(card(l, "voiding")) === false);
  ok("1.12 · L11 · the link's name is its title and its figure (\"Millionea · Week 47 Jackpot TZS 1,000,000\"), its description the rest — every id it names is drawn; a void's name is its title alone", d.length === 0 && voidName.length === 0, d.join(" | "));
}
/** A figure not read names nothing: the name is the title alone, the dash read first in the description. */
const dashNameDefects = (m: string) => {
  const by = /aria-labelledby="([^"]*)"/.exec(m)?.[1], desc = /aria-describedby="([^"]*)"/.exec(m)?.[1]?.split(" ") ?? [];
  return by === "mln-card-title" && desc[0] === "mln-card-figure" && desc.includes("mln-card-state") && m.includes('id="mln-card-figure"') ? [] : [`${by} / ${j(desc)}`];
};
{
  const d = LOCALES.flatMap((l) => HOSTS.flatMap((h) => ["presale", "paused"].flatMap((n) => dashNameDefects(card(l, n, h)).map((x) => `${l} ${h} ${n}: ${x}`))));
  ok("1.12′ · L11 · a figure not read names nothing: before sales and while paused the link's name is its title alone (\"Millionea · Week 48\", never \"… Jackpot —\") and the dash is read first in its description", d.length === 0, d.join(" | "));
}

// L12 · the preview's chip, only at STAFF_PREVIEW.
{
  const chip = (m: string) => elementAt(m, 'id="mln-card-preview"');
  const wrong = LOCALES.filter((l) => !chip(card(l, "open · staff")).includes('data-g="eye.') || !textOf(chip(card(l, "open · staff"))).includes(dict[l].millionea.previewChip)
    || chip(card(l, "open · no ticket")) !== "" || !/data-kit-chip-variant="info"/.test(chip(card(l, "open · staff"))));
  ok("1.13 · L12 · at STAFF_PREVIEW the title row carries the info chip with the eye and \"Preview\" (as every Millionea page is marked); never otherwise", wrong.length === 0, j(wrong));
}

// P6 · where the week stands after its results — the one phase every surface says (`millioneaWeekPhase`): the objection
// window and its end while it runs, then "Settling"; nothing more while results still come in.
{
  const when = (l: L) => fill(dict[l].millionea.checkWindowUntil, { when: `${dict[l].millionea.weekdays[4]} 09:00` });
  const window = LOCALES.filter((l) => textOf(stateOf(card(l, "closed · 15 of 15, objection"))) !== `${fill(dict[l].millionea.resultsOut, { n: 15 })} · ${when(l)}`);
  const settling = LOCALES.filter((l) => textOf(stateOf(card(l, "closed · 15 of 15, settling"))) !== `${fill(dict[l].millionea.resultsOut, { n: 15 })} · ${dict[l].millionea.weekStatusSettling}`);
  // While results arrive: "Sales closed" (the hub's own `salesClosedAt` words) and the count — two lines, as the open card's.
  const none = LOCALES.filter((l) => textOf(stateOf(card(l, "closed · 6"))) !== `${dict[l].millionea.salesClosedAt.split(" · ")[0]} · ${fill(dict[l].millionea.resultsOut, { n: 6 })}`);
  const words: Record<L, [string, string]> = { en: ["Objection window until", "Settling"], sw: ["Dirisha la pingamizi hadi", "Inakamilishwa"], zh: ["异议窗口至", "待结算"] };
  const ruled = LOCALES.filter((l) => !dict[l].millionea.checkWindowUntil.startsWith(words[l][0]) || dict[l].millionea.weekStatusSettling !== words[l][1]);
  ok("1.14 · P6 · after every result is in, the card says where the week stands — \"Objection window until Friday 09:00\" while it runs, then \"Settling\" (the lead's words; `millioneaWeekPhase`/`weekPhaseWord`, the hub's one answer) — and only the count while results still come in",
    window.length === 0 && settling.length === 0 && none.length === 0 && ruled.length === 0, j({ window, settling, none, ruled }));
  // CONTROL: the card as the critic read it — "15 of 15 results in", then nothing — fails the same comparison.
  const before = stateOf(card("en", "closed · 15 of 15, objection")).replace(/<span class="sr-only"> · <\/span><\/span><span class="kp-mln-fact">[\s\S]*?<\/span><\/span><\/span>$/, "</span></span>");
  ok("1.14′ PLANT · the closed card's old line (\"15 of 15 results in\" and nothing after it) is reported", textOf(before) === fill(dict.en.millionea.resultsOut, { n: 15 }) && textOf(before) !== `${fill(dict.en.millionea.resultsOut, { n: 15 })} · ${when("en")}`);
}

// L2 · each host's box; one hover; no gold anywhere.
{
  const box = (m: string) => /^<a[^>]*class="([^"]*)"/.exec(m)?.[1] ?? "";
  const journey = LOCALES.every((l) => FX.cards[l].journey.every((m) => box(m) === "kp-mln-zh kp-mln-door kp-mln-door--journey"));
  const board = LOCALES.every((l) => FX.cards[l].board.every((m) => box(m) === "kp-mln-zh kp-mln-door kp-mln-door--board mat-raised"));
  ok("1.15 · L2 · on the journey home the door is the How-to card's flat box (`--journey`), on the board the market cards' raised one (`--board` + `mat-raised`) — in every state", journey && board, j([box(card("en", "open · no ticket")), box(card("en", "open · no ticket", "board"))]));
  const GOLD = /\bgilt-(?:ink|metal)\b|\bbtn-gold\b|data-kit-chip-variant="gold"|var\(--gilt\b|\b(?:text|bg|border)-gold\b/;
  const gold = LOCALES.flatMap((l) => HOSTS.flatMap((h) => FX.cards[l][h].filter((m) => GOLD.test(m)).map((_, i) => `${l} ${h} ${i}`)));
  ok("1.16 · §M8a item 7 · no gold in any state of the card, drawn — the figure, the plate and the chip are unearned", gold.length === 0, j(gold));
  const anatomy = LOCALES.flatMap((l) => HOSTS.flatMap((h) => FX.cards[l][h].filter((m) => count(m, "kp-mln-door__plate") !== 1 || count(m, "kp-mln-door__head") !== 1 || count(m, "kp-mln-door__state") !== 1 || count(m, "kp-mln-door__chev") !== 1).map((_, i) => `${l} ${h} ${i}`)));
  ok("1.17 · M1 · one anatomy in every state: one plate, one head, one state list and one chevron — the door's grid places them", anatomy.length === 0, j(anatomy));
}

// The tile read of 2026-10-21: every state line opens as a sentence opens; a figure not read is the hub's quiet dash; the
// final week's line never ends on a connective.
const openingDefects = (l: L, m: string) => {
  const first = textOf(elementAt(stateOf(m), 'class="kp-mln-fact"')).trim();
  return l === "zh" || /^[\p{Lu}\d]/u.test(first) ? [] : [`${l}: "${first}"`];
};
const dashDefects = (m: string) => {
  const fig = elementAt(m, 'id="mln-card-figure"');
  return fig.includes('<span class="amount text-body-lg text-text-muted">—</span>') && !/font-semibold|text-text"/.test(fig) ? [] : [fig.slice(0, 200)];
};
const finalDefects = (l: L, m: string) => {
  const fin = elementAt(headOf(m), 'id="mln-card-final"'), line = dict[l].millionea.finalWeek;
  const tail = line.split(" ").slice(-2).join(" ");
  return textOf(fin) === line && (l === "zh" || fin.includes(`<span class="whitespace-nowrap">${tail}</span>`)) ? [] : [`${l}: ${fin.slice(0, 200)}`];
};
{
  const lower = LOCALES.flatMap((l) => HOSTS.flatMap((h) => FX.cards[l][h].flatMap((m, i) => openingDefects(l, m).map((x) => `${h} ${STATES[i].name} ${x}`))));
  const words = LOCALES.filter((l) => dict[l].millionea.weekRolledShort.toLowerCase() !== dict[l].millionea.settledRollover.toLowerCase()
    || textOf(stateOf(card(l, "settled · no 10/10"))) !== fill(dict[l].millionea.weekRolledShort, { amount: formatTzs(601_000) }));
  ok("1.18 · every state line opens as a sentence opens, in every state on both hosts (en, sw): a week nobody won reads \"No 10/10 · TZS 601,000 carried forward\" / \"Hakuna 10/10 · …\" — the hub's own words (\"Week 46 · no 10/10 · …\"), never \"no 10/10\" opening the line",
    lower.length === 0 && words.length === 0, j({ lower: lower.slice(0, 4), words }));
  const loud = LOCALES.flatMap((l) => HOSTS.flatMap((h) => ["presale", "paused"].flatMap((n) => dashDefects(card(l, n, h)).map((x) => `${l} ${h} ${n}: ${x}`))));
  const figures = LOCALES.filter((l) => !elementAt(card(l, "open · no ticket"), 'id="mln-card-figure"').includes('<span class="amount text-body-lg font-semibold text-text">'));
  ok("1.19 · a figure not read (before sales, while paused) is the house's dash at the figure's rung (no line moves), in the muted ink and regular weight the hub's pool block gives it — never the line's heaviest mark; CONTROL: a figure read keeps its semibold text ink",
    loud.length === 0 && figures.length === 0, loud.slice(0, 2).join(" | ") + j(figures));
  const loose = LOCALES.flatMap((l) => HOSTS.flatMap((h) => finalDefects(l, card(l, "open · at the cap in the final", h))));
  ok("1.20 · the final week's line keeps its last two words together, as every fact on the card is kept (\"Wiki ya mwisho\" / \"ya Millionea\" at 320 — it broke \"Wiki ya mwisho ya\" / \"Millionea\", a line ending on a connective)",
    loose.length === 0, loose.slice(0, 2).join(" | "));
}

// The lead's zh spacing ruling (2026-10-21): Millionea's zh convention — a space only where a Latin letter or a digit meets a
// Han character — on everything the card prints, and in the three templates a weekday-and-clock fills (`eatWeekdayClock`
// opens with a Han weekday in zh): "异议窗口至周五 09:00", never "至 周五", two Han words parted by a space (L5's class).
const HAN_GAP = /[㐀-䶿一-鿿] [㐀-䶿一-鿿]/u;
const hanGapDefects = (text: string) => { const hit = HAN_GAP.exec(text); return hit ? [`"…${text.slice(Math.max(0, hit.index - 6), hit.index + 9)}…"`] : []; };
const WHEN_KEYS = ["checkWindowUntil", "nextEvent", "eventAt"] as const;
const whenLines = (l: L, m = dict[l].millionea as Record<string, string>) => WHEN_KEYS.map((k) => fill(m[k], { when: `${dict[l].millionea.weekdays[4]} 09:00` }));
const whenDefects = (l: L, lines: readonly string[]) => {
  const day = `${dict[l].millionea.weekdays[4]} 09:00`;
  // zh: the weekday sits against the word before it; en and sw: a word, a space, the weekday — the line's own spacing.
  return lines.filter((s) => (l === "zh" ? hanGapDefects(s).length > 0 || !s.includes(day) : !s.includes(` ${day}`)));
};
{
  const printed = HOSTS.flatMap((h) => FX.cards.zh[h].flatMap((m, i) => hanGapDefects(textOf(m)).map((x) => `${h} ${STATES[i].name}: ${x}`)));
  const filled = LOCALES.flatMap((l) => whenDefects(l, whenLines(l)).map((x) => `${l}: ${x}`));
  const window = textOf(stateOf(card("zh", "closed · 15 of 15, objection")));
  ok("1.21 · zh spacing (the lead's ruling): nothing the card prints in zh, in any state on either host, parts two Han characters with a space — the objection window reads \"异议窗口至周五 09:00\" — and the three weekday-clock templates filled in all three languages keep their own spacing (zh \"下一事件周五 09:00\", \"事件周五 09:00\"; en \"until Friday 09:00\"; sw \"hadi Ijumaa 09:00\")",
    printed.length === 0 && filled.length === 0 && window.includes("异议窗口至周五 09:00"), j({ printed: printed.slice(0, 3), filled, window }));
}

// §T5 (the lead's ruling of 2026-10-21): every numeral in a fact line is set as a numeral — a count, "13%", "10/10", a week's
// number, a date's, a clock: `.mono`, money `.amount` — none left in the body face, nothing set twice; the display-face title
// keeps its own face. Set once, in maswali-facts.tsx (`numeralRuns`, `keepFact`, `MaswaliFacts`).
/** The markup with every `.mono` and `.amount` element taken out whole (balanced). */
const withoutSetFaces = (m: string) => {
  let s = m;
  for (const marker of ['class="mono"', 'class="amount']) for (let e = elementAt(s, marker); e !== ""; e = elementAt(s, marker)) s = s.replace(e, "");
  return s;
};
const numeralDefects = (m: string) => {
  const d: string[] = [];
  for (const [name, part] of [["rule", ruleOf(m)], ["state", stateOf(m)]] as const) {
    const hit = /\S*\d\S*/.exec(textOf(withoutSetFaces(part)));
    if (hit) d.push(`${name}: "${hit[0]}" in the body face`);
  }
  if (/class="mono"/.test(elementAt(m, 'class="kp-mln-door__title"'))) d.push("the display-face title set a numeral .mono");
  for (const marker of ['class="mono"', 'class="amount']) {
    let s = m;
    for (let e = elementAt(s, marker); e !== ""; e = elementAt(s, marker)) {
      if (/class="(?:mono|amount)/.test(e.slice(e.indexOf(">") + 1))) d.push(`a face set twice: ${e.slice(0, 90)}`);
      s = s.replace(e, "");
    }
  }
  return d;
};
const { numeralRuns } = createRequire(import.meta.url)("../src/components/maswali/maswali-facts.tsx") as { numeralRuns: (s: string) => unknown[] };
const runsOf = (s: string) => numeralRuns(s).map((n) => {
  if (typeof n === "string") return n;
  const p = (n as { props: { className: string; children: string } }).props;
  return `[${p.className}:${p.children}]`;
}).join("");
{
  const d = LOCALES.flatMap((l) => HOSTS.flatMap((h) => FX.cards[l][h].flatMap((m, i) => numeralDefects(m).map((x) => `${l} ${h} ${STATES[i].name}: ${x}`))));
  const g = LOCALES.flatMap((l) => HOSTS.flatMap((h) => numeralDefects(FX.ghost[l][h]).map((x) => `ghost ${l} ${h}: ${x}`)));
  ok("1.22 · §T5 (the lead's ruling) · every numeral in the card's fact lines — every state, both hosts, three languages, and its loading picture — is set as a numeral: \"3 kati ya 10\", \"13%\", \"10/10\", \"Wiki 46\", \"23 Nov\", \"18:00\" `.mono`, money `.amount`; none left in the body face, no face set twice, and the display-face title keeps its own (\"Wiki 47\")",
    d.length === 0 && g.length === 0, [...d, ...g].slice(0, 4).join(" | "));
  const SAMPLE = "fifa2026 3x A1–A5 10/10 13% 18:00 第49周 2026年11月23日 1,000. TZS 601,000";
  const WANT = "fifa2026 3x [mono:A1]–[mono:A5] [mono:10/10] [mono:13%] [mono:18:00] 第[mono:49]周 [mono:2026]年[mono:11]月[mono:23]日 [mono:1,000]. [amount:TZS 601,000]";
  ok("1.23 · what a numeral is (`numeralRuns`): digits with their own separators (\"10/10\", \"13%\", \"18:00\", \"1,000\") and an identifier's capital (\"A1\") — in Chinese too (第49周, 2026年11月23日) — never digits inside a Latin word (\"fifa2026\", \"3x\"); a money figure `.amount` whole, read first",
    runsOf(SAMPLE) === WANT, runsOf(SAMPLE));
}

// ── §2 · the ghost ────────────────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§2 · the card's loading picture (H1)");
/** 2.3's check — what a ghost leaves readable — set in §2 and run again by its plant in §4. */
let hiddenDefects: (g: string, l?: L) => string[] = () => ["unset"];
/** The common card set at the ghost's own sizes — week 49, TZS 1,000,000, 13%, Friday 18:00, TZS 1,000 — for comparison. */
const req = createRequire(import.meta.url);
const { MaswaliHomeCard } = req("../src/components/maswali/maswali-home-card.tsx") as { MaswaliHomeCard: (p: Record<string, unknown>) => unknown };
const React = req("react") as typeof import("react");
const twin = (l: L, host: DoorHost) => inApp(l, React.createElement(MaswaliHomeCard as never, {
  t: dict[l], locale: l, week: 49, jackpot: 1_000_000, pct: 13, cap: 10, host,
  state: { kind: "open", closesAt: Date.parse("2026-11-20T18:00:00+03:00"), held: null, price: 1_000 },
} as never));
/** The layout skeleton of a door: its elements' tags and layout classes, in order (words, ids, links and ink aside; the
 *  plate is its 48px box — the card's carries the mark inside, the ghost's is the bar's plate). */
const LAYOUT = /^(?:kp-mln-door\S*|kp-mln-facts\S*|kp-mln-fact|kp-mln-zh|mat-raised|amount|mono|text-body-\S+|font-(?:display|semibold)|whitespace-nowrap|tabular-nums|sr-only)$/;
const skeleton = (m: string) => [...m.replace(/(class="[^"]*kp-mln-door__plate[^"]*"[^>]*>)<svg[\s\S]*?<\/svg>/, "$1").matchAll(/<(\w+)([^>]*)>/g)].map(([, tag, attrs]) => {
  const cls = (/class="([^"]*)"/.exec(attrs)?.[1] ?? "").split(" ").filter((c) => LAYOUT.test(c)).join(".");
  return tag === "a" || tag === "div" ? `box.${cls}` : `${tag}.${cls}`;
}).filter((s) => !/^(?:span|use)\.$/.test(s)).join(" ");
{
  const words = LOCALES.flatMap((l) => HOSTS.flatMap((h) => {
    const g = FX.ghost[l][h], c = twin(l, h);
    const gRule = textOf(ruleOf(g)), cRule = textOf(ruleOf(c)), gState = textOf(stateOf(g)), cState = textOf(stateOf(c)), gHead = textOf(headOf(g)), cHead = textOf(headOf(c));
    return gRule === cRule && gState === cState && gHead === cHead ? [] : [`${l} ${h}: ${j({ gRule, cRule, gState, cState, gHead, cHead })}`];
  }));
  ok("2.1 · H1 · the ghost sets the common card's own words in the reader's language — its title, the R-HEADLINE's three facts and the state's two lines, character for character — so they wrap where the card's wrap",
    words.length === 0, words.slice(0, 1).join(" | "));
  const shapes = LOCALES.flatMap((l) => HOSTS.flatMap((h) => {
    const g = skeleton(FX.ghost[l][h].replace(/ kp-mln-ghost__\w+| kp-mln-ghost\b| kp-shimmer-track| kp-jhome-ghost__plate/g, "")), c = skeleton(twin(l, h));
    return g.replace(/span\.(?=\s|$)/g, "") === c.replace(/span\.(?=\s|$)/g, "") ? [] : [`${l} ${h}`];
  }));
  ok("2.2 · H1 · the ghost is the card's anatomy, element for element: the same door grid and host box, the 48px plate's slot, the title's facts, both phone-stacked fact lists, the figure's rung and the 20px chevron", shapes.length === 0, j(shapes));
  hiddenDefects = (g: string, l: L = "en") => {
    const d: string[] = [];
    if (!/^<div aria-hidden="true" class="kp-mln-zh kp-mln-ghost kp-shimmer-track kp-mln-door kp-mln-door--/.test(g)) d.push("the root is not an aria-hidden ghost of the door");
    if (/\sid="|<a\s/.test(g)) d.push("an id or a link");
    // every text run but the name sits inside a hidden span: each hidden element removed whole (balanced), the name alone is left
    let bare = g;
    for (let hidden = elementAt(bare, 'class="kp-mln-ghost__words"'); hidden !== ""; hidden = elementAt(bare, 'class="kp-mln-ghost__words"')) bare = bare.replace(hidden, "");
    bare = bare.replace(/<span class="sr-only"> · <\/span>/g, "");
    const shown = textOf(bare).trim();
    if (shown === "") d.push("the name is not drawn (a ghost draws names in words, as the How-to card's ghost draws its title)");
    else if (shown !== dict[l].millionea.productLabel) d.push(`words not hidden: "${shown.slice(0, 40)}"`);
    if (!g.includes('data-ghost-part="millionea"')) d.push("no ghost part mark");
    return d;
  };
  const hidden = LOCALES.flatMap((l) => HOSTS.flatMap((h) => hiddenDefects(FX.ghost[l][h], l).map((x) => `${l} ${h}: ${x}`)));
  ok("2.3 · H1 · every word of the ghost but its name is hidden (`.kp-mln-ghost__words`: nothing to read, find or copy) — \"Millionea\" drawn in words, as the How-to card's ghost draws its title, the week a bar — the root aria-hidden and marked for the drive, no id and no link", hidden.length === 0, hidden.join(" | "));
  const journey = LOCALES.filter((l) => {
    const s = FX.journeyGhost[l].slot, n = FX.journeyGhost[l].none;
    const at = s.indexOf('data-ghost-part="millionea"'), head = s.indexOf('data-ghost-part="headline"'), chips = s.indexOf('data-ghost-part="chips"');
    return !(count(s, 'data-ghost-part="millionea"') === 1 && head < at && at < chips && s.includes("kp-mln-door--journey") && !n.includes("kp-mln-door") && count(FX.journeyGhost[l].preview, 'data-kit-chip=""') === 1);
  });
  ok("2.4 · H1 · the journey home's ghost holds the card's slot after the head and before the chips when told the card is offered (the How-to card's box), the preview chip's place at STAFF_PREVIEW — and none when not", journey.length === 0, j(journey));
  const board = LOCALES.filter((l) => {
    const s = FX.marketsGhost[l].slot, n = FX.marketsGhost[l].none;
    const at = s.indexOf('data-ghost-part="millionea"'), header = s.indexOf("eyebrow text-text-subtle"), search = s.indexOf("search-box-wrap kp-markets-search");
    return !(count(s, 'data-ghost-part="millionea"') === 1 && header < at && at < search && /class="[^"]*kp-mln-door--board mat-raised mb-3"/.test(s) && !n.includes("kp-mln-door"));
  });
  ok("2.5 · H1 · the board's ghost holds the slot between its header row and the search, with the page's mb-3 (it reserved none: the search, bar and grid dropped by the card's height + 16px) — and none when not", board.length === 0, j(board));
  const loading = squash(code("src/app/markets/loading.tsx")), page = squash(code("src/app/page.tsx"));
  // Round 2 (the dark-safety blocker): the door's answers handed only while true — §5 runs the file for every reader.
  const gate = loading.includes("const millionea = await millioneaCardShown(); const preview = millionea && (await millioneaDoor()).preview; return <MarketsGhost {...(millionea ? { millionea: true as const, ...(preview ? { preview: true as const } : {}) } : {})} />;")
    && page.includes("const millionea = await millioneaCardShown(); const { preview } = await millioneaDoor();")
    && squash(code("src/lib/server/millionea-doors.ts")).includes("export const millioneaCardShown = cache(async (): Promise<boolean> => { const door = await millioneaDoor(); if (!door.visible) return false;");
  ok("2.6 · H1 · the slot is drawn on the door's own answer — the card is offered (`millioneaCardShown`: visible to the reader and no break) — by /markets' loading and `/`'s fallback, so a hidden Millionea (WITHDRAWN) holds no slot", gate);
  // Round 2: the root loading's picture of "/" (`app/loading.tsx` → `JourneyRouteGhost`, D6) is the journey home's ghost
  // itself — with the reader's locale (`useT`), so its slot's kept runs wrap as the card's — told or not told Millionea.
  const route = LOCALES.filter((l) => FX.routeGhost[l].slot !== FX.journeyGhost[l].slot || FX.routeGhost[l].none !== FX.journeyGhost[l].none);
  const boardPreview = LOCALES.filter((l) => count(FX.marketsGhost[l].preview, 'data-kit-chip=""') !== 1 || count(FX.marketsGhost[l].slot, 'data-kit-chip=""') !== 0);
  ok("2.7 · H1 · D6's path: the root loading's \"/\" (the route ghost) draws, byte for byte, the journey home's ghost in the reader's language — its slot when told Millionea is visible, none when not; and the board's ghost holds the preview chip's place at STAFF_PREVIEW only",
    route.length === 0 && boardPreview.length === 0, j({ route, boardPreview }));
}

// ── §3 · the stylesheet ───────────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§3 · the door's stylesheet");
const CSS = squash(read("src/app/globals.css"));
const cssDefects = (css: string) => {
  const d: string[] = [];
  if (!css.includes('.kp-mln-door { display: grid; grid-template-columns: 48px minmax(0, 1fr) auto; grid-template-areas: "plate head chev" "rule rule rule" "state state state"; column-gap: 14px; align-items: center;')) d.push("below 768: not the head row of three over the full-width body");
  if (!css.includes('@media (min-width: 768px) { .kp-mln-door { grid-template-areas: "plate head chev" ". rule ." ". state ."; } }')) d.push("from 768: the body does not stand under the title");
  if (!/@media \(min-width: 1280px\) \{ \.kp-mln-door \{ grid-template-columns: 48px max-content minmax\(0, 1fr\) max-content auto; grid-template-areas: "plate head rule state chev"; \}/.test(css)) d.push("from 1280: not one row");
  if (!css.includes(".kp-mln-door--journey { padding: var(--sp-3) 14px var(--sp-3) var(--sp-3); border: 1px solid var(--border); background: var(--bg-elevated); transition: border-color var(--t-quick) linear; }")) d.push("the journey box is not the How-to card's");
  if (!css.includes(".kp-mln-door--board { padding: var(--sp-3); transition: translate var(--t-base) var(--m-glide), border-color var(--t-base) var(--m-glide), box-shadow var(--t-base) var(--m-glide); } @media (min-width: 640px) { .kp-mln-door--board { padding-inline: var(--sp-4); } }")) d.push("the board box's inset or motion is not the market card's");
  // M5 + the motion critic's L5: each host's own hover, pointer-only; the ghost never hovers.
  if (!css.includes("@media (hover: hover) { .kp-mln-door--journey:not(.kp-mln-ghost):hover { border-color: var(--border-royal); } .kp-mln-door--board:not(.kp-mln-ghost):hover { translate: 0 var(--m-lift); border-color: var(--brand-500); box-shadow: 0 0 0 1px var(--brand-500), var(--elev-raised-hover); } }")) d.push("not each host's hover (journey: the How-to card's royal border; board: the market cards' lift and brand ring)");
  if (!css.includes(".mcardp:hover { translate: 0 var(--m-lift); border-color: var(--brand-500); box-shadow: 0 0 0 1px var(--brand-500), var(--elev-raised-hover); }")) d.push("the board's own card hover moved: re-read it before matching it");
  if (!css.includes(".kp-mln-ghost__words, .kp-mln-ghost .kp-mln-fact::before { visibility: hidden; }") || !css.includes(".kp-mln-ghost__bar { border-radius: var(--r-xs); background: var(--bg-overlay); -webkit-box-decoration-break: clone; box-decoration-break: clone; }")) d.push("the ghost's words and its facts' marks are not hidden over line bars");
  if (!css.includes("@media (max-width: 767.98px) { .kp-mln-door .kp-mln-facts--phone > .kp-mln-fact { padding-inline-start: 1em; text-indent: -1em; } }")) d.push("below 768 a wrapped fact's continuation does not hang (it reads as a fact of its own)");
  // Round 2: the preview chip under the title at every width, so it never widens the one-row card's title column.
  if (!css.includes(".kp-mln-door__title { display: flex; flex-direction: column; align-items: flex-start; gap: var(--sp-1); min-width: 0; }")) d.push("the preview chip does not stand under the title (beside it, the one-row card's headline took a third line)");
  return d;
};
{
  const d = cssDefects(CSS);
  ok("3.1 · M1 L1 L2 M5 H1 · the door's one anatomy — a head row of three over a full-width body below 768 (a wrapped fact's continuation hanging one em in), the body under the title from 768, one row from 1280 — each host's box and its host's hover (the How-to card's royal border; the board cards' lift and brand ring), and the ghost's hidden words and marks over line bars", d.length === 0, d.join(" | "));
}
// The card's model is CLIENT-FREE (its own doc; `/`'s first load, test:journey-home 7.client): no module it reaches by a
// static import that is not type-only is a client module. It asked the week's phase of `millionea-view.ts`, whose Seal Line
// import (`sealLineOf`, a value from the component file) brought GlyphSwap and MaswaliCarry into `/` (commit 2, 03be29842);
// the phase now has a pure home, `millionea-phase.ts`, which that joint re-exports.
const resolveSpec = (from: string, spec: string): string | null => {
  const base = spec.startsWith("@/") ? `src/${spec.slice(2)}` : spec.startsWith(".") ? join(dirname(from), spec).replaceAll("\\", "/") : null;
  if (base === null) return null;
  for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    const p = base + ext, abs = join(ROOT, p);
    if (existsSync(abs) && statSync(abs).isFile()) return p;
  }
  return null;
};
const clientReach = (start: string, source: (rel: string) => string = read) => {
  const seen = new Set([start]), queue = [start], client: string[] = [];
  while (queue.length > 0) {
    const f = queue.shift()!, src = source(f);
    if (/^(?:\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*["']use client["']/.test(src)) client.push(f);
    for (const m of src.matchAll(/^\s*(?:import|export)\s+(?!type\b)[^;]*?\sfrom\s+["']([^"']+)["']/gm)) {
      const r = resolveSpec(f, m[1]);
      if (r !== null && !seen.has(r)) { seen.add(r); queue.push(r); }
    }
  }
  return { client, reached: seen.size };
};
const MODEL = "src/components/maswali/maswali-card-model.ts";
{
  const { client, reached } = clientReach(MODEL);
  ok(`3.2 · the card's model reaches no client module (${reached} modules by static import, type-only ones aside) — the week's phase from its pure home, \`millionea-phase.ts\`, never \`millionea-view.ts\`, whose Seal Line import carried GlyphSwap and MaswaliCarry into \`/\``,
    client.length === 0 && reached > 3 && read(MODEL).includes('from "@/app/millionea/millionea-phase"'), j(client));
}

// ── §4 · controls ─────────────────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§4 · controls — each check fails on a planted copy");
{
  const m = card("en", "open · carry");
  // The carry's fact (`mln-card-h1`, right after the figure) moved after the fee's (`mln-card-h3`): the order 4b3a2b1 fixed.
  const carryFact = elementAt(m, 'id="mln-card-h1"'), withoutCarry = m.replace(carryFact, ""), feeFact = elementAt(withoutCarry, 'id="mln-card-h3"');
  const after = carryFact && feeFact ? withoutCarry.replace(feeFact, feeFact + carryFact) : m;
  ok("4.1 · the carry moved after the fee is reported (M2)", after !== m && orderDefects("en", after).length > 0);
  ok("4.2 · a hand-typed plate tint is reported (M4)", plateDefects(card("en", "open · no ticket").replace('style="width:48px;height:48px"', 'style="width:48px;height:48px;background:var(--bg-overlay)"')).length > 0);
  ok("4.3 · the zh tickets line as it was (\"您本周的彩票：3/10\") is caught by its own check's pattern", /\b3\/10\b/.test("您本周的彩票：3/10"));
  ok("4.4 · a name that is not the title and the figure is reported (L11)", nameDefects("en", card("en", "open · no ticket").replace('aria-labelledby="mln-card-title mln-card-figure"', 'aria-labelledby="mln-card-title mln-card-state"')).length > 0);
  const g = FX.ghost.en.journey;
  ok("4.5 · a ghost whose words show is reported (H1: 2.3)", g.includes('<span class="kp-mln-ghost__words">')
    && hiddenDefects(g.replaceAll('<span class="kp-mln-ghost__words">', '<span class="shown">'), "en").some((x) => x.startsWith("words not hidden")));
  const nameBarred = g.replace(/(<span class="kp-mln-fact">)Millionea/, '$1<span class="kp-mln-ghost__bar"><span class="kp-mln-ghost__words">Millionea</span></span>');
  ok("4.5′ · a ghost that hides its name too (as first built) is reported (2.3)", nameBarred !== g && hiddenDefects(nameBarred, "en").some((x) => x.startsWith("the name is not drawn")));
  const t5 = card("sw", "open · no ticket");
  ok("4.15 · §T5 · a fact's numeral left in the body face (\"ada 13%\" as it was), the display-face title's number set .mono, and a numeral set twice are each reported (1.22)",
    numeralDefects(t5.replace('<span class="mono">13%</span>', "13%")).some((x) => x.includes('"13%" in the body face'))
      && numeralDefects(t5.replace('<span class="whitespace-nowrap">Wiki 47</span>', '<span class="whitespace-nowrap">Wiki <span class="mono">47</span></span>')).some((x) => x.includes("title"))
      && numeralDefects(t5.replace('<span class="mono">10/10</span>', '<span class="mono"><span class="mono">10/10</span></span>')).some((x) => x.includes("set twice")));
  // (the "10/10" is its own `.mono` run since the §T5 ruling, so the word before it is planted, not the phrase)
  const lowered = (l: L, word: string) => card(l, "settled · no 10/10").replace(`>${word} <`, `>${word.toLowerCase()} <`);
  ok("4.8 · the rollover opening on the hub's lower-case words is reported (1.18)",
    lowered("en", "No") !== card("en", "settled · no 10/10") && openingDefects("en", lowered("en", "No")).length > 0
      && lowered("sw", "Hakuna") !== card("sw", "settled · no 10/10") && openingDefects("sw", lowered("sw", "Hakuna")).length > 0);
  ok("4.9 · a figure not read drawn as the figure's white semibold bar is reported (1.19)",
    dashDefects(card("en", "presale").replace('class="amount text-body-lg text-text-muted"', 'class="amount text-body-lg font-semibold text-text"')).length > 0);
  ok("4.10 · a presale date in the body face, and a close's clock in it, are reported (1.11′)",
    instantDefects(stateOf(card("en", "presale")).replace('<span class="mono">23</span>', "23")).length > 0
      && instantDefects(stateOf(card("zh", "presale")).replace('<span class="mono">2026</span>', "2026")).length > 0
      && instantDefects(stateOf(card("en", "open · no ticket")).replace('<span class="mono">18:00</span>', "18:00")).length > 0);
  ok("4.11 · a dash in the name is reported (1.12′)", dashNameDefects(card("en", "presale").replace('aria-labelledby="mln-card-title"', 'aria-labelledby="mln-card-title mln-card-figure"')).length > 0);
  const spaced = { ...(dict.zh.millionea as Record<string, string>), checkWindowUntil: "异议窗口至 {when}", nextEvent: "下一事件 {when}", eventAt: "事件 {when}" };
  ok("4.13 · the zh space put back — in the printed objection window and in each template as it was — is reported (1.21)",
    hanGapDefects(textOf(stateOf(card("zh", "closed · 15 of 15, objection"))).replace("至周五", "至 周五")).length > 0
      && whenDefects("zh", whenLines("zh", spaced)).length === 3);
  const fin = card("sw", "open · at the cap in the final");
  ok("4.12 · the final week's line set plain (\"Wiki ya mwisho ya\" / \"Millionea\" free to break) is reported (1.20)",
    fin.includes('<span class="whitespace-nowrap">ya Millionea</span>') && finalDefects("sw", fin.replace('<span class="whitespace-nowrap">ya Millionea</span>', "ya Millionea")).length > 0);
  const viaView = clientReach(MODEL, (rel) => (rel === MODEL ? read(MODEL).replace('from "@/app/millionea/millionea-phase"', 'from "@/app/millionea/millionea-view"') : read(rel)));
  ok("4.14 · the card's model asking the phase of `millionea-view.ts` again (commit 2's import) is reported: it reaches the Seal Line's client marks (3.2)",
    viaView.client.includes("src/components/maswali/maswali-carry.tsx") && viaView.client.includes("src/components/ui/glyph-swap.tsx"));
  ok("4.6′ · the board door without the board's lift (the How-to card's border on both hosts, as first built) is reported (3.1)",
    cssDefects(CSS.replace(".kp-mln-door--board:not(.kp-mln-ghost):hover { translate: 0 var(--m-lift); border-color: var(--brand-500);", ".kp-mln-door--board:not(.kp-mln-ghost):hover { border-color: var(--border-royal);")).some((x) => x.includes("each host's hover")));
  ok("4.6 · the stylesheet without the full-width phone body, with the ghost's words visible, or without the hanging continuation, is reported (3.1)",
    cssDefects(CSS.replace('"plate head chev" "rule rule rule" "state state state"', '"plate head chev" "plate rule chev" "plate state chev"')).length > 0
      && cssDefects(CSS.replace(".kp-mln-ghost__words, .kp-mln-ghost .kp-mln-fact::before { visibility: hidden; }", ".kp-mln-ghost__words { color: transparent; }")).length > 0
      && cssDefects(CSS.replace("padding-inline-start: 1em; text-indent: -1em;", "padding-inline-start: 0;")).length > 0);
  ok("4.16 · the preview chip back beside the title (round 1's flex-wrap row) is reported (3.1)",
    cssDefects(CSS.replace(".kp-mln-door__title { display: flex; flex-direction: column; align-items: flex-start; gap: var(--sp-1); min-width: 0; }", ".kp-mln-door__title { display: flex; flex-wrap: wrap; align-items: center; gap: var(--sp-1) var(--sp-2); min-width: 0; }")).some((x) => x.includes("under the title")));
  const routeOff = { ...FX.routeGhost.en, slot: FX.routeGhost.en.slot.replace(/<div aria-hidden="true" class="kp-mln-zh kp-mln-ghost[\s\S]*?data-ghost-part="millionea">/, '<div data-ghost-part="other">') };
  ok("4.17 · a root loading \"/\" that differs from the journey home's ghost (its slot dropped) is reported (2.7)", routeOff.slot !== FX.journeyGhost.en.slot);
  const twinOff = skeleton(FX.ghost.en.board.replace("kp-mln-door__rule", "kp-mln-door__body"));
  ok("4.7 · a ghost whose anatomy drifts from the card's is reported (2.2)", twinOff.replace(/span\.(?=\s|$)/g, "") !== skeleton(twin("en", "board")).replace(/span\.(?=\s|$)/g, ""));
}

// ── §5 · the dark payload ─────────────────────────────────────────────────────────────────────────────────────────────
// ROUND 2'S BLOCKER (found by S5-FIX-PLATFORM, 2026-10-22): /markets' loading file handed its client drawing
// `millionea={millionea}` and `preview={…}` ALWAYS, so every visitor's board carried `"millionea":false` in its payload —
// the trace qa:live's dark section refuses at every rollout below ACTIVE, production's WITHDRAWN included. Next writes every
// prop handed to CLIENT code into the payload (a reference and its props); a server component's props never are (the server
// runs it and writes what it returns). So a Millionea answer crosses into client code only while it is true — D3's rule, the
// root loading file's shape — and that is held here twice: the two loading files RUN for each reader, and a census of every
// place in src that hands an answer, each classified by the side of the line it stands on.
console.log("\n§5 · the dark payload: a Millionea answer crosses into client code only while it is true (round 2's blocker)");
/** The rollout's answers a door is handed: Millionea visible to the reader, the reader on a break, its staff preview. */
const ANSWERS = new Set(["millionea", "millioneaOnBreak", "preview"]);
/** The request a loading file reads (r5h's world, stubbed): its address, the journey's answer, the doors' and the rollout's. */
const REQ = { path: "/markets", journey: false, offered: false, visible: false, preview: false };
(req("next/headers") as { headers: unknown }).headers = async () => new Headers({ "x-pathname": REQ.path });
const stubModule = (rel: string, exports: Record<string, unknown>) => {
  const at = req.resolve(`../${rel}`);
  const m = new NodeModule(at);
  m.filename = at; m.loaded = true; m.exports = exports;
  (req.cache as Record<string, unknown>)[at] = m;
};
stubModule("src/lib/server/journey-preview.ts", { resolveSimpleJourney: async () => ({ state: "LIVE", journey: REQ.journey, preview: false, pass: null }) });
stubModule("src/lib/server/millionea-doors.ts", { millioneaCardShown: async () => REQ.offered, millioneaDoor: async () => ({ visible: REQ.visible, preview: REQ.preview }) });
stubModule("src/lib/server/millionea-preview.ts", { resolveMillionea: async () => ({ state: REQ.preview ? "STAFF_PREVIEW" : REQ.visible ? "ACTIVE" : "WITHDRAWN", visible: REQ.visible, preview: REQ.preview }) });
/** A module compiled from a planted source at the real file's place, so its imports resolve (dark-edge's `fromSource`). */
function fromSource<T>(rel: string, source: string): T {
  const filename = req.resolve(`../${rel}`);
  req(filename);
  const live = (req.cache as Record<string, NodeModule>)[filename];
  const compiled = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const m = new NodeModule(filename);
  m.filename = filename;
  m.paths = live.paths;
  (m as NodeModule & { _compile(s: string, f: string): void })._compile(compiled, filename);
  return m.exports as T;
}
type El = { type: unknown; props: Record<string, unknown> };
type Loading = () => Promise<El>;
const MarketsLoading = (req("../src/app/markets/loading.tsx") as { default: Loading }).default;
const RootLoading = (req("../src/app/loading.tsx") as { default: Loading }).default;
const MARKETS_GHOST = (req("../src/app/markets/markets-ghost.tsx") as { default: unknown }).default;
const { LazyJourneyRouteGhost: ROUTE_GHOST } = req("../src/components/journey/route-ghost-lazy.tsx") as { LazyJourneyRouteGhost: unknown };
const { heroRailNames } = req("../src/lib/server/payout-rails.ts") as { heroRailNames: (p: null) => string[] };
/** A client element's props as Flight writes them into the payload — an `undefined` too ("$undefined": the key is there). */
const written = (props: Record<string, unknown>) => JSON.stringify(props, (_k, v) => (v === undefined ? "$undefined" : v));
const refName = (type: unknown) => (type === MARKETS_GHOST ? "MarketsGhost" : type === ROUTE_GHOST ? "LazyJourneyRouteGhost" : typeof type === "string" ? `<${type}>` : "another element");
type Reader = { who: string; path: string; journey: boolean; offered?: boolean; visible?: boolean; preview?: boolean; ref: unknown; props: string };
const handedDefects = async (load: Loading, readers: readonly Reader[]) => {
  const d: string[] = [];
  for (const r of readers) {
    Object.assign(REQ, { path: r.path, journey: r.journey, offered: r.offered === true, visible: r.visible ?? r.offered === true, preview: r.preview === true });
    const el = await load();
    if (el.type !== r.ref || written(el.props) !== r.props) d.push(`${r.who} (${r.path}): ${refName(el.type)} ${written(el.props)} — want ${refName(r.ref)} ${r.props}`);
  }
  return d;
};
// A reader the card is not offered to: WITHDRAWN, a STAFF_PREVIEW player, a reader on a break — the door's one false.
const BOARD: Reader[] = [
  { who: "a classic reader the card is not offered to", path: "/markets", journey: false, ref: MARKETS_GHOST, props: "{}" },
  { who: "the same reader at a question under the board", path: "/markets/rec_any", journey: false, ref: MARKETS_GHOST, props: "{}" },
  { who: "a journey reader the card is not offered to, on the board", path: "/markets", journey: true, ref: MARKETS_GHOST, props: "{}" },
  { who: "a journey reader at a question (the journey's picture)", path: "/markets/rec_any", journey: true, ref: ROUTE_GHOST, props: '{"rails":[],"at":"/markets/[id]"}' },
  { who: "a reader the card is offered to (ACTIVE)", path: "/markets", journey: false, offered: true, ref: MARKETS_GHOST, props: '{"millionea":true}' },
  { who: "staff at STAFF_PREVIEW", path: "/markets", journey: false, offered: true, preview: true, ref: MARKETS_GHOST, props: '{"millionea":true,"preview":true}' },
];
const RAILS = j(heroRailNames(null));
const ROOT_READERS: Reader[] = [
  { who: "a journey reader Millionea is hidden from (WITHDRAWN, a STAFF_PREVIEW player)", path: "/", journey: true, ref: ROUTE_GHOST, props: `{"rails":${RAILS}}` },
  { who: "the same reader on the board", path: "/markets", journey: true, ref: ROUTE_GHOST, props: `{"rails":${RAILS}}` },
  { who: "a journey reader Millionea is visible to", path: "/", journey: true, visible: true, ref: ROUTE_GHOST, props: `{"rails":${RAILS},"millionea":true}` },
  { who: "a classic reader Millionea is visible to (the box, no client picture)", path: "/", journey: false, visible: true, ref: "div", props: "{}" },
];
{
  const clientCode = [read("src/app/markets/markets-ghost.tsx"), read("src/components/journey/route-ghost-lazy.tsx")].every((s) => isDirective(s, "use client"));
  const board = await handedDefects(MarketsLoading, BOARD);
  ok(`5.1 · RUN as the server runs it, /markets' loading file hands its client drawing (a "use client" export: its props ARE the payload's) NO Millionea key for a reader the card is not offered to — WITHDRAWN, a STAFF_PREVIEW player, a reader on a break; classic or journey; on the board and at a question under it: \`<MarketsGhost />\`, \`{}\`, the element main serves — \`{"millionea":true}\` to a reader it is offered to and \`{"millionea":true,"preview":true}\` to staff at STAFF_PREVIEW (${BOARD.length} readers)`,
    clientCode && board.length === 0, board.join(" | "));
  // The classic arm returns the box; its props are read apart from React's own element fields.
  const root = await handedDefects(async () => {
    const el = await RootLoading();
    return el.type === "div" ? { type: "div", props: {} } : el;
  }, ROOT_READERS);
  ok(`5.2 · RUN as the server runs it, the root loading file hands the journey's route ghost \`millionea\` only while it is true: \`{"rails":[…]}\` for a journey reader Millionea is hidden from, \`"millionea":true\` added for one it is visible to; a classic reader is drawn the box (${ROOT_READERS.length} readers)`,
    root.length === 0, root.join(" | "));
}

/* ── the census: every place in src that hands a Millionea answer, and the side of the line it stands on ─────────────── */
/** Millionea's own addresses — dark as a whole: a reader it is hidden from gets the platform's 404, so their payloads never
 *  reach one (qa:live's MILLIONEA_ROUTES) — and the officer console (staff only, behind its own gate). */
const NOT_A_DOOR = /^src\/app\/(?:millionea|admin|legal\/rules\/millionea|api\/og\/millionea)\//;
const tsxUnder = (dir: string, out: string[] = []): string[] => {
  for (const n of readdirSync(join(ROOT, dir))) {
    const p = `${dir}/${n}`;
    if (statSync(join(ROOT, p)).isDirectory()) tsxUnder(p, out);
    else if (p.endsWith(".tsx")) out.push(p);
  }
  return out;
};
const DOOR_FILES = tsxUnder("src").filter((f) => !NOT_A_DOOR.test(f));
type Shape = { keys: string[]; ok: boolean; why: string };
const unwrap = (e: ts.Expression): ts.Expression => (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isSatisfiesExpression(e) || ts.isNonNullExpression(e) ? unwrap(e.expression) : e);
/** The answers an object literal carries, each held only while true: `key: true` (`true as const`), or the condition's own
 *  name, narrowed true by it (`millionea ? { millionea } : {}`). */
function objectShape(o: ts.ObjectLiteralExpression, cond: string | null, sf: ts.SourceFile): Shape {
  const keys: string[] = [], bad: string[] = [];
  for (const p of o.properties) {
    if (ts.isSpreadAssignment(p)) { const r = spreadShape(p.expression, sf); keys.push(...r.keys); if (!r.ok) bad.push(r.why); continue; }
    const name = p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) ? p.name.text : null;
    if (name === null || !ANSWERS.has(name)) continue;
    keys.push(name);
    if (ts.isPropertyAssignment(p) && unwrap(p.initializer).kind === ts.SyntaxKind.TrueKeyword) continue;
    if (ts.isShorthandPropertyAssignment(p) && cond === name) continue;
    bad.push(`"${p.getText(sf)}" holds more than true`);
  }
  return { keys, ok: bad.length === 0, why: bad.join("; ") };
}
/** A spread's answers and whether each exists only while true: `c ? { …true } : {}`, or a name declared so in the file. */
function spreadShape(e0: ts.Expression, sf: ts.SourceFile, depth = 0): Shape {
  const e = unwrap(e0);
  if (ts.isConditionalExpression(e)) {
    const c = unwrap(e.condition), yes = unwrap(e.whenTrue), no = unwrap(e.whenFalse);
    const t = ts.isObjectLiteralExpression(yes) ? objectShape(yes, ts.isIdentifier(c) ? c.text : null, sf) : { keys: [], ok: true, why: "" };
    const f = ts.isObjectLiteralExpression(no) ? objectShape(no, null, sf) : { keys: [], ok: true, why: "" };
    const keys = [...new Set([...t.keys, ...f.keys])];
    const empty = ts.isObjectLiteralExpression(no) && no.properties.length === 0;
    return { keys, ok: keys.length === 0 || (t.ok && empty), why: [t.why, empty ? "" : `its other branch is not {} (${no.getText(sf).slice(0, 60)})`].filter(Boolean).join("; ") };
  }
  if (ts.isObjectLiteralExpression(e)) return objectShape(e, null, sf);
  if (ts.isIdentifier(e) && depth === 0) {
    let init: ts.Expression | undefined;
    const find = (n: ts.Node): void => { if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === e.text && n.initializer) init = n.initializer; else ts.forEachChild(n, find); };
    find(sf);
    if (init) return spreadShape(init, sf, 1);
  }
  return { keys: [], ok: true, why: "" };
}
type Site = { file: string; tag: string; keys: string; how: "attribute" | "spread"; side: "server→client" | "server→server" | "inside client code"; target: string; ok: boolean; why: string };
/** Every element in a door file handed an answer, classified: inside client code (the file is a "use client" module — a
 *  prop handed there is a runtime value, never written into a payload); server→server (the target is a server component,
 *  run on the server: its props are never written); server→client (a "use client" export, a package's component or a host
 *  element: its props ARE written) — the one side where an answer must exist only while true. */
function census(text: (rel: string) => string = read): Site[] {
  const sites: Site[] = [];
  for (const file of DOOR_FILES) {
    const src = text(file);
    if (!/\b(?:millionea|millioneaOnBreak|preview)\b/.test(src)) continue;
    const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const imports = new Map<string, string>();
    for (const st of sf.statements) {
      if (!ts.isImportDeclaration(st) || st.importClause?.isTypeOnly || !ts.isStringLiteral(st.moduleSpecifier)) continue;
      const c = st.importClause;
      if (c?.name) imports.set(c.name.text, st.moduleSpecifier.text);
      if (c?.namedBindings && ts.isNamedImports(c.namedBindings)) for (const el of c.namedBindings.elements) if (!el.isTypeOnly) imports.set(el.name.text, st.moduleSpecifier.text);
    }
    const inClient = isDirective(src, "use client");
    const visit = (node: ts.Node): void => {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tag = node.tagName.getText(sf);
        for (const a of node.attributes.properties) {
          let site: Pick<Site, "keys" | "how" | "ok" | "why"> | null = null;
          if (ts.isJsxAttribute(a) && ANSWERS.has(a.name.getText(sf))) site = { keys: a.name.getText(sf), how: "attribute", ok: false, why: `a plain attribute: its false is written too (${a.getText(sf).slice(0, 70)})` };
          else if (ts.isJsxSpreadAttribute(a)) { const r = spreadShape(a.expression, sf); if (r.keys.length > 0) site = { keys: r.keys.join("+"), how: "spread", ok: r.ok, why: r.why }; }
          if (site === null) continue;
          let side: Site["side"], target: string;
          if (inClient) { side = "inside client code"; target = "(rendered in the browser's tree)"; }
          else if (/^[a-z]/.test(tag)) { side = "server→client"; target = `<${tag}> (a host element: its props are written)`; }
          else {
            const spec = imports.get(tag.split(".")[0]);
            const to = spec === undefined ? file : resolveSpec(file, spec);
            if (to === null) { side = "server→client"; target = `${spec} (a package's component, taken as client code)`; }
            else { side = isDirective(text(to), "use client") ? "server→client" : "server→server"; target = to; }
          }
          sites.push({ file, tag, side, target, ...site, ok: side !== "server→client" || site.ok });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return sites;
}
{
  const sites = census();
  const by = (side: Site["side"]) => sites.filter((s) => s.side === side);
  for (const s of sites) console.log(`     · ${s.side.padEnd(18)} ${s.file} <${s.tag}> ${s.keys} (${s.how}) → ${s.target}${s.ok ? "" : `  ✗ ${s.why}`}`);
  const crossing = by("server→client");
  ok(`5.3 · the census — every place in src that hands a Millionea answer (${sites.length} sites in ${DOOR_FILES.length} door files; Millionea's own pages and the console aside): the ${crossing.length} that cross into client code (a "use client" export, a package's component or a host element — their props are written into the payload) each hand it ONLY WHILE TRUE (\`c ? { key: true } : {}\`, the root loading file's shape); the ${by("server→server").length} server→server hand-offs and the ${by("inside client code").length} inside client code are never written`,
    sites.length >= 20 && crossing.length >= 8 && sites.every((s) => s.ok), sites.filter((s) => !s.ok).map((s) => `${s.file} <${s.tag}> ${s.keys}: ${s.why}`).join(" | "));
}
{
  const LOADING = "src/app/markets/loading.tsx", SHELL = "src/components/layout/app-shell.tsx";
  const OLD = "return <MarketsGhost millionea={millionea} preview={millionea && (await millioneaDoor()).preview} />;";
  const NOW_LINE = "return <MarketsGhost {...(millionea ? { millionea: true as const, ...(preview ? { preview: true as const } : {}) } : {})} />;";
  const at = (rel: string, from: string, to: string) => (p: string) => {
    const s = read(p);
    if (p !== rel) return s;
    if (count(s, from) !== 1) throw new Error(`plant anchor found ${count(s, from)} times in ${rel}: ${from.slice(0, 60)}`);
    return s.replace(from, to);
  };
  const s5 = at(LOADING, NOW_LINE, OLD);
  const planted = fromSource<{ default: Loading }>(LOADING, s5(LOADING)).default;
  const red = await handedDefects(planted, BOARD);
  ok("5.1′ PLANT · the S5 line (`millionea={millionea} preview={…}` handed always) is reported: a reader the card is not offered to is handed `{\"millionea\":false,\"preview\":false}`",
    red.some((x) => x.includes('{"millionea":false,"preview":false}')), red.slice(0, 1).join(""));
  const redSites = census(s5).filter((s) => !s.ok);
  ok("5.3′ PLANT · the same line is reported by the census: a plain attribute handed across into client code", redSites.some((s) => s.file === LOADING && s.how === "attribute"), j(redSites.map((s) => s.file)));
  const nav = census(at(SHELL, "walletHeld={!!topUser.walletHeld} {...millioneaProp}", "walletHeld={!!topUser.walletHeld} millionea={millioneaRow}")).filter((s) => !s.ok);
  ok("5.3″ PLANT · a nav handed `millionea={millioneaRow}` again (D3's defect) is reported", nav.some((s) => s.file === SHELL && s.tag === "BottomNav"), j(nav.map((s) => `${s.file} ${s.tag}`)));
  const leaky = census(at(SHELL, "millioneaRow ? { millionea: true } : {};", "millioneaRow ? { millionea: true } : { millionea: false };")).filter((s) => !s.ok);
  ok("5.3‴ PLANT · a spread whose other branch carries the key (`c ? { millionea: true } : { millionea: false }`) is reported at every nav it reaches", leaky.filter((s) => s.file === SHELL).length === 4, j(leaky.map((s) => s.tag)));
}

console.log(`\n${"═".repeat(70)}\n  MASWALI DOORS: ${pass} passed, ${fail} failed\n${"═".repeat(70)}`);
/** The floor is the count a green run prints. */
const MIN_ASSERTIONS = 63;
if (pass < MIN_ASSERTIONS) { console.error(`!! FLOOR — ran ${pass}, fewer than ${MIN_ASSERTIONS}.`); process.exit(4); }
process.exit(fail === 0 ? 0 : 1);
