const fs = require("fs");
const log = (s) => fs.appendFileSync(__dirname + "/epipe-" + process.argv[2] + ".txt", s + "\n");
process.on("exit", (c) => log("exit handler, code " + c));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function main() {
  try { log("mutated"); await sleep(1500); console.log("a line after the reader closed"); await sleep(500); log("after write"); }
  finally { log("finally ran"); }
}
if (process.argv[2] === "async") main();
else { // sync body: write, then busy-wait, then finally
  try { log("mutated"); Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1500); console.log("a line after the reader closed"); log("after write"); }
  finally { log("finally ran"); }
}
