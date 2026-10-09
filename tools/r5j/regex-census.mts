/**
 * R5-J G-6 census: every regular expression in src/ (player population + src/lib + src/components) that reads a digit or a
 * currency — a candidate private figure/money matcher. Run from F:\kipindi-r5j.
 */
import { readFileSync } from "node:fs";
import ts from "typescript";
const { srcFiles } = await import("file:///F:/kipindi-r5j/scripts/lib/tracked-files.mts");

const files = srcFiles().filter((f: string) => /\.(tsx?|m?js)$/.test(f) && !f.startsWith("src/app/admin/") && !f.startsWith("src/components/admin/")
  && !f.startsWith("src/app/api/") && !f.startsWith("src/lib/server/") && !/i18n-dict/.test(f));
const DIGITISH = /\\d|\[0-9|TZS|\\u2212|−|\[KMB\]|,\\d\{3\}|\\u00a0|\u00a0/;
let n = 0;
for (const file of files) {
  const code = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const sf = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const visit = (node: ts.Node) => {
    if (ts.isRegularExpressionLiteral(node)) {
      const src = node.text;
      if (DIGITISH.test(src)) {
        n++;
        const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
        console.log(`${file}:${line}  ${src.slice(0, 170)}`);
      }
    }
    if (ts.isNewExpression(node) && node.expression.getText(sf) === "RegExp" && node.arguments?.[0]) {
      const a = node.arguments[0].getText(sf);
      if (DIGITISH.test(a)) {
        n++;
        const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
        console.log(`${file}:${line}  new RegExp(${a.slice(0, 160)})`);
      }
    }
    node.forEachChild(visit);
  };
  sf.forEachChild(visit);
}
console.log(`\n${files.length} files, ${n} digit/currency patterns`);
