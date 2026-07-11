import { chromium } from "playwright";
import fs from "node:fs"; import path from "node:path";

const PORT = process.env.PORT || 3007;
const MKT = process.env.MKT || "mkt_03647ce4bc8f48f904b6";
const OUT = path.resolve(".50pick-shots"); fs.mkdirSync(OUT, { recursive: true });

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => { if (cond) { pass++; console.log(`  PASS ${name}`); } else { fail++; console.log(`  FAIL ${name}${extra ? ` — ${extra}` : ""}`); } };

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 1400 }, colorScheme: "dark" });
await ctx.request.get(`http://localhost:${PORT}/auth/demo`); // demo session

const errors = [];
const page = await ctx.newPage();
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

const slider = () => page.getByRole("slider");
const toggle = () => page.locator('[data-testid="dial-lock-toggle"]');
const valNow = async () => Number(await slider().getAttribute("aria-valuenow"));
const toggleText = async () => (await toggle().innerText()).trim();
const armed = async () => (await toggle().getAttribute("aria-pressed")) === "true";

async function dragSlider(fromFrac, toFrac) {
  const box = await slider().boundingBox();
  const y = box.y + box.height / 2;
  const x0 = box.x + box.width * fromFrac, x1 = box.x + box.width * toFrac;
  await page.mouse.move(x0, y);
  await page.mouse.down();
  for (let i = 1; i <= 6; i++) await page.mouse.move(x0 + (x1 - x0) * (i / 6), y, { steps: 2 });
  await page.mouse.up();
  await page.waitForTimeout(150);
}

async function testSide(side) {
  console.log(`\n=== side=${side} ===`);
  await page.goto(`http://localhost:${PORT}/markets/${MKT}?side=${side}`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(1000);
  await slider().waitFor({ timeout: 10000 });
  // Drag toward the side's OWN half (YES=left, NO=right); the opposite half is
  // clamped by the side-lock, so a valid stake change only happens in-half.
  const deep = side === "YES" ? 0.12 : 0.88;

  // 1. default LOCKED
  ok(`${side}: default state is LOCKED`, !(await armed()), await toggleText());

  // 2. drag while LOCKED → value unchanged AND tapping the dial does NOT unlock
  const v0 = await valNow();
  await dragSlider(0.5, deep);
  ok(`${side}: locked drag does NOT change value`, (await valNow()) === v0, `v0=${v0}`);
  ok(`${side}: tapping the locked dial does NOT unlock (button-only)`, !(await armed()), await toggleText());

  // 3. unlock via the BUTTON only → armed
  await toggle().click();
  await page.waitForTimeout(150);
  ok(`${side}: Unlock button unlocks the dial`, await armed(), await toggleText());

  // 4. now ARMED → drag DOES change value
  await dragSlider(0.5, deep);
  const v2 = await valNow();
  ok(`${side}: armed drag changes value`, v2 !== v0, `v0=${v0} v2=${v2}`);

  // 5. side preserved — the place button still matches the side
  const placeBtn = await page.getByRole("button", { name: new RegExp(`Place ${side}`, "i") }).count();
  const wrongBtn = await page.getByRole("button", { name: new RegExp(`Place ${side === "YES" ? "NO" : "YES"}`, "i") }).count();
  ok(`${side}: place-${side} button present, opposite absent (side preserved)`, placeBtn >= 1 && wrongBtn === 0, `place=${placeBtn} wrong=${wrongBtn}`);

  // 6. re-lock via the button → drag inert again
  await toggle().click();
  await page.waitForTimeout(150);
  ok(`${side}: Lock button re-locks`, !(await armed()), await toggleText());
  const v3 = await valNow();
  await dragSlider(0.5, deep);
  ok(`${side}: relocked drag does NOT change value`, (await valNow()) === v3, `v3=${v3}`);

  // 7. exact typing works WHILE locked (drag can't interfere); stays locked
  const stakeInput = page.locator('input[inputmode="numeric"]').first();
  await stakeInput.click();
  await stakeInput.fill("7500");
  await stakeInput.press("Enter");
  await page.waitForTimeout(250);
  const shown = (await stakeInput.inputValue()).replace(/[^0-9]/g, "");
  ok(`${side}: exact type while LOCKED sets stake (7,500)`, shown === "7500", `shown=${shown}`);
  ok(`${side}: typing did NOT arm the dial (still Locked)`, !(await armed()), await toggleText());

  // 7. reload = "went out and came back" → back to Locked
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  await slider().waitFor({ timeout: 10000 });
  ok(`${side}: reload re-locks (default Locked)`, !(await armed()), await toggleText());

  // 8. stress — hammer the toggle; must not crash and must end consistent
  for (let i = 0; i < 25; i++) await toggle().click({ delay: 5 });
  await page.waitForTimeout(200);
  const finalArmed = await armed();
  const beforeStress = await valNow();
  await dragSlider(0.5, deep);
  const afterStress = await valNow();
  // if it ended armed, drag should move; if locked, it should arm (no move on first press)
  ok(`${side}: after 25x toggle-spam, state is consistent`,
     finalArmed ? (afterStress !== beforeStress) : (afterStress === beforeStress),
     `finalArmed=${finalArmed} before=${beforeStress} after=${afterStress}`);
}

await testSide("YES");
await testSide("NO");

// screenshots of both states for human read
await page.goto(`http://localhost:${PORT}/markets/${MKT}?side=YES`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(900);
await page.screenshot({ path: path.join(OUT, "dial-locked.png"), clip: { x: 300, y: 120, width: 680, height: 620 } });
await toggle().click(); await page.waitForTimeout(200);
await page.screenshot({ path: path.join(OUT, "dial-armed.png"), clip: { x: 300, y: 120, width: 680, height: 620 } });

await b.close();
console.log(`\n${pass} passed · ${fail} failed`);
console.log(errors.length ? `CONSOLE ERRORS:\n${errors.slice(0, 10).join("\n")}` : "no console errors");
process.exit(fail > 0 ? 1 : 0);
