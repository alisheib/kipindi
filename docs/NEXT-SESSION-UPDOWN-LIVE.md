> ⛔ **SUPERSEDED — historical record only.** This was a session handoff prompt; the live one is
> **`docs/LIVE-QA-CAMPAIGN.md` §6b, the topmost `RESUME AT` block**. Kept because other documents
> cite it, not because anything in it is current. Do not act on it.

# NEXT SESSION — Up & Down, driven live end to end until it is provably safe

> Copy everything below the line into a fresh session. It is written to be pasted whole.

---

Work in `F:\kipindi-main` on branch `main`. This is **50pick** (the repo is named kipindi; the
product is never called kipindi). Production is **https://50pick.tz**, Railway project `50pick`.
Every push to `main` deploys **LIVE**.

## 0 · BEFORE ANY WORK — one approval, then prove it

Enumerate **every** atomic permission this whole programme needs and get them approved in **ONE**
request. Then **prove the access works** with a real production read before starting — do not
discover a missing permission halfway through. At minimum you will need: `railway run/status/logs/
variables/deployment/redeploy`, `npx tsx scripts/*`, `node scripts/*`, `npm run *`, `npx tsc`,
`npx playwright`, `Bash(curl *)`, `Bash(node -e *)`, `Bash(mkdir *)`, `git *` including push to
main, and authorisation to **move real money on production as the QA personas**.

**Mandate, standing:** you have full rights over the live DB, Railway and the deploy pipeline.
Live data is disposable. My Twelve Data credits and AI tokens are authorised — **spend them**.
⛔ **Never touch a real customer's balance.** QA personas only.

Read first, in this order:
1. `docs/LIVE-QA-CAMPAIGN.md` — **§0** (standing rules), then **§6am → §6ao** (the most recent
   work), then the `RESUME AT` marker.
2. `docs/50pick-updown-operator-guide.pdf` — the 15-page operator manual. **It is the contract.**
   If the product does not behave as this document says, one of the two is wrong and you must
   decide which and fix it.

## 1 · FIRST DEFECT — I cannot log in, and it must be fixed before anything else

**My own account cannot sign in.** This is a real production bug and it blocks the owner.

```
name    Ali Sheib
phone   777777777
pass    Admin@1234
email   alisheib07@gmail.com
```

Reproduce it on production first, then find the true cause. Do **not** guess and do **not** "fix"
it by resetting my password — a password reset would hide the defect, and if the cause is
normalisation then every user who types their number that way is affected too.

### The production rows were already read — start from this, do not re-derive it

Seven accounts match. **The obvious hypotheses are already dead**, so do not spend time on them:

| id | phone | email | role | status | pw | last login |
|---|---|---|---|---|---|---|
| `usr_1b3e6fd5…` | **+255777777777** | alisheib07@gmail.com | **ADMIN** | ACTIVE | has hash | **2026-08-04 12:21** |
| `usr_9c28af1f…` | +255712654165 | alisheib07@gmail.com | PLAYER | PENDING_KYC | has hash | 2026-06-15 |
| `usr_fd9b2188…` | +255777771234 | alisheib07@gmail.com | PLAYER | PENDING_KYC | has hash | 2026-06-23 |
| `usr_3dc0267d…` | +255777777728 | alisheib07@gmail.com | PLAYER | PENDING_KYC | has hash | 2026-06-27 |
| `usr_62ab9c9c…` | +255777777723 | — | PLAYER | ACTIVE | has hash | 2026-06-13 |

⛔ **The account is NOT missing, NOT locked, NOT unverified, and has a password.** `failedLoginCount`
is 0 and `lockedUntil` is null. It is `ACTIVE`, `ADMIN`, email verified, and it **signed in
successfully on 2026-08-04 at 12:21**. The phone **is** stored normalised as `+255777777777`.

⭐ **The strongest remaining hypothesis: FOUR accounts share the email `alisheib07@gmail.com`.**
If any login, lookup, reset or "sign in with email" path resolves a user **by email**, it is
ambiguous by construction — it may return the wrong row (a `PENDING_KYC` PLAYER rather than the
ADMIN), or throw on a multiple-rows result, or match on a unique index that no longer holds.
**Check whether `email` is unique on `User`, and check every code path that looks a user up by
email.** Also worth testing: whether the login form accepts `777777777` unprefixed and normalises
it the same way registration did, and whether an ADMIN is required to pass TOTP that I am not
being prompted for.

Reproduce it in a real browser first and **capture the exact error I see**, then fix the cause.
Do **not** "fix" it by resetting my password or deleting the duplicate rows before you understand
them — a reset hides the defect, and if the cause is email ambiguity then other users are affected
too. If duplicates must be merged, that is a money-and-identity change: check for wallets, KYC
records and positions on each row first.

Prove the fix by **signing in as me, on 50pick.tz, in a real browser** — not by a passing test.

## 2 · THE MISSION — drive the whole of Up & Down live, both sides, until it is provably right

Not described, not reasoned about — **driven on 50pick.tz with real money and real API credits**,
as both an **admin** and a **player**.

### The admin half
- Create assets and chains **through the console**, as the roles that really exist: the **trading
  officer** runs chains, **accounting/owner** owns assets. Confirm each role can do exactly what
  the guide says and no more.
- Generate rounds at **several durations including 3 minutes**, on **BTC, ETH, SOL and gold**.
- Exercise every control: Start, Stop, Edit, Generate, void a round with a reason, change a band,
  change stake bounds, toggle an asset, and the product settings.
- ⛔ **Every warning must be in place and correct**: greyed options with reasons, the readiness
  marks ①②③, market-shut states, the gold 15-minute floor, refusal messages. A control that
  offers something the server refuses is a defect. A control that refuses without saying why is a
  defect.

### The player half
- Real stakes from the **real player UI** as the QA personas, on **both sides of the same round**.
- Land on `/updown` with **NO query string** — that is what a real player does, and driving with
  `?asset=…&d=…` hid a bug for an entire campaign.
- Watch the betting window lock the buttons and the countdown **re-label** itself; confirm the
  estimate becomes an **exact** figure at the lock.
- Let rounds settle on real bars, then **pair the wallet, the ledger and the DB row against each
  other — they must agree to the shilling.**
- Force the unhappy paths: a **one-sided** round, a **no-move** refund, a **market-shut** gold
  round, and an **operator void**. Each must state its **real reason** on the card, the round page,
  the settlement proof, the push and the inbox, in **EN, SW and ZH**.

### Visual and responsive — LOOK, do not infer
- Audit **all four widths** (mobile, tablet, tabletL 1024–1279, desktop) in **EN, SW and ZH** on
  every Up & Down surface, admin and player.
- ⛔ **Screenshot with `locator.screenshot()`, NEVER `fullPage`** — a fullPage capture of these
  pages invents layout bugs that do not exist.
- **Then open the images and look at them.** The last session found a dropdown rendering as
  `Sma…` and a header that had never once been sticky; no assertion caught either. A green suite
  is not a readable screen.
- Check truncation, overflow, contrast, tap-target size, and any control that is present but
  unreadable. `test:responsive` and `test:motion` need a local server — run one.

## 3 · WHAT "DONE" MEANS

**Up & Down is 100% functional and safe from both the admin and the player side**, demonstrated on
production:
- every admin control does what the guide says, with the right warning at the right moment;
- every player surface is correct, honest, responsive at four widths in three languages;
- money is exact to the shilling on wins, losses and every kind of refund;
- nothing is left unresolved, no chain left running unattended, no position left open;
- and the **PDF guide matches the product exactly** — regenerate it if the product moved
  (`node scripts/capture-guide-shots-live.mjs` then `node scripts/generate-pdfs.mjs`, and verify by
  rasterising the pages, never by trusting the render).

## 4 · STANDARDS — non-negotiable

- **One fix, one guard proven RED first, docs updated in the SAME commit, one push to main, one
  production verification. Never batched.**
- **Judge a process by its EXIT CODE.** Never by grepping output for a failure string — a crashed
  suite prints no summary and reads as green.
- **A check that cannot fail is worse than no check.** Before writing one, ask: *"would this still
  pass if the feature were absent?"* Pin the **property**, not the vocabulary — three guards broke
  on renames while the behaviour was correct.
- **Assert the quantity, not the container.** A card's text always changes because the countdown
  ticks; read the figure you actually care about.
- **A code default is NOT a live setting.** Read config from production before quoting it.
- **Before a number reaches a document an operator will act on, read it from the live system.**
  Five wrong figures reached the guide by being carried forward from a comment or an earlier
  measurement.
- **History under a retired mechanism is not evidence about the mechanism that replaced it.**
- **Always update the docs as you go** — `docs/LIVE-QA-CAMPAIGN.md` in the same commit as the fix,
  the `RESUME AT` marker moved, and any doc that has become false corrected. ⛔ **Do not leave a
  stale claim for a future session to trip over.** If you find a doc that contradicts the live
  system, fixing it is part of the task, not an aside.

## 5 · TRAPS ALREADY PAID FOR — do not re-learn these

- `git branch --show-current` **before every commit** — we share one working directory and a
  stray `checkout` moves the branch under you; the wrong branch deploys LIVE.
- `updown-service.ts` and `updown-dal.ts` are **CRLF**; most other files are LF. A multi-line `\n`
  anchor silently misses. Normalise to the file's own line endings.
- **Backticks inside a double-quoted `node -e "…"` are command substitution** and silently eat your
  text. Use the Edit tool for prose, or a quoted heredoc.
- `pg` shifts timestamps −3h on an EAT laptop — **always `::text`-cast** in SQL.
- `networkidle` never fires (SSE). The first-run primer mounts over every page.
- The kit `Select` is a **custom combobox with a hidden input**, not a native `<select>` —
  Playwright's `selectOption` finds nothing; click the combobox, then the option.
- `railway run` injects the **internal** DB host, and the DAL swallows the failure — an
  unreachable database reads as "no rows". **Prove the connection before acting on a read.**
- Config caches hydrate **once per process** with no TTL — a config change made outside the server
  does not reach it until the next deploy.
- A Tailwind `sm:` breakpoint responds to the **viewport**, not to the container an element sits in.

## 6 · WHERE THINGS STAND (2026-08-04)

Live and proven: settlement from **dated 1-minute bars**, the tick-floor band (BTC/ETH/SOL ±$0.02,
gold ±$0.40), durations 3/5/10/15/30/60 with gold at 15m+, the betting window, one-account-one-side,
refund reasons in three languages, and money exact to the shilling on **three** driven rounds
including SOL's first ever winner in 291 rounds.

The board is **cleared** — 2 chains (BTC 5m, SOL 5m), both **STOPPED**, one settled round each.
Chains are **manual**: an operator presses Generate; nothing runs on a timer.

**Open, and roughly in priority order:**
1. **House seeds the thin side of a one-sided round** — my decision, **not started**, money-critical.
   Needs a float source, per-round and per-day exposure caps, seeding at the **LOCK** not at open,
   house positions kept out of player metrics and leaderboards, and house P&L separated from
   commission in the accountant view. ⚠️ A `house.pool.state` key already exists in `SystemConfig`
   — read it before designing a second float.
2. **A forced LATE close on production with QA money** — implemented and guarded, never driven.
3. **The ten hydrate-once config caches** — no TTL, no cross-process invalidation, including the
   payment kill-switches and the trusted-source allowlist.
4. **The catalogue traps**, documented in the guide rather than fixed: two rows both named **Gold**
   (`GOLD` off, `XAU` on) and `SNP500` pointing at a web page rather than the price feed. Retiring
   a row touches reports keyed off `key` — migrate them in the same change if you do it.
5. The accountant/reports pass, the result chip reading **VOID on a RESOLVED** round, **E-70**
   (navigation lost going admin → player), and **E-59** (no delete for assets/chains in the console).

**Settled — do not re-open:** gold 15m+ · the tick-floor band · one account one side · manual
chains · responsible-gambling limits unchanged.

## 7 · HOW TO WORK

**Keep going until you genuinely cannot go further.** Do not stop between phases to ask me. Do not
come back with partial work. If something is ambiguous, make the sensible call, state the
assumption, and continue; if something is genuinely blocked, finish everything else in full and
tell me exactly what is blocked and why. Time is not a constraint and tokens are not a constraint —
**thoroughness is the only thing I am measuring.**

Report **once, at the end**, with the evidence: what you drove, what you found, what you fixed,
what is still open, and the screenshots. **A green test suite is not evidence. A deploy reaching
SUCCESS is not evidence. Only a driven flow on production is.**
