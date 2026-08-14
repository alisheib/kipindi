# NO OPEN WORK ORDER — the round-2 design lane is CLOSED (batch 4, 2026-08-13)

**There is nothing to paste from this file.** It is kept because `.gitignore` tracks exactly three
files in `design-brief/` and this is one of them — but it no longer carries a brief. Four batches
inherited the round-2 kit, all three commissioned surfaces are applied, and every deferred item has
an explicit, dated decision behind it.

**▶ Pick up from [`docs/NEXT-PLAN.md`](../docs/NEXT-PLAN.md)'s own "PICK UP HERE"**, which is the
platform's current-state doc. Do not write a new numbered prompt here; a second place that says
what to do next is the failure mode `DESIGN_AUTHORITY.md` §0 exists to prevent.

---

## What shipped, and where the record lives

| Batch | What | Commit |
|---|---|---|
| 1 | `/markets` rebuilt on the inherited contract + the validation pass that found two controls 1% usable on a phone; `/results` category filter fixed | `78b7f000` · `c7cb34ec` · `fd66292b` |
| 2 | The hero — photographic backdrop deleted, question board built from the live book | see §6 |
| 3 | The landing composition, header and rail; **the ticker was fabricated and was fixed first** | `6f97911e` |
| 4 | Cleanup: the live RG regression, the time-left consolidation, the Details tap target, the cite-check | _this session_ |

**The full account is [`PLAN-OF-RECORD.md`](PLAN-OF-RECORD.md)** — §6 is the batch log, §8.7a–§8.7g
are the per-batch accounts including every defect found and how each was caught, §8.8 is the
deferred register, and §8.9 lists the instruments this work leaves behind. The archive/cleanup
record is [`CLEANUP-MANIFEST.md`](CLEANUP-MANIFEST.md).

## What is deliberately NOT done — decided, not forgotten

Three kit pieces are carried forward with their reasons in **§8.8** (Ali's call, 2026-08-13): the
**density toggle / compact list**, the **mobile filter sheet**, and **search typeahead**. Each has a
real reason, not an absence of time — a false-promise label, a documented trade whose replacement
needs the shared `<Modal>` contract verified at four widths in three locales, and a pure
enhancement over a search box that already works.

⛔ **Filter UI for `/live`, `/watchlist`, `/leaderboard` and `/fairness` is NOT COMMISSIONED**
(Ali, 2026-08-13). §8.7d's inventory of which surfaces filter is a *record*, not a backlog. Building
it would be a design decision invented at the call site with no delivered spec. If it is ever
wanted, it is its own commission — or at minimum its own written plan.

⚠️ **Still Ali's Phase-3 decision, untouched:** the `--h-control-*` token raise and the
`--type-nano`/`--type-label` raise (§5.7).

## Two things a later session will otherwise re-learn the hard way

1. **`test:responsive` is RED with 81 failures and none of them are new.** Reproduced against
   `https://www.50pick.tz`. All are global-header chrome, classified in §8.7g: one is an
   **instrument artifact** (the language listbox sits in the DOM under a closed trigger, so the
   audit measures option boxes a user never sees — a 320px frame shows no dropdown), one is real but
   only at **320px**, below the 360 floor PLAN §5.3 pins, and one is the known signed-in tabletL
   `Account menu` overflow. Do not read that red as batch 4's, and do not "fix" the artifact.
2. **`test:responsive` and `test:motion` are server-dependent**, defaulting to `localhost:3000`.
   They are NOT among PLAN §3's 22 static design gates. On a 3009 harness pass
   `BASE=http://localhost:3009` or they die with `ECONNREFUSED` and look like product failures.

## The trap list this lane added (all in PLAN-OF-RECORD §8.7c–§8.7g)

- **A doc that names a file is not evidence the file changed.** §8.8 recorded two surviving
  time-left copies; there were three, and the unnamed one was on the busiest board.
- **`mt-12` is 128px here.** This repo has a custom spacing scale — never reason about a spacing
  class from the Tailwind defaults.
- **A `margin` at a boundary whose padding already sums is a double-count** — the `--rh-*` tokens'
  own comment says so, and the RG seam did it anyway.
- **A bounding-box measurement cannot see a hit-area fix.** `.mcardp-details` still measures 17px
  before and after; only `elementFromPoint` can tell the fix from its absence.
- **`boundingBox()` and a non-fullPage `clip` are both viewport-relative** — pair document
  coordinates with `fullPage`, or the frame captures the sticky header and still looks plausible.
- **A zero can be correct.** `00 SIKU` is the countdown's intended zero-padding, not a defect — and
  Swahili renders time-left as `dakika {n} zimebaki`, with the number in the middle, so a
  `(\d+)(unit)` probe matches the countdown in every locale and the label in none.
- **`stress-bulk-bet`'s `userPrefix` is truncated to TWO characters**, so distinct-looking prefixes
  share one pool of synthetic users who then run out of wallet and have bets silently **rejected** —
  and `poolMath: "PASS"` stays green through it. Assert `accepted === n`. Its `yesRatio` is
  probabilistic, so only `0` and `1` are deterministic.
- **`resolve-seed-markets` counts ATTEMPTS**: it reported `resolved: 6` while 2 of 6 settled. Assert
  the per-market `state`. And `/admin/*` needs `DISABLE_ADMIN_TOTP=true` at boot, or it
  client-redirects to `/admin/2fa/setup` — which a `domcontentloaded` read reports as a clean 200.
- **Git Bash rewrites a leading `/` argument** into `C:/Program Files/Git/…`. It hit three times in
  one session, and once it made a QA sweep exit **0 having measured nothing at all**.
