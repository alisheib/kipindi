// Ad hoc safety test: does fs.rmdirSync(junction) remove ONLY the link and leave the target's files alone?
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmdirSync, existsSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const base = mkdtempSync(join(tmpdir(), "junction-test-"));
const target = join(base, "target");
const holder = join(base, "holder");
mkdirSync(target); mkdirSync(holder);
writeFileSync(join(target, "precious.txt"), "do not delete");
mkdirSync(join(target, "sub")); writeFileSync(join(target, "sub", "deep.txt"), "deep");
const link = join(holder, "node_modules");
symlinkSync(target, link, "junction");
console.log("link visible contents:", readdirSync(link).join(","));
rmdirSync(link);   // non-recursive: removes the link only
console.log("link gone:", !existsSync(link));
console.log("target intact:", existsSync(join(target, "precious.txt")), existsSync(join(target, "sub", "deep.txt")));
rmSync(base, { recursive: true, force: true });
console.log("cleaned:", !existsSync(base));
