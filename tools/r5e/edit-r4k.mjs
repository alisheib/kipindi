// r4k §4.3 and §4.10: the gap's space is generated (round 5, review 3's doubt), and the empty state's body hangs its marks
// inside `emptyStateBody` (round 5, H4).
import { readFileSync, writeFileSync } from "node:fs";
const p = "F:/kipindi-r5e/scripts/visual-pass-r4k.test.mts";
let s = readFileSync(p, "utf8");
const crlf = s.includes("\r\n");
const NL = crlf ? "\r\n" : "\n";
const E = (x) => (crlf ? x.split("\n").join("\r\n") : x);
const rep = (a, b) => { if (!s.includes(E(a))) { console.error("MISSING:", a.slice(0, 140)); process.exit(1); } s = s.replace(E(a), E(b)); };

rep(
  'import { hangCjkMarks, CJK_MARK_TRIM, CJK_TRIM_EM } from "../src/lib/cjk-marks.tsx";',
  'import { hangCjkMarks, CJK_MARK_TRIM, CJK_TRIM_EM } from "../src/lib/cjk-marks.tsx";\nimport { emptyStateBody } from "../src/components/ui/empty-state-text.ts";',
);
rep(
  [
    '  const mid = html(h("p", null, hangCjkMarks("选择一个问题，点击")));',
    '  ok("4.3 · a mid-text ， is set back AND followed by the gap that pays it back",',
    '    mid === `<p>选择一个问题<span class="kp-cjk-mark">，</span><span aria-hidden="true" class="kp-cjk-gap"> </span>点击</p>`, mid);',
  ].join("\n"),
  [
    '  const mid = html(h("p", null, hangCjkMarks("选择一个问题，点击")));',
    '  // ⚠️ Pin moved 2026-10-09 (round 5, R5-E, review 3\'s doubt): the gap\'s space is the stylesheet\'s (`::after`), so the',
    '  // gap is an EMPTY span and the text is the dictionary\'s, character for character (copy, find-in-page, textContent).',
    '  ok("4.3 · a mid-text ， is set back AND followed by the gap that pays it back — a space the stylesheet draws, not the text",',
    '    mid === `<p>选择一个问题<span class="kp-cjk-mark">，</span><span aria-hidden="true" class="kp-cjk-gap"></span>点击</p>`',
    '      && /\\.kp-cjk-gap::after\\s*\\{\\s*content:\\s*" ";\\s*\\}/.test(css), mid);',
  ].join("\n"),
);
rep(
  '    code("src/components/ui/empty-state.tsx").includes("{hangCjkMarks(title)}") && code("src/components/ui/empty-state.tsx").includes("{hangCjkMarks(emptyStateBody(body))}")',
  [
    '    // ⚠️ Pin moved 2026-10-09 (round 5, R5-E, H4): the body\'s marks hang inside `emptyStateBody`, which draws its held runs',
    '    // as spans (no character inserted), so the call is `{emptyStateBody(body)}` and the rendered body is checked here.',
    '    code("src/components/ui/empty-state.tsx").includes("{hangCjkMarks(title)}") && code("src/components/ui/empty-state.tsx").includes("{emptyStateBody(body)}")',
    '      && html(h("p", null, emptyStateBody("选择一个问题，点击“是”或“否”——您的注单会显示在这里。"))).endsWith(`显示在这里<span class="kp-cjk-mark">。</span></p>`)',
  ].join("\n"),
);
writeFileSync(p, s);
console.log("ok");
