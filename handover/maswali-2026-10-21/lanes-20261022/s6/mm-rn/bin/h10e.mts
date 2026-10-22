// Scratch replica of R's H.10e (scripts/lib/harm-watch-cases.mts lines 373-448 at 57624a2fa), reading a dump dir.
import { readFileSync } from "node:fs";
import { join } from "node:path";
const ROOT = process.argv[2];
const read = (p: string) => readFileSync(join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const impl = { source: read("src/lib/server/harm-watch.ts") };
  const MARKER_NAMES = ["RAPID", "CHASING", "LATE", "LIMIT", "SESSION"].map((w, i) => [w, ["DEPOSIT_ESCALATION", "LOSSES", "NIGHT_PLAY", "BREACH_HISTORY", "OVERRUN"][i]].join("_"));
  const NAMED = String.raw`(?:${MARKER_NAMES.join("|")})|\bharm[- ](?:markers?|detectors?)\b`;
  const DET_HARM = new RegExp(String.raw`${NAMED}|\blooks? back\b|look-?back|\brapid[- ]deposits?\b|\bchas(?:er|ers|ing)\b|\bdetectors?\b`, "i");
  const DET_OTHER = new RegExp(NAMED, "i");
  const UNITS = String.raw`(?:seconds?|secs?|minutes?|mins?|hours?|hrs?|days?|weeks?|wks?|fortnights?|months?|hourly|daily|weekly|nightly)`;
  const UNIT = new RegExp(String.raw`\b${UNITS}\b|\b\d+\s*(?:h|d|m|s|ms)\b`, "i");
  const NUMBER = String.raw`(?:\d+(?:[.,]\d+)?\+?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty(?:-\w+)?|thirty|forty|fifty|sixty)`;
  const FIGURE_UNIT = new RegExp(String.raw`\b(?:${NUMBER}|an?)\s*[- ]?\s*${UNITS}\b|\b\d+\s*(?:h|d|m|s|ms)\b`, "i");
  const COUNTED = new RegExp(String.raw`(?<![A-Za-z]\.)\b${NUMBER}\s+(?:confirmed\s+)?(?:deposits?|top-?ups?|bets?|times)\b`, "i");
  const SLACK = /\b(?:margin|room to spare|to spare|buffer|longer than)\b/i, SPAN = /\bwindow\b|\bcandidates?\b|_DAYS\b|_MS\b|\bspan\b/i;
  const OPENS = /^\s*(?:[A-Z][A-Za-z]?\d*\.\d|[-·⭐⛔⚠]|\d+\.\s)/;
  const ABBREV = /\b(?:e\.g|i\.e|approx|vs|etc|cf|incl)\./gi;
  // ⭐ R15 (the lead's ruling) — ANY FIGURE in a sentence that names a detector fails it. A figure is a digit run, a number
  // word (a cardinal, an ordinal, a fraction, once or twice), a multiplier word or a currency amount. A REFERENCE is no
  // figure and is set aside exactly, before the figure is looked for: a date (a time may follow it); a file, with its line
  // reference (the file in backticks or not, more lines after a comma), and the L and #L forms; a plan or section id with
  // its hyphen or §, or a capital-led id; a case id; and the id a case's label opens with. Nothing else is set aside: a
  // year alone, a currency code or an X joined to a figure, and a decimal that opens a label before a counted noun, a
  // currency, a percent or a unit all stay figures.
  const NOT_AMOUNT = String.raw`(?!(?:TZS|TSH|USD|KES|EUR|GBP|X)(?:[-.]|\d))`;
  const REFERENCES: RegExp[] = [
    /(?<!\d)\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?Z?(?: ?(?:UTC|EAT))?)?(?!\d)/g,
    /\x60?(?:[\w.@-]+\/)*[\w.@-]+\.(?:ts|tsx|mts|mjs|cjs|js|jsx|md|json|prisma|sql|css|ya?ml|sh|ps1)\x60?(?::\d+(?:[-–]\d+)?(?:, ?:\d+(?:[-–]\d+)?)*)?(?!\w)/g,
    /#L\d+(?:-L\d+)?(?!\w)/g,
    /\bL\d+(?:[-–]L\d+)?\b/g,
    /§\d+[a-z]?(?:\.\d+[a-z]?)*/g,
    new RegExp(String.raw`\b${NOT_AMOUNT}[A-Z]{1,5}-\d+[a-z]?\b`, "g"),
    new RegExp(String.raw`\b${NOT_AMOUNT}[A-Z]{1,4}\.\d+[a-z\d]*(?:\.\d+[a-z\d]*)*\b`, "g"),
    new RegExp(String.raw`\b${NOT_AMOUNT}[A-Z]{1,4}\d+(?:\.\d+)*[a-z\d]*\b`, "g"),
  ];
  const NUMBER_WORDS = String.raw`zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundreds?|thousands?|millions?|billions?|dozens?|couple|pair|single|once|twice|thrice|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|twentieth|hundredth|thousandth|half|halves|halved?|quarters?`;
  const MULTIPLIER_WORDS = String.raw`double[ds]?|doubling|triple[ds]?|tripling|treble[ds]?|quadruple[ds]?|(?:two|three|four|five|six|seven|eight|nine|ten|hundred|thousand)-?fold`;
  const ANY_FIGURE = new RegExp(String.raw`\d|×|\b(?:${NUMBER_WORDS}|${MULTIPLIER_WORDS})\b`, "i");
  const figureIn = (x: string) => ANY_FIGURE.test(REFERENCES.reduce((s, re) => s.replace(re, " "), x));
  /** The id a case's label opens with, set aside at a literal's start only — never when a counted noun, a currency, a
   *  percent or a unit follows it (then it is a figure dressed as an id). */
  const LABEL_ID = new RegExp(String.raw`^\d+(?:\.\d+)+[a-z]?(?= (?!(?:confirmed )?(?:deposits?|top-?ups?|bets?|times|transactions?)\b|(?:TZS|TSh|USD|shillings?|per ?cent|percent)\b|%|${UNITS}\b))`, "i");
  const joined = (lines: readonly string[]) => lines.map((l) => (OPENS.test(l) ? ". " : " ") + l.trim()).join("");
  const literalsOf = (code: string): string[] => [...code.matchAll(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g)]
    .map((m) => m[0].slice(1, -1).replace(/\$\{[^}]*\}/g, " ").replace(LABEL_ID, " ")).filter((x) => /[A-Za-z]{3}/.test(x));
  const proseOfCode = (s: string): string[] => {
    const out: string[] = [];
    for (const m of s.matchAll(/\/\*[\s\S]*?\*\//g)) out.push(joined(m[0].slice(2, -2).split("\n").map((l) => l.replace(/^\s*\*\s?/, ""))));
    let run: string[] = [];
    const codeLines: string[] = [];
    for (const line of s.replace(/\/\*[\s\S]*?\*\//g, "").split("\n")) {
      const i = line.indexOf("//");
      if (i >= 0 && !/https?:$/.test(line.slice(0, i))) { codeLines.push(line.slice(0, i)); run.push(line.slice(i + 2)); continue; }
      codeLines.push(line);
      if (run.length) { out.push(joined(run)); run = []; }
    }
    if (run.length) out.push(joined(run));
    return [...out, ...literalsOf(codeLines.join("\n"))];
  };
  const proseOfDoc = (s: string): string[] => s.replace(/\n(?=\s*(?:[-*|]|\d+\.)\s)/g, ".\n").split(/\n\s*\n/).map((p) => p.replace(/\n/g, " "));
  const leaks = (blocks: readonly string[], det: RegExp): string[] => blocks.flatMap((b) => {
    const ss = b.replace(ABBREV, (m) => m.slice(0, -1)).split(/(?<=[.;!?])\s+/).filter((x) => x.trim().length > 0);
    return ss.filter((x, i) => {
      const prev = i > 0 ? ss[i - 1] : "";
      return (det.test(x) && (UNIT.test(x) || COUNTED.test(x) || figureIn(x))) || (det.test(x) && FIGURE_UNIT.test(prev))
        || (det.test(prev) && FIGURE_UNIT.test(x)) || (SLACK.test(x) && SPAN.test(x));
    });
  });
  const scanned: Array<[string, string[], RegExp]> = [
    ["harm-watch.ts", proseOfCode(impl.source), DET_HARM],
    ["harm-watch-cases.mts", proseOfCode(read("scripts/lib/harm-watch-cases.mts")), DET_HARM],
    ["harm-watch.test.mts", proseOfCode(read("scripts/harm-watch.test.mts")), DET_HARM],
    ["S13-PLAN.md", proseOfDoc(read("docs/design-system/v5-2026-09-29-simplified-journey/S13-PLAN.md")), DET_HARM],
    ["rg-doors.test.mts", proseOfCode(read("scripts/rg-doors.test.mts")), DET_OTHER],
    ["COMPLIANCE-DECISIONS.md", proseOfDoc(read("docs/COMPLIANCE-DECISIONS.md")), DET_OTHER],
    // ⭐ R14 — the other files that discuss the detectors, each named (the scan is not repo-wide).
    ["marketing/rg.ts", proseOfCode(read("src/lib/server/marketing/rg.ts")), DET_OTHER],
    ["campaign-audience.test.mts", proseOfCode(read("scripts/campaign-audience.test.mts")), DET_OTHER],
    ["SUPPORT-CARE-CAMPAIGN.md", proseOfDoc(read("docs/SUPPORT-CARE-CAMPAIGN.md")), DET_OTHER],
  ];
  const found = scanned.flatMap(([f, blocks, det]) => leaks(blocks, det).map((x) => `${f}: ${x}`));
console.log(JSON.stringify({ count: found.length }));
for (const f of found) console.log("LEAK " + f);
