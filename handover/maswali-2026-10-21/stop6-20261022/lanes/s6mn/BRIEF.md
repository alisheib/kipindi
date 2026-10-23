# Lane S6-MN — S6's money and delivery paths: S6-MONEY then S6-NOTICES (finish both) — lead ali-7e on ALI-BLADE15, 2026-10-22

> ⭐ 2026-10-23 ~02:40 EAT: Ali switched Millionea ON for everyone on production (FEATURE_MILLIONEA=ACTIVE, live on main
> 3aecf0edd = the S5 release). Nothing sells until the Owner's steps and an open week (earliest Monday 00:00 EAT). Your
> two lanes must be on main BEFORE THE FIRST WEEKEND SETTLEMENT: the float checked before crediting (MB-11), the locked
> winner's payout (OD-13), the winner notices (M-2 and the rest). Work fast, never loosely: every money rule below holds.
> Merge `origin/claude/maswali-s6-release` into each lane first (it carries S7 and the S5 release on main).

- Two lane branches, one after the other, each in its own worktree you create:
  `git -C C:/kipindi-main fetch origin`, then
  `git -C C:/kipindi-main worktree add -b claude/maswali-s6-money C:/kipindi-mln-s6money origin/claude/maswali-s6-money` and
  `git -C C:/kipindi-mln-s6money branch --set-upstream-to=origin/claude/maswali-s6-money`; the same later for
  `claude/maswali-s6-notices` in `C:/kipindi-mln-s6not`.
- Step names `S6-MONEY <n>` (next 3) and `S6-NOTICES <n>` (next 5) · scratch
  `C:/Users/Ali/AppData/Local/Temp/claude/C--Users-Ali/22b71bac-cd55-4164-a2d1-012a5a83c1c2/scratchpad/lanes/s6mn/`.
- Read FIRST: `../LANE-COMMON-BLADE.md` (this machine's rules — no Node here; every check through the remote runner).
- Then (git show from `origin/maswali-handover-20261021`, folder `handover/maswali-2026-10-21/`):
  `stop5-20261022/briefs/S6-MONEY.md` and `stop5-20261022/briefs/S6-NOTICES.md` (the items and the lead's BINDING rulings,
  with the exact texts), `stop5-20261022/briefs/S6.md`, the S6 parts of `stop5-20261022/lead/NOTES.md`, and
  `lanes-20261022/s6/` (the reviews' replacement texts, e.g. `words/`, `spec-m2-draft.json`).
- Each lane's last commit message holds its exact "what is left, in order": MONEY `7823a9685` (OD-13's officer payment of a
  locked winner's share — the Postgres half, tsc, plants SM2…SM10, rbac 25→26 by the printed count, readers, records; then
  MB-11 and MB-35 not started; MB-69 per the brief), NOTICES `6499c7c88` (M-2's code written, not run: the card's
  capped/deferred words, cases §11f on both stores, plants after (N22), records, the heavy batch).
- The S6 integrator works on `claude/maswali-s6-release` in `C:/kipindi-mln-s6` (merging S7, LINT, ADMIN, DOCS). Before you
  start each lane, merge the integrator's current head into it (`git merge --no-ff origin/claude/maswali-s6-release`;
  never rebase) so your checks run on what will be integrated; merge it again whenever it moves.

## The rules that bite here (AGENTS.md §6 — money)
A money path is done only when a committed test proves all five on BOTH stores (memory and PostgreSQL): conservation (in =
out + house, to the shilling), no negative balance even under concurrency, idempotent (a replayed key applies once),
audited, race-safe (the chain lock and the wallet lock in the platform's order; cross-instance on PostgreSQL). Each guard
has its red-twin plant in `scripts/anchors/maswali-money-path.anchors.mjs` (unique names) and the red run shows it caught.
Wallet lock before market lock; rates frozen per week; never a thrown boot.

## Order
1. MONEY: finish OD-13's act to green on both stores (its list 1–5), then MB-11 (the float checked BEFORE crediting; the
   alert visible to Finance and Compliance), MB-35 (an alert when a cluster holds a winner), MB-69 (the rules version
   stamped on each ticket at purchase) — each with cases, plants, readers, records. Tell the lead when a commit is ready.
2. NOTICES: M-2 to green (its list 1–5), then the brief's remaining items (L-1…L-6, L-9, L-10, MB-44's texts, the notices
   reading the `millionea` namespace, zh letters, the held word, royal chrome with no buttons, the win's pool/fee/"shared
   by", OD-13's sentence switched to the act once MONEY's act exists, and M-4's timed runs on the runner).
Public-repo rule: harm/anti-abuse controls are described by what they enforce, never what they read or their thresholds.

## Done means
Both lanes' lists done; tsc 0; every reader on both stores at or above its floor; every new plant caught; pushed. Then
your report (LANE-COMMON-BLADE's six points) per lane, and what the integrator must do at each merge.
