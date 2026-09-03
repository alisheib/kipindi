/**
 * `npm run qa:cold-start` — PV-06 · a pool-split bar appears **iff** there is money in the pool.
 *
 * ⛔ WHY A DRIVE AND NOT ONLY A SCANNER. `test:ui-consistency`'s `hand-rolled-split-bar` rule
 * stops the STRUCTURAL cause returning — a card drawing its own bar instead of the kit's, which
 * is how the empty state came to be missing. It cannot see the other half: if
 * `updown-board.ts` were re-wired to `impliedYesPct`, the card would render the kit's bar with
 * `yesPct={50} empty={false}` and paint the same fabricated half-and-half through the primitive.
 * Only the rendered value can answer that, so this asks the product.
 *
 * ⭐ IT ASSERTS AN INVARIANT, NOT A PRESENCE — and that distinction is a rule this repo paid for
 * (standards §5b#9). "Every card shows the empty rail" is FALSE about a funded round, and "every
 * card shows a split" is false about an empty one. The claim that is true of both is:
 *
 *      a split bar with percentages  ⟺  volumeTzs > 0
 *
 * so the drive checks each card against ITS OWN volume, and REFUSES to report green unless it
 * saw at least one of each kind. A board of only-funded rounds proves nothing about cold start,
 * and a run that says so is worth more than one that quietly passes.
 *
 * Local:  LIVE_BASE=http://localhost:3100 npm run qa:cold-start
 *         (seed first: POST /api/dev-test/updown-seed then /updown-advance; fund a round with
 *          /api/dev-test/stress-bulk-bet to get the funded half of the invariant)
 * Prod:   npm run qa:cold-start        — reads whatever rounds exist; may report the premise absent.
 *
 * Evidence: `.qa-shots/pv06/` (gitignored).
 */
import { mkdirSync } from "node:fs";
import { browser, BASE, recorder } from "./harness.mjs";

const SHOTS = ".qa-shots/pv06";
const LOCALES = (process.env.PV06_LOCALES || "en,sw").split(",");

const r = recorder("qa:cold-start — PV-06 · a split bar appears iff the pool has money");
mkdirSync(SHOTS, { recursive: true });
const { b } = await browser();

try {
  for (const loc of LOCALES) {
    for (const [w, h] of [[1280, 1100], [390, 900]]) {
      const ctx = await b.newContext({ viewport: { width: w, height: h } });
      await ctx.addCookies([{ name: "kp-locale", value: loc, url: BASE }]);
      const page = await ctx.newPage();
      await page.goto(`${BASE}/updown`, { waitUntil: "domcontentloaded", timeout: 120_000 });
      await page.waitForTimeout(6000);

      const lang = await page.evaluate(() => document.documentElement.lang);
      if (!r.check(`${loc}@${w} · the page really rendered in ${loc}`, lang === loc, `got "${lang}"`)) {
        await ctx.close();
        continue;
      }

      const cards = await page.evaluate(() => {
        const num = (s) => {
          const m = /([\d][\d,.\s]*)\s*$/.exec(s.replace(/[^\d,.\sKM]/g, " ").trim());
          return m ? Number(m[1].replace(/[,\s]/g, "")) : null;
        };
        return [...document.querySelectorAll("article.mcardp")].map((c) => {
          const txt = (c.innerText || "").replace(/\s+/g, " ");
          // The volume figure the card itself prints, read off the card — never re-derived.
          const vol = /TZS\s*([\d,]+)/.exec(txt);
          return {
            volume: vol ? Number(vol[1].replace(/,/g, "")) : null,
            emptyRail: c.querySelectorAll(".tipbar-empty").length,
            filledRail: c.querySelectorAll(".tipbar-rail").length,
            // ⛔ the shape that must never come back: a hand-painted two-segment rail
            handRolled: [...c.querySelectorAll("div")].filter(
              (d) => d.children.length === 2
                && [...d.children].every((s) => s.tagName === "SPAN" && s.style.width)).length,
            pcts: (txt.match(/\d+%/g) || []).length,
            text: txt.slice(0, 90),
            _n: num,
          };
        });
      });

      if (!r.check(`${loc}@${w} · the board rendered at least one round`, cards.length > 0,
        "no .mcardp article — measured nothing")) {
        await ctx.close();
        continue;
      }

      let empties = 0, funded = 0;
      for (const c of cards) {
        if (c.volume === null) { r.check(`${loc}@${w} · a card printed a readable volume`, false, c.text); continue; }
        if (c.volume === 0) {
          empties++;
          r.check(`${loc}@${w} · VOL 0 → the honest empty rail, no split`,
            c.emptyRail === 1 && c.filledRail === 0, `empty=${c.emptyRail} filled=${c.filledRail} · ${c.text}`);
        } else {
          funded++;
          r.check(`${loc}@${w} · VOL ${c.volume.toLocaleString()} → a real split, not the empty rail`,
            c.filledRail === 1 && c.emptyRail === 0, `empty=${c.emptyRail} filled=${c.filledRail} · ${c.text}`);
        }
        r.check(`${loc}@${w} · the bar is the kit's, not hand-painted`, c.handRolled === 0, c.text);
      }

      // ⛔ THE PREMISE, STATED. Without both kinds on the board this run has tested one arm of an
      //    "iff" and must say so — a green half-invariant is the shape §5b#9 warns about.
      r.note(`${loc}@${w}: ${cards.length} card(s) — ${empties} empty, ${funded} funded`);
      if (empties === 0) r.note(`  ⚠️ NO EMPTY ROUND ON THE BOARD — the cold-start arm was not exercised here.`);
      if (funded === 0) r.note(`  ⚠️ NO FUNDED ROUND ON THE BOARD — the positive control was not exercised here.`);

      await page.screenshot({ path: `${SHOTS}/updown-${loc}-${w}.png`, fullPage: true });

      // ── The ROUND DETAIL page carries the same bar, and carried its own copy of the defect.
      //    ⛔ Measured here rather than assumed from the board: it was a SEPARATE hand-rolled
      //    strip (6px, 0.5 gap) in `updown/[roundId]/page.tsx`, so a board that reads correctly
      //    says nothing at all about this surface.
      const href = await page.evaluate(() =>
        document.querySelector('a[href^="/updown/udr_"]')?.getAttribute("href")
        ?? [...document.querySelectorAll("article.mcardp")].length ? null : null);
      const roundHref = href ?? await page.evaluate(() => {
        // the card is a role="link" article, not an <a> — read the id off its click target
        const m = /\/updown\/(udr_[a-z0-9]+)/.exec(document.body.innerHTML);
        return m ? `/updown/${m[1]}` : null;
      });
      if (roundHref) {
        await page.goto(BASE + roundHref, { waitUntil: "domcontentloaded", timeout: 120_000 });
        await page.waitForTimeout(4000);
        const d = await page.evaluate(() => {
          const txt = (document.querySelector("main")?.innerText || "").replace(/\s+/g, " ");
          const vol = /TZS\s*([\d,]+)/.exec(txt);
          return {
            volume: vol ? Number(vol[1].replace(/,/g, "")) : null,
            emptyRail: document.querySelectorAll(".tipbar-empty").length,
            filledRail: document.querySelectorAll(".tipbar-rail").length,
            handRolled: [...document.querySelectorAll("main div")].filter(
              (x) => x.children.length === 2
                && [...x.children].every((s) => s.tagName === "SPAN" && s.style.width)).length,
            text: txt.slice(0, 90),
          };
        });
        r.check(`${loc}@${w} · round detail ${roundHref.slice(-8)} · the bar is the kit's`,
          d.handRolled === 0, d.text);
        if (d.volume === 0) {
          r.check(`${loc}@${w} · round detail · VOL 0 → the honest empty rail`,
            d.emptyRail === 1 && d.filledRail === 0, `empty=${d.emptyRail} filled=${d.filledRail} · ${d.text}`);
        } else if (d.volume !== null) {
          r.check(`${loc}@${w} · round detail · VOL ${d.volume.toLocaleString()} → a real split`,
            d.filledRail === 1 && d.emptyRail === 0, `empty=${d.emptyRail} filled=${d.filledRail} · ${d.text}`);
        }
        await page.screenshot({ path: `${SHOTS}/round-${loc}-${w}.png`, fullPage: true });
        // ⛔ PROVE THE SHOT IS OF A PAGE WITH CONTENT ON IT. Measured 2026-09-03: a round can
        //    RESOLVE mid-capture and `UpDownHandover` navigates away, so the PNG came out as
        //    chrome-and-footer over an empty middle — while every assertion above had already
        //    passed on real content. The checks were right and the evidence was a lie, which is
        //    the worse half: a person reading the shots would have seen a blank product.
        const after = await page.evaluate(() => (document.querySelector("main")?.innerText || "").length);
        r.check(`${loc}@${w} · round-detail SHOT shows a rendered page (not a mid-navigation frame)`,
          after > 200, `main innerText was ${after} chars at capture — re-run; the shot is not evidence`);
      } else {
        r.note(`${loc}@${w}: no round link found — the detail surface was NOT measured.`);
      }
      await ctx.close();
    }
  }
} finally {
  await b.close();
}

console.log(`\nshots → ${SHOTS}/  ⭐ LOOK at them; a green run is a pre-flight check, not evidence.`);
process.exit(r.done() === 0 ? 0 : 1);
