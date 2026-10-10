/**
 * ROUND 6 OF THE VISUAL PASS, FIXER C (2026-10-09) — the cross-surface consistency findings of round 6's review C: one
 * convention per pattern, applied to every sibling, each fix held beside a control or a plant that proves the check can
 * fail.
 *
 *   npx tsx scripts/visual-pass-r6c.test.mts        (npm run test:visual-pass-r6c)
 *
 * The owner's rules (Ali): only perfect visual and logical results (2026-10-08); consistency and perfection in each move —
 * a finding is fixed with every sibling it has (2026-10-09). The findings and their evidence are the review's log
 * (S/review6/C/log.txt, S = the session scratchpad); the models behind the numbers are S/r6c/*.mts.
 *   §1  C12 the bet confirm's stake is one amount, and its row wraps where the side and the stake cannot keep 16px apart
 *   §2  C7  a money range is one amount and the sentence before it wraps; no `.amount` holds a sentence it can clip
 *   §3  C8  no auto-filled grid track is wider than a 320 phone's column
 *   §4  C13 the KYC door is offered by one question, everywhere — the journey's menu too — and says the page's tab
 *   §5  C1  /profile/invite has one name per reader, and every door says it
 *   §6  C14 the journey's doors and pages call /positions "Tiketi zangu"
 *   §7  the journey's back links on the pages the Akaunti hub opens name the hub
 *   §8  C4  the sign-in break notice in the break's neutral tone, its words unchanged
 *   §9  C2  the Needle drawer's and the chat panel's ✕ are CloseX, on their titles' capitals
 *   §10 C9  every player dialog's ✕ is ruled: on its title, in its header row, none, or — the one exception — in Modal's
 *           corner over a crest
 *   §11 C3  the gold census counts the warning family in every spelling
 *   §12 C10 the journey bell draws a notice as /notifications does
 *   §13 C11 every right-aligned tracked label ends on its column's edge
 *   §14 C16 C17 C18 one pill size in the board card's row; the classic held question whole, and the win seal's (every
 *       clamp left is ruled); the tickets ghost's pills 18px
 *   §16 one gap between two large buttons (12px, `gap-2`) — the coordinator's item from R5-K: the receipt and the deposit
 *       return, and every sibling pair (run before §15)
 *   §15 no dictionary word changed
 * ⛔ It reads, renders and runs in memory; it writes nothing. The on-disk mutation proof is S/r6c/mutation-r6c.mjs.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import NodeModule from "node:module";
import { decomment, decommentCss } from "./lib/decomment.mts";

const req = createRequire(import.meta.url);
let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 110 - s.length))}`);
const raw = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
/** Source with its comments out (the shared scanner), so a rule quoted in a note is never mistaken for the rule. */
const code = (p: string) => decomment(raw(p));
const squash = (s: string) => s.replace(/\s+/g, " ");
const has = (file: string, snippet: string) => squash(code(file)).includes(squash(snippet));
const hasIn = (src: string, snippet: string) => squash(src).includes(squash(snippet));
const count = (s: string, needle: string) => s.split(needle).length - 1;
const j = (v: unknown) => JSON.stringify(v);
const text = (markup: string) => markup.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"');
const walk = (dir: string, re: RegExp): string[] => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p, re) : re.test(n) ? [p.replace(/\\/g, "/")] : [];
});
const OUT = /^src\/(?:app\/admin|components\/admin|app\/api|lib\/server|lib\/marketing)\//;
const PLAYER_TSX = walk("src", /\.tsx$/).filter((f) => !OUT.test(f));

/* ── the world the components run in (r5g's harness): the language, the journey answer, the providers ───────────────── */
type Loc = "sw" | "en" | "zh";
const LOCALES: Loc[] = ["sw", "en", "zh"];
const REQ = { locale: "sw" as Loc, path: "/", journey: true };
const nextHeaders = req("next/headers") as { cookies: unknown; headers: unknown };
nextHeaders.cookies = async () => ({ get: (k: string) => (k === "kp-locale" ? { value: REQ.locale } : undefined) });
nextHeaders.headers = async () => new Headers({ "x-pathname": REQ.path });
{
  const at = req.resolve("../src/lib/server/journey-preview.ts");
  const stub = new NodeModule(at);
  stub.filename = at; stub.loaded = true;
  stub.exports = { resolveSimpleJourney: async () => ({ state: "LIVE", journey: REQ.journey, preview: false, pass: null }) };
  (req.cache as Record<string, unknown>)[at] = stub;
}
const React = req("react") as typeof import("react");
const h = React.createElement;
const { renderToStaticMarkup } = req("react-dom/server") as typeof import("react-dom/server");
type Dict = Record<string, Record<string, unknown>>;
const { dict } = req("../src/lib/i18n-dict.ts") as { dict: Record<Loc, Dict> };
const at = (t: unknown, p: string): unknown => p.split(".").reduce<unknown>((v, k) => (v != null && typeof v === "object" ? (v as Record<string, unknown>)[k] : undefined), t);
const word = (l: Loc, p: string) => String(at(dict[l], p) ?? `‹no ${p}›`);
const { I18nProvider } = req("../src/lib/i18n.tsx") as { I18nProvider: (p: { initial: Loc; children: unknown }) => unknown };
const { AppRouterContext } = req("next/dist/shared/lib/app-router-context.shared-runtime") as { AppRouterContext: import("react").Context<unknown> };
const { PathnameContext } = req("next/dist/shared/lib/hooks-client-context.shared-runtime") as { PathnameContext: import("react").Context<string | null> };
const ROUTER = { push() {}, replace() {}, refresh() {}, prefetch() {}, back() {}, forward() {}, hmrRefresh() {} };
const inLocale = (l: Loc, el: unknown) => renderToStaticMarkup(h(AppRouterContext.Provider, { value: ROUTER },
  h(PathnameContext.Provider, { value: "/" }, h(I18nProvider as never, { initial: l }, el as never))));
const esbuild = req("esbuild") as { transformSync: (c: string, o: { loader: string }) => { code: string } };
/** A function's whole text, from its head through the brace that closes its body (r5d's reader). */
function fnText(src: string, head: string): string {
  const start = src.indexOf(head);
  if (start < 0) return "";
  let i = src.indexOf("(", start), depth = 0;
  for (; i < src.length; i++) { if (src[i] === "(") depth++; else if (src[i] === ")" && --depth === 0) break; }
  const open = src.indexOf("{", i);
  depth = 0;
  for (let k = open; k < src.length; k++) { if (src[k] === "{") depth++; else if (src[k] === "}" && --depth === 0) return src.slice(start, k + 1); }
  return "";
}
/** A page's generateMetadata, transpiled from its own source and run with what it reads stubbed (r5g's). */
async function runMeta(file: string, deps: Record<string, unknown>): Promise<unknown> {
  const fn = fnText(raw(file), "export async function generateMetadata(");
  if (!fn) return "‹no generateMetadata›";
  const js = esbuild.transformSync(fn.replace(/^export\s+/, ""), { loader: "ts" }).code;
  return (new Function(...Object.keys(deps), `${js}\nreturn generateMetadata;`)(...Object.values(deps)) as () => Promise<unknown>)();
}
const titleOf = (m: unknown) => String((m as { title?: unknown })?.title ?? "‹none›");

/* ── metrics: this repo's spacing scale, Next's capsize table, the repo's own Inter and JetBrains Mono ───────────────── */
const TW = raw("tailwind.config.ts");
const twStep = (k: string) => Number(new RegExp(`"${k.replace(".", "\\.")}":\\s*"([0-9.]+)px"`).exec(TW)?.[1] ?? NaN);
const CAPSIZE = JSON.parse(readFileSync("node_modules/next/dist/server/capsize-font-metrics.json", "utf8")) as Record<string, { capHeight: number; ascent: number; descent: number; unitsPerEm: number }>;
/** Where a face's capitals are centred below the top of a line of height `lh` (em): half-leading + ascent − cap/2. */
const capCentreEm = (face: string, lh: number) => {
  const f = CAPSIZE[face];
  const a = f.ascent / f.unitsPerEm, d = -f.descent / f.unitsPerEm, cap = f.capHeight / f.unitsPerEm;
  return (lh - (a + d)) / 2 + a - cap / 2;
};
const fontkit = req("fontkit") as { openSync: (p: string) => { layout: (s: string) => { positions: { xAdvance: number }[] }; unitsPerEm: number } };
const interReg = fontkit.openSync("src/lib/server/reports/fonts/Inter-Regular.ttf");
/** JetBrains Mono: every glyph used here is 0.6em. */
const monoW = (s: string, size: number) => [...s].length * 0.6 * size;
/** Inter at `size`, by its own advances (an ideograph 1em). */
const interW = (s: string, size: number) => [...s].reduce((w, ch) => w + (/[㐀-鿿]/.test(ch) ? size : interReg.layout(ch).positions.reduce((a, p) => a + p.xAdvance, 0) / interReg.unitsPerEm * size), 0);

/* ══ §1 · C12 · THE BET CONFIRM'S STAKE ═══════════════════════════════════════════════════════════════════════════════ */
section("1 · C12 the bet confirm's stake: one amount, and a row that wraps (the sell confirm's S6 A8f shape)");
const BET = "src/components/markets/bet-confirm-modal.tsx";
const SELL = "src/components/markets/sell-confirm-modal.tsx";
{
  const bet = code(BET);
  ok("1.1 · the stake is an amount — mono, tabular, never split (`.amount`), where it was mono and broke \"TZS\" / \"1,000\"",
    hasIn(bet, '<p className="amount font-bold text-[22px] leading-none text-text">TZS {formatNumber(stake)}</p>') && !bet.includes('tabular-nums leading-none text-text">TZS {formatNumber(stake)}'));
  ok("1.2 · the side | stake row wraps: `flex-wrap … gap-y-2`, the stake's column `grow text-right` — the sell confirm's own shape",
    hasIn(bet, '<div className="flex flex-wrap items-baseline justify-between gap-y-2">') && hasIn(bet, '<div className="grow text-right">')
      && has(SELL, '<div className="flex flex-wrap items-baseline justify-between gap-y-2">') && has(SELL, '<div className="grow text-right">'));
  ok("1.3 · the 16px between the two values sits on the side word (`pr-3`), the one value the stake meets on its line — so a row wraps exactly when the two would come closer",
    hasIn(bet, '<p className="pr-3 font-display font-bold text-[26px] leading-none"') && twStep("3") === 16);
  // The box the row lives in, at 320 (the narrowest phone): Modal's 16px gutters, the body's 24px padding, the box's 1px border
  // and 20px padding; the largest stake the platform takes.
  const { PLATFORM_MAX_STAKE } = req("../src/lib/payout.ts") as { PLATFORM_MAX_STAKE: number };
  const { formatNumber } = req("../src/lib/utils.ts") as { formatNumber: (n: number) => string };
  const box320 = Math.min(320 - 2 * twStep("3"), 440) - 2 * twStep("5") - 2 * (1 + twStep("4"));
  const widest = monoW(`TZS ${formatNumber(PLATFORM_MAX_STAKE)}`, 22);
  ok(`1.4 · the largest stake, whole ("TZS ${formatNumber(PLATFORM_MAX_STAKE)}", ${widest.toFixed(1)}px at 22px mono), fits the box at 320 (${box320}px): once it wraps under the side it can never run out`,
    widest <= box320 && box320 === 198, j({ widest, box320 }));
  ok("1.4′ CONTROL · it did NOT fit beside the side at 320 — the case the old row broke: HAPANA (26px) + 16 + the stake is wider than the box",
    monoW(`TZS ${formatNumber(1_000)}`, 22) + 16 + 26 * 0.517 * 6 > box320 - 0);
  // Plants (in memory): the old stake, the old row.
  const oldStake = bet.replace('<p className="amount font-bold text-[22px] leading-none text-text">', '<p className="font-mono font-bold text-[22px] tabular-nums leading-none text-text">');
  const oldRow = bet.replace('<div className="flex flex-wrap items-baseline justify-between gap-y-2">', '<div className="flex items-baseline justify-between">');
  ok("1.5 PLANT · the stake set mono but not `.amount`, and the row that cannot wrap, are each reported",
    !hasIn(oldStake, '<p className="amount font-bold text-[22px] leading-none text-text">') && !hasIn(oldRow, '<div className="flex flex-wrap items-baseline justify-between gap-y-2">'));
}

/* ══ §2 · C7 · A MONEY RANGE IS ONE AMOUNT ════════════════════════════════════════════════════════════════════════════ */
section("2 · C7 Up & Down's range line: the range is the amount, the sentence before it wraps — and no `.amount` holds a sentence it can clip");
const RANGE_LINE = '<p className={cn("mt-1 text-micro", customInvalid ? "text-danger-fg" : "text-text-subtle")}> {customInvalid ? `${t.market.udStakeRange} · ` : ""}<span className="amount">{formatTzs(bet.min)} – {formatTzs(bet.max)}</span> </p>';
const UD_CONTROLS = "src/components/updown/updown-stake-controls.tsx", UD_PANEL = "src/components/updown/round-stake-panel.tsx";
{
  ok("2.1 · the board card's range line: the line is the hint's own words, and only the range is an amount (it was ONE `.amount` — mono, nowrap)",
    has(UD_CONTROLS, RANGE_LINE) && !has(UD_CONTROLS, '"mt-1 text-micro amount"'));
  ok("2.1′ · …and its twin on the round page says it the same way (one rule, both stake panels)", has(UD_PANEL, RANGE_LINE) && !has(UD_PANEL, '"mt-1 text-micro amount"'));
  const { formatTzs } = req("../src/lib/utils.ts") as { formatTzs: (n: number) => string };
  const { PLATFORM_MIN_STAKE, PLATFORM_MAX_STAKE } = req("../src/lib/payout.ts") as { PLATFORM_MIN_STAKE: number; PLATFORM_MAX_STAKE: number };
  const range = `${formatTzs(PLATFORM_MIN_STAKE)} – ${formatTzs(PLATFORM_MAX_STAKE)}`;
  // The card's content box at 320: the page's 16px gutters, the card's 1px border and 15px padding (`.mcardp`).
  const cardBox = 320 - 32 - 2 - 30;
  const longestWord = Math.max(...LOCALES.flatMap((l) => word(l, "market.udStakeRange").split(/\s+/).map((w) => interW(w, 10))));
  ok(`2.2 · every unbreakable piece fits the card at 320 (${cardBox}px): the range whole (${monoW(range, 10)}px) and the sentence's longest word (${longestWord.toFixed(1)}px) — nothing can be clipped`,
    monoW(range, 10) <= cardBox && longestWord <= cardBox, j({ range, cardBox }));
  const before = LOCALES.map((l) => ({ l, w: monoW(`${word(l, "market.udStakeRange")} · ${range}`, 10) }));
  ok(`2.2′ CONTROL · the old line, one nowrap piece, ran out of the box: ${before.map((b) => `${b.l} ${b.w.toFixed(0)}px`).join(", ")} against ${cardBox}px (sw and en)`,
    before.filter((b) => b.l !== "zh").every((b) => b.w > cardBox));
  // THE CENSUS: every `.amount` element whose content reads dictionary words or prose — each one ruled.
  const sites: string[] = [];
  for (const file of PLAYER_TSX) {
    const src = code(file);
    for (const m of src.matchAll(/<([a-zA-Z][\w.]*)\b([^>]*?\bclassName=(?:"[^"]*\bamount\b[^"]*"|\{[^}]*\bamount\b[^}]*\}|\{`[^`]*\bamount\b[^`]*`\}))[^>]*?(\/?)>/g)) {
      if (m[3] === "/") continue;
      const tag = m[1].replace(".", "\\.");
      let depth = 1, i = (m.index ?? 0) + m[0].length, end = -1;
      const start = i;
      while (depth > 0) {
        const o = new RegExp(`<${tag}\\b[^>]*?(/?)>`, "g"); o.lastIndex = i;
        const c = new RegExp(`</${tag}>`, "g"); c.lastIndex = i;
        const om = o.exec(src), cm = c.exec(src);
        if (!cm) break;
        if (om && om.index < cm.index) { if (om[1] !== "/") depth++; i = om.index + om[0].length; }
        else { depth--; i = cm.index + cm[0].length; if (depth === 0) end = cm.index; }
      }
      if (end < 0) continue;
      const kids = src.slice(start, end);
      if (/\bt\.[a-zA-Z]+\.[a-zA-Z]+/.test(kids)) sites.push(`${file}|${squash(kids).trim().slice(0, 60)}`);
    }
  }
  /** Each `.amount` that holds words, and why the words may stand in one unbreakable mono run. */
  const RULED: Array<[string, RegExp, string]> = [
    ["src/app/results/page.tsx", /formatNumber\(totalCount\)/, "the archive's tally line — drawn from 640 only (`hidden sm:block`), one deliberate line"],
    ["src/app/updown/[roundId]/page.tsx", /udBothSides/, "a settled round's pick · stake: a side word and one figure (\"Juu · TZS 1,000\"), short in every language"],
    ["src/components/markets/sell-confirm-modal.tsx", /t\.dialog\.noFee/, "\"No fee\" in the fee figure's own slot — two words where a figure stands"],
    ["src/components/markets/sell-confirm-modal.tsx", /t\.dialog\.freeExitWindow/, "the fee's caption: three words in the figure column (≤ 132px)"],
    ["src/components/updown/round-action-panel.tsx", /udYouGet\} \{formatTzs\(payoutIfUp/, "\"you get\" + the UP payout: its figure's own label, ≤ 176px beside a wrapping label at 320 (it fits)"],
    ["src/components/updown/round-action-panel.tsx", /udYouGet\} \{formatTzs\(payoutIfDown/, "\"you get\" + the DOWN payout, as above"],
  ];
  const unruled = sites.filter((s) => !RULED.some(([f, re]) => s.startsWith(`${f}|`) && re.test(s)));
  ok(`2.3 · every \`.amount\` that holds dictionary words is ruled (${sites.length} sites: a tally line drawn from 640, a pick · stake, two labels in a figure's slot, two "you get" payouts) — none is a sentence that can be clipped`,
    unruled.length === 0 && sites.length === RULED.length, j({ unruled, sites }));
  const oldLine = squash(code(UD_CONTROLS)).replace(squash(RANGE_LINE), '<p className={cn("mt-1 text-micro amount", customInvalid ? "text-danger-fg" : "text-text-subtle")}> {customInvalid ? `${t.market.udStakeRange} · ` : ""}{formatTzs(bet.min)} – {formatTzs(bet.max)} </p>');
  ok("2.4 PLANT · the whole-line `.amount` back on the board card is reported (2.1 reads it), and its sentence would be an unruled `.amount` site",
    oldLine !== squash(code(UD_CONTROLS)) && !hasIn(oldLine, RANGE_LINE) && !RULED.some(([f, re]) => f === UD_CONTROLS && re.test("{customInvalid ? `${t.market.udStakeRange} · ` : \"\"}")));
}

/* ══ §3 · C8 · NO GRID TRACK WIDER THAN A PHONE'S COLUMN ═══════════════════════════════════════════════════════════════ */
section("3 · C8 every auto-filled grid keeps its tracks inside a 320 phone's column (`min(Npx, 100%)`, `.market-grid`'s guard)");
{
  const COLUMN_320 = 320 - 2 * twStep("3");
  const grids: Array<{ file: string; min: number; guarded: boolean }> = [];
  const scan = (file: string, src: string) => {
    for (const m of src.matchAll(/repeat\(\s*auto-(?:fill|fit)\s*,\s*minmax\(\s*(min\(\s*)?(\d+)px/g)) grids.push({ file, min: Number(m[2]), guarded: !!m[1] });
    for (const m of src.matchAll(/repeat\(auto-(?:fill|fit),minmax\((min\()?(\d+)px/g)) grids.push({ file, min: Number(m[2]), guarded: !!m[1] });
  };
  for (const f of [...PLAYER_TSX, "src/app/globals.css"]) scan(f, f.endsWith(".css") ? decommentCss(raw(f)) : code(f));
  const wide = grids.filter((g) => g.min > COLUMN_320 && !g.guarded);
  const guarded = grids.filter((g) => g.min > COLUMN_320 && g.guarded).map((g) => g.file);
  ok(`3.1 · no grid's fixed track floor is wider than a 320 phone's ${COLUMN_320}px column unguarded (${grids.length} auto-filled grids; ${guarded.length} wide floors guarded)`,
    wide.length === 0 && ["src/app/updown/page.tsx", "src/app/updown/updown-ghost.tsx", "src/app/updown/history/page.tsx", "src/app/globals.css"].every((f) => guarded.includes(f)), j({ wide, guarded }));
  ok("3.2 · the board and its ghost keep one track rule (so nothing shifts when the board lands)",
    has("src/app/updown/page.tsx", 'gridTemplateColumns: "repeat(auto-fill, minmax(min(300px, 100%), 1fr))"') && has("src/app/updown/updown-ghost.tsx", 'gridTemplateColumns: "repeat(auto-fill, minmax(min(300px, 100%), 1fr))"'));
  const plant: typeof grids = [];
  for (const m of 'style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}'.matchAll(/repeat\(\s*auto-(?:fill|fit)\s*,\s*minmax\(\s*(min\(\s*)?(\d+)px/g)) plant.push({ file: "x", min: Number(m[2]), guarded: !!m[1] });
  ok("3.3 PLANT · the history list's old 320px floor is reported", plant.some((g) => g.min > COLUMN_320 && !g.guarded));
}

/* ══ §4 · C13 · THE KYC DOOR ══════════════════════════════════════════════════════════════════════════════════════════ */
section("4 · C13 the door to /profile/kyc: one question everywhere (the journey's menu too), and the page's own name");
const MENU = "src/components/layout/avatar-menu.tsx", SHELL = "src/components/layout/app-shell.tsx", JBAR = "src/components/journey/journey-top-bar.tsx";
const HUB_ROWS = "src/components/journey/account/hub-rows.ts", PROFILE = "src/app/profile/page.tsx", HUB_VIEWER = "src/lib/server/hub-viewer.ts";
/** The journey menu's rows, RUN from the menu's own source: MENU_ROWS and the rows' computation, transpiled with stubs. */
function menuRows(o: { journey: boolean; inviteVisible?: boolean; invitePaid?: boolean; inviteAgent?: boolean; kycOffered?: boolean; locale?: Loc }, src = code(MENU)) {
  const rowsStart = src.indexOf("const journeyName"), rowsEnd = src.indexOf("const currentHref");
  const listStart = src.indexOf("const MENU_ROWS"), listEnd = src.indexOf("];", listStart) + 2;
  const body = `${src.slice(listStart, listEnd)}\n${src.slice(rowsStart, rowsEnd)}\nreturn rows;`;
  const js = esbuild.transformSync(body, { loader: "ts" }).code;
  const I = new Proxy({}, { get: (_t, k) => String(k) });
  const { inviteName } = req("../src/lib/journey/invite-name.ts") as { inviteName: (t: unknown, r: unknown) => string };
  const fn = new Function("t", "I", "inviteName", "journey", "inviteVisible", "invitePaid", "inviteAgent", "kycOffered", "proposalsState", js);
  const t = dict[o.locale ?? "sw"];
  return (fn(t, I, inviteName, o.journey, o.inviteVisible ?? true, o.invitePaid ?? false, o.inviteAgent ?? false, o.kycOffered ?? false, "OPEN") as Array<{ href: string; sw: string; en: string; zh: string }>)
    .map((r) => ({ href: r.href, words: r[o.locale ?? "sw"] }));
}
{
  const { kycDoorOffered } = req("../src/lib/kyc-refusal.ts") as { kycDoorOffered: (s: string | null | undefined, r: string | null | undefined) => boolean };
  const table: Array<[string | null | undefined, string | null, boolean]> = [
    [undefined, null, true], [null, null, true], ["NOT_STARTED", null, true], ["IN_PROGRESS", null, true], ["PENDING_REVIEW", null, true],
    ["ADDITIONAL_INFO_REQUIRED", null, true], ["REJECTED", "BLURRY", true], ["REJECTED", "OTHER", true],
    ["APPROVED", null, false], ["REJECTED", "UNDERAGE", false], ["REJECTED", "SANCTIONED", false], ["REJECTED", "DUPLICATE_IDENTITY", false],
  ];
  const wrong = table.filter(([s, r, want]) => kycDoorOffered(s, r) !== want);
  ok(`4.1 · RUN: one question decides the door (\`kycDoorOffered\`): offered until the identity is approved or finally refused — ${table.length} states`, wrong.length === 0, j(wrong));
  ok("4.2 · /profile, the Akaunti hub's reader and the shell ask that one function — no copy of the predicate anywhere",
    has(PROFILE, "{kycDoorOffered(kycLevel, kyc?.rejectReason) && (") && has(HUB_VIEWER, 'const kycOffered = k.status === "fulfilled" && kycDoorOffered(k.value?.status, k.value?.rejectReason);')
      && has(SHELL, 'journeyKycOffered = kycResult.status === "fulfilled" && kycDoorOffered(kycResult.value?.status, kycResult.value?.rejectReason);')
      && !has(PROFILE, 'kycLevel !== "APPROVED" && !(kycLevel === "REJECTED"') && !code(HUB_VIEWER).includes("isFinalRefusal"));
  ok("4.3 · the shell reads the KYC row for a JOURNEY reader alone, in its one batch, chained on its own journey answer — a classic page makes no query, a journey page no extra round trip",
    has(SHELL, "journeyRead.then((j) => (j.journey ? db.kyc.findByUserId(session.userId) : null)),") && count(code(SHELL), "db.kyc.findByUserId") === 1
      && has(SHELL, "const [uResult, walletResult, rgResult, affResult, kycResult] = await Promise.allSettled(["));
  ok("4.4 · the journey bar hands the answer to its menu; the classic bar's menu takes nothing new (frozen chrome)",
    has(JBAR, "kycOffered={kycOffered}") && has(SHELL, "kycOffered={journeyKycOffered}") && !/kycOffered/.test(code("src/components/layout/top-app-bar.tsx")));
  const kycRow = (o: Parameters<typeof menuRows>[0]) => menuRows(o).find((r) => r.href === "/profile/kyc");
  ok("4.5 · RUN: the journey menu offers the KYC door only where the hub and /profile do — not to a verified reader (it asked every reader to verify)",
    !!kycRow({ journey: true, kycOffered: true }) && !kycRow({ journey: true, kycOffered: false }) && !kycRow({ journey: true }),
    j({ offered: kycRow({ journey: true, kycOffered: true }), withheld: kycRow({ journey: true, kycOffered: false }) }));
  ok("4.5′ CONTROL · the classic menu keeps its row for everybody, in its own words (frozen chrome)",
    kycRow({ journey: false, kycOffered: false })?.words === "Kuthibitisha kitambulisho" && kycRow({ journey: false, kycOffered: true })?.words === "Kuthibitisha kitambulisho");
  // ONE NAME: the doors say the page's tab and eyebrow — the name every state of the page carries.
  const { hubRowsFor } = req("../src/components/journey/account/hub-rows.ts") as { hubRowsFor: (v: unknown) => Array<{ rows: Array<{ id: string; label?: string }> }> };
  const member = { signedIn: true, userId: "u", name: "n", initials: "N", phone: "p", balance: 1, walletHeld: false, kycOffered: true, agentInStanding: false, proposalsState: "OPEN",
    doors: { inviteVisible: true, invitePaid: false, proposalsVisible: true, agentDoorVisible: true, staffConsole: false } };
  const hubKyc = hubRowsFor(member).flatMap((g) => g.rows).find((r) => r.id === "kyc")?.label;
  const pageName = (l: Loc) => word(l, "profile.kycIdentityVerification");
  const doorsSay = LOCALES.map((l) => ({ l, hub: word(l, hubKyc ?? ""), menu: menuRows({ journey: true, kycOffered: true, locale: l }).find((r) => r.href === "/profile/kyc")?.words, page: pageName(l) }));
  ok(`4.6 · the hub's row, the journey menu and /profile's row say the page's tab and eyebrow ("${pageName("sw")}" / "${pageName("en")}" / "${pageName("zh")}") in every language`,
    doorsSay.every((d) => d.hub === d.page && d.menu === d.page) && has(PROFILE, "title={t.profile.kycIdentityVerification}")
      && has("src/app/profile/kyc/page.tsx", "return { title: t.profile.kycIdentityVerification };") && has("src/app/profile/kyc/page.tsx", "eyebrow={t.profile.kycIdentityVerification}"), j(doorsSay));
  ok("4.6′ CONTROL · the page's h1 is a headline that changes with the state — \"Verify your identity\", \"Your identity is verified\", \"We couldn't verify you\" — so no door could name it in every state",
    has("src/app/profile/kyc/page.tsx", 'title={kyc?.status === "APPROVED" ? t.profile.verifyTitleApproved : finalRefusal ? t.kycGate.titleRejected : t.profile.verifyIdentity}')
      && new Set(["profile.verifyTitleApproved", "kycGate.titleRejected", "profile.verifyIdentity"].map((k) => word("en", k))).size === 3);
  // Plants: the filter gone, the old words back.
  const noFilter = code(MENU).replace(' && !(journey && r.href === "/profile/kyc" && !kycOffered)', "");
  const oldWords = code(MENU).replace('"/profile/kyc": t.profile.kycIdentityVerification,', '"/profile/kyc": t.profile.verifyIdentity,');
  ok("4.7 PLANT · the menu's KYC row offered to every reader again, and its h1 words back, are each reported",
    !!menuRows({ journey: true, kycOffered: false }, noFilter).find((r) => r.href === "/profile/kyc")
      && menuRows({ journey: true, kycOffered: true }, oldWords).find((r) => r.href === "/profile/kyc")?.words !== pageName("sw"));
}

/* ══ §5 · C1 · ONE NAME FOR /profile/invite, PER READER ═══════════════════════════════════════════════════════════════ */
section("5 · C1 /profile/invite: one name per reader — the tab, the h1, and every door");
const INVITE = "src/app/profile/invite/page.tsx", NAME_HOME = "src/lib/journey/invite-name.ts", FOOTER = "src/components/layout/public-footer.tsx";
{
  const { inviteNameKey, inviteName, inviteLine } = req("../src/lib/journey/invite-name.ts") as {
    inviteNameKey: (r: { agent: boolean; paid: boolean }) => string; inviteName: (t: unknown, r: { agent: boolean; paid: boolean }) => string; inviteLine: (t: unknown, r: { agent: boolean; paid: boolean }) => string;
  };
  const READERS = [
    { who: "an agent", r: { agent: true, paid: false }, key: "agent.dashTitle" },
    { who: "an agent while players are paid", r: { agent: true, paid: true }, key: "agent.dashTitle" },
    { who: "a player while invites pay", r: { agent: false, paid: true }, key: "profile.inviteEarn" },
    { who: "a player while they pay nothing", r: { agent: false, paid: false }, key: "profile.inviteFriends" },
  ];
  ok("5.1 · RUN: the one rule (`invite-name.ts`): an agent's page is the dashboard, a paid player's \"Alika na upate zawadi\", every other player's \"Alika marafiki\"",
    READERS.every((x) => inviteNameKey(x.r) === x.key && LOCALES.every((l) => inviteName(dict[l], x.r) === word(l, x.key)))
      && inviteLine(dict.sw, { agent: false, paid: true }) === word("sw", "profile.inviteEarnSub") && inviteLine(dict.sw, { agent: false, paid: false }) === word("sw", "profile.inviteFriendsSub"));
  const mod = code(NAME_HOME);
  ok("5.1′ · the rule's home is pure — an erased type import, no directive (the `money-names.ts` shape), so the server pages, the client chrome and the hub's pure rows all read it",
    !/^\s*["']use (?:client|server)["']/m.test(mod) && [...mod.matchAll(/^import\s.*$/gm)].every((m) => /^import type /.test(m[0])));
  // The tab: generateMetadata RUN with the readers stubbed (r5g's harness), every reader.
  const deps = (l: Loc, o: { session: boolean; payable: boolean; approved: boolean | "throws" }) => ({
    getServerT: async () => ({ t: dict[l], locale: l }),
    currentSession: async () => (o.session ? { userId: "u1" } : null),
    invitePaysPlayersNow: async () => o.payable,
    db: { affiliate: { findByUserId: async () => { if (o.approved === "throws") throw new Error("read failed"); return o.approved ? { approvedAt: "2026-09-01T00:00:00Z" } : null; } } },
    isApprovedAgent: (a: { approvedAt?: string | null } | null) => !!a?.approvedAt,
    inviteName,
  });
  const cases = [
    { o: { session: true, payable: false, approved: true as const }, key: "agent.dashTitle" },
    { o: { session: true, payable: true, approved: false as const }, key: "profile.inviteEarn" },
    { o: { session: true, payable: false, approved: false as const }, key: "profile.inviteFriends" },
    { o: { session: true, payable: true, approved: "throws" as const }, key: "profile.inviteEarn" },
    { o: { session: false, payable: false, approved: true as const }, key: "profile.inviteFriends" },
  ];
  const tabs = await Promise.all(LOCALES.flatMap((l) => cases.map(async (c) => ({ l, got: titleOf(await runMeta(INVITE, deps(l, c.o))), want: word(l, c.key) }))));
  ok("5.2 · RUN: the page's tab says the reader's name through the one rule (an agent, a paid player, an unpaid one, a failed agent read, no session) in every language",
    tabs.every((x) => x.got === x.want) && has(INVITE, "return { title: inviteName(t, { agent: dashboard, paid: payable }) };"), j(tabs.filter((x) => x.got !== x.want)));
  ok("5.3 · the player body's h1, its visible title and its hero line ask the same rule; the agent's dashboard is headed by the dashboard's own name",
    has(INVITE, "const name = inviteName(t, { agent: false, paid });") && count(code(INVITE), "{name}") >= 2 && has(INVITE, "<DotSeq text={inviteLine(t, { agent: false, paid })} />")
      && has("src/app/profile/invite/agent-dashboard.tsx", '<h1 className="sr-only">{t.agent.dashTitle}</h1>'));
  // The doors: the hub (RUN), the journey menu (RUN), the journey footer (RENDERED), /profile's row (source).
  const { hubRowsFor } = req("../src/components/journey/account/hub-rows.ts") as { hubRowsFor: (v: unknown) => Array<{ rows: Array<{ id: string; label?: string }> }> };
  const member = (agent: boolean, paid: boolean) => ({ signedIn: true, userId: "u", name: "n", initials: "N", phone: "p", balance: 1, walletHeld: false, kycOffered: true, agentInStanding: agent, proposalsState: "OPEN",
    doors: { inviteVisible: true, invitePaid: paid || agent, proposalsVisible: true, agentDoorVisible: true, staffConsole: false } });
  const { PublicFooter } = req("../src/components/layout/public-footer.tsx") as { PublicFooter: unknown };
  const footerProps = { proposalsState: "OPEN", agentDoorVisible: true, inviteVisible: true, supportEmail: "d@x.t", supportPhone: "0", supportPhoneTel: "+0" };
  const inviteLink = (markup: string) => text(/<a [^>]*href="\/profile\/invite"[^>]*>([\s\S]*?)<\/a>/.exec(markup)?.[1] ?? "‹none›").trim();
  const doors = READERS.flatMap((x) => LOCALES.map((l) => {
    const name = word(l, x.key);
    const hub = word(l, hubRowsFor(member(x.r.agent, x.r.paid)).flatMap((g) => g.rows).find((r) => r.id === "invite")?.label ?? "");
    const menu = menuRows({ journey: true, invitePaid: x.r.paid || x.r.agent, inviteAgent: x.r.agent, locale: l }).find((r) => r.href === "/profile/invite")?.words;
    const footer = inviteLink(inLocale(l, h(PublicFooter as never, { ...footerProps, journeyShown: true, invitePaid: x.r.paid || x.r.agent, inviteAgent: x.r.agent } as never)));
    return { who: x.who, l, name, hub, menu, footer };
  }));
  const wrongDoors = doors.filter((d) => d.hub !== d.name || d.menu !== d.name || d.footer !== d.name);
  ok(`5.4 · RUN: for every reader, the hub's row, the journey's avatar menu and the journey's footer say the page's own name, in every language (${doors.length} doors) — an agent's "Invite & Earn" menu row and a paid player's "Alika marafiki" hub and footer are gone`,
    wrongDoors.length === 0, j(wrongDoors));
  ok("5.5 · /profile's row (both shells: a page body) says the player's page name and its line from the same rule, reading whether invites pay beside the reader's standing",
    has(PROFILE, "title={inviteName(t, { agent: false, paid: invitePayable })} subtitle={inviteLine(t, { agent: false, paid: invitePayable })}")
      && has(PROFILE, "invitePaysPlayersNow().catch(() => false),") && has(PROFILE, 'title={t.agent.dashTitle} subtitle={t.agent.dashSubtitle} href="/profile/invite" accent'));
  const classicFooter = inviteLink(inLocale("sw", h(PublicFooter as never, { ...footerProps, invitePaid: true, inviteAgent: true } as never)));
  ok("5.6 CONTROL · the classic footer keeps \"Alika marafiki\" for everybody (frozen chrome), and the classic menu its own two words",
    classicFooter === word("sw", "profile.inviteFriends")
      && menuRows({ journey: false, invitePaid: true, inviteAgent: true }).find((r) => r.href === "/profile/invite")?.words === "Alika na upate zawadi"
      && menuRows({ journey: false, invitePaid: false }).find((r) => r.href === "/profile/invite")?.words === word("sw", "profile.inviteFriends"));
  ok("5.7 · the shell hands the journey's two door answers to the journey arms alone",
    has(SHELL, "inviteAgent={inviteViewer.agentInGoodStanding} kycOffered={journeyKycOffered} invitePaid={invitePaid} /> : <TopAppBar user={topUser} proposalsState={proposalsState} inviteVisible={inviteVisible} invitePaid={invitePaid} />")
      && has(SHELL, "invitePaid={invitePaid} inviteAgent={inviteViewer.agentInGoodStanding} journeyShown /> : <PublicFooter proposalsState={proposalsState} agentDoorVisible={agentDoorVisible} inviteVisible={inviteVisible} supportEmail={SUPPORT_EMAIL()} supportPhone={SUPPORT_PHONE()} supportPhoneTel={SUPPORT_PHONE_TEL()} />"));
  // Plants: the hub back to "never a paid word"; the menu back to the classic literal for a paid reader.
  const hubOld = (v: ReturnType<typeof member>) => (v.agentInStanding ? "agent.dashTitle" : "profile.inviteFriends");
  const menuOld = code(MENU).replace('"/profile/invite": inviteName(t, { agent: inviteAgent, paid: invitePaid }),', "");
  ok("5.8 PLANT · the hub's old label (a paid player told \"Alika marafiki\") and the menu's old literal (an agent told \"Invite & Earn\") are each reported",
    word("sw", hubOld(member(false, true))) !== word("sw", "profile.inviteEarn")
      && menuRows({ journey: true, invitePaid: true, inviteAgent: true }, menuOld).find((r) => r.href === "/profile/invite")?.words !== word("sw", "agent.dashTitle"));
}

/* ══ §6 · C14 · THE JOURNEY CALLS ITS TICKETS TICKETS ══════════════════════════════════════════════════════════════════ */
section("6 · C14 the journey's doors and pages call /positions \"Tiketi zangu\" (no \"nafasi\" one tap from it)");
{
  const dial = code("src/components/markets/conviction-dial.tsx");
  ok("6.1 · after every bet the result's second door says the journey's name for the tickets page (`useJourneyOn`, read where the dial is drawn: the result opens only in the browser, after a bet)",
    has("src/components/markets/conviction-dial.tsx", 'resultData.variant === "success" ? (journeyOn ? t.journey.tabTickets : t.common.viewPositions)')
      && dial.includes("const journeyOn = useJourneyOn();") && dial.includes('import { useJourneyOn } from "@/lib/journey/journey-on";'));
  // The hook is called unconditionally at the component's top, beside useT (hooks order).
  const top = dial.slice(dial.indexOf("export function ConvictionDial("), dial.indexOf("const distFromCenter"));
  ok("6.1′ · …called once, at the component's top beside `useT` — never in a branch", count(top, "useJourneyOn()") === 1 && top.indexOf("useJourneyOn()") > top.indexOf("useT()"));
  const PERF = "src/app/positions/performance/page.tsx";
  ok("6.2 · /positions/performance in the journey: its back link and eyebrow name Tiketi zangu, and its empty state says the journey's settled sentence",
    has(PERF, "const section = journey ? t.journey.tabTickets : t.common.positions;") && has(PERF, '<BackLink fallbackHref="/positions" label={section} />')
      && has(PERF, "<PageHeader eyebrow={section} title={t.performance.title} />") && has(PERF, "title={journey ? t.journey.ticketsEmptySettled : t.performance.noPerformance}"));
  // The loading drawing lands on the same words: RENDERED for either reader.
  const { PerformanceGhost } = req("../src/app/positions/performance/performance-ghost.tsx") as { PerformanceGhost: unknown };
  const eyebrowOf = (markup: string) => text(/<p[^>]*class="[^"]*eyebrow[^"]*"[^>]*>([\s\S]*?)<\/p>/.exec(markup)?.[1] ?? "‹none›").trim();
  const ghosts = LOCALES.flatMap((l) => [true, false].map((jr) => ({ l, jr, eyebrow: eyebrowOf(inLocale(l, h(PerformanceGhost as never, { journey: jr } as never))) })));
  ok("6.3 · RENDERED: the loading drawing's eyebrow is the page's for either reader, in every language (\"TIKETI ZANGU\" in the journey)",
    ghosts.every((g) => g.eyebrow.toLowerCase() === word(g.l, g.jr ? "journey.tabTickets" : "common.positions").toLowerCase()), j(ghosts));
  const loading = code("src/app/positions/performance/loading.tsx");
  ok("6.3′ · the loading file is a server file that asks the journey answer and hands the drawing only that (R5-H's convention, as the withdraw screen's)",
    !/^\s*["']use client["']/m.test(loading) && loading.includes("const { journey } = await resolveSimpleJourney();") && loading.includes("return <PerformanceGhost journey={journey} />;")
      && /^\s*["']use client["']/m.test(code("src/app/positions/performance/performance-ghost.tsx")));
  ok("6.4 · /help's card to /positions says Tiketi zangu with the tab's ticket glyph in the journey; everybody else's is today's",
    has("src/app/help/page.tsx", "icon={journey ? <I.ticket s={15} /> : <I.portfolio s={15} />}") && has("src/app/help/page.tsx", "title={journey ? t.journey.tabTickets : t.help.myPositions}"));
  ok("6.5 · a settled round's door to its tickets says Tiketi zangu in the journey (it said \"Fungua kwenye Nafasi\")",
    has("src/app/updown/[roundId]/page.tsx", "{journey ? t.journey.tabTickets : t.market.udOpenInPositions}</Link>"));
  // Every journey door that names the tickets page, census: no positions word left in a journey arm.
  const POSITIONS_WORDS = /t\.(?:common\.viewPositions|common\.positions|help\.myPositions|market\.udOpenInPositions|error\.backToPositions|home\.myPositions)\b/;
  const CLASSIC_ONLY = ["src/components/layout/bottom-nav.tsx", "src/components/layout/top-app-bar.tsx", "src/app/positions/page.tsx", "src/app/positions/positions-ghost.tsx"];
  const loose = PLAYER_TSX.filter((f) => !CLASSIC_ONLY.includes(f)).flatMap((f) => code(f).split("\n").map((ln, i) => [f, i + 1, ln] as const))
    .filter(([, , ln]) => POSITIONS_WORDS.test(ln) && !/journey(?:On)?\s*\?\s*t\.journey\.(?:tabTickets|ticketsBack)|journey \? t\.journey\.tabTickets/.test(ln) && !/const section = journey/.test(ln));
  ok(`6.6 · every door or page line that says a "positions" word outside classic-only chrome has its journey arm ("Tiketi zangu" / "Rudi kwenye tiketi")`,
    loose.length === 0, j(loose.map(([f, n, ln]) => `${f}:${n} ${ln.trim().slice(0, 90)}`)));
  ok("6.7 PLANT · the dial's old label (\"Tazama nafasi\" in the journey) is reported by the census",
    POSITIONS_WORDS.test("resultData.variant === \"success\" ? t.common.viewPositions") && !/journey(?:On)?\s*\?\s*t\.journey\./.test("resultData.variant === \"success\" ? t.common.viewPositions"));
}

/* ══ §7 · BACK, IN THE JOURNEY, TO THE HUB ═════════════════════════════════════════════════════════════════════════════ */
section("7 · the journey's back links on the pages the Akaunti hub opens name the hub (\"‹ AKAUNTI\") and fall back to it");
{
  const JOURNEY_BACK = "<BackLink fallbackHref={journey ? \"/account\" : \"/profile\"} label={journey ? t.journey.tabAccount : ";
  const SITES: Array<[string, string]> = [
    ["src/app/notifications/page.tsx", "t.profile.title} />"],
    ["src/app/profile/invite/page.tsx", "t.common.profile} />"],
    ["src/app/profile/invite/agent-dashboard.tsx", "t.common.profile} />"],
    ["src/app/profile/kyc/page.tsx", "t.common.profile} />"],
    ["src/app/profile/responsible-gambling/page.tsx", "t.common.profile} />"],
  ];
  const off = SITES.filter(([f, tail]) => !has(f, JOURNEY_BACK + tail));
  ok("7.1 · the five pages the hub opens (Arifa, Alika, the agent's dashboard, KYC, Weka mipaka / Pumzika / Jizuie) take the hub's name and fall back to /account in the journey; everybody else's link is today's",
    off.length === 0, j(off));
  // Which of /profile's children does the hub open? Its rows say — every hub row into /profile/* or /notifications is one.
  const { hubRowsFor } = req("../src/components/journey/account/hub-rows.ts") as { hubRowsFor: (v: unknown) => Array<{ rows: Array<{ id: string; href?: string }> }> };
  const member = { signedIn: true, userId: "u", name: "n", initials: "N", phone: "p", balance: 1, walletHeld: false, kycOffered: true, agentInStanding: false, proposalsState: "OPEN",
    doors: { inviteVisible: true, invitePaid: false, proposalsVisible: true, agentDoorVisible: true, staffConsole: false } };
  const opened = new Set(hubRowsFor(member).flatMap((g) => g.rows).map((r) => r.href?.replace(/#.*$/, "")).filter((h): h is string => !!h && (h.startsWith("/profile/") || h === "/notifications")));
  const pageOf: Record<string, string> = { "/profile/invite": "src/app/profile/invite/page.tsx", "/profile/kyc": "src/app/profile/kyc/page.tsx", "/profile/responsible-gambling": "src/app/profile/responsible-gambling/page.tsx", "/notifications": "src/app/notifications/page.tsx" };
  const missed = [...opened].filter((h) => !pageOf[h] || !has(pageOf[h], "fallbackHref={journey ? \"/account\""));
  ok(`7.2 · every page a hub row opens under /profile or /notifications (${[...opened].join(", ")}) has the journey's back link — a new row's page without one is reported`,
    missed.length === 0 && opened.size === 4, j({ opened: [...opened], missed }));
  ok("7.3 CONTROL · the money pages keep \"‹ POCHI\" (R5-G: their eyebrow and back link name the Wallet, their section) and /profile's own children keep \"‹ WASIFU\" (the hub opens them through Wasifu)",
    has("src/app/wallet/withdraw/page.tsx", '<BackLink fallbackHref="/wallet" label={t.wallet.title} />') && has("src/app/profile/security/page.tsx", '<BackLink fallbackHref="/profile" label={t.profile.title} />'));
}

/* ══ §8 · C4 · THE SIGN-IN BREAK NOTICE ════════════════════════════════════════════════════════════════════════════════ */
section("8 · C4 the sign-in break notice is the break's neutral notice — tone only, its words unchanged");
const LOGIN = "src/app/auth/login/page.tsx";
{
  const src = squash(code(LOGIN));
  const cooled = /if \(sp\.cooled === "1"\) return \{ tone: "(\w+)" as const, title: t\.auth\.coolingOff, body: breakEndText \? keepText\(fill\(t\.rg\.breakActive, \{ date: breakEndText \}\), \[breakEndText\]\) : keepText\(t\.auth\.coolingOffBody\), cta: null, \};/.exec(src);
  ok("8.1 · the break's panel is `neutral`, with the same title and the same approved sentence (`rg.breakActive` and its end, or `auth.coolingOffBody`)", cooled?.[1] === "neutral", cooled?.[0] ?? "‹the arm moved›");
  ok("8.2 · the neutral arm is the kit Callout's own neutral paint (`callout.tsx`) with the break's pause glyph in its icon ink, in the alert glyph's 16px box",
    hasIn(src, ': errorPanel.tone === "neutral" ? "border-dashed border-border bg-bg-elevated/40"') && has("src/components/ui/callout.tsx", 'box: "border-dashed border-border bg-bg-elevated/40"')
      && hasIn(src, '{errorPanel.tone === "neutral" ? <I.pause s={16} /> : <I.alertCircle s={16} />}') && hasIn(src, ': errorPanel.tone === "neutral" ? "text-text-subtle"'));
  const excl = [...src.matchAll(/if \(sp\.excluded === "[\w_]+"(?: \|\| sp\.excluded === "1")?\) return \{ tone: "(\w+)" as const/g)].map((m) => m[1]);
  ok("8.3 CONTROL · the exclusion panels stay `danger`: each refuses the sign-in itself, a block the player cannot clear (R5-I's ranking) — the break is not a refusal (sign-in goes on)",
    excl.length === 3 && excl.every((t) => t === "danger"), j(excl));
  ok("8.4 · the same break is neutral everywhere it is said: the limits page's Callout, /wallet/deposit's paused notice",
    has("src/app/profile/responsible-gambling/page.tsx", '<Callout tone="neutral" size="md" glyph="pause">{endSentence(t.rg.breakActive, rg.coolingOffUntil)}</Callout>')
      && /tone="neutral"[\s\S]{0,40}layout="stack"[\s\S]{0,40}glyph="lock"/.test(code("src/app/wallet/deposit/page.tsx")));
  ok("8.5 PLANT · the amber arm back is reported", /tone: "warning" as const, title: t\.auth\.coolingOff/.test(src.replace('tone: "neutral" as const, title: t.auth.coolingOff', 'tone: "warning" as const, title: t.auth.coolingOff')) && cooled?.[1] !== "warning");
}

/* ══ §9 · C2 · THE TWO DIALOGS' ✕ ═══════════════════════════════════════════════════════════════════════════════════════ */
section("9 · C2 the Needle drawer's and the chat panel's ✕: the one CloseX, on their titles' capitals, 16px inside the edge");
{
  const { CloseX } = req("../src/components/ui/modal.tsx") as { CloseX: unknown };
  const x = renderToStaticMarkup(h(CloseX as never, { onClick: () => {}, label: "Funga", className: "" } as never));
  const BOX = Number(/\bh-(\d+)\b/.exec(x)?.[1] ? twStep(/\bh-(\d+)\b/.exec(x)![1]) : NaN);
  ok(`9.0 · CONTROL · CloseX is a ${BOX}px box (\`h-8 w-8\` on this scale) with the kit glyph`, BOX === 48 && /aria-label="Funga"/.test(x));
  const ND = "src/components/layout/needle-drawer.tsx";
  const nd = code(ND);
  const ndCls = /<CloseX onClick=\{\(\) => setOpen\(false\)\} label=\{t\("Close", "Funga", "关闭"\)\} className="([^"]+)" \/>/.exec(nd)?.[1] ?? "";
  const mt = -Number(/-mt-\[([0-9.]+)px\]/.exec(ndCls)?.[1]), mb = Number(/(?:^|\s)mb-\[([0-9.]+)px\]/.exec(ndCls)?.[1]);
  const ndCaps = capCentreEm("sora", 1.25) * 15;
  const rightPhone = twStep("4") - twStep("1"), rightSm = twStep("5") - twStep("1.5");
  ok(`9.1 · the Needle drawer: CloseX centred ${(mt + BOX / 2).toFixed(2)}px down its header row, on the 15px title's capitals (${ndCaps.toFixed(2)}; it centred 20), 16px inside the panel's edge (${rightPhone} / ${rightSm} from 640; it stood 20 / 24)`,
    Math.abs(mt + BOX / 2 - ndCaps) < 0.01 && /-mr-1(?=\s)/.test(ndCls) && /sm:-mr-1\.5/.test(ndCls) && rightPhone === 16 && rightSm === 16
      && nd.includes('font-display text-[15px] font-bold text-text leading-tight') && nd.includes('"left-0 right-0 bottom-0 rounded-t-modal px-4 pt-4"') && nd.includes("sm:p-5"), ndCls);
  ok(`9.1′ · …taking ${BOX + mt + mb}px of the row, the old box's 40, so the row is as tall as it was and nothing below moves`, BOX + mt + mb === 40, ndCls);
  const CP = "src/components/chat/ChatPanel.tsx", CSS = decommentCss(raw("src/styles/chat/chat-styles.css"));
  const cpCls = /<CloseX onClick=\{onClose\} label=\{i18n\.common\.close\} className="([^"]+)" \/>/.exec(code(CP))?.[1] ?? "";
  const cmt = -Number(/-mt-\[([0-9.]+)px\]/.exec(cpCls)?.[1]);
  const header = /\.cm-header \{([^}]*)\}/.exec(CSS)?.[1] ?? "", name = /\.cm-header-name \{([^}]*)\}/.exec(CSS)?.[1] ?? "", sub = /\.cm-header-sub \{([^}]*)\}/.exec(CSS)?.[1] ?? "";
  const nameSize = Number(/font-size:\s*([0-9.]+)px/.exec(name)?.[1]), subSize = Number(/font-size:\s*([0-9.]+)px/.exec(sub)?.[1]);
  const titles = /\.cm-header-titles \{([^}]*)\}/.exec(CSS)?.[1] ?? "";
  const block = 1.5 * nameSize + Number(/gap:\s*([0-9.]+)px/.exec(titles)?.[1]) + 1.5 * subSize;
  const cpCaps = capCentreEm("sora", 1.5) * nameSize;
  ok(`9.2 · the chat panel: CloseX at its header's top (\`self-start\`) centred ${(cmt + BOX / 2).toFixed(3)}px down the title block, on the ${nameSize}px name's capitals (${cpCaps.toFixed(3)}); the header's own 16px padding puts it 16px inside the edge`,
    /\bself-start\b/.test(cpCls) && Math.abs(cmt + BOX / 2 - cpCaps) < 0.001 && /padding:\s*16px 16px 14px/.test(header) && !/line-height/.test(name), cpCls);
  ok(`9.2′ · …taking ${(BOX + cmt).toFixed(3)}px of the ${block}px title block, so the header is as tall as it was; its own \`.cm-close\` box and rules are gone`,
    BOX + cmt <= block && !/\.cm-close\b/.test(CSS) && !code(CP).includes("cm-close"), j({ block }));
  ok("9.3 · neither dialog draws a ✕ of its own any more (no <svg> of the glyph's two strokes)",
    !/M6 6l12 12M18 6L6 18|M6 6 L18 18 M18 6 L6 18/.test(nd) && !/M6 6l12 12M18 6L6 18|M6 6 L18 18 M18 6 L6 18/.test(code(CP)));
  const r5a = raw("scripts/visual-pass-r5a.test.mts");
  ok("9.4 · R5-A's ✕ census reads the glyph in any spelling (one path or two, absolute or relative, two <line>s) and refuses both old ✕s planted back; the bell's ✕ is classified by its geometry",
    r5a.includes("const crossesIn = (src: string) => [") && r5a.includes("8.10‴ CONTROL") && r5a.includes("8.10⁗ PLANT")
      && r5a.includes("CloseX's own proportion (16/48)") && !r5a.includes("named, not changed"));
  // The bell's ✕: its proportion and place, read from its source (classic chrome, frozen).
  const bell = code("src/components/layout/notifications-panel.tsx");
  ok("9.5 · the bell's ✕ is CloseX's proportion in its 44px toolbar: a 40px box (`h-7 w-7`) with a 13px glyph (16/48 against 13/40), the bar's last control 16px inside the panel",
    bell.includes('className="ml-0.5 h-7 w-7 inline-flex items-center justify-center rounded-md text-text-subtle hover:text-text hover:bg-bg-overlay transition-colors"')
      && bell.includes("<I.x s={13} />") && bell.includes('style={{ height: 44 }}') && Math.abs(13 / twStep("7") - 16 / 48) < 0.01 && twStep("7") === 40);
}

/* ══ §10 · C9 · EVERY PLAYER DIALOG'S ✕ IS RULED ═══════════════════════════════════════════════════════════════════════ */
section("10 · C9 every player dialog's ✕ is ruled — on its title, in its header row, none, or Modal's corner over a crest (the one exception)");
{
  type Kind = "title" | "header-row" | "none" | "crest";
  const RULED: Record<string, Kind> = {
    "src/components/journey/tickets-guest-sheet.tsx": "title", "src/components/markets/market-card.tsx": "title",
    "src/components/markets/objection-dialog.tsx": "title", "src/components/markets/share-button.tsx": "title", "src/components/rg/reality-check.tsx": "title",
    "src/components/markets/bet-confirm-modal.tsx": "header-row", "src/components/markets/sell-confirm-modal.tsx": "header-row", "src/components/ui/modal.tsx": "header-row",
    "src/components/layout/wallet-sheet.tsx": "none", "src/components/onboarding/first-visit-primer.tsx": "none",
    "src/components/markets/operation-result-modal.tsx": "crest", "src/components/markets/win-celebration.tsx": "crest",
  };
  /** A JSX opening tag's text from `at` to its closing `>`, braces and strings respected (an `=>` is no end). */
  const openingTag = (src: string, at0: number) => {
    let depth = 0, i = at0, q = "";
    for (; i < src.length; i++) {
      const c = src[i];
      if (q) { if (c === "\\") i++; else if (c === q) q = ""; continue; }
      if (c === '"' || (depth > 0 && (c === "'" || c === "`"))) { q = c; continue; }
      if (c === "{") depth++; else if (c === "}") depth--; else if (c === ">" && depth === 0) break;
    }
    return src.slice(at0, i + 1);
  };
  const judge = (file: string, src: string, kind: Kind | undefined) => {
    const modals = [...src.matchAll(/<Modal(?=[\s>])/g)].map((m) => [openingTag(src, m.index ?? 0), openingTag(src, m.index ?? 0)] as const);
    if (!modals.length) return "no <Modal>";
    if (!kind) return "unruled";
    const noCorner = modals.every((m) => /showClose=\{false\}/.test(m[1]));
    if (kind === "title") return !noCorner && /kp-modal-title|kp-jsheet__title|id="reality-check-title"/.test(src) ? "" : "a titled dialog without its title on the corner ✕";
    if (kind === "header-row") return noCorner && /<CloseX\b/.test(src.slice(src.indexOf("<Modal"))) ? "" : "a header-row ✕ that is not CloseX in the row";
    if (kind === "none") return noCorner && !/<CloseX\b/.test(src) ? "" : "a dialog ruled without a ✕ that draws one";
    // The exception: Modal's corner ✕, and the panel's first drawn thing a crest or seal, before any title.
    const body = src.slice(src.indexOf("<Modal"));
    const crestAt = body.search(/className=\{`mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full|<StruckSeal \/>/);
    const titleAt = body.search(/<h2\b/);
    return !noCorner && crestAt > 0 && titleAt > crestAt && !/kp-modal-title/.test(src) ? "" : "a crest-first exception whose panel does not open on its crest";
  };
  const hosts = PLAYER_TSX.filter((f) => /<Modal(?=[\s>])/.test(code(f)));
  const verdicts = hosts.map((f) => ({ f, kind: RULED[f], problem: judge(f, code(f), RULED[f]) }));
  const bad = verdicts.filter((v) => v.problem);
  ok(`10.1 · every player file that hosts a <Modal> is ruled and holds its rule (${hosts.length}: ${Object.entries(RULED).reduce((a, [, k]) => ({ ...a, [k]: (a[k] ?? 0) + 1 }), {} as Record<string, number>) && ["title", "header-row", "none", "crest"].map((k) => `${Object.values(RULED).filter((x) => x === k).length} ${k}`).join(", ")})`,
    bad.length === 0 && hosts.length === Object.keys(RULED).length, j(bad));
  ok("10.2 · the exception is written where it applies: both crest-first dialogs say why their ✕ keeps Modal's corner",
    raw("src/components/markets/operation-result-modal.tsx").includes("THE ✕ OF A DIALOG THAT OPENS ON A CREST STAYS IN MODAL'S CORNER") && raw("src/components/markets/win-celebration.tsx").includes("the one ruled exception to F20"));
  // Modal's corner, measured: 16px inside the top and right edges, centred 40px down.
  const corner = /showClose && <CloseX onClick=\{onClose\} label=\{t\.common\.close\} className="absolute right-3 top-3" \/>/.test(code("src/components/ui/modal.tsx"));
  ok(`10.3 · the corner is Modal's own (\`absolute right-3 top-3\`: ${twStep("3")}px in, centred ${twStep("3") + 24}px down) — where the crest-first dialogs keep it`, corner && twStep("3") === 16);
  // Plants: a titled dialog claiming the exception; a new dialog nobody ruled; the crest moved under its title.
  const shareAsCrest = judge("src/components/markets/share-button.tsx", code("src/components/markets/share-button.tsx"), "crest");
  const fresh = judge("src/components/x/new-dialog.tsx", '<Modal open={o} onClose={c} ariaLabel="x"><p>hi</p></Modal>', undefined);
  const ormSrc = code("src/components/markets/operation-result-modal.tsx");
  const crestLast = judge("src/components/markets/operation-result-modal.tsx", ormSrc.replace(/<h2\b/, "<h2 data-x").replace("<Modal", "<Modal><h2 data-first>t</h2>"), "crest");
  ok("10.4 PLANT · a titled dialog ruled a crest, a new dialog nobody ruled, and a crest dialog whose title comes first are each reported",
    !!shareAsCrest && fresh === "unruled" && !!crestLast, j({ shareAsCrest, fresh, crestLast }));
}

/* ══ §11 · C3 · THE GOLD CENSUS COUNTS THE WARNING FAMILY ═════════════════════════════════════════════════════════════ */
section("11 · C3 the gold census (R5-C's) counts the warning family in every spelling, and every file that paints it is ruled");
{
  const r5c = raw("scripts/visual-pass-r5c.test.mts");
  const lit = (kind: string) => {
    const m = new RegExp(`push\\("${kind}", /(.+)/g\\);`).exec(r5c);
    return m ? new RegExp(m[1], "g") : /$^/g;
  };
  const VAR = lit("var"), TWR = lit("tw");
  // The review's own net (S/review6/C/s/c3-warning-gold.mjs): every warning-family paint in player code.
  const WARN = /(?<![\w-])(?:[a-z0-9-]+:)*(?:text|bg|border(?:-[tblrxyse])?|ring|fill|stroke|from|via|to|shadow|outline|decoration|divide)-warning(?:-bg|-border|-500)?(?:\/[\w.[\]]+)?(?![\w-])|var\(--warning(?:-bg|-border|-500)?\)/g;
  const files = walk("src", /\.(tsx|ts|css)$/).filter((f) => !OUT.test(f));
  const missedBy = (V: RegExp, T: RegExp) => files.flatMap((f) => {
    const src = f.endsWith(".css") ? decommentCss(raw(f)) : decomment(raw(f));
    return src.split("\n").flatMap((ln, i) => [...ln.matchAll(WARN)].filter((m) => ![...ln.matchAll(V), ...ln.matchAll(T)].some((c) => (c.index ?? 0) <= (m.index ?? 0) && (m.index ?? 0) < (c.index ?? 0) + c[0].length)).map((m) => `${f}:${i + 1}:${m[0]}`));
  });
  const missed = missedBy(VAR, TWR);
  ok(`11.1 · the census's two patterns (read from R5-C's suite) cover every warning-family paint in player code — \`--warning\`, \`-500\`, \`-bg\`, \`-border\`, as variables and as utilities`, missed.length === 0, missed.slice(0, 6).join(" | "));
  const old = missedBy(/var\(\s*--warning-fg\s*[,)]/g, /(?<![\w-])(?:[a-z0-9-]+:)*(?:text|bg|border(?:-[tblrxyse])?|ring|fill|stroke|from|via|to|shadow|outline|decoration|accent|caret|divide|placeholder)-warning-fg(?:\/[\w.[\]]+)?(?![\w-])/g);
  ok(`11.2 PLANT · the census as it stood (\`--warning-fg\` alone) misses ${old.length} of them — the review's 61`, old.length === 61, String(old.length));
  const NEW = ["src/app/auth/forgot-password/page.tsx", "src/app/profile/account/privacy-request-form.tsx", "src/components/rg/limit-usage.tsx", "src/components/ui/maintenance-badge.tsx"];
  ok("11.3 · the four files the census now sees are registered, each with its ruling (a rate-limit wait, an erasure's caution, the one limit ramp's caution step, the maintenance flag)",
    NEW.every((f) => new RegExp(`"${f.replace(/[.[\]]/g, "\\$&")}": \\[\\d+, "[^"]{20,}"\\]`).test(r5c)));
}

/* ══ §12 · C10 · THE JOURNEY BELL DRAWS A NOTICE AS /notifications DOES ════════════════════════════════════════════════ */
section("12 · C10 the journey's bell draws a notice with the page's renderers; the classic bell is today's (frozen chrome)");
{
  const BELL = "src/components/layout/notifications-panel.tsx", PAGE = "src/app/notifications/page.tsx";
  ok("12.1 · the journey arm: the title whole (no one-line cut), its clauses by `DotSeq` and its money by `moneyRuns`; the body's figures whole and its last two words together (`moneySentence`) — /notifications' own renderers",
    has(BELL, "{journey ? <DotSeq text={pickTitle(n, locale)} renderPart={moneyRuns} /> : pickTitle(n, locale)}") && has(BELL, "{journey ? moneySentence(pickBody(n, locale)) : pickBody(n, locale)}")
      && has(PAGE, "<DotSeq text={pickTitle(n)} renderPart={moneyRuns} />") && has(PAGE, "{moneySentence(pickBody(n))}"));
  ok("12.2 · a wrapping title keeps its dot on its first line (`items-start`, the dot's 4px the line's centre: (13 × 1.25 − 8) / 2 ≈ 4.1)",
    has(BELL, '<div className={journey ? "flex items-start justify-between gap-2" : "flex items-center justify-between gap-2"}>') && Math.abs((13 * 1.25 - 8) / 2 - twStep("1")) < 0.2);
  ok("12.3 CONTROL · the classic bell's class strings are today's, byte for byte (frozen chrome)",
    has(BELL, '"font-display text-body-sm font-semibold text-text truncate leading-tight"') && has(BELL, '"flex items-center justify-between gap-2"') && has(BELL, '"mt-0.5 text-label text-text-muted leading-snug"'));
  ok("12.4 PLANT · the journey arm drawing the plain title again is reported", !hasIn(code(BELL).replace("<DotSeq text={pickTitle(n, locale)} renderPart={moneyRuns} />", "pickTitle(n, locale)"), "{journey ? <DotSeq text={pickTitle(n, locale)} renderPart={moneyRuns} />"));
}

/* ══ §13 · C11 · RIGHT-ALIGNED TRACKED LABELS END ON THEIR COLUMN'S EDGE ═══════════════════════════════════════════════ */
section("13 · C11 every right-aligned tracked label ends on its column's edge (F19's `kp-track-end`) or on a glyph");
{
  const TRACKED = /(?<![\w-])(?:eyebrow|tracking-\[0?\.\d+em\]|tracking-wide|tracking-wider|tracking-widest)(?![\w-])/;
  const RIGHT = /(?<![\w-])(?:[a-z]+:)?text-right(?![\w-])/;
  /** Labels that end on a glyph, not a tracked letter: their edge is the glyph's. */
  const GLYPH_END: Array<[string, string]> = [
    ["src/components/markets/conviction-dial.tsx", "font-mono text-micro uppercase eyebrow text-text-subtle mb-1.5"],
    ["src/components/updown/updown-card.tsx", "flex items-center justify-end gap-1 font-mono text-micro font-bold uppercase eyebrow"],
  ];
  const scan = (file: string, src: string) => {
    const out: string[] = [];
    const stack: string[] = [];
    for (const m of src.matchAll(/<([a-zA-Z][\w.]*)\b([^<>]*?)(\/?)>|<\/([a-zA-Z][\w.]*)>/g)) {
      if (m[4]) { stack.pop(); continue; }
      const c = /className=(?:"([^"]*)"|\{`([^`]*)`\}|\{"([^"]*)"\})/.exec(m[2] ?? "");
      const cls = c ? (c[1] ?? c[2] ?? c[3] ?? "") : "";
      if (cls && TRACKED.test(cls) && (RIGHT.test(cls) || RIGHT.test(stack[stack.length - 1] ?? "")) && !/\bkp-track-end\b/.test(cls)
        && !GLYPH_END.some(([f, s]) => f === file && cls.includes(s))) out.push(`${file}: ${cls.slice(0, 80)}`);
      if (m[3] !== "/") stack.push(cls);
    }
    return out;
  };
  const loose = PLAYER_TSX.flatMap((f) => scan(f, code(f)));
  const SITES = [BET, SELL, "src/app/wallet/withdraw/page.tsx", "src/app/wallet/wallet-client.tsx", "src/app/updown/history/page.tsx", "src/app/updown/[roundId]/page.tsx",
    "src/components/updown/price-hero.tsx", "src/components/updown/round-countdown.tsx", "src/app/positions/performance/page.tsx"];
  const taken = SITES.reduce((n, f) => n + [...code(f).matchAll(/\bkp-track-end(?!-)/g)].length, 0);
  // Re-pinned 10 → 17 (round 7, R7-C, 2026-10-10): R7-C's wider census (test:visual-pass-r7c §2, every way a label can end
  // on an edge) took back seven more in these files — the round page's last-round door, its split bar's DOWN label and its
  // proof's reference, the round clock's digits (the class in both arms of its pulse), and /positions/performance's caption
  // and streak label. This section's own reading (`text-right`) still finds none loose.
  ok(`13.1 · no right-aligned tracked label keeps its trailing tracking: ${taken} labels in ${SITES.length} files take it back (the review's 8 and two more the census found — the round's players, the Wallet history's status — and round 7's seven); two end on a glyph`,
    loose.length === 0 && taken === 17, j(loose));
  ok("13.2 · the 0.08em label takes back 0.08em (a `--track-end` step of its own, beside F19's 0.16 and 0.10)",
    /\.kp-track-end--08 \{ --track-end: 0\.08em; \}/.test(decommentCss(raw("src/app/globals.css"))) && has("src/app/positions/performance/page.tsx", "tracking-[0.08em] text-text-muted kp-track-end kp-track-end--08"));
  const planted = scan(BET, code(BET).replace("text-text-subtle mb-1 kp-track-end", "text-text-subtle mb-1"));
  ok("13.3 PLANT · the bet confirm's STAKE label without its take-back is reported", planted.length === 1, j(planted));
}

/* ══ §14 · C16 C17 C18 ═════════════════════════════════════════════════════════════════════════════════════════════════ */
section("14 · C16 one pill size in the board card's row · C17 the classic held question whole, and the win seal's · C18 the tickets ghost's pills 18px");
{
  const CARD = "src/components/markets/market-card.tsx";
  const card = squash(code(CARD));
  ok("14.1 · C16: the status pill and the signal pill state the row's one size and box (`xs`, `metrics=\"status\"`)",
    card.includes('<Chip size="xs" metrics="status" variant={TONE_CHIP[STATUS_TONE[statusWord].player]} dot={live}>') && card.includes('<Chip size="xs" metrics="status" aria-label={signal.label}'));
  const { Chip } = req("../src/components/ui/chip.tsx") as { Chip: unknown };
  const box = (props: Record<string, unknown>) => {
    const m = renderToStaticMarkup(h(Chip as never, props as never, "x"));
    return `${/min-height:(\d+)px/.exec(m)?.[1]}/${/font-size:([0-9.]+)px/.exec(m)?.[1]}`;
  };
  const status = box({ size: "xs", metrics: "status", variant: "pending" });
  const signals = ["hot", "pending", "signal", "new"].map((v) => box({ size: "xs", metrics: "status", variant: v }));
  ok(`14.2 · RENDERED: every signal pill is the status pill's box and type (${status}) whatever its colour`, signals.every((s) => s === status) && status === "23/9", j({ status, signals }));
  const before = ["hot", "signal"].map((v) => box({ variant: v }));
  ok(`14.2′ CONTROL · the default size drew two boxes in that row: ${before.join(" and ")} against the status pill's ${status}`, before.every((b) => b !== status) && before[0] !== before[1]);
  const PC = "src/components/markets/position-card.tsx";
  ok("14.3 · C17: the classic position card's question is whole (no clamp), as its journey twin's — the board's two-line clamp is for browsing cards",
    has(PC, '<p className="font-display text-[15px] font-semibold leading-tight tracking-[-0.005em] text-text text-balance">') && !/line-clamp/.test(code(PC))
      && !/line-clamp/.test(code("src/components/journey/tickets/ticket-card.tsx")));
  const { TicketsGhost } = req("../src/components/journey/tickets/tickets-ghost.tsx") as { TicketsGhost: unknown };
  const ghost = renderToStaticMarkup(h(TicketsGhost as never, { t: dict.sw } as never));
  const pills = [...ghost.matchAll(/class="(h-\[[0-9.]+px\]|h-\d+) w-\[(?:64|96)px\] rounded-pill bg-bg-overlay"/g)].map((m) => m[1]);
  const cardPill = box({ size: "sm", metrics: "base", variant: "yes" });
  ok(`14.4 · C18 RENDERED: the ghost's card pills are the ticket card's pills' 18px (${cardPill.split("/")[0]}px, \`Chip size="sm"\`) — 8 pills in 4 cards`,
    pills.length === 8 && pills.every((p) => p === "h-[18px]") && cardPill.startsWith("18/"), j(pills));
  ok("14.4′ CONTROL · the old `h-5` was 24px on this scale — 6px taller than the pills it stood for", twStep("5") === 24);
  ok("14.5 PLANT · the clamp back on the held question is reported", /line-clamp/.test(code(PC).replace("tracking-[-0.005em] text-text text-balance", "tracking-[-0.005em] text-text line-clamp-2 text-balance")));
  // C17's siblings: the win seal names the market the player just won on — it had the same two-line clamp, with no tap
  // behind it at all (the seal closes itself), so a long question's end was simply lost.
  const WIN = "src/components/markets/win-celebration.tsx";
  ok("14.6 · C17's sibling: the win seal's market name is whole (no clamp), balanced, its figures kept (`keepFigures`, R5-E's F1 F4)",
    has(WIN, '<p className="g-settle mt-2.5 text-[13px] text-text-subtle text-balance" style={{ "--i": 4 } as CSSProperties} > {keepFigures(payload.label)} </p>')
      && !/\bline-clamp-\d\b|\btruncate\b/.test(code(WIN)));
  /* The census: every `line-clamp-N` left in player code, each ruled — a browsing list's, or a compact line whose tap opens
     the whole (the board's Q6; wallet-client.tsx's compact-clips/full-wraps idiom). The card and the moment that hold the
     player's own money without a way to the whole are clamp-free: the position card (C17), the ticket card (G3), the bet
     confirm (E-236) and the win seal (C17's sibling). */
  const CLAMP_RULED: Record<string, string> = {
    "src/app/fairness/page.tsx": "the resolved table's market names — a browsing list; each name is its market's link",
    "src/app/live/pulse-grid.tsx": "the /live board's questions — browsing cards (Q6), each its market's link",
    "src/app/positions/performance/page.tsx": "the best win's market name, inside its link to the market — the page's own tap-to-whole note",
    "src/app/proposals/page.tsx": "a proposal's description under its whole title — a browsing board; the proposal's page holds it whole",
  };
  const clampers = PLAYER_TSX.filter((f) => /\bline-clamp-\d\b/.test(code(f)));
  ok(`14.7 · every \`line-clamp\` left in player code is ruled (${clampers.length} files): a browsing list's or a linked compact line's — never a held or won question`,
    clampers.length === Object.keys(CLAMP_RULED).length && clampers.every((f) => !!CLAMP_RULED[f]), j(clampers));
  ok("14.7′ PLANT · the win seal clamped again is an unruled clamp", /\bline-clamp-\d\b/.test(code(WIN).replace("text-text-subtle text-balance", "text-text-subtle line-clamp-2")) && !CLAMP_RULED[WIN]);
}

/* ══ §16 · ONE GAP FOR A PAIR OF LARGE BUTTONS ═════════════════════════════════════════════════════════════════════════ */
section("16 · one gap between two large buttons, stacked or side by side: 12px, the override scale's `gap-2` (the coordinator's item from R5-K)");
{
  /** Every element whose own children hold two or more `btn-lg` controls, with its gap (a class, or a pair class's CSS gap). */
  const pairsIn = (file: string, src: string) => {
    const out: Array<{ file: string; line: number; cls: string; gap: string }> = [];
    const stack: Array<{ tag: string; cls: string; line: number; lg: number }> = [];
    const re = /<([a-zA-Z][\w.]*)\b((?:[^<>{}]|\{(?:[^{}]|\{[^{}]*\})*\})*?)(\/?)>|<\/([a-zA-Z][\w.]*)>/g;
    for (const m of src.matchAll(re)) {
      if (m[4]) {
        for (let i = stack.length - 1; i >= 0; i--) if (stack[i].tag === m[4]) {
          const el = stack[i];
          if (el.lg >= 2 && /\b(?:flex|grid)\b|kp-wsheet__pair/.test(el.cls)) {
            const g = /(?:^|\s)gap-([\w.[\]]+)(?=\s|$)/.exec(el.cls)?.[1] ?? (/kp-wsheet__pair/.test(el.cls) ? "css" : "none");
            out.push({ file, line: el.line, cls: el.cls, gap: g });
          }
          stack.length = i; break;
        }
        continue;
      }
      const cls = /className=(?:"([^"]*)"|\{`([^`]*)`\})/.exec(m[2] ?? "");
      const c = cls ? (cls[1] ?? cls[2] ?? "") : "";
      if (/\bbtn-lg\b/.test(m[2] ?? "") && stack.length) stack[stack.length - 1].lg++;
      if (m[3] !== "/") stack.push({ tag: m[1], cls: c, line: src.slice(0, m.index).split("\n").length, lg: 0 });
    }
    return out;
  };
  const pairs = PLAYER_TSX.flatMap((f) => pairsIn(f, code(f)));
  const PAIR_CSS_GAP = /\.kp-wsheet__pair \{[^}]*gap:\s*var\(--sp-3\)/.test(decommentCss(raw("src/app/globals.css"))) && /--sp-3:\s*12px/.test(raw("src/app/globals.css"));
  const off = pairs.filter((p) => !(p.gap === "2" || (p.gap === "css" && PAIR_CSS_GAP)));
  ok(`16.1 · every pair of large buttons stands 12px apart — \`gap-2\` (${twStep("2")}px on this scale) or the Wallet sheet's pair class (\`--sp-3\`) — ${pairs.length} pairs: the receipt's and the deposit return's, both confirms', the market's and Up & Down's two sides, the reality check's, the mail-link pages'`,
    off.length === 0 && pairs.length >= 10 && twStep("2") === 12, j(off.map((p) => `${p.file}:${p.line} gap-${p.gap}`)));
  ok("16.2 · the two money pages the coordinator named say it the same way, and the receipt's ghost draws its pair on the same gap",
    has("src/app/wallet/deposit/return/page.tsx", '<div className="flex flex-col sm:flex-row gap-2">') && has("src/app/wallet/receipt/[id]/page.tsx", '<div className="flex flex-col sm:flex-row gap-2">')
      && has("src/app/wallet/receipt/[id]/loading.tsx", '<div className="flex flex-col sm:flex-row gap-2" aria-hidden>'));
  const planted = pairsIn("src/app/wallet/deposit/return/page.tsx", code("src/app/wallet/deposit/return/page.tsx").replace('<div className="flex flex-col sm:flex-row gap-2">', '<div className="flex flex-col sm:flex-row gap-2.5">'));
  ok("16.3 PLANT · the deposit return's old 10px pair (`gap-2.5`, a stock key off the scale) is reported", planted.some((p) => p.gap === "2.5"), j(planted));
  // The return's ghost: R5-K rebuilds it to land on the page (merged beside this round). Whatever row of two it draws must
  // stand on the page's 12px, so the merge cannot bring the old 10px back through the ghost.
  const RG = code("src/app/wallet/deposit/return/loading.tsx");
  const ghostRows = [...RG.matchAll(/className="([^"]*(?:sm:flex-row|grid-cols-2)[^"]*)"/g)].map((m) => m[1]);
  ok(`16.4 · the deposit return's ghost draws no off-scale gap, and any row of two it draws stands on the page's \`gap-2\` (${ghostRows.length ? ghostRows.join(" | ") : "today it draws one bar; R5-K's rebuild draws the pair"})`,
    !/\bgap-2\.5\b/.test(RG) && ghostRows.every((c) => /(?:^|\s)gap-2(?=\s|$)/.test(c)), j(ghostRows));
}

/* ══ §15 · NO DICTIONARY WORD CHANGED ══════════════════════════════════════════════════════════════════════════════════ */
section("15 · composition only: the dictionary is the tip's, byte for byte");
{
  let head = "";
  try { head = execFileSync("git", ["show", "HEAD:src/lib/i18n-dict.ts"], { encoding: "utf8", maxBuffer: 64 << 20 }).replace(/\r\n/g, "\n"); } catch { head = "‹git unavailable›"; }
  ok("15.1 · src/lib/i18n-dict.ts is the commit's own (every word above is an existing key)", head === raw("src/lib/i18n-dict.ts"));
}

console.log(`\n${pass} passed, ${fails.length} failed`);
if (fails.length) {
  console.log("\nFAILURES:");
  for (const f of fails) console.log(`  ✗ ${f}`);
  process.exit(1);
}
