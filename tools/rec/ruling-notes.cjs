// ruling-notes.cjs <repo> : the owner's ruling of 2026-10-07 (money doors: no email question before a deposit, the
// app-wide email bar and the deposit's email gate deleted, the TZS 1,000 minimum) noted where the plans still describe
// the old state. Notes are appended; nothing historical is rewritten. Each anchor must occur exactly once.
const fs = require("fs");
const repo = process.argv[2];
const D = "docs/design-system/v5-2026-09-29-simplified-journey";
const R = "(⛔ the owner's ruling of 2026-10-07, NEXT-PLAN ▶ 0e: the app-wide email bar and the deposit's email gate are deleted for every viewer, and a deposit asks no email question)";
const files = {
  [`${D}/S4-COPY-AUDIT.md`]: [
    ["- 500 minimum note NO STRING. DEPOSIT_MIN 500, MAX 2,000,000.", "- 500 minimum note NO STRING. DEPOSIT_MIN 500 (⚠️ TZS 1,000 since the owner's ruling of 2026-10-07), MAX 2,000,000."],
    ["hii ni hatua ya mara moja kabla ya amana yako ya kwanza.\"", `hii ni hatua ya mara moja kabla ya amana yako ya kwanza." ${R}`],
    ["`depositStarted` \"Amana imeanza\" → \"Malipo yameanza\" (journey screens).", "`depositStarted` \"Amana imeanza\" → \"Malipo yameanza\" (journey screens). (`verifyGateTitle`'s change is moot since 2026-10-07: the gate is deleted.)"],
  ],
  [`${D}/S6-PLAN.md`]: [
    ["`footer` and `[data-testid=email-verify-banner]`;", "`footer` and `[data-testid=email-verify-banner]` (deleted by the owner's ruling of 2026-10-07: 2.9 reads which tree it runs on);"],
    ["This is a per-viewer server decision, so it is stable across soft navigation. The deposit page's own EmailVerifyGate still gates.", `This is a per-viewer server decision, so it is stable across soft navigation. The deposit page's own EmailVerifyGate still gates. ${R}`],
    ["   SHELVED rows: EmailVerifyBanner for journey viewers;", "   SHELVED rows: EmailVerifyBanner for journey viewers (deleted with the bar, 2026-10-07);"],
    ["- test:simple-journey-flag '10.shell.emailbar' (new): the bar is present for classic and absent for journey.", "- test:simple-journey-flag '10.shell.emailbar' (new): the bar is present for classic and absent for journey. (Flipped by money doors' release with the owner's ruling of 2026-10-07: no shell mounts the bar, for any viewer.)"],
    ["- **No email bar for journey viewers before S9's inline code.**", "- **No email bar for journey viewers before S9's inline code.** (⛔ Superseded by the owner's ruling of 2026-10-07: no viewer has the bar, and S9 asks no code.)"],
    ["- No gate pins EmailVerifyBanner (grep of scripts/ finds nothing).", "- No gate pins EmailVerifyBanner (grep of scripts/ finds nothing). (WP7 then pinned it, `10.shell.emailbar`; the bar is deleted on 2026-10-07.)"],
  ],
  ["docs/MOBILE-VISUAL-PLAN.md"]: [
    ["the **email-verify bar is deliberately not dismissible**, only collapsible", "the **email-verify bar is deliberately not dismissible**, only collapsible (⛔ deleted by the owner's ruling of 2026-10-07)"],
    ["EmailVerifyBanner `:333` (collapsible, never dismissible) ·", "EmailVerifyBanner `:333` (collapsible, never dismissible; ⛔ deleted 2026-10-07, the owner's ruling) ·"],
  ],
};
let total = 0;
for (const [rel, pairs] of Object.entries(files)) {
  const p = `${repo}/${rel}`;
  const raw = fs.readFileSync(p, "utf8");
  const crlf = raw.includes("\r\n");
  let t = raw.replace(/\r\n/g, "\n");
  for (const [a, b] of pairs) {
    const n = t.split(a).length - 1;
    if (n !== 1) throw new Error(`${rel}: ${JSON.stringify(a.slice(0, 60))} occurs ${n}x`);
    t = t.replace(a, b);
    total++;
  }
  fs.writeFileSync(p, crlf ? t.replace(/\n/g, "\r\n") : t);
}
console.log(`noted ${total} lines`);
