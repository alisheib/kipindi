// The platform lane's sweep (scratch): node sweep.mjs <list> <logdir> <summary> [workers=2] [serial]
//   Runs each npm script of <list> from the lane's tree; one summary line per script
//   (`name rc=N Ns :: last result line`); logs in <logdir>/<name with ':' as '_'>.log.
//   `serial` as the 5th argument runs one at a time (every red twin and every script that writes into the tree).
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync, createWriteStream } from "node:fs";

const [list, logdir, summary, workersArg, mode] = process.argv.slice(2);
const TREE = process.env.TREE || "C:/50pick-ssd/kipindi-mln-fplt";
const workers = mode === "serial" ? 1 : Number(workersArg || 2);
mkdirSync(logdir, { recursive: true });
const names = readFileSync(list, "utf8").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
if (!existsSync(summary)) writeFileSync(summary, "");
console.log(`TREE ${TREE}: ${names.length} to run with ${workers} worker(s)`);
const env = { ...process.env, TEMP: "C:\\50pick-ssd\\tmp", TMP: "C:\\50pick-ssd\\tmp", KP_SCRATCH_PORT: process.env.KP_SCRATCH_PORT || "5489" };
const PICK = /passed|failed|all [0-9]+ checks|FLOOR|NOT MEASURED|ok:|fail:|caught|INCONCLUSIVE|PREMISE|missed|survived/i;

function runOne(name) {
  return new Promise((resolve) => {
    const log = `${logdir}/${name.replace(/:/g, "_")}.log`;
    const out = createWriteStream(log);
    const start = Date.now();
    const child = spawn("npm", ["run", "-s", name], { cwd: TREE, env, shell: true });
    child.stdout.pipe(out, { end: false });
    child.stderr.pipe(out, { end: false });
    const timer = setTimeout(() => { try { spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { shell: true }); } catch { /* none */ } }, Number(process.env.SWEEP_TIMEOUT_MS || 1_500_000));
    child.on("exit", (code) => {
      clearTimeout(timer);
      setTimeout(() => out.end(() => {
        const text = readFileSync(log, "utf8");
        const lines = text.split(/\r?\n/).filter((l) => PICK.test(l));
        const last = (lines.at(-1) ?? "").replace(/\s+/g, " ").slice(0, 220);
        appendFileSync(summary, `${name} rc=${code} ${Math.round((Date.now() - start) / 1000)}s :: ${last}\n`);
        resolve();
      }), 300);
    });
  });
}
let i = 0;
await Promise.all(Array.from({ length: workers }, async () => { while (i < names.length) { const n = names[i++]; await runOne(n); } }));
appendFileSync(summary, "SWEEP DONE\n");
