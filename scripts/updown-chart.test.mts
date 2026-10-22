/**
 * 🔴 E-93 · THE SETTLEMENT PROOF'S OWN NUMBERS MUST NOT PRINT ON TOP OF EACH OTHER.
 *
 *   npx tsx scripts/updown-chart.test.mts     (npm run test:updown-chart)
 *
 * Found by LOOKING at a screenshot of a real production round, never by a suite. Round
 * `udr_2a915ca99cf124f513a8` — a no-move refund on a 0.50% band — closed at **$64,188.01**
 * against an UP target of **$64,265.72**. The live-price tag and the `UP $64,265.72` label are
 * both right-anchored against the same edge of the plot, so only their baselines separate them,
 * and at that distance they overlapped into an unreadable smudge **on the settlement proof** —
 * the one panel whose entire purpose is to be evidence a player can check.
 *
 * ⛔ THE OLD RULE COULD NOT AVOID IT: `isUp ? -12 : 18` is a constant, and a constant does not
 * know the target lines exist. This suite pins the PROPERTY — the tag clears every target
 * baseline — not the numbers, so a later change to the offsets stays legal as long as the
 * labels stay readable.
 *
 * ⚠️ This is a per-element collision. `document.scrollWidth` cannot see it and neither can any
 * "0 horizontal overflow" bar (§0.1b rule 3): two texts overlapping inside an SVG overflow
 * nothing at all.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PriceHero, priceTagOffsetY } from "../src/components/updown/price-hero.tsx";

let pass = 0; const fails: string[] = [];
const ok = (n: string, c: boolean, d = "") => { if (c) pass++; else fails.push(`${n}${d ? ` — ${d}` : ""}`); };

/** One line of 8.5px mono plus air, in viewBox units — the same floor the component uses. */
const MIN_GAP = 13;
const clears = (lastY: number, targets: Array<number | null>, preferAbove: boolean) => {
  const dy = priceTagOffsetY(lastY, targets, preferAbove);
  const ts = targets.filter((t): t is number => t != null);
  return { dy, gap: ts.length ? Math.min(...ts.map((t) => Math.abs(lastY + dy - t))) : Infinity };
};

// ── §1 · THE PRODUCTION CASE, IN THE PLOT'S OWN UNITS ──────────────────────
//
// viewBox 640×220, plot y 18..196. In that round the close sat ~10 units below the UP target
// line, so a −12 offset put the tag's baseline within 2 units of the label's. That is the
// overlap in the screenshot.
{
  const lastY = 100;                 // the close point
  const upBaseline = 90 - 4;         // the UP label sits 4 above its line at y=90
  const { dy, gap } = clears(lastY, [upBaseline, null], true);
  ok("1.1 ⭐ the tag clears the UP label it used to print on top of", gap >= MIN_GAP,
     `offset ${dy} → gap ${gap.toFixed(1)} (needs ${MIN_GAP})`);
  ok("1.2 …and it does so by MOVING, not by refusing to render", Number.isFinite(dy));
}

// ── §2 · THE MIRROR CASE — a falling price beside the DOWN label ───────────
{
  const lastY = 100;
  const downBaseline = 112 + 11;     // the DOWN label sits 11 below its line at y=112
  const { dy, gap } = clears(lastY, [null, downBaseline], false);
  ok("2.1 ⭐ a falling price clears the DOWN label", gap >= MIN_GAP,
     `offset ${dy} → gap ${gap.toFixed(1)}`);
}

// ── §3 · THE ORDINARY ROUND IS UNCHANGED ───────────────────────────────────
//
// ⛔ A fix that moved the tag on EVERY round would be a redesign, not a repair. With the
// targets far away the tag keeps the position it has always had.
{
  ok("3.1 a rising price far from both targets still sits 12 above its point",
     priceTagOffsetY(100, [40 - 4, 170 + 11], true) === -12);
  ok("3.2 a falling price far from both targets still sits 18 below its point",
     priceTagOffsetY(100, [40 - 4, 170 + 11], false) === 18);
  ok("3.3 with no targets at all the preferred side is used unconditionally",
     priceTagOffsetY(100, [null, null], true) === -12 && priceTagOffsetY(100, [], false) === 18);
}

// ── §4 · BOXED IN — the tick-floor band, where the two lines are ~1 unit apart ──
//
// On the recommended band the targets are ±$0.02, which after the 35% domain padding puts both
// lines within a few units of the close. NOTHING can clear 13 units there, and the honest
// behaviour is to take the roomiest position rather than to pick a constant and hope.
{
  const lastY = 100;
  const targets = [99 - 4, 101 + 11];
  const dy = priceTagOffsetY(lastY, targets, true);
  const gap = Math.min(...targets.map((t) => Math.abs(lastY + dy - t)));
  const fixedGap = Math.min(...targets.map((t) => Math.abs(lastY - 12 - t)));
  ok("4.1 ⭐ when no offset can clear, the roomiest one is chosen — never worse than the old constant",
     gap >= fixedGap, `chose ${dy} → ${gap.toFixed(1)}, the old constant gave ${fixedGap.toFixed(1)}`);
  ok("4.2 …and it is still one of the offered positions, not an invented coordinate",
     [-12, 18, -28, 34].includes(dy), String(dy));
}

// ── §5 · THE CALL SITE — a correct helper nobody calls is the E-4 shape ────
{
  const src = (await import("node:fs")).readFileSync(
    new URL("../src/components/updown/price-hero.tsx", import.meta.url), "utf8");
  ok("5.1 the component computes its tag from this helper",
     /tagY = \(parseFloat\(lastY\) \+ priceTagOffsetY\(/.test(src),
     "the arithmetic being right does not move the label on screen");
  ok("5.2 ⛔ and the OLD constant is gone, not merely bypassed",
     !/\(isUp \? -12 : 18\)/.test(src),
     "a short-circuited call leaves every character of the fix in place (SKILL §5b.1)");
  // ⛔ SCOPE IT TO THE CALL. The first version of this check searched the whole FILE for
  // `parseFloat(upY) - 4` — and the file contains that expression already, in the `<text>` that
  // DRAWS the UP label. So the check matched the render site, the mutation that passes the LINE
  // positions instead of the LABEL baselines sailed through, and the RED harness reported a
  // MISS. A guard that matches an expression somewhere in the file is not measuring the call.
  ok("5.3 the helper is given BOTH target baselines, offset exactly as they are drawn",
     /priceTagOffsetY\(\s*parseFloat\(lastY\),[\s\S]{0,260}?parseFloat\(upY\) - 4[\s\S]{0,120}?parseFloat\(downY\) \+ 11/.test(src),
     "passing the LINE positions instead of the LABEL baselines measures the wrong gap");
}

// ── §6 · the confirmed value follows settlement's target-side tone; the opening reference is gilt ──
{
  const render = (tone: "up" | "down" | "level", livePrice: number, upTarget = 101, downTarget = 99) => renderToStaticMarkup(createElement(PriceHero, {
    openPrice: 100, upTarget, downTarget, livePrice,
    priceSeries: [{ t: "2026-10-19T10:30:00.000Z", price: 100 }, { t: "2026-10-19T10:31:00.000Z", price: livePrice }],
    decimals: 2, tone,
    copy: { priceLabel: "Confirmed price", openLabel: "Open", upLabel: "Up target", downLabel: "Down target",
      awaitingRead: "Awaiting read", aboveBelow: null, source: null, chartAlt: "Confirmed round prices" },
  }));
  for (const { tone, livePrice, ink } of [
    { tone: "up", livePrice: 102, ink: "yes-300" },
    { tone: "down", livePrice: 98, ink: "no-300" },
    { tone: "level", livePrice: 100, ink: "text-muted" },
  ] as const) {
    const html = render(tone, livePrice);
    const gradients = html.slice(html.indexOf("<defs>"), html.indexOf("</defs>") + 7);
    const expected = `var(--${ink})`;
    ok(`6.1 ${tone}: confirmed number, move, path, point and tag follow the target-side tone`,
      html.includes(`data-tone="${tone}"`)
      && html.includes(`color:${expected}">$${livePrice.toFixed(2)}</span>`)
      && new RegExp(`class="font-mono font-semibold tabular-nums" style="[^"]*color:var\\(--${ink}\\)"`).test(html)
      && html.includes(`fill="none" stroke="${expected}" stroke-width="2.25"`)
      && new RegExp(`<circle class="ud-point"[^>]*fill="var\\(--${ink}\\)"`).test(html)
      && html.includes(`fill="${expected}" font-family="var(--font-mono)" font-size="11" font-weight="700">$${livePrice.toFixed(2)}</text>`),
      "all five readings must agree with the supplied settlement tone");
    ok(`6.2 ${tone}: opening reference is gilt and both observed-price washes keep their sides`,
      /<line x1="0" y1="[^"]+" x2="606" y2="[^"]+" stroke="var\(--gilt\)" stroke-width="1\.25"/.test(html)
      && /<text class="ud-svg-label" x="0"[^>]*fill="var\(--gilt\)"/.test(html)
      && gradients.includes('id="udUp"') && gradients.includes('id="udDown"')
      && /id="udUp"[\s\S]*?stop-color="var\(--yes-400\)"/.test(gradients)
      && /id="udDown"[\s\S]*?stop-color="var\(--no-400\)"/.test(gradients)
      && !html.includes('fill="none" stroke="var(--gilt)" stroke-width="2.25"'),
      "gold is the named reference, not the observed-price path");
    ok(`6.3 ${tone}: UP and DOWN target lines and labels retain side colours`,
      /<line x1="0" y1="[^"]+" x2="606" y2="[^"]+" stroke="var\(--yes-400\)"/.test(html)
      && /<line x1="0" y1="[^"]+" x2="606" y2="[^"]+" stroke="var\(--no-400\)"/.test(html)
      && /style="color:var\(--yes-300\)"[^>]*>UP TARGET/.test(html)
      && /style="color:var\(--no-300\)"[^>]*>DOWN TARGET/.test(html));
  }
  const banded = render("level", 101.5, 103, 101);
  ok("6.4 a read above open but strictly inside the target band remains level/muted",
    banded.includes('data-tone="level"')
    && banded.includes('color:var(--text-muted)">$101.50</span>')
    && banded.includes('fill="none" stroke="var(--text-muted)" stroke-width="2.25"')
    && !banded.includes('fill="none" stroke="var(--yes-300)" stroke-width="2.25"'),
    "the opening delta cannot replace the settlement target rule");
}

console.log(`\nUP & DOWN CHART LABELS — ${pass} passed, ${fails.length} failed`);
if (fails.length) { for (const f of fails) console.log(`  ✗ ${f}`); process.exit(1); }
