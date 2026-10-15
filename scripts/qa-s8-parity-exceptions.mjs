/**
 * S8 narrow parity exception verifier.
 *
 * This does not replace the strict v4 comparison. It records the exact
 * baseline/current decoded values for later approved visual changes and
 * rejects any change outside that frozen list.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const [mode, basePath, currentPath, ledgerPath] = process.argv.slice(2);
if (!["--draft", "--verify", "--prove-red"].includes(mode) || !basePath || !currentPath || !ledgerPath) {
  throw new Error("usage: node qa-s8-parity-exceptions.mjs --draft|--verify|--prove-red BASE CURRENT LEDGER");
}
const read = path => JSON.parse(readFileSync(path, "utf8"));
const baseline = read(basePath), current = read(currentPath);
const tableNames = ["cells", "sell", "book", "question"];
const population = { cells: 224, sell: 8, book: 44, question: 56 };
const hash = value => createHash("sha256").update(String(value)).digest("hex");
const fail = message => { throw new Error(message); };
const sameKeys = (a, b) => a.length === b.length && a.every((value, i) => value === b[i]);
const keys = object => Object.keys(object ?? {}).sort();
const nl = "\n";

function fieldsOf(cell, store) {
  const fields = {
    status: String(cell.status),
    landed: String(cell.landed),
    overlays: (cell.overlays ?? []).join(nl),
    journey: (cell.journey ?? []).join(","),
    raw: cell.raw ? `${cell.raw.shell ? "shell" : "no shell"} · ${cell.raw.trace.join(",")}` : "(unread)",
    pageErrors: (cell.pageErrors ?? []).join(nl),
    footerPaddingBottom: String(cell.footerPaddingBottom),
    scrollPaddingBottom: String(cell.scrollPaddingBottom),
  };
  for (const [name, region] of Object.entries(cell.regions ?? {})) {
    fields[`regions.${name}.count`] = String(region.count);
    fields[`regions.${name}.html`] = region.html ? store[region.html] ?? fail(`missing HTML blob ${region.html}`) : "";
    fields[`regions.${name}.layout`] = region.layout ? store[region.layout] ?? fail(`missing layout blob ${region.layout}`) : "";
  }
  // The strict driver's 4.4f check compares the Sell strip and button at first
  // paint, while every script is held. Preserve that separate surface here.
  if (cell.served) {
    if (cell.served.error) fail(`Sell first paint was not captured: ${cell.served.error}`);
    for (const [name, region] of Object.entries(cell.served.regions ?? {})) {
      fields[`served.${name}.count`] = String(region.count);
      fields[`served.${name}.html`] = region.html ? store[region.html] ?? fail(`missing served HTML blob ${region.html}`) : "";
      fields[`served.${name}.layout`] = region.layout ? store[region.layout] ?? fail(`missing served layout blob ${region.layout}`) : "";
    }
  }
  if (cell.notFound) {
    fields["notFound.title"] = cell.notFound.title;
    fields["notFound.robots"] = cell.notFound.robots.join(nl);
    fields["notFound.main"] = cell.notFound.main;
  }
  if ("head" in cell) fields.head = cell.head ? store[cell.head] ?? `(missing blob ${cell.head})` : "(unread)";
  return fields;
}

function fontOnlyLayout(before, after, baseStore, curStore) {
  const a = before.split(nl), b = after.split(nl);
  if (a.length !== b.length) return false;
  let changed = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue;
    const x = /^(.*?) ([^ ]+) ([a-f0-9]{12})$/.exec(a[i]);
    const y = /^(.*?) ([^ ]+) ([a-f0-9]{12})$/.exec(b[i]);
    if (!x || !y || x[1] !== y[1] || x[2] !== y[2]) return false;
    const props = sig => Object.fromEntries(String(sig ?? "").split(nl).filter(Boolean).map(line => {
      const colon = line.indexOf(":");
      return [line.slice(0, colon), line.slice(colon + 1)];
    }));
    const oldProps = props(baseStore[x[3]]), newProps = props(curStore[y[3]]);
    if (Object.keys({ ...oldProps, ...newProps }).filter(key => oldProps[key] !== newProps[key]).join(",") !== "font-family") return false;
    changed++;
  }
  return changed > 0;
}

function classOf(table, cell, field, before, after, baseStore, curStore) {
  if (!/^(regions|served)\.[^.]+\.(html|layout)$/.test(field)) return null;
  const fontFields = table === "cells" && (field === "regions.rail.layout" || field === "regions.main.layout")
    || table === "sell" && ["regions.strip.layout", "regions.button.layout", "served.strip.layout", "served.button.layout"].includes(field)
    || table === "book" && field === "regions.ticker.layout";
  if (fontFields) return fontOnlyLayout(before, after, baseStore, curStore) ? "vendored-font-css" : null;
  if (table === "cells") {
    if (field.startsWith("regions.header.")) return "classic-header";
    if (field.startsWith("regions.footer.")) return "classic-footer";
  }
  if (table === "sell" && cell.includes("/markets/:held") && field.startsWith("regions.confirm.")) return "sell-confirm-notice-and-modal-css";
  if (table === "book") {
    if (field.startsWith("regions.similar.")) return "similar-chip";
    if (field.startsWith("regions.main.")) {
      for (const route of ["/live", "/results", "/watchlist", "/markets", "/"]) {
        if (cell.endsWith(route)) return `classic-book-${route === "/" ? "home" : route.slice(1)}`;
      }
    }
  }
  if (table === "question") {
    if (field.startsWith("regions.main.")) return "question-main";
    if (field.startsWith("regions.panel.")) return "question-panel";
    if (field.startsWith("regions.holder.")) return "question-holder";
  }
  return null;
}

const classes = {
  "classic-header": { findings: ["F03", "F13", "F23", "vendored-font-css"], source: ["src/components/layout/top-app-bar.tsx", "src/app/fonts.css", "docs/qa/visual-audit-20261015.md"] },
  "classic-footer": { findings: ["F09", "F21", "F26", "F30", "vendored-font-css"], source: ["src/components/layout/public-footer.tsx", "src/app/fonts.css", "docs/qa/visual-audit-20261015.md"] },
  "vendored-font-css": { findings: ["61f8b918c", "a38863edc"], source: ["src/app/fonts.css", "public/fonts/README.md", "scripts/vendored-fonts.test.mjs"] },
  "sell-confirm-notice-and-modal-css": { findings: ["F15", "F15b", "048449961"], source: ["src/components/ui/callout.tsx", "src/components/ui/modal.tsx", "src/app/motion.css", "docs/qa/visual-audit-20261015.md"] },
  "similar-chip": { findings: ["F38", "S12-WP5"], source: ["src/components/ui/chip.tsx", "src/lib/i18n-dict.ts", "docs/qa/visual-audit-20261015.md"] },
  "classic-book-home": { findings: ["F17", "F38", "F39", "F52", "F53"], source: ["src/app/globals.css", "src/app/page.tsx", "docs/qa/visual-audit-20261015.md"] },
  "classic-book-markets": { findings: ["F02", "F05", "F06", "F11", "F31", "F33", "F38", "F39"], source: ["src/app/markets/page.tsx", "src/components/markets/market-card.tsx", "docs/qa/visual-audit-20261015.md"] },
  "classic-book-live": { findings: ["F02", "F05", "F38", "F39", "0b1dc4991"], source: ["src/app/live/featured-contest.tsx", "src/app/live/pulse-grid.tsx", "docs/qa/visual-audit-20261015.md"] },
  "classic-book-results": { findings: ["F02", "F05", "F11", "F31", "F38", "F39"], source: ["src/app/results/page.tsx", "src/components/markets/market-card.tsx", "docs/qa/visual-audit-20261015.md"] },
  "classic-book-watchlist": { findings: ["F02", "F05", "F11", "F38", "F39"], source: ["src/app/watchlist/page.tsx", "src/components/markets/market-card.tsx", "docs/qa/visual-audit-20261015.md"] },
  "question-main": { findings: ["F10", "F11", "F33", "F38", "F40", "F42", "F53", "S12-WP2", "S12-WP3"], source: ["src/app/markets/[id]/page.tsx", "src/components/markets/countdown.tsx", "docs/qa/visual-audit-20261015.md"] },
  "question-panel": { findings: ["F15", "F15b", "S12-WP3"], source: ["src/components/ui/callout.tsx", "src/app/markets/[id]/page.tsx", "docs/qa/visual-audit-20261015.md"] },
  "question-holder": { findings: ["S12-WP3"], source: ["src/app/markets/[id]/page.tsx", "docs/design-system/v5-2026-09-29-simplified-journey/S12-PLAN.md"] },
};

function inventory(a, b) {
  const differences = {}, unclassified = [], counts = {};
  if (a.kind !== b.kind || a.version !== b.version || JSON.stringify(a.matrix) !== JSON.stringify(b.matrix)) fail("capture kind/version/matrix differs from v4 baseline");
  for (const table of tableNames) {
    const aKeys = keys(a[table]), bKeys = keys(b[table]);
    if (!sameKeys(aKeys, bKeys) || aKeys.length !== population[table]) fail(`${table} population differs or misses ${population[table]} cells`);
    counts[table] = aKeys.length;
    for (const cellKey of aKeys) {
      if (a[table][cellKey].error || b[table][cellKey].error) fail(`${table}|${cellKey} has a capture error`);
      const left = fieldsOf(a[table][cellKey], a.blobs), right = fieldsOf(b[table][cellKey], b.blobs);
      for (const field of [...new Set([...keys(left), ...keys(right)])].sort()) {
        const before = left[field] ?? "(absent)", after = right[field] ?? "(absent)";
        if (before === after) continue;
        const key = `${table}|${cellKey}|${field}`;
        const category = classOf(table, cellKey, field, before, after, a.blobs, b.blobs);
        const entry = { baselineSha256: hash(before), currentSha256: hash(after), category };
        differences[key] = entry;
        if (!category) unclassified.push(key);
      }
    }
  }
  return { differences, unclassified, counts };
}

function verify(a, b, ledger) {
  if (a.base?.sha !== ledger.baselineCommit) fail("baseline source commit differs");
  if (b.base?.sha !== ledger.currentCommit) fail("current source commit differs");
  const { differences, unclassified, counts } = inventory(a, b);
  if (unclassified.length) fail(`unclassified changed fields: ${unclassified.slice(0, 8).join("; ")}`);
  const actualKeys = keys(differences), allowedKeys = keys(ledger.exceptions);
  if (!sameKeys(actualKeys, allowedKeys)) {
    const missing = actualKeys.filter(k => !ledger.exceptions[k]), gone = allowedKeys.filter(k => !differences[k]);
    fail(`exception key set differs: ${missing.length} unapproved, ${gone.length} vanished; first ${missing[0] ?? gone[0]}`);
  }
  for (const key of actualKeys) {
    const got = differences[key], allowed = ledger.exceptions[key];
    if (got.baselineSha256 !== allowed.baselineSha256 || got.currentSha256 !== allowed.currentSha256 || got.category !== allowed.category || !classes[allowed.category]) {
      fail(`exact decoded value/category changed: ${key}`);
    }
  }
  if (!sameKeys(keys(counts), keys(ledger.population)) || Object.entries(counts).some(([key, value]) => value !== ledger.population[key])) fail("population metadata differs");
  return { cells: counts, exceptions: actualKeys.length, byCategory: Object.fromEntries(keys(classes).map(category => [category, actualKeys.filter(key => differences[key].category === category).length])) };
}

if (mode === "--draft") {
  const { differences, unclassified, counts } = inventory(baseline, current);
  if (unclassified.length) fail(`refusing draft with ${unclassified.length} unclassified fields: ${unclassified.slice(0, 12).join("; ")}`);
  const ledger = {
    kind: "s8-classic-parity-exact-exception-ledger",
    note: "Engineering classification only. S8-PLAN WP12 strict zero-diff v4 gate remains red pending owner supersession.",
    baselineCommit: baseline.base.sha,
    currentCommit: current.base.sha,
    population: counts,
    classes,
    exceptions: differences,
  };
  writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2) + nl);
  console.log(JSON.stringify(verify(baseline, current, ledger), null, 2));
} else {
  const ledger = read(ledgerPath);
  const result = verify(baseline, current, ledger);
  if (mode === "--prove-red") {
    const approved = keys(ledger.exceptions)[0];
    if (!approved) fail("no approved exception to prove red");
    const [table, ...parts] = approved.split("|");
    const field = parts.pop(), cellKey = parts.join("|");
    const tamperedApproved = structuredClone(current);
    if (!field.endsWith(".html")) fail("first exception is not HTML; choose an HTML exception for red plant");
    const region = field.split(".")[1], blobKey = tamperedApproved[table][cellKey].regions[region].html;
    tamperedApproved.blobs[blobKey] += "<!-- planted semantic drift -->";
    let approvedRejected = false, untouchedRejected = false, fontGeometryRejected = false;
    try { verify(baseline, tamperedApproved, ledger); }
    catch (error) { approvedRejected = String(error.message).includes("exact decoded value/category changed"); }
    const tamperedUntouched = structuredClone(current);
    tamperedUntouched.cells[keys(tamperedUntouched.cells)[0]].status = 599;
    try { verify(baseline, tamperedUntouched, ledger); }
    catch (error) { untouchedRejected = String(error.message).includes("unclassified changed fields"); }
    const tamperedFont = structuredClone(current);
    const rail = tamperedFont.cells["guest|en|360|/"].regions.rail;
    if (ledger.exceptions["cells|guest|en|360|/|regions.rail.layout"]?.category !== "vendored-font-css") fail("the font-only rail red control is not pinned");
    const original = tamperedFont.blobs[rail.layout];
    tamperedFont.blobs[rail.layout] = original.replace("nav 0,0,360x65", "nav 0,0,359x65");
    if (tamperedFont.blobs[rail.layout] === original) fail("the font geometry plant did not change its target");
    try { verify(baseline, tamperedFont, ledger); }
    catch (error) { fontGeometryRejected = String(error.message).includes("unclassified changed fields"); }
    if (!approvedRejected || !untouchedRejected || !fontGeometryRejected) fail(`red controls failed: approved-value=${approvedRejected}, new-field=${untouchedRejected}, font-geometry=${fontGeometryRejected}`);
    console.log(`PASS exact exception red controls: approved HTML drift, new status drift, and font-only geometry drift rejected; ${result.exceptions} exact differences verified`);
  } else {
    console.log(JSON.stringify(result, null, 2));
    console.log("Formal S8-PLAN WP12 zero-difference parity verdict remains red.");
  }
}
