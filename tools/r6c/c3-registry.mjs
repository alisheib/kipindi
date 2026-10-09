// C3: re-pin r5c's REGISTRY for the widened census (the warning family's every spelling) — counts per file, the rulings
// that the new sites extend, and the four files it now sees. CRLF kept; every target must match exactly once.
import { readFileSync, writeFileSync } from "node:fs";
const F = "F:/kipindi-r6c/scripts/visual-pass-r5c.test.mts";
let s = readFileSync(F, "utf8");
const once = (from, to) => {
  const n = s.split(from).length - 1;
  if (n !== 1) throw new Error(`expected once, found ${n}: ${from}`);
  s = s.replace(from, to);
};
const COUNTS = {
  "src/app/agent/apply/apply-client.tsx": [2, 7],
  "src/app/auth/login/page.tsx": [7, 8],
  "src/app/auth/register/register-form.tsx": [3, 5],
  "src/app/globals.css": [94, 97],
  "src/app/markets/[id]/page.tsx": [5, 8],
  "src/app/motion.css": [22, 23],
  "src/app/profile/kyc/page.tsx": [4, 8],
  "src/app/profile/page.tsx": [3, 5],
  "src/app/profile/security/security-client.tsx": [2, 4],
  "src/app/profile/source-of-funds/page.tsx": [1, 3],
  "src/components/kyc/kyc-gate-panel.tsx": [2, 6],
  "src/components/markets/objection-dialog.tsx": [2, 5],
  "src/components/markets/operation-result-modal.tsx": [7, 9],
  "src/components/markets/resolution-panel.tsx": [5, 9],
  "src/components/ui/callout.tsx": [7, 18],
  "src/components/ui/dot.tsx": [3, 4],
  "src/components/ui/notice-bar.tsx": [6, 8],
  "src/components/ui/password-input.tsx": [4, 5],
  "src/lib/score-band.ts": [2, 3],
};
for (const [f, [a, b]] of Object.entries(COUNTS)) once(`"${f}": [${a}, `, `"${f}": [${b}, `);
// Rulings the newly counted sites extend.
once(`"an officer's request · a rejected document to replace — the applicant acts"]`,
  `"an officer's request · a rejected document to replace — the applicant acts (round 6, C3: the rejected slot's frame, wash, glyph disc and word)"]`);
once(`"a settled WIN's status word and payout (§M3) · the resolved seal (§B11) · the hedge caution, the token's ×2"]`,
  `"a settled WIN's status word and payout (§M3) · the resolved seal (§B11) · the hedge caution's box and words, the token's ×5"]`);
once(`"the gilt material — gilt-metal on deposit doors and the celebration, gilt-ink on earned figures, the win toast's tint; dead: \`.m-skeleton\`"]`,
  `"the gilt material — gilt-metal on deposit doors and the celebration, gilt-ink on earned figures, the win toast's tint; the warning toast's tint (\`.mat-tint-warn\`, the token's); dead: \`.m-skeleton\`"]`);
once(`"sign-in refusals the player can fix (F3 severity warning)"]`,
  `"sign-in refusals the player clears — wait, sign in again, use the password, create the account, ask us about a closed one (F3 severity warning) · their box's frame and wash; the break's panel is neutral since round 6 (C4)"]`);
// The four files the census now sees, in the warning family's section.
const NEW = [
  `  "src/app/auth/forgot-password/page.tsx": [2, "the rate-limit box's frame and wash — a refusal the player clears by waiting, as sign-in's (its words the muted ink since R4-I) (round 6, C3)"],`,
  `  "src/app/profile/account/privacy-request-form.tsx": [2, "the erasure request's caution — what an irreversible erasure keeps by law, read before sending (as the declaration's attestation caution) (round 6, C3)"],`,
  `  "src/components/rg/limit-usage.tsx": [1, "THE one limit ramp's caution step, 75–90% of a limit the player set (R5-C, the ramp's own note) — never gilt type, the owner's token (round 6, C3)"],`,
  `  "src/components/ui/maintenance-badge.tsx": [1, "the maintenance flag's 'back shortly' amber, the Callout's maintenance tone (round 6, C3)"],`,
];
const ANCHOR = `  // ── OWNER: classic chrome (frozen for S6/S7) and the hashed legal texts`;
once(ANCHOR, `  // Round 6 (2026-10-09, review C3): the files the census saw only once it counted the warning family's every spelling.\r\n${NEW.join("\r\n")}\r\n${ANCHOR}`);
writeFileSync(F, s);
console.log("registry re-pinned:", Object.keys(COUNTS).length, "counts,", NEW.length, "new files");
