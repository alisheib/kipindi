/**
 * ⭐ THE RULES OF `qa:bar-geometry`, IN ONE PLACE — imported by the drive (`bar-geometry-drive.mjs`), by its red twin
 * (`scripts/red-bar-geometry.mjs`) and by the static proof that pins them (`scripts/visual-pass-r5f.test.mts`), so a gate,
 * its red proof and the suite that guards both can never disagree about what a measurement MEANS. The same shape as
 * `clip.mjs`, which the seal and its red harness share for the same reason.
 *
 * ── WHY IT WAS SPLIT OUT (round 5 of the visual pass, R5-F, 2026-10-09) ────────────────────────────────────────────────
 * 🔴 THE DRIVE READ RED ON MAIN ITSELF — 88 failures at a6331ca1, the same 88 + 4 on the visual-pass tip — and its red twin
 * refused to run while it did ("already RED on /proposals"), so for a whole round neither proved anything. Every one of
 * the 92 was the instrument, not the app (the R5-F report has the evidence):
 *   · 63 × "NO [data-filter-rail]" — the run had no fixture. Seven routes withhold their bar on an EMPTY book by design
 *     (§A5; every guard dates from 2026-09-08, the day those routes were declared here), and the lock turn ran the drive
 *     on a fresh in-memory store without `npm run fixture:player`. ⇒ `judgeMissingRail`.
 *   · 14 × "OVERLAP" on /markets at 360 — since U4 (2c9380e00, 2026-09-23) the phone bar is ONE grid line: the lens strip
 *     (`overflow-x: auto`, masked) in column 1, sort and Filters in columns 2–3. A chip that runs past the strip's edge is
 *     scrolled-away content — the strip clips it, so it is neither painted nor hit there. The drive compared LAYOUT boxes,
 *     so it "found" chips under the sort control that nobody can see. ⇒ `CONTROL_PROBE`'s painted box + `findOverlaps`.
 *   · 8 × "ANOTHER STICKY SURFACE … header.sticky.top-0" and 3 × "THE BAR DID NOT STICK" at 1280 on main (7 on the tip,
 *     where round 4's tighter bands left /results' column 45px shorter and /notifications' bar 4px taller, so the same
 *     push went further) — the drive scrolled to
 *     1200, the thin fixture clamped that to the page's maximum (559), and by then each bar's PARENT had ended, pushing the
 *     bar up under the header exactly as a sticky element must (measured: bar bottom = parent content bottom on all three
 *     routes, `S/runs/wm16e-stick-*.log`). Rule ① only knew "the page did not scroll"; it did not know "the page scrolled
 *     past the bar's own range". ⇒ `planStick` measures INSIDE that range, or says NOT MEASURED, or — if rows run on past
 *     the parent's end, the /updown/history `bar@-252` shape — fails.
 *
 * ⛔ THE PROBES RUN IN THE BROWSER: real functions, never strings (`clip.mjs` records why — E-191), and self-contained —
 *    Playwright serialises their source, so they may not reach anything outside their own bodies.
 */

/** ⛔ The travel a stick must be shown over before it counts as proved — rule ①'s 200px, kept. */
export const MIN_TRAVEL = 200;
/** How far past the bar's own place the drive scrolls on a long page (the old `scrollTo(0, 1200)`, made relative). */
export const REACH = 1200;
/** A stuck bar sits ON its own `top`; two pixels absorb sub-pixel layout and nothing else. */
export const STUCK_TOLERANCE = 2;

/**
 * THE CONTROLS OF THE BAR, as `$$eval` sees them — one record per `[data-filter-rail] a|button|summary`.
 *
 * `x y w h` is the LAYOUT box (the tap floor and the viewport clip are asserted on it, as before). ⭐ `seen` is the PAINTED
 * box: the layout box cut by every ancestor that clips its overflow — the same rule `clip.mjs` states for reach ("a control
 * is reachable if some ancestor can be scrolled sideways to bring it into view"), applied to sight. The part of a chip past
 * its strip's edge is scrolled away: not painted, not hit-tested. The strip's mask (`.kp-strip-fade`, globals.css) only
 * fades pixels INSIDE the strip's own box, so it adds nothing outside it — a strip-clipped chip under its strip's mask can
 * overlap nothing a person sees outside that strip. ⛔ `null` when nothing of the control is painted.
 *
 * ⚠️ The walk follows the CONTAINING-BLOCK chain, not the DOM chain: an absolutely positioned box escapes the clip of every
 * non-positioned ancestor below its containing block, a fixed one escapes all of them (unless a transform/filter/contain
 * ancestor holds it). `display: contents` and inline ancestors generate no clipping box. `clip-path` is not modelled — no
 * bar control sits where one cuts (`.kp-qbar-row`'s only clips 12px LEFT of the row, for the divider rule).
 */
export const CONTROL_PROBE = (els) => {
  const html = document.documentElement;
  const holds = (st) =>
    st.transform !== "none" || st.filter !== "none" || st.perspective !== "none" || /paint|layout|strict|content/.test(st.contain);
  const painted = (e, r) => {
    let x1 = r.left, y1 = r.top, x2 = r.right, y2 = r.bottom;
    let cur = e;
    for (;;) {
      const pos = getComputedStyle(cur).position;
      let a = cur.parentElement;
      if (pos === "fixed") { while (a && a !== html && !holds(getComputedStyle(a))) a = a.parentElement; }
      else if (pos === "absolute") {
        while (a && a !== html && getComputedStyle(a).position === "static" && !holds(getComputedStyle(a))) a = a.parentElement;
      }
      if (!a || a === html) break;
      const st = getComputedStyle(a);
      if (st.display !== "contents" && st.display !== "inline") {
        const cx = st.overflowX !== "visible", cy = st.overflowY !== "visible", paint = /paint|strict|content/.test(st.contain);
        if (cx || cy || paint) {
          const ar = a.getBoundingClientRect();
          const left = ar.left + a.clientLeft, top = ar.top + a.clientTop;
          if (cx || paint) { x1 = Math.max(x1, left); x2 = Math.min(x2, left + a.clientWidth); }
          if (cy || paint) { y1 = Math.max(y1, top); y2 = Math.min(y2, top + a.clientHeight); }
        }
      }
      cur = a;
    }
    return x2 - x1 > 0.5 && y2 - y1 > 0.5
      ? { x: Math.round(x1), y: Math.round(y1), w: Math.round(x2 - x1), h: Math.round(y2 - y1) }
      : null;
  };
  return els.map((e) => {
    const r = e.getBoundingClientRect();
    const cs = getComputedStyle(e);
    // EXEMPTION 1 — inside a SHUT disclosure. Its own <summary> is not inside it.
    //
    // 🔴 AND FOR A DAY IT WAS, WHICH BLINDED THE ASSERTION THIS DRIVER WAS BUILT FOR.
    // The walk began at `e.parentElement`, and a <summary>'s parent IS the <details> it
    // opens — so every summary on every bar (the sort control AND the `Filters` trigger)
    // was exempted from all three measurements. The line above has always claimed the
    // opposite; the code did not implement it. ⛔ The cost was exact: assertion 1 (NO
    // OVERLAP) was structurally incapable of failing on the sort summary — the very
    // control whose 44px collision with the direction button is the reason this driver
    // exists — and the red mutation written to prove it kept reporting NOT CAUGHT while
    // the mutation was working perfectly. A guard that exempts what it polices.
    //
    // ⚠️ The walk still starts ABOVE that one disclosure rather than skipping the rule:
    // a sort menu nested inside a shut `Filters` sheet must stay exempt, because Chrome
    // lays a closed <details> out and neither paints nor hit-tests it.
    // (Moved here from the drive with the rest of the probe, R5-F 2026-10-09; `test:visual-pass-r5f` §2 pins it.)
    let n = e.tagName === "SUMMARY" ? (e.parentElement && e.parentElement.parentElement) : e.parentElement;
    let inClosed = false;
    while (n) {
      if (n.tagName === "DETAILS" && !n.open) { inClosed = true; break; }
      n = n.parentElement;
    }
    // EXEMPTION 2 — the nearest ancestor that actually scrolls horizontally is the frame this control must fit inside;
    // only with none does the viewport apply.
    let sc = e.parentElement, scrolls = false;
    while (sc) {
      const st = getComputedStyle(sc);
      if (/(auto|scroll)/.test(st.overflowX) && sc.scrollWidth > sc.clientWidth + 1) { scrolls = true; break; }
      sc = sc.parentElement;
    }
    return {
      text: (e.textContent || "").trim().slice(0, 24),
      x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
      seen: painted(e, r),
      inClosed, scrolls,
      vis: cs.visibility !== "hidden" && cs.display !== "none" && r.width > 0 && r.height > 0,
    };
  });
};

/**
 * ASSERTION 1 · NO OVERLAP — over PAINTED boxes. Two controls are on one visual row when their painted spans intersect
 * vertically by more than half the shorter one, and they collide when they then share more than a pixel across.
 * ⛔ A control with nothing painted (`seen: null`) can collide with nothing — it is scrolled away, not hidden under.
 */
export function findOverlaps(controls) {
  const shown = controls.filter((c) => c.seen);
  const out = [];
  for (let i = 0; i < shown.length; i++) {
    for (let j = i + 1; j < shown.length; j++) {
      const a = shown[i].seen, b = shown[j].seen;
      const vOv = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      const hOv = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      if (vOv > Math.min(a.h, b.h) / 2 && hOv > 1) out.push({ a: shown[i], b: shown[j], hOv });
    }
  }
  return out;
}

/** One overlap, as the failure line prints it — the painted span, and the layout box when the two differ. */
export function overlapLine({ a, b, hOv }) {
  const span = (c) => `"${c.text}"(${c.seen.x}→${c.seen.x + c.seen.w}${c.seen.x !== c.x || c.seen.w !== c.w ? `, box ${c.x}→${c.x + c.w}` : ""})`;
  return `OVERLAP ${hOv}px ${span(a)} vs ${span(b)}`;
}

/**
 * THE PAGE WITHOUT A BAR — is it a page with nothing to filter, or a bar that is missing?
 * Counts the instrumentation contract's rows (`data-row-id`) and the empty-state stamp (`data-empty-state`).
 */
export const BOOK_PROBE = () => ({
  rows: document.querySelectorAll("[data-row-id]").length,
  emptyStates: document.querySelectorAll("[data-empty-state]").length,
});

/**
 * ⛔ ROWS AND NO BAR IS A DEFECT; NO ROWS AND NO BAR IS A PAGE WITH NOTHING TO FILTER. The second is the THIRD OUTCOME —
 * NOT MEASURED, printed and named, never a pass — and the drive refuses a run in which a declared surface was measured
 * nowhere (`skips`), because that is a skipped surface, not a green one. A surface may declare `withheld` when its bar is
 * withheld BY DESIGN on a non-empty page this fixture produces (/positions/performance, one settled product): that one is
 * NOT MEASURED with its own reason and does not make the run a skipped one.
 * ⚠️ The failure line keeps the words "NO [data-filter-rail]", which every reader of this gate already greps for.
 */
export function judgeMissingRail(book, surface) {
  if (book.rows > 0) {
    return { kind: "fail", why: `NO [data-filter-rail] — ${book.rows} row(s) on the page and no bar over them` };
  }
  if (surface.withheld) return { kind: "not-measured", skips: false, why: `BAR NOT MEASURED — no bar and no row: ${surface.withheld}` };
  return {
    kind: "not-measured",
    skips: true,
    why: book.emptyStates > 0
      ? "BAR NOT MEASURED — the page shows its empty state and no row; this route withholds its bar on an empty book by design (§A5). Build the fixture: npm run fixture:player"
      : "BAR NOT MEASURED — the page renders no row ([data-row-id]) and no empty state: nothing here for a bar to filter, and a withheld bar looks like a missing one. Build the fixture: npm run fixture:player",
  };
}

/**
 * THE BAR'S STICK GEOMETRY, measured AT REST (scroll 0): its own `position` and `top`, its natural place in the document,
 * its height and bottom margin, the bottom of its CONTAINING BLOCK's content box (a sticky box never leaves it — CSS
 * Positioned Layout 3, the margin box stays inside the containing block), and how many rows sit BELOW that block, outside
 * it — rows a bar can no longer be stuck over.
 */
export const STICK_PROBE = () => {
  const bar = document.querySelector("[data-filter-rail]");
  if (!bar) return null;
  const html = document.documentElement;
  const cs = getComputedStyle(bar);
  let cb = bar.parentElement;
  while (cb && cb !== html && getComputedStyle(cb).display === "contents") cb = cb.parentElement;
  const sy = window.scrollY;
  const r = bar.getBoundingClientRect();
  const pr = cb.getBoundingClientRect();
  const pcs = getComputedStyle(cb);
  const cbBottom = pr.bottom + sy - (parseFloat(pcs.paddingBottom) || 0) - (parseFloat(pcs.borderBottomWidth) || 0);
  let rowsBelow = 0;
  for (const e of document.querySelectorAll("[data-row-id]")) {
    if (cb.contains(e)) continue;
    const er = e.getBoundingClientRect();
    if (er.height > 0 && er.top + sy >= cbBottom - 1) rowsBelow++;
  }
  return {
    position: cs.position,
    offset: cs.top === "auto" ? null : parseFloat(cs.top),
    docTop: Math.round((r.top + sy) * 10) / 10,
    h: Math.round(r.height * 10) / 10,
    mb: parseFloat(cs.marginBottom) || 0,
    cbBottom: Math.round(cbBottom * 10) / 10,
    cb: `${cb.tagName.toLowerCase()}.${String(cb.className).trim().split(/\s+/).slice(0, 3).join(".")}`,
    rowsBelow,
    maxScroll: Math.max(0, html.scrollHeight - window.innerHeight),
  };
};

/**
 * WHERE TO SCROLL, OR WHY NOT.
 *
 * A sticky bar leaves its natural place at `start` (its top minus its own offset) and its parent's end pushes it up after
 * `release` (the containing block's content bottom minus the bar's bottom margin, height and offset). ⭐ Only between the
 * two does the bar HAVE to sit on its offset — so the drive scrolls there: `REACH` past `start` on a long page, the page's
 * end or one pixel before `release`, whichever comes first. ⛔ The old fixed `scrollTo(0, 1200)` landed past `release` on
 * every thin page and reported the parent's end as a bar that "did not stick".
 *
 *   rows below its parent              → { kind: "fail" }          — /updown/history's 247px wrapper: the bar unpins
 *                                                                    while its own rows are still scrolling. ⛔ Asked
 *                                                                    FIRST and whatever the page's length: it is a fact
 *                                                                    about the markup, and a long fixture would only
 *                                                                    postpone it past the range the drive scrolls
 *   travel ≥ MIN_TRAVEL                → { kind: "measure" }       — the bar must sit on its offset there
 *   travel short, nothing below        → { kind: "not-measured" }  — the fixture is too short to prove a stick
 *
 * A bar that is NOT `sticky` (relative, static) on a surface that promises the stick is measured too: scroll `REACH` (or
 * as far as the page goes) and read where it went. `fixed` keeps the old on-screen tolerance.
 */
export function planStick(g, { minTravel = MIN_TRAVEL, reach = REACH } = {}) {
  if (g.position === "sticky" && g.offset != null) {
    const start = Math.max(0, g.docTop - g.offset);
    const release = g.cbBottom - g.mb - g.h - g.offset;
    if (g.rowsBelow > 0) {
      return {
        kind: "fail",
        why: `THE BAR DID NOT STICK — its parent <${g.cb}> ends ${Math.max(0, Math.round(release - start))}px of travel after the bar's place while ${g.rowsBelow} row(s) run on below it. A sticky element only sticks within its PARENT's box; check the wrapper's height.`,
      };
    }
    const y = Math.floor(Math.min(start + reach, g.maxScroll, release - 1));
    const travel = y - start;
    if (travel >= minTravel) return { kind: "measure", sticky: true, y, travel, start, release };
    const short = g.maxScroll < release - 1
      ? `the page scrolls only ${g.maxScroll}px, ${Math.max(0, Math.round(g.maxScroll - start))}px past the bar's place`
      : `its parent <${g.cb}> ends ${Math.max(0, Math.round(release - start))}px of travel after the bar's place, and no row lies below it`;
    return { kind: "not-measured", why: `STICK NOT MEASURED — ${short}; a stick needs ${minTravel}px to prove. Seed more rows (npm run fixture:player).` };
  }
  const y = Math.floor(Math.min(reach, g.maxScroll));
  if (y < minTravel) return { kind: "not-measured", why: `STICK NOT MEASURED — the page scrolls only ${g.maxScroll}px, so nothing was proved. Seed more rows.` };
  return { kind: "measure", sticky: false, y, travel: y, start: 0, release: Infinity };
}

/**
 * AFTER THE SCROLL: where the bar is, and every other sticky/fixed surface drawn through it.
 * ⚠️ `hits` skips the bar's own subtree and ancestors, surfaces under 200×8 (a pip is not a band), and anything that only
 * TOUCHES the bar (≤ 2px) — the header ends exactly where a stuck bar begins.
 */
export const STICK_AFTER_PROBE = () => {
  const bar = document.querySelector("[data-filter-rail]");
  if (!bar) return null;
  const rb = bar.getBoundingClientRect();
  const hits = [];
  for (const e of document.querySelectorAll("body *")) {
    if (e === bar || bar.contains(e) || e.contains(bar)) continue;
    const cs = getComputedStyle(e);
    if (cs.position !== "sticky" && cs.position !== "fixed") continue;
    const r = e.getBoundingClientRect();
    if (r.width < 200 || r.height < 8) continue;
    const v = Math.min(rb.bottom, r.bottom) - Math.max(rb.top, r.top);
    const h = Math.min(rb.right, r.right) - Math.max(rb.left, r.left);
    if (v > 2 && h > 2) hits.push(`${e.tagName.toLowerCase()}.${String(e.className).trim().split(/\s+/).slice(0, 2).join(".")} by ${Math.round(v)}px`);
  }
  return { scrollY: Math.round(window.scrollY), top: Math.round(rb.top * 10) / 10, hits };
};

/**
 * THE VERDICT. `{ problems, notMeasured }` — each problem a full sentence; `notMeasured` a reason or null.
 * ⛔ "THE BAR DID NOT STICK" and "ANOTHER STICKY SURFACE IS DRAWN THROUGH THE BAR" are the two arms' words, and the red
 * twin matches them on the ✗ lines — keep them verbatim.
 *
 * ⚠️ THE TOLERANCE WAS 0 ≤ top ≤ 200 AND IS NOW THE BAR'S OWN `top` ± 2 (R5-F, 2026-10-09). The old drive said "the
 * exact offset is the shell's business, not this driver's; what is being asserted is that the bar is still ON SCREEN" —
 * right while it scrolled blind, because it could not know where a bar SHOULD be after `scrollTo(0, 1200)`. It knows now:
 * it scrolls only inside the range where a sticky box must sit on its own declared `top` (CSS Positioned Layout 3), so
 * the reference is the bar's declaration, not the shell's — and a bar on screen but OFF its offset (a gap the page shows
 * through, a bar half under the header) is a failure a person sees. A `fixed` bar keeps the old on-screen tolerance.
 */
export function judgeStick(g, plan, after, { minTravel = MIN_TRAVEL, tolerance = STUCK_TOLERANCE } = {}) {
  const problems = [];
  if (!after) return { problems: ["THE BAR DID NOT STICK — it was gone from the page after the scroll"], notMeasured: null };
  if (plan.sticky) {
    const travel = after.scrollY - plan.start;
    if (travel < minTravel) {
      return { problems, notMeasured: `STICK NOT MEASURED — the scroll landed at ${after.scrollY}px, only ${Math.round(travel)}px past the bar's place (planned ${plan.y}); the page changed under the drive.` };
    }
    if (Math.abs(after.top - g.offset) > tolerance) {
      problems.push(`THE BAR DID NOT STICK — scrolled ${after.scrollY}px, ${Math.round(travel)}px past its place and still inside its parent, it sits at top ${after.top} instead of its own offset ${g.offset}. A sticky element only sticks within its PARENT's box; check the wrapper's height.`);
    }
  } else if (g.position !== "fixed") {
    problems.push(`THE BAR DID NOT STICK — it is position: ${g.position}, so it left with the page: after scrolling ${after.scrollY}px it sits at top ${after.top}. A surface that promises the stick must be sticky (declare \`sticky: false\` if it does not promise one).`);
  } else if (after.top < 0 || after.top > 200) {
    problems.push(`THE BAR DID NOT STICK — after scrolling it sits at top ${after.top}.`);
  }
  for (const h of after.hits) {
    problems.push(`ANOTHER STICKY SURFACE IS DRAWN THROUGH THE BAR — ${h}. Two sticky surfaces cannot share one offset.`);
  }
  return { problems, notMeasured: null };
}

/* ── READING THE DRIVE'S OUTPUT (the red twin) ─────────────────────────────────────────────────────────────────────── */

/** The failure lines alone. ⛔ An `expect` is matched HERE, never against the whole output: a 🔶 line or a header that
 *  happens to contain the expected words must not be read as the failure a mutation caused. */
export const failLines = (out) => String(out).split("\n").filter((l) => l.includes("✗")).map((l) => l.trim());

/** The NOT MEASURED lines naming one route — `"/positions "` with its space, so `/positions/performance` is not it.
 *  Both kinds carry the words: "BAR NOT MEASURED" (no bar on the page) and "STICK NOT MEASURED" (no range to prove). */
export const notMeasuredLines = (out, route) =>
  String(out).split("\n").filter((l) => l.includes("NOT MEASURED") && l.includes(`${route} `)).map((l) => l.trim());
