# `MASWALI-DESIGN-R2` — the Claude Design commission for Maswali Millionea, round 2

> **STATUS: 🟢 SENT at stamp `72ca5cff9` — Claude Design came back 2026-10-17 with an owner-ruling form, answered the same day (the tracker's §0); the delivery is awaited (D2).** Programme `MASWALI-BUILD`; the tracker is
> [`MASWALI-PLAN.md`](../../MASWALI-PLAN.md) (D1 sends this, D2 receives the delivery, D3 is Ali's yes or no on what it
> proposes). The design law is [`DESIGN_AUTHORITY.md`](../../DESIGN_AUTHORITY.md); this folder links to it and carries no
> copy of it, of the tokens, or of component source.

## What is in this folder

| File | What it is |
|---|---|
| [`PROMPT.txt`](PROMPT.txt) | The prompt Ali pastes into Claude Design, final. Two placeholders (`{FULL_SHA}`, `{YYYY-MM-DD}`) are filled at send time |
| [`ATTACHMENTS.md`](ATTACHMENTS.md) | How the session cuts the package live from `origin/main` and stamps it, and what Ali uploads |
| [`PREDICTED-OUTPUT.md`](PREDICTED-OUTPUT.md) | What Claude Design will most likely return, how each signature moment will look, and the ten likeliest deviations |
| [`RECEIVING.md`](RECEIVING.md) | The protocol for D2: land it outside the repository, check it mechanically, score it, put the yes-or-no items to Ali, file it |

## Why there is a round 2

Round R1 (August 2026, [`../maswali-2026-08/`](../maswali-2026-08/BRIEF.md)) was drawn for an earlier proposal: a TZS
2,000 entry, three prize tiers and no reserves. On 2026-10-16 the Product Owner's management-reviewed proposal replaced
it, and Ali ruled that every August ruling is void. R1's game rules are dead; much of its craft survives (the slip as a
document, the sticky rail, one lit control per row, the mono pool figure, the 560 receipt, the finality line), and its
canvases are attached so R2 edits rather than redraws.

Ali also asked for something R1 deliberately did not have: **a signature, animated experience no other platform has,
built from 50pick's own symbols.** §M8 reserves identity motion for the trademark, so Ali ruled a bounded channel:
Claude Design may propose **at most four new motions (N1–N4)**, each returning to him for yes or no; everything else
composes the existing motion ladder.

## The concept being commissioned

**"Daftari na Muhuri · The Register and the Seal."** *Daftari* is both the exercise book a teacher marks with ticks and
crosses and the official register. Every ticket is an entry in the week's public register; every result is stamped
onto it along the 50pick mark's own −14° axis; every shilling is a line in a ledger; only ten matching marks in an
unbroken line open the Seal. It was chosen by a five-judge panel from three independently drawn concepts — the full
judged spec is [`MASWALI-PLAN.md`](../../MASWALI-PLAN.md) §10.

The three motions proposed for Ali's yes or no: **N1 The Carry** (a reserve token travels into a voided slot), **N2 The
Attestation Press** (each result lands as a stamp travelling down the needle's line), **N3 The Cut** (the ticket's stub
separates on purchase and rejoins on a refund). **N4** is left to Claude Design as one bold slot, within the law.

## The boundary — what Claude Design must not change

The game rules exactly as ruled (`PROMPT.txt` §2), the frozen system (compose, never extend), no colour, font, theme or
sub-brand of its own, no gold on any unearned figure, no count-up, no loop, no score on a loss, no figure on a held
ticket, Swahili first at the measured budget, and every source exported (a canvas that lived only as a claude.ai link
was lost on 2026-10-03).

## Lessons from R1 carried into this round

1. Never extract a package inside the repository: `test:design-one-door` globs the disk and went red when R1 was
   unzipped in place.
2. A package is cut from live files at send time and stamped with its commit; it is never re-sent from a kept snapshot.
3. A check that can only fail falsely trains sessions to wave it through — R1's token check had a false-fail mode,
   corrected in `RECEIVING.md`.
4. A token check passing means "buildable", not "good": the Swahili proof at 2.25× and the absence of celebration
   vocabulary on the loss receipt are judged by eye.
5. Round 2 gets its own folder and never overwrites R1.

## Where this is filed, and why here

DESIGN_AUTHORITY §0b places an outbound commission at the repository root under a `.gitignore` exception and bans two
tracked commissions at once; two such exceptions already exist. R1 set the precedent of filing the Maswali commission
under `docs/design-brief/`, tracked normally, with its PROMPT kept as the record of what was sent. R2 follows R1 and
records this deviation here. The incoming delivery follows §0b's incoming row: raw at
`docs/design-system/v6-<date>-millionea/` with an `INHERIT-MANIFEST.md` (`RECEIVING.md`, Step 6).
