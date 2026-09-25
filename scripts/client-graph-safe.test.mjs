/**
 * NO CLIENT-REACHABLE MODULE MAY REACH THE PRISMA CLIENT THROUGH ITS IMPORT GRAPH.
 *
 *   npm run test:client-graph-safe
 *
 * ⛔ WHAT THIS EXISTS TO STOP (L17, ruling 526), measured on `main` 2026-09-20. `src/lib/utils.ts` is imported by
 * 216 files, many of them `"use client"` components, and it imported `getPlatformTimezone` from
 * `@/lib/server/platform-config`. That module imports `./config-store`, which imports `./prisma`
 * (`config-store.ts:11`), as does `./audit` (`audit.ts:40`). So a client component's dependency graph ran all the
 * way to the Prisma client, and the ONLY thing keeping every model name out of a public chunk was the bundler's
 * tree-shaking — a property of the build, not of the source.
 *
 * ⭐ AND THE EXISTING GUARD RUNS TOO RARELY TO DEFEND IT. `verify:house-bot-bundle` inspects the REAL built
 * artefact, which is stronger evidence — but only at a commit close and at REL-0. A refactor between two closes
 * (a re-export, a side-effecting import, anything that defeats tree-shaking) ships the names and nothing goes red
 * until the next close. Ruling 526: "a latent disclosure whose only defence is a bundler's current behaviour is
 * not defended." This is the cheap check that runs every time, beside the expensive one that runs rarely.
 *
 * ⛔ WHAT IT DOES NOT CLAIM. It walks the SOURCE graph, not the bundle. A module it calls clean can still be
 * pulled in by a path this walker cannot see (dynamic import, a barrel re-export it fails to resolve). It is a
 * ratchet against the obvious regression, not a substitute for the artefact check. §0 proves the walker works at
 * all before any verdict is read — a graph walker that silently resolves nothing reports everything as clean.
 */
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve as pres } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
let pass = 0;
const failures = [];
const ok = (l, c, x = "") => { c ? pass++ : failures.push((l + " " + x).trim()); console.log("  " + (c ? "\u2713" : "\u2717") + " " + l + (x ? " " + x : "")); };

const resolveSpec = (from, spec) => {
  let p = spec.startsWith("@/") ? join(SRC, spec.slice(2)) : spec.startsWith(".") ? pres(dirname(from), spec) : null;
  if (!p) return null;
  for (const e of [".ts", ".tsx", "/index.ts", "/index.tsx", ""]) {
    const c = p + e;
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
};

/** Walk the VALUE-import graph. `import type` is erased at build and is deliberately not followed. */
const reaches = (startRel, targetRe) => {
  const start = join(SRC, startRel);
  if (!existsSync(start)) return { hit: null, walked: 0, missing: true };
  const seen = new Set(); const stack = [start];
  while (stack.length) {
    const f = stack.pop(); if (seen.has(f)) continue; seen.add(f);
    if (targetRe.test(f.split("\\").join("/"))) return { hit: f, walked: seen.size };
    let s; try { s = readFileSync(f, "utf8"); } catch { continue; }
    for (const m of s.matchAll(/^[ \t]*import\s+([^;]*?)from\s+["']([^"']+)["']/gm)) {
      if (/^\s*type\b/.test(m[1])) continue;
      const r = resolveSpec(f, m[2]); if (r) stack.push(r);
    }
  }
  return { hit: null, walked: seen.size };
};

const PRISMA = /lib\/server\/prisma\.ts$/;

console.log("\n[client-graph-safe] \u00a70 CONTROL \u00b7 the walker works, in BOTH directions");
{
  /**
   * ⛔ THIS SECTION IS NOT CEREMONY. The first version of this walker was written as a shell one-liner whose
   * escaping was mangled; it reported "not reachable" for `platform-config.ts`, a module that demonstrably
   * reaches prisma in two hops. A graph walker that resolves nothing calls the whole codebase clean, and its
   * output is indistinguishable from a real pass. So a positive control runs first, every time.
   */
  const pos = reaches("lib/server/config-store.ts", PRISMA);
  ok("\u00a70 POSITIVE \u00b7 config-store.ts REACHES prisma (it imports it directly)", !!pos.hit, "walked " + pos.walked);
  const neg = reaches("lib/platform-timezone.ts", PRISMA);
  ok("\u00a70 NEGATIVE \u00b7 a pure client-safe module does NOT", !neg.hit && !neg.missing, neg.hit || "clean");
  const srv = reaches("lib/server/platform-config.ts", PRISMA);
  ok("\u00a70 POSITIVE \u00b7 the server config module still reaches it, so the target is live", !!srv.hit, "walked " + srv.walked);
}

console.log("\n[client-graph-safe] \u00a71 client-reachable modules stay clear of the Prisma client");
{
  /**
   * The pinned set. `utils.ts` is the one the defect ran through (216 importers, many `"use client"`); the others
   * are the same shape — broadly-imported helpers with no business touching a database client.
   */
  const PINNED = [
    "lib/utils.ts",
    "lib/platform-timezone.ts",
    "lib/display-label.ts",
    "lib/status-tone.ts",
    // ⭐ ADDED 2026-09-25. Both are imported by `phone-input.tsx`, which is `"use client"`, and both
    // are also imported by server modules (`sms.ts`, `selcom.ts`, `wallet/withdraw/page.tsx`) — the
    // exact double-life this ratchet exists to police. They were NOT in this list, so the guard had
    // no opinion about them at all: a module can be client-reachable for months and this suite stay
    // green because it only ever walks what is named here.
    "lib/phone-normalize.ts",
    "lib/tz-msisdn.ts",
  ];
  const offenders = [];
  let checked = 0;
  for (const rel of PINNED) {
    const r = reaches(rel, PRISMA);
    if (r.missing) continue;
    checked++;
    if (r.hit) offenders.push(rel + " -> " + r.hit.split("\\").join("/").replace(SRC.split("\\").join("/"), "src"));
  }
  ok("\u00a71 ratchet \u00b7 every pinned module exists and was walked", checked >= 2, checked + " of " + PINNED.length);
  ok("\u00a71 no pinned client-reachable module reaches the Prisma client", offenders.length === 0, offenders.join(" | "));
}

console.log("\n" + (failures.length === 0 ? "ALL PASS" : "FAILURES") + " \u2014 client-graph-safe: " + pass + " passed, " + failures.length + " failed");
if (failures.length) { for (const f of failures) console.log("  \u00b7 " + f); process.exit(1); }
