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
const w = `    errCopy: t.market,
    reasonCopy: t.error as unknown as Record<string, string>,
  });`;
const wn = `    errCopy: t.market,
    reasonCopy: t.error as unknown as Record<string, string>,
    // R4-I · a break's end in the reader's words, the formatter every break end uses.
    when: (at) => formatBreakEnd(at, Date.now(), t.common.monthsShort, locale),
  });`;
edit("src/components/updown/round-stake-panel.tsx", [
  [w, wn],
  [`}) {
  const { t } = useT();
  const { marketId, isAuthed,`, `}) {
  const { t, locale } = useT();
  const { marketId, isAuthed,`],
  [`import { useT } from "@/lib/i18n";\n`, `import { useT } from "@/lib/i18n";\nimport { formatBreakEnd } from "@/lib/break-end";\n`],
]);
edit("src/components/updown/updown-card.tsx", [
  [w, wn],
  [`  } = props;
  const { t } = useT();
  const router = useRouter();`, `  } = props;
  const { t, locale } = useT();
  const router = useRouter();`],
  [`import { useT } from "@/lib/i18n";\n`, `import { useT } from "@/lib/i18n";\nimport { formatBreakEnd } from "@/lib/break-end";\n`],
]);
