/**
 * test:card-choices — A CARD'S TWO CHOICES SAY THE SIDE AND NOTHING ELSE, on every card, in both shells.
 *
 * Ali, 2026-10-19 (COMPLIANCE-DECISIONS § "2026-10-19 · Up & Down and the market cards (MOBILE-VISUAL U43): a live line
 * inside the round card, the slim card, visible filters, no odds on any card choice (owner rulings)", item 4):
 *   "for market cards we can remove odds please, keep yes and no only … let's do it in this and the Vodacom plan"
 * and then "Every card, both shells". DESIGN_AUTHORITY §C3 holds the rule.
 *
 * What it reads (the source of every surface that draws a card's choices, decommented — a comment may quote the old
 * wording; only code counts):
 *   §1 the market card's YES / NO buttons (/markets, results, watchlist, the home's featured card, similar markets);
 *   §2 the home page's question rows (`landing-hero.tsx` QuestionRow) — their two side links;
 *   §3 /live's wall card (`pulse-grid.tsx` PulseCard) — the two side words under its bar (its Up & Down tiles included);
 *   §4 the Vodacom journey card — the pick faces (`card-face.ts`) and the words a pick prints (`journey-card.tsx`);
 *   §5 the dictionary — no locale keeps a key that printed a figure on a choice.
 * Up & Down's own choices (the board card, the quick-bet control, the round page's two-way control) carry no multiplier
 * since 2026-10-14; `test:updown-pricing` §3/§5/§6/§8 holds them, so they are not re-read here.
 *
 * ⭐ Every matcher is shown catching the pre-ruling spelling (the "-control" lines), so a green run is not a matcher that
 * cannot see. `red:card-choices` plants each defect in the real files and requires its own check to fail.
 *
 * Run: npm run test:card-choices
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decomment } from "./lib/decomment.mts";
import { dict } from "../src/lib/i18n-dict";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => decomment(readFileSync(join(ROOT, p), "utf8"));

let failed = 0;
let passed = 0;
const check = (label: string, cond: boolean, extra = "") => {
  if (cond) { passed++; console.log(`PASS ${label}`); }
  else { failed++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};

/** A figure on a choice, in any of the spellings it shipped in: "@ {pct}%", " @ " text, an interpolated percent. */
const FIGURE = /@\s*\{|"\s*@\s*"|\{[^{}]*(?:yesPct|Pct)\}\s*%|≈|\{mult\}|×/;

/** The inner JSX of each element opened by `open` (a regex for the opening tag) up to its own closing tag. */
function inners(src: string, open: RegExp, tag: string): string[] {
  const out: string[] = [];
  const re = new RegExp(open.source, "g");
  for (let m = re.exec(src); m; m = re.exec(src)) {
    const from = m.index + m[0].length;
    const to = src.indexOf(`</${tag}>`, from);
    if (to > from) out.push(src.slice(from, to));
  }
  return out;
}

// ── §1 · the market card's buttons ────────────────────────────────────────────────────────────────────────────────
console.log("§1 · the market card");
{
  const card = read("src/components/markets/market-card.tsx");
  const buttons = inners(card, /<button type="button"[^>]*className="btn btn-(?:yes|no) btn-md">/, "button");
  check("1.0 the card's two choice buttons are found (the reach of §1)", buttons.length === 2, `${buttons.length} found`);
  const withFigure = buttons.filter((b) => FIGURE.test(b));
  check("1.1 ⛔ neither YES nor NO button prints a figure (no \"@ n%\", in any state)", buttons.length === 2 && withFigure.length === 0,
    withFigure.map((b) => b.trim().slice(0, 80)).join(" | "));
  const arias = card.match(/aria-label=\{t\.market\.backSideAriaNoPrice\.replace\("\{side\}", sideWord\(t, "(?:YES|NO)", productLine\)\)\}/g) ?? [];
  check("1.2 ⛔ nor does either button's accessible name: both are \"Back {side}\"", arias.length === 2 && !/backSideAria\.replace/.test(card),
    `${arias.length} side-word names`);
}

// ── §2 · the home's question rows ─────────────────────────────────────────────────────────────────────────────────
console.log("§2 · the home rows");
{
  const hero = read("src/components/home/landing-hero.tsx");
  const row = hero.slice(hero.indexOf("function QuestionRow("), hero.indexOf("export function LandingHero("));
  check("2.0 the row's source is found (the reach of §2)", row.length > 200 && /className="kp-qrow"/.test(row));
  const links = inners(row, /<Link [^>]*className="btn btn-(?:yes|no) btn-md kp-qrow__btn"[^>]*>/, "Link");
  check("2.1 ⛔ neither side link prints a figure, priced or not", links.length === 2 && links.every((l) => !FIGURE.test(l)),
    `${links.length} links: ${links.map((l) => l.trim().slice(0, 60)).join(" | ")}`);
  check("2.2 ⛔ and their accessible names are the side words alone",
    /const yesAria = t\.market\.backSideAriaNoPrice\.replace\("\{side\}", yesWord\);/.test(row)
    && /const noAria = t\.market\.backSideAriaNoPrice\.replace\("\{side\}", noWord\);/.test(row));
}

// ── §3 · /live's wall card ────────────────────────────────────────────────────────────────────────────────────────
console.log("§3 · /live");
{
  const live = read("src/app/live/pulse-grid.tsx");
  const pulse = live.slice(live.indexOf("function PulseCard("));
  const sides = [...pulse.matchAll(/<span className="font-bold text-(?:yes|no)-300">([\s\S]*?)<\/span>(?=\s*(?:<span|<\/div>))/g)].map((m) => m[1]);
  check("3.0 the card's two side labels are found (the reach of §3)", sides.length === 2, `${sides.length} found`);
  check("3.1 ⛔ the two side words under the bar carry no figure (\"Up @ 75%\" is \"Up\", \"YES @ 37%\" is \"YES\")",
    sides.length === 2 && sides.every((s) => !FIGURE.test(s)), sides.map((s) => s.trim().slice(0, 70)).join(" | "));
}

// ── §4 · the Vodacom journey card ─────────────────────────────────────────────────────────────────────────────────
console.log("§4 · the journey card");
{
  const face = read("src/lib/journey/card-face.ts");
  const type = face.slice(face.indexOf("export type PickFace"), face.indexOf(";", face.indexOf("export type PickFace")));
  check("4.0 the PickFace type is found (the reach of §4)", type.length > 20);
  check("4.1 ⛔ no pick face carries a figure (no win, thin or over-the-cap kind, no mult)",
    !/"win"|"thin"|"overCap"|mult/.test(type), type.replace(/\s+/g, " "));
  const card = read("src/components/journey/cards/journey-card.tsx");
  const words = card.slice(card.indexOf("function pickWords("), card.indexOf("}", card.indexOf("switch (face.kind)")) + 1);
  check("4.2 ⛔ a pick prints a fact about the pool or nothing — never a figure",
    words.length > 40 && !FIGURE.test(words) && !/cardWin|cardThin|cardOverCap/.test(card), words.replace(/\s+/g, " ").slice(0, 160));
}

// ── §5 · the dictionary ───────────────────────────────────────────────────────────────────────────────────────────
console.log("§5 · the dictionary");
{
  const RETIRED: Array<[keyof typeof dict.en, string]> = [["journey", "cardWin"], ["journey", "cardThin"], ["journey", "cardOverCap"], ["market", "backSideAria"]];
  const left = (["en", "sw", "zh"] as const).flatMap((l) =>
    RETIRED.filter(([ns, k]) => k in ((dict[l] as Record<string, object>)[ns as string] ?? {})).map(([ns, k]) => `${l}.${String(ns)}.${k}`));
  check("5.1 ⛔ no locale keeps a key that printed a figure on a choice (cardWin, cardThin, cardOverCap, backSideAria)",
    left.length === 0, left.join(", "));
}

// ── controls: each matcher catching the pre-ruling spelling ────────────────────────────────────────────────────────
console.log("controls");
check("C.1-control the market card's old suffix IS a figure", FIGURE.test('{sideWord(t, "YES", productLine)}{showPrice && <span className="font-mono text-[11.5px]"> @ {yesPct}%</span>}'));
check("C.2-control the home row's old suffix IS a figure", FIGURE.test('{yesWord}{price.kind === "priced" && <span className="kp-qrow__at">{" @ "}{price.yesPct}%</span>}'));
check("C.3-control /live's old label IS a figure", FIGURE.test('{sideWord(t, "YES", productLine)} <span className="opacity-75">@ {price.yesPct}%</span>'));
check("C.4-control the journey's old thin line IS a figure, and its old win line IS a retired key",
  FIGURE.test('<DotSeq text={t.journey.cardThin.replace("{mult}", face.mult)} stack />')
    && /cardWin|cardThin|cardOverCap/.test("return winWords(t.journey.cardWin, face.mult);"));
check("C.5-control a plain side word is NOT a figure", !FIGURE.test('{sideWord(t, "YES", productLine)}') && !FIGURE.test("{yesWord}"));

console.log(`\nCARD CHOICES — ${failed === 0 ? `all ${passed} checks passed` : `${failed} failed, ${passed} passed`}`);
process.exitCode = failed === 0 ? 0 : 1;
