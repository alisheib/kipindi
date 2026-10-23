// Disk plants for `red:result-reference` (MASWALI-BUILD FLOW 4: a result's unbroken token never leaves one character alone;
// DESIGN_AUTHORITY §M4a rule 5) and `test:red-anchors`. The red runner (`scripts/result-reference.test.mts --prove-red`)
// writes each plant into the real source, runs the suite, requires it to fail ON THE NAMED CASE, and restores the file.
// A dot is matched as [.], so no escape is typed.

export const MUTATIONS = [
  {
    name: "(RR1) a long token is no longer cut into chunks",
    file: "src/lib/even-break.ts",
    from: "  if (typeof value !== \"string\" || value.length < EVEN_BREAK_MIN_LENGTH || /\\s/.test(value)) return null;",
    to: "  if (typeof value === \"string\") return null;",
    failure: /FAIL 1[.]1 /,
  },
  {
    name: "(RR2) the chunks are cut greedily — full chunks, then whatever is left",
    file: "src/lib/even-break.ts",
    from: "  const base = Math.floor(chars.length / n), extra = chars.length % n;",
    to: "  const base = EVEN_BREAK_MAX_CHUNK, extra = 0;",
    failure: /FAIL 1[.]2 /,
  },
  {
    name: "(RR3) the modal draws the raw value again",
    file: "src/components/markets/operation-result-modal.tsx",
    from: "<DetailValue value={d.value} />",
    to: "{d.value}",
    failure: /FAIL 2[.]3 /,
  },
  {
    name: "(RR4) the value's box breaks anywhere again (break-all for every value)",
    file: "src/components/markets/operation-result-modal.tsx",
    from: "${evenBreakChunks(d.value) ? \"[word-break:normal] [overflow-wrap:break-word]\" : \"break-all\"}",
    to: "break-all",
    failure: /FAIL 2[.]3 /,
  },
];
