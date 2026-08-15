# SESSION PROMPT — THE LAST REFUSAL TRANCHE · ⚪ SHIPPED, REMAINDER FOLDED IN, 2026-08-15

> ⛔ **DO NOT PASTE THIS.** The tranche shipped and is live. Its three unmet DoD items were
> folded into [`SESSION-PROMPT-FINISH-LINE.md`](SESSION-PROMPT-FINISH-LINE.md) — units **F, G, H**
> — rather than left here, because a prompt that still reads live sends a session to redo
> finished work.
>
> ⭐ **It was deliberately NOT emptied when its own §4 said to.** That was the right call: two DoD
> items were unmet, and emptying would have said otherwise. This pointer preserves that honesty
> while removing the "paste me" surface.

## ✅ Shipped and live (`254986b5` · `64d82b86` · `436ae4fc` · `660e03e3`)

- **Wallet** — `deposit_limit`, `sof_required`, `withdraw_below_min`, `kyc_required`, plus a
  registry row for `email_unverified`, which had a distinct server code since the email gate
  shipped and **nothing rendering it**. `tzsFigures` is deleted: the withdrawal minimum's figures
  are `detail` numbers, not a regex over the server's English.
- **KYC** — nine refusals in `kyc-service.ts` emit reasons; eight phrase tests deleted.
- **The five banners** — all render through the registry via `src/lib/failure-banner.ts`;
  `test:feedback-law` §8's `CEILING` went **5 → 0** in the same commit.
- **§10 sees both channels in one denominator**, with controls that fail if the two patterns are
  ever collapsed into one.
- `test:failure-reasons` 152 → **209** · `red:failure-reasons` 16 → **18/18** · `test:cert-d3`
  27/27 · production verified 200 in EN/SW/ZH, logs clean.

## 🔴 The three findings worth more than the tranche — carried forward, not lost

- **§2.3's premise was wrong, and mapping the code made it look solved.** No service emitted
  `DOC_IMAGE`, `DOC_TOO_LARGE`, `DOCS_LOCKED`, `NIDA_TAKEN` or `NO_EXTRA_REQUEST` — those rows
  were unreachable. Where mapped codes *are* emitted they are minted in the **action layer by
  phrase-matching the service's English**, so the defect moved one layer up rather than being
  removed. → `FINISH-LINE` **unit G**.
- **`?error=` was a phishing surface**, not merely a translation gap: it rendered whatever the
  query string said, so a link could put any sentence in a styled first-party alert in front of a
  signed-in player. Keying the channel closed it — `bannerFor` renders nothing for a key it does
  not know. ✅ Closed.
- **The RED harness printed "tree restored" and had not** — a hard-coded restore list of six
  files left two mutations on disk in a green tree. Root-fixed (snapshot on first touch);
  recorded at [`FAILURE-INVENTORY.md`](FAILURE-INVENTORY.md) §3.9. **This is what let `if (true)`
  reach production.** → the rest of the fleet is `FINISH-LINE` **units A–E**.

⭐ **Housekeeping done:** the isolated worktree `C:\kipindi-tranche` has been removed.
