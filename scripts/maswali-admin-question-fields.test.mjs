import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const source = readFileSync(fileURLToPath(new URL("../src/app/admin/maswali/new/week-builder.tsx", import.meta.url)), "utf8");
const questions = source.match(/\{\(\[\["textEn", "Question · English"\][\s\S]*?\)\)\}/)?.[0];
assert.ok(questions, "the shared EN/SW/ZH question fields must be present");

function checkQuestionControl(block) {
  for (const label of ["Question · English", "Question · Kiswahili", "Question · 中文"])
    assert.ok(block.includes(label), `${label} must use the shared question control`);
  assert.match(block, /<Textarea rows=\{5\} value=\{r\[k\]\}/,
    "all three question fields must show a long wrapped question in the kit textarea");
  assert.doesNotMatch(block, /<Input\b/, "no question field may use a one-line input");
}

checkQuestionControl(questions);
console.log("maswali admin question fields: EN/SW/ZH share a wrapped kit textarea PASS");

if (process.argv.includes("--prove-red")) {
  const mutant = questions.replace("<Textarea rows={5}", '<Input size="sm"');
  assert.notEqual(mutant, questions, "one-line question mutation must plant");
  assert.throws(() => checkQuestionControl(mutant), /kit textarea|one-line input/);
  console.log("maswali admin question fields RED: one-line input is caught");
}
