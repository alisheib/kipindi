/**
 * U42 · THE SIGN-UP FUNNEL ON A PHONE — the only way a new player joins.
 *
 *   npm run qa:signup-funnel -- https://www.50pick.tz
 *   RED_WIDE=1  npm run qa:signup-funnel -- <base>    §1: a non-shrinking element is planted
 *   RED_ARIA=1  npm run qa:signup-funnel -- <base>    §2: the DOB names are set back to English
 *
 * ⚠️ SEVEN `/auth/*` ROUTES WERE NEVER NAMED ANYWHERE IN THIS PLAN and all seven serve 200 to a
 * guest. A programme about phones that never opened the join flow was measuring the rooms a
 * player reaches AFTER the door.
 *
 * ── §1 · NOTHING MAY SCROLL SIDEWAYS ─────────────────────────────────────────────────────────
 * ⛔ `documentElement.scrollWidth` IS THE WRONG NUMBER ON THIS SITE and a guard built on it can
 * never fire: it stays pinned at the viewport width even with a much wider element in the body.
 * `body.scrollWidth` moves — but it ALSO moves for content clipped inside a scroller, so it
 * over-reports (measured: 332 at a 320 viewport on `/markets`, where nothing is reachable
 * sideways). The honest test is whether the PAGE CAN ACTUALLY MOVE: scroll it and read `scrollX`.
 *
 * ── §2 · D69 · THE DATE-OF-BIRTH FIELDS MUST SPEAK THE PAGE'S LANGUAGE ────────────────────────
 * `/auth/register`'s three DOB inputs carried the hardcoded accessible names `Day`, `Month`,
 * `Year` on a page served `lang="sw"`. Not a missing translation — a constant. A Swahili player
 * using TalkBack heard the whole form in Swahili and then three English words at the one field
 * that decides whether they are allowed an account.
 * ⛔ THE ASSERTION IS THE ACCESSIBLE NAME, NOT THE VISIBLE TEXT. The visible segments are digits;
 * the English was audible only. A screenshot could never have found this and cannot verify it.
 */
import { chromium } from "playwright";
import { localisedContext, assertLang } from "./qa-locale.mjs";

const BASE = process.argv[2] || process.env.BASE || "https://www.50pick.tz";
const RED_WIDE = process.env.RED_WIDE === "1";
const RED_ARIA = process.env.RED_ARIA === "1";
const RED = RED_WIDE || RED_ARIA;
/** Each control must break the section it is named for — and only asserting that is what stops a
 *  control that happens to break a DIFFERENT section from certifying the one it was written for. */
const SECTION = { RED_WIDE: "1", RED_ARIA: "2" };

const ROUTES = ["/auth/register", "/auth/login", "/auth/otp", "/auth/forgot-password", "/auth/reset-password", "/auth/verify-email", "/auth/2fa"];
const failures = [];
const b = await chromium.launch();

console.log("\n§1 · no /auth/* route may scroll sideways on a phone");
for (const w of [320, 360]) {
  for (const path of ROUTES) {
    const ctx = await localisedContext(b, { locale: "sw", width: w, height: 780, baseUrl: BASE, reducedMotion: "reduce" });
    const p = await ctx.newPage();
    const resp = await p.goto(BASE + path, { waitUntil: "load", timeout: 120000 }).catch(() => null);
    await p.waitForTimeout(2500);

    // ⛔ VACUITY: a route that does not answer cannot be measured, and must not pass quietly.
    if (!resp || resp.status() >= 400) {
      failures.push(`1 ${path} @${w} returned ${resp ? resp.status() : "no response"} — this route proved nothing`);
      await ctx.close();
      continue;
    }
    try { await assertLang(p, "sw"); } catch {
      failures.push(`1 ${path} @${w} is not served in Swahili — the locale the rest of this check assumes`);
      await ctx.close();
      continue;
    }

    if (RED_WIDE) {
      // ⛔ THE FIRST VERSION OF THIS CONTROL APPENDED A 600px DIV TO THE FORM AND CHANGED
      // NOTHING — the auth card is a constrained column, so a wide child is simply clipped and
      // the PAGE never gains anything to scroll. The guard refused to certify itself ("BROKEN
      // HARNESS"), which is the harness working. ⭐ The control has to create the condition the
      // assertion is about: a document wider than the viewport. `min-width` on the body does
      // exactly that, and nothing less reliably does.
      await p.evaluate(() => { document.body.style.minWidth = "600px"; });
      await p.waitForTimeout(150);
    }

    const r = await p.evaluate(() => {
      const before = window.scrollX;
      window.scrollTo(80, window.scrollY);
      const moved = window.scrollX;
      window.scrollTo(before, window.scrollY);
      let widest = 0, name = "";
      for (const el of document.body.querySelectorAll("*")) {
        const q = el.getBoundingClientRect();
        if (q.width < 1 || q.height < 1) continue;
        if (q.right > widest) { widest = q.right; name = el.tagName + "." + String(el.className || "").split(" ").slice(0, 2).join("."); }
      }
      return { moved, vw: document.documentElement.clientWidth, widest: Math.round(widest), name };
    });

    if (r.moved > 0) failures.push(`1 ${path} @${w} SCROLLS SIDEWAYS (scrollX reached ${r.moved}); widest element right edge ${r.widest} vs a ${r.vw}px viewport — ${r.name}`);
    await ctx.close();
  }
  console.log(`   ${w}px  ${ROUTES.length} routes checked`);
}

console.log("\n§2 · D69 · the date-of-birth fields' ACCESSIBLE NAMES are the page's language");
for (const w of [320, 360]) {
  const ctx = await localisedContext(b, { locale: "sw", width: w, height: 780, baseUrl: BASE, reducedMotion: "reduce" });
  const p = await ctx.newPage();
  await p.goto(BASE + "/auth/register", { waitUntil: "load", timeout: 120000 });
  await p.waitForTimeout(2800);
  await assertLang(p, "sw");

  if (RED_ARIA) {
    await p.evaluate(() => {
      const en = { Siku: "Day", Mwezi: "Month", Mwaka: "Year" };
      for (const e of document.querySelectorAll("[aria-label]")) {
        const a = e.getAttribute("aria-label");
        if (en[a]) e.setAttribute("aria-label", en[a]);
      }
    });
    await p.waitForTimeout(120);
  }

  const r = await p.evaluate(() => {
    const names = [...document.querySelectorAll("[aria-label]")]
      .map((e) => e.getAttribute("aria-label") || "")
      .filter((a) => /^(day|month|year|siku|mwezi|mwaka)$/i.test(a.trim()));
    return { names: [...new Set(names)] };
  });

  // ⛔ VACUITY: if the three segments are not found at all, §2 has nothing to judge and must fail
  //    rather than report a clean run over an empty set.
  if (r.names.length < 3) {
    failures.push(`2 @${w} found ${r.names.length} date-of-birth segment name(s) (${r.names.join(", ") || "none"}) — expected 3, so this check proved nothing`);
  } else {
    const english = r.names.filter((n) => /^(day|month|year)$/i.test(n.trim()));
    if (english.length) failures.push(`2 @${w} the DOB fields announce ENGLISH names on a page served lang="sw": ${english.join(", ")} — a TalkBack user hears the form in Swahili and these in English`);
    console.log(`   ${w}px  names ${JSON.stringify(r.names)}`);
  }
  await ctx.close();
}

await b.close();

const label = RED_WIDE ? "RED_WIDE (§1's fix bypassed)" : RED_ARIA ? "RED_ARIA (§2's fix reverted)" : "GREEN";
console.log(`\nsign-up funnel on a phone — ${label} — ${BASE}`);
if (failures.length) for (const f of failures) console.log("  FAIL " + f);
else console.log("  no failures");

if (RED) {
  const want = SECTION[RED_WIDE ? "RED_WIDE" : "RED_ARIA"];
  const hit = failures.filter((f) => f.startsWith(want + " "));
  if (!hit.length) {
    console.error(`\n\u{1F534} BROKEN HARNESS — the control was applied and §${want} still PASSED.` +
      `\n   A control that does not break the section it is named for certifies nothing.` +
      `\n   ${failures.length ? "It broke a DIFFERENT section: " + failures[0] : "Nothing failed at all."}`);
    process.exit(2);
  }
  console.log(`\nRED control behaved: §${want} failed ${hit.length} time(s), as required.`);
  process.exit(0);
}
process.exit(failures.length ? 1 : 0);
