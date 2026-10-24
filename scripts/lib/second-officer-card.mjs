/**
 * FEE-TAX R1 · THE OWNER MOVES "SECOND-OFFICER CHECKS" ON HIS CARD, IN A REAL BROWSER — the one way a drive turns the setting
 * ON or OFF (`/admin/system`, `src/app/admin/system/second-officer-card.tsx`; ruling 6 of 2026-10-24).
 *
 * ⭐ Nothing stored reads OFF (the Owner's ruling is the default, live with no click), so a drive that walks a refusal as it
 *    stood before R1 first has the Owner turn the checks ON here — the real door, an audited act with a written reason —
 *    and may turn them OFF again the same way.
 * ⭐ Located by the card's own hooks (`data-second-officer`, `data-second-officer-source`) and by role, never by its words:
 *    the card speaks the officer's language (Swahili when no language was chosen).
 * ⛔ The page must be signed in as the Owner (the stored ADMIN role): anyone else is shown no switch, and the act refuses.
 * ⛔ Localhost dev servers only — the caller's BASE has already been checked by the drive that calls this.
 *
 * Returns what the drive asserts: the position and its source before the act, whether the confirm was dead until a reason
 * was written, whether the card then reads the new position, and the card's text after.
 */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 60_000, every = 250) {
  const end = Date.now() + ms;
  for (;;) {
    try { const v = await fn(); if (v) return v; } catch { /* between renders */ }
    if (Date.now() > end) return null;
    await sleep(every);
  }
}

/** Drawn AND hydrated — a fiber on <main> — before the first click (a click before hydration does nothing). */
async function hydrated(page) {
  await page.locator("main").first().waitFor({ timeout: 120_000 });
  await page.waitForFunction(() => {
    const m = document.querySelector("main");
    return !!m && Object.keys(m).some((k) => k.startsWith("__reactFiber$"));
  }, null, { timeout: 120_000 });
}

/** What the Owner's card says now: its position ("on" / "off") and where that came from ("stored", "absent", …). */
export async function readSecondOfficerCard(page, { base }) {
  await page.goto(`${base}/admin/system`, { waitUntil: "domcontentloaded" });
  await hydrated(page);
  const card = page.locator("[data-second-officer]");
  await card.waitFor({ timeout: 60_000 });
  return {
    position: await card.getAttribute("data-second-officer").catch(() => null),
    source: await card.getAttribute("data-second-officer-source").catch(() => null),
  };
}

export async function moveSecondOfficerChecks(page, { base, turnOn, reason }) {
  await page.goto(`${base}/admin/system`, { waitUntil: "domcontentloaded" });
  await hydrated(page);
  const card = page.locator("[data-second-officer]");
  await card.waitFor({ timeout: 60_000 });
  const before = await card.getAttribute("data-second-officer").catch(() => null);
  const sourceBefore = await card.getAttribute("data-second-officer-source").catch(() => null);
  // The card's one button is the switch's trigger; its dialog opens on the press (pressed again if hydration lagged).
  const dlg = page.getByRole("alertdialog");
  const opened = await until(async () => {
    if ((await dlg.count()) > 0) return true;
    await card.getByRole("button").first().click();
    await sleep(400);
    return (await dlg.count()) > 0;
  }, 30_000);
  if (!opened) return { before, sourceBefore, gated: false, flipped: false, text: "the switch's dialog never opened" };
  // The dialog's own buttons come after its close button: Cancel, then the confirm.
  const press = dlg.getByRole("button").last();
  const gated = await press.isDisabled();
  await dlg.getByRole("textbox").fill(reason);
  await press.click();
  const target = turnOn ? "on" : "off";
  const flipped = await until(async () => (await page.locator(`[data-second-officer="${target}"][data-second-officer-source="stored"]`).count()) > 0, 60_000);
  const text = String(await page.locator("[data-second-officer]").textContent().catch(() => "")).replace(/[ ]+/g, " ").trim();
  return { before, sourceBefore, gated, flipped: !!flipped, text };
}
