# TWO RULINGS AND THE REMAINDER — the work order left open at the end of session 71

> 📌 **WRITTEN 2026-08-28 AT THE CLOSE OF SESSION 71, ON `C:\kipindi-main`.**
> Everything session 71 built is **shipped, deployed and green** — CI passed on `b9fce6aa`,
> Railway `fb132974` is SUCCESS, and the working tree was left clean. **Nothing here is
> half-finished code.** What is listed below is: two decisions that are Ali's, one credential
> only he can supply, and the rows that were already open before session 71 started.
>
> ⛔ **`docs/LIVE-QA-CAMPAIGN.md` OUTRANKS THIS FILE.** That register is the truth; this is a
> work order. Read its topmost `RESUME AT (session 72)` block first — it carries the money
> position, the close-out gate and the full context. This file exists so a session on **another
> machine** can see what is pending without reading the whole register.

---

## 0 · READ THIS FIRST IF YOU ARE ON A DIFFERENT COMPUTER

🔴 **THE SINGLE MOST EXPENSIVE MISTAKE IN THIS CAMPAIGN'S HISTORY IS RECORDING A FACT ABOUT
*ONE MACHINE* AS THOUGH IT WERE A FACT ABOUT *THE PROJECT*.** It happened again and cost four
sessions: `docs/SESSION-PROMPT-SHELL-CARE-AND-INSTALL.md` §0.2 recorded *"no `gh` on this
machine, `GITHUB_TOKEN` and `GH_TOKEN` both ABSENT"* — carefully verified, entirely true where
it was written, and **false on `C:\kipindi-main`**, where `gh` is installed and authenticated as
`alisheib` with the `workflow` scope. Three handoffs then repeated *"ONE CLICK FOR ALI"* for a
job no human ever needed to do. **Session 71 ran it in ten seconds.**

So, measured on `C:\kipindi-main` on 2026-08-28 — **re-measure, do not assume, on yours:**

| thing | on `C:\kipindi-main` | how to check |
|---|---|---|
| `gh` CLI | **installed, authed as `alisheib`, `workflow` scope** | `gh auth status` |
| `railway` CLI | **linked to 50pick / production** | `railway status` |
| `.env.qa.local` | **6 keys** — ALPHA, ECHO, FINANCE, GROWTH, OFFICER, TRADING | count them; do not trust "13" |
| `QA_ADMIN_PASSWORD` | **ABSENT** — see §2 | it is Ali's own console login |
| `QA_FLEET_PASSWORD` | absent, but `harness.mjs` falls back to a literal, so **fleet drives still work** | `fleetPersona()` |
| `scripts/live/ops/.env` | present (gitignored) — the Railway public proxy | required by every `ops:*` script |

⛔ **AND TWO THINGS DO NOT TRAVEL BETWEEN MACHINES AT ALL, so do not go looking for them here:**
① **`git stash` is LOCAL.** `C:\kipindi-main` holds two stashes — `stash@{0}` is session 71's
superseded 26-Aug WIP (its patch is archived outside the repo; **drop it when Ali is happy**) and
`stash@{1}` is an older ai-usage attempt. **Neither exists on any other clone.** ② `.env*`,
`scripts/live/ops/.env` and the `.qa-*` scratch directories are gitignored and stay put.

---

## 1 · ALI'S TWO RULINGS — BOTH BLOCK REAL WORK, BOTH ARE SMALL TO ANSWER

Neither is a bug to fix. Both are policy with a money consequence, and both were filed rather
than decided **because guessing at an owner's intent on a licensed gambling product is how a
control ends up meaning something nobody chose.**

### `E-243` — should a limit INCREASE defer 24 hours?

🔴 **A player can raise their own session limit the instant it bites.** `setLimits` defers only
the **three deposit caps** (`responsible-gambling.ts:174-187`, LCCP SR 3.4.3). Line `:188` writes
`dailyLossLimit` and `:189` writes `sessionTimeLimitMin` **immediately, in both directions**.

⭐ **THE DEFERRAL IS THE WHOLE MECHANISM OF A SELF-IMPOSED LIMIT** — it is why the deposit caps
have it. A limit that yields to the impulse it was set against is a record of an intention, not
a control. That is the same criticism `E-235` made of a limit that was never enforced at all,
one layer in.

▶ **TWO QUESTIONS:** ① should a **session-limit** increase (and a removal — `null` IS an
increase) defer 24 h? ② should **`dailyLossLimit`** too? ⛔ **A DECREASE must stay immediate**
in every case — a player tightening their own limit takes effect at once.
⚠️ **It needs a migration** (each deferred limit carries its own `pendingXIncreaseTo` /
`pendingXIncreaseEffectiveAt` pair), which is why it was not smuggled in.
💰 **Exposure today is ZERO, measured:** of 102 `ResponsibleGambling` rows, **0** have
`sessionTimeLimitMin`, **0** have `dailyLossLimit`, **0** have `dailyDepositLimit`. **Not one
player has ever set a limit of any kind.**

### `E-245` — can a self-excluded player reach their own money?

🔴 **Today: no, by both routes at once.** `selfExclude()` freezes the wallet
(`responsible-gambling.ts:224`), `withdraw()` refuses a frozen wallet (`wallet-service.ts:151`),
and `assertSignInAllowed` refuses the account at every sign-in door. After Ali's ruling that the
period is a MINIMUM, that means *at least* the chosen period and then only until an officer
reopens. **A six-month self-exclusion locks the balance for six months.**

✅ **Winnings are NOT stranded** — settlement credits through `db.wallet.adjust` directly and
checks no wallet status (read at all three call sites: `market-service.ts:3005, 3134, 3242`).
⛔ **Not a regression:** the freeze predates session 71; what changed is that there is now a
documented way OUT at all.

▶ **THREE DEFENSIBLE ANSWERS:** ① **return the balance automatically on exclusion** — the payout
rail already refuses any destination but the registered number (`E-215`), so this is safe;
② **allow a support-initiated WITHDRAWAL while excluded** — the gambling door stays shut, the
money door opens; ③ **hold it — and SAY SO ON THE FORM**, which today says nothing about the
money at all. ⛔ Whatever the answer, the form must state it before the player chooses.
💰 **Exposure today is ZERO, measured:** 0 FROZEN wallets, 0 users with `status =
SELF_EXCLUDED`, and exactly 1 self-exclusion ever recorded (2026-07-24, account ACTIVE again).

---

## 2 · ONE CREDENTIAL, AND ONE LIVE DRIVE THAT IS OWED BECAUSE OF IT

⛔ **`QA_ADMIN_PASSWORD` IS NOT IN `.env.qa.local` ON `C:\kipindi-main`.** It is Ali's own admin
console login (`+255 777777777`) — ⛔ **never re-mint it**, he must paste it.

Without it, `qa:rg-excluded`'s **officer half cannot run**, so:

🟡 **OWED: the Reopen-after-self-exclusion control has NOT been driven on production.** It is
proven by `test:rg-doors` and by `red:rg-doors` mutation, and the *refusal* half of the drive
**did** run live (a self-excluded account was refused at the sign-in door, and after the deploy
the served-period banner was confirmed correct on production). What is unproven live is the
officer pressing **Reopen** and the **wallet unfreezing** behind it.

▶ **When the key is present:** `PLAYER=07 npm run qa:rg-excluded`. It arms the served state,
drives the refusal, reopens through the real admin UI, and **restores the account in a
`finally`**. ⛔ It creates the served state directly rather than through the form, and says why:
the shortest self-exclusion the form offers is **24 hours** and cannot be reopened before it, so
the real form would put a fleet account beyond reach for a day.

---

## 3 · THE REMAINDER, IN ORDER — all pre-existing, none introduced by session 71

1. **`E-235` row ②** — `detectHarmMarkersForAllUsers` has **no runner** (its only caller is the
   `/admin/compliance` page render) and **cannot be scheduled as written**: `db.user.list()`, no
   cap, per-user, on a page render. ⛔ **Bound the query FIRST, then schedule.** Note the same
   unbounded shape sits in `buildRgEngagement` (`catalogue.ts`), which walks every user and
   re-reads the RG row per user.
2. **`E-231`'s deposit ceiling** — still one **operator** action, not an engineering one: paste
   the 34 failed-deposit references into the Selcom console and read the **decline codes**.
   `DEPOSIT_MAX_TZS = 2_000_000` is advertised while M-PESA has never confirmed a deposit above
   **TZS 50,000** here. ⛔ **Do NOT enforce a guessed ceiling.**
3. **`E-239`** — the bonus zombie re-lock: re-locking a grant whose `remainingTzs` was already 0
   restores an obligation with nothing behind it. One branch, but it is a **money path**, so it
   gets its own RED and its own live drive. Exposure: 1 grant, on `fleet:01`, from QA drives.
4. **`E-236`** — three popups still clip player copy; `notifications-panel.tsx` has never been
   measured at 360 in Swahili.
5. **`E-233`** — three registry rows still unreachable; §9b's population is a recorded blind spot.
6. **`E-230`** — the admin TOTP branch, latent while `adminTotp: DISABLED`.
7. **`E-241`'s tail** — CI is green now, but ⛔ **keep `test:all` in the close-out gate.** The
   whole finding was that hand-picked suite lists cannot fail the way this one needed to.

⚠️ **Housekeeping, not a row:** `fleet:03` still carries `status = COOLED_OFF` with an expired
timer. Inert after `E-238` (the bet path consults the timer), but `/admin/players` shows a
misleading status for an account that can bet. **An operator's five seconds, not a migration.**

---

## 4 · THE ONE HABIT THAT FOUND EVERYTHING THIS SESSION

⭐⭐ **DRIVE IT, THEN READ THE SCREEN — NOT THE RETURN VALUE.**

`E-240`'s gate was correct and fully guarded. Driving it on production and *looking at the page*
showed the login screen throwing the gate's answer away and telling a player whose exclusion had
ENDED that they *"will not be able to sign in until the period ends"*. A structural guard is the
right instrument for "does the door call the gate" and **cannot tell you what a player sees.**

The same habit found: a cool-off banner claiming the opposite lie; a regression my own fix
introduced on the screen next door; an assertion on `main` that **could never fail**; a guard
reading the file some markup used to live in; and one of my own checks satisfied by the wrong
call site. ⛔ **Every one of them was green.**
