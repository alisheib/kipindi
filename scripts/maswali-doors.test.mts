/**
 * test:maswali-doors — THE DOORS INTO MILLIONEA, AS THEY ARE DRAWN (MASWALI-BUILD S5-DESIGN-DOORS; the design critics' R1-doors,
 * 2026-10-21; DESIGN_AUTHORITY §M8a item 11).
 *
 *   npx tsx scripts/maswali-doors.test.mts     (npm run test:maswali-doors)
 *
 *   §1 the card, every state its model draws, in en, sw and zh, on both hosts (the journey home, the classic board) —
 *      rendered by the card itself from the card's own model (`scripts/lib/maswali-door-fixtures.mts`), never re-drawn:
 *      M2 one order · M3 zh tickets · M4 the identity plate · M6 no jackpot after a rollover · M7 the price to a reader
 *      who holds none · L3 the figure's rung · L5 zh headline · L7 a time in the body face · L8 paused words · L9 the
 *      register's won words · L10 the presale's date · L11 its name and description · L12 the preview chip · P6 the
 *      objection window · L2 each host's box
 *   §2 its loading picture (H1): the ghost is the card's anatomy and the common card's words, hidden over bars; the journey
 *      home's ghost and the board's draw it where the card lands, and only when told the card will be offered
 *   §3 the stylesheet: the door's one anatomy per width, its hover, the ghost's hidden words
 *   §4 controls: each check above is shown failing on a planted copy
 * The browser half — the ghost's box against the card's at 320/360/768/1280 in three languages, and every state shot — is
 * `qa:maswali-player-shots`' door pages (MASWALI_SHOTS_PAGES=door-states,door-ghosts).
 * Pure: it reads source files and renders components. No server, no database, no network, no file written.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dict } from "../src/lib/i18n-dict.ts";
import { fill, formatTzs } from "../src/lib/utils.ts";
import { decomment } from "./lib/decomment.mts";
import { HOSTS, LOCALES, STATES, cardMarkup, doorFixtures, inApp, type DoorHost } from "./lib/maswali-door-fixtures.mts";
import { createRequire } from "node:module";

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
  ok("1.4 · M6 · a week nobody won draws no \"Jackpot —\" and no live rule — only its own line (\"no 10/10 · TZS 601,000 carried forward\") — nor does a void; CONTROL: a won week keeps its headline",
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

// ── §2 · the ghost ────────────────────────────────────────────────────────────────────────────────────────────────────
console.log("\n§2 · the card's loading picture (H1)");
/** 2.3's check — what a ghost leaves readable — set in §2 and run again by its plant in §4. */
let hiddenDefects: (g: string) => string[] = () => ["unset"];
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
  hiddenDefects = (g: string) => {
    const d: string[] = [];
    if (!/^<div aria-hidden="true" class="kp-mln-zh kp-mln-ghost kp-shimmer-track kp-mln-door kp-mln-door--/.test(g)) d.push("the root is not an aria-hidden ghost of the door");
    if (/\sid="|<a\s/.test(g)) d.push("an id or a link");
    // every text run sits inside a hidden span: each hidden element removed whole (balanced), nothing readable is left
    let bare = g;
    for (let hidden = elementAt(bare, 'class="kp-mln-ghost__words"'); hidden !== ""; hidden = elementAt(bare, 'class="kp-mln-ghost__words"')) bare = bare.replace(hidden, "");
    bare = bare.replace(/<span class="sr-only"> · <\/span>/g, "");
    if (textOf(bare).trim() !== "") d.push(`words not hidden: "${textOf(bare).trim().slice(0, 40)}"`);
    if (!g.includes('data-ghost-part="millionea"')) d.push("no ghost part mark");
    return d;
  };
  const hidden = LOCALES.flatMap((l) => HOSTS.flatMap((h) => hiddenDefects(FX.ghost[l][h]).map((x) => `${l} ${h}: ${x}`)));
  ok("2.3 · H1 · every word of the ghost is hidden (`.kp-mln-ghost__words`: nothing to read, find or copy), the root aria-hidden and marked for the drive, no id and no link", hidden.length === 0, hidden.join(" | "));
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
  const gate = loading.includes("const millionea = await millioneaCardShown(); return <MarketsGhost millionea={millionea} preview={millionea && (await millioneaDoor()).preview} />;")
    && page.includes("const millionea = await millioneaCardShown(); const { preview } = await millioneaDoor();")
    && squash(code("src/lib/server/millionea-doors.ts")).includes("export const millioneaCardShown = cache(async (): Promise<boolean> => { const door = await millioneaDoor(); if (!door.visible) return false;");
  ok("2.6 · H1 · the slot is drawn on the door's own answer — the card is offered (`millioneaCardShown`: visible to the reader and no break) — by /markets' loading and `/`'s fallback, so a hidden Millionea (WITHDRAWN) holds no slot", gate);
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
  return d;
};
{
  const d = cssDefects(CSS);
  ok("3.1 · M1 L1 L2 M5 H1 · the door's one anatomy — a head row of three over a full-width body below 768 (a wrapped fact's continuation hanging one em in), the body under the title from 768, one row from 1280 — each host's box and its host's hover (the How-to card's royal border; the board cards' lift and brand ring), and the ghost's hidden words and marks over line bars", d.length === 0, d.join(" | "));
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
    && hiddenDefects(g.replaceAll('<span class="kp-mln-ghost__words">', '<span class="shown">')).some((x) => x.startsWith("words not hidden")));
  ok("4.6′ · the board door without the board's lift (the How-to card's border on both hosts, as first built) is reported (3.1)",
    cssDefects(CSS.replace(".kp-mln-door--board:not(.kp-mln-ghost):hover { translate: 0 var(--m-lift); border-color: var(--brand-500);", ".kp-mln-door--board:not(.kp-mln-ghost):hover { border-color: var(--border-royal);")).some((x) => x.includes("each host's hover")));
  ok("4.6 · the stylesheet without the full-width phone body, with the ghost's words visible, or without the hanging continuation, is reported (3.1)",
    cssDefects(CSS.replace('"plate head chev" "rule rule rule" "state state state"', '"plate head chev" "plate rule chev" "plate state chev"')).length > 0
      && cssDefects(CSS.replace(".kp-mln-ghost__words, .kp-mln-ghost .kp-mln-fact::before { visibility: hidden; }", ".kp-mln-ghost__words { color: transparent; }")).length > 0
      && cssDefects(CSS.replace("padding-inline-start: 1em; text-indent: -1em;", "padding-inline-start: 0;")).length > 0);
  const twinOff = skeleton(FX.ghost.en.board.replace("kp-mln-door__rule", "kp-mln-door__body"));
  ok("4.7 · a ghost whose anatomy drifts from the card's is reported (2.2)", twinOff.replace(/span\.(?=\s|$)/g, "") !== skeleton(twin("en", "board")).replace(/span\.(?=\s|$)/g, ""));
}

console.log(`\n${"═".repeat(70)}\n  MASWALI DOORS: ${pass} passed, ${fail} failed\n${"═".repeat(70)}`);
/** The floor is the count a green run prints. */
const MIN_ASSERTIONS = 35;
if (pass < MIN_ASSERTIONS) { console.error(`!! FLOOR — ran ${pass}, fewer than ${MIN_ASSERTIONS}.`); process.exit(4); }
process.exit(fail === 0 ? 0 : 1);
