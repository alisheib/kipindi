# Request #4 — Optional stretch (only if it stays on-theme)

These compound with #1–#3. Pick up any that excite you; skip any that would force off-kit choices.

1. **Streaks** — a daily-engagement / win-streak treatment (a small flame-free, gilt "streak" indicator — keep it heraldic, not a fire emoji). How it shows on profile + the streak-saved/streak-broken moments (motion + haptic). Feeds the "Hot Streak" badge.

2. **Levels / XP (light)** — a subtle progression rail (XP from predicting, winning, proposing, referring) that drives the TierBadge promotion. A thin gilt progress rail + "level up" moment (reuse `seal-impress` + `celebrate`). Keep it optional and unobtrusive — we are a licensed market, not a game.

3. **Celebration moments, leveled** — define a small ladder of celebration intensity so big wins feel bigger than small ones, all from existing keyframes:
   - micro (small win): `count-up-flash` + `success` haptic
   - standard (win): `win-burst` + `celebrate-pop`
   - rare (big win / jackpot pool / badge unlock): full `win-confetti` + `seal-impress` + `celebrate` haptic
   Specify the thresholds and which assets each tier uses.

4. **The 4 missing EmptyState illustrations** — our `EmptyState` kit (`kit/empty-state.reference.tsx`) has line-art kinds for markets/positions/leaderboard/notifications/audit/sources/default but lacks: **transactions/wallet activity**, **resolver queue (two-officer)**, **AML review**, **compliance / source-of-funds**. Draw these 4 in the exact same style (`viewBox 0 0 56 56`, teal stroke + gold accent) so we can add them as new `kind`s.

5. **"Sound & feedback" settings surface** — a clean settings card (on `/profile/responsible-gambling` or a new row) where the user toggles haptics, motion, and (future) sound. On-kit, bilingual.

## Deliverable
Whatever you tackle: spec + on-theme assets/CSS using our tokens, with reduced-motion/haptic-off branches. Clearly label anything that would need a product decision from us before build.
