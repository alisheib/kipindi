# SESSION PROMPT — THE LAST REFUSAL TRANCHE

> ⚠️ **NOT EMPTIED, AND THAT IS THE POINT.** §4 said to empty this file when done. The tranche
> shipped and is live at `660e03e3`, but two items of the definition of done were **not** met.
> Emptying it would have said otherwise. What is left is below, and it is small.

## ✅ Shipped and live (2026-08-15, `254986b5` · `64d82b86` · `436ae4fc` · `660e03e3`)

- **Wallet** — `deposit_limit`, `sof_required`, `withdraw_below_min`, `kyc_required`, and a
  registry row for `email_unverified`, which had a distinct server code since the email gate
  shipped and **nothing rendering it**. `tzsFigures` is deleted: the withdrawal minimum's two
  figures are `detail` numbers, not a regex over the server's English sentence.
- **KYC** — nine refusals in `kyc-service.ts` emit reasons; eight phrase tests deleted.
- **The five banners** — all render through the registry via `src/lib/failure-banner.ts`;
  `test:feedback-law` §8 `CEILING` 5 → **0** in the same commit.
- **§10 sees both channels in one denominator**, with controls that fail if the two patterns
  are ever collapsed into one.
- `test:failure-reasons` 152 → **209** · `red:failure-reasons` 16 → **18/18** ·
  `test:cert-d3` → 27/27 · build green · production verified 200 in EN/SW/ZH, logs clean.

## ⏳ WHAT IS LEFT — three things, all named honestly

1. **`loss limit` is the last INVALID family still recovered from prose.** Its service has not
   been taught to emit a reason. `INVALID` and `SUSPENDED` stay deliberately unmapped.
   ⛔ **This is why `RULES.md` §2.9 still carries its ⏳** — do not delete that marker until
   this is closed and verified on production.

2. **The driven frames are INCOMPLETE.** `npm run qa:refusal-frames` exists and is wired in.
   Its locale half passes **12/12** — `kp-locale` on the Playwright context, `<html lang>` read
   back, and a refusal to capture on mismatch. Its **drive** half does not: the banner surfaces
   reachable without a valid reset token are gated client-side (close-account disables its
   button until the text matches) or post through the kit `Select`'s hidden input. ⛔ Do not
   "fix" this by navigating straight to `?reason=…` — that proves the renderer renders and
   nothing else. Either mint a real reset token via the dev-test helpers, or drive
   `/profile/kyc` submit-for-review with fewer than three documents.

3. **`red:all` still exits 1 on `red:updown-readiness`'s five stale anchors** — pre-existing,
   filed at `FAILURE-INVENTORY.md` §7.2c, and unrelated to this tranche. Because that chain is
   `&&`, every guard after it is starved.

## 🔴 Three findings worth more than the tranche

- **§2.3's premise was wrong, and mapping the code made it look solved.** No service emitted
  `DOC_IMAGE`, `DOC_TOO_LARGE`, `DOCS_LOCKED`, `NIDA_TAKEN` or `NO_EXTRA_REQUEST` — those rows
  were unreachable. Where the mapped codes *are* emitted (`PW_WEAK`, `VOTING_CLOSED`,
  `EMAIL_TAKEN`, …) they are minted in the **action layer** by phrase-matching the service's
  English, so the defect was moved one layer up rather than removed. **Still open.**
- **`?error=` was a phishing surface, not just a translation gap.** It rendered whatever the
  query string said, so a link could put any sentence in a styled first-party alert box in
  front of a signed-in player. Keying the channel closed it; `bannerFor` renders nothing for a
  key it does not know.
- **The RED harness printed "tree restored" and had not** — its restore set was a hard-coded
  list of six files. Two mutations were left on disk in a green tree. Fixed at the root
  (snapshot on first touch); recorded at `FAILURE-INVENTORY.md` §3.9.

## ⚠️ Housekeeping

An isolated worktree was used, per `PARALLEL-SESSION-COORDINATION.md`'s mandatory-isolation
rule, because a second session was live in `C:\kipindi-main` and editing `i18n-dict.ts` and
`market-service.ts` at the same time:

    C:\kipindi-tranche   branch tranche/refusal-2-9   (merged to main at 660e03e3)

⛔ It still exists and has its own `node_modules`/`.next`. Remove it when convenient:
`git worktree remove C:\kipindi-tranche --force`.
