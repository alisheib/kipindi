/**
 * E-166 · THE HANDOVER, LOOKED AT — every width, every language, every state.
 *
 *   LIVE_BASE=http://localhost:3011 node scripts/live-updown-handover-widths.mjs
 *   (npm run qa:updown-handover-widths)
 *
 * ⛔ A GREEN SUITE IS NOT A READABLE SCREEN (standards §4). This produces the screenshots a human
 * must READ, and alongside them the measurements a human cannot take by eye.
 *
 * ── THE FOUR TRAPS THIS ENCODES, each already paid for by this campaign ─────────────────────
 *
 * 1 · ⛔ **ONE CONTEXT PER WIDTH, NEVER A MID-SESSION RESIZE.** A viewport changed after load
 *      gives measurements for a layout that never settled. Each width gets a fresh context.
 *
 * 2 · ⛔ **LANGUAGE COMES FROM THE `kp-locale` COOKIE, SET ON THE CONTEXT** (E-106) — there is no
 *      `/api/locale` route — and `<html lang>` is read back afterwards. A mismatch REFUSES to
 *      capture: a sweep that silently shoots the wrong language is worse than one that fails,
 *      because its output looks like evidence.
 *
 * 3 · ⛔ **MEASURE EVERY CONTAINER AGAINST ITS OWN `scrollWidth`.** A child clipped by an
 *      intermediate row never reaches the CARD's edge, so comparing rects against the card
 *      reports "no overflow" over a visibly severed control.
 *
 * 4 · ⛔ **AN ELLIPSIS IS NOT A DEFECT** — a `text-overflow: ellipsis` element is skipped, and
 *      how much is hidden is reported as a NOTE for a human to judge. The handover caption is
 *      deliberately clipped rather than allowed to wrap, because a wrapped caption grows the pod
 *      and shifts the whole board; the note is how we watch that stay reasonable in SW and ZH.
 *
 * ⭐ AND IT MEASURES THE ONE THING THIS FEATURE COULD BREAK BY ACCIDENT: the pod's HEIGHT. Ali's
 * §6: *"the handover pod is the exact height of the countdown pod it replaces."* The live card's
 * pod and the settled card's handover pod are measured side by side and must match to the pixel.
 *
 * ⛔ AND IT NAMES THE STATE IT PHOTOGRAPHED, ON EVERY SHOT. The first run of this sweep captured
 * a beautiful set of Swahili screenshots of the WAITING state while its filenames implied LIVE —
 * because repeated `arm` calls leave overlapping off-grid rounds on one chain and the lifecycle
 * healer settled one of them mid-run. Nothing failed; the evidence was simply about something
 * else. ⭐ A screenshot whose state is not asserted is a picture, not a proof. So the pod caption
 * is read back and compared against the state this sweep intends, and the run refuses on a
 * mismatch — the same rule the locale check follows two traps above.
 *
 * ⚠️ RUN IT AGAINST A FRESHLY BOOTED SERVER WITH `LIFECYCLE_TICKER=false`. The healer settles
 * overdue rounds on a 60s cadence, and a round settling in the middle of a sweep changes what is
 * on screen between one width and the next.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.LIVE_BASE ?? "http://localhost:3011";
const SHOT = process.env.SHOT_DIR ?? ".50pick-shots/handover-widths";
const DUR = 3;
mkdirSync(SHOT, { recursive: true });

const WIDTHS = [393, 768, 1024, 1280, 1440];
const LOCALES = [
  { code: "en", lang: "en" },
  { code: "sw", lang: "sw" },
  { code: "zh", lang: "zh" },
];

let pass = 0; const fails = []; const notes = [];
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};
const die = (why) => { console.error(`\n🔴 PREMISE ABSENT — ${why}`); process.exit(2); };
const post = async (path, body) => {
  const r = await fetch(`${BASE}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}) });
  if (!r.ok) die(`${path} → HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.json();
};
const waitPast = async (iso) => {
  const left = Date.parse(iso) - Date.now();
  if (left > 0) { console.log(`  waiting ${Math.ceil(left / 1000)}s…`); await new Promise((r) => setTimeout(r, left + 1500)); }
};

/**
 * Per-element overflow inside a scope, measured against EACH element's own box.
 * Returns `{ clipped, ellipsis }` — the second is a note, never a failure (trap 4).
 *
 * 🔴 ⛔ IT IS A FUNCTION, AND IT WAS A TEMPLATE STRING UNTIL 2026-08-24 (E-191). Playwright
 * evaluates a string `pageFunction` strictly as an EXPRESSION, so `page.evaluate("(sel) => …")`
 * returns the FUNCTION OBJECT, which does not serialise, and the caller gets **`undefined`** —
 * no throw, no warning. Measured on playwright 1.59.1: `page.evaluate('(x) => 1 + 2', 'body')`
 * → `undefined`, while `page.evaluate('1 + 2')` → `3`. Only a bare expression works.
 *
 * ⭐ AND THE CHECK BELOW WAS WRITTEN `!m || m.clipped.length === 0`, so `undefined` made it
 * pass — this driver reported *"nothing clipped"* green at 5 widths × 3 locales while measuring
 * nothing at all, for as long as the installed playwright behaved this way. A defensive
 * fallback on a measurement is how a check stops being one: it reads as care and behaves as an
 * unconditional pass. The guard now REFUSES an absent measurement instead of excusing it.
 */
const MEASURE = (sel) => {
  const root = document.querySelector(sel);
  if (!root) return null;
  const clipped = [], ellipsis = [];
  for (const el of root.querySelectorAll("*")) {
    const over = el.scrollWidth - el.clientWidth;
    if (over <= 1 || el.clientWidth === 0) continue;
    const cs = getComputedStyle(el);
    const label = (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 46);
    if (cs.textOverflow === "ellipsis") {
      ellipsis.push({ label, hiddenPct: Math.round((over / el.scrollWidth) * 100) });
      continue;
    }
    if (cs.overflowX === "auto" || cs.overflowX === "scroll") continue;   // scrolls on purpose
    clipped.push({ label, over, w: el.clientWidth, cls: (el.className || "").toString().slice(0, 40) });
  }
  return { clipped, ellipsis };
};

(async () => {
  console.log(`\n── stand up one real settle on ${BASE} ──`);
  await post("/api/dev-test/updown-seed", { durations: [DUR], feedProvider: "mock-bars" });
  const armed = (await post("/api/dev-test/updown-handover", { phase: "arm", leadSeconds: 20 }))
    .out?.find((o) => o.durationMinutes === DUR)?.round;
  if (!armed?.id) die("arm produced no round");
  await waitPast(armed.closesAt);
  const s = (await post("/api/dev-test/updown-handover", { phase: "settle" })).out?.find((o) => o.durationMinutes === DUR);
  if (!s?.closed?.resolvedAt) die(`the round did not settle: ${JSON.stringify(s?.result)}`);
  const SETTLED = s.closed.id;
  console.log(`  settled ${SETTLED} (${s.closed.outcome}) · successor ${s.opened?.id}\n`);

  const browser = await chromium.launch();
  const rows = [];

  for (const loc of LOCALES) {
    for (const w of WIDTHS) {
      // ⛔ ONE CONTEXT PER WIDTH, and the locale cookie set BEFORE the first request (E-106).
      const ctx = await browser.newContext({ viewport: { width: w, height: 1000 }, deviceScaleFactor: 1 });
      await ctx.addCookies([{ name: "kp-locale", value: loc.code, url: BASE }]);
      const page = await ctx.newPage();

      for (const [name, url] of [
        ["board", `${BASE}/updown?asset=BTC&d=${DUR}`],
        ["round", `${BASE}/updown/${SETTLED}`],
      ]) {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
        // Past the hold, so the handover is on screen in its steady state.
        await page.waitForTimeout(3500);

        // ⛔ REFUSE TO CAPTURE THE WRONG LANGUAGE. A shot labelled `sw` that rendered `en` is
        // evidence of nothing and looks exactly like evidence of something.
        const lang = await page.getAttribute("html", "lang");
        if (lang !== loc.lang) die(`locale mismatch on ${name} @${w}: cookie=${loc.code} but <html lang>=${lang}`);

        const tag = `${name}-${w}-${loc.code}`;
        await page.screenshot({ path: `${SHOT}/${tag}.png`, fullPage: true });

        // ⛔ NAME THE STATE, OR THE SHOT PROVES NOTHING. Read the handover pod's own caption back
        // and require the phase this sweep is here to photograph. See the header for the run
        // that produced perfect pictures of the wrong state.
        // ⚠️ `header .m-tick`, NOT `document.querySelector("header")` then a search inside it.
        // The app shell renders its own <header> for the top nav and it comes first in the
        // document, so scoping to the FIRST header found nothing and returned an empty caption
        // for every round-page shot — a selector that was wrong about which of two identically
        // named containers it meant.
        const caption = await page.evaluate((isBoard) => {
          const pool = isBoard
            ? [...([...document.querySelectorAll("article.mcardp")].pop()?.querySelectorAll(".m-tick") ?? [])]
            : [...document.querySelectorAll("header .m-tick")];
          const cap = pool.find((e) => e.className.includes("uppercase"));
          return (cap?.textContent || "").trim();
        }, name === "board");
        ok(`${tag} · photographed the LIVE handover state, not another one`,
          /next match live|mechi ijayo inaendelea|下一场进行中/i.test(caption), `caption="${caption}"`);

        // 1 · the page must never scroll sideways.
        const docOver = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        ok(`${tag} · no horizontal page overflow`, docOver <= 1, `${docOver}px`);

        // 2 · nothing clipped inside the content, measured per element (trap 3).
        const m = await page.evaluate(MEASURE, "main, #main-content, body");
        // ⛔ `!m` IS A FAILURE, NOT AN EXCUSE (E-191). An absent measurement means this cell was
        // never measured; calling that "nothing clipped" is the check lying about its own scope.
        ok(`${tag} · the clipping sweep actually measured something`, m != null,
          m == null ? "evaluate returned nothing — the scope selector matched no element, or the probe is a string again" : "");
        ok(`${tag} · nothing clipped`, m != null && m.clipped.length === 0,
          (m?.clipped ?? []).slice(0, 3).map((c) => `"${c.label}" +${c.over}px in ${c.w}px`).join(" | "));
        for (const e of m?.ellipsis ?? []) {
          if (e.hiddenPct >= 20) notes.push(`${tag} · "${e.label}" — ${e.hiddenPct}% behind the ellipsis`);
        }

        // 3 · ⭐ THE POD HEIGHTS MATCH. §6: the handover pod is the exact height of the countdown
        // pod it replaces. On the board both are on screen at once, so this is directly checkable.
        if (name === "board") {
          const pods = await page.evaluate(() => [...document.querySelectorAll("article.mcardp")]
            .map((c) => { const p = c.querySelector(".m-tick")?.parentElement; return p ? Math.round(p.getBoundingClientRect().height) : null; })
            .filter((h) => h != null));
          ok(`${tag} · the handover pod is the same height as the countdown pod`,
            pods.length < 2 || pods[0] === pods[1], `heights ${pods.join(" vs ")}`);
          rows.push({ tag, podHeights: pods.join("/") });

          // 4 · the caption stays on ONE line, in every language. A wrapped caption grows the pod
          // and shifts the board — which is exactly what check 3 above would then catch, so these
          // two are a pair: this one names the cause, that one catches the effect.
          const capLines = await page.evaluate(() => [...document.querySelectorAll("article.mcardp .m-tick")]
            .filter((e) => e.className.includes("uppercase"))
            .map((e) => Math.round(e.getBoundingClientRect().height / parseFloat(getComputedStyle(e).lineHeight || "12"))));
          ok(`${tag} · every pod caption is a single line`, capLines.every((n) => n <= 1), `lines ${capLines.join(",")}`);
        }

        // 4 · the "GO TO IT" control is a real tap target (standards §1.5 — ≥40px).
        const go = await page.evaluate(() => {
          const el = [...document.querySelectorAll("button, a")]
            .find((e) => /go to it|nenda|前往/i.test((e.textContent || "").trim()));
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { w: Math.round(r.width), h: Math.round(r.height) };
        });
        if (go) ok(`${tag} · the next-match control is tappable`, go.h >= 30 && go.w >= 44, `${go.w}×${go.h}px`);

        // 5 · ⛔ NO DEAD `00:00` ANYWHERE, in any language (E-99 rule 3).
        const dead = await page.evaluate(() => (document.body.innerText || "").includes("00:00"));
        ok(`${tag} · no dead 00:00`, dead === false);
      }
      await ctx.close();
      console.log(`  ${loc.code} @${w} ✓`);
    }
  }

  // ── the honest NO-NEXT-MATCH state, on a chain an operator has stopped ────────────────────
  console.log("\n── the stopped-chain state (5 of 19 live chains are in it right now) ──");
  await post("/api/dev-test/updown-handover", { phase: "stop" });
  for (const loc of LOCALES) {
    for (const w of [393, 1280]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 1000 } });
      await ctx.addCookies([{ name: "kp-locale", value: loc.code, url: BASE }]);
      const page = await ctx.newPage();
      await page.goto(`${BASE}/updown/${SETTLED}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await page.waitForTimeout(3500);
      const lang = await page.getAttribute("html", "lang");
      if (lang !== loc.lang) die(`locale mismatch on stopped @${w}: ${lang}`);
      const tag = `stopped-${w}-${loc.code}`;
      await page.screenshot({ path: `${SHOT}/${tag}.png`, fullPage: true });
      // ⛔ SCOPE THE CHECK TO THE POD (§5b.4). The first version tested the whole page body for
      // `\d\d:\d\d` after the caption — and matched the SETTLEMENT PROOF's `13:47:22 EAT`
      // timestamps, which are correct and must be there. Worse, in SW and ZH it split on an
      // English string, found nothing, and passed VACUOUSLY: a check that was wrong in EN and
      // meaningless in the other two. The pod is the thing under test, so read the pod.
      const pod = await page.evaluate(() => {
        const cap = [...document.querySelectorAll("header .m-tick")].find((e) => e.className.includes("uppercase"));
        const box = cap?.parentElement;
        if (!box) return null;
        const digits = [...box.querySelectorAll(".m-tick")].find((e) => !e.className.includes("uppercase"));
        return { caption: (cap.textContent || "").trim(), digits: (digits?.textContent || "").trim() };
      });
      if (!pod) die(`no countdown pod on the stopped round page @${w} ${loc.code}`);
      // ⛔ IT MUST SAY SO, NOT COUNT DOWN TO NOTHING. This is the branch that would otherwise
      // promise a next match on a chain nobody is running.
      ok(`${tag} · the pod says there is no next match`,
        /no next match|hakuna mechi ijayo|暂无下一场/i.test(pod.caption), `caption="${pod.caption}"`);
      ok(`${tag} · …and its digits are the honest em-dashes, never a time and never a dead 00:00`,
        pod.digits === "—:—", `digits="${pod.digits}"`);
      const docOver = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      ok(`${tag} · no horizontal overflow`, docOver <= 1, `${docOver}px`);
      await ctx.close();
      console.log(`  stopped ${loc.code} @${w} ✓`);
    }
  }
  await post("/api/dev-test/updown-handover", { phase: "start" });

  await browser.close();
  console.log(`\npod heights: ${rows.map((r) => `${r.tag}=${r.podHeights}`).join("  ")}`);
  if (notes.length) { console.log("\nNOTES for a human to judge (not failures):"); for (const n of notes) console.log(`  · ${n}`); }
  console.log(`\n${fails.length === 0 ? "ALL PASS" : "FAILURES"} — ${pass} passed, ${fails.length} failed`);
  for (const f of fails) console.log(`  · ${f}`);
  console.log(`\n⚠️ ${WIDTHS.length * LOCALES.length * 2 + 6} screenshots in ${SHOT} — READ THEM. A measurement cannot see ugly.`);
  process.exit(fails.length === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
