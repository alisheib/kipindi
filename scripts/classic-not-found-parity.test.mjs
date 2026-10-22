/**
 * Source guard for S5 VIS-P P14's exact classic 404 copy transition. With two
 * captured v4 paths, also recompare every field from the saved browser runs.
 * No server or browser is opened; the accepted live-main baseline stays intact.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { CLASSIC_NOT_FOUND_EXPECTED } from "./lib/classic-not-found-expected.mjs";

const NL = "\n";
const own = fileURLToPath(new URL("qa-classic-shell-parity.mjs", import.meta.url));
const harness = readFileSync(own, "utf8");
let passed = 0, failed = 0;
function check(name, condition, detail = "") {
  console.log(`  ${condition ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  (condition ? passed++ : failed++);
}

const routeOf = (key) => key.split("|").slice(3).join("|");
function named(route, field, before, after) {
  return CLASSIC_NOT_FOUND_EXPECTED.find((e) =>
    e.field === field && e.routes.includes(route) && e.from === before && e.to === after)?.id ?? null;
}

check("P14 entries are used by the live parity matcher",
  harness.includes('import { CLASSIC_NOT_FOUND_EXPECTED } from "./lib/classic-not-found-expected.mjs";')
    && harness.includes("EXPECTED_DIFFS.push(...CLASSIC_NOT_FOUND_EXPECTED);"));
check("P14 has exactly one exact whole-text transition per classic locale",
  CLASSIC_NOT_FOUND_EXPECTED.length === 2
    && CLASSIC_NOT_FOUND_EXPECTED.every((e) => e.field === "notFound.main"
      && e.cells === 32 && e.routes.join("|") === "/account|/kp-parity-no-such-page"
      && typeof e.from === "string" && typeof e.to === "string" && e.from !== e.to));
for (const e of CLASSIC_NOT_FOUND_EXPECTED) {
  check(`${e.id} matches both named routes`, e.routes.every((route) => named(route, e.field, e.from, e.to) === e.id));
  check(`${e.id} rejects a third route`, named("/markets", e.field, e.from, e.to) === null);
  check(`${e.id} rejects neighboring text`, named("/account", e.field, e.from, `${e.to} extra`) === null);
  check(`${e.id} rejects a different field`, named("/account", "notFound.title", e.from, e.to) === null);
  const other = CLASSIC_NOT_FOUND_EXPECTED.find((entry) => entry !== e);
  check(`${e.id} rejects the other locale`, named("/account", e.field, e.from, other.to) === null);
}

/** The same compared fields and blob dereferences as fieldsOf in the browser harness. */
function fieldsOf(cell, store) {
  const f = {
    status: String(cell.status), landed: String(cell.landed),
    overlays: (cell.overlays ?? []).join(NL), journey: (cell.journey ?? []).join(","),
    raw: cell.raw ? `${cell.raw.shell ? "shell" : "no shell"} · ${cell.raw.trace.join(",")}` : "(unread)",
    pageErrors: (cell.pageErrors ?? []).join(NL),
    footerPaddingBottom: String(cell.footerPaddingBottom),
    scrollPaddingBottom: String(cell.scrollPaddingBottom),
  };
  for (const [name, region] of Object.entries(cell.regions ?? {})) {
    f[`regions.${name}.count`] = String(region.count);
    f[`regions.${name}.html`] = region.html ? store[region.html] ?? `(missing blob ${region.html})` : "";
    f[`regions.${name}.layout`] = region.layout ? store[region.layout] ?? `(missing blob ${region.layout})` : "";
  }
  if (cell.notFound) {
    f["notFound.title"] = cell.notFound.title;
    f["notFound.robots"] = cell.notFound.robots.join(NL);
    f["notFound.main"] = cell.notFound.main;
  }
  if ("head" in cell) f.head = cell.head ? store[cell.head] ?? `(missing blob ${cell.head})` : "(unread)";
  return f;
}

function compareCaptures(base, current) {
  const hits = new Map(CLASSIC_NOT_FOUND_EXPECTED.map((e) => [e.id, 0]));
  const unexpected = [];
  for (const section of ["cells", "sell", "book", "question"]) {
    const oldKeys = Object.keys(base[section] ?? {}).sort();
    const newKeys = Object.keys(current[section] ?? {}).sort();
    if (JSON.stringify(oldKeys) !== JSON.stringify(newKeys)) {
      unexpected.push(`${section} population ${oldKeys.length} → ${newKeys.length}`);
      continue;
    }
    for (const key of oldKeys) {
      const before = fieldsOf(base[section][key], base.blobs);
      const after = fieldsOf(current[section][key], current.blobs);
      for (const field of new Set([...Object.keys(before), ...Object.keys(after)])) {
        const was = before[field] ?? "(absent)", now = after[field] ?? "(absent)";
        if (was === now) continue;
        const id = section === "cells" ? named(routeOf(key), field, was, now) : null;
        if (id) hits.set(id, hits.get(id) + 1);
        else unexpected.push(`${section} ${key} ${field}`);
      }
      // The rendered Sell first paint and question mask data are additional
      // strict fields in these saved captures; the two runs kept them equal.
      if ((section === "sell" || section === "question")
        && JSON.stringify(base[section][key]) !== JSON.stringify(current[section][key])) {
        unexpected.push(`${section} ${key} additional capture field`);
      }
    }
  }
  const missing = CLASSIC_NOT_FOUND_EXPECTED.filter((e) => hits.get(e.id) !== e.cells)
    .map((e) => `${e.id} ${hits.get(e.id)}/${e.cells}`);
  return { hits, unexpected, missing };
}

const paths = process.argv.slice(2);
if (paths.length !== 0 && paths.length !== 2) {
  console.error("usage: node scripts/classic-not-found-parity.test.mjs [accepted-baseline.json compare-capture.current.json]");
  process.exit(2);
}
if (paths.length === 2) {
  const [base, current] = paths.map((path) => JSON.parse(readFileSync(path, "utf8")));
  check("saved captures have accepted baseline and compare roles, v4, and named commits",
    base.role === "baseline" && base.rejected === false && current.role === "compare-capture"
      && base.kind === current.kind && base.version === 4 && current.version === 4
      && /^[0-9a-f]{40}$/.test(base.base?.sha ?? "") && /^[0-9a-f]{40}$/.test(current.base?.sha ?? "")
      && base.base.sha !== current.base.sha,
    `${base.base?.sha?.slice(0, 8)} → ${current.base?.sha?.slice(0, 8)}`);
  const population = { cells: 224, sell: 8, book: 44, question: 56 };
  check("saved captures retain the complete error-free matrix, Sell, book and question populations",
    [base, current].every((capture) => Object.entries(population).every(([section, count]) =>
      Object.keys(capture[section] ?? {}).length === count
        && Object.values(capture[section]).every((cell) => !cell.error))));
  const result = compareCaptures(base, current);
  check("saved full captures differ only in 64 exact named 404 text fields",
    result.unexpected.length === 0 && result.missing.length === 0,
    [...result.hits].map(([id, n]) => `${id} ${n}`)
      .concat(result.unexpected.slice(0, 3), result.missing).join(" · "));

  const key = "guest|en|360|/account";
  const altered = (patch) => ({ ...current, cells: { ...current.cells,
    [key]: { ...current.cells[key], ...patch },
  } });
  const text = current.cells[key].notFound.main;
  const textMutation = altered({ notFound: { ...current.cells[key].notFound, main: `${text} extra` } });
  check("a word outside the exact 404 transition fails", compareCaptures(base, textMutation).unexpected.length > 0);
  const fieldMutation = altered({ status: 418 });
  check("a changed HTTP status beside the hint fails", compareCaptures(base, fieldMutation).unexpected.length > 0);
  const partial = altered({ notFound: { ...current.cells[key].notFound, main: base.cells[key].notFound.main } });
  check("one missing locale-route-width-viewer cell fails the 32-cell census", compareCaptures(base, partial).missing.length > 0);
  const bookKey = Object.keys(current.book)[0];
  const changedBook = { ...current, book: { ...current.book,
    [bookKey]: { ...current.book[bookKey], status: 418 },
  } };
  check("a changed book field still fails", compareCaptures(base, changedBook).unexpected.length > 0);
}

console.log(`\n${passed}/${passed + failed} passed — classic 404 named transition${paths.length ? " and saved full capture replay" : " source guard"}`);
process.exit(failed ? 1 : 0);
