/**
 * LIVE DRIVE — the resolver queue's bulk bar, on production, against the minted fleet.
 *
 *   npm run qa:bulk-resolve
 *
 * ⛔ IT NEVER TOUCHES THE 17 REAL MARKETS. Every market it selects is a `qa-bulk-resolve`
 * fixture, matched by TITLE PREFIX and re-checked against the DB before the click. The real
 * queue holds 445,000 TZS on one row alone; practising a brand-new bulk seal on it is not a
 * test, it is an incident.
 *
 * ⛔ AND IT DRIVES THE PRODUCT, NOT THE DATABASE. Every assertion below is about what an
 * officer's browser actually shows and what an officer's click actually does. "Verified"
 * means EXECUTED — a grep is not a chain and a seeded row is not a flow.
 *
 * ⚠️ Traps this file already encodes, each of which has cost a false finding here before:
 *  · `bodyText()` lowercases and collapses whitespace — the console CSS-uppercases its
 *    chips, so a case-sensitive `includes()` reports a perfect screen as broken.
 *  · `innerText` returns the FULL string whatever the ellipsis paints. Truncation is paint,
 *    so overflow is measured as RECTANGLES, never as text.
 *  · ⛔ Never climb DOM ancestors from a text match to find a card. Every card carries
 *    `data-market-id`; scope to that.
 */
import { browser, login, BASE, bodyText, shot, recorder, qaEnv } from "./live/harness.mjs";
import { readFileSync } from "node:fs";

const rec = recorder("BULK RESOLVE — live drive on production");
const WIDTHS = [360, 768, 1280, 1920];
// ⛔ SCOPED BY SEARCH, NOT BY LUCK. The queue paginates at PER_PAGE=20 and production holds
// ~92 CLOSED+LIVE polls, so an unfiltered page 1 does not contain the fixtures at all — and a
// probe that asserts about a card the server never rendered reports "the verdict is missing"
// on a page that is perfectly correct. Every fixture carries the same title prefix.
const QUEUE = `${BASE}/admin/resolver-queue?window=all&q=${encodeURIComponent("QA bulk-resolve fixture")}`;

// ── the fleet, read from the database so the drive can never assert about a market it
//    has not confirmed the state of ─────────────────────────────────────────────────
for (const line of readFileSync(".env.qa.local", "utf8").split(/\r?\n/)) {
  const m = /^([A-Z_0-9]+)=(.*)$/.exec(line);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const { Client } = await import("pg");
const db = new Client({ connectionString: process.env.PROD_DATABASE_PUBLIC_URL, ssl: { rejectUnauthorized: false } });
await db.connect();
const q = async (sql, p) => (await db.query(sql, p)).rows;

const fleet = await q(
  `select id, "titleEn", status::text as status, "sentinelOutcome", "sentinelConfidence",
          "sentinelDetermined", "sentinelSourceUrl", "resolvedOutcome", "settledAt"::text as settled,
          "yesPool"::text as yes, "noPool"::text as no
     from "PredictionMarket" where "proposedBy" = 'qa-bulk-resolve' order by "createdAt"`,
);
const byKey = new Map(fleet.map((r) => [/fixture (\S+)/.exec(r.titleEn)?.[1] ?? r.id, r]));
rec.note(`fleet: ${fleet.length} fixtures — ${[...byKey.keys()].join(", ")}`);
rec.check("0.1 the fleet is minted and complete", byKey.size >= 12, `${byKey.size} fixtures`);

// ⚠️ `browser()` returns { b, ctx } — it opens the context ITSELF. Calling
// `b.newContext` on the returned object is a TypeError, not a Playwright quirk.
const { b, ctx } = await browser({ viewport: { width: 1280, height: 1000 } });
const page = await ctx.newPage();

try {
  await login(page, "admin");
  await page.goto(QUEUE, { waitUntil: "networkidle" });
  const t = await bodyText(page);
  rec.check("1.1 the resolver queue renders for ADMIN", /resolver queue|foleni ya utatuzi/.test(t));

  // ── 2 · THE VERDICT IS ON THE SCREEN, PER ROW, AND IT DISCRIMINATES ──────────────
  // ⭐ This is the finding. Before it the page showed a confidence number and nothing
  // else, and an officer read that as a broken resolver.
  const cardVerdict = async (id) => {
    const card = page.locator(`[data-market-id="${id}"]`);
    if (!(await card.count())) return null;
    return (await card.innerText()).replace(/\s+/g, " ").toLowerCase();
  };

  const CASES = [
    ["B-SRC", /read a different site from this market's approved source/, /cited www\.espn\.com/],
    ["B-THR", /confidence is below the configured floor/, /82% · floor 90%/],
    ["B-DET", /assessed before this platform recorded the locked flag/, null],
    ["B-NOD", /the ai says the outcome is not locked yet/, null],
    ["B-NOA", /no ai reading recorded for this market/, null],
    ["E-YES-1", /clears the auto-resolve floor|would auto-seal/, null],
    ["E-NO-1", /clears the auto-resolve floor|would auto-seal/, null],
  ];
  for (const [key, re, detailRe] of CASES) {
    const row = byKey.get(key);
    if (!row) { rec.check(`2 ${key} · fixture present`, false, "missing from the fleet"); continue; }
    const txt = await cardVerdict(row.id);
    rec.check(`2 ${key} · the card states its verdict`, !!txt && re.test(txt), txt ? txt.slice(0, 160) : "card not rendered");
    if (detailRe) rec.check(`2 ${key} · …and names the specific fact`, !!txt && detailRe.test(txt), txt?.slice(0, 200));
  }

  // ⛔ THE DISCRIMINATION, IN ONE RUN: the row whose citation MATCHES must NOT be accused
  // of a citation failure. A guard that blames everything proves nothing.
  const thr = byKey.get("B-THR");
  if (thr) {
    const txt = await cardVerdict(thr.id);
    rec.check("2.9 a matching citation under the floor is NOT accused of a citation failure",
           !!txt && !/different site from this market's approved source/.test(txt), txt?.slice(0, 160));
  }

  // ── 3 · THE BAR, ITS SCOPE STATEMENT, AND THE INDETERMINATE HEADER ───────────────
  rec.check("3.1 the bulk bar is on the page", /select all on this page/.test(t));
  rec.check("3.2 the selection scope is STATED, not implied", /selection covers this page only/.test(t));

  const header = page.locator('input[type="checkbox"][aria-label*="Select all on this page"]');
  rec.check("3.3 the header checkbox has an accessible name", (await header.count()) === 1);

  const rowBox = (id) => page.locator(`[data-market-id="${id}"] input[type="checkbox"]`).first();
  const eligibleKeys = ["E-YES-1", "E-NO-1"].filter((k) => byKey.has(k));
  await rowBox(byKey.get(eligibleKeys[0]).id).check({ force: true });
  await page.waitForTimeout(250);
  const indet = await header.evaluate((el) => el.indeterminate);
  // ⭐ The third state. A select-all that can only say checked or unchecked lies about a
  // partial selection, and on a control that seals money the lie reads as "all of them".
  rec.check("3.4 ⭐ one row ticked puts the header in the INDETERMINATE state", indet === true, String(indet));

  await header.check({ force: true });
  await page.waitForTimeout(250);
  rec.check("3.5 select-all clears indeterminate", (await header.evaluate((el) => el.indeterminate)) === false);
  const afterAll = await bodyText(page);
  rec.check("3.6 the bar counts what will SEAL and what will SKIP separately",
         /will seal/.test(afterAll) && /will skip/.test(afterAll), afterAll.match(/\d+ will \w+/g)?.join(" · "));

  // ── 4 · KEYBOARD ────────────────────────────────────────────────────────────────
  await header.uncheck({ force: true });
  await page.waitForTimeout(200);
  const kb = rowBox(byKey.get(eligibleKeys[0]).id);
  await kb.focus();
  await page.keyboard.press("Space");
  await page.waitForTimeout(200);
  rec.check("4.1 SPACE toggles a row checkbox (it is not mouse-only)", await kb.isChecked());
  const ring = await kb.evaluate((el) => {
    const paint = el.parentElement?.querySelector("span[aria-hidden]");
    return paint ? getComputedStyle(paint).outlineWidth : "";
  });
  rec.check("4.2 the focus ring is painted on the visible box", ring !== "" && ring !== "0px", ring);

  // ── 5 · RESPONSIVE — RECTANGLES, NEVER TEXT ─────────────────────────────────────
  // ⛔ A negative margin leaves the box, and `innerText` returns the full string whatever
  // the ellipsis paints. Overflow is measured by comparing RECTANGLES.
  for (const locale of ["en", "sw", "zh"]) {
    await ctx.addCookies([{ name: "kp-locale", value: locale, url: BASE }]);
    for (const w of WIDTHS) {
      await page.setViewportSize({ width: w, height: 1000 });
      await page.goto(QUEUE, { waitUntil: "networkidle" });
      const overflow = await page.evaluate(() => {
        const out = [];
        const doc = document.documentElement;
        if (doc.scrollWidth > doc.clientWidth + 1) out.push(`page ${doc.scrollWidth}>${doc.clientWidth}`);
        for (const card of document.querySelectorAll("[data-market-id]")) {
          const r = card.getBoundingClientRect();
          if (r.right > doc.clientWidth + 1 || r.left < -1) out.push(`card ${card.getAttribute("data-market-id")} ${Math.round(r.left)}..${Math.round(r.right)}`);
          for (const el of card.querySelectorAll("*")) {
            const c = el.getBoundingClientRect();
            if (c.width === 0) continue;
            if (c.right > r.right + 1 || c.left < r.left - 1) {
              out.push(`overflow in ${card.getAttribute("data-market-id")}: ${el.className?.toString?.().slice(0, 40)} ${Math.round(c.left)}..${Math.round(c.right)} vs ${Math.round(r.left)}..${Math.round(r.right)}`);
            }
          }
        }
        return out.slice(0, 6);
      });
      rec.check(`5 ${locale}@${w} · nothing leaves its box`, overflow.length === 0, overflow.join(" | "));

      // ⛔ Hit areas are a RECTANGLE too. 44px, measured, not asserted from a class name.
      const small = await page.evaluate(() => {
        const bad = [];
        // ⛔ THE POPULATION IS THIS CHANGE'S OWN CONTROLS. A page-wide `.btn` sweep also
        // catches the filter card's `btn-xs` (32px — `--h-control-xs`, the console's
        // DOCUMENTED mouse-only admin exception), which is pre-existing and would make this
        // check fail for ever while saying nothing at all about the bulk bar.
        for (const el of document.querySelectorAll('[data-market-id] label, [data-bulk-bar] label, [data-bulk-bar] .btn')) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if (r.height < 40) bad.push(`${el.tagName}.${el.className?.toString?.().slice(0, 30)} h=${Math.round(r.height)}`);
        }
        return bad.slice(0, 5);
      });
      rec.check(`5 ${locale}@${w} · every tap target is at least 40px tall`, small.length === 0, small.join(" | "));
      if (w === 360) await shot(page, `bulk-resolve-${locale}-360`);
    }
  }
  await ctx.addCookies([{ name: "kp-locale", value: "en", url: BASE }]);
  await page.setViewportSize({ width: 1280, height: 1000 });

  // ── 6 · THE CONFIRMATION NAMES THE MONEY ────────────────────────────────────────
  await page.goto(QUEUE, { waitUntil: "networkidle" });
  const seal = [];
  for (const k of eligibleKeys) {
    await rowBox(byKey.get(k).id).check({ force: true });
    seal.push(byKey.get(k));
  }
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: /resolve selected/i }).click();
  await page.waitForTimeout(700);
  // ⚠️ THE KIT MODAL IS A PORTAL AND `[role="dialog"]` DOES NOT WRAP ITS BODY. Reading that
  // node returned an EMPTY string, so every assertion about the confirmation failed while the
  // dialog was on screen and its confirm button was clickable — a probe measuring the wrong
  // node, which photographs exactly like missing copy. Read the overlay, and prove it is ours
  // by requiring the heading rather than trusting whichever node came first.
  const dlg = (await page.evaluate(() => {
    const nodes = [...document.querySelectorAll("body > div, [data-modal], [role=dialog]")];
    const hit = nodes.map((n) => n.innerText || "").filter((t) => /(seal|stage) \d+ markets\?/i.test(t));
    return hit.sort((a, b) => b.length - a.length)[0] ?? "";
  })).replace(/\s+/g, " ");
  rec.check("6.1 the confirmation names the COUNT", /seal 2 markets\?/i.test(dlg), dlg.slice(0, 120));
  rec.check("6.2 …every selected market by title", seal.every((m) => dlg.includes(m.titleEn.slice(0, 40))), dlg.slice(0, 200));
  rec.check("6.3 …each outcome and its confidence", /YES/.test(dlg) && /9[0-9]%/.test(dlg));
  rec.check("6.4 …and the MONEY held, with a total",
         /player money held on the selected markets/i.test(dlg) && /TZS/.test(dlg), dlg.slice(-200));
  rec.check("6.5 a batch with no override does NOT demand a typed word", !/type RESOLVE/i.test(dlg));
  await shot(page, "bulk-resolve-confirm");

  // ── 7 · THE SEAL, AND THE FIVE BUCKETS ──────────────────────────────────────────
  const before = await q(`select id, status::text as status from "PredictionMarket" where id = any($1)`, [seal.map((m) => m.id)]);
  rec.check("7.0 the targets are CLOSED before the click", before.every((r) => r.status === "CLOSED"), JSON.stringify(before));

  await page.getByRole("button", { name: /yes, seal/i }).click();
  await page.waitForTimeout(6000);
  const after = await bodyText(page);
  rec.check("7.1 the batch reports a boundary with a batch id", /batch [0-9a-f]{8} · \d+ attempted/.test(after), after.match(/batch [0-9a-f]{8}[^·]*· \d+ attempted/)?.[0]);
  rec.check("7.2 …and names what was SEALED", /· sealed/.test(after), after.match(/\d+ · sealed/)?.[0]);

  const sealed = await q(`select id, status::text as status, "resolvedOutcome", "objectionsClosedAt"::text as oca, "settledAt"::text as settled, "resolutionStage2By" from "PredictionMarket" where id = any($1)`, [seal.map((m) => m.id)]);
  rec.check("7.3 ⭐ the markets are RESOLVED on production", sealed.every((r) => r.status === "RESOLVED"), JSON.stringify(sealed.map((r) => r.status)));
  rec.check("7.4 …with the AI's outcome", sealed.every((r) => r.resolvedOutcome === "YES" || r.resolvedOutcome === "NO"));
  // ⛔ NO MONEY MOVED. The objection window is a real gate, not a countdown over money
  // that already left — `settledAt` stays NULL until it closes.
  rec.check("7.5 ⛔ NO money moved — settledAt is still NULL", sealed.every((r) => r.settled === null), JSON.stringify(sealed.map((r) => r.settled)));
  rec.check("7.6 …and the objection window was opened", sealed.every((r) => !!r.oca));
  rec.check("7.7 the OFFICER is recorded as the sealer, not the system",
         sealed.every((r) => r.resolutionStage2By && r.resolutionStage2By !== "system_auto_resolver"),
         JSON.stringify(sealed.map((r) => r.resolutionStage2By?.slice(0, 12))));
  // ⛔ The AI's excerpt must NOT appear as the officer's evidence on the player panel.
  const ev = await q(`select "resolutionEvidence" from "PredictionMarket" where id = any($1)`, [seal.map((m) => m.id)]);
  rec.check("7.8 ⛔ nothing was written as the officer's player-facing evidence",
         ev.every((r) => !r.resolutionEvidence), JSON.stringify(ev));

  // ── 8 · AUDIT — the run boundary and the per-market rows ─────────────────────────
  const rows = await q(
    `select action, "targetId", payload from "AuditLog"
      where action in ('market.resolve.bulk','market.adjudicated','market.resolve.bulk_override')
        and "createdAt" > now() - interval '5 minutes' order by "createdAt"`,
  );
  const boundary = rows.filter((r) => r.action === "market.resolve.bulk");
  const adjudicated = rows.filter((r) => r.action === "market.adjudicated");
  rec.check("8.1 ⭐ exactly ONE run-boundary row for the batch", boundary.length === 1, `${boundary.length}`);
  rec.check("8.2 …carrying the whole selection", boundary.length === 1 && (boundary[0].payload?.selection?.length ?? 0) === seal.length);
  rec.check("8.3 …and every bucket", boundary.length === 1 && Array.isArray(boundary[0].payload?.skipped));
  rec.check("8.4 the engine still wrote its own per-market row for each", adjudicated.length >= seal.length, `${adjudicated.length}`);
  rec.check("8.5 ⛔ NO override row was written — nothing was overridden",
         rows.filter((r) => r.action === "market.resolve.bulk_override").length === 0);

  // ── 9 · IDEMPOTENCY — the replay, driven rather than assumed ─────────────────────
  // ⭐ The markets are already sealed. Re-submitting the SAME selection must report them
  // as already-applied and must NOT seal anything twice.
  const evBefore = await q(`select count(*)::int n from "LedgerEntry" where "marketId" = any($1)`, [seal.map((m) => m.id)]);
  await page.goto(QUEUE, { waitUntil: "networkidle" });
  const stillThere = await page.locator(`[data-market-id="${seal[0].id}"]`).count();
  rec.check("9.1 a sealed market leaves the queue", stillThere === 0, `${stillThere} cards`);
  const evAfter = await q(`select count(*)::int n from "LedgerEntry" where "marketId" = any($1)`, [seal.map((m) => m.id)]);
  rec.check("9.2 ⛔ no ledger entry was written by the seal — money moves at SETTLE, not here",
         evAfter[0].n === evBefore[0].n, `${evBefore[0].n} → ${evAfter[0].n}`);

  const failed = rec.done();
  process.exitCode = failed === 0 ? 0 : 1;
} catch (err) {
  console.error("DRIVE ERROR:", err?.stack ?? err);
  process.exitCode = 1;
} finally {
  await ctx.close();
  await b.close();
  await db.end();
}
