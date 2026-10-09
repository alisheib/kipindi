// A fake red harness that outlives red:all's timeout and writes nothing in the tree: it stamps a marker file when it
// starts and when it ends, so the runner's behaviour can be read against the clock.
import { appendFileSync } from "node:fs";
const marker = process.argv[2], secs = Number(process.argv[3] ?? 25);
appendFileSync(marker, `start ${Date.now()}\n`);
setTimeout(() => { appendFileSync(marker, `end ${Date.now()}\n`); console.log("1/1 caught"); }, secs * 1000);
