# The evening of 21 September 2026 — three sessions, one tree

> ⛔ **`alisheib/kipindi` IS A PUBLIC REPOSITORY.** This file, and every file you add to this tree, is
> world-readable. No live account id, holder note, phone or owner quote goes in. Visibility is Ali's call
> alone. Weigh what you write here accordingly.

**Read this before `START-HERE-NEXT-MACHINE.md`, `HANDOVER-2026-09-21.md` or `PROGRESS.md`.** All three
were written earlier the same day and several of their figures are now closed. Nothing is deleted; this
file says which lines they still hold and which they do not.

`main` at the close: **`54a13a34`**, deployed, healthy, engine running.

---

## ⛔ The one thing to know before touching anything

**Until this evening no account could be started at all, so the feature could not run.** Designation
created every account with all fourteen caps `NULL`; `rulesStartProblems` refused one per unset required
cap plus "no product" plus "no entry mode"; and **there was no per-account save anywhere** —
`houseBotStore.saveRules` and `validateHouseBotRules` had **zero callers** in `src/`, the Rules tab was
read-only, and the page said *"Editing an account's rules is not ready on this build yet."* The
switch-on sheet walked an officer through filling eleven limits **on screens that did not exist**.

That is fixed (`1546c9c8`). An officer can now designate, fill, save and Start. ⚠️ **The form does not
fill itself**: a blank account still refuses Start until eleven caps, a product and an entry mode are
**saved**. And an ACTIVE account stakes nothing until the master switch is ON, which is Ali's alone.

---

## What shipped, in order

| commit | what |
|---|---|
| `2701c935` | `CLAIMS_BLOCKED` — the silent stop made visible; limit-save conflict warnings; reports suite back to green; the design-gate toolkit unlocked for local runs |
| `1546c9c8` | the per-account rules editor — **the account nobody could start** |
| `af0f74ae` | the `LAST SEEN: NEVER` contradiction; console floor raised to the printed 722/484 |
| `54a13a34` | **what is still to fill**, and the `rules` tab marker |

Plus, from the third session on `main`: `dee3cc79` (db:scratch refuses a foreign cluster) and
`fd2fe8ca` (**a failed cluster reported exit 0**).

---

## ⭐ Six defects that no suite could have found

Each was found by **running or looking**, with every relevant suite green through it. This is the
pattern worth carrying forward.

**1. A failed test cluster reported success — and 26 suites are judged by that code.**
`pg.stop()` on a cluster that never started returns a promise that **never settles**, so the `await`
before `process.exit(1)` never returns, the event loop drains, and Node exits **0**. With the port held,
`--run` exited 0 **and the wrapped command never executed**. Every one of those suites could have
reported PASS having never run. Two sessions saw it hours apart and both dismissed it as noise.
⚠️ **Re-check anything that went green through a `db:scratch` wrapper before `fd2fe8ca`.** The
discriminator is output: a suite that never ran prints no assertions.

**2. Every worktree adopted every other worktree's database.** `db:scratch` decided a cluster was "ours"
because something answered the port — connecting *was* the whole test. One checkout silently served
another all afternoon. The benign half happened (read-only dumps). The destructive half had not:
`test:house-bot-migrations` issues `DROP DATABASE … WITH (FORCE)` on names both checkouts compute
identically, and `db:verify-backup` restores a **full production artifact** — every wallet, phone and
NIDA — into whichever `.pgscratch` answered. ⚠️ **Use `KP_SCRATCH_PORT=5443` (or any free port) per
checkout.**

**3. Storing only the switches the form owns bricked the account it had just configured.** (Nothing is
decided by what *moved*: the patch is the ten switches whether or not they changed, over whatever the
stored document already held.) Turning a mode on puts that mode's leaves in the parser's required set, so a leaf went missing and Start refused with *"the saved
rules can't be read"*. ⭐ The fix is a **measurement, not an argument**: the minimal document is stored
only when it **provably round-trips** — parsed back and compared against the document that was
validated — otherwise the complete one is stored. It needs no knowledge of which mode reads which leaf,
so a mode added later cannot reintroduce it.

**4. Two correct sentences that together said nothing.** A card's reason repeated the panel guidance
line above it almost word for word — ninety pixels apart, and at 360 the pair filled the entire viewport
with **not one control visible** (432(n)). Found by reading the tile; no gate can see it, because each
sentence is correct alone. The card now carries the fact the panel line does not, and `1.508` asserts
both the new sentence *and the absence of the repeat*.
⭐ **The same class, one layer out:** the per-panel guidance lines added to nine panels this afternoon
all render **below the fold at 360** — the desk's end at y=999 in an 800px viewport. Correct copy, never
read on a phone. Both belong together: a sentence can be right and still fail, by being redundant or by
being unreachable.

**5. No fixture had ever reached the real Start path.** This is the answer to *"how did a feature that
could not start anything ship?"* — every account in `house-bot-world.mts` is forced ACTIVE with
`setStatus` and never calls `startHouseBot`, and the world's `user()` writes `passwordSalt: null`, which
eligibility refuses outright. The suites were not weak about Start; **they had never executed it.**

**6. A guard whose population was the author's uncommitted work.** `disclosure 5.1.c3` asserted
`branchChanged.length >= 10` off `git diff origin/main`, which counts unstaged files — so it was green
all afternoon with seventeen files in flight and went **red on a clean two-file commit**: same tree, same
pins, same published words. And `0` for ever once a lane merges. ⚠️ A threshold is not a control when
what it measures is the state of the desk it is run from.

---

## The visual gate itself was corrected — twice

⚠️ **`qa-house-bots-visual.mjs` changed today**, and neither change is one of the three rewritten guards.
Anyone pointing these instruments at more surfaces needs to know:

- **§5.4 measured each control's own box**, so the kit's `Checkbox` — a `.sr-only` 1×1 input whose
  **label** carries `min-height: var(--tap-min)` (DG-P-12, the consent row) — reported ten controls at
  `input:1px`. It now measures the **reach**: the greater of the box and the label that is its hit area,
  with a `labelReach` count proving the path ran. ⭐ A tightening, not an exemption — a label that does
  not reach the floor is still reported.
- **§5.1's control read a bare `/TZS/`**, so a money input's unit affordance on an account with every cap
  unset read as "currency painted outside the atom". It now reads a currency **figure** (word followed by
  digits). `TZS 50,000` outside `.amount` still fires, and `/new`'s inverted form (ruling 459) is
  untouched.

---

## ⚠️ Traps in this tree

- **Comments are read by guards.** Raw-text guards scan prose, so rewording a comment can turn a suite
  red — and `4.453`'s lexicon will **not** catch a service sentence leaking onto a console surface,
  because those sentences carry no house word. That rule has no automatic guard.
- **`Callout`'s `action` prop is silently dropped** in the default `layout="row"`; it renders only in
  `layout="stack"` (`callout.tsx:280`). Nothing warns you.
- **Console client files hold a closed set of six strings of 25+ characters** (`1.388`, asserted by
  size). Any new sentence must come from the server as a prop.
- **`git commit --only <path>` does not protect other changes *inside* a file.** With sessions sharing a
  tree, that is how one lane's half-finished work gets committed under another's name.
- **The design-gate instruments used to sign in as Ali's production admin**, and 50pick keeps one
  session per account — so every run revoked his live session. Fixed; use `PERSONA=local:ADMIN`.
- **`.next` is shared.** Two sessions building at once corrupt each other. Say so before you build.

---

## Still open — nobody is working these

1. **The persistent "no automatic mode" state.** An account can be started, look ACTIVE, and never place
   an automatic stake. Today that is a one-off sentence; it wants a caption on the account and a roster
   signal. Bar: planted it appears, cleared it is gone, **on the rendered page**.
2. **Promote the dry fire to a real `drive:` key.** Nothing in CI drives the Start path end to end —
   which is exactly how a feature that could not start anything shipped. Its own `KP_SCRATCH_PORT`, and
   it must **fail loudly rather than skip** when the cluster is absent.
3. **The Desk design measurement has still never been run.** The instruments now work locally
   (`PERSONA=local:ADMIN`, `LIVE_BASE=http://127.0.0.1:3021`). ⛔ Two of them are blind to this feature:
   `qa:tab-candidates` short-circuits on `hasRail` so it never measures a railed page's panels, and
   `measure.mjs` does not call `expandSectionRail`, so it only ever sees the default tab.
4. **The account finder** (`/admin/desk/new`) is search-only — a 2-character floor, ten rows, no browse,
   no filter, sort or page. Ali asked for both a searchable dropdown *and* a full list. ⭐ The dropdown
   already exists and is conformant (`DeskAccountPicker`) — preserve it, do not rebuild it. Three walls:
   **no money anywhere on `/new`** (the visual gate carries an inverted control), **no name, phone or
   email on a row**, and no 25+ character string typed into the wizard file.
5. **The decimal question.** A typed decimal is stripped, not refused — visible in the box, but
   unexplained. ⛔ An audit of all 31 numeric call sites proved that **keeping the dot is a regression**:
   it crashes `/admin/config` via `assertWinnerFloor` and opens a stake bypass past the 9-character cap.
   Do not "fix" it that way.

## Ali's alone

The master switch · the published player rules · enrolling TOTP **before** unsetting
`DISABLE_ADMIN_TOTP` (production is password-only today) · repository visibility · and the live clock
zone, which the engine checks at boot and which is currently correct (`Etc/UTC`).
