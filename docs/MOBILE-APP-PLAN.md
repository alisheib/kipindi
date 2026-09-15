# 50pick mobile app — plan and release evaluation

> 🟠 **DESIGN — nothing is built.** Written 2026-09-15 at Ali's request ("store this for later, when we
> start with the app"), from three read-only sweeps of this repo plus the Google Play and Apple policy
> pages as they read that day.
>
> ⛔ **Before acting on anything here, re-verify two kinds of claim.**
> 1. **Store policy moves.** Re-read the four Play pages and Apple's guidelines under §9.
> 2. **The repo moves.** Re-count the Server Actions, re-check whether a geo-fence or FCM sender now
>    exists, and re-read the current state of the licence number, admin 2FA and withdrawals in
>    [`NEXT-PLAN.md`](NEXT-PLAN.md).
>
> A number copied from here without re-deriving it is exactly the drift [`README.md`](README.md)
> warns about.

## 0. Why this exists
The website works end to end. Players have asked for an app. This file answers five questions: which
kind of app, how much of the existing product carries over, everything needed end to end, whether it
can be released, and how long it takes.

## 1. Verdict
- **Build a thin native shell (Capacitor) around the live site, not a React Native app.** About
  90% of the product carries over unchanged.
- **Android first.** Tanzania mobile OS share, Aug 2026 (Statcounter): Android **88.9%**, iOS
  **10.9%**. Until iOS ships, the existing PWA serves iPhone users.
- **Approval is the long pole, not code.** The paperwork (Phase 0) starts the day the app work
  starts.
- **Three things can stop a store release. None is a code problem; all are Ali's:**
  1. Play's gambling categories do not name a pari-mutuel prediction market (§2).
  2. **Up & Down resembles binary options, which Play bans outright** (§2).
  3. **There is no geo-fence anywhere in `src/`**, and both stores require one.

## 2. What the stores require (as read 2026-09-15)
| | Google Play | Apple App Store |
|---|---|---|
| Tanzania allowed? | **Yes.** Real-money gambling apps are allowed; the listed regulator is the Gaming Board of Tanzania | Yes, with a licence for every location where the app is used (5.3.4) |
| Allowed products | Online casino, **sports betting**, lotteries. *"If a product is not on the application form, Play does not permit distribution."* | Real-money gaming generally |
| Our licence | **Pari-mutuel prediction market** (`COMPLIANCE-DECISIONS.md` line ~1985), which has to be mapped to "sports betting" on the form ⚠️ | Same licence |
| Prediction-market route | Play's prediction-market pilot is **US-only** (CFTC/NFA) and **excludes** gambling-licensed apps, which go to the real-money gambling policy. **So 50pick applies under real-money gambling.** | n/a |
| Binary options | *"We do not allow apps that provide users with the ability to trade binary options."* 🔴 Up & Down is BTC/ETH/SOL/XAU up-or-down in short rounds (`src/lib/server/updown-feed.ts`). No doc in this repo had ever addressed this before this file. | Not explicit; a reviewer may read it the same way |
| Geo-fence | Required: prevent use outside the licensed territory | Required |
| Age | Block under-18s; IARC 18+ rating | 17+ rating plus our 18+ gate |
| Payments | Free to install; **no Google Play Billing** for money | Free; no in-app purchase for credit (5.3.3) |
| Account | Organisation developer account (D-U-N-S), $25 once | **Must be submitted by the licensed legal entity** (5.1.1(ix)); $99/yr |
| WebView risk | Low | **4.2: a repackaged website is rejected.** The app needs real native value |

**Fallback if Play refuses:** a signed APK downloaded from 50pick.tz. Google's developer
verification for sideloaded apps starts in four countries (BR/ID/SG/TH) on 2026-09-30 and goes
**global in 2027**, so register as a verified developer either way.

## 3. How much the existing code helps
**Reused unchanged inside the shell:**
- **52 player screens.**
- **i18n in en/sw/zh:** `src/lib/i18n-dict.ts`.
- **Mobile-first UI:** `src/components/layout/bottom-nav.tsx`, the tap floor in
  `scripts/tap-target.test.mts`, `viewportFit: cover`.
- **PWA pieces:** `public/manifest.json`, `public/sw.js`, `/offline`,
  `src/components/pwa/install-invite.tsx`.
- **Deposits:** the USSD push needs no redirect, so it works as-is in a WebView.
- **Live updates:** SSE `/api/events` plus the refresh pollers.
- **Responsible gambling and compliance:** RG limits, self-exclusion, reality check, 18+ date of
  birth, licence footer, consent-gated GA.
- **Deploys reach app users instantly:** `next.config.ts` ties `deploymentId` to the commit SHA, so
  a web deploy reaches the app with **no store re-review for feature changes**.

**Why not React Native now:**
- **No player API.** Every player mutation except logout is a Server Action (about 72 actions across
  20 player `"use server"` files), and reads live in Server Components. A native client would need a
  new `/api/v1`.
- **Cookie-only auth.** `kp_session` is an HMAC cookie read through `cookies()`
  (`src/lib/server/session.ts`).
- **The UI can't be ported.** Colours are `color-mix`/oklch in a ~5,000-line `globals.css` that
  NativeWind can't use, so all 602 `.tsx` files would be rebuilt.
- **Everything twice.** Every future feature and certification suite gets built twice, and every
  change goes through store review.
- **What is reusable later:** the service layer (`src/lib/server/*-service.ts` takes `userId` and
  never imports `next/headers`). A native client stays possible without a rewrite.

## 4. The plan

### Phase 0 — Eligibility (Ali; starts day 1, runs in parallel)
1. **Gaming Board:** written confirmation that the licence covers distribution through a mobile app,
   plus any system/channel approval they require.
2. **Up & Down:**
   - **(a) Recommended:** the store build ships **without** it, and it stays on the web.
   - **(b)** Or ask Google in writing whether a pari-mutuel price-direction pool counts as binary options.
3. **Play Console:** organisation account plus D-U-N-S, then the real-money gambling application for
   Tanzania / sports betting, with the licence attached.
4. **Launch items confirmed** (app installs amplify public traffic):
   - real `NEXT_PUBLIC_LICENSE_REF`;
   - withdrawals open to players;
   - admin TOTP back on.

### Phase 1 — Server prerequisites in this repo (~2 weeks)
1. **Geo-fence:**
   - **Server:** read Cloudflare `CF-IPCountry`. `www` is proxied; the apex is DNS-only and gets
     no header, so the app must use `www`. Gate `buyPositionAction` (`src/app/markets/actions.ts`)
     and the deposit and withdraw actions.
   - **App:** a native location check at login and before a stake.
   - **Scope:** app-only or site-wide is Ali's call.
2. **App identity and kill switch:**
   - The shell sends `X-50pick-App: android/<version>`.
   - New `GET /api/app/config` returns `{minVersion, forceUpdate, features:{updown}}` from
     `SystemConfig`.
   - Add an `isNativeApp()` helper.
3. **Native push:**
   - A `PushDevice` table.
   - An FCM HTTP v1 sender beside `sendPushToUser` in `src/lib/server/push-service.ts`.
   - ⛔ **It must reuse the existing self-exclusion mute**, never a second path around it.
   - An app user gets native push or web push, never both.
4. **Deep links:**
   - `public/.well-known/assetlinks.json` (later `apple-app-site-association`).
   - Links that must open the app: `/auth/reset-password`, `/auth/verify-email`,
     `/wallet/deposit/return`, market share links.
5. **Web-side adjustments when `isNativeApp()`:**
   - Hide the install invite.
   - Push opt-in goes through the native bridge.
   - Hide Up & Down navigation when the flag is off.
6. **Store compliance:**
   - Confirm account closure meets Play's in-app plus web **account deletion** rule.
   - Add an app section to Privacy (FCM token, device, location) with a version bump.
   - Fill in Play's Data safety form from it.

### Phase 2 — Android shell (~2–3 weeks)
New top-level `mobile/` package, kept outside the Next build.

**Capacitor configuration:**
- `server.url = https://www.50pick.tz`.
- `allowNavigation` restricted to 50pick.tz plus the Selcom checkout host.
- A **bundled** offline page (a remote URL can't serve `/offline` with no network).

**Plugins:**
- push (FCM)
- app (back button, deep links)
- splash / status bar `#0a0e33`
- network
- browser (Custom Tabs for Selcom card checkout)
- geolocation
- Play in-app updates
- **v1.1:** biometric unlock

**WebView checks:**
- The KYC `capture="environment"` file chooser.
- SSE stays open.
- The session cookie survives restarts.
- `sw.js` doesn't double-notify.
- The USSD prompt works while the app is backgrounded.

**One session per account:** the app is another device, so app ↔ web sign-ins displace each
other (existing `session-registry.ts` behaviour).

**Release plumbing:**
- Play App Signing.
- `versionCode` bump.
- Client crash reporting (Sentry Capacitor or Crashlytics). **There is none today.**

### Phase 3 — Verification (1–2 weeks)
**Proposed gates**, each with a red twin that proves it can fail:
- **app-config:** min version, feature flag.
- **push-device:** the FCM sender respects the self-exclusion mute.
- **geo-gate:** a non-TZ country is refused on buy/deposit/withdraw; TZ passes.
- **A live probe that `assetlinks.json` serves the right SHA-256.**

**Real devices:**
- **Devices:** a low-end 2 GB Android (Tecno/Infinix/Samsung A) plus one mid-range.
- **Network:** throttled to 3G. `feature-backlog.md` already notes ~20 s LCP on 2G.
- **Full flow:** register → verify email by deep link → USSD deposit → pick → cash out → KYC
  camera upload → withdraw TZS 1,000 → self-exclude (FCM push must **stop**) → web sign-in
  (the app is displaced) → airplane mode → raise `minVersion` (forced update).
- **Discrimination, not presence:** each drive must show something that could not happen if the
  feature were absent. The push arrives before self-exclusion and not after; the geo gate is tested
  from outside TZ.

**Load:** re-measure the SSE ceiling and DB pool before a store launch drives an install spike.

### Phase 4 — Release (Android)
Internal testing → closed testing (staff plus trusted players, ~2 weeks) → staged production 10% →
50% → 100%. Watch crash-free rate, deposit success and `/api/health`. APK download only if Play
refuses.

### Phase 5 — iOS
- **Account:** Apple organisation account in the licensed company's name.
- **Build:** the same shell plus APNs.
- **Native value against 4.2:** biometric unlock, rich push, native share/haptics.
- **Location:** geo-restricted to Tanzania.
- **Expect** at least one rejection round.

## 5. Time
Estimates, not measurements.

**Recommended shell, both platforms planned together:**
| Step | 2 devs | 1 dev |
|---|---|---|
| Server prerequisites (Phase 1) | 2 wk | 2 wk |
| Android shell | 2–3 wk | 2–3 wk |
| iOS additions | overlaps Android | +2–3 wk |
| Real-device testing, both | 2 wk | 2–3 wk |
| **Engineering** | **~7–8 wk** | **~10–11 wk** |
| Store approval (starts day 1) | Play gambling application 2–6+ wk; Apple 1–2 rejection rounds | same |
| **Live in both stores** | **~12–14 wk** | **~16 wk** |

Android alone is ~8–10 weeks to Play, with iOS ~4 weeks after.

**Full native (React Native), for comparison:**
| Step | Time |
|---|---|
| New `/api/v1` | 4–6 wk |
| Token auth | 1–2 wk |
| Rebuild 52 screens | 10–14 wk |
| Push, links, payments | 2–3 wk |
| Re-certify as a second client | 4 wk |
| **Total** | **6–8 months with 2–3 devs**, and every later feature built twice |

**Cash cost:** Play $25 once, Apple $99/yr, 2–3 test phones; FCM and Capacitor are free.

## 6. Release-readiness scorecard (2026-09-15)
| Area | State | Closes in |
|---|---|---|
| Product and features | 🟢 complete, live, localised | reused |
| Mobile UX / PWA | 🟢 mobile-first, tap floors, offline, manifest | Phase 2 polish |
| Play eligibility | 🔴 not applied; category fit unconfirmed | Phase 0 |
| Up & Down vs store policy | 🔴 binary-options ban | Phase 0 decision |
| Geo-fence | 🔴 none in code | Phase 1.1 |
| Native push | 🟠 web push only; `FCM_*` env vars exist but are unused | Phase 1.3 |
| Deep links / account deletion / Data safety | 🟠 missing or unconfirmed | Phase 1.4–1.6 |
| Client error tracking | 🔴 server-only Sentry | Phase 2 |
| Payments in app | 🟢 USSD · 🟠 card needs Custom Tabs | Phase 2 |
| Low-end / 2G performance | 🟠 ~20 s LCP on 2G | Phase 3 |
| Install-spike scale | 🟠 re-measure SSE ceiling / pool | Phase 3 |
| iOS | ⚪ later; PWA meanwhile | Phase 5 |

## 7. Decisions only Ali can make
1. Up & Down in the store build: hide it (recommended) or ask Google first.
2. Geo-fence scope: app only, or the whole site.
3. Which legal entity holds the Play and Apple accounts. It must be the licensee.
4. App ↔ web session displacement is acceptable (today's one-device rule).

## 8. When the work starts
- Put the first unit into [`NEXT-PLAN.md`](NEXT-PLAN.md), which stays the one live plan, and
  change this file's status in [`README.md`](README.md).
- Record the Up & Down ruling and the geo-fence scope in
  [`COMPLIANCE-DECISIONS.md`](COMPLIANCE-DECISIONS.md), not here.

## 9. Sources (read 2026-09-15)
- Google Play — Real-Money Gambling, Games and Contests: https://support.google.com/googleplay/android-developer/answer/9877032
- Google Play — country/region allowances: https://support.google.com/googleplay/android-developer/answer/12256011
- Google Play — prediction market pilot: https://support.google.com/googleplay/android-developer/answer/16902027
- Google Play — Financial Services (binary options): https://support.google.com/googleplay/android-developer/answer/9876821
- Apple — App Review Guidelines 4.2, 5.1.1(ix), 5.3: https://developer.apple.com/app-store/review/guidelines/
- Statcounter — Tanzania mobile OS share: https://gs.statcounter.com/os-market-share/mobile/tanzania
- Android developer verification timeline: https://www.androidauthority.com/android-sideloading-changes-timeline-3679204/
