# THE SWITCH — YOUR SHEET

**For Ali. Written 21 September 2026.**

The house-bot code has been on your live site since **18 September**, when you pushed it yourself. Nothing
about it is visible to any player or to the account holder. No house bot has ever placed a bet there.

One thing holds it: **a single setting in the database that says OFF**. Every path that could move money
checks it first. It is off, and it stays off until you turn it on.

**How to stop it is at the top of this page, not the bottom.** If you are reading this in a hurry, it is
because something is wrong.

---

# PART 1 — HOW TO STOP IT

## The short version

**Go to the Desk page and press Switch off.** Type a short reason. That is all. There is no word to type
on the way off — that is deliberate. Every second of ceremony in front of a stop is a second of money
moving.

It stops every new bet and cancels everything that was queued.

## The one thing stopping does NOT undo

⛔ **Bets that have already been placed still run to their result.** Off stops new ones. It cannot reach
back and cancel a bet that is already in a market. Nobody can, and nobody should try — pulling one bet out
of a pool would change the result for the real players in it.

So a stop is always: *nothing more from now*. Never: *as if it never happened*.

## If the Desk page will not load

Go to the **System** page and turn on **maintenance mode**.

House bets check the maintenance setting freshly every single time, so this stops them **everywhere, right
away**. It also pauses new player bets and deposits. Withdrawals and cash-outs keep working on purpose —
people can always get their money out.

## If no admin page loads at all

There is a command someone technical can run from a computer. It talks straight to the database and turns
the switch off without going through the website. Two things to know before they run it:

1. **Run it once without applying first.** It prints exactly what it is about to do and changes nothing.
2. **Read the last few lines.** It tells you whether the switch actually changed — and **how many queued
   stakes it left standing.** ⚠️ Those look like waiting bets on the screen and will never actually happen.
   They need clearing separately; the command prints how. Or the Desk's own Switch off clears them once the
   page works again.

⛔ **If it says the write failed, the bots are STILL RUNNING.** It will say so in those words. It never
guesses. Go to maintenance mode instead.

⚠️ This route leaves **no compliance record** — that is on purpose, because writing one from outside the
website would break the tamper-proof chain the platform keeps. So if this route is used, **write down by
hand what happened and why.**

## If nothing at all is reachable — no site, no database

Then nothing can place a bet either. When the bots cannot read the switch, they **stop**; they never assume
it is on. A total outage is a full stop, not a runaway.

## The order, on one line

**Desk → Switch off. If not → System → maintenance mode. If not → the command, dry run first. If nothing
loads → nothing is betting anyway.**

---

# PART 2 — THE SIGNS THAT MEAN STOP

Four things. Any one of them, switch off first and work it out afterwards.

1. **An account pauses itself.** You get a bell and an email. Something about the holder changed — most
   often their password. Sometimes that is the product working correctly. Stop and check anyway.
2. **Money moves on a bot's account that you were not expecting** — a deposit, a withdrawal, a hold, an
   adjustment. You get a bell and an email for every one, and these are never capped or batched.
3. **Any failed row in the activity feed.**
4. **Any alert you cannot explain in one sentence.**

> **Switching off is free and reversible. Leaving it on while you work out what a row means is not.**

**The desk can also switch itself off**, and that is designed, not a fault. It does that if the daily loss
limit is reached, or if it hits repeated errors, or if something inside it breaks. You will be told by bell
and email every time the switch changes, by hand or by itself.

**One thing that looks wrong and is not:** the bell goes quiet after about twenty bet alerts in an hour.
After that they arrive as one summary per hour instead of one per bet. That is the alert limit doing its
job, not the bots stopping.

---

# PART 3 — WHAT TO SET BEFORE YOU FLIP

## The order matters

**Limits → choose a holder → rules → Start → ON → watch for fifteen minutes.**

Limits come first so there is never a moment when an account exists that could bet without a ceiling on it.

## Step 1 — Eight overall limits. The switch will not turn on until all eight are filled.

| Limit | Suggested | Note |
|---|---|---|
| Daily stake limit | 500,000 TZS | resets at midnight |
| Daily loss limit | 100,000 TZS | resets at midnight |
| Open exposure limit | 300,000 TZS | money currently at risk |
| Per-market limit | 30,000 TZS | |
| Bets per minute | 6 | |
| Bets per day | 1,000 | resets at midnight |
| Counters per player per day | 3 | resets at midnight |
| Counter shillings per player per day | 30,000 TZS | resets at midnight |

There are a few more you can set but do not have to. Two are worth knowing: **max accounts (5)** and **bell
alerts per hour (20)**. At twenty an hour, each admin can receive up to 480 bet notifications a day.

## Step 2 — Choose a holder

A real player account with a real password, and **the officer types that password** at the desk. The desk
keeps a fingerprint of it as proof of consent.

⚠️ **If that person later changes their password, the account pauses itself.** That is the product working
correctly, not a fault.

## Step 3 — Each account's own limits. Start refuses until all eleven are filled.

| | Suggested |
|---|---|
| Smallest bet | 1,000 TZS |
| Largest bet | 10,000 TZS |
| Per-market cap | 20,000 TZS |
| Daily stake cap | 200,000 TZS |
| Daily loss cap | 50,000 TZS |
| Open exposure cap | 100,000 TZS |
| Balance floor | 0 |
| Shortest gap between its bets | 30 seconds |
| Bets per hour | 20 |
| Bets per day | 200 |
| Bets per market | 2 |

## Step 3a — What it may touch, and how it behaves (2026-09-23)

⛔ **THE STEP THAT DECIDES WHETHER ANYTHING HAPPENS AT ALL.** The limits above say how much; this says
*what* and *when*. An account with every limit filled and nothing ticked here is switched on, green, and
completely idle — which is the state the live desk was in for a day and a half.

**On the Rules tab, in order:**

1. **Tick a product** — Up & Down, or Polls, or both.
2. **Tick how it enters** — *React to a player's stake*, *Fill a thin side*, *Open a quiet market*. At least
   one, for a product you ticked.
3. 🔴 **CHOOSE THE MARKETS IT MAY TOUCH.** Under *Markets*: the Up & Down chains, the poll categories. **A
   ticked product with nothing chosen reaches no market at all** — it will sit there, active, and never place
   a bet. This is the single most expensive thing to get wrong on this screen, and it is what the roster's
   "Can't bet — …" line and the account page's *Why this account is not betting* panel exist to tell you.
4. **Leave the rest alone unless you mean to change it.** Everything under *How it decides* arrives filled in
   with the documented values, and each box says what it does, what range it accepts and what is saved.
5. **When it may bet.** Seven day boxes, an *All day* switch, and up to four **HH:MM windows in EAT**. A fresh
   account is shown every day, all day — read it and save it; it is not assumed behind your back. An end
   earlier than its start runs past midnight into the next day. What you save is printed back in words under
   the boxes, one line per chosen day.
6. **Press Save.** Nothing on this tab saves by itself. A refusal outlines the box, puts the reason under it
   and takes you to the first one; the toast says how many need fixing.
7. **Then Start.** If every enabled mode is impossible for this account, it still starts and *tells you so* in
   the warning tone — read that sentence rather than assuming it is running.

⚠️ **Pause now asks why, and keeps the answer.** Five characters or more. It is on the record beside the pause.

⚠️ **If an account stops by itself**, History names the cause — a holder changing their sign-in details, a
self-exclusion, a closed account, a failed identity check, a limit. It no longer says "Stopped by a limit"
about causes that are not limits, so read the sentence before going to look for a number.

## ⛔ The three things that will actually trip you up

**1. Blank is not zero.** A limit left blank does not mean "no limit" — it means **refuse everything**. A
desk switched on with a required limit blank *looks live and does nothing*. That is why the screen says
"Set N global limits first" and why the ON button is not even offered until they are all in.

**2. "Use recommended values" fills the numbers and saves nothing.** It does not press Save for you, and it
does not tick a single box — no product, no mode, no category. You still have to save.

**3. Filling every number and pressing Start is not enough.** A brand-new account has both products off and
every mode off. Start will refuse with these exact sentences:

> *"Choose at least one product."*
> *"Turn on at least one entry mode."*

**4. A ticked product needs at least one market it may touch (added 2026-09-22).** Under **Markets** on the
Rules tab there are two lists: *Poll categories* (Sports, Macro, Weather, Crypto, Culture, Tech, Other) and
*Up & Down chains* (BTC/USD 5-min, XAU/USD 15-min, …). A product ticked with **nothing** ticked underneath it
reaches no market at all — the account starts, shows **Active**, and never places a bet. That is exactly what
happened on the live desk on 21–22 September, and it can no longer happen silently:

- **Save refuses it**, marking the list: *"Choose at least one poll category, or turn Polls off."* /
  *"Choose at least one chain, or turn Up & Down off."*
- **Start refuses it** with the same sentences and a link to the Rules tab.
- The **roster row** says it in amber under the account's name: *"Can't bet — Polls is on but no poll category
  is chosen."* — and the account page's **"Why this account is not betting"** panel lists every reason.

The same goes for a mode ticked under a product that is off, and for an account whose only entry is *Enter now*
or *Targeted stakes* (no screen on this build can press those yet — Start says so).

**So: fill the numbers, save, tick a product, tick the categories or chains under it, turn on a mode. Then
Start — and read the roster row: an Active account with no amber line is one that can bet.**

---

# PART 4 — THE CEREMONY ON SCREEN

Everything is on the **Desk** page. Only you can open it.

Four things happen in the box:

1. **The heading reads:** *Switch the desk on*
2. **It tells you what you are doing:** *"Every account that is running will start staking. Each stake is
   still held to the limits on this page, and to the account's own."*
3. **Type into the confirm box:** `SWITCH ON`

   🔴 **Capital letters. One space. Nothing else.**
   `switch on` will not work. `SWITCHON` will not work. Two spaces will not work. If you get it wrong it
   says: *"Type SWITCH ON exactly, in capitals, to confirm."* This is deliberate — the whole point of that
   box is that it cannot be filled in by habit.

4. **Write a reason.** Between five and three hundred characters. It is required.
   ⚠️ **Your sentence stays on screen beside the switch, for everyone, until the desk is switched off.**
   Write it for the next person who looks.

Then the button becomes pressable. It reads **Switch on**. On success you see *"The desk is on"*.

**Going the other way** the heading is *Switch the desk off*, there is **no word to type**, just the reason
— and it warns you honestly: *"A stake already in its final step may still complete."*

---

# PART 5 — THE FIRST FIFTEEN MINUTES

**Nothing happens instantly, and that is normal.**

- The bots look for something to do **every 15 seconds**, and the first look is about **20 seconds** after
  they start.
- A counter-bet deliberately waits **15 to 45 seconds** before reacting, and even then only acts about **six
  times out of ten**.
- Each account waits at least **30 seconds** between its own bets.
- Everything together is capped at **six bets a minute**.

> **A quiet first five minutes is the expected shape, not a fault.** It usually means nothing in scope
> matched — not that anything is broken.

**If you see nothing, look at the refused rows in the Activity tab before touching anything.** They tell you
*why* nothing happened, and it is almost always a limit or a scope doing exactly what you set it to do.

**What "it is working" looks like:** bets appearing in the feed at a believable pace, each inside your
limits, with the switch showing ON and your reason beside it.

---

# PART 6 — WHAT WE COULD NOT CHECK FROM HERE, AND WHY

This is the honest half of the sheet.

**We have never looked at your live site's database. Not once, deliberately.** The rule this work is built
under is that nothing here touches production. That means a short list of things we genuinely cannot tell
you, and I would rather write them down than let them read as checked.

1. **We have not read the actual OFF setting on the live site.** We believe it is off because that is what it
   is created as, and because nothing but your own Desk button can change it. That is sound reasoning — but
   it is reasoning, not a reading.
2. **We have not confirmed the two database changes actually landed there.** The same applies: everything
   points to yes, and nobody has looked.
3. **We have not read the live site's clock setting.** This one matters more than it sounds. If it is set to
   anything other than the standard one, everything installs perfectly, the site looks healthy — and the bots
   **silently never run at all**. Green everywhere, and nothing running.
4. **We have not read how many copies of your site are running at once.** More than one changes how some of
   the limits behave.
5. **We have not read how big your money tables have grown.** Past a certain size, one part of the install
   needs doing differently.
6. **We have not checked the engine's off-switch setting on the live site.** ⚠️ And you should know this one
   plainly: **if that setting is absent, the engine runs.** Its absence is what turns it on, not off. It is
   not a second lock. The database OFF setting is the one thing holding this, and it holds it well — but it
   is one thing, not two.
7. **The admin notification panel has never been seen with house rows in it.** The alerts themselves are
   tested; that one screen has not been looked at with real rows on it.

**None of these is something we forgot.** Each is a reading that can only be taken on the day, by someone who
is allowed to look at the live site. They should be taken **before** the switch, not after.

---

# PART 7 — WHERE THIS STANDS TODAY

Of the seven release steps written a month ago: **two you already did yourself** when you pushed on 18
September, **three describe a handover between two versions of the site that is long finished**, one was a
reference to the wrong document, and **one — this sheet — was still owed to you. It is now written.**

What is honestly still outstanding, in plain terms:

- The work sits on **three separate branches that have not been joined yet**. Several of the tools you would
  use on the day — including the stop-from-a-terminal command and the status readout — only exist on one of
  them.
- **Five of the checks that prove players and the holder cannot see any of this are not run automatically by
  anything.** They pass when someone runs them by hand. They are now written down by name so they cannot be
  skipped silently.
- The readings in Part 6 have not been taken.

**So: not ready today, and I am not going to tell you it is.** When it is, you will get that in writing, with
the measurements behind it, the way you asked.

---

# AND THEN IT IS YOURS

Nothing in this document is a nudge. No green tick anywhere in this work is permission, and nobody here will
ever turn this on.

**The switch is yours. You decide when, and you press it.**
