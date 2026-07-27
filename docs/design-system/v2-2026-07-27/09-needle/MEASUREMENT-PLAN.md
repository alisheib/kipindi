# The Needle — measurement plan & kill criteria

**Owner:** product · **Window:** 14 days from launch · **Decision date:** day 15

This document exists so the Needle is not kept on faith. It states in advance what
would prove it works, what would prove it does not, and what happens in each case.
Agreeing the thresholds **before** the data arrives is the whole point.

---

## 1 · What is already instrumented

`onInteraction` fires once per completed interaction (never per frame) with:

```js
{ turns, bounces, spinSeconds, presence, record }
```

`presence` is the session-length signal (0 = just arrived, 1 = an hour or more), so
every event is already tagged with how long the player had been going. Nothing further
needs building.

Recommended event name: `needle_interaction`. Recommended additional context from the
app: `route`, `sessionMinutes`, `deviceType`, and whether the player had a position
settle in the last five minutes.

---

## 2 · The four questions, and the numbers that answer them

### Q1 · Does anyone touch it at all?
**Metric:** % of sessions with ≥1 `needle_interaction`.

| Result | Reading |
|---|---|
| **< 3%** | Nobody has found it or nobody cares. **Kill it** (see §4). |
| 3–8% | Niche but real. Keep, do not invest further. |
| **> 8%** | Genuinely used. Keep and consider surfacing it in onboarding. |

### Q2 · Is it used when it matters — late in a session?
This is the question the object was built to answer. Split interaction rate by
`presence`:

| Result | Reading |
|---|---|
| Rate at presence > 0.6 is **higher** than at presence < 0.2 | **Working as designed.** The presence ramp is doing its job. |
| Flat across presence | The ramp is decorative. Keep the object, but stop claiming it is a responsible-play feature until this changes. |
| Rate *falls* with presence | People are tuning it out precisely when it matters. Rethink presence, not the object. |

### Q3 · Does it substitute for anything?
**Metric:** in sessions with ≥1 interaction, compare stake frequency in the 10 minutes
after an interaction against the same player's baseline.

A measurable slowdown is the strongest possible evidence and would justify real
investment. **Do not expect it** — a null result here is normal and is not a failure of
the object.

⚠ Do not use this metric to argue the Needle *increases* engagement. If that turns out
to be true, that is a reason to re-examine it, not to celebrate.

### Q4 · Is it in the way?
**Metrics:** rage-clicks within 80px of it, and mis-taps on controls beneath it.

| Result | Action |
|---|---|
| Any measurable increase in mis-taps | Fix immediately — the pointer-transparency contract is broken. Treat as P1. |
| Support tickets mentioning it | Read every one. Even three matter here. |

---

## 3 · Guardrails — non-negotiable

- **No A/B test that gamifies it** to lift the numbers. If the honest version fails, it
  fails.
- **Never display the personal best**, even as an "experiment." Rule 7 of the brief.
- **No push notification, ever**, to drive discovery.
- If compliance objects to any measurement here, compliance wins.

---

## 4 · Kill criteria, agreed in advance

Remove the Needle if, after 14 days, **any** of these hold:

1. Interaction rate < 3% of sessions.
2. Any measurable increase in mis-taps on controls beneath it.
3. Interaction rate is flat or falling with session length **and** < 5% overall — it
   would then be neither used nor purposeful.
4. Compliance withdraws support.

**Killing it is a good outcome, not a failure.** It costs one file deletion and one
`<Needle />` removal, the archive keeps the full record, and the team learns something
true. The alternative — carrying a beautiful object nobody touches because it was
expensive to build — is worse.

---

## 5 · If it succeeds

In priority order, and only then:

1. Compliance sign-off written up and filed (see `COMPLIANCE-MEMO.md`).
2. Onboarding mention — one line on the responsible-play card, no tour, no popup.
3. Native haptics wrapper for real amplitude control (spec §11 limitation).
4. Nothing else. Resist every feature request in brief §9.
