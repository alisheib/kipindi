# The Needle — responsible-play memo

**For:** compliance & regulatory affairs · **From:** design
**Status: DRAFT FOR REVIEW — not approved.** Design cannot self-certify a
responsible-play claim. This is a starting point for compliance to correct, not a
sign-off.

---

## 1 · What it is, plainly

The Needle is a small physical object rendered on the edge of the 50pick app: a disc
built from the company mark, with a needle on a pivot. A player can drag it, throw it
and spin it. It is a fidget toy — nothing more.

It holds no stake, resolves no market, pays nothing, and awards nothing. Its state is
stored on the player's own device (position, and whether they have seen its first-run
notice). It does not appear on any screen where money is being committed.

## 2 · Why it exists

Real-money prediction markets can absorb attention. A long session narrows focus, and
narrowed focus is where poor decisions live. Most operator responses to this are
informational — a limit form, a link, a reminder banner — and all of them ask the
player to stop and read at exactly the moment they least want to.

The Needle is a different instrument: **a physical thing to do with your hands that is
not betting.** It offers a moment of pause without demanding one. Its prominence
increases with session length, so it becomes gradually more noticeable the longer a
player has been going — never blocking, never speaking, never scoring.

## 3 · The constraints designed into it

These are enforced in code and documented as rules for future engineers
(`CLAUDE-CODE-BRIEF.md` §4, rules 1–8):

| Constraint | How it is enforced |
|---|---|
| No score, streak, reward, leaderboard or currency | No such code exists. A personal best is tracked for analytics and **never displayed** (rule 7). |
| Never on a money surface | Hidden by route gate on stake entry, bet confirmation, cash-out, deposit, withdrawal (rule 1). |
| Never mistaken for a market | First-run notice states it is not a market, not a bet, and carries no prize. Its accessibility label opens with *"an optional fidget toy. Nothing here affects your account."* |
| Cannot obstruct the interface | Pointer-transparent except the object itself; sits below all dialogs; respects device safe areas. |
| No notifications, no sound | Neither is implemented, and rule 2 forbids adding them. |
| Accessible | Fully keyboard-operable, screen-reader labelled, honours `prefers-reduced-motion`. |
| Outcome-blind | The one platform event it responds to — a position settling — produces an identical response whether the player won or lost. There is deliberately no win animation (rule in §9). |

## 4 · What we are **not** claiming

Stated plainly, because overclaiming here would be worse than saying nothing:

- **We have no evidence it changes player behaviour.** None. It has not shipped.
- It is **not** a substitute for deposit limits, session limits, self-exclusion,
  reality checks, or any statutory control. It sits *beside* those on the
  responsible-play card and replaces none of them.
- It is not a clinical or therapeutic intervention and must never be described as one.
- We do not claim it reduces harm. We claim only that it is a non-betting action
  available at a moment when a non-betting action may help.

## 5 · The risk we are asking you to weigh

The honest counter-argument: **an interactive toy inside a betting app could be read as
gamification** — keeping a player in the app, hand on the screen, when they might
otherwise have closed it.

Our reasons for believing it does not:

- It cannot be won, lost, scored or compared. There is no variable reward of any kind.
- It is absent from every surface where money is committed.
- It is silent and never re-engages a player who has left.
- Its prominence grows with fatigue, not with spend or activity.

We do not think this argument settles the matter, which is why it is written down here
rather than left implicit. **If compliance judges the gamification risk to outweigh the
benefit, the object should be removed.** The removal cost is one line of code.

## 6 · Measurement, agreed before launch

`MEASUREMENT-PLAN.md` sets kill criteria in advance, including removal if interaction
falls below 3% of sessions or if any measurable increase in mis-taps appears. It also
forbids A/B testing a gamified variant to improve the numbers, and states that if
compliance objects to any metric, compliance wins.

## 7 · What we need from you

1. A decision: acceptable, acceptable with changes, or not acceptable.
2. If changes: which constraints in §3 need strengthening, and any wording changes to
   the first-run notice.
3. Confirmation of how it may and may not be described in player-facing copy and in any
   regulatory submission.
4. Written sign-off, to be filed at `07-provenance/` in the design system archive so
   the reasoning survives staff turnover.

---

**Reference material:** `09-needle/NEEDLE-SPEC.md` (§1 the line around it, §1b presence,
§1e accessibility), `09-needle/CLAUDE-CODE-BRIEF.md` (§4 hard rules, §9 refusals),
`MEASUREMENT-PLAN.md`.
