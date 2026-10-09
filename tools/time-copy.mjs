import { cpSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const cwd = "F:/kipindi-rot3";
const TMP = mkdtempSync(join(tmpdir(), "copy-time-"));
for (let i = 0; i < 3; i++) {
  const t0 = Date.now();
  const root = join(TMP, `root-${i}`);
  cpSync(join(cwd, "src"), join(root, "src"), { recursive: true, filter: (p) => statSync(p).isDirectory() || /\.tsx?$/.test(p) });
  const t1 = Date.now();
  rmSync(root, { recursive: true, force: true });
  console.log(`copy ${t1 - t0} ms, rm ${Date.now() - t1} ms`);
}
rmSync(TMP, { recursive: true, force: true });
