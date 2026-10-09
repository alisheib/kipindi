// R5-G port · replace each conflict block of a file, in order, with the given text (lines joined with the file's EOL).
// Usage (as a module): resolve(path, [blockText1, blockText2, ...]) — a block's text is an array of lines.
import { readFileSync, writeFileSync } from "node:fs";
export function resolve(P, blocks) {
  const s = readFileSync(P, "utf8");
  const EOL = s.includes("\r\n") ? "\r\n" : "\n";
  const re = /<<<<<<< ours\r?\n[\s\S]*?\r?\n=======\r?\n[\s\S]*?>>>>>>> theirs\r?\n/g;
  const found = s.match(re) ?? [];
  if (found.length !== blocks.length) throw new Error(`${P}: ${found.length} conflict blocks, ${blocks.length} resolutions`);
  let i = 0;
  const out = s.replace(re, () => blocks[i++].join(EOL) + EOL);
  if (/^(<<<<<<<|=======|>>>>>>>)/m.test(out)) throw new Error(`${P}: markers left`);
  writeFileSync(P, out);
  console.log(`${P}: ${found.length} block(s) resolved`);
}
