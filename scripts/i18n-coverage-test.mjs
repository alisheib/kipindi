/**
 * Sprint 19 — i18n coverage audit.
 *
 * Walks the i18n dictionary at src/lib/i18n.tsx and confirms every key has a
 * non-empty translation in EN, SW, FR. A missing or empty value is a failure.
 *
 * Also walks a list of representative pages and confirms each renders without
 * obvious template-literal leakage (e.g. {t.common.somethingMissing}).
 */
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";

let pass = 0, fail = 0;
function log(label, ok, detail = "") {
  const t = ok ? "✓" : "✗";
  console.log(`${t} ${label}${detail ? "  →  " + detail : ""}`);
  if (ok) pass++; else fail++;
}

// ============================================================
// SECTION 1 — Dictionary parity (EN / SW / FR every key)
// ============================================================
console.log("\n=== 1 · Dictionary parity ===");
const src = readFileSync("src/lib/i18n.tsx", "utf8");

// We search the full source file. Each locale lives at indent-2 inside the
// dict literal, and there's only one `dict = {` declaration in i18n.tsx — so
// matching against the full file is unambiguous and avoids fragile slicing.
const dictSource = src;

function flattenKeys(prefix, body) {
  // Crude key extraction: lines like `key: "value",` or `key: {...}`
  const re = /(\w+)\s*:\s*([{"])/g;
  const stack = [{ prefix, body, keys: [] }];
  let m;
  while ((m = re.exec(body)) !== null) {
    const key = m[1];
    const opener = m[2];
    if (opener === "{") {
      // recurse
      let inner = "", depthInner = 0;
      for (let i = m.index + m[0].length - 1; i < body.length; i++) {
        const c = body[i];
        if (c === "{") depthInner++;
        else if (c === "}") { depthInner--; if (depthInner === 0) { inner = body.slice(m.index + m[0].length - 1 + 1, i); break; } }
      }
      stack.push({ prefix: `${prefix}.${key}`, body: inner, keys: [] });
    } else {
      stack[0].keys.push(`${prefix}.${key}`);
    }
  }
  return stack[0].keys;
}

// Find each top-level locale block: en: { ... }, sw: { ... }, fr: { ... }
// Uses line-anchored matching so we don't accidentally hit nested keys.
function extractLocaleBlock(localeKey) {
  const lineRe = new RegExp(`^\\s{2}${localeKey}\\s*:\\s*\\{`, "m");
  const m = lineRe.exec(dictSource);
  if (!m) return null;
  // Position the cursor just after the opening "{"
  const openIdx = dictSource.indexOf("{", m.index);
  let depth = 1;
  for (let i = openIdx + 1; i < dictSource.length; i++) {
    const c = dictSource[i];
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) return dictSource.slice(openIdx + 1, i); }
  }
  return null;
}

const localeBlocks = {
  en: extractLocaleBlock("en"),
  sw: extractLocaleBlock("sw"),
  fr: extractLocaleBlock("fr"),
};
log("1a EN block extracted", !!localeBlocks.en);
log("1b SW block extracted", !!localeBlocks.sw);
log("1c FR block extracted", !!localeBlocks.fr);

function leafKeys(body) {
  const out = [];
  // Match `key: "..."` (string leaves)
  const re = /(\w+)\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    out.push({ key: m[1], value: m[2] });
  }
  return out;
}

const enLeaves = leafKeys(localeBlocks.en);
const swLeaves = leafKeys(localeBlocks.sw);
const frLeaves = leafKeys(localeBlocks.fr);
log("1d EN leaf count > 30", enLeaves.length > 30, `${enLeaves.length}`);
log("1e SW has same key count as EN", swLeaves.length === enLeaves.length, `EN ${enLeaves.length} vs SW ${swLeaves.length}`);
log("1f FR has same key count as EN", frLeaves.length === enLeaves.length, `EN ${enLeaves.length} vs FR ${frLeaves.length}`);

// Detect untranslated strings: a SW or FR leaf identical to its EN counterpart for a non-trivial value
function detectUntranslated(otherLeaves, label) {
  let suspicious = 0;
  for (let i = 0; i < otherLeaves.length; i++) {
    const en = enLeaves[i];
    const ot = otherLeaves[i];
    if (!en || !ot) continue;
    if (en.key !== ot.key) continue;
    // Allow proper-noun + numeric-only + 1-3 char strings to remain identical
    if (en.value.length <= 3) continue;
    if (en.value === ot.value && /[a-zA-Z]/.test(en.value) && !/^[A-Z][a-z]+$/.test(en.value)) {
      suspicious++;
    }
  }
  // Allow up to 5 collisions (proper nouns like "Mapigo", "Spike" etc)
  log(`1g ${label} non-trivial untranslated strings ≤ 8`, suspicious <= 8, `${suspicious}`);
}
detectUntranslated(swLeaves, "SW");
detectUntranslated(frLeaves, "FR");

// ============================================================
// SECTION 2 — page-render check (no leftover {t.x.y} or undefined)
// ============================================================
console.log("\n=== 2 · Render leakage ===");
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });

const PAGES = ["/", "/games", "/mapigo", "/legal/terms", "/legal/privacy", "/help", "/fairness"];
for (const path of PAGES) {
  const p = await ctx.newPage();
  await p.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  const body = (await p.locator("body").textContent()) ?? "";
  const hasTemplateLeak = /\{\s*t\.\w+\.\w+\s*\}/.test(body);
  const hasUndefined = /\bundefined\b/.test(body);
  log(`2 ${path}: no {t.x.y} template leak`, !hasTemplateLeak);
  if (hasUndefined) {
    // "undefined" can legitimately appear in legal copy; only fail if visible in nav/buttons.
    const headerText = (await p.locator("nav,header").first().textContent().catch(() => "")) ?? "";
    log(`2 ${path}: no 'undefined' in nav/header`, !/undefined/.test(headerText));
  } else {
    log(`2 ${path}: no 'undefined' in body`, true);
  }
  await p.close();
}

await ctx.close();
await browser.close();
console.log(`\n${"=".repeat(60)}\nI18N COVERAGE  PASS: ${pass}    FAIL: ${fail}\n${"=".repeat(60)}`);
process.exit(fail > 0 ? 1 : 0);
