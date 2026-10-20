/**
 * Every static Millionea console page belongs to the single design-gate route
 * population. The census comes from page.tsx files, not a second route list.
 * Dynamic week pages need fixture IDs and are driven by qa:maswali-admin-drive.
 */
import { strict as assert } from "node:assert";
import { mkdtempSync, readFileSync, readdirSync, rmdirSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ADMIN_ROUTES } from "./design-gate/routes.mjs";
import { MUTATIONS } from "./anchors/maswali-admin-route-population.anchors.mjs";

const root = resolve("src/app/admin/maswali");
const routeFile = resolve("scripts/design-gate/routes.mjs");

function staticPages(dir = root, parts = []) {
  const routes = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name === "page.tsx") {
      routes.push(`/admin/maswali${parts.length ? `/${parts.join("/")}` : ""}`);
    }
    if (entry.isDirectory() && !entry.name.startsWith("[")) {
      routes.push(...staticPages(join(dir, entry.name), [...parts, entry.name]));
    }
  }
  return routes.sort();
}

function verdict(routes, pages) {
  const actual = routes.filter((r) => r === "/admin/maswali" || r.startsWith("/admin/maswali/"));
  const seen = new Set();
  const duplicate = actual.filter((r) => seen.has(r) || !seen.add(r));
  return {
    missing: pages.filter((r) => !actual.includes(r)),
    unexpected: actual.filter((r) => !pages.includes(r)),
    duplicate,
  };
}

const pages = staticPages();
assert(pages.includes("/admin/maswali"), "The Maswali admin root page is missing; the census premise is absent.");
const current = verdict(ADMIN_ROUTES, pages);
assert.deepEqual(current, { missing: [], unexpected: [], duplicate: [] },
  `Static Millionea console pages and ADMIN_ROUTES disagree: ${JSON.stringify(current)}`);
console.log(`PASS static Maswali console population: ${pages.length} page(s), each in the one design-gate route list.`);

if (process.argv.includes("--prove-red")) {
  // Undo one addition in an isolated copy of the real route module. The ordinary
  // guard must report the omitted page (and the typo replacing it), proving it
  // reads the value whose presence is meant to protect the design instruments.
  const source = readFileSync(routeFile, "utf8");
  const [plant] = MUTATIONS;
  assert.equal(source.split(plant.from).length - 1, 1, "The route mutation anchor must occur exactly once.");
  const folder = mkdtempSync(join(tmpdir(), "s5-route-red-"));
  const file = join(folder, "routes.mjs");
  try {
    writeFileSync(file, source.replace(plant.from, plant.to));
    const mutated = await import(pathToFileURL(file).href);
    const red = verdict(mutated.ADMIN_ROUTES, pages);
    assert(red.missing.includes("/admin/maswali/pools"), "The guard missed a removed static console page.");
    assert(red.unexpected.includes("/admin/maswali/pools-removed"), "The guard missed a route with no page.");
    console.log("RED proven: removing the Pools page from ADMIN_ROUTES fails the same census.");
  } finally {
    unlinkSync(file);
    rmdirSync(folder);
  }
}
