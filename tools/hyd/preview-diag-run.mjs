// Runs a COPY of the tree's own qa:journey-preview (cwd = the worktree) with one addition: just before §5 clicks
// "Create the link", it prints every open dialog's inputs, textareas and buttons (value, disabled, aria-hidden, inert)
// and the focused element, and takes a tile. Nothing is written into the tree: the copy lives beside this file.
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
once('await cd.getByRole("button", { name: "Create the link" }).click();', `{
  const diag = await op.evaluate(() => {
    const desc = (el) => el === null ? null : \`\${el.tagName.toLowerCase()}\${el.id ? "#" + el.id : ""}[name=\${el.getAttribute("name") ?? ""}]\`;
    return {
      active: desc(document.activeElement),
      dialogs: [...document.querySelectorAll('[role="dialog"], [role="alertdialog"]')].map((d) => ({
        head: d.outerHTML.slice(0, 160),
        inert: d.closest("[inert]") !== null, hidden: d.closest("[aria-hidden='true']") !== null,
        inputs: [...d.querySelectorAll("input")].map((i) => ({ name: i.name, type: i.type, value: i.value, disabled: i.disabled, readOnly: i.readOnly, ariaHidden: i.getAttribute("aria-hidden"), tabIndex: i.tabIndex, cls: i.className.slice(0, 60) })),
        textareas: [...d.querySelectorAll("textarea")].map((t) => ({ value: t.value, disabled: t.disabled })),
        buttons: [...d.querySelectorAll("button")].map((b) => ({ text: (b.textContent ?? "").trim().slice(0, 40), disabled: b.disabled })),
      })),
    };
  });
  console.log("DIAG §5 before 'Create the link':\\n" + JSON.stringify(diag, null, 1));
  await op.screenshot({ path: \`\${SHOTS}/5-diag-before-create.png\` });
}
await cd.getByRole("button", { name: "Create the link" }).click();`);
const copy = join(HERE, "qa-journey-preview.diag.mjs");
writeFileSync(copy, src);
console.log(`diag copy of ${TREE}/scripts/qa-journey-preview.mjs written: ${copy}`);
await import(pathToFileURL(copy).href);
