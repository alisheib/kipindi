import { chromium } from "/home/user/kipindi-land7/node_modules/playwright/index.mjs";
const browser = await chromium.launch();
let page;
const msgs = [];
async function fresh() {
  if (page) await page.close();
  page = await browser.newPage();
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") msgs.push(`${m.type()}: ${m.text().slice(0, 200)}`); });
  page.on("pageerror", (e) => msgs.push(`pageerror: ${e.message}`));
  await page.goto("file://" + process.cwd() + "/index.html");
}
const snap = async (label) => {
  const s = await page.evaluate(() => {
    const b = window.box();
    const hidden = document.querySelector('#f input[type="hidden"]');
    return { value: b.value, caret: `${b.selectionStart}-${b.selectionEnd}`, state: window.__state, hidden: hidden?.value, log: window.__log.map((l) => `${l.value}@${l.caret}`).join("|"), fd: JSON.stringify(window.formData()) };
  });
  console.log(`  ${label.padEnd(44)} ${JSON.stringify(s)}`);
  return s;
};
const mount = async (kind, props, mode = "plain") => { await fresh(); await page.evaluate(([k, p, m]) => window.mount("new", k, p, m), [kind, props, mode]); };
const clickBox = () => page.click('#f input:not([type="hidden"])', { force: true });
const caretTo = (n) => page.evaluate((n) => { const b = window.box(); b.setSelectionRange(n, n); }, n);

console.log("B1 controlled grouped, plain parent: type 5000, then a 7 after the first digit");
await mount("controlled", { grouped: true, name: "stake", initial: "" });
await clickBox(); await page.keyboard.type("5000"); await snap("typed 5000");
await page.keyboard.press("Home"); await page.keyboard.press("ArrowRight"); await page.keyboard.type("7"); await snap("7 after the 5");
await page.keyboard.press("End"); await page.keyboard.type("1234"); await snap("1234 at end (cap at 9)");

console.log("\nB2 controlled grouped, house-style functional updater after another setState (setErr(null); setV(() => e.target.value))");
await mount("controlled", { grouped: true, name: "stake", initial: "" }, "functional");
await clickBox(); await page.keyboard.type("12500"); await snap("typed 12500");
const st = await page.evaluate(() => window.__state);
console.log(`  parent state = ${JSON.stringify(st)} → Number(state) = ${Number(st)} · parseInt(state) = ${parseInt(st, 10)}`);

console.log("\nB3 uncontrolled grouped named in a form; then the box disabled");
await mount("uncontrolled", { grouped: true, name: "stake", defaultValue: "1000" });
await clickBox(); await page.keyboard.press("End"); await page.keyboard.type("5"); await snap("1000 + 5");
await page.evaluate(() => { window.box().disabled = true; }); await snap("box.disabled = true (DOM)");
await mount("uncontrolled", { grouped: true, name: "stake", defaultValue: "1000", disabled: true }); await snap("rendered disabled (prop)");
await mount("uncontrolled", { inputMode: "numeric", name: "stake", defaultValue: "1000", disabled: true }); await snap("CLASSIC rendered disabled (prop)");

console.log("\nB4 forward Delete at the separator of 1,000 (caret before the comma)");
await mount("controlled", { grouped: true, name: "stake", initial: "1000" });
await clickBox(); await caretTo(1); await page.keyboard.press("Delete"); await snap("Delete ×1");
await page.keyboard.press("Delete"); await snap("Delete ×2");
await page.keyboard.press("Delete"); await snap("Delete ×3");

console.log("\nB5 change 1,000 into 5,000 by replacing the leading digit (Backspace it, type 5)");
await mount("controlled", { grouped: true, name: "stake", initial: "1000" });
await clickBox(); await caretTo(1); await page.keyboard.press("Backspace"); await snap("Backspace the 1");
await page.keyboard.type("5"); await snap("type 5");
await mount("controlled", { inputMode: "numeric", name: "stake", initial: "1000" });
await clickBox(); await caretTo(1); await page.keyboard.press("Backspace"); await page.keyboard.type("5"); await snap("CLASSIC: same keys");

console.log("\nB6 parent that refuses a change (clamp at 100,000): 99,999 then type 9");
await mount("controlled", { grouped: true, name: "stake", initial: "99999" }, "clamp");
await clickBox(); await caretTo(2); await page.keyboard.type("9"); await snap("9 inside → 999,999 refused by parent");

console.log("\nB7 undo after grouping");
await mount("controlled", { grouped: true, name: "stake", initial: "" });
await clickBox(); await page.keyboard.type("5000"); await page.keyboard.press("Control+z"); await snap("Ctrl+Z after 5000");

console.log("\nB8 a change the box never saw focus for (uncontrolled default 12,345; script deletes the last digit and fires input)");
await mount("uncontrolled", { grouped: true, name: "stake", defaultValue: "12345" });
await page.evaluate(() => { const b = window.box(); b.value = "12,34"; b.dispatchEvent(new Event("input", { bubbles: true })); });
await snap("12,345 → 12,34 with no focus seen");
await mount("controlled", { grouped: true, name: "stake", initial: "12345" });
await page.evaluate(() => { const b = window.box(); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(b, "12,34"); b.dispatchEvent(new Event("input", { bubbles: true })); });
await snap("CONTROLLED: same");

console.log("\nB9 IME composition (CDP) of 34 at the end of 5,012 (5012 → 501234)");
await mount("controlled", { grouped: true, name: "stake", initial: "5012" });
await clickBox(); await page.keyboard.press("End");
const cdp = await page.context().newCDPSession(page);
await cdp.send("Input.imeSetComposition", { text: "3", selectionStart: 1, selectionEnd: 1 }); await snap("composing 3");
await cdp.send("Input.imeSetComposition", { text: "34", selectionStart: 2, selectionEnd: 2 }); await snap("composing 34");
await cdp.send("Input.insertText", { text: "34" }); await snap("commit 34");
await mount("controlled", { inputMode: "numeric", name: "stake", initial: "5012" });
await clickBox(); await page.keyboard.press("End");
const cdp2 = await page.context().newCDPSession(page);
await cdp2.send("Input.imeSetComposition", { text: "3", selectionStart: 1, selectionEnd: 1 });
await cdp2.send("Input.imeSetComposition", { text: "34", selectionStart: 2, selectionEnd: 2 });
await cdp2.send("Input.insertText", { text: "34" }); await snap("CLASSIC: commit 34");

console.log("\nB10 maxLength={9} on a grouped box: type 12345678");
await mount("controlled", { grouped: true, name: "stake", initial: "", maxLength: 9 });
await clickBox(); await page.keyboard.type("12345678"); await snap("typed 12345678");

console.log("\nB11 select a whole group with the mouse-like range and type: 12,500 select '2,5' type 9");
await mount("controlled", { grouped: true, name: "stake", initial: "12500" });
await clickBox(); await page.evaluate(() => window.box().setSelectionRange(1, 4)); await page.keyboard.type("9"); await snap("result");

console.log("\nB12 paste via clipboard event (insertFromPaste) of '1.000' and of '5,000/='");
await mount("controlled", { grouped: true, name: "stake", initial: "" });
await clickBox(); await page.evaluate(() => document.execCommand("insertText", false, "1.000")); await snap("insert 1.000");

console.log("\nconsole:", msgs.slice(0, 8));
await browser.close();
