# Reply to the agency — "50pick Simplified Journey" (draft for Ali to send)

> **Status:** DRAFT, written 2026-09-29 for Ali to send. Nothing here is sent automatically.
> Plan of record: [`docs/VODACOM-PLAN.md`](../../VODACOM-PLAN.md). Their deck: [`50pick_Simplified_Journey.pptx`](50pick_Simplified_Journey.pptx).

---

Hello Fred,

Thank you for the Simplified Journey proposal. We have reviewed all five screens and we are building them. The flow,
the order of every element and the wording will match your frames. The screens will be drawn in 50pick's own design
system (our fonts, colours and components), so the new journey looks like the rest of 50pick.tz.

## Your four questions

**1. Logged-out preview. Can the bet sheet and payout open before sign-up?**
Yes. A visitor who taps NDIO or HAPANA sees the bet sheet with the stake, the quick amounts and the estimated
winnings before creating an account. When they tap to place the bet, they are asked to sign up, and they come back to
the same bet afterwards.

**2. Wallet callbacks. Can M-Pesa, Airtel Money and HaloPesa return users to the pending bet?**
Yes, and no work is needed from the mobile-money operators. The PIN prompt is pushed to the player's phone while they
stay on our page. Our system waits for the confirmed payment and then brings the player back to the same bet, with the
side and stake kept, for them to confirm. The bet is never placed automatically. We have also added Mixx by Yas as a
fourth wallet on the deposit screen, and card payments remain available through a link on that screen.

**3. Short titles. Rewrite titles, or add a short-title field to each market?**
We are adding a short-title field to every market in Swahili, English and Chinese, plus an optional competition label
(for example "Ligi Kuu" or "EPL") for the line above the question. The full wording and the resolution source stay on
each market's own page.

**4. Regulator review. Does the Gaming Board need to see the new payout wording?**
No. 50pick's licence covers this change, and the decision is recorded in our compliance log. The winnings on the
buttons and in the bet sheet are always shown as estimates ("≈"), and the bet sheet carries the note that the final
amount depends on the pool at close, with our commission already deducted.

## Success measures

We will report the five measures you asked for: home → bet sheet, bet sheet → bet placed, short balance → deposit,
deposit → bet completed, and time to first bet.
- Counting starts at least **14 days before launch**, so you get a before-and-after comparison.
- The figures are anonymous daily totals. They exclude our staff and our own liquidity activity.
- They can be split by campaign when your links carry `utm_source` and `utm_campaign` tags.
- We will send you a report every Monday for the first eight weeks after launch, and monthly after that.

## Campaign links

To send people straight into a question with a side already chosen, use:

```
https://50pick.tz/markets/<market-id>?side=YES&utm_source=<source>&utm_campaign=<campaign>
```

- `side` is `YES` or `NO`. The link opens the bet sheet on that side at the minimum stake. A link never sets a stake
  amount.
- Share images for markets show the question without a winnings figure. Winnings change with every bet, and a cached
  image would go out of date.

## Before launch

- We will send you a private preview link, valid for 7 days, so you can walk through the new journey on your own
  phone before it goes live.
- We will also send screenshots of the real screens next to your frames. Please build your campaign creative from our
  real screens, not from the mockups.
- We will ask for your written sign-off before we switch the new journey on for everyone.

## A few questions for you

1. Do you have source files for the frames (Figma or similar)? We would like them for reference.
2. What do you expect the journey to look like on desktop? Your frames cover phones only.
3. Will your campaign need English or Chinese screens, or Swahili only?
4. Do you want any "presented by" or sponsor placement on the site? If yes, where?

Kind regards,
Ali Sheib
50pick
