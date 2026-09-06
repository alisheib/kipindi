/**
 * THE REQUIRED FIELDS OF `DiscoveryRow`, READ FROM THE TYPE ITSELF.
 *
 * 🔴 WHY THIS EXISTS (E-317, 2026-09-06). `tsconfig.json` includes the `.ts` files under
 * `scripts/` but NOT the `.mts` ones — and every fixture factory in this suite family is `.mts`.
 * So when `DiscoveryRow` gained two REQUIRED fields, `hero-contract.test.mts` went on building
 * rows without them and stayed **green**: the hero only ever asks `matchesStatus(…, "open")`,
 * which reads neither. A fixture that is not a real row, passing because the question was narrow.
 * ⛔ And `discovery.ts` claimed in a comment that "`tsc` names every construction site", which
 * was a false reassurance that stops the next author checking.
 *
 * ⚠️ THE OBVIOUS FIX IS NOT AVAILABLE. Adding `scripts/**` `.mts` to `tsconfig.include` produces
 * **1,267 errors** — measured, not guessed — almost all `TS5097`, because this repo deliberately
 * imports with explicit `.ts` extensions for `tsx`. Turning that on is its own piece of work and
 * would bury the one defect that matters.
 *
 * ⭐ SO THE PROPERTY IS CHECKED DIRECTLY AND AT RUNTIME: parse the field names out of the type
 * declaration, and assert every fixture factory produces all of them. That is narrower than a
 * typechecker and catches exactly the thing a typechecker would have caught here.
 *
 * ⛔ ONE DEFINITION, THREE CONSUMERS (`discovery-contract`, `board-discovery`, `hero-contract`) —
 * a second copy is how two suites start disagreeing about what a complete row is.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * Every REQUIRED top-level key of `DiscoveryRow`. Optional members (`name?:`) are excluded —
 * a fixture omitting one of those is legal, and demanding it would make this guard wrong.
 */
export function requiredDiscoveryRowKeys(): string[] {
  const src = readFileSync(join(ROOT, "src/lib/markets/discovery.ts"), "utf8");
  const start = src.indexOf("export type DiscoveryRow = {");
  if (start < 0) throw new Error("DiscoveryRow declaration not found — this guard is measuring nothing");
  // The declaration ends at the first line that is exactly `};` at column 0.
  const end = src.indexOf("\n};", start);
  if (end < 0) throw new Error("DiscoveryRow declaration is unterminated");
  const body = src.slice(start, end);

  const keys: string[] = [];
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    // Skip comments and the opening line. A member is `name: type;` at one indent level.
    if (!line || line.startsWith("*") || line.startsWith("/*") || line.startsWith("//")) continue;
    const m = /^([A-Za-z_][A-Za-z0-9_]*)(\??):/.exec(line);
    if (!m) continue;
    if (m[2] === "?") continue; // optional — a fixture may legally omit it
    keys.push(m[1]);
  }
  if (keys.length < 8) throw new Error(`only parsed ${keys.length} DiscoveryRow keys — the parser has drifted from the type`);
  return keys;
}

/**
 * Assert a fixture factory builds a COMPLETE row. Returns `[ok, detail]` so each suite reports
 * through its own `ok()`/`check()` and keeps its own numbering.
 */
export function fixtureIsComplete(sample: Record<string, unknown>): [boolean, string] {
  const required = requiredDiscoveryRowKeys();
  const missing = required.filter((k) => !(k in sample));
  return [
    missing.length === 0,
    missing.length ? `missing ${missing.join(", ")} — the type has ${required.length} required fields` : `all ${required.length} required fields present`,
  ];
}
