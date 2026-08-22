/**
 * LIVE — the CLEARED → RESTORE round-trip, on production.
 *
 *   node scripts/live-notifications-restore.mjs <fleet:NN>
 *
 * ⛔ THIS IS THE ONLY SAFETY PROPERTY ON THE SCREEN. Everything else `/notifications` does is
 * convenience. This is the one that matters:
 *
 *   `CLEAR ALL` stamps `dismissedAt`, and EVERY read door in the product filters
 *   `dismissedAt: null`. Before this screen, one tap permanently hid a player's whole money
 *   history with nothing anywhere able to show it again.
 *
 * So the claim under test is not "the Cleared filter renders". It is: **a row a player
 * dismissed is still reachable, and Restore brings it back.** A lens that renders an empty
 * state proves neither half — and the matrix drive could only report an empty state, because
 * the fleet player it ran as had never cleared anything.
 *
 * ⚠️ IT MOVES NO MONEY. It dismisses one notification and restores it: two writes to one
 * nullable column on one row, both reversible, and the second undoes the first.
 */
import { BASE, loginOnce, browser } from "./live/harness.mjs";

const WHO = process.argv[2] ?? "fleet:07";
let pass = 0;
const fails = [];
const ok = (label, cond, detail = "") => {
  if (cond) { pass++; console.log(`  PASS ${label}${detail ? ` — ${detail}` : ""}`); }
  else { fails.push(`${label}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
  return cond;
};

const b = (await browser()).b;
const state = await loginOnce(b, WHO);
const ctx = await b.newContext({ storageState: state, viewport: { width: 1280, height: 1000 } });
await ctx.addCookies([{ name: "kp-locale", value: "en", url: BASE }]);
const page = await ctx.newPage();

const goto = async (path) => {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1800);
};
const rows = () => page.locator("li[data-notif-kind]");
const clearedCount = async () => {
  const pill = page.locator('[data-chip="notif-filter-cleared"]').first();
  const label = ((await pill.innerText().catch(() => "")) || "").replace(/\s+/g, " ");
  return Number((label.match(/(\d[\d,]*)/) ?? [])[1]?.replace(/,/g, "") ?? -1);
};

try {
  // ── 1 · the starting position, read rather than assumed ──────────────────────
  await goto("/notifications");
  const allBefore = await rows().count();
  const clearedBefore = await clearedCount();
  ok("1 the screen lists rows to work with", allBefore > 0, `${allBefore} rows`);
  ok("1 the cleared count is readable", clearedBefore >= 0, `${clearedBefore}`);

  // The row we are about to dismiss — identified by its own text so we can find it again.
  const target = (await rows().first().innerText()).replace(/\s+/g, " ").trim().slice(0, 40);
  ok("1 a target row was identified", target.length > 5, target);

  // ── 2 · dismiss it, through the bell, the way a player would ─────────────────
  // ⛔ Through the real control, not a server action: the claim is about what a PLAYER can do.
  await goto("/updown");
  const bell = page.getByRole("button", { name: /^Notifications/i }).first();
  await bell.click();
  await page.waitForTimeout(1200);
  const dismiss = page.getByRole("button", { name: /dismiss notification/i }).first();
  ok("2 the bell offers a dismiss control", (await dismiss.count()) > 0);
  await dismiss.click();
  await page.waitForTimeout(2500);

  // ── 3 · ⭐ IT IS STILL REACHABLE. This is the whole point. ────────────────────
  await goto("/notifications?filter=cleared");
  const clearedRows = await rows().count();
  ok("3 ⭐ the dismissed row is reachable under Cleared", clearedRows > clearedBefore,
     `${clearedBefore} → ${clearedRows}`);
  const body = (await page.locator("[data-measure]").first().innerText()).replace(/\s+/g, " ");
  ok("3 the screen says clearing does not delete", /nothing is deleted/i.test(body), body.slice(0, 160));
  ok("3 ⭐ a cleared row offers Restore", /restore/i.test(body));

  // …and it is NOT in `all`, or it would read as two events.
  await goto("/notifications");
  const allAfter = await rows().count();
  ok("3 ⭐ …and it left the All lens (the two never overlap)", allAfter === allBefore - 1,
     `${allBefore} → ${allAfter}`);

  // ── 4 · ⭐ RESTORE BRINGS IT BACK ────────────────────────────────────────────
  await goto("/notifications?filter=cleared");
  const restore = page.getByRole("button", { name: /restore/i }).first();
  ok("4 a Restore control is present", (await restore.count()) > 0);
  await restore.click();
  await page.waitForTimeout(3000);

  await goto("/notifications");
  const allRestored = await rows().count();
  ok("4 ⭐ the row is back in All — the record was never lost", allRestored === allBefore,
     `${allBefore} → ${allAfter} → ${allRestored}`);

  await goto("/notifications?filter=cleared");
  const clearedFinal = await rows().count();
  ok("4 ⭐ …and it left the Cleared lens", clearedFinal === clearedBefore,
     `${clearedRows} → ${clearedFinal}`);
} catch (e) {
  ok("the round-trip completed", false, String(e).slice(0, 200));
}

await ctx.close();
await b.close();
console.log(`\nlive-notifications-restore — ${pass} passed, ${fails.length} failed`);
if (fails.length) { for (const f of fails) console.error(`  ✗ ${f}`); process.exit(1); }
