// I-3 · a grant's state words in their §B11 tones, read from the one dictionary; and the one sibling of the rule
// ("amber only where somebody must act") the census found outside the grant family: a declaration under review.
module.exports = [
  { file: "src/lib/status-tone.ts",
    from: `  REVERSED:   { player: "slate" },
  CANCELLED:  { player: "slate" },
`,
    to: `  REVERSED:   { player: "slate" },
  CANCELLED:  { player: "slate" },
  // ── A BONUS GRANT'S STATE, on the player's /wallet (R5-I, the visual pass's round 5, 2026-10-09) ────────────────────
  /**
   * ⭐ GRANT-SCOPED KEYS, for the reason the KYC keys below give: the namespace is FLAT, and \`QUEUED\`, \`FULFILLED\` and
   * \`PENDING_KYC\` are words another family reads with another meaning (the account page shows a PENDING_KYC account as
   * ACTIVE). Every grant word but the running one (ACTIVE draws its progress, not a chip) wore the WARNING chip — amber,
   * struck in gilt (F3) — and amber means SOMEBODY MUST ACT (§B11). Nobody must:
   *   · QUEUED — waiting its turn: royal, as PENDING is royal everywhere (correction 2).
   *   · PENDING_KYC — historic since 2026-09-13 (nothing mints one; \`wallet/page.tsx\`): a wait, royal — the account page
   *     ruled the same straggler "not a warning".
   *   · FULFILLED ("Unlocked") — done, and the money is the player's: success green, as a completed payment is (item 5).
   *     ⛔ Not gilt: the chip is a WORD, and a word is not money (R5-C's ruling on a paying friend's chip, invite/page.tsx);
   *     gold is for an earned FIGURE, and this row's figure is no longer bonus money (E-224 suppresses it).
   *   · EXPIRED, CANCELLED, FORFEITED — terminal and inert: slate, as EXPIRED and CANCELLED already are above.
   */
  GRANT_QUEUED:      { player: "royal" },
  GRANT_PENDING_KYC: { player: "royal" },
  GRANT_FULFILLED:   { player: "green" },
  GRANT_EXPIRED:     { player: "slate" },
  GRANT_CANCELLED:   { player: "slate" },
  GRANT_FORFEITED:   { player: "slate" },
` },
  { file: "src/app/wallet/wallet-client.tsx",
    from: 'import { playerStatusInk } from "@/lib/status-tone";\n',
    to: 'import { playerStatusChip, playerStatusInk } from "@/lib/status-tone";\nimport { Chip } from "@/components/ui/chip";\n' },
  { file: "src/app/wallet/wallet-client.tsx",
    from: `                          {/* EVERY state but the running one is named. It used to badge \`QUEUED\`
                              alone, so the four finished states would have rendered as though they
                              were still running — gilt panel, progress bar and all — the moment
                              they became visible. */}
                          {!running && word && (
                            <span className="inline-flex items-center rounded-pill px-1.5 py-px text-[8px] font-bold bg-warning-bg border border-warning-border text-warning-fg">
                              {word}
                            </span>
                          )}`,
    to: `                          {/* EVERY state but the running one is named. It used to badge \`QUEUED\`
                              alone, so the four finished states would have rendered as though they
                              were still running — gilt panel, progress bar and all — the moment
                              they became visible.
                              ⭐ EACH IN ITS §B11 TONE, FROM THE ONE DICTIONARY (R5-I, the visual pass's round 5,
                              2026-10-09): waiting royal, unlocked success, expired/cancelled/forfeited slate
                              (\`status-tone.ts\`, the GRANT_ keys). Every word was a hand-rolled WARNING pill — amber,
                              gilt ink, "somebody must act" for states nobody acts on — at 8px; it is the kit's
                              chip now, at the side pill's size (\`sm\`, \`metrics="base"\`: one height for every state). */}
                          {!running && word && (
                            <Chip variant={playerStatusChip(\`GRANT_\${g.status}\`) ?? "neutral"} size="sm" metrics="base">
                              {word}
                            </Chip>
                          )}` },
  // ── a source-of-funds declaration under review: waiting is royal, on /profile as on its own page ───────────────────
  { file: "src/app/profile/page.tsx",
    from: `      {/* ── SoF banner when declaration is pending or rejected */}
      {sofNeedsBanner && (
        <section className="rounded-xl border border-warning-border bg-warning-bg p-5">`,
    to: `      {/* ── SoF banner when declaration is pending or rejected.
          ⭐ "Under review" is WAITING — royal (§B11), as /profile/source-of-funds says the same state (R5-C) — and amber
          only where the player must act: a declaration to resubmit (R5-I, 2026-10-09). It was amber for both. */}
      {sofNeedsBanner && (
        <section className={\`rounded-xl border p-5 \${sof!.reviewStatus === "REJECTED" ? "border-warning-border bg-warning-bg" : "border-info-border bg-info-bg"}\`}>` },
  { file: "src/app/profile/source-of-funds/page.tsx",
    from: `      {existing && existing.reviewStatus !== "REJECTED" && (
        <section className="rounded-xl border border-success-border bg-success-bg p-4 space-y-1.5">`,
    to: `      {/* The declaration on file, in its state's own tone (§B11): accepted the success box, under review the royal one —
          the pill inside already said "waiting" in royal while the box around it said done (R5-I, 2026-10-09). */}
      {existing && existing.reviewStatus !== "REJECTED" && (
        <section className={\`rounded-xl border p-4 space-y-1.5 \${existing.reviewStatus === "ACCEPTED" ? "border-success-border bg-success-bg" : "border-info-border bg-info-bg"}\`}>` },
];
