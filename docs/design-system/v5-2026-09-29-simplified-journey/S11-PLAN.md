# S11 — How to Play complete, and the copy ready for the flip: build plan (drafted 2026-10-14)

> The working plan for VODACOM-PLAN S11, "How to Play complete: §3.8 auto-open rules, plus the flip-ready copy: FAQ,
> chat intents, rules page, terms, tagline, OG re-renders" (`docs/VODACOM-PLAN.md` :5038-5039; the board row :3927,
> done when "Auto-open rules are proven. FAQ, chat intents, Rules, Terms and tagline are ready for the flip."). Drafted
> read-only on 2026-10-14 by one planner on OMEGA-COMPILE01, in `C:\50pick-ssd\kipindi-s11` (branch
> `codex/vodacom-s11-plan`) at live main `f830a091c`. Every file:line below was re-read at that commit; none is copied
> from an older plan. Run for facts only: a dictionary census (Correction 8), Playwright's user agent and
> `navigator.webdriver` in its three engines (Correction 12), and crops of the two share pictures (Correction 5). No
> suite, server or build was run. Status lives in VODACOM-PLAN §0 (a new §0l, opened by WP0); this file is the how. Its
> Open points are decisions taken under Ali's delegation, each with the overrule he may choose; WP0 files them as
> numbered §0h points after the last one on main.
>
> **Base.** S8 is in progress (§0k) and edits `app-shell.tsx`, `shell-lazy.tsx`, `i18n-dict.ts`, the privacy page and
> the journey home, each a file S11 edits too; S9 and S10 may edit some of them. So WP0 re-reads every number here at
> S11's real base before any package starts (S7-PLAN A24's method, S8-PLAN A1's).
>
> **Re-read at the build base `c14cb403e` (2026-10-14), by the build session:** 402 citations, four readers; 295 exact,
> 98 moved by the base's own edits and 9 wrong at drafting, all corrected in place. The Amendments (B1-B13) at the end
> override the body; § Build record holds the build's progress, results and the text proposed for the trackers.

## Summary

### What S11 builds

For a journey reader only until the S15 flip, except the two items marked "every player":

1. **How to Play, complete (§3.8, :4789-4817).** S7 built the How-to card and the static sheet, which opens on a tap
   only (S7 WP6; S7-PLAN Open points 18-19, :1426-1430). S11 adds what §3.8 still asks:
   - **auto-open**, once per browser, on `/`, `/live`, `/results` and `/watchlist` only, 700 ms after landing; never
     with `bet` or `side` in the address, over another dialog, or during a break; the automation block kept (and
     widened, Open point 6);
   - **the seen key** `50pick-howto-seen`, written by every exit of the sheet, whether a tap or the auto-open opened it,
     and named in Privacy §7 in the same commit as the first write (§3.10, :4868-4869);
   - **the deep link** `/?howto=1`;
   - **consent waits**: the analytics card stays hidden while the sheet is open;
   - **`primer-keys.ts`**: the primer's path rules, seen key and opt-ins move to `src/lib/onboarding/primer-keys.ts`,
     shared by the shelved primer (its behaviour unchanged) and the new host;
   - **the Chinese How-to words**: the two corrections S4-COPY-AUDIT.md:140 recorded and S7 did not take
     (Correction 4).
2. **The copy, ready for the flip.**
   - **FAQ:** journey copies of faq2 (question and answer), faq3a, faq5a and faq6a, which `/help` shows a journey
     reader now.
   - **Chat:** for a journey reader now, the offline answers and the chat panel's intro line and starter chip. The live
     assistant's journey prompt is prepared now and switched by the rollout itself at ACTIVE.
   - **Tagline:** every surface of the retired slogan reads one dictionary key now, with the same words. The flip then
     changes that key's three values, the manifest and the share pictures.
   - **Rules and Terms:** rewritten so they are true in both looks, signed in review 9, and parked as one commit on
     `vodacom-s15-copy` for the S15 commit, with their versions.
   - **Share pictures:** a tracked generator. The S15 pictures are rendered and read on the parked branch.
   - **The census guard:** `test:flip-copy` names everything the flip must still change and fails on anything new.
3. **Every player, its own release:** the X/Twitter share picture loses the Next.js developer badge and our chat bubble,
   which were captured into it (Correction 5).

### Why a classic visitor's served markup does not change

- **The How-to host** mounts in AppShell's journey-only slot, beside the flag (`{journeyShown && …}`, app-shell.tsx:492).
  A classic request still renders that slot as one `false` (Open point 3). The host draws nothing until it opens, and
  the kit Modal portals only while open.
- **`/help`'s FAQ** takes the journey copies in a same-slot ternary on the answer and question lines (help/page.tsx:136,
  :152-154). The page already asks the resolver (:54). The else arm is today's expression, not re-indented.
- **The chat** gives the journey branch only to a reader `useJourneyOn()` says is in the journey (ChatRoot.tsx:98). The
  live prompt switches only when the global rollout is ACTIVE (`simpleJourneyStateNow`,
  simple-journey-switch.ts:341-347). Until S15 that state is STAFF_PREVIEW, so every reader, staff included, gets
  today's prompt.
- **The tagline refactor** prints the same strings: every surface reads `auth.railTagline`, whose three values equal
  today's literals (Correction 6).
- **The legal texts and the new pictures** are not merged before S15.

### What does change for a classic visitor

Named in §0l under "Served bytes for a classic viewer", each with its proof:
- (a) **Every visitor: the privacy notice.** §7 names `50pick-howto-seen`, with a new version (WP4; Open point 12, Point
  for Ali 3). It joins §2's pre-flip list.
- (b) **Every share: the X/Twitter picture** without the developer badge and the chat bubble (WP1; Point for Ali 2).
  It joins §2's list.
- (c) **JavaScript, output unchanged** (the S6–S8 precedents):
  - the dictionary's new journey keys, on every page (WP3);
  - shell-lazy's chunk, one more export, on every page (WP4);
  - the primer's chunk, its constants now imported (WP2);
  - the chat's chunk, the journey branch and EmptyState, on pages where the chatbot is mounted (WP6).
- (d) **Server code with identical output:** `/help`, the root metadata, the two OG routes, the reports' brand line and
  the rules page's subtitle (WP5, WP7).
- (e) **HTML and RSC of every other page:** none. qa:classic-shell-parity v4 and qa:served-skeleton `--main` prove it,
  with `/help` added to the skeleton's routes (WP5).

### What S11 leaves to later sessions, and why

- **S12:** the NDIYO sweep of the seven dictionary strings (faq1a and faq1aLoser among them) and the classic live-word
  corrections (§0h point 3); the market share card's short title and "no multiplier"; the manifest's shortcuts and
  screenshot; Juu/Chini. The up-down rulebook's two "nafasi" are S12's (Open point 25).
- **S14:** staff seeing the auto-open on production, and the agency's preview link (§0h point 4). The How-to frame in
  the identity checklist.
- **S15:**
  - publishing the parked commit (the legal texts and their versions, the tagline's values, the manifest, the
    pictures);
  - the rollout flip itself, which also switches the journey copies and the live prompt;
  - the dictionary convergence of the classic keys (the census names them);
  - CLAUDE.md and the `/admin/config` copy.
- **S16:** the classic FAQ and chat keys, the stub's classic dial branch and the primer listed as shelved; the optional
  rename of `auth.railTagline`.

### Order (12 packages, each green on its own)

1. WP0: the start line (S8 closed, the reds, the citations re-read, the records).
2. WP1: the X/Twitter share picture (live fix, every player, its own release).
3. WP2: `primer-keys.ts`, the shared keys and opt-ins.
4. WP3: S11's words (the journey keys, the zh How-to corrections, review 9).
5. WP4: the How-to host: auto-open, deep link, seen key, consent waits, Privacy §7.
6. WP5: the FAQ for a journey reader.
7. WP6: the chat: offline answers, panel words, the live prompt keyed on the rollout.
8. WP7: the tagline's one home, and the census guard `test:flip-copy`.
9. WP8: the share-picture generator (lands as a tool; it writes nothing into `public/` before S15).
10. WP9: the parked S15 copy commit (Rules, Terms, the tagline's values, the manifest, the pictures), on
    `vodacom-s15-copy`.
11. WP10: the drives (`qa:howto`; the FAQ and chat tiles).
12. WP11: proof, records, merge, deploy.

### Corrections to the maps, verified in the files

1. **§3.8's "24 QA drivers" (:4794) is stale**, as S7-PLAN Correction 14 (:164-167) found at 32 on 2026-10-04.
   - At `f830a091c`, 46 scripts name `50pick-primer-seen`: 45 seed it (qa-journey-shell.mjs:210, :936 through a
     constant) and `verify-s1-visual.mjs` removes it.
   - Four use `?primer=1`: marketing-u8-optout-drive, support-surface-shots, qa-lost-chunk and qa/landing-ten.
   - One names `kp-primer-force` (qa-lost-chunk), as its marker for the primer's CHUNK, not as the opt-in (qa-lost-chunk.mjs:89, :105-112; Amendment B4).
2. **§3.8's sizing line (:4808) is superseded by S7's build.** It reads `max-h-[calc(100dvh-48px)] overflow-y-auto`,
   which scrolls the whole panel. S7-PLAN Open point 20 built instead:
   - a cap in CSS, `.kp-howto { max-height: calc(100dvh - var(--sp-12)) }` (globals.css:7652);
   - only the steps and MFANO scroll, under a fade; the title, the CTA and Weka mipaka stay pinned
     (how-to-play-sheet.tsx:20-26, :133-162).

   §3.8's "built with `fillNodes`" (:4806) is `fill` plus `keepRanges`/`noticeBody` (:114-123, :209-223). Both are
   records of what was built, not defects.
3. **The plan's helpline lines are struck, but one compliance entry still says the opposite.**
   COMPLIANCE-DECISIONS 2026-09-29 §5 still says "the helpline is in How to Play and the footer" (:1550). The
   2026-10-06 entry's "Supersedes" list (:1075-1077) names other entries but not this one. WP4's compliance entry
   records the supersession; the log never edits an old entry (its practice, stated where an entry supersedes others, e.g. :839).
4. **The zh How-to words carry a false sentence.** The §3 table's zh drafts (VODACOM-PLAN.md:3996, :3997, :4000,
   :4002) shipped verbatim in S7 WP4 (i18n-dict.ts:8095, :8096, :8099, :8101).
   - howStep3Body says 赢家平分奖池, "winners split the pool equally". Payouts are pro rata (COMPLIANCE-DECISIONS
     :1597-1605 states step 3 must be literally true).
   - The side words are unquoted in running text.
   - S4-COPY-AUDIT.md:140 recorded both corrections, and the zh board `s4-canvas/s4-7-howto-zh.dc.html` draws them
     (「是」或「否」; 赢家按投注比例分享奖池).
   - S7-PLAN Open point 22 (:1442-1443), "the §3 table wins where the canvas's en/zh differ", was not meant to keep a
     draft the audit had found false. WP3 corrects it.
5. **§4's ripple row for How to Play (:4884) names the wrong surfaces**, as "slogan on ~12 surfaces (… `public/og/*.png`)".
   - `public/og/og-1200x630.png` and `twitter-1200x600.png` do not carry the retired slogan. They read "The wisdom of
     YES & NO." and "Pesa kidogo, ukweli mkubwa.".
   - `twitter-1200x600.png` has the Next.js dev-tools "N" badge (bottom left) and our gilt chat bubble (bottom right)
     captured into it. layout.tsx:173 serves it as the default `twitter:image`, on every page but the five that set their own (markets/[id], leaderboard, results, proposals, auth/register). This is a live defect.
   - Missing from the row: `/api/og/page`'s own line "The wisdom of YES & NO" (route.tsx:59-61); register/page.tsx:31
     and page.tsx:32, two more readers of the slogan key; and `primer.card1Title`, a second, differently translated zh
     slogan (i18n-dict.ts:7377 预测事件。不是碰运气。 against :6149 预测事件，而非运气。).
6. **The ~12 slogan surfaces, verified** (the full table is under "The tagline" below).
   - **Root metadata:** layout.tsx:103, :120, :171.
   - **Readers of `auth.railTagline`** (en :507, sw :3666, zh :6149): auth-shell.tsx:50-51, page.tsx:32 and
     register/page.tsx:31.
   - **Literals elsewhere:** the market share card (route.tsx:122, :236); `reports/brand.ts:47` (read by pdf.ts:119 and
     xlsx.ts:140); the rules page's subtitle (rules/yes-no/page.tsx:40-44); and manifest.json:2 and :71 (the second a
     variant, "Predict events, not chance").
   - **Every literal equals the key's value** in its language, or "50pick — " plus the en value (layout.tsx, manifest.json:2); manifest.json:71 is the named variant. So one home is a byte-identical refactor (WP7).
7. **SJ-20's zh tagline does not exist.** INHERIT-MANIFEST:72 says "(sw and zh drafted)", VODACOM-PLAN.md:4314 says "zh
   draft", and no zh text exists anywhere. WP3 drafts it.
8. **§3.9's guard list is incomplete for zh and sw** ("dial / kidhibiti / 转盘 / conviction / imani", :4837).
   - The dictionary also names the dial as 刻度盘 and the conviction as 信念 in zh, and as kipima (i18n-dict.ts:4194)
     and kipimo (:4989) in sw; the Terms say kipima-dau (terms/page.tsx:371).
   - "kipimo" is also ordinary Swahili for a unit (i18n-dict.ts:3636), and "kipima" for a gauge ("kipima muda", a timer, :3708), so a word list alone either
     misses or over-matches.
   - Census at `f830a091c`: 23 en, 16 sw and 17 zh entries name the dial, all under the same 23 keys. `lipa.ussdLabel`
     ("Can't scan? Dial") is the verb, a false positive.
   - Judged by key, that is 22 keys. The guard judges by key (Open point 23).
9. **§3.9's four other flip rewrites (:4831-4836) sit on surfaces a journey reader no longer meets.**
   - `market.noBetYet`: the classic question page's holder block, [id]/page.tsx:1032.
   - `positions.noOpenBody` and `positions.headlineBody`: classic /positions, positions/page.tsx:261, :326 and
     positions-ghost.tsx:81.
   - `error.failBalanceInsufficient`: the registry's `balance_insufficient` key (failure-reasons.ts:289), which the
     sheet never shows (§3.3).
   - The census lists them rather than rewriting them (Open point 24).
10. **The legal texts need more than §3.9 names.**
    - Rules sw §1 types "NDIYO/HAPANA" (_content-yes-no.tsx:259), though the file's own note says the side words are
      "now one lookup" (:42-55, the phrase at :54).
    - Rules sw §2 and §4 say "nafasi" (:280, :322) and "dau zote" (:315).
    - Terms sw §4 says "Dau zote — NDIYO na HAPANA — zinakusanywa" (terms/page.tsx:351), "Dau za … zinarudishwa zote na
      haziguswi" (:355-356) and "Kama dau zote ziko" (:361). It also says "Wakati dau bado liko wazi" and "Mara dau
      litakapofungwa", which is the error S4-COPY-AUDIT.md:97 corrects in `payoutCalcBody` (:372, :374).
    - Terms §7's six links are still gold (:247-248, :414-415, :537-538). They are DESIGN_AUTHORITY §B4c's held
      exception (:373-376), moving "with the next Terms version", and `test:visual-pass-r8a` 5.2 holds them
      (HELD :604-607).
    - SJ-19's "7 NDIYO strings" (§2, :3943) counts dictionary strings only.
11. **Every dictionary and legal edit reads red on a branch by construction.**
    - `test:house-bot-disclosure` 5.1 pins every tracked file under `src/app/legal/`, `terms-version.ts` and
      `i18n-dict.ts` to `origin/main` (house-bot-absence-cases.mts:167-191). Only S8's exact additions are exempt
      (`scripts/lib/s8-published-words.mts`).
    - 6.6 pins `src/app/_actions/chat.ts` byte-identical to `origin/main` (house-bot-chatbot-cases.mts:290-296).
    - Three checks pin the prompt's call shape exactly: `test:privacy-notice` §2c (:196-198),
      `test:house-bot-disclosure`'s 6.5b (house-bot-chatbot-cases.mts:283) and `test:visual-pass-r8d` 8.5 (:541-544).
    - Each goes green once the change is on main (S7 WP4's precedent). Record it; do not fix it.
12. **"The HeadlessChrome block is kept" (§3.8 :4815) covers headless Chromium only.** Measured on this machine:
    - Playwright's Firefox (148) and WebKit (26.4) user agents carry neither "HeadlessChrome" nor "Playwright";
    - `navigator.webdriver` is `true` in all three engines.
    - The primer is kept off Firefox and WebKit drives only by the 45 scripts that seed its key. Under `ENGINE=webkit`
      (qa-bet-sheet.mjs:40), qa-bet-sheet's cells that load `/` with a pass wait 1200 ms (:749, :910): an auto-open
      at 700 ms would cover them (Open point 6).
13. **The privacy notice already covers display choices generically.** §7: "Some display choices, such as hiding your
    balance or dismissing a prompt, are kept in your browser's own storage" (privacy/page.tsx:214, sw :344, zh :466).
    The primer's key was never named. §3.10 asks to name the How-to key (Open point 12).
14. **The live prompt cannot vary per reader without a privacy change.** `chat-reader.ts:9-12` and
    `test:privacy-notice` §2c rest the privacy notice's §4 sentence on one premise: the system prompt is built "from the
    locale and one global setting alone". A per-reader journey prompt would tell Anthropic that a reader holds a staff
    preview pass. So the live prompt keys on the global rollout (Open point 15).
15. **The chat panel's own words name the dial**, and the plan never listed them: `chat.helpline` "Ask me about
    deposits, the dial, payouts…" (i18n-dict.ts:2124, sw :4886, zh :7356; a misleading key name, not a helpline) and
    `chat.starterDial` "What's the conviction dial?" (:2126, :4888, :7358), the starter chip EmptyState.tsx:22-27 sends.

## §3.8 — what S7 built, and what S11 builds

| §3.8 item | At `f830a091c` | S11 |
|---|---|---|
| `how-to-play-sheet.tsx` (:4792) | Built (S7 WP6): `HowToPlaySheet` (:165-237), the kit Modal sheet 440 wide (:172-180) | Every exit writes the seen key; claims the bottom zone while open (WP4) |
| The primer shelved intact; keys to `primer-keys.ts` (:4793-4794) | Shelved for a journey reader by one term (first-visit-primer.tsx:278, :319, :377; SHELVED.md:43); keys and opt-ins still in the file (first-visit-primer.tsx:24, :27, :32, :42-50) | WP2 moves them, behaviour unchanged |
| `?primer=1`, `kp-primer-force` keep working | `primerForced()` (:42-50), the UA line (:328) | Shared through `primer-keys.ts`; the host honours them for its auto-open |
| Seen key `50pick-howto-seen` (:4795) | Absent by design (S7 Open point 18); `test:journey-home` 5.storage pins "nothing writes" (:1418-1423) | WP4, with Privacy §7 |
| Order: title + ✕ → steps → MFANO → CTA → Weka mipaka (:4796-4798) | Built, no helpline (A6) (:181-234) | — |
| Weka mipaka: signed in → `/profile/responsible-gambling`, else `/legal/responsible-gambling` (:4801) | Built (:83, :230) | — |
| "Every exit persists the seen flag" (:4804) | No key yet | WP4 |
| "Links close the sheet, then navigate" (:4804) | Built (`onClick={onClose}` on the link, :230) | The close now writes the key first |
| Side words from `sideWord()`; MFANO from `HOW_TO_EXAMPLE` (:4806) | Built (:168, :75-80, :213-221) | zh corrections (WP3) |
| Sizing (:4808) | Built differently and better (Correction 2) | — |
| Auto-open only on `/`, `/live`, `/results`, `/watchlist` (:4811) | Not built | WP4 |
| HIDE_ON and SUPPRESS_ON kept (:4812) | In the primer (:27, :32) | Shared; the host tests both in its effect AND its render (the `test:stacking` 8.1 lesson, stacking-contract.test.mts:858-875) |
| Never on wallet, RG, Up & Down, a question, `?bet=`, `?side=`, an open sheet, a break (:4813-4814) | — | WP4: an allowlist of four routes, plus `bet`/`side`, an open dialog and `promoSuppressed` |
| HeadlessChrome block kept (:4815) | The primer's UA test (:328) | Kept, plus `navigator.webdriver` (Open point 6) |
| Consent waits until the sheet closes (:4816) | Not built: the consent card's mount is ungated (consent-prompt.tsx:61-62; S6-PLAN.md:602; S8-PLAN Correction 5) | WP4, through the invitation slot (Open point 7) |
| Deep link `/?howto=1` (:4817) | Not built (S7 Open point 19) | WP4 |

## The flip copy, surface by surface

"Now" means it ships behind the flag in S11: a journey reader sees it, a classic reader is served what they were. At the
flip, ACTIVE makes every reader a journey reader, so it needs no S15 edit. "Parked" means it is written, signed and
proven on `vodacom-s15-copy` and published by the S15 commit.

### FAQ (`/help`)

| Item | Today (en; sw, zh) | Target | When |
|---|---|---|---|
| faq2 question | "Will my odds change after I place?" (i18n-dict.ts:2256; :4988, :7455). "Odds" is the word the deck replaces ("users see reward, not odds", slide 3) | `journey.faq2q` | Now |
| faq2 answer | Names "the dial" and "The bet-confirm popup holds the quote for 10 seconds", both shelved at the flip (:2257; :4989, :7456) | `journey.faq2a` | Now |
| faq3 answer | "Open Wallet → Withdraw…", with "TZS 5,000,000" typed (:2261; :4991, :7458) | `journey.faq3a`, the journey's two withdraw doors (the capsule's sheet, SJ-15; Akaunti's row, hub-rows.ts:219); `{max}` from `WITHDRAW_MAX_TZS` | Now |
| faq5 answer | "Open Profile → Responsible gambling" (:2271; :4995, :7462) | `journey.faq5a`, "Account → Set limits" (hub-rows.ts:188). The at-risk answer gets the shortest true path | Now (Open point 14) |
| faq6 answer | "a Sell-now button on any open position … 5 minutes" (:2273; :4997, :7464) | `journey.faq6a`, in the journey Sell look's words (`journey.sellFreeCta`, `sellFreeUntil`), no typed number: each ticket shows its own end | Now |
| faq1, faq4, faq7, faq8 | Unchanged. faq1's sw "NDIYO" and "Dau za" are S12's sweep | — | — |

### The chat

| Surface | Today | Target | When |
|---|---|---|---|
| Offline answers (`send-message.ts`) | The dial intent (:247-263); "deposits, the dial, payouts" (:218-219); "Open your **Wallet** and tap **Deposit**" (:230); "**Wallet → Withdraw**" (:278); "**Profile → Verify identity**" (:350, :358); "Profile → Invite friends" (:402-403); a zh hand-off with no How-to (:189-197); the intents index in the header (:20-29) | A journey branch per reader: a how-to-play intent (it also answers "dial") citing `/?howto=1`; the journey's doors in the other answers | Now |
| Panel words (EmptyState.tsx:22-27, :38) | `chat.helpline` and `chat.starterDial` (Correction 15) | `journey.chatIntro`, `journey.chatStarterHowTo` | Now |
| Live prompt (`_actions/chat.ts`, `buildSystemPrompt` :137-187) | "the conviction dial" (:156, :161) and "the dial" (:158); the deposit example "Open **Wallet → Deposit**" (:148); "The exact payout is not knowable…" (:164); "FREE for 5 minutes" (:171); KEY PAGES with `/markets` (:181) | The journey prompt: the named lines swapped (WP6 step 3), every money, RG, identity and email line verbatim | Prepared now; switches itself when the rollout is ACTIVE (Open point 15) |

### The rules page (`/legal/rules/yes-no`)

All of this is parked. The text is written true in both looks (Open point 19): the file's own header shows the
precedent, "written so it is TRUE IN EVERY FEATURE STATE" (_content-yes-no.tsx:11-14).

| Where | Today | Target |
|---|---|---|
| §2, stake bounds | en "… per position." (:105); sw "kwa kila nafasi." (:280) | "… per bet."; "kwa kila dau." |
| §3, the indicator | en "The conviction indicator shows where the crowd's money sits. It is information, not advice." (:127); sw (:301); zh (:458) | en "What a market shows before you bet — where the money sits, or an estimate of what a bet would return — is information, not advice." sw "Kile ambacho soko linaonyesha kabla hujaweka dau — pesa zilipo, au makadirio ya kiasi ambacho dau litalipa — ni taarifa, si ushauri." zh "市场在您下注前显示的内容——资金分布，或某笔投注可获回报的预估——仅供参考，不构成建议。" |
| §4, new paragraph after the commission paragraph (en :140-144, sw :313-317, zh :470-472) | — | en "**Estimates shown before you bet.** Before you bet, a market may show an estimate of what a bet would return if its side wins. An estimate is information, not a promise: it changes as other players bet, and what a winning bet is paid is fixed only when betting closes, from the final pools and after our commission." sw "**Makadirio yanayoonyeshwa kabla ya kuweka dau.** Kabla hujaweka dau, soko linaweza kuonyesha makadirio ya kiasi ambacho dau litalipa upande wake ukishinda. Makadirio ni taarifa, si ahadi: hubadilika wachezaji wengine wanapoweka dau, na kiasi ambacho dau lililoshinda hulipwa huamuliwa tu uwekaji dau unapofungwa, kutoka kwa mabwawa ya mwisho na baada ya kamisheni yetu." zh "**下注前显示的预估。**下注前，市场可能会显示若所选一方获胜时某笔投注可获回报的预估。预估仅供参考，并非承诺：它会随其他玩家下注而变化；获胜投注的实际派彩仅在投注关闭时，依据最终资金池并扣除我们的佣金后确定。" |
| sw §1, §4 | "soko la NDIYO/HAPANA" (:259); "Kama dau zote zipo" (:315); "ikiwa nafasi hiyo haikugharamiwa" (:322-323) | `soko la {w.sw.yes}/{w.sw.no}`; "Kama madau yote yapo"; "ikiwa dau hilo halikugharamiwa" |
| Version | META "Version 2026-10-12 · Effective on entering a market." (yes-no/page.tsx:52-56) | The S15 publication date, set in the S15 commit |
| Subtitle | `SUBTITLE` (:40-44), the retired slogan | Reads `t.auth.railTagline` now (WP7, the same words); takes the tagline at S15 |

### The Terms, and `TERMS_VERSION`

All of this is parked. The Terms §4 paragraph is true in both looks.

| Where | Today | Target |
|---|---|---|
| §4, the dial paragraph | en :203-208 "The probabilities shown on the dial are *implied* by the current pool composition and update with every new bet — they are not guaranteed odds. While betting is open … **The moment betting closes, the pools are final and we notify you of the exact amount you will receive if your side wins.**"; sw :370-376 ("kipima-dau", "Wakati dau bado liko wazi", "Mara dau litakapofungwa"); zh :507-510 (转盘) | en "Before you bet, a market may show what its pools imply — the share of the pool on each side, or an estimate of what a bet would return if its side wins. Neither is guaranteed odds: both change with every new bet, and while betting is open your final payout is not yet determined, because the pools are still moving. **The moment betting closes, the pools are final and we notify you of the exact amount you will receive if your side wins.**" sw "Kabla hujaweka dau, soko linaweza kuonyesha kile ambacho mabwawa yake yanadokeza — sehemu ya bwawa iliyo kila upande, au makadirio ya kiasi ambacho dau litalipa upande wake ukishinda. Hivyo si bei (odds) za uhakika: vyote hubadilika kila linapowekwa dau jipya, na wakati uwekaji dau bado uko wazi, malipo yako ya mwisho bado hayajapangwa kwa sababu mabwawa bado yanabadilika. **Mara uwekaji dau utakapofungwa, mabwawa yatakuwa ya mwisho na tutakujulisha kiasi kamili utakachopata iwapo upande wako utashinda.**" zh "下注前，市场可能会显示其资金池所隐含的信息——各方在资金池中所占的份额，或若所选一方获胜时某笔投注可获回报的预估。两者均非保证的赔率：它们会随每一笔新下注而变化；在投注开放期间，由于资金池仍在变动，您的最终赔付尚未确定。**投注一经关闭，资金池即告最终确定，我们会通知您：若您所选一方获胜，您将收到的确切金额。**" |
| sw §4, the other paragraphs | :351 "Dau zote — NDIYO na HAPANA — zinakusanywa"; :355-356 "Dau za upande ulioshinda zinarudishwa zote na haziguswi kamwe"; :361 "Kama dau zote ziko upande mmoja" | "Madau yote — NDIO na HAPANA — yanakusanywa"; "Madau ya upande ulioshinda yanarudishwa yote na hayaguswi kamwe"; "Kama madau yote yako upande mmoja" (Open point 20) |
| §7, the six links | `text-gold-300 hover:text-gold-200` (:247-248, :414-415, :537-538) | `text-brand-300 hover:text-brand-200` (§B4c); `test:visual-pass-r8a`'s HELD loses its Terms row (15 → 9 held links) |
| `TERMS_VERSION` | "2026-10-10" (terms-version.ts:57) | **Set in the S15 commit** to the day it publishes (an ISO date, `test:terms-binding` 1.5-1.6). The page prints it and `auth-service` stamps it on new registrations; nothing forces re-acceptance (terms-version.ts:52-53) |
| `TERMS_TEXT_SHA` | "06208a18691e" (:73) | **Prepared now:** re-measured by `test:terms-binding` §2 over the new bodies on the parked branch. The hash covers `content()` and `LEGAL_BINDING_LANGUAGE`, not the version string, so it stands at S15 unless the text moves again |
| The record | — | A COMPLIANCE-DECISIONS entry dated at S15. It states what moved (estimates described, the sw corrections, the links' ink) and that no right narrows, so there is no §10 14-day notice (Point for Ali 5) and no re-acceptance |

### The tagline

The retired slogan "Tabiri matukio. Si bahati." is replaced by the deck's tagline (SJ-20, INHERIT-MANIFEST:72;
COMPLIANCE-DECISIONS 2026-09-29 §5, :1553-1554).
- **en (deck slide 1, binding):** "Pick. See what you win. Play."
- **sw:** SJ-20's draft is "Chagua. Ona unachoshinda. Cheza.". The recommended form is "Chagua. Ona unachoweza kushinda.
  Cheza.", How-to step 2's own words (i18n-dict.ts:5633), because an estimate is what you could win. Review 9 decides
  (Open point 18).
- **zh (drafted here):** "选择。看看您能赢多少。开始玩。"

| # | Surface | Today | S11 (now, the same words) | S15 |
|---|---|---|---|---|
| 1-3 | og:title, the default `<title>`, twitter:title | layout.tsx:103, :120, :171 (literals) | `` `50pick — ${dict.en.auth.railTagline}` `` | Follows the key |
| 4 | The auth rail (from 1024) | auth-shell.tsx:50-51, `t.auth.railTagline` | Already the key | Follows |
| 5 | `/`'s tab title | page.tsx:32 | Already the key | Follows |
| 6 | The sign-up share card's sub-line | register/page.tsx:31 | Already the key | Follows |
| 7 | The market share card's footer, twice | og/market/[id]/route.tsx:122, :236 (literals) | `dict.en.auth.railTagline` (`dict` is already imported, :26) | Follows |
| 8 | The officers' PDF and XLSX reports | reports/brand.ts:47 (pdf.ts:119, xlsx.ts:140) | Reads the key | Follows |
| 9 | The rules page's subtitle | rules/yes-no/page.tsx:40-44, :67 | `t.auth.railTagline` | Follows |
| 10-11 | The manifest's name and its wide screenshot's label | manifest.json:2, :71 (static) | Stays literal; the census holds :2 equal to "50pick — " + the en value, and :71 as a named variant | Edited in the parked commit |
| 12 | The two share pictures | "The wisdom of YES & NO." / "Pesa kidogo, ukweli mkubwa." (Correction 5) | WP1 fixes the X card's overlay (the same words) | Regenerated (Point for Ali 1) |
| 13 | The generic share card | og/page/route.tsx:59-61 "The wisdom of YES & NO" | — | Point for Ali 1 |
| 14 | The shelved primer's card 1 and the landing band | `primer.card1Title` (i18n-dict.ts:2166, :4907, :7377), read by first-visit-primer.tsx:290 and how-it-works.tsx:43 | Left: nobody reads it after the flip (Open point 17) | Left |

### The share pictures

- **Today:** `public/og/og-1200x630.png` and `twitter-1200x600.png` are held files. `npm run build:brand` writes neither
  (DESIGN_AUTHORITY §B1a, :202-220). The X card carries the dev badge and the chat bubble.
- **Now (WP1):** the X card is derived from the clean 1200×630 picture by a centred 1200×600 crop. The crop runs in
  `build-brand-assets.mts`, and `test:brand-assets` binds the X card to the crop pixel for pixel.
- **For the flip (WP8, WP9):**
  - a tracked generator renders the 1200×630 picture with Satori (`next/og`, as both OG routes do), the mark from
    `brand-mark.ts`, the committed Inter and JetBrains Mono TTFs (`src/lib/server/reports/fonts/`), Sora Bold added
    under OFL, and the lines read from the dictionary;
  - the parked commit writes both pictures with it, and `test:brand-assets` binds them to it;
  - the manifest's wide screenshot (manifest.json:67-72) is the same file, so it follows.

## Work packages

### WP0 — The start line: S8 closed, today's reds, the records (S; depends on S8's close)

**Goal.** Start S11 on a closed S8, at a base whose citations are re-read, with today's reds named and the plan's text
corrected before anyone builds from it.

**Files.**
- docs/VODACOM-PLAN.md:
  - §0 RESUME and a new §0l, "S11 — How to Play complete and the copy for the flip";
  - §1's S11 row to 🔨, with this file's link and Open point 2's done-when;
  - §2's pre-flip list gains WP4's privacy line and WP1's X card;
  - the annotations Corrections 1, 2, 4, 5, 8 and 9 name, where they stand (§3.8 :4794, :4806, :4808; §3's zh rows
    :3996-4002; §3.9 :4831-4837; §4 :4884), never rewritten;
  - §5 S11 gains "the X share-picture fix (every player)";
  - the §0h points for this plan's Open points.
- This file: an amendment if the re-read changes a package.
- The session's memory file.

**Steps.**
1. **Check the precondition on main, never assume it** (Open point 1):
   - S8's §1 row is ✅ to its done-when (§0h point 82), with its close record in §0k.
   - S11 branches from origin/main at that close, in a clean worktree.
   - Every commit is staged by path and read with `git diff --cached --stat` first.
2. **Name today's reds** from S8's close battery, label by label. Then run, in process, the twins S11 touches:
   - red:journey-home, red:journey-shell, red:marketing-optout, red:simple-journey-flag, red:hero-copy,
     red:house-bot-chatbot, red:policy-lines and red:social-panel;
   - the node harnesses red:chat-safety, red:kyc-copy-truth, red:rate-copy, red:support-contact and
     red:withdraw-email-gate, one at a time, the tree clean after each.
3. **Re-read every citation in this file at the base** (S7-PLAN A24's method). Anything that changes a package becomes
   an amendment here.
4. **The docs commit**, one, rebased onto main last.

**Gates.** test:docs; test:vodacom-plan (the S11 row 🔨, no ✅ before its commit).

**Served bytes for a classic viewer.** None.

**Done when.** The precondition holds and the reds are named; every citation is re-read; §0l, §1, §2, the annotations
and the §0h points are filed.

### WP1 — The X/Twitter share picture, without the dev badge and the chat bubble (S; every player, its own release)

**Goal.** Every X preview of 50pick shows a clean picture today, not a capture of a development page. The words stay as
they are; the flip's words are WP9's.

**Files.**
- scripts/build-brand-assets.mts: one more output, `public/og/twitter-1200x600.png`, the centred 1200×600 crop of
  `public/og/og-1200x630.png` (sharp, as the script already uses), with its header's output list.
- public/og/twitter-1200x600.png: regenerated.
- scripts/verify-brand-assets.mts (`test:brand-assets`): a new section binding the X card to the crop, pixel for
  pixel, and a plant (the old file) that fails it.
- docs/DESIGN_AUTHORITY.md §B1a (:202-220): `build:brand` writes twelve files. The 1200×630 picture stays held until
  WP9; the X card is derived from it.

**Steps.** Crop, write, read both pictures at full size, and run `test:brand-assets`.

**Gates.** test:brand-assets with its new plant; test:static-cache-scope (the `/og/` folder's cache rule unchanged);
typecheck; and the push gates: `next build`, local qa:live, then the production read-back. Production fetches
`/og/twitter-1200x600.png` and compares it with the committed file.

**Served bytes for a classic viewer.** One static image, deliberately; §2's pre-flip list.

**Done when.** The X card on production is the crop; no badge and no bubble; the guard fails on the old file.

### WP2 — `primer-keys.ts`: the shared keys and opt-ins (S; depends on WP0)

**Goal.** One definition of the primer's path rules, seen keys and automation opt-in, which the shelved primer and the
How-to host both read. The primer behaves as today, line for line.

**Files.**
- src/lib/onboarding/primer-keys.ts (new; no directive, no imports). It exports:
  - `PRIMER_SEEN_KEY` (first-visit-primer.tsx:24) and `HOWTO_SEEN_KEY = "50pick-howto-seen"`;
  - `HIDE_ON` (:27) and `SUPPRESS_ON` (:32), verbatim;
  - `primerForced()` (:42-50), verbatim;
  - `automationUa(ua)`, the UA test of :328;
  - `automated(nav)`, the UA test or `nav.webdriver === true`, for the host only (Open point 6);
  - `seenOrUnreadable(key)` and `markSeen(key)`, which try and catch as the primer does (:329-336, :350-352). Storage
    that throws counts as seen, so nothing auto-opens there, as today.
- src/components/onboarding/first-visit-primer.tsx imports them, with `PRIMER_SEEN_KEY as STORAGE_KEY`, so every line
  that reads them stays byte-identical. Only the four declarations leave (:24, :27, :32, :42-50).
- docs/SHELVED.md:43: the Files cell says the keys and opt-ins now live in `primer-keys.ts`.
- scripts/stacking-contract.test.mts: 8.3 (:881-882) is re-pinned in the open. The declarations are now in
  `primer-keys.ts`, and the primer imports both; the plant is a second, local `HIDE_ON` in the primer. 8.1, 8.2, 8.4
  and 8.5 are unchanged and must read as before.
- scripts/marketing-optout.test.mts: the overlay check (:996-1010) reads the primer's `HIDE_ON` from `primer-keys.ts` and
  requires the primer to import it. Its plant (:1388-1389) is re-anchored on `primer-keys.ts`.
- scripts/journey-shell.test.mts: the comment at OVERLAY_PRIMER (:951-960) updated. 11.primer.* (:961-966,
  :1021-1044) read as before.

**Gates.**
- test:stacking; test:marketing-optout + red:marketing-optout (alone); test:journey-shell + red:journey-shell;
  test:popup-fit; test:design-frozen; test:client-graph-safe (the new module is pure); typecheck.
- The suites that read the primer, each as before: visual-pass-r5a, r5b, r5c, r5i, r5j, r6c, r7c, r8b, r9a, r9c and
  social-panel.
- qa:lost-chunk: its `?primer=1` cells still force the primer; its primer marker moves to the primer's own `primer-no-fill` (Amendment B4).

**Served bytes for a classic viewer.** JS: the primer's lazy chunk, output unchanged. HTML and RSC: none (the primer
renders in the browser only, lazy-overlays.tsx:38).

**Done when.** The primer reads every key and opt-in from `primer-keys.ts`; every primer gate is green with its re-pins;
qa:lost-chunk's primer cells pass.

### WP3 — S11's words (S; depends on WP0)

**Goal.** Every word S11 shows comes from a key; no existing value changes before S15 (§3.9).

**Files.**
- src/lib/i18n-dict.ts, the journey namespace (en :2991-3233, sw :5556-5717, zh :8020-8181):
  - the keys in "New dictionary keys" below;
  - the four zh How-to values corrected (:8095, :8096, :8099, :8101; Correction 4). These are journey keys no player
    sees yet.
- docs/VODACOM-PLAN.md §3: an "S11 keys" note and table (as S7's, :4021-4043); the four zh rows corrected.
- docs/design-system/v5-2026-09-29-simplified-journey/S4-COPY-AUDIT.md: "S11 drafts", and "Swahili review" 9, signed.
  The review also signs the chat's journey strings (WP6), the legal sw and zh in "The flip copy" above, and the
  tagline's sw and zh (WP9 carries the last two).
- INHERIT-MANIFEST: SJ-20 (:72) annotated, "zh drafted in S11 (review 9)".

**Steps.**
1. Add the keys; never edit an existing value outside the journey namespace.
2. Draft sw by the rules S4-COPY-AUDIT already applies (agreement, dau class 5/6, "swali hili" for the journey,
   "Uchezaji salama" for the limits page by name). zh uses formal 您, 充值, 投注 and 注单.
3. Run hero-copy's overclaim pattern (hero-copy.test.mts:134) over the new keys and the tagline draft. The ripple map
   asks this (:4884, "test:hero-copy §5 moved to new surfaces"), and `test:flip-copy` §4 runs it from WP7 on.

**Gates.**
- test:i18n (parity, placeholders); test:translation-safety; test:labels + red:labels (alone; NDIO, and no ASCII side
  word in sw or zh prose); test:rate-copy (no typed %, × or TZS: `{max}` is a placeholder).
- test:support-contact §15 (no helpline); test:withdraw-email-gate 11.1 (no sentence makes a deposit need an email);
  test:kyc-copy-truth (rule 4: no "24 hours" in a sentence that names a withdrawal); test:docs.
- test:house-bot-disclosure 5.1 and 5.1.c3: red by construction until on main (Correction 11). Record it.

**Served bytes for a classic viewer.** JS: every page's dictionary (S7 WP4's precedent). No visible word.

**Done when.** The keys exist in three languages; review 9 is signed; §3, S4-COPY-AUDIT and the manifest agree.

### WP4 — The How-to host: auto-open, deep link, seen key, consent waits (M; depends on WP2, WP3)

**Goal.** §3.8's remaining rules, for a journey reader, in one host mounted by the shell. Classic readers are served
exactly what they were.

**Files.**
- src/lib/onboarding/how-to-open.ts (new, pure): `howToDecision(input)` returns `{ open: "auto" | "deep" | null,
  reason }`. Its inputs are the path, the address's `howto`, `bet` and `side`, seen-or-unreadable, `onBreak`,
  `dialogOpen`, `automated` and `forced`. Step 1 gives the rules.
- src/components/onboarding/how-to-host.tsx (new, "use client"):
  - it reads `usePathname()` and `useSearchParams()`, inside the Suspense boundary AppShell gives it, as BetSheetHost
    does (bet-sheet-host.tsx:54-55), and edits the address with `window.history.replaceState` as it does (:111);
  - it arms one 700 ms timer per landing on an eligible route (the primer's beat, first-visit-primer.tsx:332);
  - it decides through `howToDecision` and renders its own `<HowToPlaySheet open signedIn onClose>`;
  - it takes `signedIn` and `onBreak` as props from AppShell.
- src/components/onboarding/how-to-play-sheet.tsx:
  - every exit goes through one close that calls `markSeen(HOWTO_SEEN_KEY)` and then `onClose`: the Modal's `onClose`
    (✕, scrim, Escape), the CTA (:226-228) and Weka mipaka (:230);
  - while open, the sheet claims `useInvitationSlot("howto", "bottom", -1, open)` (Open point 7);
  - its header (:10-11, "no auto-open and no seen key") says what S11 built.
- src/components/layout/shell-lazy.tsx: `LazyHowToHost`, one loader line ending in `.catch(nothingIfLost)`, after
  `LazyBetSheetHost` (:73).
- src/components/layout/app-shell.tsx :492 (Open point 3):
  `{journeyShown && <><LazyJourneyFlag /><Suspense fallback={null}><LazyHowToHost signedIn={!!session} onBreak={promoSuppressed} /></Suspense></>}`.
  The flag stays bare (R5-H G-3); a classic request keeps its one `false`.
- src/app/legal/privacy/page.tsx: §7's display-choices sentence names the key (en :214, sw :344, zh :466). META
  (:109-112) moves to the release date with `POLICY_PAGES.privacy.codeVersion` (policy-lines.ts:152). The words are in
  "New dictionary keys" below, under "The privacy line" (Open point 12).
- docs/COMPLIANCE-DECISIONS.md: "Privacy v<date> — How to play's seen note (Vodacom S11)", the same commit. It also
  records Correction 3.
- scripts/howto.test.mts (new); package.json `test:howto` (it joins predeploy) and `red:howto` (in process).
- scripts/journey-home.test.mts §5:
  - 5.storage (:1418-1423) re-pinned in the open: the sheet writes exactly one key, `HOWTO_SEEN_KEY`, through
    `markSeen`, on its close and never on open; the card and the home's lazy module write nothing;
  - its plant (:1575-1576) re-aimed at a write on open and at a second key;
  - 5.lazy (:1467-1486): the sheet's importers are the card and the host.
- scripts/journey-shell.test.mts:
  - 5.mount (:868) and 12.shell.flag (:2518-2520, its arm built from `BARE_FLAG`, :287) re-pinned to the fragment (Amendment B5);
  - §12's parts table (12.parts.table, 12.parts.client) gains `LazyHowToHost`;
  - the plants at :2785 and :2793 re-anchored.
- scripts/visual-pass-r5h.test.mts: `flagBare` (:399) and its plant (:409) re-pinned. The flag stays outside every
  Suspense.
- scripts/privacy-notice.test.mts: §4n (new). The key is named in en, sw and zh §7; the code writes exactly that key in
  localStorage and nothing else from the host or the sheet; the version is pinned; a control.
- scripts/stacking-contract.test.mts: 8.6-8.8 (new), the host's twins of 8.1, 8.3 and 8.4, with plants.
- scripts/qa-first-load.mjs: a `HowToHost` marker row, journey-only, never in a classic first load (beside
  BetSheetHost, :172). The marker is a string literal unique to the host file.

**Steps.**
1. **The rules** (`howToDecision`, in this order):
   - **Route:** the path must be exactly `/`, `/live`, `/results` or `/watchlist`; anything else is null ("route").
     HIDE_ON and SUPPRESS_ON are then tested anyway and give null; they cannot match the four routes, but parity with
     the primer is pinned.
   - **A bet link:** `bet` or `side` anywhere in the address gives null ("bet-link"). That landing stays declined.
   - **Another dialog:** if one is open (`isModalDialogOpen()`, modal-open.ts:17-27, or `openLayers()` non-empty), null
     ("dialog") for this landing.
   - **A break:** `onBreak` gives null ("break"), for the deep link too (R4-I: no "bet now" sentence during a break).
   - **The deep link:** `howto=1` gives "deep", whatever the seen key or automation say.
   - **Automation:** automated and not forced (`primerForced()`) gives null ("automation").
   - **Seen:** seen, or storage unreadable, gives null ("seen").
   - **Otherwise:** "auto".
2. **Timing.** One decision per landing, 700 ms in. A route change cancels a pending timer and starts a new landing. A
   blocked landing is skipped, not retried on the same page (Open point 8).
3. **Opening.**
   - The host's own sheet opens. The How-to card keeps its own instance, and the two never open together, because the
     second sees the first as an open dialog (Open point 4).
   - The channels panel and the reality check already defer to an open dialog (channels-panel.tsx:241,
     reality-check.tsx:96).
   - The consent card waits through the slot: consent claims "bottom" at 0 (consent-prompt.tsx:62), the sheet at −1, and
     lower wins (invitation-slot.ts:52-55). Consent's code is untouched.
4. **The deep link.** On "deep", the host opens the sheet and replaces the address without `howto`, keeping every other
   parameter (`history.replaceState`). Back and a reload do not reopen it. The canonical link is `/?howto=1`;
   `/markets?howto=1`'s redirect drops it (Open point 27).
5. **Leaving.**
   - A route change while the host's sheet is open closes it, and that counts as an exit. The render guard tests the
     allowlist, HIDE_ON and SUPPRESS_ON (the `test:stacking` 8.1 lesson; Open point 10).
   - Weka mipaka closes, writing the key, and then navigates (:230's order).
6. **Privacy §7** lands in the same commit as the first write (§3.10).

**Gates.**
- **test:howto + red:howto, with in-memory plants:**
  - §1 the decision table: every rule, each with an inversion planted;
  - §2 the host's source: one timer per landing at 700; the allowlist; the guards in both the effect and the render;
    the opt-in on the automation line; `replaceState` keeping other parameters; no storage write outside
    `primer-keys.ts`;
  - §3 every exit of the sheet goes through the one close that writes the key;
  - §4 the slot claim is in zone "bottom", below consent's 0, only while open, and consent-prompt.tsx:62 is verbatim;
  - §5 the mount: the journey-only slot, and `signedIn` and `onBreak` taken from AppShell's own reads (:102, :189,
    :300-301).
- test:journey-home §5 + red; test:journey-shell + red; test:visual-pass-r5h; test:simple-journey-flag + red (10.shell.*:
  the slot reads the one answer); test:stacking with 8.6-8.8; test:marketing-optout (the host imports `HIDE_ON` from
  `primer-keys.ts`; AppShell's opt-out branch, app-shell.tsx:85, never renders it).
- test:privacy-notice §4n + its control; test:policy-lines + red:policy-lines; test:popup-fit; test:social-panel;
  test:client-graph-safe; test:hooks-order; test:dead-css (no CSS added); typecheck.
- test:house-bot-disclosure 5.1: red by construction (the privacy page). Record it.
- qa:classic-shell-parity v4 `--compare`: 0 differences, overlays included. qa:served-skeleton `--main`: the seven
  routes, guest and player; with `--viewers journey`, the host adds no client-render bail-out to a pass holder's pages
  (the bail-out counts unchanged). qa:first-load `--build --read`: no `HowToHost` marker in a classic first load.

**Served bytes for a classic viewer.**
- RSC and HTML: none (the slot stays one `false`), except `/legal/privacy`'s sentence and version (every visitor, §2's
  list).
- JS: shell-lazy's chunk gains one export, output unchanged (S8 WP7's precedent). The host's chunk, with the sheet, is
  journey-only.

**Done when.** Through a staff pass, the sheet opens by itself once per browser on each of the four routes and never in
the excluded cases; the deep link opens it; every exit writes the key; the consent card waits. Classic readers show 0
differences; the privacy line is live with the release.

### WP5 — The FAQ for a journey reader (S; depends on WP3)

**Goal.** A journey reader's `/help` answers in the journey's words. A classic reader's `/help` is byte-identical.

**Files.**
- src/app/help/page.tsx (it already resolves the journey, :54):
  - the question line (:136) and the answer line (:152-154) read `journey.faq2q`, `faq2a`, `faq3a`, `faq5a` and `faq6a`
    for a journey reader, through one table of journey copies, in same-slot ternaries whose else arm is today's
    expression;
  - `{max}` is filled from `formatTzs(WITHDRAW_MAX_TZS)` (validators.ts).
- scripts/qa-served-skeleton.mjs: ROUTES (:114-122) gains `help` (`/help`), with its self-test re-run.
- scripts/flip-copy.test.mts (WP7's suite) §5: the journey arm reads exactly those keys; the classic arm is verbatim.

**Gates.** test:flip-copy §5 + red (from WP7; until then a source check in this package's commit); test:measure;
test:support-contact; test:visual-pass-r6c, r9b and r10 (the help page's pins); test:journey-shell (help/page.tsx's
positions door); test:chat-safety §2.6 (faq5q unchanged); qa:served-skeleton `--main` on `/help`, guest and player.

**Served bytes for a classic viewer.** None: server code, the same markup, no client JS.

**Done when.** A pass holder's `/help` shows the five journey copies in sw, en and zh; classic `/help` is identical.

### WP6 — The chat: offline answers, panel words, the live prompt keyed on the rollout (M; depends on WP3)

**Goal.** A journey reader's chat speaks the journey now, where it can do so on our side. The live assistant switches
itself at the flip, telling the AI vendor nothing about who is reading.

**Files.**
- src/lib/chat/send-message.ts:
  - `sendMessage(history, userText, opts?: { journey?: boolean })` (:468) passes it to `stubReply(…, journey)` (:179);
  - the header's intents index (:20-29) is updated.
- src/components/chat/ChatRoot.tsx: `{ journey: journeyOn }` at the one `sendMessage` call (:201); `journeyOn` is
  already read (:98).
- src/components/chat/messages/EmptyState.tsx: `useJourneyOn()`; a journey reader sees `journey.chatIntro` for
  `chat.helpline` (:38) and `journey.chatStarterHowTo` for `chat.starterDial` (:24).
- src/app/_actions/chat.ts:
  - `buildSystemPrompt(locale, objectionHours, journey)`;
  - at :245 the third argument is `(await simpleJourneyStateNow()) === "ACTIVE"`, the global rollout (a ≤10 s snapshot,
    simple-journey-switch.ts:60), never the reader's pass.
- The four pins of the call's shape (Correction 11; the fourth, the red anchor, is Amendment B6), re-pinned in the open, each with a plant that passes a per-reader
  value (the session, the pass) and must fail: scripts/privacy-notice.test.mts §2c (:196-198);
  scripts/lib/house-bot-chatbot-cases.mts 6.5b (:283); scripts/visual-pass-r8d.test.mts 8.5 (:543).
- scripts/flip-copy.test.mts §6 (WP7's suite):
  - the two prompts differ only in the named lines;
  - every money, RG, identity and email line is shared verbatim;
  - neither the journey prompt, the stub's journey replies nor the journey panel words name the dial;
  - the journey replies cite `/?howto=1` where they teach betting.

**Steps.**
1. **The offline answers, per reader** (the branch runs only when `journey` is true; classic replies are byte-identical):
   - **A how-to-play intent.** Its keywords are today's (`dial`, `conviction`, `kuamua`, :247) plus "how do I play", "how
     to bet", "place a bet", "jinsi ya kucheza", "kuweka dau". It answers in en or sw in four steps: choose a question;
     tap YES or NO and see about what you could win (≈); enter the stake and tap Place bet, which places exactly the bet
     the button names; wait for the result. It cites `/?howto=1`.
   - **The other answers:** the out-of-scope line says "betting" for "the dial" (:218-219); deposit step 1 is "Tap
     **+ Deposit** at the top" (:230); withdraw is "tap your balance at the top, then **Withdraw** (or **Account →
     Withdraw**)" (:278); identity starts at "**Account → Identity verification**" (:350, :358;
     `profile.kycIdentityVerification`); invites go through "Account → Invite friends" (:402-403; the hub's row,
     hub-rows.ts:225).
   - **The zh hand-off** (:195) names 「玩法说明」 (/?howto=1) first.
2. **The panel words:** `journey.chatIntro` and `journey.chatStarterHowTo`. The sw starter "Jinsi ya kucheza?" holds a
   token detectLang reads ("kucheza", send-message.ts:68), so the reply comes in Swahili.
3. **The live prompt (Open point 15).** The journey prompt is today's with these lines swapped:
   - the format example (:148): "Tap **+ Weka pesa** at the top";
   - SCOPE (:156): "placing a bet (the bet sheet and its estimate), How to play" for "the conviction dial";
   - the refusal example (:158): "betting" for "the dial";
   - the first fact (:161):
     - a player chooses a question and taps YES or NO;
     - a bet sheet opens with that side;
     - they enter a stake and see an estimate of what they would get if their side wins — an amount and ≈N× their bet —
       from the current pools after our commission;
     - **Place bet · TZS X** places exactly that bet, with no further confirm;
     - then the stake bounds sentence, verbatim;
   - the exact-payout fact (:164) is prefixed "The estimate before a bet is marked ≈ and is not guaranteed:";
   - the cash-out fact (:171) is in the journey's Sell words, with no typed minutes: each ticket shows its own end;
   - two new facts: a short balance is offered a deposit of the shortfall or a smaller bet, never an automatic bet; and
     How to play opens on a first visit and at `/?howto=1`;
   - KEY PAGES (:181) drops `/markets` and adds `/` (the questions), `/account` and `/?howto=1`.

   Every other line is verbatim, so rate-copy 3.4-3.7 (:216-226), money-minimums 2.3, kyc-copy-truth and
   withdraw-email-gate read both prompts the same.

**Gates.**
- test:flip-copy §6 + red (or in this package's commit until WP7); test:chat-safety + red:chat-safety (alone);
  test:house-bot-disclosure (its chatbot cases, 6.5b re-pinned) + red:house-bot-chatbot.
- test:privacy-notice §2c re-pinned; test:visual-pass-r8d (8.5 re-pinned; 8.4 unchanged, `chatForReader` untouched);
  test:rate-copy + red:rate-copy (alone); test:money-minimums.
- test:kyc-copy-truth + red:kyc-copy-truth (alone); test:withdraw-email-gate + red (alone); test:withdrawn-features (§7:
  no citation to `/profile/invite`); test:chat-availability + red (alone; lazy-overlays.tsx untouched);
  test:red-anchors (anchors name chat.ts lines).
- test:house-bot-disclosure 6.6: red by construction until on main. Record it.

**Served bytes for a classic viewer.**
- JS: the chat's chunk (the journey branch and EmptyState), fetched only where the chatbot is mounted (layout.tsx:244),
  output unchanged.
- Server: the prompt is today's for every reader until the rollout is ACTIVE.

**Done when.**
- A pass holder's offline answers and panel words are the journey's in en and sw, and the zh hand-off in zh.
- The journey prompt is proven in process, and under `FEATURE_SIMPLEJOURNEY=ACTIVE` on a local server the action builds
  it.
- Classic answers are byte-identical.

### WP7 — The tagline's one home, and the census guard `test:flip-copy` (M; depends on WP3, WP5, WP6)

**Goal.** The flip changes one dictionary value for the tagline, not a dozen literals. A guard names, exactly, what the
flip must still change.

**Files.**
- src/app/layout.tsx :103, :120, :171: `` `50pick — ${dict.en.auth.railTagline}` `` (`dict` imported server-side).
- src/app/api/og/market/[id]/route.tsx :122, :236: `{dict.en.auth.railTagline}`.
- src/lib/server/reports/brand.ts :47: `tagline: dict.en.auth.railTagline`.
- src/app/legal/rules/yes-no/page.tsx: `SUBTITLE` (:40-44) removed; `subtitle={t.auth.railTagline}` (:67), which reads
  the same three strings.
- scripts/visual-pass-r4h.test.mts: 10.1 and 10.2′ (:476-489) re-pinned. The layout default is the key's composition,
  so 10.2′'s "took the layout's English default" stays provable.
- scripts/visual-pass-r5g.test.mts: 4.13 (:768-773) measures the key's value, not a literal.
- scripts/flip-copy.test.mts (new); package.json `test:flip-copy` (test:all; run at each S11 push) and `red:flip-copy`
  (in process; Open point 22). Its sections:
  - **§1 The dial words.**
    - The keys whose English names the dial or the conviction (`/\bdial\b|conviction/i`) equal the allowlist exactly. The
      backstops 刻度盘, 转盘, 信念, kidhibiti, imani and kipima-dau must find no key outside it. `lipa.ussdLabel` is named
      as the verb.
    - Each allowlisted key carries its reader and its reason ("a shelved surface"; S15; S16), shrink-only.
    - No journey-only file reads one: src/components/journey/**, src/lib/journey/**, the How-to sheet and host.
    - `chat.helpline`, `chat.starterDial` and `help.faq2a` (Correction 15; §3.9), the three a journey reader still
      meets today, are read only in their classic arms.
  - **§2 The retired slogan.**
    - In `src/` and `public/`, read decommented (page.tsx:28-30 and not-found.tsx:13-14 spell it in comments), no file
      spells it outside the dictionary but `public/manifest.json` (:2, and :71's variant), each named.
    - Every surface in "The tagline" table reads `auth.railTagline`, from the exact reader list.
    - manifest.json:2 equals "50pick — " + the en value.
    - `primer.card1Title` is the named shelved exception.
  - **§3 The legal flip lines.** Terms §4's dial paragraph (en, sw, zh) and Rules §3's indicator line (en, sw, zh) are
    each present exactly once. On the parked branch they are absent and the new lines present.
  - **§4 The overclaim pattern** (hero-copy.test.mts:134) over S11's journey keys. On the parked branch, over the
    tagline too.
  - **§5** /help (WP5); **§6** the chat (WP6).

**Gates.**
- test:flip-copy + red:flip-copy; test:visual-pass-r4h; test:visual-pass-r5g; test:share-preview; test:predictor-shown
  (the OG market route); test:labels.
- test:house-bot-disclosure 5.1: red by construction (the rules page). Record it.
- qa:report-renderers (local: the PDF and XLSX through the real route, the tagline unchanged).
- qa:classic-shell-parity v4 (the book's `/` head holds og:title: `headOf`, qa-classic-shell-parity.mjs:1045-1065; :1787 is the `--prove-red` book's synthetic head); qa:served-skeleton
  `--main` (the head's title); typecheck; `next build`.

**Served bytes for a classic viewer.** None: server code, every string identical.

**Done when.** One home; the census green and every plant caught; parity and the skeleton identical.

### WP8 — The share-picture generator (M; depends on WP7)

**Goal.** The flip's 1200×630 picture is drawn by a tracked, deterministic generator, never captured from a page (the
capture is how the X card got its badge).

**Files.**
- scripts/build-og-picture.mts (new) and package.json `build:og`. It writes only to the directory given in `--out`
  and has no default before WP9, and `build:brand` does not call it, so no run can change a served picture by accident.
- The fonts: src/lib/server/reports/fonts/ already holds Inter and JetBrains Mono. Add Sora Bold (SIL OFL 1.1,
  DESIGN_AUTHORITY :233-235), with its licence file.
- scripts/verify-brand-assets.mts: a self-test. Two renders of one input are pixel-identical; the lines come from the
  dictionary keys given; the mark is `brand-mark.ts`'s.

**Steps.**
1. Draw today's design (the mark, the wordmark, the hairline, a first and a second line, the licence line) in Satori,
   with the lines as parameters.
2. Render the S15 picture with Point for Ali 1's choice to the scratchpad, and read it at full size beside today's.

**Gates.** test:brand-assets (the self-test); test:orphans (the new script); typecheck.

**Served bytes for a classic viewer.** None (a tool).

**Done when.** The generator renders deterministically on this machine and another; the S15 picture is read and
recorded in §0l.

### WP9 — The parked S15 copy commit, on `vodacom-s15-copy` (M; depends on WP3's review, WP7, WP8)

**Goal.** The flip's copy is one commit, proven at its base, which the S15 commit takes as it is: the Rules, the Terms,
the tagline's values, the manifest and the pictures.

**Files** (on the branch, never merged before S15):
- src/app/legal/rules/_content-yes-no.tsx and src/app/legal/terms/page.tsx: the targets in "The flip copy" above.
- src/lib/terms-version.ts: `TERMS_TEXT_SHA` re-measured. `TERMS_VERSION` and the rules' META dates are left for the
  S15 commit to set on the day.
- src/lib/i18n-dict.ts: `auth.railTagline`'s three values become the tagline.
- public/manifest.json :2, :71.
- public/og/og-1200x630.png and twitter-1200x600.png, regenerated (WP8, then WP1's crop). If Point for Ali 1 says so,
  `/api/og/page`'s line (:59-61) too.
- scripts/visual-pass-r8a.test.mts: HELD loses the Terms row (:605); 5.2′ goes from 15 to 9.
- scripts/flip-copy.test.mts: §2 and §3 flipped; §4 adds the tagline.
- scripts/verify-brand-assets.mts: the 1200×630 picture bound to the generator.
- docs/DESIGN_AUTHORITY.md §B1a: the picture is generated.
- docs/COMPLIANCE-DECISIONS.md: the entries, drafted, to be dated at S15.

**Steps.**
1. Write the commit on the base S11 merges at.
2. Run every legal gate on it.
3. Push the branch (never main), and name it in §0l and in VODACOM-PLAN §5 S15.
4. If main later moves a file this commit touches, `test:flip-copy` §2 and §3 fail on main first. Rebase and re-prove
   the branch then.

**Gates** (on the branch):
- test:terms-binding (2.1 with the new hash; 1.x at S15); test:terms-cancellation (§4's cash-out anchors untouched);
  test:rules-copy (rates still read; side words from the product).
- test:labels + red:labels (alone); test:rate-copy + red:rate-copy (alone; "13%" and "1.5%" counts unchanged);
  test:kyc-copy-truth; test:withdraw-email-gate; test:support-contact; test:visual-pass-r8a (5.2′ at 9).
- test:visual-pass-r5c, r5g and r7a (the Terms' pins); test:flip-copy (flipped) + red; test:brand-assets;
  test:static-cache-scope.
- test:house-bot-disclosure 5.1 and 5.2: 5.1 red until S15's merge, 5.2 with no house word printed.

**Served bytes for a classic viewer.** None before S15.

**Done when.** The branch's commit is green on every gate at its base; the sw and zh are signed (review 9); S15's
runbook names the commit.

### WP10 — The drives (M; depends on WP4, WP5, WP6)

**Goal.** Prove the auto-open rules in real browsers, and read every new surface as a player sees it.

**Files.** scripts/qa-howto.mjs (new) and package.json `qa:howto` (it joins test:orphans' census).

**Steps.** All on a local in-memory server, through a staff pass (`scripts/live/journey-pass.mjs`). Chromium runs the
matrix; Firefox and WebKit run the automation and opt-in cells.
- **A · Auto-open.** In a fresh context, forced by `kp-primer-force`, it opens about 700 ms in on `/`, `/live`,
  `/results` and `/watchlist` (signed in).
  - It does not open on: a question, `/updown`, `/wallet`, `/wallet/deposit`, `/profile/responsible-gambling`,
    `/legal/responsible-gambling`, `/account`, `/help`, `/auth/login` or `/s`.
  - It does not open at `/?bet=<id>.YES` or `/?side=YES`, with the key set, on a cooling-off break (taken through the
    limits page's real form, as S8 WP1 did), or with the wallet sheet opened inside the 700 ms.
- **B · Automation.** Without the opt-in, nothing opens in any of the three engines. The forced cell is the control that
  proves the drive can see the sheet.
- **C · Exits.** ✕, scrim, Escape, the CTA, Weka mipaka (signed in to `/profile/responsible-gambling`, a guest to
  `/legal/responsible-gambling`) and Back each write `50pick-howto-seen=1`, and a reload never reopens it.
- **D · The deep link.**
  - `/?howto=1` opens with the key set and without the opt-in, and stays shut on a break.
  - `/?howto=1&cat=sports` becomes `/?cat=sports`.
  - Back does not reopen it.
  - `/?howto=1&bet=…` opens the bet sheet only.
- **E · Consent.** With `kp-consent-force` and the forced auto-open, the consent card is absent while the sheet is open
  and present once it closes.
- **F · The card.** A tap on `/` opens the card's sheet, and its exit writes the key.
- **G · The classic control.** Without a pass nothing new opens. `?primer=1` still opens the primer, never the How-to.
- **H · Tiles**, read one by one:
  - the auto-opened sheet over the four routes at 320×640, 360×640, 390×844 and 1280×900, in sw, en and zh (48);
  - a pass holder's `/help`, the FAQ open, at 320, 360, 390 and 1280 in three languages (12);
  - the chat panel's journey empty state and its how-to reply at 360 and 1280 in three languages (12).

**Gates.** The drive itself, its controls first. qa:journey-home's sheet section (unchanged) runs green beside it.

**Served bytes for a classic viewer.** None (scripts).

**Done when.** Every cell passes in its engines; every tile is read; §0l records the counts.

### WP11 — Proof, records, merge, deploy (M; depends on all)

**Goal.** S11 lands under the session law (§0, :392-425).

**Steps.**
1. **Each push:** typecheck, `next build`, local qa:live, then the production read-back: `?dpl=` on both hosts, health,
   qa:chunks-prod and production qa:live, with [E3] measured where a machine holds the QA player's password.
2. **At the close:**
   - test:all with the database suites;
   - qa:classic-shell-parity v4, a baseline at the last live main plus one compare, every intended difference named:
     none expected outside `/legal/privacy`, which v4 does not capture;
   - qa:served-skeleton `--main` with `help`;
   - qa:first-load `--build --read` (no `HowToHost` marker in a classic first load);
   - WP10's tiles.
3. **Records:**
   - §0l, §1's row, §2's two rows;
   - SHELVED.md:43;
   - COMPLIANCE-DECISIONS (the privacy entry);
   - DESIGN_AUTHORITY §B1a (WP1);
   - S4-COPY-AUDIT review 9;
   - the parked branch named in §5 S15;
   - memory.

**Done when** (Open point 2):
- Through a staff pass, qa:howto passes in its engines.
- test:howto and test:flip-copy are green.
- The FAQ's and the chat's journey copies are live behind the flag.
- `vodacom-s15-copy` is green at its base.
- Production proves nothing changed for players beyond §2's two S11 rows.

## New dictionary keys (journey.*)

Every sw and zh value is a draft until review 9 signs it. Figures are placeholders: `{max}` is `WITHDRAW_MAX_TZS`;
`{yes}`, `{no}` and `{side}` come from `sideWord()`.

### The FAQ

| Key | en | sw | zh |
|---|---|---|---|
| `faq2q` | Does the estimate change after I bet? | Makadirio yanabadilika baada ya kuweka dau? | 下注后预估会变吗？ |
| `faq2a` | Before you bet, a question shows an estimate of what you could win: ≈ a multiple of your bet on each button and, once you enter a stake, about what you would get if your side wins. It comes from the pools at that moment, after our commission, and it moves as others bet, so it is not guaranteed. Your bet is placed exactly as its button names it, and a question's fee rates are fixed when it is created, so a later change never re-prices a bet you placed. The moment betting closes, the pools are final and we tell you the exact amount you get if your side wins. | Kabla ya kuweka dau, swali linaonyesha makadirio ya unachoweza kushinda: ≈ mara ngapi ya dau lako kwenye kila kitufe na, ukishaandika dau, takriban kiasi utakachopata upande wako ukishinda. Yanatokana na mabwawa ya wakati huo, baada ya kamisheni yetu, na hubadilika wengine wanapoweka dau, kwa hiyo si ya uhakika. Dau lako linawekwa kama kitufe chake kinavyolitaja, na viwango vya ada vya swali vinawekwa linapoundwa, kwa hiyo mabadiliko ya baadaye hayabadilishi dau ulilokwisha weka. Uwekaji dau ukifungwa, mabwawa yanakuwa ya mwisho na tunakujulisha kiasi kamili utakachopata upande wako ukishinda. | 下注前，问题会显示您可赢取金额的预估：每个按钮上显示投注额的约 ≈ 倍数；输入投注额后，还会显示若所选一方获胜您约可获得的金额。预估依据当时的资金池计算，已扣除我们的佣金，并会随他人下注而变动，因此并非保证。您的投注会严格按按钮所示下单；问题的费率在创建时即已固定，之后的调整绝不会重新计价您已下的注。投注一经关闭，资金池即告最终确定，我们会告知您：若所选一方获胜，您将获得的确切金额。 |
| `faq3a` | Tap your balance at the top and choose Withdraw — or open Account → Withdraw — then enter an amount, up to {max} per withdrawal. The money goes to the mobile-money number registered on your account. Before you withdraw, confirm your email address; before your first withdrawal we also verify your identity once. | Gusa salio lako juu kisha uchague Toa pesa — au fungua Akaunti → Toa pesa — kisha andika kiasi, hadi {max} kwa kila kutoa. Pesa hutumwa kwenye nambari ya pesa ya simu iliyosajiliwa kwenye akaunti yako. Kabla ya kutoa pesa, thibitisha barua pepe yako; kabla ya kutoa pesa kwa mara ya kwanza pia tunathibitisha utambulisho wako mara moja. | 点击顶部的余额并选择「提现」——或打开「账户」→「提现」——然后输入金额，每笔最高 {max}。款项将转入您账户注册的移动支付号码。提现前请先确认您的电子邮箱；首次提现前，我们还会对您的身份进行一次核验。 |
| `faq5a` | Open Account → Set limits. You can set deposit and time limits, take a break, or self-exclude. | Fungua Akaunti → Weka mipaka. Unaweza kuweka mipaka ya amana na muda, kupumzika, au kujizuia. | 打开「账户」→「设置限额」。您可以设置充值和时间限额、休息一下或自我排除。 |
| `faq6a` | Yes, for a short time. Right after you place a bet, its ticket in My tickets shows Sell free and the time it lasts until; selling before then gives your whole stake back at no cost. After that the bet waits for the result and can no longer be sold (a bet placed close to when betting shuts can't be sold at all). The money from a sold bet returns to your balance. | Unaweza, kwa muda mfupi. Mara baada ya kuweka dau, tiketi yake kwenye Tiketi zangu inaonyesha Uza bila ada na saa muda huo unapoisha; ukiuza kabla ya hapo, unarudishiwa dau lako lote bila gharama. Baada ya hapo dau linasubiri matokeo na haliwezi kuuzwa tena (dau lililowekwa karibu na kufungwa kwa uwekaji dau haliwezi kuuzwa kabisa). Pesa za dau ulilouza zinarudi kwenye salio lako. | 可以，但时间很短。下注后，「我的注单」中该投注的注单会显示「免费卖出」及截止时间；在此之前卖出，可全额取回投注额，不收任何费用。之后该投注将等待结果，无法再卖出（在投注即将关闭时下的注则无法卖出）。卖出投注的资金将返回您的余额。 |

The sw faq6a opens with "Unaweza" rather than "Ndiyo", so no line reads as the side word's old spelling (§2's NDIO rule).

### The chat panel

| Key | en | sw | zh |
|---|---|---|---|
| `chatIntro` | Ask me about deposits, betting, payouts, or anything you can't find in Help. | Niulize kuhusu amana, kuweka dau, malipo, au kitu chochote hupati kwenye Msaada. | 有关充值、投注、赔付或帮助页面找不到的任何问题，都可以问我。 |
| `chatStarterHowTo` | How do I play? | Jinsi ya kucheza? | 怎么玩？ |

### The chat's journey words (code strings, not keys; WP6)

The offline answers live in `send-message.ts` in en and sw, as today's do (zh gets the hand-off).

| Where | en | sw |
|---|---|---|
| How-to intent | "Here's how to play on 50pick:" · "1. Choose a question" · "2. Tap **YES** or **NO** — you see straight away about what you could win (≈)" · "3. Enter your stake and tap **Place bet** — that tap places exactly the bet the button names" · "4. Wait for the result: winners share the pool, and winnings go to your balance" · "The short guide is here[1]" ([1] `/?howto=1`) | "Hivi ndivyo unavyocheza kwenye 50pick:" · "1. Chagua swali" · "2. Bonyeza **NDIO** au **HAPANA** — utaona papo hapo takriban unachoweza kushinda (≈)" · "3. Andika dau lako na ubonyeze **Weka dau** — kubonyeza huko kunaweka dau lile lile kitufe kinalolitaja" · "4. Subiri matokeo: washindi wanagawana bwawa, na ushindi unaingia kwenye salio lako" · "Mwongozo mfupi uko hapa[1]" |
| Out of scope (:218-219) | "I'm tuned for 50pick — deposits, betting, payouts, KYC, question rules. For that question you'll have better luck somewhere else. Anything I can help with on the platform itself?" | "Nimewekwa kwa 50pick — amana, kuweka dau, malipo, KYC, kanuni za maswali. Kwa swali hilo utapata jibu bora mahali pengine. Kuna kitu kingine ninachoweza kukusaidia kuhusu jukwaa?" |
| Deposit, step 1 (:230; en only today) | "1. Tap **+ Deposit** at the top of the screen[1]" | — |
| Withdraw, step 3 (:278; en only today) | "3. To withdraw, tap your balance at the top and choose **Withdraw** (or open **Account → Withdraw**), then enter the amount" | — |
| Identity, step 1 (:350, :358) | "1. Go to **Account → Identity verification** to start[1]" | "1. Nenda **Akaunti → Uthibitisho wa kitambulisho** kuanza[1]" |
| Invites (:402-403) | "…go to Account → Invite friends for your link…" | "…nenda Akaunti → Alika marafiki upate kiungo chako…" |

The zh hand-off (:195) becomes: "您好！您可以打开「玩法说明」（/?howto=1）了解如何投注，或在帮助页面（/help）找到中文版的平台指南——涵盖充值、投注、提现和身份验证。如需人工协助，我可以为您转接支持团队。"

The live prompt's journey lines (English instructions; the model answers in the reader's language):
- **Format example (:148):** "To deposit money:\n\n1. Tap **+ Deposit** (Swahili: **+ Weka pesa**) at the top\n2. Choose M-Pesa, Airtel
  Money, HaloPesa, Mixx by Yas or card\n3. Enter the amount\n4. Confirm on your phone".
- **SCOPE (:156):** "the conviction dial" becomes "placing a bet (the bet sheet and its estimate), How to play".
- **The refusal example (:158):** "the dial" becomes "betting".
- **The first fact (:161):** "YES/NO prediction market, pari-mutuel pool model. A player chooses a question and taps YES
  or NO; a bet sheet opens with that side chosen. They enter a stake or tap a quick amount, and the sheet shows an
  estimate of what they would get if their side wins — an amount and ≈N× their bet — computed from the current pools at
  that stake, after our commission. Tapping **Place bet · TZS X** places exactly that bet; there is no further confirm
  step." Then today's stake-bounds sentence, verbatim.
- **The payout fact (:164)** is prefixed: "The estimate shown before a bet is marked ≈ and is not guaranteed."
- **Selling (:171):** "Selling a bet: in **My tickets**, a new bet shows **Sell free** until a stated time; selling then
  refunds the full stake. After that the bet waits for the result and cannot be sold — there is no paid exit and no
  fee. Selling also closes the moment betting closes."
- **New facts:**
  - "If a player's balance is too low for the stake they chose, the sheet offers to deposit the shortfall or to bet what
    they have instead. A bet is never placed automatically after a deposit; the player confirms it."
  - "HOW TO PLAY: a three-step guide opens by itself on a player's first visit and from the **How to play** card at the
    top of the home page. Link a player to /?howto=1 to open it."
  - "Deposit is the **+ Deposit** button at the top. Tapping the balance at the top opens the wallet, with **Withdraw**.
    **Account** holds the profile, identity verification, limits, help and settings."
- **KEY PAGES (:181):** "/ (the questions), /live, /results, /updown, /positions (My tickets), /account, /wallet,
  /wallet/deposit, /wallet/withdraw, /wallet/receipts, /profile, /profile/account, /profile/kyc,
  /profile/responsible-gambling, /proposals, /fairness, /help, /leaderboard, /?howto=1 (How to play)."

### The zh How-to corrections (values of S7's keys; Correction 4; the zh board's words)

| Key (zh line) | Today | Corrected |
|---|---|---|
| `howStep1Body` (:8095) | 每个问题都是一个真实事件，只有一个答案：{yes}或{no}。 | 每个问题都是一个真实事件，只有一个答案：「{yes}」或「{no}」。 |
| `howStep2Title` (:8096) | 点击{yes}或{no} | 点击「{yes}」或「{no}」 |
| `howStep3Body` (:8099) | 赢家平分奖池。奖金进入您的余额，可通过手机钱包提现。 | 赢家按投注比例分享奖池。奖金进入您的余额，可通过手机钱包提现。 |
| `howExampleBody` (:8101) | 在显示 ≈{mult}× 的{side}上投注 {stake} → 若赢约可获得 {payout}。若猜错，您将失去投注金额。 | 在「{side}」一方（显示 ≈{mult}×）投注 {stake} → 若赢，约可获得 {payout}。若猜错，您将输掉这笔投注。 |

The sheet's `multUnit` (how-to-play-sheet.tsx:86-89) still finds "≈{mult}×" in the corrected example.

### The privacy line (not a key; WP4)

| Language | Today | Becomes |
|---|---|---|
| en (:214; the source spells `browser&apos;s`, and the new sentence keeps it) | Some display choices, such as hiding your balance or dismissing a prompt, are kept in your browser's own storage on your device. | Some display choices, such as hiding your balance, dismissing a prompt or having seen How to play (50pick-howto-seen, so the guide opens by itself only once), are kept in your browser's own storage on your device. |
| sw (:344) | Baadhi ya machaguo ya maonyesho, kama kuficha salio lako au kufunga ujumbe, huhifadhiwa kwenye hifadhi ya kivinjari chako ndani ya kifaa chako. | Baadhi ya machaguo ya maonyesho, kama kuficha salio lako, kufunga ujumbe au kuwa umeshaona Jinsi ya kucheza (50pick-howto-seen, ili mwongozo ujifungue wenyewe mara moja tu), huhifadhiwa kwenye hifadhi ya kivinjari chako ndani ya kifaa chako. |
| zh (in :466) | 部分显示选择（例如隐藏余额或关闭提示）保存在您设备上的浏览器存储中。 | 部分显示选择（例如隐藏余额、关闭提示，或已看过「玩法说明」——50pick-howto-seen，使该指南只会自动打开一次）保存在您设备上的浏览器存储中。 |

### Not added

- No helpline key (COMPLIANCE-DECISIONS 2026-10-06; S7-PLAN A6).
- No `journey.tagline`. The tagline's home is `auth.railTagline` (Open point 17), and its new values are WP9's.
- No key for the live prompt: it is English instructions, never shown as written (visual-pass-r5g.test.mts:756).

## Risks

1. **A modal on a first visit stands between a newcomer and the question they came for.** It never opens on a question
   page or over a bet link; it decides once per landing; every exit is one tap. The tiles read it at 320×640.
2. **Two hosts on one history.** The bet sheet host pushes `bet`. The How-to host touches history only once, on a
   deep-link open, and never while `bet` or `side` is in the address.
3. **Drives meeting the sheet.** The `webdriver` term covers Firefox and WebKit (Correction 12). The drive census's
   forced opt-ins (`?primer=1`, `kp-primer-force`) are used today on classic pages only. WP10's G cell proves the
   classic side.
4. **Storage.** Unreadable storage means no auto-open (the primer's rule). A failed write may let it open once more on
   a later landing.
5. **Red by construction.** house-bot-disclosure 5.1 and 5.1.c3 (dictionary, legal tree) and 6.6 (chat.ts) read red on
   every S11 branch until merged (Correction 11). Record each, label by label; never loosen the pin.
6. **A rollback.** The parked legal texts are true in both looks. The tagline on global surfaces stays after an instant
   kill; S15's runbook names the commit to revert if a kill lasts (Open point 19).
7. **The parked branch rots.** `test:flip-copy` §2 and §3 on main fail the moment a flip line moves, which is the
   signal to rebase and re-prove it.
8. **The live prompt lags the switch** by its ≤10 s snapshot at the flip or a kill. This is acceptable for an answer's
   wording.
9. **Satori is not a browser.** The S15 pictures are new pictures in the same design. They are read at full size beside
   today's before the branch is called green.
10. **Parallel lanes.** S9, S10 and S12 edit the dictionary, the privacy page and COMPLIANCE-DECISIONS. S12 must not
    version the Terms itself (Open point 20). The manifest edit is shared with S12's on the parked branch.
11. **The consent slot must be released on every exit and on unmount**, a lost chunk included. The slot hook's cleanup
    does it (invitation-slot.ts:81-84); test:howto §4 pins it.
12. **Tailwind scans comments; editors and heredocs eat backslashes** (S7-PLAN Risk 16). New files' comments carry no
    class-shaped strings; test:source-bytes catches the rest.
13. **Machine limits.** Per the session law: file-mutating `red:*` twins run one at a time with `git diff` clean after
    each, and builds and servers run from SSD worktrees on OMEGA-COMPILE01.

## Open points → §0h

Each is a call taken under Ali's delegation, filed as a numbered §0h point by WP0, with its overrule.

1. **S11 starts after S8 closes,** and may run beside S9 and S10. It lands after any of their commits that touch
   app-shell.tsx, shell-lazy.tsx, i18n-dict.ts, the privacy page or COMPLIANCE-DECISIONS, re-reading on each rebase.
   Overrule: start only after S10 closes (the plan's order).
2. **S11 is ✅ on local drives through a staff pass, in three engines,** plus production proving that nothing changed
   for players beyond §2's two S11 rows. Staff seeing the auto-open on production waits for S14 (§0h point 4).
   Overrule: Ali's preview at S11's close.
3. **The host shares the flag's journey-only slot** (app-shell.tsx:492), so a classic request gains no `false` slot.
   Overrule: its own `{journeyShown && …}` line (S8 WP7's precedent), one `false` for a classic request.
4. **Two sheet instances on `/`,** the card's and the host's, never open together. Overrule: one instance, with the card
   asking the host by an event (the card's chunk changes, and `aria-expanded` follows the host).
5. **The sheet writes the seen key itself, on every exit,** whatever opened it. Overrule: only the auto-opened and
   deep-linked sheet writes it; a tap-opened sheet then still auto-opens later.
6. **The automation block is the primer's UA test plus `navigator.webdriver`,** and the opt-ins are shared
   (`?primer=1`, `kp-primer-force`). Overrule: the UA test alone, with every journey drive seeding the key (the WebKit
   cells of qa:bet-sheet first).
7. **Consent waits through the invitation slot.** The sheet claims "bottom" at −1 while open; consent's code is
   untouched; the card appears the moment the sheet closes. Overrule: MOBILE-VISUAL D4's form, a blocker that restarts
   consent's 1200 ms after the close (MOBILE-VISUAL-PLAN.md:2120-2125), which changes the consent prompt for every
   player.
8. **One decision per landing, 700 ms in.** A landing blocked by a dialog, a bet link, a break or the key is skipped,
   not retried on the same page. Overrule: retry when the blocking dialog closes.
9. **A page that loads with `bet` or `side` never auto-opens for the rest of its life.** Overrule: open after the bet
   sheet closes.
10. **A route change while the auto-opened sheet is open closes it,** and that counts as an exit. Overrule: keep it open
    across a soft hop between the four routes.
11. **The deep link opens whatever the seen key or automation say,** but never with `bet` or `side`, never over another
    dialog and never during a break (a link may come from a campaign; R4-I keeps "bet now" off a break). The How-to
    card's own tap still opens it during a break, as S8 WP9 kept the card. `howto` leaves the address on open.
    Overrule: the deep link opens during a break too, like the card's tap.
12. **Privacy §7 names the key** inside the existing display-choices sentence, with a new version (§3.10). Overrule: no
    new version, because the sentence already covers "dismissing a prompt" (Point for Ali 3).
13. **The zh How-to corrections** take the S4 audit's and the zh board's words. S7-PLAN Open point 22 does not keep a
    draft found false. Overrule: none sought, since step 3 was untrue.
14. **The FAQ's journey copies are faq2 (question and answer), faq3a, faq5a and faq6a.** faq5a is added beside §3.9's
    three because the at-risk answer should name the shortest true path. Overrule: faq2a, faq3a and faq6a only (§3.9's
    letter).
15. **The chat's offline answers and panel words follow the reader; the live prompt follows the global rollout.** The
    vendor is told nothing about who is previewing (Correction 14). Before the flip, a previewer gets today's live
    answers and the journey's offline ones. Overrule: per reader, with a privacy-notice change; or both switched by
    the S15 commit.
16. **The journey prompt shares every money, RG, identity and email line verbatim.** Overrule: none sought.
17. **The tagline's home is the existing key `auth.railTagline`.** The refactor is byte-identical now, and the three
    values change at S15. manifest.json stays literal, held by the census; `primer.card1Title` is left. Overrule: a new
    `common.tagline` key now (every page's JS changes); or leave the surfaces scattered until S15.
18. **The sw tagline is "Chagua. Ona unachoweza kushinda. Cheza."** (step 2's words; an estimate is what you could win),
    not SJ-20's draft "Ona unachoshinda". The zh is "选择。看看您能赢多少。开始玩。". Overrule: SJ-20's draft.
19. **The legal texts are written true in both looks,** parked, and published by the S15 commit. Overrule: publish them
    once signed (they are true today); or journey-only wording, with a revert if a rollback lasts (Point for Ali 4).
20. **The S15 Terms version also carries the sw §4 corrections and R8-A's six link inks,** and S12 makes no Terms
    version of its own. Overrule: S12 versions the Terms separately.
21. **No 14-day notice (Terms §10)** for the S15 Terms version: it describes a display and narrows no right. Overrule:
    the in-app notice two weeks before S15 (Point for Ali 5).
22. **`test:flip-copy` runs in test:all and at each S11 push; `test:howto` joins predeploy.** Overrule: both in
    predeploy.
23. **The dial census judges by key,** with the zh and sw backstops widened (刻度盘, 信念; kipima-dau), wider than §3.9's
    list (Correction 8). Overrule: §3.9's literal list.
24. **§3.9's four other keys are not rewritten.** Their surfaces are shelved for a journey reader or belong to the
    registry (Correction 9); the census names them. Overrule: rewrite them at S15 anyway.
25. **The up-down rulebook's three "nafasi"** (_content-up-down.tsx:380, and :391 twice) stay for S12. Overrule: fold them into the
    parked commit.
26. **The X card is fixed now, for every player, in its own release (WP1).** The flip's words wait for WP9. Overrule:
    leave the X card until S15 (Point for Ali 2).
27. **`/markets?howto=1` loses `howto`** in the redirect (S7 WP3's keep-list, markets-redirect.ts); the canonical link
    is `/?howto=1`. Overrule: add `howto` to the keep-list.

## Points for Ali

1. **The words on the share pictures at launch.** When 50pick.tz is shared on WhatsApp or X, the picture today says
   "The wisdom of YES & NO." with "Pesa kidogo, ukweli mkubwa." under it, not the old slogan. Recommended: at launch
   both pictures, and the general share card, carry the agency's line instead: "Pick. See what you win. Play." over its
   Swahili. Overrule: keep "The wisdom of YES & NO." on the pictures.
2. **Fix now, for everyone: the X (Twitter) share picture shows a developer badge and our chat bubble.** It was captured
   from a development page. Recommended: replace it now with a clean cut of the WhatsApp picture, the same words, in
   its own small release. Overrule: wait for launch.
3. **The privacy notice.** The new How to Play remembers, in the browser, that it has been seen, so it opens by itself
   only once. The notice already says display choices like "dismissing a prompt" are kept in the browser. Recommended,
   as the plan says: name it anyway, which gives the notice a new version date every visitor can see. Overrule: rely on
   the existing sentence, with no new version.
4. **When the new Terms and game rules go up.** They are rewritten to describe the estimate a player sees before betting.
   They are worded so they stay true in both the old and the new look, so an instant rollback needs no legal change.
   Recommended: prepare them now and publish them with the launch, as planned. Overrule: publish them as soon as they
   are signed, which makes the launch commit smaller.
5. **No 14-day notice for the Terms change.** The Terms (§10) promise 14 days' notice before a material change. This one
   describes a display and takes nothing away, so we judge it is not material. If you want the notice anyway, it must
   go out in the app two weeks before launch.
6. **The chat assistant changes its words at launch, not before.** It switches by itself when the new look goes on for
   everyone. Before that, staff previewing see the new answers only from the offline helper. This keeps the AI service
   from ever being told who is previewing. Overrule: switch earlier, with a change to the privacy notice.
7. **For the agency (optional).** `50pick.tz/?howto=1` opens How to Play directly. Do you want it in their campaign
   links?
## Amendments at the build base (`c14cb403e`, 2026-10-14) — they override the body

Re-read by the build session on OMEGA-COMPILE01 (branch `codex/vodacom-s11-build`, worktree
`C:\50pick-ssd\kipindi-s11b`), four independent readers over the four parts of this file: **402 citations, 295 exactly
right; 98 moved by the base's own edits** (VODACOM-PLAN.md +46 past its old line 3562 and +3 for the session law,
COMPLIANCE-DECISIONS.md +60, i18n-dict.ts +4 past line 1041, bet-sheet-host.tsx +1, _content-up-down.tsx +5); **9 were
already wrong at `f830a091c`**. All 107 are corrected in place above (81 line edits). What changes a package:

- **B1 · The precondition (Open point 1) does not hold.** S8 is 🔨 at `c14cb403e` (VODACOM-PLAN §1). S11 is built in
  parallel on the coordinating session's instruction (Ali, 2026-10-14: maximum parallel work); landing on main is the
  coordinator's alone, after S8's close and re-reading on each rebase as Open point 1 says.
- **B2 · One source of truth for the records (Ali, 2026-10-14, through the coordinator).** This branch edits none of
  `docs/VODACOM-PLAN.md`, `docs/NEXT-PLAN.md` and `docs/qa/claude-vodacom-continuation-20261014.md`. Everything WP0 and
  WP3 would write there — §0l, §1's row, §2's two rows, the annotations, §5 S11/S15, the §0h points, §3's "S11 keys" —
  is written as exact proposed text in § Build record below, for the coordinator to apply when it lands this work.
- **B3 · The visual bar (Ali, 2026-10-14, through the coordinator):** every surface S11 touches is read at
  **320, 360, 390, 768, 1280 and 1920** in sw, en and zh — WP10's H takes six widths, not four.
- **B4 · qa:lost-chunk's primer marker (WP2).** Correction 1's "one uses `kp-primer-force`" is qa-lost-chunk's marker
  for the primer's CHUNK (qa-lost-chunk.mjs:89, its rule :105-112, enforced at :179-180 and :225-229), not an opt-in. WP2
  moves that literal into `primer-keys.ts`, which the host imports too, so it can no longer find the primer's chunk: the
  marker becomes the primer's own SVG gradient id `primer-no-fill` (self-test S1 holds it to one file).
- **B5 · journey-shell 12.shell.flag (WP4).** :2518-2520 counts `{journeyShown && <LazyJourneyFlag />}` (built from
  `BARE_FLAG`, :287), which the fragment mount ends: it is re-pinned with 5.mount.
- **B6 · A fourth exact pin of chat.ts's call (WP6):** `scripts/anchors/house-bot-chatbot.anchors.mjs:167`
  (`system: buildSystemPrompt(locale, (await getGlobalConfig()).objectionWindowHours),`; its plant at :168 appends a
  per-reader value). `test:red-anchors` §3 requires it to resolve exactly once; it is re-aimed with the other three.
- **B7 · The journey prompt is the one template with lines swapped, never a second copy (WP6).** The red anchors on
  chat.ts must each resolve once — house-bot-chatbot.anchors.mjs :69 (`RULES:` / `1. NEVER…`), :120 (`WHAT YOU KNOW`),
  :140, :216, and support-contact.anchors.mjs:61 (the `- 18+ only…` line).
- **B8 · The privacy page's en source spells `browser&apos;s`** (:214): the new sentence keeps the entity (WP4).
- **B9 · "kipima" is the dial's sw word (:4194) and ordinary Swahili too** ("kipima muda", a timer, :3708): the census's
  sw backstop stays `kipima-dau`, never bare "kipima" (Correction 8, corrected).
- **B10 · Four declarations leave the primer, not five** (STORAGE_KEY, HIDE_ON, SUPPRESS_ON, `primerForced`). Its UA test
  stays inline on its line (`test:stacking` 8.4 reads that line for the `primerForced()` call); `primer-keys.ts` exports the
  same pattern as `AUTOMATION_UA` for the host, and `test:howto` §2 holds the two spellings equal.
- **B11 · test:visual-pass-r8a:** the held total is 5.2′ (:667, "fifteen links"); 5.2 (:665) is per file (WP9).
- **B12 · The up-down rulebook holds three "nafasi"** (:380, :391 twice), not two (Open point 25).
- **B13 · The X card is the DEFAULT `twitter:image`** (layout.tsx:173): markets/[id], leaderboard, results, proposals and
  auth/register set their own, from their OG routes, which WP1 does not touch.

## § Build record

The build's own record (B2): progress, results, the reds and their causes, Ali's points with the defaults built, what is
NOT MEASURED, and the exact text proposed for the trackers this branch does not edit. Newest last.

### Progress

| Package | State | Commit |
|---|---|---|
| WP0 · start line | Citations re-read and corrected (Amendments above); precondition does not hold (B1); records proposed below (B2) | this commit |
| WP1 · the X card | — | — |
| WP2 · `primer-keys.ts` | — | — |
| WP3 · S11's words | — | — |
| WP4 · the How-to host | — | — |
| WP5 · the FAQ | — | — |
| WP6 · the chat | — | — |
| WP7 · the tagline and `test:flip-copy` | — | — |
| WP8 · the share-picture generator | — | — |
| WP9 · the parked S15 commit | — | — |
| WP10 · the drives | — | — |
| WP11 · proof, records, merge, deploy | The coordinator's | — |
