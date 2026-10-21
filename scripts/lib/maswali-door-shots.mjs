/**
 * THE DOORS' DRIVE — `qa:maswali-player-shots`' door pages (MASWALI-BUILD S5-DESIGN-DOORS; the critics' R1-doors).
 *
 *   MASWALI_SHOTS_PAGES=door-ghosts,door-states BASE=http://localhost:3530 node scripts/maswali-player-shots.mjs
 *
 * Each door is drawn by the product itself — every card state through the card's own model and component, both ghosts as
 * the ghost components draw them (`scripts/lib/maswali-door-fixtures.mts`, rendered by React) — and set into the REAL
 * page in its real place (the journey home's column after the head, the classic board's head before the search), so the
 * page's own stylesheet, fonts and column lay it out. Nothing is drawn by hand here; the page around it is untouched.
 *
 *   door-ghosts  H1, measured: at each width and language, the common card (a week on sale, a reader holding no ticket)
 *                set in its slot, then the page's whole column swapped for its ghost — the ghost's slot must stand where
 *                the card stood and be as tall (±2px), and what follows it (the chips; the board's search) must not move
 *                (±2px); the ghost told "no card" draws no slot and lands what follows where a card-less page has it.
 *                The card's own geometry beside it: the head row on one axis (L1), the body's edge (M1), the figure's
 *                rung (L3), the time's face (L7), the host's inset (L2), the hover (M5), the accessible name (L11).
 *                Tiles: door-ghost-<host>-<locale>-<width>.png (the ghost in place) and door-card-<host>-…png.
 *   door-states  every state the card's model draws, stacked in the card's place with its name above it, shot down to its
 *                end in viewport tiles, and each state's height recorded (door-states-heights.json).
 * A red control proves the H1 guard can fail: a stylesheet plant that grows the ghost's slot by 40px must be reported.
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

export const DOOR_PAGES = ["door-ghosts", "door-states"];
const GUARD_WIDTHS = [320, 360, 768, 1280];
const TOL = 2;

/** The fixtures, rendered by the product's own components in a tsx child (the drive itself is plain node). */
function loadFixtures(out) {
  const file = `${out}/door-fixtures.json`;
  execSync(`npx tsx scripts/lib/maswali-door-fixtures.mts "${file}"`, { stdio: "inherit" });
  return JSON.parse(readFileSync(file, "utf8"));
}

/** In the page: boxes of the door's parts, and the computed values its claims rest on. */
const MEASURE = (host) => {
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left, y: r.top + scrollY, w: r.width, h: r.height, cy: r.top + scrollY + r.height / 2 }; };
  const card = document.querySelector('[data-testid="millionea-home-card"] a.kp-mln-door');
  const after = host === "journey" ? document.querySelector('[data-testid="journey-home"] .kp-jhome__chips') : document.querySelector(".kp-markets-search");
  const probe = document.createElement("span");
  probe.style.color = "var(--border-royal)";
  document.body.appendChild(probe);
  const royal = getComputedStyle(probe).color;
  probe.remove();
  const time = card?.querySelector(".kp-mln-door__state .tabular-nums");
  const amount = card?.querySelector(".kp-mln-door__rule .amount");
  const cs = card ? getComputedStyle(card) : null;
  return {
    card: box(card), after: box(after), plate: box(card?.querySelector(".kp-mln-door__plate")), title: box(card?.querySelector("#mln-card-title")),
    chev: box(card?.querySelector(".kp-mln-door__chev")), rule: box(card?.querySelector(".kp-mln-door__rule")), state: box(card?.querySelector(".kp-mln-door__state")),
    figurePx: amount ? getComputedStyle(amount).fontSize : null,
    timeFace: time ? getComputedStyle(time).fontFamily : null, timeNums: time ? getComputedStyle(time).fontVariantNumeric : null,
    monoFace: getComputedStyle(document.documentElement).getPropertyValue("--font-mono").trim(),
    padding: cs ? `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}` : null,
    border: cs ? cs.borderTopColor : null, royal,
    howtoPlate: box(document.querySelector('[data-testid="journey-howto-card"] .kp-jhowto__plate')),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
};
const GHOST_MEASURE = (host) => {
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left, y: r.top + scrollY, w: r.width, h: r.height }; };
  const slot = document.querySelector('[data-ghost-part="millionea"]');
  const after = host === "journey" ? document.querySelector('[data-testid="journey-home-ghost"] [data-ghost-part="chips"]') : document.querySelector(".search-box-wrap.kp-markets-search[aria-hidden]");
  return { slot: box(slot), after: box(after), slots: document.querySelectorAll('[data-ghost-part="millionea"]').length };
};
/** The page's column (the PageContainer the card stands in), swapped for a ghost's markup. */
const SWAP_COLUMN = ([host, html]) => {
  const anchor = host === "journey" ? document.querySelector('[data-testid="journey-home"]') : document.querySelector('[data-testid="millionea-home-card"]');
  const column = anchor?.parentElement;
  if (!column) return false;
  column.outerHTML = html;
  return true;
};
const SET_CARD = (html) => {
  const wrap = document.querySelector('[data-testid="millionea-home-card"]');
  if (!wrap) return false;
  wrap.innerHTML = html;
  return true;
};
const frames = (page) => page.evaluate(async () => { await document.fonts.ready; await new Promise((d) => requestAnimationFrame(() => requestAnimationFrame(() => d(true)))); });

/**
 * @param {object} o — the shot script's own pieces: browser, BASE, OUT, WIDTHS, LOCALES, HEIGHT, ok, open, contextWith,
 *   demoSession, mintStaffPass, want (page-name filter), shootScrolledAt (tiles of a region).
 */
export async function shootDoors(o) {
  const { browser, BASE, OUT, WIDTHS, LOCALES, HEIGHT, ok, open, contextWith, demoSession, mintStaffPass, want } = o;
  if (!DOOR_PAGES.some(want)) return;
  const FX = loadFixtures(OUT);
  const pass = await mintStaffPass(browser, BASE);
  const heights = {};
  const HOSTS = [["journey", "/"], ["board", "/markets"]];
  for (const locale of LOCALES) {
    for (const [host, path] of HOSTS) {
      const cookies = host === "journey" ? [await demoSession(browser, BASE), pass] : [await demoSession(browser, BASE)];
      const ctx = await contextWith(cookies, locale);
      const page = await ctx.newPage();
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: HEIGHT });
        const tag = `${host} · ${locale} @${width}`;
        // ── the card and its ghost (H1) ─────────────────────────────────────────────────────────────────────────────
        if (want("door-ghosts")) {
          await open(page, path);
          const lang = await page.locator("html").getAttribute("lang");
          ok(`doors ${tag} · the page is in its language and draws the card's wrapper`, lang === locale && (await page.getByTestId("millionea-home-card").count()) === 1, `lang=${lang}`);
          await page.evaluate(SET_CARD, FX.cards[locale][host][0]);
          await frames(page);
          const m = await page.evaluate(MEASURE, host);
          await page.screenshot({ path: `${OUT}/door-card-${host}-${locale}-${width}.png`, fullPage: false });
          const guard = GUARD_WIDTHS.includes(width);
          if (m.card && guard) {
            ok(`doors ${tag} · L1 · the head row on one axis: plate, title and chevron centred within 1px (${m.plate?.cy.toFixed(1)} / ${m.title?.cy.toFixed(1)} / ${m.chev?.cy.toFixed(1)})`,
              Math.abs(m.plate.cy - m.title.cy) <= 1 && Math.abs(m.plate.cy - m.chev.cy) <= 1);
            const bodyX = width < 768 ? m.plate.x : m.title.x;
            ok(`doors ${tag} · M1 · the body's edge is ${width < 768 ? "the plate's (the full inner width)" : width < 1280 ? "the title's" : "its own column's"} (${m.rule?.x.toFixed(1)} vs ${bodyX.toFixed(1)})`,
              width >= 1280 ? m.rule.x > m.title.x + m.title.w : Math.abs(m.rule.x - bodyX) <= 1 && Math.abs(m.state.x - bodyX) <= 1);
            ok(`doors ${tag} · L3 · the figure is 16px (${m.figurePx})`, m.figurePx === "16px");
            ok(`doors ${tag} · L7 · the close is in the body face with tabular figures (${(m.timeFace ?? "").split(",")[0]}; ${m.timeNums})`,
              !!m.timeFace && !m.timeFace.includes("JetBrains") && /tabular-nums/.test(m.timeNums ?? ""));
            const inset = host === "journey" ? "12px 14px 12px 12px" : width < 640 ? "12px 12px 12px 12px" : "12px 16px 12px 16px";
            ok(`doors ${tag} · L2 · the host's inset (${m.padding}, want ${inset})${host === "journey" && m.howtoPlate ? ` and the plate under the How-to card's (x ${m.plate.x} vs ${m.howtoPlate.x})` : ""}`,
              m.padding === inset && (host !== "journey" || !m.howtoPlate || Math.abs(m.plate.x - m.howtoPlate.x) <= 0.5));
            ok(`doors ${tag} · no horizontal overflow (${m.overflow}px)`, m.overflow <= 1);
            const name = `${FX.names[locale].title} ${FX.names[locale].figure}`;
            ok(`doors ${tag} · L11 · the link's accessible name is "${name}"`, (await page.getByRole("link", { name, exact: true }).count()) === 1);
            await page.locator('[data-testid="millionea-home-card"] a.kp-mln-door').hover();
            await page.waitForTimeout(400);
            const hovered = await page.evaluate(MEASURE, host);
            ok(`doors ${tag} · M5 · on hover the border turns --border-royal (${hovered.border} vs ${hovered.royal})`, hovered.border === hovered.royal);
            await page.mouse.move(1, 1);
          }
          // The ghost, in the page's place: the card's slot and what follows it.
          await page.evaluate(SWAP_COLUMN, [host, (host === "journey" ? FX.journeyGhost : FX.marketsGhost)[locale].slot]);
          await frames(page);
          const g = await page.evaluate(GHOST_MEASURE, host);
          await page.screenshot({ path: `${OUT}/door-ghost-${host}-${locale}-${width}.png`, fullPage: false });
          if (m.card && g.slot && guard) {
            const dh = g.slot.h - m.card.h, dy = g.slot.y - m.card.y, da = g.after && m.after ? g.after.y - m.after.y : NaN;
            ok(`doors ${tag} · H1 · the ghost's slot is the card's box: ${g.slot.h.toFixed(1)} tall for the card's ${m.card.h.toFixed(1)} (Δ ${dh.toFixed(1)}), at its y (Δ ${dy.toFixed(1)}), and what follows lands where it stands (Δ ${da.toFixed(1)})`,
              Math.abs(dh) <= TOL && Math.abs(dy) <= TOL && Math.abs(da) <= TOL && g.slots === 1);
            (heights[`${host}|${locale}|${width}`] ??= {}).ghost = +g.slot.h.toFixed(1);
          } else if (guard) ok(`doors ${tag} · H1 · the card and its ghost were both measured`, false, JSON.stringify({ card: m.card, slot: g.slot }));
          if (guard) {
            // Told "no card": no slot, and what follows lands where a card-less page puts it.
            await open(page, path);
            const bare = await page.evaluate(([h]) => { document.querySelector('[data-testid="millionea-home-card"]')?.remove(); return true; }, [host]);
            await frames(page);
            const none = await page.evaluate(MEASURE, host);
            await page.evaluate(SWAP_COLUMN, [host, (host === "journey" ? FX.journeyGhost : FX.marketsGhost)[locale].none]);
            await frames(page);
            const gn = await page.evaluate(GHOST_MEASURE, host);
            ok(`doors ${tag} · H1 · told "no card" (WITHDRAWN, a break), the ghost draws no slot and what follows stands where a card-less page has it (Δ ${(gn.after && none.after ? gn.after.y - none.after.y : NaN).toFixed?.(1)})`,
              bare && gn.slots === 0 && !!gn.after && !!none.after && Math.abs(gn.after.y - none.after.y) <= TOL);
          }
        }
        // ── every state, stacked in the card's place ──────────────────────────────────────────────────────────────────
        if (want("door-states")) {
          await open(page, path);
          const stack = FX.states.map((name, i) => `<div data-door-state="${i}" style="display:flex;flex-direction:column;gap:6px"><p style="margin:0;font:600 11px/14px ui-monospace,monospace;color:#8f9bd6;letter-spacing:.02em">${i + 1}/${FX.states.length} · ${name}</p>${FX.cards[locale][host][i]}</div>`).join("");
          await page.evaluate((html) => {
            const wrap = document.querySelector('[data-testid="millionea-home-card"]');
            if (!wrap) return false;
            wrap.innerHTML = `<div style="display:flex;flex-direction:column;gap:20px">${html}</div>`;
            return true;
          }, stack);
          await frames(page);
          const hs = await page.evaluate(() => [...document.querySelectorAll("[data-door-state] a.kp-mln-door")].map((a) => +a.getBoundingClientRect().height.toFixed(1)));
          (heights[`${host}|${locale}|${width}`] ??= {}).states = hs;
          const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
          ok(`doors ${tag} · every state drawn (${hs.length} of ${FX.states.length}), no horizontal overflow (${over}px)`, hs.length === FX.states.length && over <= 1);
          const region = await page.evaluate(() => { const r = document.querySelector('[data-testid="millionea-home-card"]').getBoundingClientRect(); return { top: r.top + scrollY, bottom: r.bottom + scrollY }; });
          let n = 1;
          for (let top = Math.max(0, region.top - 120); n <= 12; n++, top += HEIGHT - 120) {
            await page.evaluate((y) => window.scrollTo(0, y), top);
            await frames(page);
            await page.screenshot({ path: `${OUT}/door-states-${host}-${locale}-${width}-s${n}.png`, fullPage: false });
            if (top + HEIGHT >= region.bottom + 40) break;
          }
        }
      }
      await ctx.close();
    }
  }
  writeFileSync(`${OUT}/door-states-heights.json`, JSON.stringify({ states: FX.states, heights }, null, 1));
  // RED CONTROL: a slot grown by 40px must be reported by the same comparison.
  if (want("door-ghosts")) {
    const ctx = await contextWith([await demoSession(browser, BASE)], "sw");
    const page = await ctx.newPage();
    await page.setViewportSize({ width: 360, height: HEIGHT });
    await open(page, "/markets");
    await page.evaluate(SET_CARD, FX.cards.sw.board[0]);
    await frames(page);
    const m = await page.evaluate(MEASURE, "board");
    await page.evaluate(SWAP_COLUMN, ["board", FX.marketsGhost.sw.slot]);
    await page.addStyleTag({ content: '[data-ghost-part="millionea"] { padding-bottom: 52px !important; }' });
    await frames(page);
    const g = await page.evaluate(GHOST_MEASURE, "board");
    ok(`doors · RED CONTROL · a ghost slot grown by 40px is reported off (Δ ${(g.slot && m.card ? g.slot.h - m.card.h : NaN).toFixed(1)}px)`, !!g.slot && !!m.card && Math.abs(g.slot.h - m.card.h) > TOL);
    await ctx.close();
  }
}
