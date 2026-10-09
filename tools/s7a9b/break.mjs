// node break.mjs <dir> <file-to-break> "<find>" "<replace>" [<extra file to copy> ...]
// Copies the file (and any extras) into <dir> and replaces the ONE occurrence of <find> in the broken copy.
import fs from "node:fs";
import path from "node:path";
const [dir, file, find, replace, ...extras] = process.argv.slice(2);
fs.mkdirSync(dir, { recursive: true });
for (const e of extras) fs.copyFileSync(e, path.join(dir, path.basename(e)));
const text = fs.readFileSync(file, "utf8");
const n = text.split(find).length - 1;
if (n !== 1) {
  console.log(`BREAK NOT APPLIED: ${JSON.stringify(find)} occurs ${n} times in ${file}`);
  process.exit(9);
}
fs.writeFileSync(path.join(dir, path.basename(file)), text.replace(find, replace));
console.log(`broken copy: ${path.join(dir, path.basename(file))} (${JSON.stringify(find)} -> ${JSON.stringify(replace)})`);
