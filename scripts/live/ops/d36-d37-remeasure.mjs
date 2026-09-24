/**
 * D36 + D37 · PRODUCTION RE-MEASURE after `bedb6023`.
 *
 *   LIVE_BASE=https://www.50pick.tz node scripts/live/ops/d36-d37-remeasure.mjs
 *
 * ⛔ IT REPORTS THREE VERDICTS, NOT TWO. PROVED / BLIND / REFUTED. A board that happens to
 * hold no settled round cannot prove D36 either way, and calling that "pass" is exactly the
 * confident zero §0 trap 3 warns about — so it reports BLIND and says what was missing.
 *
 * ⭐ AND D36 IS PROVEN BY DISCRIMINATION, not by one reading. Two passes 25s apart: the OPEN
 * card's price must MOVE (which proves the poller is live and the instrument can see change)
 * while the SETTLED card's must NOT. If neither moves, the run is BLIND, because a frozen page
 * would look identical to a fixed one.
 */
import { chromium } from "playwright";

const BASE = process.env.LIVE_BASE;
if (!BASE) { console.error("⛔ set LIVE_BASE — unset means localhost, and the failure reads like a bad password"); process.exit(2); }
console.log(`\n  TARGET: ${BASE}\n`);

const PHONE = { width: 360, height: 740 };
const verdicts = [];
const say = (v, name, detail) => { verdicts.push({ v, name, detail }); console.log(`  ${v.padEnd(8)} ${name}${detail ? ` — ${detail}` : ""}`); };

/** Every round card on the board, with the state and the figure the player actually sees. */
const readBoard = (page) => page.$$eval("article.mcardp", (cards) => cards.map((c) => {
  const phase = c.getAttribute("data-phase");
  // The status word and the price sit in the header row; the price is the right-hand block.
  const right = c.querySelector("div.shrink-0.text-right");
  const nums = right ? [...right.querySelectorAll("div")].map((d) => d.textContent.trim()) : [];
  const href = c.querySelector('a[href^="/updown/"]')?.getAttribute("href") ?? null;
  const head = c.textContent.replace(/\s+/g, " ").slice(0, 90);
  return { phase, price: nums[0] ?? null, move: nums[1] ?? null, href, head };
}));

const b = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
try {
  const ctx = await b.newContext({ viewport: PHONE });
  const page = await ctx.newPage();

  console.log("── D36 · the price a settled card prints ──────────────────────────────");
  await page.goto(`${BASE}/updown`, { waitUntil: "networkidle", timeout: 60000 });
  const pass1 = await readBoard(page);
  console.log(`  board holds ${pass1.length} cards: ${pass1.map((c) => c.phase).join(", ") || "(none)"}`);

  const settled1 = pass1.filter((c) => c.phase === "settled" || c.phase === "spent" || /^h:/.test(c.phase ?? ""));
  const live1 = pass1.filter((c) => c.phase === "open" || c.phase === "locked" || c.phase === "result");

  if (pass1.length === 0) {
    say("BLIND", "D36", "the board rendered no round cards at all — nothing to measure");
  } else if (settled1.length === 0) {
    say("BLIND", "D36", `no settled card on the board right now (phases: ${pass1.map((c) => c.phase).join(", ")}) — §0 trap 3, this run cannot see the defect`);
  } else {
    // ⭐ THE CROSS-SURFACE CHECK: the board and the round page must print the SAME number.
    const s = settled1[0];
    if (!s.href) {
      say("BLIND", "D36 cross-surface", "the settled card carried no round link to follow");
    } else {
      const rp = await ctx.newPage();
      await rp.goto(`${BASE}${s.href}`, { waitUntil: "networkidle", timeout: 60000 });
      const heroText = (await rp.textContent("body")).replace(/\s+/g, " ");
      const same = s.price && heroText.includes(s.price);
      say(same ? "PROVED" : "REFUTED", "D36 · board and round page print one price",
        `board card says ${s.price}; the round page ${same ? "contains that figure" : "does NOT contain it"} (${s.href})`);
      await rp.close();
    }
  }

  /* ⭐ THE INSTANT DISCRIMINATOR, and it is stronger than waiting. The page's own PRICE TAPE
     renders the ASSET's current live read through the same `usd()` formatter the card uses. If a
     settled card's figure DIFFERS from the tape, that card is demonstrably not printing the live
     price — no waiting, no dependence on the market happening to move. */
  if (settled1.length > 0) {
    const tape = await page.$$eval(
      "div.mt-4.flex.flex-wrap span.font-mono.tabular-nums",
      (ns) => ns.map((n) => n.textContent.trim()).filter((t) => /[0-9]/.test(t)),
    );
    const s = settled1[0];
    if (tape.length === 0) {
      say("BLIND", "D36 · the settled figure is not the live read", "could not read the price tape");
    } else if (!s.price) {
      say("BLIND", "D36 · the settled figure is not the live read", "the settled card printed no figure");
    } else {
      say(!tape.includes(s.price) ? "PROVED" : "BLIND", "D36 · the settled figure is not the live read",
        `tape reads [${tape.join(", ")}]; the settled card reads ${s.price}${tape.includes(s.price) ? " — EQUAL, so this run cannot tell a close from a quote" : ""}`);
    }
  }

  /* ⭐ THE DECISIVE CHECK — WAIT FOR THE FEED TO MOVE, then look. Measured twice on 2026-09-24:
     during HANDOVER the newest settled round's close IS the latest confirmed read, so the tape and
     the settled card agree BY CONSTRUCTION and neither a fixed board nor the old broken one can be
     told apart at that instant. The discriminator is therefore not a fixed wait: poll until the
     TAPE actually changes, and only then ask whether the settled card followed it. Pre-fix it
     would have; post-fix it must not. If the feed never moves inside the window, this reports
     BLIND — a quiet feed is not evidence of a fix. */
  if (pass1.length > 0) {
    const tape0 = await page.$$eval("div.mt-4.flex.flex-wrap span.font-mono.tabular-nums",
      (ns) => ns.map((n) => n.textContent.trim()).filter((t) => /[0-9]/.test(t)));
    let moved = false;
    for (let i = 0; i < 15 && !moved; i++) {
      await page.waitForTimeout(20000);
      await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForSelector("article.mcardp", { timeout: 30000 }).catch(() => {});
      const t = await page.$$eval("div.mt-4.flex.flex-wrap span.font-mono.tabular-nums",
        (ns) => ns.map((n) => n.textContent.trim()).filter((x) => /[0-9]/.test(x)));
      moved = t.length > 0 && t.join("|") !== tape0.join("|");
      console.log(`  · poll ${i + 1}: tape [${t.join(", ")}]${moved ? "  ← MOVED" : ""}`);
    }
    if (!moved) { say("BLIND", "D36 · settled cards do not tick", `the price tape never changed in 5 minutes (still [${tape0.join(", ")}]) — a quiet feed proves nothing`); }
    const pass2 = await readBoard(page);
    const by = (arr, href) => arr.find((c) => c.href === href);

    const liveMoved = live1.some((c) => { const n = by(pass2, c.href); return n && n.price !== c.price; });
    const settledMoved = settled1.filter((c) => { const n = by(pass2, c.href); return n && n.price !== c.price; });

    if (!moved) {
      // already reported BLIND above
    } else if (settled1.length === 0) {
      say("BLIND", "D36 · settled cards do not tick", "no settled card in either pass");
    } else if (!liveMoved && live1.length > 0) {
      say("BLIND", "D36 · settled cards do not tick",
        "the tape moved but no CARD did — the board may be serving a cached render, so this cannot discriminate");
    } else if (live1.length === 0) {
      say("BLIND", "D36 · settled cards do not tick", "no live card to serve as the positive control");
    } else if (settledMoved.length === 0) {
      say("PROVED", "D36 · settled cards do not tick",
        `the price tape moved and a live card followed it, while all ${settled1.length} settled card(s) held their close`);
    } else {
      say("REFUTED", "D36 · settled cards do not tick",
        `${settledMoved.length} settled card(s) changed price: ${settledMoved.map((c) => c.price).join(", ")}`);
    }
  }
  await page.close();

  console.log("\n── D37 · the history strip ────────────────────────────────────────────");
  const { loginOnce } = await import("../harness.mjs");
  let state = null;
  try { state = await loginOnce(b, "mobile01"); } catch (e) { say("BLIND", "D37", `sign-in failed: ${String(e).slice(0, 120)}`); }

  if (state) {
    const hctx = await b.newContext({ storageState: state, viewport: PHONE });
    const h = await hctx.newPage();
    /* ⛔ NOT `networkidle`: this page mounts a 20s `RefreshPoller` whenever the view holds a live
       round, so the network never goes quiet and the navigation times out on a page that is fine. */
    await h.goto(`${BASE}/updown/history`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await h.waitForSelector("div.mt-5.grid > div", { timeout: 30000 }).catch(() => {});

    // The three tiles, read as (label, figure, sub-line), plus each tile's overflow.
    // ⛔ NOT a class selector on `p-3.5` — the dot in a Tailwind fraction class needs escaping and
    //    an unescaped one is a parse error, not an empty result. The strip's own grid is unambiguous.
    const tiles = await h.$$eval("div.mt-5.grid > div", (ns) => ns.map((n) => {
      const kids = [...n.children].map((k) => k.textContent.replace(/\s+/g, " ").trim());
      return { label: kids[0] ?? "", figure: kids[1] ?? "", sub: kids[2] ?? "",
               over: n.scrollWidth - n.clientWidth,
               subOver: Math.max(0, ...[...n.querySelectorAll("*")].map((k) => k.scrollWidth - k.clientWidth)) };
    }));
    console.log(`  tiles: ${JSON.stringify(tiles)}`);

    if (tiles.length < 3) {
      // ⛔ SAY WHAT THE PAGE ACTUALLY RENDERED. "0 tiles" is the same reading for "this account has
      //    no history", "the selector is wrong" and "the page failed" — and they need different work.
      const seen = (await h.textContent("body")).replace(/s+/g, " ").slice(0, 400);
      const url = h.url();
      say("BLIND", "D37", `only ${tiles.length} tiles found at ${url} — page reads: "${seen}"`);
    } else {
      const worst = Math.max(...tiles.map((t) => Math.max(t.over, t.subOver)));
      say(worst <= 0 ? "PROVED" : "REFUTED", "D37 · nothing spills out of a tile at 360",
        `worst overflow ${worst}px across ${tiles.length} tiles`);

      const body = (await h.textContent("body")).replace(/\s+/g, " ");
      const barCount = (body.match(/(\d+)\s+(results?|matokeo|结果)/i) ?? [])[1] ?? null;
      const roundsTile = tiles.find((t) => /round|raundi|回合/i.test(t.label));
      if (barCount && roundsTile) {
        say(barCount === roundsTile.figure ? "PROVED" : "REFUTED", "D37 · the Rounds tile equals the bar's count",
          `bar ${barCount} vs tile ${roundsTile.figure}`);
      } else {
        say("BLIND", "D37 · Rounds tile vs bar", `bar count ${barCount}, rounds tile ${roundsTile?.figure}`);
      }
    }
    await hctx.close();
  }
} finally { await b.close(); }

console.log("\n──────────────────────────────────────────────────────────────────────");
for (const v of verdicts) console.log(`  ${v.v.padEnd(8)} ${v.name}`);
const refuted = verdicts.filter((v) => v.v === "REFUTED").length;
const blind = verdicts.filter((v) => v.v === "BLIND").length;
console.log(`\n  ${verdicts.filter((v) => v.v === "PROVED").length} proved · ${blind} blind · ${refuted} refuted`);
if (refuted > 0) process.exit(1);
if (blind > 0) { console.log("  ⚠️ BLIND is not a pass — say so in the record."); process.exit(3); }
