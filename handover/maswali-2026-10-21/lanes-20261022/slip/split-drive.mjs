// split-drive.mjs <out> — writes the multi-slip drive as it stands at commit 12: the working tree's drive with the stamp's
// door read back as a BUTTON (the Link arrives in commit 13). Refuses unless each replaced text is found exactly once.
import { readFileSync, writeFileSync } from "node:fs";

const REL = "scripts/maswali-multi-slip-drive.mjs";
const src = readFileSync(REL, "utf8").replace(/\r\n/g, "\n");
const swaps = [
  [`  // Round 2 (the lead's ruling): the door is the kit's Link to the list (\`primaryHref\`), so it is found as a link — with the
  // list's own address — and never as a button.
  ok("the receipt has one door to the player's ticket list — a link to it",
    await receipt.getByRole("link", { name: "Tazama tiketi" }).count() === 1 && await receipt.getByRole("button", { name: "Tazama tiketi" }).count() === 0
      && await receipt.getByRole("link", { name: "Tazama tiketi" }).getAttribute("href") === "/millionea/tickets");`,
   `  ok("the receipt has one door to the player's ticket list", await receipt.getByRole("button", { name: "Tazama tiketi" }).count() === 1);`],
  [`  await receipt.getByRole("link", { name: "Tazama tiketi" }).click();`, `  await receipt.getByRole("button", { name: "Tazama tiketi" }).click();`],
];
let out = src;
for (const [from, to] of swaps) {
  const n = out.split(from).length - 1;
  if (n !== 1) throw new Error(`PREMISE ABSENT — found ${n} times: ${from.slice(0, 60)}`);
  out = out.replace(from, to);
}
writeFileSync(process.argv[2], out, "utf8");
console.log(`wrote ${process.argv[2]} (${out.length} chars)`);
