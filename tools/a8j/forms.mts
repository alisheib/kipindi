import { readFileSync } from "node:fs";
import ts from "file:///F:/kipindi-a8j/node_modules/typescript/lib/typescript.js";
import { srcFiles } from "file:///F:/kipindi-a8j/scripts/lib/tracked-files.mts";
const root = "F:/kipindi-a8j/";
for (const rel of srcFiles()) {
  if (!rel.endsWith(".tsx")) continue;
  const code = readFileSync(root + rel, "utf8");
  if (!code.includes("<form")) continue;
  const sf = ts.createSourceFile(rel, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const go = (n: ts.Node) => {
    if ((ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) && n.tagName.getText(sf) === "form") {
      const attrs = n.attributes.properties.map((a) => ts.isJsxAttribute(a) ? `${a.name.getText(sf)}=${a.initializer ? a.initializer.getText(sf).slice(0, 50).replace(/\s+/g, " ") : "true"}` : `{...${(a as ts.JsxSpreadAttribute).expression.getText(sf)}}`).filter((s) => /^(action|onSubmit|\{)/.test(s));
      const line = sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
      console.log(`${rel}:${line} ${attrs.join(" | ")}`);
    }
    ts.forEachChild(n, go);
  };
  go(sf);
}
