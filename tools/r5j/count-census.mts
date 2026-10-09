/**
 * R5-J G-4 census: every count-like expression a player's page can print, by shape.
 *   npx tsx <this> [--all]
 * Run from F:\kipindi-r5j.
 */
import { readFileSync } from "node:fs";
import ts from "typescript";
const { decomment } = await import("file:///F:/kipindi-r5j/scripts/lib/decomment.mts");
const { playerRenderedFiles } = await import("file:///F:/kipindi-r5j/scripts/lib/player-surface-text.mts");

const COUNTISH = /(\.length|\.size|count|Count|total|Total|unread|Unread|players|predictors|votes|recruits|wins|losses|voids|^n$|^n\b|\bn\)$|rounds|bets|markets|matched|shown|attached|closingToday|liveCount|openCount)/;
const files = playerRenderedFiles().concat(["src/lib/search/query.ts", "src/lib/markets/card-close-label.ts"]);
type Hit = { file: string; line: number; kind: string; text: string };
const hits: Hit[] = [];
const wrappedOK = (s: string) => /formatNumber\(|formatTzs|formatCompact|formatTzsCompact|toFixed\(|pctNum|fmtRate|durationHours/.test(s);
for (const file of files) {
  const code = decomment(readFileSync(file, "utf8").replace(/\r\n/g, "\n"));
  const sf = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const lineOf = (n: ts.Node) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  const push = (n: ts.Node, kind: string, text: string) => hits.push({ file, line: lineOf(n), kind, text: text.replace(/\s+/g, " ").slice(0, 160) });
  const visit = (n: ts.Node) => {
    // 1. JSX child expression {expr}
    if (ts.isJsxExpression(n) && n.expression && (ts.isJsxElement(n.parent) || ts.isJsxFragment(n.parent))) {
      const e = n.expression.getText(sf);
      if (COUNTISH.test(e) && !wrappedOK(e) && !/^t\.|=>|\?\s*</.test(e) && !/className|key=/.test(e)) push(n, "jsx-child", e);
    }
    // 2. template span ${expr}
    if (ts.isTemplateSpan(n)) {
      const e = n.expression.getText(sf);
      if (COUNTISH.test(e) && !wrappedOK(e)) push(n, "template", e);
    }
    // 3. .replace("{x}", expr)
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === "replace" && n.arguments.length === 2
      && ts.isStringLiteral(n.arguments[0]) && /^\{\w+\}$/.test(n.arguments[0].text)) {
      const e = n.arguments[1].getText(sf);
      if (!wrappedOK(e)) push(n, `replace ${n.arguments[0].text}`, e);
    }
    // 4. fill(..., { k: expr })
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && /^fill(Nodes)?$/.test(n.expression.text) && n.arguments[1] && ts.isObjectLiteralExpression(n.arguments[1])) {
      for (const p of n.arguments[1].properties) {
        if (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) {
          const e = ts.isPropertyAssignment(p) ? p.initializer.getText(sf) : p.name.getText(sf);
          if (!wrappedOK(e) && !/^t\./.test(e) && !/^</.test(e)) push(p, `fill ${p.name.getText(sf)}`, e);
        }
      }
    }
    // 5. toLocaleString / Intl.NumberFormat
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === "toLocaleString") push(n, "toLocaleString", n.getText(sf));
    if (ts.isNewExpression(n) && n.expression.getText(sf) === "Intl.NumberFormat") push(n, "Intl.NumberFormat", n.getText(sf));
    // 6. count= props on FilterPill-like and String(count)
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === "String" && n.arguments[0] && COUNTISH.test(n.arguments[0].getText(sf))) push(n, "String()", n.getText(sf));
    n.forEachChild(visit);
  };
  sf.forEachChild(visit);
}
const seen = new Set<string>();
for (const h of hits) {
  const k = `${h.file}:${h.line}:${h.kind}:${h.text}`;
  if (seen.has(k)) continue;
  seen.add(k);
  console.log(`${h.file}:${h.line}  [${h.kind}]  ${h.text}`);
}
console.log(`\n${files.length} files, ${seen.size} hits`);
