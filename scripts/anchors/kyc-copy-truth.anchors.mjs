/**
 * Mutation anchors for `red:kyc-copy-truth` — the identity-copy guard (2026-09-13).
 *
 * ⛔ A SIDECAR, NOT AN INLINE ARRAY. `test:red-anchors` §3 re-resolves every anchor below on every run
 * WITHOUT executing the harness, so a rewritten sentence is caught the day it lands rather than the next
 * time somebody runs the fleet.
 *
 * ── ⭐ WHAT THIS FLEET HAS TO PROVE ──────────────────────────────────────────────────────────────────
 *
 * `test:kyc-copy-truth` holds four rules over its populations (the dictionary, every file under
 * `src/app/legal/`). A copy guard is ALL negative assertions — "no string says X" — and a negative
 * assertion passes for free the day its population goes empty or its pattern goes blind. So each case
 * below plants one false sentence in REAL product copy, in a place the guard claims to read, and must be
 * caught by the ONE assertion that names that file, that locale and that rule:
 *
 *   1. rule 1 in a file the 2026-09-07 walker could never see — `_content-yes-no.tsx` is not a
 *      `page.tsx` and is indented four spaces, so the old reader skipped it in both ways at once;
 *   2. rule 2 — the 2026-09-05 sentence, verbatim, back in the BINDING English terms §3;
 *   3. rule 2 in the dictionary — the quiet first-deposit notice made to say identity opens the door;
 *   4. rule 3 — the Gaming Board given as the reason for identity, the attribution deleted twice before
 *      (withdraw `verifyFirstBody`, deleted 2026-08-20, and help `faq4a` — both tombstones are in i18n-dict.ts);
 *   5–7. rule 4 (2026-09-14) — the retired withdrawal hold ("held for compliance review, up to 24 hours") back
 *      in the wallet's pending hint, once per locale, each caught on `§6 dict · <locale> · rule 4`. The hint is
 *      NOT one of rule 4's proven surfaces (`common.withdrawalUnderReview` / `common.amlReviewBody`), so these
 *      also prove the surface allow-list excuses by key and never by wording.
 *
 * ⚠️ `to` STRINGS STAY VALID SOURCE. A syntax error in the dictionary would crash the suite on import,
 * and a crash prints no FAIL line — the harness would call that red on the wrong assertion.
 */
const YES_NO = "src/app/legal/rules/_content-yes-no.tsx";
const TERMS = "src/app/legal/terms/page.tsx";
const AML = "src/app/legal/aml/page.tsx";
const DICT = "src/lib/i18n-dict.ts";

export const MUTATIONS = [
  {
    name: "denial-in-the-rules-document",
    why: "The 2026-09-07 defect in the population it hid in. The YES/NO rules' eligibility item gains "
       + "\"Identity verification is not required to withdraw.\" — the terms §3 sentence of that date. "
       + "`_content-yes-no.tsx` is binding player copy the old walker never opened (not `page.tsx`, and its "
       + "locale blocks sit at four spaces), so this proves the population fix, not only the pattern.",
    file: YES_NO,
    from: `<strong className="text-text">Identity verification (KYC) is required</strong> before your first withdrawal.`,
    to: `<strong className="text-text">Identity verification (KYC) is required</strong> before your first withdrawal. Identity verification is not required to withdraw.`,
    check: `§2 ${YES_NO} · en · rule 1`,
  },
  {
    name: "terms-section-3-back-to-the-entrance",
    why: "🔴 The regression a reader of an older document is most likely to write \"for safety\": terms §3 "
       + "restored to its 2026-09-05 wording. It is a REQUIREMENT, so rule 1 (a denial rule) is blind to it "
       + "by design — only rule 2 can see it, and it is the binding English text.",
    file: TERMS,
    // 2026-09-13 · the {" "} is the explicit space the build otherwise dropped ("requiredbefore", live).
    from: `Identity verification is <strong>required</strong>{" "}before your first withdrawal. You`,
    to: `Identity verification is <strong>required</strong>{" "}before you can deposit, place a bet or withdraw. You`,
    check: `§2 ${TERMS} · en · rule 2`,
  },
  {
    name: "first-deposit-notice-opens-the-door",
    why: "The one identity notice a depositing player sees (Ali's quiet rule, 2026-09-13) rewritten to the "
       + "old KycGatePanel body. The key exists, the component renders, every layout guard stays green — "
       + "and the sentence tells a player who has ALREADY paid in that verifying is what let them.",
    file: DICT,
    from: `body: "Verify your identity anytime before your first withdrawal.",`,
    to: `body: "Verify your identity to add money, play and cash out.",`,
    check: "§3 dict · en · rule 2",
  },
  {
    name: "gaming-board-given-as-the-reason",
    why: "A true sentence with a false authority appended. Identity at withdrawal is the OWNER's ruling "
       + "(docs/COMPLIANCE-DECISIONS.md 2026-09-13) and the AML page's own §1 — the Board's instruction of "
       + "2026-08-19 contradicts attributing it to them. Rules 1 and 2 both pass this sentence; only rule 3 "
       + "can see it.",
    file: AML,
    from: `We verify the identity of every account holder before their first withdrawal.`,
    to: `We verify the identity of every account holder before their first withdrawal, as the Gaming Board of Tanzania requires.`,
    check: `§2 ${AML} · en · rule 3`,
  },
  // ── rule 4 (2026-09-14) — the retired withdrawal hold, back in the one wallet line every player reads ──
  {
    name: "withdrawal-hold-restored-en",
    why: "The owner ended the withdrawal hold on 2026-09-13 (WITHDRAWAL_AML_HOLD = false). The wallet's pending "
       + "hint made to describe it again — a withdrawal held for compliance review for up to 24 hours. Rules 1-3 "
       + "pass it (it names no identity); only rule 4 can see it. It lands in `common.pendingHoldHint` — a sibling of "
       + "both surface keys in the same namespace — and surfaces excuse by exact key, so the allow-list must not "
       + "excuse it either.",
    file: DICT,
    from: `pendingHoldHint: "Withdrawals on their way",`,
    to: `pendingHoldHint: "Withdrawals on their way — amounts of TZS 1,000,000 or more are held for compliance review for up to 24 hours",`,
    check: "§6 dict · en · rule 4",
  },
  {
    name: "withdrawal-hold-restored-sw",
    why: "The same claim in natural Swahili — a passive of kagua (\"is reviewed\") beside kutoa and \"hadi saa 24\". "
       + "Swahili is where a claim like this survives an English-only review; the case proves the Swahili pattern, "
       + "not the English one, is what catches it.",
    file: DICT,
    from: `pendingHoldHint: "Kutoa kunaendelea",`,
    to: `pendingHoldHint: "Kutoa kunaendelea — kiasi cha TZS 1,000,000 au zaidi kinakaguliwa na timu ya uzingatiaji hadi saa 24 kabla ya kulipwa",`,
    check: "§6 dict · sw · rule 4",
  },
  {
    name: "withdrawal-hold-restored-zh",
    why: "The same claim in Simplified Chinese — 合规团队审核 and 最长需要 24 小时 in the clause that names 提现. "
       + "The live hint opens with 尚未 (\"not yet\"), a NEGATION inside the planted unit: a check that looked for a "
       + "denial anywhere in the string would excuse the claim. Chinese has no word boundaries, so rule 4 reads a "
       + "clause and a 10-character window before the claim, and this case proves that window does not reach it. "
       + "(2026-09-14: the anchor followed the hint's rewording from 处理中的提现 to 尚未到账的提现.)",
    file: DICT,
    from: `pendingHoldHint: "尚未到账的提现",`,
    to: `pendingHoldHint: "尚未到账的提现 — 100 万先令及以上的提现须经合规团队审核，最长需要 24 小时",`,
    check: "§6 dict · zh · rule 4",
  },
];
