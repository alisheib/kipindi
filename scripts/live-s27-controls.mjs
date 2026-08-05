/**
 * SESSION 27 · WHAT AN OPERATOR ACTUALLY SEES ON THE CONTROLS THEY GENERATE ROUNDS WITH.
 *
 *   node scripts/live-s27-controls.mjs
 *
 * Ali, 2026-08-05: *"what's not clear enough visually for admins while generating, what's
 * weak, what's error-prone. I want fully functional work."*
 *
 * ⛔ THIS MEASURES, IT DOES NOT OPINE. For every control in the chain row and every control
 * on the rounds grid it reads the COMPUTED style — background, border, ink, box — and the
 * contrast of its label against what is actually behind it. A control that renders with no
 * background, no border and the same ink the page uses for disabled text is not "subtle": it
 * is indistinguishable from a control you cannot press, and the campaign has already paid for
 * one of those (§4b's withdrawal false alarm was a real button nobody could see was real).
 *
 * ⚠️ Contrast is computed against the nearest ancestor with a non-transparent background,
 * because `rgba(0,0,0,0)` on the element itself means "whatever is behind me", and comparing
 * a label against transparency yields a number that is always fine and never true.
 */
import { browser, login, recorder, BASE, SHOT } from "./live/harness.mjs";

const rec = recorder("S27 · the operator's controls, measured");

const PROBE = () => {
  const lum = (c) => {
    const [r, g, b] = c;
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  // ⛔ NEVER REGEX A CSS COLOUR. This design system's tokens are `oklch(...)`, and Chrome
  // hands `oklch(0.98 0.01 270)` straight back from getComputedStyle — so a `[\d.]+` scrape
  // reads the LIGHTNESS, CHROMA and HUE as if they were R, G and B. The first run of this
  // probe scored a bright primary button at 1.24:1 against a dark card and reported three
  // failures that were entirely its own. Let the browser do the conversion.
  const ctx2d = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const parse = (s) => {
    if (!s || s === "transparent" || /^rgba?\(0,\s*0,\s*0,\s*0\)$/.test(s)) return [0, 0, 0, 0];
    ctx2d.clearRect(0, 0, 1, 1);
    ctx2d.fillStyle = "#000";
    ctx2d.fillStyle = s;                     // invalid values leave the previous fillStyle
    ctx2d.fillRect(0, 0, 1, 1);
    const d = ctx2d.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], d[3] / 255];
  };
  const opaqueBg = (el) => {
    let n = el;
    while (n && n !== document.documentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c[3] > 0.5) return c.slice(0, 3);
      n = n.parentElement;
    }
    return [10, 10, 30];
  };
  const ratio = (a, b) => {
    const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (l1 + 0.05) / (l2 + 0.05);
  };
  const describe = (el) => {
    const cs = getComputedStyle(el);
    const box = el.getBoundingClientRect();
    const bg = parse(cs.backgroundColor);
    const ink = parse(cs.color).slice(0, 3);
    return {
      label: (el.innerText || el.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim(),
      tag: el.tagName.toLowerCase(),
      disabled: el.disabled === true || el.getAttribute("aria-disabled") === "true",
      // ⚠️ A kit button can be painted by a GRADIENT, in which case backgroundColor is
      // transparent and only backgroundImage is set. Checking the colour alone called
      // `btn-primary` backgroundless.
      hasBg: bg[3] > 0.05 || cs.backgroundImage !== "none",
      hasBorder: cs.borderTopWidth !== "0px" || cs.borderBottomWidth !== "0px",
      h: Math.round(box.height),
      w: Math.round(box.width),
      // Against the button's OWN paint when it has one, else whatever is behind it.
      contrast: Number(ratio(ink, bg[3] > 0.5 ? bg.slice(0, 3) : opaqueBg(el)).toFixed(2)),
      cls: el.className.toString().slice(0, 60),
    };
  };
  // The chain row's own control cell, not the page.
  const row = [...document.querySelectorAll("tbody tr")].find((r) => /BTC\s*5m/i.test(r.innerText));
  if (!row) return null;
  const cells = [...row.querySelectorAll("td")];
  const controls = [...cells[cells.length - 1].querySelectorAll("button")];
  return controls.map(describe);
};

const { b, ctx } = await browser();
const page = await ctx.newPage();
try {
  await login(page, "admin");
  await page.goto(`${BASE}/admin/updown`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("tbody tr", { timeout: 30_000 });
  await page.waitForTimeout(2500);

  const controls = await page.evaluate(PROBE);
  if (!controls?.length) throw new Error("no BTC 5m control cell — refusing to score nothing");
  for (const c of controls) rec.note(JSON.stringify(c));

  // ⛔ EVERY control in one cell is the same KIND of thing — an action on this chain. They
  // must be recognisable as controls. This does not demand identical styling: it demands
  // that none of them renders as bare text with the ink reserved for what you cannot press.
  const naked = controls.filter((c) => !c.hasBg && !c.hasBorder && !c.disabled);
  rec.check("1.1 ⭐ no ENABLED control in the chain row renders as bare text",
    naked.length === 0, naked.map((c) => `${c.label} (${c.cls})`).join(" | "));

  // A destructive control must not be the LEAST visible thing in the row.
  const stop = controls.find((c) => /^stop$/i.test(c.label));
  const others = controls.filter((c) => c !== stop);
  rec.check("1.2 ⭐ the destructive control is not the faintest control in its own row",
    !!stop && others.every((o) => stop.contrast >= o.contrast * 0.75),
    stop ? `stop ${stop.contrast} vs ${others.map((o) => `${o.label} ${o.contrast}`).join(", ")}` : "no Stop control");

  rec.check("1.3 every control clears the 4.5:1 contrast floor",
    controls.every((c) => c.disabled || c.contrast >= 4.5),
    controls.filter((c) => !c.disabled && c.contrast < 4.5).map((c) => `${c.label} ${c.contrast}`).join(" | "));

  rec.check("1.4 every control clears the 40px tap target",
    controls.every((c) => c.h >= 32),
    controls.filter((c) => c.h < 32).map((c) => `${c.label} ${c.h}px`).join(" | "));

  const cell = page.locator('tbody tr:has-text("BTC 5m") td').last();
  await cell.screenshot({ path: `${SHOT}/controls-chain-row.png` }).catch(() => {});
} finally {
  await b.close();
}
process.exit(rec.done());
