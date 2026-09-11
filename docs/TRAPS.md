# Traps — things that bit us, and how to recognise them again

## Deploy skew: a deploy breaks every page a player already has open (2026-09-12)

**Symptom the owner reported:** a player submits KYC fine, clicks to confirm their email
so they can deposit, and lands on a page saying *"This page has encountered a problem.
Your funds are safe."* It was reported as "a not found". **It is not a 404.**

**Cause.** Every `next build` mints new Server Action ids. A browser holding an
already-open page still has the PREVIOUS build's ids, so the first click after a deploy
posts an id this server has never heard of:

```
Error: Failed to find Server Action "y". This request might be from an older or newer deployment.
```

Nothing catches it, so the route's error boundary renders.

**⭐ How to find it fast next time: read what the page SAYS, not where it is.** The words
*"your funds are safe"* are `t.error.walletSafe`, used by exactly one file —
`src/app/wallet/error.tsx` — which pins the failure to `/wallet/**` in a single grep. A
404 and an error boundary are different bugs with different hunts.

**Why this journey.** KYC → deposit has a pause built in, measured in minutes or hours:
submit identity, leave for the inbox, confirm the address, return to the tab still open.
Any deploy inside that window stales the page. On a day with ~30 deploys it is nearly
certain.

**The fix (two parts; neither works alone).**
1. `deploymentId` in `next.config.ts`, from the commit sha. Railway serves one version at
   a time, so there is no old deployment to route back to — what this buys is that Next
   publishes the id to the browser as `globalThis.NEXT_DEPLOYMENT_ID`.
   ⛔ Never a timestamp or random value: a value that moves between the server and client
   build makes every client look stale forever.
2. `src/components/ui/route-error.tsx` — the boundary every route shares — reloads the
   document **once per build, per tab, per path**.
   ⛔ Key it on the BUILD ID, not a boolean: a plain "already tried" flag spends the tab's
   only recovery on the first error it ever sees, so the NEXT deploy dead-ends the player
   anyway. `test:deploy-skew` §3d is that arm.
   ⛔ It reloads the PAGE, never retries the ACTION — replaying it could double-submit a
   deposit.

**Guard:** `npm run test:deploy-skew` — 19 assertions, no database or network, in
`predeploy`, RED-tested against four mutations.

**⛔ Ruled out on evidence, so nobody re-hunts it:** the verification link itself is fine.
A real delivered link was followed end to end from the Postmark log — correct host, not
rewritten by click tracking, 200, "Email confirmed". The route, the token and the page
all work.
