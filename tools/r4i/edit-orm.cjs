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
edit("src/components/markets/operation-result-modal.tsx", [
  [`import { useCallback, useEffect, useRef } from "react";`, `import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";`],
  [`  /** Big eyebrow line — e.g. "Bet placed · Dau lipo". */
  eyebrow: string;`,
   `  /** Big eyebrow line — e.g. "Bet placed · Dau lipo". R4-I (2026-10-09): optional — a caller whose heading already says
   *  what the eyebrow would ("无法下注" over "无法下注") passes none, and no empty line is drawn. */
  eyebrow?: string;`],
  [`  /** Bilingual subhead, optional — e.g. "Inakaguliwa · Ufanye baadaye". */
  subtitle?: string;`,
   `  /** Bilingual subhead, optional — e.g. "Inakaguliwa · Ufanye baadaye". R4-I: a node, so a sentence can keep a run whole
   *  (a break's end, \`keepText\`). It is also the dialog's DESCRIPTION (\`aria-describedby\`), so a screen reader reads the
   *  reason with the heading when the dialog opens — a refusal used to announce "Could not place" and stop there. */
  subtitle?: ReactNode;`],
  [`  const { t } = useT();
  const closeRef = useRef(onClose);
  const primaryRef = useRef<HTMLButtonElement>(null);`,
   `  const { t } = useT();
  const closeRef = useRef(onClose);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const subtitleId = useId();`],
  [`      role={variant === "danger" ? "alertdialog" : "dialog"}
      ariaLabel={title}`,
   `      role={variant === "danger" ? "alertdialog" : "dialog"}
      ariaLabel={title}
      describedBy={subtitle ? subtitleId : undefined}`],
  [`        <p
          className="mt-4 font-mono text-micro uppercase eyebrow font-bold"
          style={{ color: tone.fg }}
        >
          {eyebrow}
        </p>
        <h2 className="mt-1 font-display text-[22px] font-bold text-text leading-tight tracking-[-0.018em]">`,
   `        {eyebrow && (
          <p
            className="mt-4 font-mono text-micro uppercase eyebrow font-bold"
            style={{ color: tone.fg }}
          >
            {eyebrow}
          </p>
        )}
        <h2 className={\`\${eyebrow ? "mt-1" : "mt-4"} font-display text-[22px] font-bold text-text leading-tight tracking-[-0.018em]\`}>`],
  [`        {subtitle && (
          <p className="mt-1.5 text-[13px] text-text-muted leading-snug">
            {subtitle}
          </p>
        )}`,
   `        {subtitle && (
          <p id={subtitleId} className="mt-1.5 text-[13px] text-text-muted leading-snug">
            {subtitle}
          </p>
        )}`],
]);
edit("src/components/ui/modal.tsx", [
  [`  /** "alertdialog" for irreversible confirmations, else "dialog". */
  role?: "dialog" | "alertdialog";`,
   `  /** "alertdialog" for irreversible confirmations, else "dialog". */
  role?: "dialog" | "alertdialog";
  /** id of the element that DESCRIBES the dialog (\`aria-describedby\`) — an alertdialog's message (WAI-ARIA APG), read
   *  with its name when focus moves in. R4-I (2026-10-09): the bet refusal names its reason here. */
  describedBy?: string;`],
  [`  labelledBy,
  role = "dialog",
  maxWidth = 360,`, `  labelledBy,
  role = "dialog",
  describedBy,
  maxWidth = 360,`],
  [`      aria-labelledby={labelledBy}
      className={\`fixed inset-0 flex justify-center`, `      aria-labelledby={labelledBy}
      aria-describedby={exiting ? undefined : describedBy}
      className={\`fixed inset-0 flex justify-center`],
]);
