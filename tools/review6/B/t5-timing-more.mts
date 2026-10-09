// More adversarial timings for the round-5 text helpers (review 6, reviewer B): the empty state's body, keepText with
// many runs and dashes, and the notification-text cleaners. Doubling n; ~2× is linear, ~4× quadratic.
import { emptyStateBody } from "file:///F:/kipindi-rev/src/components/ui/empty-state-text.ts";
import { keepText, dashRanges } from "file:///F:/kipindi-rev/src/components/ui/keep-run.tsx";
import { readableNotificationBody, clipQuote, endClause } from "file:///F:/kipindi-rev/src/lib/notification-text.ts";

const time = (fn: () => unknown) => { const t0 = performance.now(); fn(); return performance.now() - t0; };
const cases: Array<[string, (n: number) => unknown]> = [
  ["emptyStateBody  'A — ' × n", (n) => emptyStateBody("A — ".repeat(n))],
  ["emptyStateBody  'AB or CD ' × n", (n) => emptyStateBody("AB or CD ".repeat(n))],
  ["emptyStateBody  '否——' × n", (n) => emptyStateBody("否——".repeat(n))],
  ["keepText        runs × n", (n) => keepText("9 Okt, 06:02 ".repeat(n), ["9 Okt, 06:02"])],
  ["dashRanges      'x' × n + ' —'", (n) => dashRanges("x".repeat(n) + " —")],
  ["dashRanges      '—' × n", (n) => dashRanges("—".repeat(n))],
  ["readableNotificationBody '..x' × n", (n) => readableNotificationBody("..x".repeat(n))],
  ["clipQuote       'x' × n, 70", (n) => clipQuote("x".repeat(n), 70)],
  ["endClause       '.' × n + 'x'", (n) => endClause(".".repeat(n) + "x", ".")],
];
for (const [name, fn] of cases) {
  fn(100);
  const a = time(() => fn(5_000)), b = time(() => fn(10_000)), c = time(() => fn(20_000));
  console.log(`${name.padEnd(40)} 5k ${a.toFixed(2).padStart(8)} ms  10k ${b.toFixed(2).padStart(8)} ms  20k ${c.toFixed(2).padStart(8)} ms  ratio ${b > 0.05 ? (c / b).toFixed(2) : "-"}`);
}
