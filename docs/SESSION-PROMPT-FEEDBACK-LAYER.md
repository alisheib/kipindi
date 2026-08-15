# SESSION PROMPT — THE FEEDBACK LAYER · ✅ SPENT, 2026-08-15

> ⛔ **THIS PROMPT IS DONE. DO NOT PASTE IT.** It is kept only as a pointer, because a spent
> prompt that still reads as live sends the next session to redo finished work — which is the
> failure its own §8 asked to be prevented, so emptying it is the last step of the work itself.

**What it commissioned, and where the result lives:**

| The ask | Where it landed |
|---|---|
| A stated law for what an action answers with | [`docs/DESIGN_AUTHORITY.md`](DESIGN_AUTHORITY.md) **§F** (F1–F8) |
| The action × channel matrix | [`docs/FAILURE-INVENTORY.md`](FAILURE-INVENTORY.md) **§6** — 171 server actions, opened at their call sites |
| The 8 surfaces that said only that something failed | fixed, EN + SW + ZH, at the severity §F assigns |
| The Up & Down bet confirmation modal (§5b) | **UD-22** — `src/components/updown/updown-bet-receipt-modal.tsx` |
| A gate, RED-proven | `npm run test:feedback-law` (130) · `npm run red:feedback-law` (21/21) |
| Dwell times for win/loss (added by Ali mid-session) | `src/lib/updown-receipt.ts`'s sibling `src/lib/feedback-timing.ts`; law at §F8 |

**The two live defects it found, which no gap-list would have:** a background poll firing the
money-settled haptic on a page render *and over LOSS notifications*; and the push opt-OUT
discarding the server's `{ ok: false }` while telling the player push was off.

**What it deliberately left open** — five player surfaces render a raw server sentence as a JSX
banner, a channel `test:failure-reasons` §10 structurally cannot see. That is
`FAILURE-INVENTORY` §2.3's wallet/KYC/auth tranche. `test:feedback-law` §8 ratchets it at **5**.

**Full record:** `docs/LIVE-QA-CAMPAIGN.md` §6b, session 45.
**The next commission is** [`docs/SESSION-PROMPT-LABELLING.md`](SESSION-PROMPT-LABELLING.md).
