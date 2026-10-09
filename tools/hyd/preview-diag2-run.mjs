// A second diagnostic copy of the tree's own qa:journey-preview (cwd = the worktree), for the intermittent §5 stop: the
// "Create the link" button stays disabled after the drive fills both fields. From the click on "Create a preview link"
// it records, in the page: every [role=dialog] added or removed, every value the label input and the reason textarea
// take (and from which event), every element that takes focus; outside it: every request (RSC refreshes included) and
// every console message. After the fills it waits up to 8 s for the button to arm; if it does not, it dumps all of it.
// Nothing is written into the tree: the copy lives beside this file.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const TREE = process.cwd();
const HERE = dirname(fileURLToPath(import.meta.url));
let src = readFileSync(join(TREE, "scripts/qa-journey-preview.mjs"), "utf8");
const once = (from, to) => {
  const parts = src.split(from);
  if (parts.length !== 2) throw new Error(`anchor found ${parts.length - 1} times, not once: ${from}`);
  src = parts.join(to);
};
once('import { chromium } from "playwright";',
  `import { chromium } from ${JSON.stringify(pathToFileURL(join(TREE, "node_modules/playwright/index.mjs")).href)};`);
// Arm the recorders just before the open click.
once('await op.getByRole("button", { name: "Create a preview link" }).click();', `{
  globalThis.__diagReq = [];
  globalThis.__diagLog = [];
  op.on("request", (r) => { const h = r.headers(); globalThis.__diagReq.push(\`\${Date.now()} \${r.method()} \${r.url().replace(BASE, "")}\${h["rsc"] ? " [RSC]" : ""}\${h["next-action"] ? " [ACTION]" : ""}\`); });
  op.on("console", (m) => globalThis.__diagLog.push(\`\${Date.now()} console.\${m.type()}: \${m.text().slice(0, 200)}\`));
  await op.evaluate(() => {
    const log = (window.__diag = []);
    const t = () => Math.round(performance.now());
    new MutationObserver((ms) => {
      for (const m of ms) {
        for (const n of m.addedNodes) if (n.nodeType === 1 && (n.matches?.('[role="dialog"]') || n.querySelector?.('[role="dialog"]'))) log.push(\`\${t()} dialog ADDED\`);
        for (const n of m.removedNodes) if (n.nodeType === 1 && (n.matches?.('[role="dialog"]') || n.querySelector?.('[role="dialog"]'))) log.push(\`\${t()} dialog REMOVED\`);
      }
    }).observe(document.body, { childList: true, subtree: true });
    for (const type of ["input", "change", "focusin", "click"]) {
      document.addEventListener(type, (e) => {
        const el = e.target;
        const tag = el?.tagName?.toLowerCase?.() ?? "?";
        const v = el && "value" in el ? JSON.stringify(String(el.value).slice(0, 40)) : "";
        log.push(\`\${t()} \${type} \${tag}\${el?.textContent && tag === "button" ? "(" + el.textContent.trim().slice(0, 30) + ")" : ""} \${v} trusted=\${e.isTrusted}\`);
      }, true);
    }
    log.push(\`\${t()} armed\`);
  });
}
await op.getByRole("button", { name: "Create a preview link" }).click();`);
// After the fills: wait for the button to arm; if it does not, dump everything, then let the drive's own click fail as before.
once('await cd.getByRole("button", { name: "Create the link" }).click();', `{
  const armed = await cd.getByRole("button", { name: "Create the link" }).isEnabled({ timeout: 1000 }).catch(() => false)
    || await op.waitForFunction(() => {
      const d = [...document.querySelectorAll('[role="dialog"]')].pop();
      const b = d && [...d.querySelectorAll("button")].find((x) => (x.textContent ?? "").trim() === "Create the link");
      return !!b && !b.disabled;
    }, null, { timeout: 8000 }).then(() => true).catch(() => false);
  const state = await op.evaluate(() => ({
    log: window.__diag ?? [],
    dialogs: [...document.querySelectorAll('[role="dialog"]')].map((d) => ({
      head: d.outerHTML.slice(0, 120),
      inputs: [...d.querySelectorAll("input")].map((i) => ({ value: i.value, disabled: i.disabled })),
      textareas: [...d.querySelectorAll("textarea")].map((x) => ({ value: x.value })),
      create: [...d.querySelectorAll("button")].filter((b) => (b.textContent ?? "").trim() === "Create the link").map((b) => ({ disabled: b.disabled })),
    })),
    active: document.activeElement ? document.activeElement.tagName : null,
  }));
  console.log(\`DIAG2 §5 · the button \${armed ? "ARMED" : "NEVER ARMED"} after the fills\`);
  if (!armed) {
    console.log("DIAG2 page log:\\n" + state.log.join("\\n"));
    console.log("DIAG2 dialogs now: " + JSON.stringify(state.dialogs));
    console.log("DIAG2 active: " + state.active);
    console.log("DIAG2 requests since the open click:\\n" + globalThis.__diagReq.join("\\n"));
    console.log("DIAG2 console since the open click:\\n" + globalThis.__diagLog.join("\\n"));
    await op.screenshot({ path: \`\${SHOTS}/5-diag2-never-armed.png\` });
  } else {
    console.log("DIAG2 page log (armed run):\\n" + state.log.join("\\n"));
  }
}
await cd.getByRole("button", { name: "Create the link" }).click();`);
const copy = join(HERE, "qa-journey-preview.diag2.mjs");
writeFileSync(copy, src);
console.log(`diag2 copy of ${TREE}/scripts/qa-journey-preview.mjs written: ${copy}`);
await import(pathToFileURL(copy).href);
