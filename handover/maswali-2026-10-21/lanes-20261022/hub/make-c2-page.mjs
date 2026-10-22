// Derives the commit-2 page (the frame, without commit 3's no-week body) from the full draft.
import { readFileSync, writeFileSync } from "node:fs";
const [src, out] = process.argv.slice(2);
const crlf = readFileSync(src, "utf8").includes("\r\n");
let s = readFileSync(src, "utf8").replace(/\r\n/g, "\n");
const pairs = [
  [
    'import { carryingRollover, closeMovedWords, finalAheadWords, lastWeekWords, noWeekBody, voidingWords } from "./hub-words";',
    'import { carryingRollover, closeMovedWords, finalAheadWords, lastWeekWords, nextOpenWords, voidingWords } from "./hub-words";',
  ],
  [
    "                // sales are paused it promises no next open. The next open's day never parts from its clock (A1): the kit's\n                // kept run (`EmptyStateBody`'s `keep`).\n",
    "                // sales are paused it promises no next open.\n",
  ],
  [
    "                  <EmptyState title={t.millionea.hubNoWeek} body={noWeekBody(t, locale, hub.paused ? null : msOf(hub.nextOpensAt))} fill />",
    [
      "                  <EmptyState",
      "                    title={t.millionea.hubNoWeek}",
      "                    body={[",
      "                      msOf(hub.nextOpensAt) !== null && !hub.paused ? nextOpenWords(t, msOf(hub.nextOpensAt) ?? 0) : null,",
      "                      t.millionea.questionsAtOpen,",
      '                    ].filter((x): x is string => !!x).join(locale === "zh" ? "" : " ")}',
      "                    fill",
      "                  />",
    ].join("\n"),
  ],
];
for (const [a, b] of pairs) {
  if (!s.includes(a)) throw new Error(`missing: ${a.slice(0, 70)}`);
  s = s.replace(a, b);
}
writeFileSync(out, crlf ? s.replace(/\n/g, "\r\n") : s);
console.log(`wrote ${out} (${crlf ? "CRLF" : "LF"})`);
