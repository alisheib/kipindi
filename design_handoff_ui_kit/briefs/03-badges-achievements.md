# Request #3 — Badges & achievements system

## What we want
An **achievements & badges system** that rewards engagement and creates identity/status — a sibling to our existing **TierBadge** (bronze → silver → gold → diamond → sovereign; see `kit/avatar-and-tierbadge.reference.tsx` + `.tier-*` classes in `globals.reference.css`). Tiers are *ranking*; achievements are *milestones*. They must look like one family.

## Constraints
- **Same visual family as TierBadge**: heraldic, gilt-on-royal, line-art icon inside a coin/shield. No full-color illustration, no emoji.
- Badge icons in the **EmptyState line-art style**: `viewBox="0 0 56 56"`, `stroke="currentColor"`, teal stroke + a single `--gold-400` accent, no fills.
- Three badge **states**: `locked` (desaturated/outline, ghosted), `unlocked` (full gilt), `in-progress` (shows progress, e.g. ring fill or "3/5").
- OKLCH tokens only; reuse `--gold-*`, `--royal-*`, `--claret-*`, `--aqua-*`.

## The achievement set (propose final list + names in EN · SW)
Cover our actual product loops. Suggested milestones — refine/extend:

- **First Prediction** · placed your first bet
- **First Win**
- **Sharp** — accuracy ≥ X% over ≥ N settled predictions (skill badge)
- **Hot Streak** — N wins in a row (ties into request #4 streaks)
- **Market Maker** — your proposal got listed
- **Oracle** — your listed proposal resolved correctly
- **Connector** — referred your first friend / 5 / 25 (referral milestones — tiers within one badge)
- **High Roller** — cumulative stake milestone
- **Day One** — joined in the launch window (time-bound, collectible)
- **Verified** — completed KYC (ties to existing ShieldCheck language)

For each: name (EN · SW), the line-art icon concept, unlock condition, and rarity/weight.

## Please specify
1. The **`<Badge>` component**: props (`achievement`, `state: locked|unlocked|progress`, `progress?`, `size`), in the prop-style of our kit atoms. Plus a `<BadgeShelf>` / grid for the profile.
2. **Where they live**: a section on `/profile` (a badge shelf), a small badge cluster on the leaderboard row next to the TierBadge, and on the public share/OG card.
3. The **unlock moment**: an `<AchievementToast>` / celebration when a badge unlocks — reuse `celebrate-pop` + `seal-impress` + the `celebrate` haptic. Keep it a quick, classy "seal stamped" beat, not a slot-machine.
4. The **line-art SVGs** for each badge (inline, on-theme).
5. CSS: `.badge`, `.badge--locked/unlocked/progress` as additions to `globals.css`, mirroring how `.tier-*` is structured.

## Deliverable
- Spec doc: the final achievement list + the component/states + placement.
- The SVG icon set (line-art, on-theme).
- `globals.css` additions for badge styling + the unlock animation (with reduced-motion branch).
- `<Badge>` / `<AchievementToast>` component sketches.
