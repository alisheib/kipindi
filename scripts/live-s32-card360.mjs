/**
 * THE UP & DOWN CARD AT 360, IN ALL THREE LANGUAGES — "Up" and "Down" only, and the empty side said iff it is true.
 *
 * ⭐ RESTATED 2026-10-14 for Ali's ruling — *"remove odds from up and down market cards please and wherever this should
 * be reflected as well. mark this as decision, keep up and down only"* (DESIGN_AUTHORITY §C3; COMPLIANCE-DECISIONS
 * § "2026-10-14 · Up & Down cards show Up and Down only"). This drive was written for E-109, which ADDED two lines to
 * every bettable card (the `× N` on each button and the estimate note under them). It now holds the opposite of what it
 * first held, by the same means:
 *   · the two side buttons read the side's word and NOTHING else (no `× N`), in the reader's language;
 *   · no "×" anywhere on the card, and no estimate note (it explained the multiple that is gone);
 *   · the empty-side sentence is shown iff the pools leave a side empty — read from the card's OWN split row, which is a
 *     two-sided price exactly when both pools hold money (`priceState`, the same raw pools `emptySideOf` reads).
 * The standards' rule (§5b rule 9) used to locate an empty counterparty by its pari-mutuel signature, a side quoted at
 * exactly 1.00×; with no quote on the card that signature is gone, and the pools are what the invariant reads now.
 *
 * ⛔ READ-ONLY: it signs in, sets a language, photographs the card, and measures it. No bet, no
 * write. The stake is never placed; only the surface is read.
 *
 * ⚠️ THE LOCALE MUST BE PROVEN, NOT REQUESTED (E-106). This app resolves language from the
 * `kp-locale` COOKIE — `/api/locale` has never existed, and its 404 was swallowed by a
 * `.catch(() => {})`, so **every SW/ZH screenshot this campaign ever took was English
 * photographed twice.** The cookie is set on the context and `<html lang>` is then read back as
 * the honest witness; a mismatch THROWS rather than capturing a mislabelled shot.
 *
 * ⚠️ AND `innerText` IS NOT VISIBILITY (the truncation trap). A clipped line returns its full
 * string whatever the ellipsis paints, and a WRAP satisfies `scrollWidth === clientWidth`
 * exactly as a fit does. So this measures geometry — per-element overflow past the card's own
 * box — rather than asking whether the words are present.
 *
 *   SHOT_DIR=.qa-s32 node scripts/live-s32-card360.mjs                                 (LIVE_BASE names the target)
 *   LIVE_BASE=http://localhost:3056 ASSET=BTC DURATION=30 node scripts/live-s32-card360.mjs   (a local dev server:
 *     signed in through /auth/demo, which exists only off production)
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { login, recorder, BASE } from "./live/harness.mjs";

const SHOT = process.env.SHOT_DIR ?? ".qa-s32";
const DURATION = process.env.DURATION ?? "15";
const ASSET = process.env.ASSET ? `asset=${encodeURIComponent(process.env.ASSET)}&` : "";
const LOCALES = (process.env.LOCALES ?? "en,sw,zh").split(",");
const LOCAL = /localhost|127\.0\.0\.1|\[::1\]/.test(BASE);
const r = recorder("Up & Down · the card at 360, in three languages — Up and Down only (owner ruling 2026-10-14)");
mkdirSync(SHOT, { recursive: true });

/** The two side words, per language — the dictionary's `udUp` / `udDown`. */
const SIDES = { en: ["Up", "Down"], sw: ["Juu", "Chini"], zh: ["涨", "跌"] };
const EMPTY = { en: /nobody has backed|no bets yet/i, sw: /hakuna aliyeweka dau|hakuna dau bado/i, zh: /没有人投注|尚无投注/ };
/** The estimate note's core — in the old sentence ("× moves…") and in the new one ("The projected return moves…"). */
const NOTE = { en: /moves with every bet/i, sw: /hubadilika kwa kila dau/i, zh: /随每一笔新投注变动/ };

/**
 * ⭐ THE RULE, AS ONE PURE FUNCTION over what the card shows — so the drive's CONTROL below can prove it fails on the
 * defect it exists to catch, without a planted product.
 */
function cardDefects(locale, m) {
  const d = [];
  const [up, down] = SIDES[locale];
  if (m.sides.length !== 2) d.push(`${m.sides.length} side buttons, want 2`);
  else if (m.sides[0] !== up || m.sides[1] !== down) d.push(`the buttons read "${m.sides.join('" / "')}", want "${up}" / "${down}" only`);
  if (/×/.test(m.text)) d.push(`a "×" is printed on the card`);
  if (NOTE[locale].test(m.text)) d.push("the estimate note is on the card");
  const sentence = EMPTY[locale].test(m.text);
  const twoSided = /\d%/.test(m.split);
  if (sentence === twoSided) d.push(`the split row reads ${twoSided ? "a two-sided price" : "no price"} and the empty-side sentence is ${sentence ? "shown" : "absent"}`);
  return d;
}

const b = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
let failed = 0;
try {
  // ⛔ CONTROL FIRST: the rule must report the defects it exists for, or every green below is vacuous.
  const planted = cardDefects("en", { sides: ["Up × 1.26", "Down × 3.08"], text: "Up × 1.26 Down × 3.08 × moves with every bet", split: "Up 75% 25% Down" });
  const lie = cardDefects("en", { sides: ["Up", "Down"], text: "Nobody has backed Down yet", split: "Up 75% 25% Down" });
  const silent = cardDefects("en", { sides: ["Up", "Down"], text: "One side only", split: "One side only" });
  r.check("CONTROL · the rule reports a multiple on the buttons, the old note, a sentence on a two-sided round and a silent one-sided round",
    planted.length >= 3 && lie.length === 1 && silent.length === 1, [...planted, ...lie, ...silent].join(" · "));

  for (const locale of LOCALES) {
    const ctx = await b.newContext({ viewport: { width: 360, height: 1400 }, deviceScaleFactor: 2 });
    // ⛔ The cookie IS the mechanism. Setting it on the context means it is present on the very
    // first request, so nothing renders in English first and swaps.
    await ctx.addCookies([{ name: "kp-locale", value: locale, url: BASE }]);
    const page = await ctx.newPage();
    if (LOCAL) await page.goto(`${BASE}/auth/demo`, { waitUntil: "domcontentloaded" });
    else await login(page, "fleet:01");
    await page.goto(`${BASE}/updown?${ASSET}d=${DURATION}`, { waitUntil: "domcontentloaded" });

    // ⛔ `<html lang>` is written from the SAME resolved locale the dictionary lookup uses, so
    // it witnesses the RESULT rather than the request. The cookie only proves we asked.
    const applied = await page.getAttribute("html", "lang");
    if (applied !== locale) {
      r.check(`${locale}: the locale applied`, false, `<html lang>="${applied}" — refusing to capture a mislabelled shot`);
      await ctx.close();
      continue;
    }
    r.check(`${locale}: the locale applied (<html lang>="${applied}")`, true);

    await page.waitForSelector("article.mcardp", { timeout: 45_000 });
    // ⭐ The BETTABLE card — the one carrying the side buttons the rule is about (standards §5b rule 4: scope to the card
    // under test). It used to wait for a "× N" to render; there is none to wait for now.
    const card = page.locator("article.mcardp").filter({ has: page.locator("button.btn-yes") }).first();
    await card.waitFor({ timeout: 45_000 });
    // ⛔ `locator.screenshot()`, never `fullPage` — a full-page shot of a long board is an
    // artefact nobody can judge a card by.
    await card.screenshot({ path: `${SHOT}/card-360-${locale}.png` });

    // ── Geometry, per element, scoped to THIS card ─────────────────────────
    const m = await card.evaluate((el) => {
      const box = el.getBoundingClientRect();
      const over = [];
      for (const n of el.querySelectorAll("*")) {
        const b2 = n.getBoundingClientRect();
        if (b2.width === 0 || b2.height === 0) continue;
        // Past the card's own padded edge by more than a rounding pixel.
        if (b2.right > box.right + 1 || b2.left < box.left - 1) {
          over.push(`${n.tagName.toLowerCase()}.${(n.className || "").toString().split(" ")[0]}: ${Math.round(b2.right - box.right)}px`);
        }
      }
      // 🔴 THE CHECK ABOVE IS NOT ENOUGH, AND THE SWAHILI SHOT PROVED IT. A child clipped by an
      // intermediate row never reaches the CARD's edge — its rect is bounded by the row that is
      // cutting it — so "nothing overflows the card" was reported over a visibly severed chip.
      // The truncation memo, exactly: a WRAP and a CLIP both satisfy an edge comparison.
      // Measure every container against its OWN content instead.
      const clipped = [];
      for (const n of el.querySelectorAll("*")) {
        if (n.scrollWidth - n.clientWidth > 1 && n.clientWidth > 0) {
          const st = getComputedStyle(n);
          // `overflow-x: auto/scroll` is a scroller by design; `hidden`/`clip` is a cut.
          // ⛔ AN ELLIPSIS IS NOT A DEFECT, AND THIS CHECK REPORTED ONE AS THREE. Standing rule
          // §0.1b.3: a per-element scan must skip what is wide BY DESIGN — a `text-overflow:
          // ellipsis` element's hidden tail IS the "…", and flagging it means the "fix" is to
          // undo the fix. The card's footer source line is exactly that, and it was scored as a
          // 174px cut in Swahili on first run. Its SIZE is still worth a human look, so it is
          // reported as a note below rather than swallowed entirely.
          if (/ellipsis/.test(st.textOverflow)) continue;
          if (/hidden|clip/.test(st.overflowX)) {
            clipped.push(`${n.tagName.toLowerCase()}.${(n.className || "").toString().split(" ").slice(0, 2).join(".")}: ${n.scrollWidth - n.clientWidth}px cut`);
          }
        }
      }
      return {
        cardHeight: Math.round(box.height),
        docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        over: over.slice(0, 6),
        clipped: clipped.slice(0, 6),
        // Ellipsised elements, reported as INFORMATION. A tail hidden behind "…" is by design;
        // how MUCH of it is hidden is still a judgement a human should make.
        ellipsised: [...el.querySelectorAll("*")]
          .filter((n) => /ellipsis/.test(getComputedStyle(n).textOverflow) && n.scrollWidth - n.clientWidth > 1)
          .map((n) => ({ pct: Math.round(((n.scrollWidth - n.clientWidth) / n.scrollWidth) * 100), t: n.innerText.slice(0, 30) })),
        // Tap targets: the kit's floor is 40px.
        smallTaps: [...el.querySelectorAll("button")]
          .map((x) => ({ t: x.innerText.replace(/\s+/g, " ").trim().slice(0, 14), h: Math.round(x.getBoundingClientRect().height) }))
          .filter((x) => x.h > 0 && x.h < 40),
        // The two side buttons' visible words, Up first.
        sides: [...el.querySelectorAll("button.btn-yes, button.btn-no")].map((x) => x.innerText.replace(/\s+/g, " ").trim()),
        // The split row: "Up 75% · 25% Down" on a two-sided round, the one-sided rail's words or nothing otherwise.
        split: (el.querySelector(".ud-split")?.innerText ?? "").replace(/\s+/g, " ").trim(),
        text: el.innerText.replace(/\s+/g, " ").trim(),
      };
    });
    r.note(`${locale}: card ${m.cardHeight}px tall · buttons "${m.sides.join('" / "')}" · split "${m.split}"`);
    for (const e of m.ellipsised) r.note(`${locale}: ⓘ "${e.t}…" is ${e.pct}% hidden behind its ellipsis (by design — but LOOK)`);
    r.check(`${locale}: nothing inside the card overflows its own box`, m.over.length === 0, m.over.join(" · "));
    r.check(`${locale}: no container is CUTTING its own content`, m.clipped.length === 0, m.clipped.join(" · "));
    r.check(`${locale}: the page itself has no horizontal overflow`, m.docOverflow <= 0, `${m.docOverflow}px`);
    r.check(`${locale}: every control clears the 40px tap floor`, m.smallTaps.length === 0, m.smallTaps.map((x) => `${x.t}=${x.h}px`).join(" · "));
    const d = cardDefects(locale, m);
    r.check(`${locale}: the buttons say "${SIDES[locale].join('" and "')}" only — no multiple, no estimate note — and the empty side is said iff the pools leave one`,
      d.length === 0, d.join(" · "));
    await ctx.close();
  }
} catch (e) {
  console.error(`\n🔴 ${e.message}\n`);
  failed = 1;
} finally {
  failed = r.done() || failed;
  await b.close();
}
process.exit(failed === 0 ? 0 : 1);
