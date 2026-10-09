// Every JSX child expression in player files that is a bare identifier, member access or arithmetic — the raw material
// for a hand review of numbers printed without a formatter. Names that are plainly text are skipped.
import { readFileSync } from "node:fs";
import ts from "typescript";
const { decomment } = await import("file:///F:/kipindi-r5j/scripts/lib/decomment.mts");
const { playerRenderedFiles } = await import("file:///F:/kipindi-r5j/scripts/lib/player-surface-text.mts");
const TEXTY = /(label|Label|title|Title|name|Name|text|Text|word|Word|desc|Desc|caption|Caption|children|icon|Icon|glyph|Glyph|body|Body|hint|Hint|eyebrow|message|Message|copy|Copy|heading|Heading|value|Value|node|Node|el$|content|Content|summary|Summary|subtitle|footer|header|tail|lead|prefix|suffix|t\.\w+\.\w+$|^t$|reason|Reason|line|Line|phrase|Phrase|sentence|status|Status|date|Date|time|Time|when|When|until|ago|clock|Clock|handle|email|phone|address|url|href|id$|Id$|code|Code|ref|Ref|amount|Amount|tzs|Tzs|money|price|Price|pct|Pct|percent|rate|Rate|odds|stake|Stake|pool|Pool|balance|Balance|fee|Fee|payout|Payout|volume|Volume|figure|Figure|digits|Digits|mask|masked|raw|initials|side|Side|outcome|Outcome|asset|Asset|category|Category|topic|Topic|host|source|Source|error|Error|note|Note|notice|Notice|detail|Detail|cta|Cta|chip|Chip|badge|Badge|pill|Pill|tag|Tag|row|Row|cell|Cell|item|Item|key$|q$|query|Query|search|echo|preview|Preview|ghost|Ghost|lock|Lock|step$|Step$|kind|Kind|mode|Mode|tier|Tier|level$|Level$)/;
const hits: string[] = [];
for (const file of playerRenderedFiles()) {
  const code = decomment(readFileSync(file, "utf8").replace(/\r\n/g, "\n"));
  const sf = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const visit = (n: ts.Node) => {
    if (ts.isJsxExpression(n) && n.expression && (ts.isJsxElement(n.parent) || ts.isJsxFragment(n.parent))) {
      const e = n.expression;
      const txt = e.getText(sf);
      const simple = ts.isIdentifier(e) || ts.isPropertyAccessExpression(e) || ts.isBinaryExpression(e) && /^[+\-*/]$/.test(e.operatorToken.getText(sf)) || ts.isElementAccessExpression(e);
      if (simple && !TEXTY.test(txt.split(".").pop() ?? txt) && !/formatNumber|format|fmt/.test(txt)) {
        const line = sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
        hits.push(`${file}:${line}  {${txt}}`);
      }
    }
    n.forEachChild(visit);
  };
  sf.forEachChild(visit);
}
for (const h of hits) console.log(h);
console.log(`\n${hits.length} bare JSX children (non-text names)`);
