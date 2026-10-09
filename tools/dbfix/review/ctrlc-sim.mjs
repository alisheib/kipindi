// Simulates the interactive Ctrl-C path with the REAL async-exit-hook and embedded-postgres's stop() shape.
// No signal is sent: process.emit('SIGINT') only calls the listeners. The "postmaster" is a fake EventEmitter.
import { createRequire } from "node:module";
import { EventEmitter } from "node:events";
import { execFileSync } from "node:child_process";
const require = createRequire("F:/kipindi-a8j/node_modules/embedded-postgres/dist/index.js");
const AsyncExitHook = require("async-exit-hook");

const child = new EventEmitter(); // stands in for this.process
const pg = {
  process: child,
  async stop() { // same shape as embedded-postgres stop(): resolves on the child's 'exit'
    if (!this.process) return;
    await new Promise((resolve) => { this.process.on("exit", resolve); });
    this.process = undefined;
  },
};
AsyncExitHook((done) => { Promise.all([pg].map((i) => i.stop())).then(() => done()); }); // embedded-postgres's gracefulShutdown

process.on("exit", (c) => console.log(`process exit code ${c}`));
let stopping = false;
const stopCleanly = async () => {
  await pg.stop().catch(() => {});
  execFileSync("powershell", ["-NoProfile", "-Command", "Start-Sleep -Milliseconds 800; 'sweep ran'"], { encoding: "utf8" }); // stands in for killOwnOrphans
  console.log("sweep finished");
};
const shutdown = async () => {
  if (stopping) return; stopping = true;
  console.log("Stopping...");
  await stopCleanly();
  process.exit(0);
};
process.on("SIGINT", () => void shutdown());
process.emit("SIGINT");
setTimeout(() => child.emit("exit", 1), 50); // the postmaster exits after taskkill
