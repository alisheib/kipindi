# `MASWALI-DESIGN-R1` — the design handover, and what to do with it

> **STATUS: ⚪ RECORD — THE DELIVERY ARRIVED AND IS FILED (2026-08-28).** It is at
> [`design-brief/maswali-2026-08/handover/`](design-brief/maswali-2026-08/handover/), in the shape
> §1 specifies, plus a `sources/` folder of living `.dc.html` artboards the expected shape did not
> ask for. **§2's token check passed** — all 59 tokens exist. **§3's contested ruling was not
> contested:** the delivery's `DECISIONS.md` rules *"Ship C2 — the figure in neutral mono ink"* and
> records *"Nothing rose to wrong"*, so §12.1 row 2 stands unchanged and nothing had to be deleted.
> §4's stale rows are reconciled in the same commit. ⛔ **§6 still blocks everything** — D-1, D-2,
> D-4 and D-6 are unanswered, so no line of this product may be built.
>
> 🔴 **AND §2's CHECK, AS WRITTEN, HAS A FALSE-FAIL MODE — FIX IT BEFORE ROUND 2.** Its
> `grep -oE '^\s*--[a-z0-9-]+'` is anchored to the START of a line, but `tokens-LOCKED.css:191`
> declares six radii on ONE line (`--r-xs: 4px; --r-sm: 8px; --r-md: 12px; …`) and the spacing
> scale does the same. **13 real tokens are invisible to it** — `--r-sm/md/lg/xl/pill` and
> `--sp-2/3/4/5/8/10/12/16` — so any design using a radius or a space, which is every design,
> false-FAILS. Drop the `^\s*` anchor and match `--token\s*:` anywhere on the line. ⛔ **A second
> false-FAIL:** the check greps the whole of `TOKENS-USED.md`, including its *"NOT USED"* list, so
> the handover is failed for the four families it explicitly says it AVOIDED (`--danger-*`,
> `--glow-*`, `--teal-*`, `--warning-*`). ⚠️ **This matters more than the regex.** §2 says the
> check is run *"first and mechanically — never by eye"* — and run as written it prints seven
> failures on a delivery that is entirely sound. A gate whose only failure mode is a false one
> trains the next session to wave it through, which is the same defect as a gate that cannot fail.
> The delivery's own `TOKENS-USED.md:5` had already spotted it and said so in prose.
>
> Written 2026-08-28 by the session that commissioned
> the work, for the session that receives it. Nothing here is built.
>
> ## ⭐ THE KEY NAME IS `MASWALI-DESIGN-R1`
>
> **If Ali hands you a design handover and says it is `MASWALI-DESIGN-R1`, it is the delivery this
> file commissioned, and this file is your instruction set.** Grep the repo for that string and you
> will find every place it is referenced:
>
> ```bash
> grep -rn "MASWALI-DESIGN-R1" docs/
> ```
>
> `R1` = round one. A second round, if there is one, is `MASWALI-DESIGN-R2` and gets its own
> handover folder — ⛔ it does not overwrite this one.

---

## 0 · The thirty-second version

- A **third 50pick product** was proposed by management: *Maswali Millionea*, a weekly jackpot.
  Evaluated in full at [`MASWALI-MILLIONEA-IMPLEMENTATION.md`](MASWALI-MILLIONEA-IMPLEMENTATION.md).
  **Nothing is built. Nothing is decided.**
- Its **design** was commissioned from Claude Design, deliberately **bounded to four artboard
  sets** — the ones no §0 decision can change. Commission:
  [`design-brief/maswali-2026-08/BRIEF.md`](design-brief/maswali-2026-08/BRIEF.md); the prompt sent
  is [`design-brief/maswali-2026-08/PROMPT.txt`](design-brief/maswali-2026-08/PROMPT.txt).
- **You are receiving that delivery.** Your job is to accept it, file it, and reconcile every doc
  it makes stale — **in one commit**.
- ⛔ **You are NOT building the product.** §0 of the implementation doc holds **seven decisions
  that are Ali's**, and the first one is whether the Gaming Board licence even covers a
  fixed-stake multi-event jackpot. No artboard unblocks any of them.

---

## 1 · Where the handover goes

```
docs/design-brief/maswali-2026-08/handover/
```

One folder, named to match the existing `handover-2026-08/` convention. Expected shape, as the
prompt specified it:

```
handover/
  README.md          — what it is, the date, and "where a figure here disagrees with the live
                       repo, the live repo wins"
  DECISIONS.md       — every design decision and why; the gold-vs-mono verdict
  TOKENS-USED.md     — every token referenced, as var(--name), grouped by surface
  OPEN-QUESTIONS.md  — what it could not decide; anything breaking in the 1024–1279 band
  artboards/         — <set>-<surface>-<breakpoint>-<locale>.<ext>
  glyphs/            — millionea.svg · supa.svg · mini.svg + a 14/18/24px preview sheet
```

If the delivery does not have this shape, file it into this shape rather than inventing a new one.

---

## 2 · ⛔ THE FIRST THING YOU DO — the mechanical check, before you look at a single frame

Every name in `TOKENS-USED.md` must exist in
`docs/design-system/v3-2026-08-11-landing-discovery/tokens-LOCKED.css`.

```bash
# every var(--token) the handover claims to use, that the frozen token file does not define
grep -oE '\-\-[a-z0-9-]+' docs/design-brief/maswali-2026-08/handover/TOKENS-USED.md | sort -u \
  > /tmp/used.txt
grep -oE '^\s*--[a-z0-9-]+' docs/design-system/v3-2026-08-11-landing-discovery/tokens-LOCKED.css \
  | tr -d ' ' | sort -u > /tmp/have.txt
comm -23 /tmp/used.txt /tmp/have.txt
```

**Empty output = pass.** Any line = a colour, radius, shadow or duration that does not exist, which
means the deliverable **cannot be built without amending a frozen system**. That is the failure the
whole commission was shaped to prevent, so it is checked first and mechanically — never by eye.

⚠️ **A green run here is not "the design is good".** It only says the design is *buildable*. The
other seven acceptance criteria are in `PROMPT.txt`; the two that fail quietly are **the slip
actually tested in Swahili at the 2.25× label budget** and **the loss receipt carrying no
celebration vocabulary**.

---

## 3 · The one thing most likely to be contested

`MASWALI-MILLIONEA-IMPLEMENTATION.md` §12.1 row 2 rules that **the jackpot figure is neutral mono
ink, not gilt** — because on this platform gold means *earned*, and a prize nobody has won is the
most unearned number it will ever show (`DESIGN_AUTHORITY.md` §M3, design law 3).

**Every jackpot in the world is gold, so this is the ruling management will fight.** Artboard set
**C** exists purely to settle it: the same hero twice, gilt beside mono, with a real earned payout
in frame so the cost of spending gold there is *visible* rather than argued.

> 🔴 **If Claude Design argues for gold in `DECISIONS.md` and Ali rules with it, then §12.1 row 2
> is WRONG and must be CHANGED — not left standing beside a handover that contradicts it.** Two
> definition sites for one design fact is the defect this repo fixes by deletion, never by
> synchronisation (`DESIGN_AUTHORITY.md` §0a). The same applies to the no-count-up-ticker ruling
> (row 1) and the no-sub-brand ruling (§12.5).

⛔ Do not "reconcile" a disagreement by keeping both. Pick one, delete the other, and record the
ruling in `docs/COMPLIANCE-DECISIONS.md` if Ali made it.

---

## 4 · What goes stale the moment the handover lands — fix these in the SAME commit

| Where | What is now false |
|---|---|
| `MASWALI-MILLIONEA-IMPLEMENTATION.md` §12.6 | *"**THE HANDOVER LANDS IN**"* — it has landed. Change the tense and say what arrived |
| §12.5 | *"what a human graphic designer must draw"* — those four things are now **delivered**, not requested |
| §12.1 | Only if a ruling changed (see §3). Otherwise leave it — it was right |
| `design-brief/maswali-2026-08/BRIEF.md` §1 | *"Should we commission the design now?"* is answered. It becomes a **record**, not a live question |
| `docs/README.md` | The `MASWALI-MILLIONEA-IMPLEMENTATION.md` row should note the design exists; add a row for the handover |
| This file | Status 🔵 LIVE → ⚪ RECORD once the handover is accepted and filed |

⚠️ **`docs/README.md`'s file count is DERIVED, never quoted** — `test:design-one-door` §6 fails if
anyone writes a number back into it. Do not "helpfully" add one.

---

## 5 · Two traps this commission already paid for

**5a · ⛔ NEVER EXTRACT THE PACKAGE INSIDE THE REPO.**
On 2026-08-28 the outbound zip was unzipped into `docs/design-brief/maswali-2026-08/` and
`npm run test:design-one-door` went **4-red instantly** — three *"competing front door"* hits plus
the duplicate-rulebook assertion — because the package carries a copy of `DESIGN_AUTHORITY.md` and
the gate asserts **exactly one on disk**. The gate was **right to fire**. Deleting the extracted
copies turned it green again (86 design docs → 78).

⚠️ **The gate globs the DISK, so `.gitignore` does not quiet it** — the ignore rules added that day
only stop a `git add -A` from committing the copies. **Extract outside the repo.**

**5b · A commission must never carry a KEPT snapshot.**
`.gitignore`'s *"OUTBOUND DESIGN COMMISSIONS"* section says in as many words: *a commission NEVER
carries a copy of the rulebook, the tokens, or component source — it links to them*, and records
an incident where a hand-maintained package **taught an outside designer that a celebration amount
is set in Sora — a row `DESIGN_AUTHORITY.md` §M4 had already overturned.**

This package carries copies **only because Claude Design cannot follow a link into a private
repo.** That is tolerated on exactly two conditions, both of which you must honour if you send a
round 2:

1. **Assembled from LIVE files at send time, never reused.** If the package on disk is older than
   `HEAD`, rebuild it — do not send it.
2. **Stamped with the commit it was cut from**, so a stale package is *detectable* rather than
   silently authoritative.

---

## 6 · What is still blocked on Ali, and cannot be designed around

§0 of the implementation doc, in full. The four that matter most:

| | |
|---|---|
| **D-1** | Does the Gaming Board licence cover a fixed-stake multi-event jackpot? **Blocks everything.** |
| **D-2** | Who funds the advertised TZS 20,000,000 guarantee? At 1,000/ticket it self-funds only at **20,000 tickets a cycle**; ten binary questions is **1,024 combinations**, so the top prize is hit ~86% of cycles at 2,000 tickets. Recommendation: **progressive-only, no guarantee.** |
| **D-4** | What does a VOID question do to a ticket's score? |
| **D-6** | How many tickets may one player buy? **Buying all 1,024 costs TZS 2,048,000 and guarantees the top prize.** |

⛔ **Do not start S1 of the implementation plan until these are answered in writing and recorded in
`docs/COMPLIANCE-DECISIONS.md`.** A session that begins building before them is building a guess.

---

## 7 · Provenance

| | |
|---|---|
| Commissioned | 2026-08-28, commit `764f040b` |
| Package | `maswali-design-package-2026-08-28.zip` — 20 entries, untracked by design |
| Reference frames sent | 3 real production shots at 360/768, checked by eye first: QA personas on a QA-labelled market, no real player identity |
| Corrections made before sending | The loss receipt is the **560 receipt** tier not 1080 reading · the tier glyphs render at **9–18px, mode 14**, not 24 · the Swahili budget is **fit 1.75× / prove 2.25×** while prose needs none · the glyph family is **178**, not 184 · **1024** is the dominant breakpoint and **1024–1279** the degraded band, while **1920 has zero branches** |
