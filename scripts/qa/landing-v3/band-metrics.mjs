// Landing v3 · WP12 (R5, "the Match") — the Up & Down band's NUMERIC FRAME GATE (spec updown-band-v2 §15.4).
//
// It measures the band by bounding box, prints the figures, and exits 1 on any breach. Nothing here
// trusts a class list: every line count is the element's height over its own computed line-height, and
// every "one row" is two boxes' tops compared.
//
// Two ways to run it:
//   · imported by `band-drive.mjs`, which seeds each state and calls `measureBand(page)` + `judgeBand()`;
//   · on its own against whatever the server shows now (production, after the push):
//       BASE=https://50pick.tz STATE=S1 CELLS=360-sw,768-en,1280-en node scripts/qa/landing-v3/band-metrics.mjs
//     STATE is the state you expect; the run fails if the band is in another one (data-lead / data-aged /
//     data-closed disagree), because a gate measured on the wrong population measures nothing.
//
// ⭐ ITS RED CONTROL: METRICS_PROVE_RED=1 injects a style that wraps the clock caption and lengthens the
// band. The run must then REPORT BOTH breaches; it exits 0 only if it did ("RED PROVED"), and 1 if either
// went unreported ("RED BLIND"). A gate that cannot see a planted defect is not a gate.
import { chromium } from "playwright";
import { pathToFileURL } from "node:url";

/** The frame gate's numbers (§15.4), in one place. */
export const LIMITS = {
  bandMax360: { S1: 600, S2: 600, S5: 600, S6: 600, S3: 640, S4: 620 },
  clockToPickMax: 170,
  bandMax1280: 380,
  pickH: 48,
  sideMin768: 112,
  roundColMin1024: 480,
  verdictPx1024: 24,
  textFloorPx: 13,
};

/** The RED plant: the caption may wrap and the band grows by 400px. Both must be reported. */
export const RED_STYLE = `
  .kp-udclock__cap { white-space: normal !important; max-width: 4ch !important; display: inline-block !important; }
  .kp-updown { padding-bottom: 400px !important; }
`;

/** Runs IN THE PAGE. Returns every figure the gate judges, or { missing } when there is no band. */
export function MEASURE_BAND() {
  const band = document.querySelector('[data-band="updown"]');
  const wrap = band?.querySelector(".kp-updown");
  if (!band || !wrap) return { missing: "no [data-band=updown] .kp-updown on the page" };
  const vis = (el) => {
    if (!el) return false;
    const b = el.getBoundingClientRect(); const s = getComputedStyle(el);
    return b.width > 0 && b.height > 0 && s.visibility !== "hidden" && s.display !== "none";
  };
  const box = (el) => {
    if (!vis(el)) return null;
    const b = el.getBoundingClientRect();
    return { top: Math.round(b.top + scrollY), bottom: Math.round(b.bottom + scrollY), left: Math.round(b.left),
      right: Math.round(b.right), w: Math.round(b.width * 10) / 10, h: Math.round(b.height * 10) / 10 };
  };
  const lines = (el) => {
    if (!vis(el)) return null;
    const s = getComputedStyle(el);
    let lh = parseFloat(s.lineHeight);
    if (!Number.isFinite(lh)) lh = parseFloat(s.fontSize) * 1.2;
    const padV = parseFloat(s.paddingTop) + parseFloat(s.paddingBottom);
    return Math.max(1, Math.round((el.getBoundingClientRect().height - padV) / lh));
  };
  const text = (el) => (el?.textContent || "").replace(/\s+/g, " ").trim();
  const q = (sel) => wrap.querySelector(sel);
  const qa = (sel) => [...wrap.querySelectorAll(sel)].filter(vis);
  const bug = q(".kp-udbug");
  const solo = wrap.classList.contains("kp-updown--solo");
  const verdict = q(".kp-udbug__verdict");
  const detail = q(".kp-udbug__detail");
  const note = q(".kp-udbug__note");
  const clockOpen = q(".kp-udclock__row--open");
  const clockClosed = q(".kp-udclock__row--closed");
  const clockRow = vis(clockOpen) ? clockOpen : vis(clockClosed) ? clockClosed : null;
  const picks = qa(".kp-udbug__pick");
  const sides = qa(".kp-udbug__side");
  const taps = picks.length ? picks : sides;
  const rule = q(".kp-udrule");
  const ruleText = rule?.querySelector(":scope > span:last-child");
  const fixture = q(".kp-udmatch__fixture");
  const copy = q(".kp-updown__copy");
  const round = q(".kp-udmatch");
  const track = q(".kp-udtrack");

  // |Δ| from the detail's amount (the one money figure in the plate), for "detail 1 line when |Δ| < $1,000".
  const amountText = text(detail?.querySelector(".amount"));
  const delta = amountText ? Number(amountText.replace(/[^0-9.]/g, "")) : null;

  // Text under the 13px sentence floor, outside the kit's Chip, the eyebrow and the section link.
  const small = [];
  const walker = document.createTreeWalker(wrap, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.textContent.trim()) continue;
    const el = n.parentElement;
    if (!vis(el)) continue;
    // The kit's Chip emits no class — its instrument hook is `data-kit-chip` (chip.tsx, PV-13c).
    if (el.closest("[data-kit-chip], .kp-hero__eyebrow, .kp-shead__link")) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 13) small.push(`${(el.className?.baseVal ?? el.className ?? "").toString().slice(0, 36)}:${fs}px:${n.textContent.trim().slice(0, 20)}`);
  }

  // Green marks in the ROUND panel (the copy column's live dot is the eyebrow's, not the score's): every
  // element whose text, fill, stroke or background resolves to a DEFINED yes ink. ⛔ An undefined custom
  // property makes `var()` fall back to the inherited colour, which would count every plain text as green.
  const probe = document.createElement("span");
  probe.style.color = "rgb(1, 2, 3)";
  document.body.appendChild(probe);
  const root = getComputedStyle(document.documentElement);
  const inkOf = (v) => { if (!root.getPropertyValue(v).trim()) return null; probe.style.backgroundColor = `var(${v})`; return getComputedStyle(probe).backgroundColor; };
  const yes = new Set(["--yes-200", "--yes-300", "--yes-400", "--yes-500", "--yes-600", "--yes-700"].map(inkOf).filter((c) => c && c !== "rgba(0, 0, 0, 0)"));
  probe.remove();
  const green = new Map();
  for (const el of (round ?? wrap).querySelectorAll("*")) {
    if (!vis(el) && !(el instanceof SVGElement)) continue;
    const s = getComputedStyle(el);
    const hit = ["color", "backgroundColor", "fill", "stroke", "borderTopColor"].filter((p) => yes.has(s[p]));
    if (!hit.length) continue;
    if (hit.length === 1 && hit[0] === "color" && !(el.textContent || "").trim() && !(el instanceof SVGElement)) continue;
    // Counted as the spec's KINDS (§15.4): the verdict (words + arrow), the Up pick, the newest stem + bead,
    // the earlier Up stems. Anything else green is named by its own class — and is a breach.
    const kind = el.closest(".kp-udbug__verdict") ? "verdict"
      : el.closest(".kp-udbug__pick--up") ? "up pick"
      : el.closest(".kp-udtrack__stem--latest, .kp-udtrack__bead") ? "newest stem + bead"
      : el.closest(".kp-udtrack__stem--up") ? "earlier Up stems"
      : (el.className?.baseVal ?? el.className ?? "").toString().split(/\s+/).filter(Boolean).slice(-1)[0] || el.tagName.toLowerCase();
    green.set(kind, (green.get(kind) || 0) + 1);
  }

  // Clipping inside the band: a leaf with text whose content overflows a box that clips it.
  const clipped = [...wrap.querySelectorAll("*")].filter((e) => vis(e) && e.children.length === 0 && text(e) &&
    e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== "visible").map((e) => `${(e.className?.baseVal ?? e.className ?? "").toString().slice(0, 30)}:${text(e).slice(0, 24)}`);

  // The detail's one-line need against its room: what it would take unwrapped, and what the plate gives it.
  let detailNeed = null, detailRoom = null;
  if (vis(detail)) {
    const mid = detail.parentElement; const ms = getComputedStyle(mid);
    detailRoom = Math.round(mid.clientWidth - parseFloat(ms.paddingLeft) - parseFloat(ms.paddingRight));
    const prev = detail.style.whiteSpace; detail.style.whiteSpace = "nowrap";
    detailNeed = Math.ceil(detail.scrollWidth); detail.style.whiteSpace = prev;
  }
  const fab = document.querySelector(".cm-fab");
  const plate = bug ? box(bug) : null;
  // The playhead against the newest data mark (latest stem, or the last tie tick): their boxes must not overlap
  // (frame panel round 2 — "now" and "the last read" fused into one two-tone line).
  const rectOf = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return b.width || b.height ? b : null; };
  const nowR = rectOf(q(".kp-udtrack__now"));
  const ties = [...wrap.querySelectorAll(".kp-udtrack__tie")];
  const markR = rectOf(q(".kp-udtrack__stem--latest")) && rectOf(ties.at(-1))
    ? [rectOf(q(".kp-udtrack__stem--latest")), rectOf(ties.at(-1))].sort((a, b) => b.left - a.left)[0]
    : rectOf(q(".kp-udtrack__stem--latest")) ?? rectOf(ties.at(-1)) ?? rectOf(q(".kp-udtrack__kick"));
  const overlap = nowR && markR
    ? Math.max(0, Math.min(nowR.right, markR.right + 1) - Math.max(nowR.left, markR.left - 1))
      * Math.max(0, Math.min(nowR.bottom, markR.bottom + 1) - Math.max(nowR.top, markR.top - 1))
    : 0;
  // S8 (and every state's last act): the act keeps its air — from the copy above, and to the card's edge below.
  const lastAct = [...wrap.querySelectorAll(".kp-updown__acts > *")].filter(vis).at(-1);
  const actR = rectOf(lastAct), wrapR = wrap.getBoundingClientRect(), copyR = rectOf(copy);
  const padB = parseFloat(getComputedStyle(wrap).paddingBottom);
  return {
    innerWidth, innerHeight,
    overflowX: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
    solo,
    lead: bug?.getAttribute("data-lead") ?? null,
    aged: wrap.hasAttribute("data-aged"),
    closed: wrap.hasAttribute("data-closed"),
    band: box(band), wrap: box(wrap), copy: box(copy), round: box(round), plate, track: box(track),
    fixture: box(fixture), clockRow: box(clockRow), clockRowClosed: vis(clockClosed),
    // max(row, caption): the row is a fixed 20px, so a caption that wraps overflows it without growing it — the
    // row alone would read one line (the RED control went blind to exactly that on drive 5).
    clockRowLines: clockRow ? Math.max(lines(clockRow) ?? 1, lines(clockRow.querySelector(".kp-udclock__cap")) ?? 1) : null,
    verdict: box(verdict), verdictLines: lines(verdict), verdictPx: verdict ? parseFloat(getComputedStyle(verdict).fontSize) : null,
    verdictText: text(verdict),
    detail: box(detail), detailLines: lines(detail), detailText: text(detail), delta, detailNeed, detailRoom,
    note: box(note), noteText: text(note),
    taps: taps.map((p) => ({ ...box(p), text: text(p), cls: picks.length ? "pick" : "side" })),
    tapKind: picks.length ? "pick" : sides.length ? "side" : null,
    rule: box(rule), ruleLines: lines(ruleText), ruleText: text(rule),
    acts: [...wrap.querySelectorAll(".kp-updown__acts a")].filter(vis).map((a) => ({ ...box(a), text: text(a) })),
    small, green: Object.fromEntries(green), clipped,
    fab: fab && vis(fab) ? box(fab) : null,
    nowMarkOverlap: Math.round(overlap * 10) / 10,
    actToEdge: actR ? Math.round(wrapR.bottom - actR.bottom) : null, padBottom: padB,
    copyToAct: actR && copyR && solo ? Math.round(actR.top - copyR.bottom) : null,
    plateFromTop: plate ? Math.round(bug.getBoundingClientRect().top - wrapR.top) : null,
    focus: document.activeElement ? `${document.activeElement.tagName}.${(document.activeElement.className || "").toString().split(/\s+/).slice(-1)[0]}` : null,
  };
}

/** What the band's attributes say its state is — S1..S8, from the page itself. */
export function stateOf(f) {
  if (f.missing) return null;
  if (f.solo) return "S8";
  if (f.closed) return "S7";
  if (f.aged && (f.lead === "up" || f.lead === "down" || f.lead === "level")) return "S5";
  return { up: "S1", down: "S2", level: "S3", kickoff: "S4", awaiting: "S6" }[f.lead] ?? null;
}

/**
 * Judge one measured cell. `cell` = { w, loc, state }; `ref` = the same cell's S1 figures, for S7's
 * "no taller than S1 + 4px, and the clock row keeps its height". Returns a list of breach strings.
 */
export function judgeBand(f, cell, ref = null) {
  const out = [];
  const bad = (m) => out.push(m);
  if (f.missing) return [f.missing];
  const seen = stateOf(f);
  if (cell.state && seen !== cell.state && !(cell.state === "S5" && seen === "S5")) bad(`state: expected ${cell.state}, the band shows ${seen} (lead=${f.lead} aged=${f.aged} closed=${f.closed})`);
  if (f.overflowX > 0) bad(`V1 horizontal overflow ${f.overflowX}px`);
  if (f.clipped.length) bad(`V2 clipped: ${f.clipped.join(" | ")}`);
  if (seen === "S8") {
    if (f.copyToAct != null && f.copyToAct < 12) bad(`S8: the Play button sits ${f.copyToAct}px under the copy (≥ 12)`);
    if (f.actToEdge != null && f.actToEdge < f.padBottom - 0.5) bad(`S8: the Play button is ${f.actToEdge}px off the card's edge (≥ ${f.padBottom})`);
    return out;
  }
  if (f.nowMarkOverlap > 0) bad(`the playhead overlaps the newest read by ${f.nowMarkOverlap}px²`);
  // The band's height is the CARD's (`.kp-updown`, border to border) — the spec's ≈592px sum is the card's
  // content; the section around it adds the page rhythm's padding, which is not the band's to budget.
  const H = f.wrap?.h ?? 0;
  const { w } = cell;
  // 320 is measured for V1 and V2 only (§15.4): below ~340px the kick-off verdict breaks at its dot by design.
  if (w < 360) return out;
  const pickBottom = Math.max(...f.taps.map((p) => p.bottom));
  // The height and span budgets are the spec's 360 × sw cells; en and zh at 360 are printed, not judged.
  if (w === 360 && cell.loc === "sw") {
    const max = LIMITS.bandMax360[seen];
    if (max && H > max) bad(`band ${H}px > ${max}px (${seen} at ${w})`);
    if (["S1", "S2", "S5", "S6"].includes(seen) && f.clockRow && f.taps.length) {
      const span = pickBottom - f.clockRow.top;
      if (span > LIMITS.clockToPickMax) bad(`clock-row top → pick bottom ${span}px > ${LIMITS.clockToPickMax}px`);
    }
  }
  if (w >= 1280 && H > LIMITS.bandMax1280) bad(`band ${H}px > ${LIMITS.bandMax1280}px at ${w}`);
  if (f.verdictLines > 1) bad(`verdict wraps to ${f.verdictLines} lines: "${f.verdictText}"`);
  // One line for a lead's dated move (S1, S2, and S5 of either); the level and kick-off lines are longer by
  // design and budgeted by the band's height instead (§15.4: S3 ≤ 640, S4 ≤ 620).
  if ((f.lead === "up" || f.lead === "down") && f.detail && f.delta != null && f.delta < 1000 && f.detailLines > 1) bad(`detail wraps to ${f.detailLines} lines (|Δ| $${f.delta}): "${f.detailText}"`);
  if (f.clockRow && f.clockRowLines > 1) bad(`clock row wraps to ${f.clockRowLines} lines`);
  if (f.rule && f.ruleLines > 2) bad(`rule runs to ${f.ruleLines} lines`);
  if (f.taps.length !== 2) bad(`${f.taps.length} taps in the plate, want 2`);
  else {
    for (const p of f.taps) if (Math.abs(p.h - LIMITS.pickH) > 0.6) bad(`${p.cls} "${p.text}" is ${p.h}px tall, want ${LIMITS.pickH}`);
    if (Math.abs(f.taps[0].w - f.taps[1].w) > 1) bad(`${f.tapKind}s unequal: ${f.taps[0].w} vs ${f.taps[1].w}`);
  }
  if (w >= 768 && f.taps.length === 2 && f.verdict) {
    // one-row plate: both taps share the verdict's row
    for (const p of f.taps) if (p.top >= f.verdict.bottom || p.bottom <= f.verdict.top) bad(`plate not one row at ${w}: ${p.cls} ${p.top}-${p.bottom} vs verdict ${f.verdict.top}-${f.verdict.bottom}`);
    for (const p of f.taps) if (p.w < LIMITS.sideMin768) bad(`${p.cls} ${p.w}px < ${LIMITS.sideMin768}px`);
    if (f.fixture && f.clockRow && Math.abs((f.fixture.top + f.fixture.bottom) / 2 - (f.clockRow.top + f.clockRow.bottom) / 2) > 8) bad(`fixture and clock not on one row at ${w}`);
  }
  if (w >= 1024 && f.copy && f.round) {
    const ratio = f.copy.w / f.round.w;
    if (Math.abs(ratio - 5 / 7) > 0.08) bad(`copy/round split ${f.copy.w}/${f.round.w} = ${ratio.toFixed(2)}, want 5/7 (0.71)`);
    if (f.round.w < LIMITS.roundColMin1024) bad(`round column ${f.round.w}px < ${LIMITS.roundColMin1024}px`);
    if (f.verdictPx != null && f.verdictPx < LIMITS.verdictPx1024) bad(`verdict ${f.verdictPx}px < ${LIMITS.verdictPx1024}px at ${w}`);
  }
  if (w >= 1280 && f.plate && f.taps.length === 2) {
    const mid = (f.plate.top + f.plate.bottom) / 2;
    for (const p of f.taps) if (Math.abs((p.top + p.bottom) / 2 - mid) > 1) bad(`${p.cls} not centred in the plate (${((p.top + p.bottom) / 2 - mid).toFixed(1)}px)`);
  }
  if (seen === "S1") {
    const kinds = Object.keys(f.green);
    const ALLOWED = ["verdict", "up pick", "newest stem + bead", "earlier Up stems"];
    const stray = kinds.filter((k) => !ALLOWED.includes(k));
    if (kinds.length > 4 || stray.length) bad(`green marks in S1: ${kinds.length} kinds (${kinds.join(", ")}), want ≤ 4 of ${ALLOWED.join(" / ")}`);
  }
  if (f.small.length) bad(`text under 13px outside the kit's labels: ${f.small.join(" | ")}`);
  if (seen === "S7" && ref && ref.wrap && f.wrap) {
    if (f.wrap.h > ref.wrap.h + 4) bad(`S7 band ${f.wrap.h}px > S1 ${ref.wrap.h}px + 4`);
    if (ref.clockRow && f.clockRow && Math.abs(f.clockRow.h - ref.clockRow.h) > 0.6) bad(`S7 clock row ${f.clockRow.h}px ≠ S1 ${ref.clockRow.h}px`);
  }
  return out;
}

/** One line of figures for the log. */
export function figuresLine(f) {
  if (f.missing) return f.missing;
  const t = f.taps.map((p) => `${p.w}x${p.h}`).join("/");
  return `card=${f.wrap?.h}px section=${f.band?.h}px lead=${f.lead}${f.aged ? " aged" : ""}${f.closed ? " closed" : ""} verdict=${f.verdictLines}L@${f.verdictPx}px detail=${f.detailLines ?? "-"}L(${f.detailNeed ?? "-"}/${f.detailRoom ?? "-"}px) clock=${f.clockRowLines ?? "-"}L rule=${f.ruleLines ?? "-"}L taps=${t} clock→pick=${f.clockRow && f.taps.length ? Math.max(...f.taps.map((p) => p.bottom)) - f.clockRow.top : "-"} overflowX=${f.overflowX} green=${Object.keys(f.green).join(",") || "-"}${f.fab ? ` fab=${f.fab.left},${f.fab.top}` : ""}`;
}

/** Scroll the band into view below the header and let its Reveal finish. */
export async function showBand(page) {
  await page.evaluate(() => {
    const b = document.querySelector('[data-band="updown"]');
    if (!b) return;
    const header = document.querySelector("header");
    const off = header ? header.getBoundingClientRect().height : 0;
    scrollTo(0, Math.max(0, b.getBoundingClientRect().top + scrollY - off - 8));
  });
  await page.waitForTimeout(900);
}

// ── CLI ─────────────────────────────────────────────────────────────────────────────────────────
if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  const BASE = process.env.BASE || "http://localhost:3057";
  const STATE = process.env.STATE || "";
  const RED = process.env.METRICS_PROVE_RED === "1";
  const CELLS = (process.env.CELLS || "360-sw").split(",").map((c) => { const [w, loc] = c.split("-"); return { w: Number(w), loc }; });
  const H = { 320: 640, 360: 780, 768: 1024, 1024: 900, 1280: 860 };
  const browser = await chromium.launch({ headless: true });
  let breaches = 0;
  let redSeen = { caption: false, band: false };
  for (const { w, loc } of CELLS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: H[w] || 900 }, deviceScaleFactor: 1 });
    if (loc !== "sw") await ctx.addCookies([{ name: "kp-locale", value: loc, domain: new URL(BASE).hostname, path: "/" }]);
    await ctx.addInitScript(() => { try { localStorage.setItem("50pick-primer-seen", "1"); } catch {} });
    const page = await ctx.newPage();
    await page.goto(BASE + "/", { waitUntil: "load", timeout: 120000 });
    await page.waitForTimeout(3000);
    if (RED) await page.addStyleTag({ content: RED_STYLE });
    await showBand(page);
    const f = await page.evaluate(MEASURE_BAND);
    // SHOTS=<dir>: keep the frame (a viewport tile with the band under the header) for looking at.
    if (process.env.SHOTS) {
      const { mkdirSync } = await import("node:fs");
      mkdirSync(process.env.SHOTS, { recursive: true });
      await page.screenshot({ path: `${process.env.SHOTS}/${stateOf(f) ?? "none"}-${w}-${loc}.png` });
    }
    const b = judgeBand(f, { w, loc, state: STATE || stateOf(f) });
    console.log(`${w}-${loc} ${stateOf(f)} ${figuresLine(f)}`);
    for (const m of b) console.log(`  BREACH ${m}`);
    breaches += b.length;
    if (RED) {
      if (b.some((m) => m.startsWith("clock row wraps"))) redSeen.caption = true;
      if (b.some((m) => /^band \d/.test(m))) redSeen.band = true;
    }
    await ctx.close();
  }
  await browser.close();
  if (RED) {
    const proved = redSeen.caption && redSeen.band;
    console.log(proved ? "RED PROVED — the gate reported the wrapped caption and the long band" : `RED BLIND — caption ${redSeen.caption ? "seen" : "MISSED"}, band ${redSeen.band ? "seen" : "MISSED"}`);
    process.exit(proved ? 0 : 1);
  }
  console.log(breaches ? `band-metrics: ${breaches} breach(es)` : "band-metrics: CLEAN");
  process.exit(breaches ? 1 : 0);
}
