/**
 * WHAT A PLAYER'S PAGE CAN PRINT — the one print measure, and the one player-rendered population.
 *
 * ⛔ WHY THIS MODULE EXISTS (Commit 6, 2026-09-20). `test:house-bot-reports` 0.198.1 walks the WHOLE player population —
 * every file under `src/app/` outside `admin/` and under `src/components/` outside `admin/`, 400-plus files — and proves
 * none of them IMPORTS a house read module. Beside it, 0.198.3 proves no house word is PRINTED — over exactly two files
 * (`PLAYER_SURFACE_FILES`: the resolution panel and the public market page). The two claims wear the same section number
 * and have populations three orders of magnitude apart, and nothing else static reads the rest: `test:house-bot-disclosure`
 * §1 walks the CLIENT import graph and a server component is not in it, and `verify:house-bot-bundle` reads a real build,
 * which needs `npx next build` and (until Commit 6) ran in no pipeline at all. A house sentence typed as JSX text into
 * `src/app/legal/rules/_content-up-down.tsx`, the home page or the leaderboard was therefore held by NOTHING between
 * builds. §5.2 of the disclosure suite closes that, over this population, with this measure.
 *
 * ⛔ AND WHY THE MEASURE IS NOT COPIED. `house-bot-reports-cases.mts` RUNS its cases when imported (the two-store child
 * loads it), so a pure suite cannot import it; and a second copy of an absence measure is the defect ruling 175's header
 * records — the three absence proofs that each wrote their own word pattern drifted until two guards disagreed about the
 * same file. So the body moved HERE and both consumers import it.
 *
 * Pure: `typescript` and `node:fs` only. No database, no build, no server module.
 */
import ts from "typescript";
import { srcFiles } from "./tracked-files.mts";

/** One file parsed as source. JSX is always on: a `.ts` file with angle brackets is not this repo's shape. */
function parse(file: string, code: string): ts.SourceFile {
  return ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
}
function walkTree(sf: ts.SourceFile, visit: (n: ts.Node) => void): void {
  const go = (n: ts.Node) => { visit(n); n.forEachChild(go); };
  sf.forEachChild(go);
}

/**
 * A string literal that is a MODULE SPECIFIER — `from "@/lib/house-bot/constants"`, `import("…")`, `require("…")`,
 * `export * from "…"`, `import type … from "…"` — and therefore a path the bundler resolves, never a character a
 * player reads.
 *
 * 🔴 FOUND BY WIDENING THE POPULATION, 2026-09-20. Over the two files 0.198.3 reads this never came up; over all 394
 * player-rendered files it fires ONCE, on `src/app/markets/actions.ts:16` — `import { isHouseIntentKey } from
 * "@/lib/house-bot/constants"` — and a print guard that reports an import path reports the explanation as the bug, the
 * same class of defect as a guard that matches comments. What a player surface may IMPORT is a separate claim with its
 * own instrument (`test:house-bot-reports` 0.198.1, over this same population), so excluding specifiers here removes
 * nothing from the platform's cover; it stops ONE measure answering a question it was never the right measure for.
 * §5.2's controls pin the exclusion to exactly this shape: a house word in any other string position is still found.
 */
function isModuleSpecifier(n: ts.Node): boolean {
  const p = n.parent;
  if (!p) return false;
  if ((ts.isImportDeclaration(p) || ts.isExportDeclaration(p)) && p.moduleSpecifier === n) return true;
  if (ts.isExternalModuleReference(p) && p.expression === n) return true;
  if (ts.isCallExpression(p) && p.arguments[0] === n
    && (p.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(p.expression) && p.expression.text === "require"))) return true;
  if (ts.isLiteralTypeNode(p) && p.parent && ts.isImportTypeNode(p.parent)) return true;
  return false;
}

/** Every string a declaration or a file can print: string literals, the text parts of template literals and JSX text. */
export function printedTexts(file: string, text: string): string {
  const out: string[] = [];
  walkTree(parse(file, text), (n) => {
    if (isModuleSpecifier(n)) return;
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n) || ts.isJsxText(n)) out.push(n.text);
  });
  return out.join(" ");
}

/**
 * Is this file one a player's page RENDERS?
 *
 * ⚠️ THE SCOPE IS PART OF THE CLAIM, AND SO IS EVERY EXCLUSION. This is 0.198.1's `inPlayerPopulation` with ONE
 * subtraction, `src/app/api/`, and the subtraction is not a convenience:
 *   · a route handler prints JSON, not page text, and its BODY is already proven by an EXECUTED sweep rather than a
 *     source scan — `test:house-bot-reports` §11 calls `/api/fairness/recent`, `/api/health` and the public readers and
 *     runs the vocabulary over what they actually return (11.171, 11.247). A source scan over the same files would be
 *     WEAKER and would also be RED today for a true reason that is not a leak: `src/app/api/health/route.ts` holds the
 *     string `house-bot` as a schema-gate KEY that 11.171 proves never reaches the public body.
 *   · `src/app/admin/` and `src/components/admin/` are staff surfaces; what they may not render is ruling 453's
 *     `CONSOLE_EXTRA_WORDS`, a different and deliberately different list.
 * §5.2 asserts BOTH — that this population is the one it says, and that the excluded route handlers have their own
 * live guard — so neither exclusion can become a silent hole.
 */
export const isPlayerRendered = (rel: string): boolean =>
  (rel.startsWith("src/app/") && !rel.startsWith("src/app/admin/") && !rel.startsWith("src/app/api/")) ||
  (rel.startsWith("src/components/") && !rel.startsWith("src/components/admin/"));

/** The population, derived from the tracked `src/` walk — never a hand list, which is what goes blind to a new route. */
export function playerRenderedFiles(): string[] {
  return srcFiles().filter(isPlayerRendered);
}
