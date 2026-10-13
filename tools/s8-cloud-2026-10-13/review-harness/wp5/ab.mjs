import { chromium } from "/home/user/kipindi-land7/node_modules/playwright/index.mjs";
const browser = await chromium.launch();
let page;
const consoleMsgs = [];
async function fresh() {
  if (page) await page.close();
  page = await browser.newPage();
  page.on("console", (m) => consoleMsgs.push(`${m.type()}: ${m.text()}`));
  page.on("pageerror", (e) => consoleMsgs.push(`pageerror: ${e.message}`));
  await page.goto("file://" + process.cwd() + "/index.html");
}
const snap = async () => page.evaluate(() => {
  const b = window.box();
  return { value: b?.value, s: b?.selectionStart, e: b?.selectionEnd, state: window.__state, log: window.__log.map((l) => `${l.value}@${l.caret}`).join("|"), fd: JSON.stringify(window.formData()), html: window.html() };
});
const SEQ = [
  ["click"], ["type", "12500.00"], ["key", "Backspace"], ["key", "ArrowLeft"], ["key", "ArrowLeft"], ["type", "7"],
  ["key", "Control+a"], ["insert", "1,500.50"], ["key", "Home"], ["key", "Delete"], ["key", "End"], ["type", "9"],
  ["key", "Control+a"], ["insert", "-42"], ["key", "Control+a"], ["key", "Backspace"], ["type", "0005"], ["insert", "9 500,00"],
];
async function run(kit, kind, props, mode, inField) {
  await fresh();
  await page.evaluate(([kit, kind, props, mode, inField]) => window.mount(kit, kind, props, mode, inField), [kit, kind, props, mode, inField]);
  const out = [await snap()];
  for (const [op, arg] of SEQ) {
    if (op === "click") await page.click('#f input:not([type="hidden"])', { force: true });
    else if (op === "type") await page.keyboard.type(arg);
    else if (op === "key") await page.keyboard.press(arg);
    else if (op === "insert") await page.evaluate((t) => document.execCommand("insertText", false, t), arg);
    out.push(await snap());
  }
  return out;
}
const CONFIGS = [
  ["uncontrolled", { inputMode: "numeric", name: "amount", defaultValue: "1000", prefix: "TZS", mono: true }],
  ["controlled", { inputMode: "numeric", name: "amount", initial: "", prefix: "TZS", mono: true, size: "lg" }],
  ["controlled", { inputMode: "decimal", name: "rate", initial: "" }],
  ["controlled", { type: "tel", name: "phone", initial: "" }],
  ["uncontrolled", { name: "q", defaultValue: "abc" }],
  ["controlled", { inputMode: "numeric", name: "amount", initial: "" }, "functional"],
  ["controlled", { type: "number", name: "n", min: 5, max: 120, initial: "" }, "plain", true],
  ["controlled", { inputMode: "numeric", name: "amount", initial: "5000", disabled: true }],
  ["uncontrolled", { inputMode: "numeric", name: "amount", noOnChange: true, size: "sm", "aria-invalid": "false" }],
  ["controlled", { inputMode: "numeric", name: "amount", initial: "", error: "Too much" }, "plain", true],
  ["uncontrolled", { inputMode: "numeric", name: "amount", defaultValue: "1000", allowNegative: true, step: "0.5" }, "plain", true],
];
let diffs = 0;
for (const [kind, props, mode = "plain", inField = false] of CONFIGS) {
  const a = await run("old", kind, props, mode, inField);
  const b = await run("new", kind, props, mode, inField);
  const same = JSON.stringify(a) === JSON.stringify(b);
  if (!same) {
    diffs++;
    console.log("DIFF", kind, JSON.stringify(props), mode);
    for (let i = 0; i < a.length; i++) if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) { console.log("  step", i, SEQ[i - 1], "\n   old", JSON.stringify(a[i]), "\n   new", JSON.stringify(b[i])); break; }
  } else console.log("same", kind, JSON.stringify(props), mode, "final:", JSON.stringify({ v: a.at(-1).value, state: a.at(-1).state, fd: a.at(-1).fd }));
}
console.log(`\nA/B: ${CONFIGS.length} configs × ${SEQ.length} steps, ${diffs} differing`);
console.log("console:", consoleMsgs.filter((m) => !m.includes("Download the React DevTools")).slice(0, 10));
await browser.close();
