// Landing v3 · C1 — "one price rule everywhere": drive every surface C1 touches and read what a player SEES.
//
//   LOCAL (after c1-seed.mjs):  BASE=http://localhost:3057 OUT=<dir> npx tsx scripts/qa/landing-v3/c1-drive.mjs
//   RED baseline (untouched tree, same seed):  … EXPECT_RED=1 npx tsx scripts/qa/landing-v3/c1-drive.mjs
//   PRODUCTION (read-only):     LIVE_BASE=https://www.50pick.tz BASE=https://www.50pick.tz OUT=<dir> \
//                               npx tsx scripts/qa/landing-v3/c1-drive.mjs --discover
// ⚠️ Run through `npx tsx` (it reads the dictionary from src/lib/i18n-dict.ts). Viewport TILES only, never full-page.
// Grid: WIDTHS (360,768,1280) × LOCALES (sw,en,zh; cookie kp-locale) × AUTHS (out,in). Signed in LOCALLY = /auth/demo?deposit=1;
// on PRODUCTION = `mobile01` through the live harness's loginOnce (one sign-in; no bets are placed by this drive, anywhere).
// Every finding carries a KEY. EXPECT_RED=1 turns the run into the RED proof: it exits 0 only if every key the
// untouched tree MUST produce was produced (spec §7 "RED") — a drive that cannot see the defect is blind.
// ⛔ PRECONDITION: the seed's pools must show every state (O one-sided, L 200,000/1,000, S1/S2 one-sided resolved,
//    UD1 one side, UD2 both); a missing premise is reported ABSENT, never green.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const { dict } = await import("../../../src/lib/i18n-dict.ts");
const BASE = (process.env.BASE || process.env.LIVE_BASE || "http://localhost:3057").replace(/\/$/, "");
const OUT = process.env.OUT || ".qa-shots/landing-v3/c1";
const DISCOVER = process.argv.includes("--discover") || process.env.DISCOVER === "1";
const PROD = !/localhost/.test(BASE);
const WIDTHS = (process.env.WIDTHS || "360,768,1280").split(",").map(Number);
const LOCALES = (process.env.LOCALES || "sw,en,zh").split(",");
const AUTHS = (process.env.AUTHS || "out,in").split(",");
const EXPECT_RED = process.env.EXPECT_RED === "1";
const H = { 360: 780, 768: 1024, 1280: 860 };
const DEGEN = /(?:^|[^\d.])(0|100)\s?%/;
mkdirSync(join(OUT, "frames"), { recursive: true });
mkdirSync(join(OUT, "og"), { recursive: true });

const findings = [];
const notes = [];
const seen = new Set();
let checks = 0;
const bad = (key, what) => { findings.push({ key, what }); seen.add(key); console.log(`  ✗ [${key}] ${what}`); };
const want = (cond, key, what) => { checks++; if (!cond) bad(key, what); return cond; };
const note = (s) => { notes.push(s); console.log(`  · ${s}`); };
const W = (loc) => dict[loc].market;
const C = (loc) => dict[loc].common;

// ── the seats ─────────────────────────────────────────────────────────────────────────────────────────
let seats = {};
let pre = {};
if (!DISCOVER) {
  const f = join(OUT, "c1-seats.json");
  if (!existsSync(f)) { console.error(`no ${f} — run c1-seed.mjs first`); process.exit(2); }
  ({ seats, precondition: pre } = JSON.parse(readFileSync(f, "utf8")));
  const p = pre.pools ?? {};
  const one = (x) => x && ((x.yesPool > 0) !== (x.noPool > 0));
  want(["O1", "O2", "O3"].every((k) => one(p[k])), "PRE", `the O seats are one-sided (${JSON.stringify({ O1: p.O1, O2: p.O2, O3: p.O3 })})`);
  want(p.L && p.L.yesPool === 200_000 && p.L.noPool === 1_000, "PRE", `L is 200,000 v 1,000 (${JSON.stringify(p.L)})`);
  want(["C1", "C2", "C3"].every((k) => p[k] && p[k].yesPool > 0 && p[k].noPool > 0), "PRE", "the C seats are two-sided");
  want(!!seats.S1 && !!seats.S2 && !!seats.P1 && !!seats.E2 && !!seats.F, "PRE", `every market seat exists (${JSON.stringify(seats)})`);
  want(!!pre.UD1 && one(pre.UD1), "PRE-UD", `UD1 is one-sided (${JSON.stringify(pre.UD1)})`);
  want(!!pre.UD2 && pre.UD2.yesPool > 0 && pre.UD2.noPool > 0, "PRE-UD", `UD2 is two-sided (${JSON.stringify(pre.UD2)})`);
} else {
  // PRODUCTION: one-sided markets from /markets (the card's own label), settled one-sided rows from /results.
  const slice = (html, id) => { const at = html.indexOf(`data-row-id="${id}"`); const nx = at >= 0 ? html.indexOf("data-row-id=", at + 12) : -1; return at >= 0 ? html.slice(at, nx > at ? nx : at + 6000) : ""; };
  const ids = (html) => [...new Set([...html.matchAll(/data-row-id="(mkt_[A-Za-z0-9_]+)"/g)].map((m) => m[1]))];
  const board = await (await fetch(`${BASE}/markets`)).text();
  const results = await (await fetch(`${BASE}/results?product=MARKET`)).text();
  const oneSided = ids(board).filter((id) => slice(board, id).includes("mcardp-oneside"));
  const priced = ids(board).filter((id) => !slice(board, id).includes("mcardp-oneside") && !slice(board, id).includes("mcardp-pct--empty"));
  const settledOne = ids(results).filter((id) => slice(results, id).includes("mcardp-oneside"));
  seats = { O1: oneSided[0] ?? null, O2: oneSided[1] ?? null, C1: priced[0] ?? null, S1: settledOne[0] ?? null, S1b: settledOne[1] ?? null };
  note(`discovered: ${oneSided.length} one-sided open, ${priced.length} priced, ${settledOne.length} settled one-sided — ${JSON.stringify(seats)}`);
  if (!seats.O1) note("⚠️ NO one-sided open market on production — the open one-sided arm is ABSENT here");
  if (!seats.S1) note("⚠️ NO settled one-sided market on /results — the phantom-fee arm is ABSENT here");
}

// ── the browser ───────────────────────────────────────────────────────────────────────────────────────
const b = await chromium.launch({ headless: true });
let prodState = null;
if (PROD && AUTHS.includes("in")) {
  const { loginOnce } = await import("../../live/harness.mjs");
  prodState = await loginOnce(b, "mobile01");
  if (!prodState.cookies.length) { console.error("sign-in left an empty cookie jar — stop (lockout risk)"); process.exit(2); }
}
const context = async (w, loc, auth) => {
  const ctx = await b.newContext({ viewport: { width: w, height: H[w] ?? 900 }, isMobile: w < 640, hasTouch: w < 640, ...(auth === "in" && prodState ? { storageState: prodState } : {}), userAgent: "Mozilla/5.0 HeadlessChrome c1-drive" });
  await ctx.addCookies([{ name: "kp-locale", value: loc, domain: new URL(BASE).hostname, path: "/" }]);
  await ctx.addInitScript(() => { try { localStorage.setItem("50pick-primer-seen", "1"); } catch {} });
  const page = await ctx.newPage();
  if (auth === "in" && !PROD) await page.goto(`${BASE}/auth/demo?deposit=1`, { waitUntil: "load", timeout: 90_000 });
  return { ctx, page };
};
const open = async (page, path) => {
  const res = await page.goto(BASE + path, { waitUntil: "load", timeout: 90_000 });
  await page.waitForTimeout(1500);
  const decline = page.getByTestId("consent-decline");
  if (await decline.count()) await decline.first().click({ timeout: 3000 }).catch(() => {});
  return res?.status() ?? 0;
};
const shot = async (page, id, selector) => {
  if (selector) await page.locator(selector).first().scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
  await page.screenshot({ path: join(OUT, "frames", `${id}.png`) }).catch(() => {});
};

/** Everything the detail page states about its price, read the way a player meets it. */
const readDetail = (page) => page.evaluate((DEGEN_SRC) => {
  const DEGEN = new RegExp(DEGEN_SRC);
  const txt = (el) => (el?.textContent || "").replace(/\s+/g, " ").trim();
  const section = document.querySelector("section.order-2");
  const aside = document.querySelector("aside");
  const rail = section?.querySelector(".tipbar-empty, .tipbar-rail");
  const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => { try { return JSON.parse(s.textContent || "{}"); } catch { return {}; } }).find((j) => j["@type"] === "Event");
  const note = document.querySelector("[data-one-sided-note]");
  const picker = document.querySelector('[data-testid="side-picker"]');
  const lean = section?.querySelector(".tipbar-lean");
  const regions = [section?.querySelector(".tipbar-labels"), rail, picker, note].filter(Boolean);
  return {
    railKind: rail?.classList.contains("tipbar-empty") ? "empty" : rail ? "priced" : "none",
    railLabel: rail?.getAttribute("aria-label") ?? null,
    labelRow: txt(section?.querySelector(".mcardp-oneside")),
    caption: txt(section?.querySelector("p.text-center.font-mono")),
    note: note ? txt(note) : null,
    noteInAside: !!(note && aside && aside.contains(note)),
    buttons: picker ? [...picker.querySelectorAll("button")].map((x) => ({ text: txt(x), aria: x.getAttribute("aria-label") })) : [],
    jsonLd: ld?.description ?? null,
    lean: txt(lean),
    shimmer: !!section?.querySelector(".tipbar-shimmer"),
    panelText: txt(document.querySelector("section.glass-panel")),
    degen: regions.map((r) => txt(r)).filter((s) => DEGEN.test(s)),
    fullPill: !!section?.querySelector(".tipbar-fill[data-full]"),
  };
}, DEGEN.source);

const detail = async (seat, id, loc, w, auth, page, expect) => {
  if (!id) return;
  const status = await open(page, `/markets/${id}`);
  const cell = `${seat}@${w}/${loc}/${auth}`;
  if (!want(status === 200, "HTTP", `${cell} /markets/${id} HTTP ${status}`)) return;
  const d = await readDetail(page);
  await shot(page, `detail-${seat}-${w}-${loc}-${auth}`);
  if (d.note) await shot(page, `detail-${seat}-${w}-${loc}-${auth}-note`, "[data-one-sided-note]");
  want(d.degen.length === 0, `${seat}-DEGEN`, `${cell}: a 0%/100% price in a price region: ${JSON.stringify(d.degen)}`);
  expect(d, cell);
};

try {
  for (const w of WIDTHS) for (const loc of LOCALES) for (const auth of AUTHS) {
    const { ctx, page } = await context(w, loc, auth);
    const m = W(loc);
    const c = C(loc);
    const sideIn = (s) => (s === "YES" ? c.yes : c.no);
    try {
      // ── one-sided, open (O1–O3) ──
      for (const seat of ["O1", "O2", "O3"]) {
        await detail(seat, seats[seat], loc, w, auth, page, (d, cell) => {
          want(d.railKind === "empty" && d.railLabel === m.oneSideOnly, `${seat}-RAIL`, `${cell}: rail ${d.railKind} "${d.railLabel}" (want the dashed rail "${m.oneSideOnly}")`);
          want(d.labelRow === m.oneSideOnly, `${seat}-LABEL`, `${cell}: label row "${d.labelRow}"`);
          want(!/100%|0%/.test(d.jsonLd ?? ""), `${seat}-JSONLD`, `${cell}: JSON-LD "${d.jsonLd}"`);
          want(d.jsonLd === "One side only. Predict on 50pick.", `${seat}-JSONLD-WORDS`, `${cell}: JSON-LD "${d.jsonLd}"`);
          want(!!d.note && /\{side\}/.test(m.oneSidedNote) && d.note.startsWith(m.oneSidedNote.split("{side}")[0].trim()), `${seat}-NOTE`, `${cell}: note "${d.note}"`);
          if (auth === "in") {
            want(d.noteInAside, `${seat}-NOTE-ASIDE`, `${cell}: the note is not at the money control`);
            want(d.buttons.length >= 2 && d.buttons.every((x) => !x.text.includes("@")), `${seat}-BUTTONS`, `${cell}: buttons ${JSON.stringify(d.buttons)}`);
            want(d.buttons.some((x) => x.aria === m.backYesAriaNoPrice) && d.buttons.some((x) => x.aria === m.backNoAriaNoPrice), `${seat}-ARIA`, `${cell}: aria ${JSON.stringify(d.buttons.map((x) => x.aria))}`);
          }
        });
      }
      // ── L (200,000 v 1,000) and the contested positive controls ──
      if (!DISCOVER) await detail("L", seats.L, loc, w, auth, page, (d, cell) => {
        want(d.railKind === "priced" && /99/.test(d.railLabel ?? ""), "L-BAR", `${cell}: bar ${d.railKind} "${d.railLabel}"`);
        want(d.jsonLd === "YES 99% · NO 1%. Predict on 50pick.", "L-JSONLD", `${cell}: JSON-LD "${d.jsonLd}"`);
        if (auth === "in") want(d.buttons.some((x) => x.text.includes("@ 99%")) && d.buttons.some((x) => x.text.includes("@ 1%")), "L-BUTTONS", `${cell}: ${JSON.stringify(d.buttons.map((x) => x.text))}`);
      });
      for (const seat of ["C1", "C2", "C3"]) await detail(seat, seats[seat], loc, w, auth, page, (d, cell) => {
        want(d.railKind === "priced", `${seat}-CONTROL`, `${cell}: POSITIVE CONTROL — a contested market must draw a price (${d.railKind})`);
        if (auth === "in") want(d.buttons.some((x) => /@ ([1-9]|[1-9]\d)%/.test(x.text)), `${seat}-CONTROL`, `${cell}: POSITIVE CONTROL — the buttons carry "@ n%" (${JSON.stringify(d.buttons.map((x) => x.text))})`);
      });
      // ── empty pools: F (fresh) and E2 (closed, never bet) ──
      if (!DISCOVER) {
        await detail("F", seats.F, loc, w, auth, page, (d, cell) => {
          want(d.railKind === "empty" && d.railLabel === m.noBetsYet, "F-RAIL", `${cell}: rail ${d.railKind} "${d.railLabel}"`);
          want(d.caption === `${m.noBetsYet} · ${m.beFirst}`, "F-CAPTION", `${cell}: caption "${d.caption}"`);
          want(d.jsonLd === "No bets yet. Predict on 50pick.", "F-JSONLD", `${cell}: JSON-LD "${d.jsonLd}"`);
        });
        await detail("E2", seats.E2, loc, w, auth, page, (d, cell) => {
          want(d.railKind === "empty" && d.railLabel === m.noBetsYet, "E2-PILL", `${cell}: rail ${d.railKind} "${d.railLabel}" (pre-C1: a 50/50 pill)`);
          want(d.caption === m.noBetsYet, "E2-CAPTION", `${cell}: caption "${d.caption}"`);
        });
        // ── S1 settled one-sided; S2 one-sided resolved AGAINST its money, unsettled (the phantom fee) ──
        await detail("S1", seats.S1, loc, w, auth, page, (d, cell) => {
          want(d.railKind === "empty" && d.railLabel === sideIn("YES"), "S1-RAIL", `${cell}: rail "${d.railLabel}" (want the verdict word)`);
          want(d.labelRow === m.oneSideOnly, "S1-LABEL", `${cell}: label "${d.labelRow}"`);
          want(d.note === null, "S1-NOTE", `${cell}: a refund note on a SETTLED market: "${d.note}"`);
          want(d.panelText.includes(m.resVoidRefund) && !d.panelText.includes(m.resPlatformFee), "S1-PANEL", `${cell}: panel "${d.panelText.slice(0, 160)}"`);
          want(d.jsonLd === "Result: YES. One side only. Predict on 50pick.", "S1-JSONLD", `${cell}: JSON-LD "${d.jsonLd}"`);
        });
        await detail("S2", seats.S2, loc, w, auth, page, (d, cell) => {
          want(!d.panelText.includes(m.resPlatformFee), "S2-FEE", `${cell}: the panel prints a platform fee on a one-sided refund (the phantom fee)`);
          want(d.panelText.includes(m.resOneSidedPending), "S2-PENDING", `${cell}: panel "${d.panelText.slice(0, 160)}"`);
        });
        await detail("P1", seats.P1, loc, w, auth, page, (d, cell) => {
          want(d.lean === m.resFinalPool, "P1-LEAN", `${cell}: the settled split's lean slot reads "${d.lean}" (want "${m.resFinalPool}")`);
          want(d.shimmer, "P1-SHIMMER", `${cell}: no resolved shimmer`);
        });
      } else if (seats.S1) {
        await detail("S1", seats.S1, loc, w, auth, page, (d, cell) => {
          want(!d.panelText.includes(m.resPlatformFee), "PROD-S1-FEE", `${cell}: PRODUCTION — a settled one-sided market's panel prints a fee (E-419)`);
        });
      }

      // ── /live ──
      if (await open(page, "/live") === 200) {
        const live = await page.evaluate((DEGEN_SRC) => {
          const DEGEN = new RegExp(DEGEN_SRC);
          const txt = (el) => (el?.textContent || "").replace(/\s+/g, " ").trim();
          const cards = [...document.querySelectorAll("a[data-price-state]")].map((a) => ({ href: a.getAttribute("href"), state: a.getAttribute("data-price-state"), text: txt(a), note: !!a.querySelector(".mcardp-onesided-note"), degen: DEGEN.test(txt(a)) }));
          const legacy = [...document.querySelectorAll(".market-grid > a")].map((a) => ({ href: a.getAttribute("href"), text: txt(a) }));
          const car = document.querySelector('[aria-roledescription="carousel"]');
          return { cards, legacy, carouselHrefs: car ? [...car.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")) : [], carouselDegen: car ? DEGEN.test(txt(car)) : false };
        }, DEGEN.source);
        await shot(page, `live-${w}-${loc}-${auth}`);
        const oneSidedAny = live.cards.find((x) => x.state === "oneSided");
        if (oneSidedAny) await shot(page, `live-${w}-${loc}-${auth}-onesided`, `a[href="${oneSidedAny.href}"]`);
        for (const seat of ["O1", "O2", "O3"]) {
          const id = seats[seat];
          if (!id) continue;
          const card = live.cards.find((x) => x.href === `/markets/${id}`);
          const old = live.legacy.find((x) => x.href === `/markets/${id}`);
          if (!card && old) { want(!DEGEN.test(old.text), `LIVE-${seat}-100`, `${w}/${loc}/${auth}: /live prints "${old.text.slice(0, 80)}" for ${seat}`); continue; }
          if (!card) { note(`${seat} not on /live at ${w}/${loc} (filtered or paged)`); continue; }
          want(card.state === "oneSided" && card.text.includes(m.oneSideOnly) && card.note && !card.degen, `LIVE-${seat}`, `${w}/${loc}/${auth}: /live card ${JSON.stringify(card).slice(0, 200)}`);
          want(!live.carouselHrefs.includes(`/markets/${id}`), `LIVE-CAROUSEL-${seat}`, `${w}/${loc}/${auth}: ${seat} is featured as most contested`);
        }
        if (seats.UD1?.roundId) want(!live.carouselHrefs.includes(`/updown/${seats.UD1.roundId}`), "LIVE-CAROUSEL-UD1", `${w}/${loc}/${auth}: UD1 featured`);
        want(!live.carouselDegen, "LIVE-CAROUSEL-DEGEN", `${w}/${loc}/${auth}: a 0/100 in the carousel`);
        want(live.carouselHrefs.every((h) => !/^\/markets\//.test(h) || !live.cards.find((x) => x.href === h && x.state !== "priced")), "LIVE-CAROUSEL-UNPRICED", `${w}/${loc}/${auth}: an unpriced market in the carousel`);
      }

      // ── /results ──
      if (await open(page, "/results?product=MARKET") === 200) {
        const r = await page.evaluate(({ notable, raw }) => {
          const txt = (el) => (el?.textContent || "").replace(/\s+/g, " ").trim();
          const gilt = [...document.querySelectorAll("a[data-row-id]")].filter((a) => txt(a).includes(notable));
          return {
            gilt: gilt.map((a) => ({ id: a.getAttribute("data-row-id"), lean: txt(a.querySelector(".tipbar-lean")), rawChip: raw.some((c) => txt(a).includes(c)), shimmer: !!a.querySelector(".tipbar-shimmer") })),
            grid: [...document.querySelectorAll("article[data-row-id], [data-row-id]")].map((a) => ({ id: a.getAttribute("data-row-id"), text: txt(a) })),
          };
        }, { notable: dict[loc].results.notableResult, raw: loc === "en" ? [] : ["SPORTS", "CRYPTO", "MACRO", "WEATHER", "ENTERTAINMENT", "TECH"] });
        await shot(page, `results-${w}-${loc}-${auth}`);
        if (seats.S1) want(!r.gilt.some((g) => g.id === seats.S1), "RESULTS-S1-CROWN", `${w}/${loc}/${auth}: a one-sided refund wears the notable crown`);
        for (const g of r.gilt) {
          want(g.lean === "" || g.lean === m.resFinalPool, "RESULTS-LEAN", `${w}/${loc}/${auth}: the spotlight's lean slot reads "${g.lean}"`);
          want(!g.rawChip, "RESULTS-CHIP", `${w}/${loc}/${auth}: the spotlight prints a raw category enum`);
        }
        const s1card = r.grid.find((x) => x.id === seats.S1);
        if (s1card) want(s1card.text.includes(m.oneSideOnly) && !DEGEN.test(s1card.text), "RESULTS-S1-CARD", `${w}/${loc}/${auth}: S1's card "${s1card.text.slice(0, 120)}"`);
      }

      // ── /updown and the one-sided round ──
      if (!DISCOVER && seats.UD1?.roundId) {
        if (await open(page, `/updown/${seats.UD1.roundId}`) === 200) {
          const u = await page.evaluate(() => ({
            empty: !!document.querySelector("main .tipbar-empty"), rail: !!document.querySelector("main .tipbar-rail"),
            label: (document.querySelector("main .mcardp-oneside")?.textContent || "").trim(), text: (document.querySelector("main")?.textContent || "").replace(/\s+/g, " "),
          }));
          await shot(page, `ud1-${w}-${loc}-${auth}`, "main .mcardp-oneside");
          want(u.empty && !u.rail && u.label === m.oneSideOnly, "UD1-ROUND", `${w}/${loc}/${auth}: UD1 round page empty=${u.empty} rail=${u.rail} label="${u.label}"`);
          want(!new RegExp(`${m.udUp} 100%|0% ${m.udDown}`).test(u.text), "UD1-100", `${w}/${loc}/${auth}: the round page prints ${m.udUp} 100%`);
        }
        if (await open(page, "/updown") === 200) {
          const splits = await page.evaluate(() => [...document.querySelectorAll(".ud-split")].map((s) => (s.textContent || "").replace(/\s+/g, " ").trim()));
          await shot(page, `updown-${w}-${loc}-${auth}`, ".ud-split .mcardp-oneside");
          want(splits.every((s) => !DEGEN.test(s)), "UD-SPLIT-DEGEN", `${w}/${loc}/${auth}: a card's split reads 0/100: ${JSON.stringify(splits.filter((s) => DEGEN.test(s)))}`);
          want(splits.some((s) => s.includes(m.oneSideOnly)), "UD1-CARD", `${w}/${loc}/${auth}: no Up & Down card names its one-sided state`);
          want(splits.some((s) => /\b([1-9]|[1-9]\d)%/.test(s)), "UD2-CONTROL", `${w}/${loc}/${auth}: POSITIVE CONTROL — no card shows a 1–99 split`);
        }
      }
    } finally {
      await ctx.close();
    }
  }

  // ── the OG images: 200, image/png, 1200×630 — saved to look at ──
  const pngSize = (buf) => (buf.length > 24 && buf.toString("ascii", 1, 4) === "PNG" ? { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) } : null);
  for (const seat of ["S1", "O1", "L", "P1", "C1"]) {
    const id = seats[seat];
    if (!id) continue;
    const r = await fetch(`${BASE}/api/og/market/${id}`);
    const buf = Buffer.from(await r.arrayBuffer());
    writeFileSync(join(OUT, "og", `${seat}.png`), buf);
    const size = pngSize(buf);
    want(r.status === 200 && (r.headers.get("content-type") || "").includes("image/png") && size?.w === 1200 && size?.h === 630, `OG-${seat}`, `og ${seat}: HTTP ${r.status} ${r.headers.get("content-type")} ${JSON.stringify(size)}`);
  }
} finally {
  await b.close();
}

// ── verdict ─────────────────────────────────────────────────────────────────────────────────────────────
const RED_KEYS = ["O1-JSONLD", "O2-JSONLD", "E2-PILL", "F-JSONLD", "S2-FEE", "LIVE-O1-100", "UD1-100"];
writeFileSync(join(OUT, "c1-drive.json"), JSON.stringify({ base: BASE, discover: DISCOVER, checks, findings, notes, seats }, null, 2));
console.log(`\nc1-drive: ${checks} checks, ${findings.length} finding(s) against ${BASE}`);
if (EXPECT_RED) {
  const missing = RED_KEYS.filter((k) => !seen.has(k));
  console.log(missing.length ? `RED BLIND — the untouched tree did not produce: ${missing.join(", ")}` : `RED PROVED — every expected defect was seen (${RED_KEYS.join(", ")})`);
  process.exit(missing.length ? 1 : 0);
}
process.exit(findings.length ? 1 : 0);
