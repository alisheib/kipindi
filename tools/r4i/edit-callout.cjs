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
edit("src/components/ui/callout.tsx", [
  [`  action,
  role,
  titleAs: TitleTag = "p",
}: {`, `  action,
  role,
  titleAs: TitleTag = "p",
  bodyWidth = "measure",
}: {`],
  [`  /** \`stack\` only — the way forward. A notice that is a dead end is a defect. */
  action?: React.ReactNode;`, `  /** \`stack\` only — the way forward. A notice that is a dead end is a defect. */
  action?: React.ReactNode;
  /**
   * \`stack\` only — the body's measure. \`measure\` (default) holds it to 42ch, the reading measure of a short notice;
   * \`full\` lets it take the card's own width. ⭐ R4-I (2026-10-09, tiles 093–095): the deposit page's break notice is one
   * long sentence in a 575px card at 1280, and 42ch (with its balanced lines) held it to ~234px in four lines; a notice
   * that IS the page takes the page's column.
   */
  bodyWidth?: "measure" | "full";`],
  [`          <div className="mx-auto mt-2 max-w-[42ch] text-[13px] leading-relaxed text-text-muted">{children}</div>`,
   `          <div className={cn("mx-auto mt-2 text-[13px] leading-relaxed text-text-muted", bodyWidth === "measure" && "max-w-[42ch]")}>{children}</div>`],
]);
