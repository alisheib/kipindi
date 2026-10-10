/**
 * ROUND 5 OF THE VISUAL PASS, HELPER I (2026-10-09) — EVERY STATE IN ITS OWN INK. R5-C's gold audit found three things that
 * were not gold and left them; this is them, each with its siblings.
 *
 *   npx tsx scripts/visual-pass-r5i.test.mts        (npm run test:visual-pass-r5i)
 *
 * The owner's rule (Ali, 2026-10-09): consistency and perfection in each move. R5-C's one rule for colour, extended to the
 * state inks:
 *   · THE BETTING PAIR NAMES A SIDE (DESIGN_AUTHORITY §B2/§B2a). `--yes-*` / `--no-*` (and the YES/NO buttons, chips and
 *     bars) paint the two sides of a stake, a probability or price of a side, an outcome (UP wins), a position's side —
 *     and a LOSS, by the owner's ruling (`STATUS_TONE_EXCEPTIONS.LOSS`: "a lost bet is betting semantics").
 *   · AN APP STATE WEARS THE APP-STATE FAMILY: success `--success-*` (hue 166), failure and destruction `--danger-*` (hue
 *     25), waiting royal, terminal slate, amber only where somebody must act (§B11). Never the betting pair, whose hues
 *     (152 and 22) sit close enough to be mistaken for them.
 *   · A REFUSAL ANSWERS AT THE FEEDBACK LAW'S ONE FORM (§F2/§F3): the registry ranks it (`refusalVariant`); a refusal the
 *     player can fix is the calm `factual` toast and never a popup; a hard block or a fault is `danger`, with the result
 *     dialog where it must be acknowledged. The Sell button answered so first (S6 A8h).
 *
 *   §1  THE BETTING-PAIR CENSUS — every use of the pair in the player's code, counted per file and registered with its
 *       ruling; a new use anywhere fails until it is ruled (with plants proving the scanner sees each spelling, and decoys
 *       — the danger and success families, claret — that it must not)
 *   §2  I-1 · the app states that wore the pair, fixed with their siblings (crests, the error mark, destructive controls,
 *       field errors, success marks, the auth eyebrow, the RG hero, the bell, a net, a balance's move, a rate, a loader)
 *   §3  I-2 · every refusal at the one form — the registry's rank, executed; the dial; Up & Down; every slip toast
 *   §4  I-3 · a grant's words in their §B11 tones, from the one dictionary; the declaration under review
 *   §5  contrast — every new ink pair measured on its surface (≥4.5:1 text, ≥3:1 marks)
 *   §6  what must STAY — the sides keep the pair, a loss keeps the betting rose, and the owner's items as they stand
 * The mutation proof (each defect planted on disk, the suite failing on its named check, the file restored byte-identical)
 * is the scratchpad's `r5i/mutate.cjs`; its result is in R5-I's report.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { createElement as h, Fragment, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { decomment, decommentCss } from "./lib/decomment.mts";
import { REASONS, refusalReason, refusalVariant } from "../src/lib/failure-reasons.ts";
import { grantStatusChip, STATUS_TONE, TONE_CHIP } from "../src/lib/status-tone.ts";
import { AuthHeader } from "../src/components/auth/auth-panel.tsx";
import { PageHeader } from "../src/components/ui/page-header.tsx";
import { PageHero } from "../src/components/ui/page-hero.tsx";
import { PageRibbon } from "../src/components/layout/page-ribbon.tsx";
import { Stat } from "../src/components/ui/stat.tsx";
import { CountBadge } from "../src/components/ui/count-badge.tsx";
import { RgSunriseArt } from "../src/components/rg/self-care-art.tsx";
import { Chip } from "../src/components/ui/chip.tsx";

let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};
const note = (s: string) => console.log(`       ${s}`);
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 100 - s.length))}`);
const raw = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
/** Source with its comments out (the shared scanner), so a rule quoted in a note is never mistaken for the rule. */
const read = (p: string) => decomment(raw(p));
const CSS = decommentCss(raw("src/app/globals.css"));
const html = (node: ReactNode) => renderToStaticMarkup(h(Fragment, null, node));
/** The body of the CSS rule whose selector is EXACTLY `sel`. */
const rule = (css: string, sel: string): string => {
  const m = new RegExp(`(?:^|\\n|\\})\\s*${sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{`).exec(css);
  if (!m) return "";
  const open = m.index + m[0].length;
  return css.slice(open, css.indexOf("}", open));
};
/** `src` from the first `from` to the next `to` after it ("" when either is missing — a check over "" must fail). */
const between = (src: string, from: string, to: string) => {
  const a = src.indexOf(from);
  if (a < 0) return "";
  const b = src.indexOf(to, a + from.length);
  return b < 0 ? "" : src.slice(a, b);
};

/* ══ §1 · THE BETTING-PAIR CENSUS ═════════════════════════════════════════════════════════════════════════════════════ */
/**
 * What counts as THE BETTING PAIR, read comment-stripped:
 *   var    `var(--yes-NNN)` / `var(--no-NNN)`
 *   alias  a token defined on the pair — the bar's fills, glows and labels, the hero's side accents, `--bet-win/-lose/-hot`
 *   tw     a Tailwind colour utility on `yes-NNN` / `no-NNN`
 *   cls    the side buttons, `btn-yes` / `btn-no`
 *   name   a tone or variant asked for by NAME — `"yes"`, `"no"`, `"rose"` on a line that picks a variant or tone
 *   oklch / hex   a hand-typed colour at the pair's hues (19–24, the NO rose's 22; 145–160, the YES green's 152) with
 *          chroma ≥ 0.04 — the pair by any other spelling. ⛔ Not the danger family (hue 25), not success (166), not claret
 *          (15): the app-state families sit beside the pair on purpose, and the decoys below prove the scanner tells them
 *          apart.
 * Scope: the player's code — R5-C's (the admin console, server-rendered artefacts and the campaign tooling are out).
 */
const ROOT = process.cwd().replace(/\\/g, "/");
const OUT_OF_SCOPE = /^src\/(?:app\/admin|components\/admin|app\/api|lib\/server|lib\/marketing)\//;
const toOklch = (r8: number, g8: number, b8: number) => {
  const lin = (c: number) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const r = lin(r8), g = lin(g8), b = lin(b8);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { C: Math.hypot(A, B), H: (Math.atan2(B, A) * 180 / Math.PI + 360) % 360 };
};
const bettingHue = (C: number, H: number) => C >= 0.04 && ((H >= 19 && H < 24) || (H >= 145 && H < 160));
type Hit = { kind: string; match: string; line: number };
/** Every use of the betting pair in one file's source (raw text in; comments are stripped here). */
function bettingHits(file: string, src: string): Hit[] {
  const text = src.replace(/\r\n/g, "\n");
  const code = file.endsWith(".css") ? decommentCss(text) : decomment(text);
  const out: Hit[] = [];
  code.split("\n").forEach((ln, i) => {
    const push = (kind: string, re: RegExp, keep: (m: RegExpMatchArray) => boolean = () => true) => {
      for (const m of ln.matchAll(re)) if (keep(m)) out.push({ kind, match: m[0], line: i + 1 });
    };
    push("var", /var\(\s*--(?:yes|no)-\d{2,3}\s*[,)]/g);
    push("alias", /var\(\s*--(?:bet-win|bet-lose|bet-hot|glow-win|hero-yes-accent|hero-no-accent|hero-tag-yes|bar-(?:fill|glow|label)-(?:yes|no)(?:-strong)?)\s*[,)]/g);
    push("tw", /(?<![\w-])(?:[a-z0-9-]+:)*(?:text|bg|border(?:-[tblrxyse])?|ring|fill|stroke|from|via|to|shadow|outline|decoration|accent|caret|divide|placeholder)-(?:yes|no)-\d{2,3}(?:\/[\w.[\]]+)?(?![\w-])/g);
    push("cls", /(?<![\w-])(?:btn-yes|btn-no)(?![\w-])/g);
    if (/\.tsx?$/.test(file) && /(?:variant|[tT]one|accent|glow)\b/.test(ln)) push("name", /["'`](?:yes|no|rose)["'`]/g);
    push("oklch", /oklch\(\s*([\d.]+)%?\s+([\d.]+)\s+([\d.]+)/g, (m) => bettingHue(Number(m[2]), Number(m[3])));
    push("hex", /#([0-9a-fA-F]{6})\b/g, (m) => {
      const x = m[1]; const o = toOklch(parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16));
      return bettingHue(o.C, o.H);
    });
  });
  return out;
}

/**
 * ⭐ THE REGISTRY — every file that uses the betting pair, its count and its RULING. A count that rises fails (a new use
 * must be ruled, then registered here with its reason); a count that falls passes and asks to be locked in.
 * The rulings, in DESIGN_AUTHORITY's words: "SIDE" = the two sides of a stake, a side's button, chip, pool, price or
 * probability, an outcome (UP wins), a position's side (§B2) · "LOSS" = a lost stake or a negative net, the owner's
 * LOSS ruling (`STATUS_TONE_EXCEPTIONS.LOSS`) · "CHART" = §B12's up=yes/down=no grammar for a price against its round
 * (owner rulings, §B12.2) · "MARK" = the brand mark's own split (§B1a) · "KIT" = a kit atom's side tones, offered for a
 * side (a new caller lands in this census) · "OWNER" = frozen classic chrome or an owner's question, written in R5-I's
 * report · "DEAD" = no consumer.
 */
const REGISTRY: Record<string, [number, string]> = {
  // ── SIDE: the stake's two sides, their buttons, chips, pools, prices, outcomes ────────────────────────────────────────
  "src/app/fairness/page.tsx": [2, "SIDE — a resolved market's outcome chip (YES / NO)"],
  "src/app/live/pulse-grid.tsx": [2, "SIDE — each side's word and price on the live grid"],
  "src/app/markets/[id]/page.tsx": [3, "SIDE — a position's side word · LOSS — a lost position's status word"],
  "src/app/positions/page.tsx": [4, "SIDE — the open stake split by side (words and bar)"],
  "src/app/results/page.tsx": [4, "SIDE — the winning side's words and the outcome donut's two arcs"],
  "src/app/updown/history/page.tsx": [6, "SIDE — the round's outcome chip (UP wins / DOWN wins) and each bet's side chip · LOSS — a negative net"],
  "src/app/updown/[roundId]/page.tsx": [10, "SIDE — the round's outcome ink, the crowd split, the two targets, each bet's side chip"],
  "src/components/auth/auth-shell.tsx": [2, "SIDE — the sign-in panel's picture of a market's two sides (YES 64% / 36% NO)"],
  "src/components/charts/outcome-cubes.tsx": [6, "SIDE — a settled round's outcome cubes"],
  "src/components/charts/terminal-chart.tsx": [2, "CHART — the legend's move of the window, up=yes/down=no (§B12, owner ruling)"],
  "src/components/home/landing-hero.tsx": [4, "SIDE — the hero's two side words and each board row's YES/NO buttons"],
  "src/components/home/trust-band.tsx": [2, "SIDE — a settled market's outcome chip"],
  "src/components/home/updown-band.tsx": [2, "SIDE — the band's Up and Down buttons"],
  "src/components/journey/tickets/ticket-card.tsx": [2, "SIDE — a ticket's side chip"],
  "src/components/layout/live-ticker.tsx": [2, "SIDE — a bet's side in the ticker (classic chrome, frozen)"],
  "src/components/markets/bet-confirm-modal.tsx": [6, "SIDE — the confirm's side plate"],
  "src/components/markets/comments-thread.tsx": [2, "SIDE — a commenter's side chip"],
  "src/components/markets/conviction-dial.tsx": [16, "SIDE — the dial's two sides (track, gradients, labels, the side's Place button, the placed bet's strip)"],
  "src/components/markets/market-card.tsx": [2, "SIDE — the card's YES/NO buttons"],
  "src/components/markets/operation-result-modal.tsx": [14, "SIDE — a placed bet's strip and primary button (`stripTone` yes/no); the crests are the app-state family"],
  "src/components/markets/position-card.tsx": [2, "SIDE — a position's side chip"],
  "src/components/markets/side-picker.tsx": [4, "SIDE — the picked side's chip and the two side buttons"],
  "src/components/onboarding/first-visit-primer.tsx": [20, "SIDE — the primer's picture of the two sides, their bar and their pools"],
  "src/components/updown/price-hero.tsx": [14, "CHART — the live price against the round's targets and the target lines (§B12.2)"],
  "src/components/updown/round-action-panel.tsx": [2, "SIDE — each side's amount"],
  "src/components/updown/round-stake-panel.tsx": [4, "SIDE — the locked side's chip"],
  "src/components/updown/updown-bet-receipt-modal.tsx": [2, "SIDE — the receipt's strip in the side staked"],
  "src/components/updown/updown-card.tsx": [16, "SIDE — the card's split, each side's target tile, its Up/Down buttons, amounts and outcome"],
  "src/components/updown/updown-stake-controls.tsx": [4, "SIDE — each side's staked chip and the Up/Down buttons"],
  "src/app/globals.css": [73, "the ramps and their aliases (the bar's fills, glows, labels; the hero's side accents); `.btn-yes/.btn-no`; the board row's YES price and the card's probability; the band's verdict, stems and beads — every one a SIDE · OWNER: the classic bell's rose lift (`.count-badge[data-lift=\"rose\"]`) · DEAD: `--bet-win`, `--bet-hot`, `--glow-win`, `--hero-tag-yes` (no consumer)"],
  // ── LOSS: the owner's ruling — a lost stake is betting semantics ──────────────────────────────────────────────────────
  "src/app/positions/performance/page.tsx": [2, "LOSS — a negative net and a losing row (money earned is gilt, zero the text's ink)"],
  "src/components/positions/pnl-summary-strip.tsx": [1, "LOSS — a negative settled net"],
  // ── MARK: the brand mark's own split, and the instruments built on it ─────────────────────────────────────────────────
  "src/app/global-error.tsx": [2, "MARK — the inline mark's two halves (the error mark itself is the danger family)"],
  "src/components/brand.tsx": [4, "MARK — the conviction disc's split · OWNER: `PulseRing`'s default ring, reached only by the console's `BrandSpinner`"],
  "src/components/layout/needle.css": [2, "MARK — the Needle's face and inlay (§B1a, §M8)"],
  "src/lib/brand-mark.ts": [2, "MARK — the mark's green and red (§B1a, the one definition)"],
  "src/components/ui/identity-avatar.tsx": [2, "OWNER — the heraldic crest's split field (§B1a: 'a SECOND system and must not borrow from the mark' — the owner's question)"],
  // ── KIT: an atom's side tones, offered for a side ─────────────────────────────────────────────────────────────────────
  "src/components/ui/button.tsx": [2, "KIT — the `yes`/`no` side buttons (its only `yes` caller is the console's)"],
  "src/components/ui/chip.tsx": [4, "KIT — the `yes`/`no` side chips · OWNER: `hot` shares the NO rose (the board's hot flag — §B2a's 'Ali's call')"],
  "src/components/ui/dot.tsx": [2, "KIT — the `yes`/`no` side dots (no player caller)"],
  "src/components/ui/receipt-row.tsx": [6, "KIT — the `yes`/`no` side rows (no player caller)"],
  "src/components/ui/stat.tsx": [4, "KIT — the `yes`/`no` side tones (no player caller); `labelTone` is gone"],
  "src/components/ui/count-badge.tsx": [4, "OWNER — the `rose` pip: the classic bell (frozen chrome); the journey's bell is `brand`"],
  "src/components/markets/circular-progress.tsx": [2, "KIT — the side tones of a ring whose one consumer is the console"],
  "src/components/ui/password-input.tsx": [3, "a local NAME: the strength meter's strong step is called `yes` and paints the success family (D2's own example)"],
  // ── OWNER: the classic bell and capsule (frozen chrome), a third party's mark, dead CSS ──────────────────────────────
  "src/components/layout/notifications-panel.tsx": [2, "OWNER — the classic bell's rose count and \"Clear all\" hover (the journey's are brand and danger)"],
  "src/components/layout/wallet-balance-pill.tsx": [2, "OWNER — the classic capsule's ±delta (the journey's `.kp-jbal__delta` is the text's ink)"],
  "src/components/ui/social-marks.tsx": [1, "a third party's mark: WhatsApp's own green"],
  "src/app/state-tokens.css": [2, "DEAD — `.countdown--critical` (no consumer; it would paint time in the NO rose, §B2a)"],
};

section("1 · the betting-pair census — every use of the pair in the player's code is ruled and registered");
const census = new Map<string, Hit[]>();
{
  const walk = (d: string): string[] => readdirSync(d).flatMap((n) => {
    const p = join(d, n);
    return statSync(p).isDirectory() ? walk(p) : /\.(tsx|ts|css)$/.test(n) ? [relative(ROOT, p).replace(/\\/g, "/")] : [];
  });
  for (const f of walk(join(ROOT, "src"))) {
    if (OUT_OF_SCOPE.test(f)) continue;
    const hits = bettingHits(f, readFileSync(join(ROOT, f), "utf8"));
    if (hits.length) census.set(f, hits);
  }
  // ⭐ CONTROLS FIRST: the scanner must SEE the pair where it is, or every absence below passes over nothing.
  ok("1.0 · CONTROL · the scanner reads the card's YES/NO buttons, the dial's two sides, the confirm's side plate and the mark's",
    (census.get("src/components/markets/market-card.tsx")?.length ?? 0) >= 2 && (census.get("src/components/markets/conviction-dial.tsx")?.length ?? 0) >= 10
      && (census.get("src/components/markets/bet-confirm-modal.tsx")?.length ?? 0) >= 6 && (census.get("src/lib/brand-mark.ts")?.length ?? 0) === 2);
  const unregistered = [...census.keys()].filter((f) => !(f in REGISTRY));
  ok("1.1 · no file uses the betting pair unruled — every one is in the registry with its ruling", unregistered.length === 0,
    unregistered.map((f) => `${f}: ${census.get(f)!.map((x) => `${x.line}:${x.match}`).join(" ")}`).join(" | "));
  const rose: string[] = [];
  const fell: string[] = [];
  for (const [f, [n]] of Object.entries(REGISTRY)) {
    const got = census.get(f)?.length ?? 0;
    if (got > n) rose.push(`${f}: ${got} > ${n} — ${census.get(f)!.map((x) => `${x.line}:${x.match}`).join(" ")}`);
    else if (got < n) fell.push(`${f}: ${got} < ${n}`);
  }
  ok("1.2 · no registered file gained a use of the pair (a new one must be RULED, then registered with its reason)", rose.length === 0, rose.join(" | "));
  if (fell.length) note(`✓ fewer than the registry — lock it in: ${fell.join(" · ")}`);
  ok("1.3 · the registry's every entry carries its ruling", Object.values(REGISTRY).every(([n, why]) => n > 0 && why.length > 12));

  // ⭐ PLANTS — each spelling of the pair the census promises to see, planted in memory, is seen; decoys are not.
  const n = (f: string, s: string) => bettingHits(f, s).length;
  ok("1.4′ PLANT · a Tailwind betting ink on a hover is seen (`hover:text-no-300`, `group-hover:border-no-700`)",
    n("x.tsx", '<b className="hover:text-no-300 group-hover:border-no-700" />') === 2);
  ok("1.4″ PLANT · the pair asked for by NAME is seen (`tone=\"yes\"`, `glow=\"rose\"`, `variant={ok ? \"yes\" : \"no\"}`)",
    n("x.tsx", '<PageHero glow="rose"><PageHeader tone="yes" /></PageHero><Chip variant={ok ? "yes" : "no"} />') === 4);
  ok("1.4‴ PLANT · the tokens and their aliases are seen (`var(--no-400)`, `var(--bar-fill-yes)`, `btn-no`)",
    n("x.css", ".a { color: var(--no-400); background: var(--bar-fill-yes); }\n.b { } .btn-no") === 3);
  ok("1.5′ PLANT · the pair by another spelling is seen — a hand-typed oklch at hue 22 and at 152, the mark's hex",
    n("x.tsx", 'const a = "oklch(80% 0.14 22)"; const b = "oklch(58% 0.16 152)"; const c = "#1EA362";') === 3);
  ok("1.6 · CONTROL · decoys are NOT the pair: the danger family (hue 25), the success family (166), claret (15), a comment, a word",
    n("x.tsx", '// text-no-300 var(--yes-400)\nconst d = "oklch(57% 0.22 25)"; const s = "oklch(62% 0.12 166)"; const c = "oklch(60% 0.160 15)"; const notes = "nothing"; <i className="text-danger-fg text-success-fg" />') === 0);
  // ⭐ AND THE PREMISE: the app-state families are their OWN hues, minted beside the pair (D2) — if a retune closed the
  // gap, this census would be watching the wrong line.
  const hueOf = (name: string) => Number(new RegExp(`--${name}:\\s*oklch\\([\\d.]+%\\s+[\\d.]+\\s+([\\d.]+)\\)`).exec(CSS)?.[1] ?? NaN);
  ok("1.7 · CONTROL · success is hue 166 against YES's 152 and danger hue 25 against NO's 22 (globals.css, D2)",
    hueOf("success-500") === 166 && hueOf("yes-500") === 152 && hueOf("danger-500") === 25 && hueOf("no-500") === 22,
    `${hueOf("success-500")} ${hueOf("yes-500")} ${hueOf("danger-500")} ${hueOf("no-500")}`);
}

/* ══ §2 · I-1 — THE APP STATES THAT WORE THE PAIR ═════════════════════════════════════════════════════════════════════ */
section("2 · I-1 · an app state wears the app-state family — the crests, the error mark, destruction, field errors, the rest");
{
  // 2.1 · OperationResultModal: success and failure are app states (the toast moved on 2026-08-30; the crest had not).
  const ORM = read("src/components/markets/operation-result-modal.tsx");
  const tone = between(ORM, "const TONE: Record<OperationVariant", "function CrestIcon");
  ok("2.1 · the result's success crest is `--success` / `--success-fg` and its failure crest `--danger` / `--danger-fg`",
    /success: \{\s*\.\.\.crest\("var\(--success\)", "var\(--success-fg\)"\),/.test(tone) && /danger: \{\s*\.\.\.crest\("var\(--danger\)", "var\(--danger-fg\)"\),/.test(tone)
      && !/--(?:yes|no)-\d/.test(tone), tone.slice(0, 160));
  ok("2.1′ · the failure's way out is the primary action (never `btn-no`, the NO side's stake button), as every non-success result's is",
    /danger: \{[^}]*primaryBtn: "btn-primary",/.test(tone) && (tone.match(/primaryBtn: "btn-primary"/g) ?? []).length === 5 && !/btn-no/.test(tone));
  ok("2.1″ · a detail row's good and bad are the app-state inks; a placed bet's strip and button keep its SIDE (`stripTone` yes/no)",
    /d\.tone === "good" \? "var\(--success-fg\)"/.test(ORM) && /d\.tone === "bad"  \? "var\(--danger-fg\)"/.test(ORM)
      && /stripTone === "yes" \? "btn-yes" : stripTone === "no" \? "btn-no"/.test(ORM) && /yes:\s*"linear-gradient\(90deg, var\(--yes-700\), var\(--yes-400\)\)"/.test(ORM));

  // 2.2 · global-error's "!" mark — the danger family written out (the page ships without the stylesheet).
  const GE = read("src/app/global-error.tsx");
  ok("2.2 · global-error's mark is the danger family at hue 25 (`--danger-500` at the border and wash mixes, `--danger-fg`), not the NO rose",
    /const DANGER_BORDER = "oklch\(57% 0\.22 25 \/ 0\.36\)";/.test(GE) && /const DANGER_TEXT = "oklch\(82% 0\.16 25\)";/.test(GE)
      && /background: "oklch\(57% 0\.22 25 \/ 0\.18\)"/.test(GE) && !/NO_BORDER|NO_TEXT|oklch\(4\d% 0\.1\d 22/.test(GE));

  // 2.3 · destruction wears the danger ink — the avatar menu's Sign out and a comment's Delete already did.
  const DESTRUCTIVE: Array<[string, string, RegExp]> = [
    ["the avatar's clear button", "src/components/profile/avatar-uploader.tsx", /group-hover:border-danger-border group-hover:text-danger-fg/],
    ["a notification's dismiss ✕ on /notifications", "src/app/notifications/row-actions.tsx", /hover:text-danger-fg hover:bg-bg-overlay/],
    ["/profile's Sign out row and plate", "src/app/profile/page.tsx", /hover:border-danger-border transition-colors[\s\S]{0,700}bg-danger-500\/10 text-danger-fg group-hover:bg-danger-500\/20/],
    ["the sessions page's Sign out", "src/app/profile/sessions/page.tsx", /style=\{\{ color: "var\(--danger-fg\)" \}\}/],
    ["CONTROL · the avatar menu's Sign out (the convention)", "src/components/layout/avatar-menu.tsx", /text-danger-fg hover:bg-danger-500\/10/],
    // 2026-10-10 (round 6's read): the journey hub's Sign out row, missed by the first sweep — the menu's inks.
    ["the journey hub's Sign out row (label and glyph, and its hover)", "src/app/globals.css", /\.kp-hub__exit \{[^}]*color: var\(--danger-fg\);[^}]*\}\s*\.kp-hub__exit \.kp-hub__glyph \{ color: inherit; \}\s*\.kp-hub__exit:hover \{ background: color-mix\(in oklab, var\(--danger-500\) 10%, transparent\); \}/],
    ["CONTROL · a comment's Delete (the convention)", "src/components/markets/comments-thread.tsx", /text-text-subtle hover:text-danger-fg/],
  ];
  for (const [what, f, re] of DESTRUCTIVE) ok(`2.3 · ${what} — the danger ink`, re.test(read(f)), f);
  ok("2.3′ · …and none of the four wears the NO rose any more",
    ["src/components/profile/avatar-uploader.tsx", "src/app/notifications/row-actions.tsx", "src/app/profile/sessions/page.tsx"].every((f) => !/no-[37]00/.test(read(f)))
      && !/hover:border-no-700|bg-no-500\/10 text-no-300/.test(read("src/app/profile/page.tsx")));

  // 2.4 · a form error is the danger ink at the field (betting-ink §6's rule) — the dial's chips and every sibling.
  const DIAL = read("src/components/markets/conviction-dial.tsx");
  const chips = DIAL.match(/<span className="mt-1 inline-flex items-center gap-1 rounded-pill border [^"]*">/g) ?? [];
  ok("2.4 · the dial's two out-of-range chips (stake, multiplier) are the field-error family, never the NO rose",
    chips.length === 2 && chips.every((c) => /border-danger-border bg-danger-bg/.test(c) && /text-danger-fg/.test(c) && !/no-\d/.test(c)), chips.join(" ‖ "));
  const FIELD_ERRORS: Array<[string, string, RegExp]> = [
    ["Up & Down's custom stake out of range (the board card)", "src/components/updown/updown-stake-controls.tsx", /customInvalid \? "text-danger-fg" : "text-text-subtle"/],
    ["Up & Down's custom stake out of range (the round page)", "src/components/updown/round-stake-panel.tsx", /customInvalid \? "text-danger-fg" : "text-text-subtle"/],
    ["a proposal's title over 120, its source link, its close date", "src/app/proposals/new/create-form.tsx", /titleEn\.length > 120 \? "text-danger-fg"[\s\S]*text-danger-fg">\{t\.proposals\.sourceLinkInvalid\}[\s\S]*text-danger-fg">\{t\.common\.selectionCloseError\}/],
    ["the password pair's verdict (match: success · mismatch: danger)", "src/components/auth/password-pair.tsx", /<span className="text-success-fg">\{t\.common\.passwordsMatch\}<\/span>[\s\S]{0,80}<span className="text-danger-fg">\{t\.toast\.passwordsDontMatch\}<\/span>/],
  ];
  for (const [what, f, re] of FIELD_ERRORS) ok(`2.4′ · ${what}`, re.test(read(f)) && !/text-no-300|text-yes-300/.test(read(f)), f);

  // 2.5 · an app state that went well is the success family.
  const SUCCESS_MARKS: Array<[string, string, RegExp]> = [
    ["2FA on: the shield plate", "src/app/profile/security/security-client.tsx", /enabled \? "bg-success-500\/10 text-success-fg"/],
    ["the resolution's attestation seals and the paid-out tick", "src/components/markets/resolution-panel.tsx", /(?:text-success-fg[\s\S]*){3}/],
    ["the sale's free window (box and \"No fee\")", "src/components/markets/sell-confirm-modal.tsx", /isFree \? "color-mix\(in oklab, var\(--success-500\) 62%, transparent\)"[\s\S]*isFree \? "color-mix\(in oklab, var\(--success-500\) 18%, transparent\)"[\s\S]*isFree \? "var\(--success-fg\)"/],
    ["an agent's uploaded document slot (the KYC uploader's done tile)", "src/app/agent/apply/apply-client.tsx", /done \? "border-success-border bg-success-500\/\[0\.07\] cursor-pointer hover:border-success-500"[\s\S]*done \? "text-success-fg"/],
    ["CONTROL · the KYC uploader's done tile (the convention)", "src/components/profile/kyc-doc-uploader.tsx", /done \? "border-success-border bg-success-500\/\[0\.07\] cursor-pointer hover:border-success-500"/],
  ];
  for (const [what, f, re] of SUCCESS_MARKS) ok(`2.5 · ${what} — the success family`, re.test(read(f)), f);
  ok("2.5′ · …and none of them carries the YES green", ["src/app/profile/security/security-client.tsx", "src/components/markets/resolution-panel.tsx", "src/components/markets/sell-confirm-modal.tsx", "src/app/agent/apply/apply-client.tsx"].every((f) => !/yes-\d00/.test(read(f))));

  // 2.6 · the auth eyebrow: success and danger, as its medallion.
  const AP = read("src/components/auth/auth-panel.tsx");
  // Re-pinned by R7-B (round 7, 2026-10-10; round 6's read R5-6): the page-name default is the page heads' one eyebrow ink,
  // `subtle`, where it was `brand`; the two state tones this check is about stand.
  ok("2.6 · the auth eyebrow's tones are subtle · danger · success — no YES/NO to ask for", /export type AuthEyebrowTone = "subtle" \| "danger" \| "success";/.test(AP) && !/yes-300|no-300/.test(AP));
  ok("2.6′ · reset-password's expired link says danger; verify-email says success or danger", /tone="danger"/.test(read("src/app/auth/reset-password/page.tsx")) && /tone=\{good \? "success" : "danger"\}/.test(read("src/app/auth/verify-email/page.tsx")));
  const eyebrow = (tone: "danger" | "success") => html(h(AuthHeader, { eyebrow: "E", title: "T", tone } as never));
  ok("2.6″ EXECUTED · the eyebrow renders `text-danger-fg` / `text-success-fg`", /text-danger-fg/.test(eyebrow("danger")) && /text-success-fg/.test(eyebrow("success")));

  // 2.7 · the RG page's hero — §B2a's own example, and its last trace.
  const RGP = read("src/app/profile/responsible-gambling/page.tsx");
  // Re-pinned by R7-B (round 7, 2026-10-10; round 6's read R5-6): the hero keeps the account pages' `info` glow; its eyebrow
  // takes the page heads' one ink (PageHeader's `info` tone is gone), as every account page's now does.
  ok("2.7 · the RG page's hero is the account pages' `info` glow and the page heads' one eyebrow ink, its glyph and words unchanged",
    /<PageHero glow="info">\s*<PageHeader\s*icon=\{<I\.shieldcheck s=\{14\} \/>\}\s*eyebrow=\{t\.rg\.playerProtection\}\s*title=\{t\.profile\.responsibleGambling\}/.test(RGP) && !/"yes"/.test(RGP));
  ok("2.7′ · PageHeader and PageHero offer no betting tone to ask for (`yes`, `rose` out of their maps)",
    !/"yes"|yes-300|"rose"|\b152\b|\b22 \//.test(read("src/components/ui/page-header.tsx") + read("src/components/ui/page-hero.tsx")));
  ok("2.7″ EXECUTED · the hero's info glow is hue 240 and the eyebrow `text-text-subtle` (R7-B: the page heads' one ink)",
    /oklch\(45% 0\.10 240 \/ 0\.18\)/.test(html(h(PageHero, { glow: "info" } as never, "x"))) && /text-text-subtle/.test(html(h(PageHeader, { eyebrow: "E", title: "T" }))));
  ok("2.7‴ · the support panel's art takes the panel's own ink (`currentColor`), the panel the success family",
    /fill="currentColor" stroke="none"/.test(read("src/components/rg/self-care-art.tsx")) && !/yes-300/.test(read("src/components/rg/self-care-art.tsx"))
      && /<RgSunriseArt size=\{44\} className="-ml-1 shrink-0 text-success-fg" \/>/.test(RGP)
      && !/yes-|no-/.test(html(h(RgSunriseArt, { size: 44 } as never))));

  // 2.8 · /profile: its hero is the /profile pages' hero, its three facts one treatment.
  const PROF = read("src/app/profile/page.tsx");
  ok("2.8 · /profile's hero is the PageHero recipe (one `info` radial over `--hero-panel-grad`), not an emerald → rose tilt",
    /"radial-gradient\(800px 320px at 100% 0%, oklch\(45% 0\.10 240 \/ 0\.18\), transparent 60%\), " \+\s*"var\(--hero-panel-grad\)"/.test(PROF) && !/oklch\([\d.]+% [\d.]+ (?:152|22) /.test(PROF));
  ok("2.8′ · the open count's glyph is its neighbours' — the Stat's own icon ink", /icon=\{<I\.sparkle s=\{14\} \/>\}/.test(PROF));

  // 2.9 · the activity page: one label ink for every tile; Stat has no betting label tint left.
  const ACT = read("src/app/profile/activity/page.tsx");
  ok("2.9 · /profile/activity's Won and Net take the label's own ink (no `labelTone`)", !/labelTone/.test(ACT) && /label=\{t\.activity\.won\}/.test(ACT));
  ok("2.9′ · Stat has no `labelTone` to ask for", !/labelTone/.test(read("src/components/ui/stat.tsx")));
  const tile = html(h(Stat, { size: "lg", labelStyle: "wide", boxed: "tile", label: "Won", value: "TZS 1", icon: h("i") } as never));
  ok("2.9″ EXECUTED · a tile's label row renders the subtle ink, no betting ink", /text-text-subtle/.test(tile) && !/yes-|no-3/.test(tile));

  // 2.10 · the bell — the journey's count and "Clear all" (the classic bell is frozen).
  const NP = read("src/components/layout/notifications-panel.tsx");
  ok("2.10 · the journey bell's count is the brand pip (the Arifa row's) and its \"Clear all\" hover the danger ink",
    /const countTone = journey \? "brand" : "rose";/.test(NP) && /const clearAllHover = journey \? "hover:text-danger-fg" : "hover:text-no-300";/.test(NP)
      && /tone=\{countTone\}/.test(NP) && /\$\{clearAllHover\}/.test(NP) && /<CountBadge count=\{n\} tone="brand"/.test(read("src/components/journey/account/unread-row.tsx")));
  ok("2.10′ EXECUTED · the brand pip paints `--brand-600` (legible digits, §5), the rose one the NO ramp", /background:var\(--brand-600\)/.test(html(h(CountBadge, { count: 3, tone: "brand" } as never)))
    && /var\(--no-400\)/.test(html(h(CountBadge, { count: 3, tone: "rose" } as never))));

  // 2.11 · a net on /updown/history reads as every net: gilt earned, the betting rose lost, zero text.
  const UDH = read("src/app/updown/history/page.tsx");
  ok("2.11 · /updown/history's nets are the platform's net rule (gilt > 0 · LOSS rose < 0 · text at 0), as /positions/performance",
    (UDH.match(/net > 0 \? "var\(--gilt\)" : net < 0 \? "var\(--no-300\)" : "var\(--text\)"/g) ?? []).length === 2 && !/var\(--yes-300\)/.test(UDH)
      && /netPnl > 0 \? "text-\[var\(--gilt\)\]" : netPnl < 0 \? "text-no-300" : "text-text"/.test(read("src/app/positions/performance/page.tsx")));

  // 2.12 · /wallet's history row is the Receipts row's: one brand plate for money that moved, neutral amounts.
  const W = read("src/app/wallet/wallet-client.tsx");
  const txn = W.includes("function TxnRow") ? W.slice(W.indexOf("function TxnRow")) : ""; // the file's last function
  ok("2.12 · /wallet's history row: the Receipts row's brand plate where money moved, the muted one where nothing landed; the amount neutral",
    /settledCredit \|\| !\(isCredit \|\| movedNothing\) \? "bg-brand-500\/10 text-brand-300"\s*: "bg-bg-overlay text-text-subtle";/.test(txn)
      && /\$\{movedNothing \? "text-text-muted" : "text-text"\}/.test(txn) && !/yes-|no-\d/.test(txn), txn.slice(0, 80));
  ok("2.12′ CONTROL · the Receipts row (the decided target) draws one brand plate, neutral amount", /<IconPlate size=\{40\} className="bg-brand-500\/10 text-brand-300">/.test(read("src/components/wallet/receipt-list-row.tsx")));
  ok("2.12″ · the self-exclusion doors hover on the strong border, as \"Set personal limits\" beside them", /text-text-muted hover:text-text hover:border-border-strong transition-colors/.test(W) && !/hover:border-no-700/.test(W));

  // 2.13 · the leaderboard: a rate in the text's ink (identity page — no gold either).
  const LB = read("src/app/leaderboard/page.tsx");
  ok("2.13 · the leaderboard's rate of return is the text's ink in the table, on the podium and in the ribbon",
    /<td className="p-3 text-right font-mono tabular-nums font-bold text-text">/.test(LB) && /<span className="mt-0\.5 font-mono text-\[13px\] font-bold tabular-nums text-text">/.test(LB)
      && !/accent:/.test(LB) && !/text-yes-300|text-no-300/.test(LB));
  const ribbon = html(h(PageRibbon, { stats: [{ label: "L", value: "12.5%" }] }));
  ok("2.13′ · the ribbon has no accent to ask for; EXECUTED it renders the value in `text-text`", !/accent/.test(read("src/components/layout/page-ribbon.tsx")) && /text-text"/.test(ribbon) && !/yes-|no-/.test(ribbon));

  // 2.14 · the payout notice's edge follows the failure box above it.
  ok("2.14 · the payout notice's unavailable edge is `border-danger-border` — the failure box's above it on both pages",
    /className=\{unavailable \? "border-danger-border" : undefined\}/.test(read("src/components/wallet/payout-status-notice.tsx"))
      && /role="alert" className="flex items-start gap-2\.5 rounded-xl border border-danger-border bg-danger-bg/.test(read("src/app/wallet/deposit/page.tsx")));

  // 2.15 · a stale feed, a placed pulse, a balance's move, a language change.
  ok("2.15 · the terminal's stale receipt is the danger ink (an app state), its legend's move the chart grammar (kept)",
    /feed\.liveStale \? "var\(--danger-fg\)" : "var\(--text-faint\)"/.test(read("src/components/charts/terminal-chart.tsx")));
  ok("2.15′ · the quick bet's placed pulse is the success green (the toast it replaces), the side's own flash kept",
    /0%\s*\{ box-shadow: 0 0 0 0 color-mix\(in oklab, var\(--success-500\) 55%, transparent\); \}/.test(CSS) && !/--yes-500/.test(between(CSS, "@keyframes ud-place-pulse", "}\n}"))
      && /@keyframes ud-side-flash/.test(CSS));
  ok("2.15″ · the journey balance's ±delta is the text's ink — its sign says which way", /color:\s*var\(--text\)/.test(rule(CSS, '.kp-jbal__delta[data-sign]')) && !/kp-jbal__delta\[data-sign="(?:up|down)"\]/.test(CSS));
  const I18N = read("src/lib/i18n.tsx");
  ok("2.15‴ · the language-change glyphs alternate the brand family's two text steps — no betting hue", (I18N.match(/color: "var\(--brand-(?:200|300)\)"/g) ?? []).length === 6 && !/oklch\(78% 0\.16 (?:152|22)\)/.test(I18N));
}

/* ══ §3 · I-2 — EVERY REFUSAL AT THE ONE FORM ═════════════════════════════════════════════════════════════════════════ */
section("3 · I-2 · a refusal the player can fix is the calm `factual` toast and never a popup; a fault is `danger`");
{
  // 3.1 · THE RANK, THE DIAL, UP & DOWN AND THE SLIPS ARE THE LAW'S OWN SUITE'S (test:feedback-law §11 — the rule's home,
  // in predeploy; red:feedback-law plants them). This suite holds the census around them: every other refusal toast.
  const FL = raw("scripts/feedback-law.test.mts");
  ok("3.1 · CONTROL · test:feedback-law §11 holds the one form: the registry's rank (executed), the dial, Up & Down (executed), the slips",
    FL.includes('console.log("\\n§11 · A refusal the player can fix is never a popup') && FL.includes("const dialDefects = (src: string)")
      && FL.includes('udBetErrorCopy(code, "x", m,') && FL.includes("const slipAlarms = "));
  ok("3.1′ CONTROL · the premise: a short balance and a stake under the minimum are `warning` (fixable), a frozen wallet `error`",
    REASONS.balance_insufficient.severity === "warning" && REASONS.stake_below_min.severity === "warning" && REASONS.wallet_frozen.severity === "error"
      && refusalVariant(refusalReason({ reason: "stake_below_min" })) === "factual" && refusalVariant(refusalReason({ reason: "wallet_frozen" })) === "danger");
  const DIAL = read("src/components/markets/conviction-dial.tsx");
  ok("3.3″ CONTROL · the Sell button (S6 A8h) is the one form: toast ranked and sticky, the ✗ result for a fault only",
    /variant: fault \? "danger" : "factual", durationMs: 0 \}\);/.test(read("src/components/markets/sell-button.tsx")) && /if \(fault\) showResult\(\{ variant: "danger"/.test(read("src/components/markets/sell-button.tsx")));
  ok("3.3‴ · the dial's inline short balance is the factual line Up & Down draws (the info glyph, the faint ink, 13px), not a NO-rose box",
    /<p className="mt-3 flex items-start gap-1 text-body-sm leading-\[1\.45\] text-text-faint">\s*<I\.info s=\{11\} className="mt-\[2px\] shrink-0" \/>\s*<span>\s*\{t\.common\.insufficientBalanceHint\}/.test(DIAL)
      && /<p className="mt-2 flex items-start gap-1 text-body-sm leading-\[1\.45\] text-text-faint">\s*<I\.info s=\{11\} className="mt-\[2px\] shrink-0" \/>/.test(read("src/components/updown/round-stake-panel.tsx"))
      && !/border-no-700|bg-no-500|text-no-300/.test(DIAL));

  // 3.4 · every other refusal toast on a player's surface: a slip is `factual`; a server refusal takes the registry's rank.
  const RANKED: Array<[string, number]> = [
    ["src/app/profile/account/export-data-button.tsx", 1], ["src/app/profile/account/privacy-request-form.tsx", 1],
    ["src/app/proposals/new/create-form.tsx", 1], ["src/components/markets/comments-thread.tsx", 2],
    ["src/components/markets/objection-dialog.tsx", 1], ["src/components/profile/name-editor.tsx", 1],
    ["src/components/profile/avatar-uploader.tsx", 2], ["src/components/proposals/vote-control.tsx", 1],
    // 2 → 1 on 2026-10-10 (typed-only identity): `KycExtraDocUploader` was deleted with the extra-document requests, and
    // its server refusal with it — what is left is the agent photo track's one uploader.
    ["src/components/profile/kyc-doc-uploader.tsx", 1],
  ];
  for (const [f, n] of RANKED) {
    const got = (read(f).match(/variant: refusalVariant\(refusalReason\((?:r|result)\)\)/g) ?? []).length;
    ok(`3.4 · ${f.split("/").pop()} — its server refusal${n > 1 ? "s take" : " takes"} the registry's rank (${got}/${n})`, got === n);
  }
  // 3.5 · the slips the sweep turned `factual` — counted, so the census cannot pass over nothing.
  const SLIP_TITLES = /t\.toast\.(?:notAnImage|imageTooLarge|couldntReadImage|nameEmpty|couldntCopy)\b/;
  const walk = (d: string): string[] => readdirSync(d).flatMap((n) => {
    const p = join(d, n);
    return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(n) ? [relative(ROOT, p).replace(/\\/g, "/")] : [];
  });
  const playerFiles = walk(join(ROOT, "src")).filter((f) => !OUT_OF_SCOPE.test(f));
  const slipCount = playerFiles.reduce((s, f) => s + ((read(f).match(/toast\(\{[^;]*?\}\)/g) ?? []).filter((c) => SLIP_TITLES.test(c) && /variant: "factual"/.test(c)).length), 0);
  // 13 → 10 on 2026-10-10 (typed-only identity), measured: `KycExtraDocUploader` went with the extra-document requests,
  // and its three slips (not an image · too large · unreadable) with it. The agent photo track keeps the one uploader's three.
  ok("3.5 · the player's own slips are `factual` toasts — 10: the KYC uploader's 3 (the agent photo track), the photo's 2, the agent's unreadable photo, the empty name, the three refused copies", slipCount === 10, String(slipCount));
  const AGENT = read("src/app/agent/apply/apply-client.tsx");
  ok("3.7 · the agent application: a referee field, a short balance, an unconfirmed address and a file's own slip are `factual`; the rest `danger`",
    /variant: r\.field \? "factual" : "danger"/.test(AGENT) && /r\.refusal === "insufficient_balance" \? refusalVariant\("balance_insufficient"\) : r\.refusal === "email_unverified" \? refusalVariant\("email_unverified"\) : "danger", durationMs: 0/.test(AGENT)
      && /variant: r\.failure && r\.failure !== "generic" \? "factual" : "danger", durationMs: 0/.test(AGENT)
      && (AGENT.match(/variant: "factual" \}\); return; \}/g) ?? []).length === 2);
  // ⭐ AND WHAT DELIBERATELY DIFFERS, PINNED AS IT STANDS: the account-security rail (password, 2FA, email) answers every
  // refusal `danger` by test:feedback-law's own pins (3.3, 3.9) — the owner's question in R5-I's report.
  ok("3.8 · CONTROL · the account-security rail is left as test:feedback-law pins it (`danger`) — named in the report, not swept",
    /toast\(\{ title: t\.toast\.passwordFailed, description: errorCopy\(t, r\), variant: "danger" \}\)/.test(read("src/components/profile/password-section.tsx"))
      && /variant: "danger"/.test(between(read("src/app/profile/security/security-client.tsx"), "const errToast", "};"))
      && /toast\(\{ title: t\.toast\.emailFailed, description: errorCopy\(t, r\), variant: "danger" \}\)/.test(read("src/components/profile/email-editor.tsx")));
}

/* ══ §4 · I-3 — A GRANT'S WORDS IN THEIR §B11 TONES ═══════════════════════════════════════════════════════════════════ */
section("4 · I-3 · a grant's state words in their §B11 tones, read from the one dictionary; a declaration under review is royal");
{
  // 4.1 · the dictionary, executed.
  const want: Record<string, string> = { QUEUED: "pending", PENDING_KYC: "pending", FULFILLED: "success", EXPIRED: "neutral", CANCELLED: "neutral", FORFEITED: "neutral" };
  const got = Object.fromEntries(Object.keys(want).map((s) => [s, grantStatusChip(s)]));
  ok("4.1 EXECUTED · waiting royal (`pending`), unlocked success, expired/cancelled/forfeited slate (`neutral`)",
    Object.entries(want).every(([s, v]) => got[s] === v), JSON.stringify(got));
  ok("4.1′ EXECUTED · no grant word is amber, and none is gilt (a word is not money — R5-C's chip ruling)",
    Object.values(got).every((v) => v !== "warning" && v !== "gold" && v !== "resolved"));
  ok("4.1″ CONTROL · the GRANT_ words agree with the dictionary's own: EXPIRED and CANCELLED slate, PENDING royal, a completed payment green",
    TONE_CHIP[STATUS_TONE.EXPIRED.player] === got.EXPIRED && TONE_CHIP[STATUS_TONE.CANCELLED.player] === got.CANCELLED
      && TONE_CHIP[STATUS_TONE.PENDING.player] === got.QUEUED && TONE_CHIP[STATUS_TONE.CONFIRMED.player] === got.FULFILLED);

  // 4.2 · the wallet's grant row reads it through the kit chip — every word the row can print has a tone.
  const W = read("src/app/wallet/wallet-client.tsx");
  const card = between(W, "function BonusWalletCard", "function TxnRow");
  ok("4.2 · the grant row's word is the kit Chip in the dictionary's tone (`grantStatusChip`), one size for every state",
    /<Chip variant=\{grantStatusChip\(g\.status\) \?\? "neutral"\} size="sm" metrics="base">/.test(card)
      && !/warning/.test(card) && !/text-\[8px\]/.test(card), card.length ? "" : "card not found");
  const words = [...between(W, "function grantStatusWord", "\n}\n").matchAll(/case "([A-Z_]+)":/g)].map((m) => m[1]);
  ok("4.2′ · every grant word the row can print but the running one (ACTIVE) has its tone in the dictionary",
    words.length === 7 && words.filter((w) => w !== "ACTIVE").every((w) => grantStatusChip(w) !== null)
      && grantStatusChip("ACTIVE") === null && grantStatusChip(undefined) === null, words.join(","));
  const pill = html(h(Chip, { variant: "pending", size: "sm", metrics: "base" } as never, "Inasubiri"));
  ok("4.2″ EXECUTED · the waiting chip renders the royal ink at the side pill's 18px", /color:var\(--brand-300\)/.test(pill) && /height:18px/.test(pill), pill.slice(0, 160));

  // 4.3 · a source-of-funds declaration under review — waiting — is royal on /profile and on its own page.
  ok("4.3 · /profile's banner: amber only for a declaration to resubmit (the player acts); under review royal",
    /sof!\.reviewStatus === "REJECTED" \? "border-warning-border bg-warning-bg" : "border-info-border bg-info-bg"/.test(read("src/app/profile/page.tsx")));
  ok("4.3′ · /profile/source-of-funds: the declaration's box is success when accepted, royal under review (its pill already said so)",
    /existing\.reviewStatus === "ACCEPTED" \? "border-success-border bg-success-bg" : "border-info-border bg-info-bg"/.test(read("src/app/profile/source-of-funds/page.tsx"))
      && /: "pending";/.test(read("src/app/profile/source-of-funds/page.tsx")));
}

/* ══ §5 · CONTRAST — EVERY NEW INK PAIR, ON ITS SURFACE ══════════════════════════════════════════════════════════════ */
section("5 · contrast — every new ink pair measured on its worst surface (≥4.5:1 text, ≥3:1 marks)");
{
  type RGB = [number, number, number];
  const lin2srgb = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
  const oklch = (L: number, C: number, H: number): RGB => {
    const a = C * Math.cos((H * Math.PI) / 180), b = C * Math.sin((H * Math.PI) / 180);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
    return [r, g, bl].map((c) => Math.min(1, Math.max(0, lin2srgb(c)))) as RGB;
  };
  /** A token's oklch from globals.css, following one `var()` hop. */
  const token = (name: string): RGB => {
    const v = new RegExp(`--${name}:\\s*([^;]+);`).exec(CSS)?.[1]?.trim() ?? "";
    const via = /^var\(--([\w-]+)\)$/.exec(v);
    if (via) return token(via[1]);
    const m = /oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+)\)/.exec(v);
    if (!m) throw new Error(`token --${name} unreadable: ${v}`);
    return oklch(Number(m[1]) / 100, Number(m[2]), Number(m[3]));
  };
  const lit = (L: number, C: number, H: number) => oklch(L / 100, C, H);
  /** `fg` at `alpha` over `bg`, composited as a browser does (gamma-encoded sRGB). */
  const over = (fg: RGB, alpha: number, bg: RGB): RGB => fg.map((c, i) => c * alpha + bg[i] * (1 - alpha)) as RGB;
  const lum = (c: RGB) => { const f = (x: number) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4); return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const ratio = (a: RGB, b: RGB) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  // The worst (lightest) stop of each surface a light ink sits on.
  const MODAL = lit(24, 0.165, 268);          // --wash-float's light stop
  const CARD = lit(24, 0.145, 268);           // --wash-raised's light stop (glass panels, cards)
  const ELEV = token("bg-elevated");
  const INSET = token("bg-inset");
  const BG = token("bg");
  const PAIRS: Array<[string, RGB, RGB, number]> = [
    ["the success crest's ink on its 18% disc (modal)", token("success-fg"), over(token("success-500"), 0.18, MODAL), 4.5],
    ["the failure crest's ink on its 18% disc (modal)", token("danger-fg"), over(token("danger-500"), 0.18, MODAL), 4.5],
    ["the dial's range chip: danger ink on its danger fill (card)", token("danger-fg"), over(token("danger-500"), 0.18, CARD), 4.5],
    ["a field error / a destructive hover: danger ink on a card", token("danger-fg"), CARD, 4.5],
    ["the Sign out plate's glyph: danger ink on its 10% plate (card)", token("danger-fg"), over(token("danger-500"), 0.10, CARD), 3],
    ["a success mark: success ink on a card", token("success-fg"), CARD, 4.5],
    ["the 2FA plate: success ink on its 10% plate (card)", token("success-fg"), over(token("success-500"), 0.10, CARD), 3],
    ["the free window's \"No fee\": success ink on its 18% box (modal)", token("success-fg"), over(token("success-500"), 0.18, MODAL), 4.5],
    ["the auth eyebrow: success / danger ink on the auth panel", token("danger-fg"), ELEV, 4.5],
    ["the dial's factual line: the faint ink on a card (Up & Down's own pair, 13px)", token("text-faint"), CARD, 4.5],
    ["the journey's brand pip (the bell, the Arifa row): pearl digits on `--brand-600`", token("pearl-50"), token("brand-600"), 4.5],
    ["a net earned on /updown/history: gilt on the elevated tile", token("gilt"), ELEV, 4.5],
    ["the balance's ±delta: text ink on the capsule's inset fill", token("text"), INSET, 4.5],
    ["the placed pulse: the success ring on the board (a mark)", token("success-500"), BG, 3],
    ["the language glyphs: brand-200 / brand-300 on the 90% scrim", token("brand-300"), over(BG, 0.9, MODAL), 4.5],
    ["global-error's mark: its danger ink on its 18% disc", lit(82, 0.16, 25), over(lit(57, 0.22, 25), 0.18, lit(15, 0.13, 268)), 4.5],
    ["the royal declaration box: muted text on `--info-bg` (card)", token("text-muted"), over(token("info-500"), 0.18, CARD), 4.5],
  ];
  // The grant chips sit on a finished row DIMMED to 70% (`opacity-70`), on `bg-bg-overlay/40` over the card — measured
  // there, ink and fill dimmed together (the worst case each chip is drawn in).
  const ROW = over(token("bg-overlay"), 0.4, CARD);
  const dimmed = (fg: RGB, fill: RGB, a: number): [RGB, RGB] => [over(fg, 0.7, CARD), over(over(fill, a, ROW), 0.7, CARD)];
  for (const [what, fg, fill, a] of [
    ["waiting (royal `pending`)", token("brand-300"), lit(54, 0.165, 262), 0.26],
    ["unlocked (`success`)", token("success-fg"), token("success-500"), 0.18],
    ["expired · cancelled · forfeited (slate `neutral`)", token("text-muted"), lit(34, 0.09, 268), 0.5],
  ] as Array<[string, RGB, RGB, number]>) {
    const [f, b] = dimmed(fg, fill, a);
    PAIRS.push([`the grant chip, ${what}, on its dimmed row`, f, b, 4.5]);
  }
  for (const [what, fg, bg, min] of PAIRS) {
    const r = ratio(fg, bg);
    ok(`5 · ${what} — ${r.toFixed(2)}:1 (≥ ${min})`, r >= min);
  }
  ok("5′ CONTROL · the calculator is honest: white on black 21:1, a colour on itself 1:1", Math.abs(ratio([1, 1, 1], [0, 0, 0]) - 21) < 1e-9 && Math.abs(ratio(ELEV, ELEV) - 1) < 1e-9);
  const before = ratio(token("pearl-50"), token("brand-500"));
  ok(`5″ CONTROL · the pip's digits on \`--brand-500\` (the fill before) measured ${before.toFixed(2)}:1 — under 4.5, the reason the fill is \`--brand-600\``, before < 4.5);
  ok("5‴ · the kit's brand pip is `--brand-600`", /brand: \{ background: "var\(--brand-600\)", color: "var\(--pearl-50\)" \}/.test(read("src/components/ui/count-badge.tsx")));
}

/* ══ §6 · WHAT MUST STAY ══════════════════════════════════════════════════════════════════════════════════════════════ */
section("6 · what must STAY — the sides keep the pair, a loss keeps the betting rose, the owner's items as they stand");
{
  ok("6.1 · the side buttons are the betting pair (the card, the dial, Up & Down)", /btn btn-yes/.test(read("src/components/markets/market-card.tsx")) && /"btn btn-yes btn-md" : "btn btn-no btn-md"/.test(read("src/components/markets/conviction-dial.tsx")) && /btn btn-no btn-lg/.test(read("src/components/updown/updown-stake-controls.tsx")));
  ok("6.2 · a placed bet's strip and button are its side (`stripTone` yes/no on both bet receipts)", /stripTone=\{placed\.side === "UP" \? "yes" : "no"\}/.test(read("src/components/updown/updown-bet-receipt-modal.tsx")) && /stripTone=\{resultData\.variant === "success" \? \(resultData\.side === "YES" \? "yes" : "no"\) : undefined\}/.test(read("src/components/markets/conviction-dial.tsx")));
  ok("6.3 · LOSS keeps the betting rose (the owner's ruling) — the position chip and a negative net", /return status === "LOSS" \? "no"/.test(read("src/lib/status-tone.ts")) && /LOSS: "Betting rose \(`no`\)/.test(read("src/lib/status-tone.ts")));
  ok("6.4 · the bar's sides keep their fills and the probability its YES ink", /--bar-fill-yes:/.test(CSS) && /color:\s*var\(--yes-400\)/.test(rule(CSS, ".mcardp-pct")));
  ok("6.5 · OWNER · the classic bell's count is still the rose pip, its \"Clear all\" hover the NO rose (frozen chrome; the change is written)",
    /const countTone = journey \? "brand" : "rose";/.test(read("src/components/layout/notifications-panel.tsx")) && /box-shadow:\s*0 0 8px var\(--no-500\)/.test(rule(CSS, '.count-badge[data-lift="rose"]')));
  ok("6.6 · OWNER · the classic capsule's ±delta keeps its YES/NO inks (frozen chrome)", /color: delta > 0 \? "var\(--yes-300\)" : "var\(--no-300\)"/.test(read("src/components/layout/wallet-balance-pill.tsx")));
  ok("6.7 · OWNER · `hot` still shares the NO rose with `no` in the chip (the split is the owner's call, §B2a)", /no:\s*ROSE,/.test(read("src/components/ui/chip.tsx")) && /hot:\s*ROSE,/.test(read("src/components/ui/chip.tsx")));
  ok("6.8 · no RG notice, helpline or limit control was touched: the RG page keeps its three neutral notices and its limits form",
    (read("src/app/profile/responsible-gambling/page.tsx").match(/<Callout tone="neutral" size="md" glyph="(?:lock|pause|clock)">/g) ?? []).length === 3
      && /<form action=\{setLimitsAction\}/.test(read("src/app/profile/responsible-gambling/page.tsx")));
}

console.log(`\nvisual-pass-r5i: ${pass} passed, ${fails.length} failed\n`);
if (fails.length) {
  for (const f of fails) console.error(`  · ${f}`);
  process.exit(1);
}
process.exit(0);
