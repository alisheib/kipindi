# Fresh-session prompt — 50pick Final UI enhancement Kit rollout (autonomous sprint)

> Paste everything between the rules into a new session. Ali is away — run long, unattended, and do
> not wait for approval. Keep going until you genuinely cannot proceed.

---

You are continuing the **Final UI enhancement Kit rollout** into the live 50pick prediction-market app at
`F:\kipindi-main` (Next.js App Router, TypeScript, Tailwind, oklch tokens; trilingual EN/SW/ZH). This is a
long autonomous sprint: **Ali is away and has explicitly authorized you to keep working without asking for
approval. Do not stop to ask "should I proceed?" — proceed. Continue through as many items as you can,
one after another, committing and pushing each, and only stop when you truly cannot go further** (see
"When to stop" at the bottom). Push through as long as you can before you give up.

## Ground truth (read these first, in order)
1. **`docs/ui-rollout-tracker.md`** — the single source of truth. Every item is a row. **The first unchecked
   `[ ]` row is your resume point.** Work strictly top-to-bottom, one item at a time. Update the row (commit
   hash + evidence + notes) the moment an item is done.
2. Your persistent memory **`ui-kit-rollout`** — full running history of every item, the gotchas, and the
   design laws. Recall it. Also recall `five-lens-mindset`, `kipindi-env-setup`, `kipindi-admin-testing`,
   `kipindi-card-standard`, `50pick-naming`.

## Where you are now
Resume at **C2l** (`manifest.json` — add app shortcuts Markets/Wallet/Deposit + a narrow-screenshot label),
then **C2m** (`legal/*` — LegalHeader GiltCorner + per-doc glyph). Everything through **C2k** is done and
pushed (latest: OG cards `3a7a593`, tracker `47ce77e`).

## The queue after C2m (do them in this order unless the tracker says otherwise)
- **Admin reporting ADM1–ADM4** (tracker rows).
- **EMAIL1** — full transactional-email redesign for kit consistency (`src/lib/email.ts` + templates). The
  enhanced kit changed everything; the emails must match. Logo is already mark-a. Redesign the card layout,
  colour tokens, buttons, footer to the kit. Trilingual.
- **AI1** — bring the in-app AI/chat assistant (`src/components/chat/*`) to enhanced-kit standard.
- **Carry-overs (pick up opportunistically):** A8-breadth admin primitives (`AdminMeter`/`AdminBarList`/
  `AdminSpark` in `components/admin/admin-charts.tsx`) on the ~12 admin screens whose data fits; A3
  not-found pegged-bar frame; reduced-motion guard on `nav-progress.tsx` rAF + `[data-motion="reduced"]
  .skeleton{animation:none}`; the audit-tail gold eyebrows on KYC/legal/auth/help.
- **FINAL CLEANUP (do last, only when the queue is exhausted):** delete the uncommitted dev endpoint
  `src/app/api/dev-test/resolve-seed-markets/route.ts` and any other `api/dev-test/*` test tooling — prod
  must ship **only live data**.

## The per-item loop (every single item, no shortcuts)
1. Hold **all five lenses** at once: integration engineer · UI/UX engineer · software architect · manager ·
   player. Perfection standard — nothing less.
2. Implement against the kit at `F:\kipindi-main\Final UI enhancement Kit\50pick-design-final\`.
3. **Mobile FIRST**: verify 360px before anything else, then 768/1280/1920. Lots of users are mobile —
   responsiveness in every detail, no truncation (SW strings are longest), no horizontal page overflow.
4. `npx tsc --noEmit` clean · run the relevant `npm run test:*` (always `test:i18n` → must stay **1217³**;
   `test:wallet` / numeric tests on any money-adjacent change).
5. Live-drive on a **single fresh dev server** and **READ the screenshots** (don't assume — look). Kill
   stragglers first: `taskkill //F //IM node.exe`, confirm one PID via `netstat -ano | grep :3000`, then
   start one `next dev`. Use `/auth/demo` + seed-admin for authed/admin screens.
6. `node scripts/ui-regression.mjs` → must stay **158/158** at 360/768/1280/1920. (An orphaned seeded server
   causes ~57 false `navigator.vibrate` fails — that's the taskkill gotcha, not a real regression.)
7. `git commit` + `git push origin main` (Railway auto-deploys) with the trailer:
   `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
8. Update the **tracker row** (hash + evidence) AND the **`ui-kit-rollout` memory** (what/why/gotchas +
   move the resume pointer). These two are non-negotiable — they're how the next reset recovers.

## Design laws (never violate)
- **Gold = earned-money / earned-status / money-in ONLY.** Navigation, selection, chrome, categories → royal/
  brand/aqua/neutral. No one is above the law. (Sanctioned exceptions already recorded in memory: resolved
  seal, reward burst, leaderboard #1, best-win crest, positive settled P&L, wallet bonus/deposit, the C1a
  gilt hairline "seal of the real".)
- **Only live data in production.** New UI must hide when its aggregates are empty (no hollow bands on a
  fresh deploy). Dev-test endpoints are 404 in prod. Never fabricate counts, balances, geo, logos, or seals.
- **Never regress money paths** (deposit / withdraw / bet / resolve / payout). Keep form field names stable.
- **Trilingual EN/SW/ZH** with i18n parity (1217³ now; bump all three together). **Reduced-motion** fallback
  on every animation (`motionReduced()` from `@/lib/haptics`).
- Category glyphs via canonical `categoryGlyph()`; MarketCard `.mcardp-cat` must stay byte-identical to /live.
- Logo is **mark-a** (green `#1EA362` · red `#B03A3E` · gold `#E3BC66` · pivot navy `#1A2140`); `FiftyMark`
  in `brand.tsx` propagates it everywhere.

## Environment gotchas (bank these)
- Shell cwd resets between calls → use absolute paths; write throwaway scripts to `F:/kipindi-main/.50pick-shots/`.
- Windows `next dev` orphans its node child on :3000 when you kill the wrapper — taskkill the port owner.
- `db.user.list()` / `db.txn.listAll()` are **sync arrays** in the dev store → wrap in
  `Promise.resolve(...).catch(...)` before `.catch`.
- Single-active-session per account (a new login invalidates prior sessions) — reflected in /profile/sessions.
- ⊘ items that are genuinely blocked on Ali (skip, log, move on): trademarked MNO logos, regulator seal,
  bitmap hero/tier/category/texture/win-seal, brand fonts inside ImageResponse (dynamic OG text), env
  (SMS sender ID, deploy domain). Don't fake these; note them in the tracker and continue.

## When to stop
Keep going item by item. **Only stop when one of these is true**, and when you do, leave the tracker +
memory current and write a short status of where you stopped and why:
- Every remaining tracker row is either done or blocked on a ⊘ asset / an explicit product decision only Ali
  can make (record which, then move to the next non-blocked row — don't halt the whole sprint for one block).
- A change would risk a money path or ship non-live data and you can't verify it safely.
- tsc / tests / ui-regression fail in a way you cannot resolve after a genuine debugging effort.
- You have completed the entire queue including final cleanup.

Otherwise: **do not stop, do not ask, do not wait.** Pick the next unchecked row and build it to perfection.
Naming note: **50pick** is the game/product; "kipindi" is only the repo name — never call the game kipindi.
