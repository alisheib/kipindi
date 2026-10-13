import { chromium } from "/home/user/kipindi-land7/node_modules/playwright/index.mjs";
const browser = await chromium.launch();
let page;
async function fresh() { if (page) await page.close(); page = await browser.newPage(); await page.goto("file://" + process.cwd() + "/index.html"); }
const snap = async () => page.evaluate(() => { const b = window.box(); const h = document.querySelector('#f input[type="hidden"]'); return { value: b.value, state: window.__state, hidden: h?.value, onChange: window.__log.map((l) => l.value).join("|") }; });
async function compose(kitProps, initial, seq, commit, kind = "controlled") {
  await fresh();
  await page.evaluate(([k, p]) => window.mount("new", k, p, "plain"), [kind, { ...kitProps, initial, defaultValue: kind === "uncontrolled" ? initial : undefined }]);
  await page.click('#f input:not([type="hidden"])', { force: true });
  await page.keyboard.press("End");
  const cdp = await page.context().newCDPSession(page);
  for (const t of seq) await cdp.send("Input.imeSetComposition", { text: t, selectionStart: t.length, selectionEnd: t.length });
  await cdp.send("Input.insertText", { text: commit });
  return snap();
}
const cases = [
  ["empty, compose 5→50→500→5000, commit 5000", "", ["5", "50", "500", "5000"], "5000"],
  ["empty, compose 1→12→123→1234→12345, commit", "", ["1", "12", "123", "1234", "12345"], "12345"],
  ["50, compose 0→00 commit 00 (want 5,000)", "50", ["0", "00"], "00"],
  ["500, compose 0 commit 0 (want 5,000)", "500", ["0"], "0"],
  ["1,000, compose 0 commit 0 (want 10,000)", "1000", ["0"], "0"],
  ["2,500, compose 00 (want 250,000)", "2500", ["0", "00"], "00"],
];
for (const [label, initial, seq, commit] of cases) {
  const g = await compose({ grouped: true, name: "stake" }, initial, seq, commit);
  const c = await compose({ inputMode: "numeric", name: "stake" }, initial, seq, commit);
  console.log(`${label.padEnd(48)} grouped → ${JSON.stringify(g)}\n${"".padEnd(48)} classic → ${JSON.stringify(c)}`);
}
// B8 redo: uncontrolled grouped, change with no focus seen, via the prototype setter (as a browser edit would)
await fresh();
await page.evaluate(() => window.mount("new", "uncontrolled", { grouped: true, name: "stake", defaultValue: "12345" }, "plain"));
await page.evaluate(() => { const b = window.box(); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(b, "12,34"); b.setSelectionRange(5, 5); b.dispatchEvent(new Event("input", { bubbles: true })); });
console.log("B8 uncontrolled 12,345 → '12,34' with no focus seen:", JSON.stringify(await snap()));
await browser.close();
