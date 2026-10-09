const fs = require("fs");
function edit(f, pairs) {
  let s = fs.readFileSync(f, "utf8");
  const crlf = s.includes("\r\n");
  s = s.replace(/\r\n/g, "\n");
  for (const [o, n] of pairs) {
    const c = s.split(o).length - 1;
    if (c !== 1) { console.error(f, "anchor count", c, JSON.stringify(o.slice(0, 80))); process.exit(1); }
    s = s.replace(o, () => n);
  }
  if (crlf) s = s.replace(/\n/g, "\r\n");
  fs.writeFileSync(f, s);
  console.log("ok", f, crlf ? "crlf" : "lf");
}
edit("src/components/markets/conviction-dial.tsx", [
  [`import { renderFailure, hasReason, type FailureDetail } from "@/lib/failure-reasons";`,
   `import { renderFailure, hasReason, failureUntil, type FailureDetail } from "@/lib/failure-reasons";
import { formatBreakEnd } from "@/lib/break-end";
import { keepText } from "@/components/ui/keep-run";`],
  [`    /** BUSY only — the platform was saturated, nothing was debited, and the
     *  SAME idempotency key can be safely resubmitted. */
    retryable?: boolean;
  } | null>(null);`,
   `    /** BUSY only — the platform was saturated, nothing was debited, and the
     *  SAME idempotency key can be safely resubmitted. */
    retryable?: boolean;
    /** R4-I · the text the refusal put into its sentence that must stay one run (a break's end). */
    keep?: string[];
  } | null>(null);`],
  [`  const { toast, deferToast } = useDeferredToast(pending);
  const { t } = useT();`,
   `  const { toast, deferToast } = useDeferredToast(pending);
  const { t, locale } = useT();`],
  [`  ): { title: string; body: string; variant: "danger" | "warning" | "factual"; retryable?: boolean } => {`,
   `  ): { title: string; body: string; variant: "danger" | "warning" | "factual"; retryable?: boolean; keep?: string[] } => {`],
  [`    if (hasReason(r)) {
      const f = renderFailure(r as never, t.error as unknown as Record<string, string>, t.common.couldNotPlace, (n) => formatTzs(n));
      return {`,
   `    if (hasReason(r)) {
      /* ⭐ R4-I (2026-10-09, tiles 036 040 044 102 106 110) · A BREAK'S END IN THE READER'S WORDS, ONE RUN. The refusal read
         "hadi 9 Oct 2026, 06:02" — the server's English formatter in every language — and the date broke across lines
         ("9 / Oct 2026,"). \`when\` formats the refusal's instant (\`detail.untilAt\`) as every break end is formatted
         (\`formatBreakEnd\`: "9 Okt, 06:02", "2026年10月9日 06:02"), and \`keep\` hands that text to the dialog as one run. */
      const when = (at: number) => formatBreakEnd(at, Date.now(), t.common.monthsShort, locale);
      const f = renderFailure(r as never, t.error as unknown as Record<string, string>, t.common.couldNotPlace, (n) => formatTzs(n), when);
      const end = r.detail?.untilAt ? failureUntil(r.detail, when) : null;
      return {
        keep: end && end !== "—" ? [end] : undefined,`],
  [`        setResultData({
          variant: "danger", side: q.side, stake: q.stake, payoutIfWin: 0,
          error: mapped.body, title: mapped.title, retryable: mapped.retryable,
        });`,
   `        setResultData({
          variant: "danger", side: q.side, stake: q.stake, payoutIfWin: 0,
          error: mapped.body, title: mapped.title, retryable: mapped.retryable, keep: mapped.keep,
        });`],
]);
