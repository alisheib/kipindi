// Remove ONLY my own leftover temp dirs. The junction (if any) is unlinked first, non-recursively.
import { lstatSync, rmdirSync, rmSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const TEMP = "C:/Users/asheib/AppData/Local/Temp";
const MINE = ["ac-proof-hKapP2", "contrast-red-COnr5N", "contrast-red-LR4Hpl"];
for (const name of MINE) {
  const dir = join(TEMP, name);
  if (!existsSync(dir)) { console.log(`${name}: already gone`); continue; }
  const link = join(dir, "node_modules");
  if (existsSync(link)) {
    const st = lstatSync(link);
    console.log(`${name}/node_modules: isSymbolicLink=${st.isSymbolicLink()} isDirectory=${st.isDirectory()}`);
    if (!st.isSymbolicLink()) { console.log("  !! not a link — refusing to touch this dir"); continue; }
    rmdirSync(link);          // removes the junction only
  }
  rmSync(dir, { recursive: true, force: true });
  console.log(`${name}: removed (exists now: ${existsSync(dir)})`);
}
console.log("repo node_modules still populated:", readdirSync("F:/kipindi-rot3/node_modules").length > 100);
