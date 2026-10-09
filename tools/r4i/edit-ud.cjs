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
edit("src/components/updown/updown-bet-errors.ts", [
  [`import { renderFailure, hasReason, type FailureDetail, type FailureReason } from "@/lib/failure-reasons";`,
   `import { renderFailure, hasReason, type FailureDetail, type FailureReason, type WhenFormat } from "@/lib/failure-reasons";`],
  [`  reasonDict?: Record<string, string>,
  money?: (n: number) => string,
): UdBetFailure {`,
   `  reasonDict?: Record<string, string>,
  money?: (n: number) => string,
  /** R4-I (2026-10-09) · the reader's formatter for a break's end (\`renderFailure\`'s \`when\`): "9 Okt, 06:02", never the
   *  server's English "9 Oct 2026, 06:02". Omitted, the end prints as the server wrote it. */
  when?: WhenFormat,
): UdBetFailure {`],
  [`    const f = renderFailure(r as never, reasonDict, m.udErrInvalid, money);`,
   `    const f = renderFailure(r as never, reasonDict, m.udErrInvalid, money, when);`],
]);
edit("src/components/updown/use-quick-bet.ts", [
  [`  reasonCopy: Record<string, string>;
}) {
  const { marketId, myUpStake = 0, myDownStake = 0, copy, errCopy, reasonCopy } = opts;`,
   `  reasonCopy: Record<string, string>;
  /** R4-I · the caller's formatter for a break's end, in its reader's words — passed on to \`udBetErrorCopy\`. */
  when?: (atMs: number) => string;
}) {
  const { marketId, myUpStake = 0, myDownStake = 0, copy, errCopy, reasonCopy, when } = opts;`],
  [`          const fail = udBetErrorCopy(code, serverError, errCopy, r as never, reasonCopy, formatTzs);`,
   `          const fail = udBetErrorCopy(code, serverError, errCopy, r as never, reasonCopy, formatTzs, when);`],
]);
for (const f of ["src/components/updown/round-stake-panel.tsx", "src/components/updown/updown-card.tsx"]) {
  let s = fs.readFileSync(f, "utf8");
  const nl = s.includes("\r\n") ? "\r\n" : "\n";
  const pairs = [
    [`    errCopy: t.market,${nl}    reasonCopy: t.error as unknown as Record<string, string>,${nl}  });`,
     `    errCopy: t.market,${nl}    reasonCopy: t.error as unknown as Record<string, string>,${nl}    // R4-I · a break's end in the reader's words, the formatter every break end uses.${nl}    when: (at) => formatBreakEnd(at, Date.now(), t.common.monthsShort, locale),${nl}  });`],
  ];
  s = s.replace(/\r\n/g, "\n");
  edit; // noop
  fs.writeFileSync(f, s.replace(/\n/g, nl));
}
edit("src/components/updown/round-stake-panel.tsx", [
  [`    errCopy: t.market,
    reasonCopy: t.error as unknown as Record<string, string>,
  });`,
   `    errCopy: t.market,
    reasonCopy: t.error as unknown as Record<string, string>,
    // R4-I · a break's end in the reader's words, the formatter every break end uses.
    when: (at) => formatBreakEnd(at, Date.now(), t.common.monthsShort, locale),
  });`],
  [`  }) {
  const { t } = useT();
  const { marketId, isAuthed,`, `  }) {
  const { t, locale } = useT();
  const { marketId, isAuthed,`],
]);
edit("src/components/updown/updown-card.tsx", [
  [`    errCopy: t.market,
    reasonCopy: t.error as unknown as Record<string, string>,
  });`,
   `    errCopy: t.market,
    reasonCopy: t.error as unknown as Record<string, string>,
    // R4-I · a break's end in the reader's words, the formatter every break end uses.
    when: (at) => formatBreakEnd(at, Date.now(), t.common.monthsShort, locale),
  });`],
  [`  } = props;
  const { t } = useT();
  const router = useRouter();`, `  } = props;
  const { t, locale } = useT();
  const router = useRouter();`],
]);
