# Commit 6 · public text: extraction, build order and open points

> A working aid, extracted **read-only** on 2026-09-15 from `04-amendments.md` (`04`), `PLAN.md` (`P`),
> `01-scenario-register.md` (`01`), `02-sealed-flows.md` (`02`), `03-design-spec.md` (`03`), `PROGRESS.md` (`PR`),
> `docs/COMPLIANCE-DECISIONS.md` (`CD`), `docs/HOUSE-BOTS.md` (`HB`) and the code on `house-bots` at `08c82f0f`
> (`origin/main` `8822b648` merged as `46c3c81d`; the ref was **not** re-fetched, so check for newer `main` first).
>
> **This file is not an authority.** The documents it cites win, and every `file:line` here must be re-derived
> before use. Code anchors are marked "(code @08c82f0f)"; plan anchors date from 2026-09-13/14 and are pointers only.
>
> Unlike `C4-SPEC.md` §6, this file takes **no rulings**. §8 lists OPEN POINTS T1–T24, each with a recommended
> ruling; the builder writes the chosen rulings into a `C6-SPEC.md` §6 (or into this file) **before** touching code.
> Two of them (T3, T4) change a legal meaning and are marked ⚠️ **OWNER**.

## 0. Scope of record

PR "Scope per commit → Commit 6" (PR:389-396):

> Rulebook §8 carve-out + disclosure (en/sw/zh); Terms §4; privacy notice (P1); META bumps; §10 waiver record (P2); FAQ; chatbot bullet.
> **Suites:** `test:house-bot-disclosure`.
> **N1/N2 text:** privacy line naming staff-chosen markets (en/sw/zh, native review); chatbot forbidden phrases; Board draft section "Stakes chosen by staff"; `test:house-bot-disclosure` §docs pins risks 13–20 and the do-not-restore lines.

Source rows:
- **P §10 "Public text and docs"** P:468-487 (the list of surfaces).
- **P §12** P:522 — what the suite proves.
- **04 P1** 04:2054-2086 (privacy line, versions, chatbot, Board draft, disclosure tracking, locales, tests).
- **04 P2** 04:1341-1365 (the §10 waiver, the code comments, three doc assertions).
- **04 P3** 04:1367-1399 (`test:house-bot-disclosure` §docs: DATA-RETENTION names 4 tables; the page row equals the constant).
- **04 P4** 04:1401-1425 (doc content tests move out of `test:docs` into §docs).
- **04 N1 §10** 04:3599-3634 (the replacement privacy line in 3 languages, the chatbot bullet, the extended forbidden phrases, the Board section, `boardDisclosureSections`, the COMPLIANCE entry).
- **04 N2 §9/§10** 04:4300-4320 (the Board section covers targets; the entry records D18).
- **04 N1 Tests** 04:3750-3755; **04 commit placement** 04:4438.
- **01** CRA-09 :1918, CRA-23 :2089, CRA-24 :2103, CRA-25 :2123, CRA-26 :2134, FS-06 :2305 (the sunset flip), FS-25 :2535, FS-30 :2583.
- **03 S8** 03:334 — "Rules/terms text: plain `<p>` inside the existing `LegalSection` children (`legal/_components.tsx:95-110`…). No new classes, no emphasis colour. META versions bumped. `{pct}` placeholders kept."
- **W3** (PR:492, PR:508): "Terms §10's written in-app notice can't be kept today (P2; since Terms v2026-09-14 §10 no longer promises SMS) — waived on Ali's ruling; defect recorded." Nothing in PR "Waiting on Ali" is open any more.

**Not in commit 6** (named here so nothing drifts in): the holder chip, the SellButton `houseStake` note and the failure-reason copy (commit 5, 03 S8 / P:479); the §12 leak sweep over `/api/fairness/recent`, `/results`, `/api/og/market/<id>` (04:2080, commit 5's reports suite); the console Board-disclosure checklist and `boardDisclosureSections` writer (commit 7, 04:3620-3623); RULES §2.11 final text, FLOWS §9, FAILURE-INVENTORY §7.1 and risks 8–12 (commit 8, 04:1429-1440, 04:1611).

## 1. Already true (do not rebuild)

**The decision of record is written.** `CD:145-293`, "2026-09-14 (ninth) · House bots". It already carries D1–D18
(:153-198), the supersede table incl. "Bots prohibited | the published rulebooks' prohibited-conduct lists | a carve-out
for accounts 50pick operates (D2/D7; **the text lands in build commit 6**)" (:217), the **Terms §10 paragraph** (:240) with
P2's three pinned phrases — "waived on Ali's ruling alone", "`smsConfigured()`", "no re-acceptance" — the do-not-restore
lines (:221-224), owner defaults W2–W16 (:248-265) and accepted risks 1–7 and 13–20 (:267-285).
⚠️ The §10 paragraph was **updated for Terms v2026-09-14**: it says "written notice in the app", not "in-app + SMS"
(PLAN §18 row "P2 Terms §10 notice text", P:824). P2's own quotation (04:1344, 04:1358) is the pre-v2026-09-14 text.

**`docs/HOUSE-BOTS.md`** carries §13 risks 1–7 and 13–20 verbatim and the three do-not-restore lines (HB:717-745);
§10 "Disclosure surfaces" is a stub: "⏳ Written in commit 6" (HB:666-670); §12's commit-6 row reads
"The disclosure suite, which also pins risks 13–20 and the do-not-restore lines in §13".

**`docs/RULES.md`** §1 already has the row "House liquidity stakes | Accounts 50pick operates may stake; …" (:63),
§2.4/§2.5/§2.6/§2.10 carry their cross-reference lines (:261, :325, :371, :560), §2.11 exists as a ⏳ LANDING stub
(:562-570) whose "**Stated:** ⏳ build commit 6 — the rulebook §8 carve-out, the §3/§4 disclosure line, Terms §4 and
privacy §3" (:569) is commit 6's own row, and §6 has the history row (:617).
**`docs/DATA-RETENTION.md`** already has all four house rows plus targets and presses (:28-33), the §2b tier ① and
NEVER entries (:100-102), and §7.1 (:346). **`docs/FLOWS.md` §9** exists (:131). **`docs/AGENT-PROGRAMME.md` §5** has the
house sentence (:226).

**`HouseBotControl.boardDisclosureSentAt` / `boardDisclosureSections`** exist in schema, migration and both DAL twins
(`house-bot-dal.ts:158,160,473-474,1165-1166,1873,2017,3173-3174`; `recordDisclosure(sections)` on both stores), with
event kind `BOARD_DISCLOSURE_RECORDED` (`constants.ts:277`) and audit key
`"house_bot.board_disclosure_recorded": "COMPLIANCE"` (`constants.ts:746`).
❗ **`BOARD_DISCLOSURE_SECTIONS` does not exist yet** (grep: nothing in `src`), and `docs/BOARD-DISCLOSURE-HOUSE-BOTS.md`
does not exist yet. Both are commit 6's (04:3610-3622).

## 2. Where the public text lives (code @08c82f0f — re-derive every line)

### 2.1 The two rulebooks
- Chooser `src/app/legal/rules/page.tsx`: `META` :37-43 — `en: "Version 2026-09-13 · Issued by 50pick Management."`;
  `COMMON` bullets :90-109 ("One account per person, 18 or older…"); the live commission block :149-184.
- **YES/NO** `src/app/legal/rules/_content-yes-no.tsx` — `yesNoContent(r)` :61, locale blocks en :70 / sw :246 / zh :419.
  - §2 eligibility en :89 (⚠️ :92 "One account per person. **Multiple accounts, shared accounts** and account sales are prohibited and may lead to forfeiture of winnings." · sw :266 · zh :436).
  - §3 "Markets and questions" en :110 — the conviction line **:127** "The conviction indicator shows where the crowd&apos;s money sits. It is information, not advice." (sw :301 "Kipimo cha msimamo huonyesha **pesa za umati** zilipo…" · zh :459 "信心指示器显示资金分布，仅供参考，不构成建议。").
  - §4 "How the pools work" en :131-162 (sw :305 · zh :463) — the pools/disclosure paragraph target.
  - §8 "Fair play and prohibited conduct" en **:217-224** (bullets :219-222; P's anchor ":217-219" is this block), sw :390-397, zh :534-541.
  - §10 "Management rights and amendments" en :235 — :238 "material changes are announced on the platform" (sw :411 · zh :552).
- **Up & Down** `src/app/legal/rules/_content-up-down.tsx` — `upDownContent(r)` :51, en :66 / sw :247 / zh :427.
  - §3 "Pools, our fee and payouts" en :108-128 (sw :289 · zh :460) — the disclosure target.
  - §8 en **:212-224** (bullets :214-218; P's ":209-211"), sw :392-404, zh :550-559.
  - §9 :234 "Material changes are announced before taking effect…" (sw :414 · zh :566); §1 :83-85 "the version published here at the moment a round locks applies to that round".
- Sub-page METAs: `yes-no/page.tsx:50-56` ("Version 2026-09-13 · Effective on entering a market."), `up-down/page.tsx:33-39` ("Version 2026-09-14 · Effective on entering a round."). ⚠️ **Free-form strings; no constant, no hash, no acceptance record.**
- `_shared.tsx` `ratesFrom()` / `RulesTable` — every rate is a parameter; **never type a rate into new copy** (RULES.md §7, `test:rules-copy` §1).

### 2.2 Terms
- `src/app/legal/terms/page.tsx`: imports `TERMS_VERSION` :5; `META` :67-71 (all three read `${TERMS_VERSION}`); `export function content(objectionHours)` :94; §2 en :106 (:110 "One account per natural person…"); **§4 "How price-competition markets work" en :155-193** (sw :312-350, zh :450-473); §10 "Changes" en :242-247 — "We will notify you **in writing in the app** at least 14 days before any material change to these Terms. Continued use after the change constitutes acceptance." (sw :398-403, zh :512-516).
- `src/lib/terms-version.ts`: `TERMS_VERSION = "2026-09-14"` :45; `TERMS_TEXT_SHA = "777f9e348125"` :59 (first 12 hex of sha256 over the whitespace-normalised `content()` bodies **plus** `LEGAL_BINDING_LANGUAGE`).

**What a Terms version bump actually does — the acceptance gate, answered:**
`TERMS_VERSION` is *written* in exactly two places, both registrations (`auth-service.ts:433`, `:652`), and it is
**never compared to a stored value anywhere** (grep over `src`: the only readers are the page, the DSAR export
`privacy.ts:272` and the admin agents page, which shows `AGENT_TERMS_VERSION`). `terms-version.ts:40-41` states it:
"Nothing compares this to a stored value, so moving it forces NO re-acceptance. Existing rows keep the version they were
stamped with." `auth-service.ts:63` repeats it. **So a bump: (a) changes what `/legal/terms` prints, (b) changes what
new registrations after the deploy are stamped with, (c) forces `TERMS_TEXT_SHA` to move in the same commit
(`test:terms-binding` §2.1), (d) forces nobody to re-accept and blocks nobody.** That is exactly what P1 (04:2065) and
CRA-26 (01:2138) require to be *stated* — and it is already stated in `CD:240`.

### 2.3 Privacy
- `src/app/legal/privacy/page.tsx`: `META` :35-39 — `Version 2026-09-15.3` in all three (bumped by another session on `main`); `function content()` :53; §3 "Lawful basis" en **:75-82** (the Legitimate-interest item **:79** "fraud prevention, market-integrity monitoring, security alerting"), sw :178-185 (:182), zh :280-287 (:284). P1's anchor ":57-63" / N1's ":61" is this block at its 2026-09-13 position.
- Version history is in the file header :19-34 and one COMPLIANCE entry per version (`CD:9`, `:21`, `:69`).

### 2.4 FAQ and hero copy (`src/lib/i18n-dict.ts`)
| Key | en | sw | zh |
|---|---|---|---|
| `heroConvEmpty` | :580 "Nothing staked yet — there is no **crowd** price to show" | :3207 "…hakuna bei ya **umati**…" | :5363 "尚无投注，暂无**群众**价格" |
| `howStep1B` | :621 "…the conviction needle shows where the **crowd's** money already sits." | :3232 "…pesa za **umati** zilipo tayari." | :5388 "…**大众**资金目前所在的位置。" |
| `faq1a` (capped-commission arm) | :2030 | :4326 | :6475 |
| `faq1aLoser` (the live arm, keeps `{pct}`) | :2031 | :4327 | :6476 |
| `faq8q` / `faq8a` ("Is the platform fair?") | :2052 / :2053 | :4340 / :4341 | :6489 / :6490 |

Consumers: `/help` renders `faq1a`/`faq1aLoser` and `faq8a` inside `<details>` (`src/app/help/page.tsx:107-140`,
`FAQ_ITEMS` :23-32; `faq1aLoser` only while `cfg.feeModel === "loser-share"` :126-127);
`howStep1B` → `src/components/home/how-it-works.tsx:19`; `heroConvEmpty` → `src/components/home/landing-hero.tsx:161,167`,
shown **only when `figures.yesShare == null`** (an empty featured market).

### 2.5 Chatbot
`src/app/_actions/chat.ts` — `buildSystemPrompt(locale, objectionHours)` :128; FORMAT :138-144; SCOPE :146-149;
**WHAT YOU KNOW :151-168**; KEY PAGES :170; RULES :172-175.
P's "new bullet after `_actions/chat.ts:147`; **lines 143–144 untouched**" was written against `origin/main` `1699c17a`,
where :147 was "If nobody bets the other side, the poll is one-sided: everyone is refunded in full, at zero fee." and
:143-144 were the stake-bounds line and "Winners share the pool. Our commission is 13% OF THE LOSING SIDE…".
**Today those are :156 (insert after) and :152-153 (untouched)** — and :152-153 are quoted verbatim by `red:rate-copy`
anchors (`scripts/rate-copy-red.mjs:115`, `:122`), so they must stay byte-identical.

### 2.6 Language selection — the Swahili default is merged
`src/lib/i18n-dict.ts:12` `export const DEFAULT_LOCALE: Locale = "sw";` and `localeOrDefault(raw)` :15-17.
Every reader goes through it: `i18n-server.ts:18-19` (`getServerT`, which **every** `/legal` page and `/help` use),
`layout.tsx:147-148` (`<html lang>`), `not-found`, `page-loader`, `theme-provider`, and `i18n.tsx:35-36` (the client
default, so a hook-free `renderToStaticMarkup` of a `*View` now defaults to **sw**, not en — 03 §7 phase C:413's
"`useT` defaults to en" is stale).
**Effect on commit 6:** the *content* is unchanged (the pages pick the block by locale), but **a visitor with no
`kp-locale` cookie now reads the new disclosure in Swahili**, i.e. a draft marked "for native review" is what most
players see first. That raises T22 and makes the sw drafts the ones to read hardest. For rendering, the locale is the
cookie `kp-locale` (`en` | `sw` | `zh`); anything else or absent → `sw`.

## 3. Every draft sentence the plan already gives (quote these; do not re-invent)

### 3.1 Privacy §3 — the **binding** version is N1's (04:3601-3606), which *replaces* P1's (04:2062)
- **en:** "Liquidity: 50pick may place stakes from accounts it operates, on markets chosen by an automated system or by 50pick staff; the automated system reads bets placed on a market to decide those stakes, and accounts that exploit them may be excluded from them for the day."
- **sw (draft, native review):** "Ukwasi: 50pick inaweza kuweka dau kutoka kwa akaunti inazoendesha, kwenye masoko yanayochaguliwa na mfumo wa kiotomatiki au na wafanyakazi wa 50pick; mfumo huo wa kiotomatiki husoma dau zilizowekwa kwenye soko ili kuamua dau hizo, na akaunti zinazozitumia vibaya zinaweza kuzuiwa kuzipata kwa siku hiyo."
- **zh (draft, native review):** "流动性：50pick 可能通过其运营的账户下注，所投注的市场由自动化系统或 50pick 员工选择；自动化系统会读取市场上的投注来决定这些下注，利用这些下注牟利的账户当天可能被排除在外。"
- Superseded P1 wording (04:2062, 01:1920), kept only as the record: "Liquidity: an automated system operated by 50pick reads bets placed on a market to decide stakes from accounts 50pick operates; accounts that exploit those stakes may be excluded from them for the day." **Why replaced:** "P1's line implies an automated system decides every stake. With D17/D18, staff choose the market and the moment." (04:3605). PLAN §18 records the same (P:808).

### 3.2 The YES/NO §3 conviction clause (the only rulebook sentence the plan drafts)
P:473 — YES/NO §3 conviction text: **"…including any stakes 50pick places to add liquidity"**. 04:3600 confirms it stays
true under N1/N2: "Rules and Terms: unchanged. '…including any stakes 50pick places to add liquidity' stays true."

### 3.3 The chatbot bullet — content sealed, wording not (01:2091-2097)
"The bullet inserted after chat.ts:147 says plainly:
- 50pick may place stakes from accounts it operates, to add liquidity
- those stakes follow the same rules, cut-offs and fee, and can win or lose
- the assistant does not know which accounts they are and never guesses
- results are sealed against the public source named on the market, and any stakeholder can object within the window"

**Forbidden phrases** — P1 (04:2067): "independent", "cannot influence", "never bets against you", **or naming or
confirming an account**; N1 (04:3609) adds: **"fully automated", "only automated", "no person decides", "no one at
50pick chooses"**. 01:2101 scopes the regex to "the prompt **or in `faq8a`** (3 locales)" and adds "chat.ts:143-144 are
unchanged" (today :152-153).
Also 01:2097: "faq8a gains one matching sentence in en/sw/zh. HOUSE-BOTS.md gets a **support script**: never confirm an
account; escalate to the owner."

### 3.4 The Board draft — sections are sealed, prose is not
04:3610-3619 — `docs/BOARD-DISCLOSURE-HOUSE-BOTS.md` gains a section **"Stakes chosen by staff"** covering: Enter now
(polls only); targets (polls only, 5–600 s, the absolute hold); the formula side and amount; the money the house may add
to, and the share limit; the information blackout, including a reopen after a result check; staff-chosen caps, with NULL
meaning off; press and veto records, the COMPLIANCE audits and R1 sections (b)–(h); the three alerts (every staff-chosen
stake, a self-decided market, staff edge); accepted risks 13–20.
N2 adds (04:4319): the section "covers targets: the 5–600 s delays, the absolute hold with the 7 s margin, first or every
stake, vetoes and never-retarget, and the staff-chosen caps."
The whole-document sections come from P1 (04:2068-2075) and CRA-24 (01:2105-2113): what 50pick does · a request to
confirm the licence class · levy treatment · the notice waiver · the controls · how to inspect · the accepted risks.
Format precedent: `docs/BOARD-DISCLOSURE-KYC-AT-WITHDRAWAL.md` (title "To the Gaming Board — …", a `> **Status:** DRAFT
FOR ALI` block naming the ruling of record, then `## 1 ·` … `## 6 ·`).

### 3.5 Not drafted anywhere (the builder writes them; English binding, sw/zh for native review)
- the rulebook **§8 carve-out** sentence (both documents, 3 languages) — T1/T2;
- the rulebook **§3/§4 pools disclosure** line (both documents, 3 languages) — T9;
- the **Terms §4** line (3 languages) — T1;
- the **`faq8a` sentence**, and the `faq1a`/`faq1aLoser`/`howStep1B`/`heroConvEmpty` rewrites — T11;
- the **chatbot bullet's** exact prose — T10;
- the Board draft's prose — T12.

## 4. Guards that pin these texts, and what a change needs to stay green honestly

`test:all` runs **every** `test:*` key in `package.json` automatically (`scripts/test-all.mjs:41-43`), so a new key needs
no wiring there; `predeploy` is a hand-written chain that already contains `test:i18n`, `test:support-contact`,
`test:chat-safety`, `test:terms-binding`, `test:agent-terms-binding`, `test:privacy-notice`, `test:google-tag`,
`test:kyc-copy-truth`, `test:house-bot-rules`.

1. **`test:terms-binding`** (`scripts/terms-binding.test.mts`). §1: the page's `META` must contain `${TERMS_VERSION}`
   three times and **no literal date** (1.1); `auth-service` stamps the constant twice (1.3-1.4); the version is an ISO
   date `^\d{4}-\d{2}-\d{2}$` (**1.5 — no `.2` suffix is possible for Terms**) and is not `2026-09-09` (1.6).
   §2: `TERMS_TEXT_SHA` must equal the hash of `content()`'s bodies + `LEGAL_BINDING_LANGUAGE` (2.1), with extraction
   ratchets (2.0: bodies > 20 000 chars; 2.0b/2.0c anchor headings in all three locales).
   → **A Terms §4 line means: new `TERMS_VERSION` + new `TERMS_TEXT_SHA`, in the same commit**, and its failure message
   forbids pasting the hash alone.
2. **`test:privacy-notice`** (578 lines). `PRIVACY_VERSION` :42 and `PRIVACY_EN_SHA` :43 are pinned constants;
   `versionDefects` :90-102 requires (a) one identical version label in en/sw/zh, (b) the label equals the pin,
   (c) the English block hashes to the pin, and (d) **`COMPLIANCE-DECISIONS.md` carries a heading matching
   `^## [0-9-]+.*Privacy v<version>`**. §0b requires sections 1-9 in every locale. §5f plants
   `sw: "Toleo 2026-09-15.3 ·"` → `…15.2` and §5a asserts each plant found its target.
   → **A privacy bump means: page META ×3, `PRIVACY_VERSION`, `PRIVACY_EN_SHA`, the §5f plant literal, and a COMPLIANCE
   heading that names the new privacy version** (T7). §4d/§4f/§4g read words *inside* §3/§4/§5/§7 — adding an item does
   not remove them, but do not reorder the Legitimate-interest `<li>` (:475-476 finds it by its own words).
3. **`test:rules-copy`** renders both rulebooks at a **driven, non-production rate** (11% / 2.5% / 7,000 / 9,000,000 /
   4 min / 3 h) and demands those figures appear (§1a-§1d), so **any rate typed into new copy fails**. §4 requires the
   side words to come from `sideWordIn` and §4c bans the ASCII `YES`/`NO` in Chinese prose. §5 rejects marketing's old
   claims and asserts the corpus is > 20 000 chars.
4. **`test:terms-cancellation`** renders Terms §4 and requires four anchor phrases per locale **and** the runway
   sentence within 200 characters of the promise (:104-110). → Add the house line as **its own `<p>`**, after the
   cash-out paragraph, never inside it.
5. **`test:kyc-copy-truth`** §2 walks **every** file under `src/app/legal`, splits it by locale block and applies rules
   1-4 (:93-97): no unit claims money moves without identity · none binds identity to the entrance · **none gives the
   gaming regulator as the reason for identity** · none claims a withdrawal is held or reviewed. Per-file/locale FLOORs
   (:761-770: yes-no 40, up-down 40, terms 30, privacy 30, rules/page 6) and `PARAGRAPH_FLOOR = 150` per locale rise
   safely as text is added. §6 reads `_actions/chat.ts` line-by-line with floor 35 and requires the line "No officer
   reviews a withdrawal before it is sent" (:1159). → New copy must not mention identity, verification, the Gaming
   Board as a reason, or a held withdrawal.
6. **`test:rate-copy`** §3: terms must still say "13%" ≥ 3 times and "1.5%" ≥ 3 times; the chat prompt must keep
   "13% OF THE LOSING SIDE", "1.5% fee", "PER BET", "does NOT limit their total exposure"; §3b: `{objectionHours}` ≥ 3
   in terms and `${objectionHours}` in the prompt; §3b.4 forbids "two-officer sign-off" **in the code, after
   decommenting**. §4 reads `docs/RULES.md` §7.
7. **`test:i18n`** parity: identical key sets, **no sw/zh value byte-identical to en** outside an allowlist, placeholder
   parity (`{pct}` must survive in all three), and **no hard-coded fee percentage in any string that also mentions a
   fee/commission/tax word** — so new FAQ copy may not carry a literal rate.
8. **`test:chat-safety`** §1 (the at-risk filter runs before `chatWithClaude`, exactly one call site), §3 (the two
   non-answers stay `unresolved: true`), §4 (the handoff card promises nothing). Its mutations live in
   `scripts/anchors/chat-safety.anchors.mjs` and quote `chat.ts` lines verbatim.
9. **`test:red-anchors` §3** — every anchor must resolve **exactly once**. Anchors that quote these files:
   `scripts/anchors/kyc-copy-truth.anchors.mjs:42-48` (the YES/NO §2 KYC `<li>`), `:52-58` (Terms §3);
   `scripts/anchors/chat-safety.anchors.mjs:13,67` (`chat.ts`); `scripts/rate-copy-red.mjs:80,87,101,108,115,122`
   (the chat prompt's resolution line, Terms §6's `{objectionHours}`, Terms §4's commission and withdrawal sentences,
   the prompt's "Winners share the pool" and "PER BET" lines). → Never duplicate one of those strings and never edit
   the lines they quote; if the new bullet or line must sit next to them, re-derive the anchor in the same commit.
10. **`test:labels` §3b** scans the player render tree for a typed side token where a player reads it — new rulebook
    prose must take sides from `sideWordIn`, never the literals.
11. **`test:docs`** (link check only): every `scripts/<file>` and `npm run <name>` named in `docs/**` must exist, and
    relative links must resolve — so `docs/BOARD-DISCLOSURE-HOUSE-BOTS.md` must exist before anything links to it, and
    `npm run test:house-bot-disclosure` may only be written in a doc once the key is in `package.json`.
12. **`test:guards-exist`**: never cite `test:house-bot-disclosure` in code or a comment before its `package.json` key
    exists (the same trap C3 hit with `test:house-bot-designation`).
13. **`test:decomment`** `CARRIER_CEILING = 20` is exact — the new suite must import `scripts/lib/decomment.mts` and
    never write its own comment stripper (C4-SPEC §7.11).
14. **`test:house-bot-rules` 11.8**: every quoted `house_bot.*` string in `src` (comments included) must be a
    `HOUSE_AUDIT` key — `house_bot.board_disclosure_recorded` already is (`constants.ts:746`).
15. **Not gates, but they read this text:** `scripts/live/kyc-at-withdrawal-prod.mjs:89-90` pins live legal version
    strings (already stale: it expects Privacy `2026-09-14.3`) and `scripts/live/rules-pages-drive.mjs` /
    `scripts/live-e70-values.mjs legal` drive the pages on production. They are ops scripts, outside `test:all`.

## 5. Surfaces to render at 1280 and 360, in en, sw and zh

**How:** `npm run build` then `next start` on a free port (never 3009/3011/3013/3014; 3021 is the branch's habit),
Playwright with the cookie `kp-locale` = `en` | `sw` | `zh` (`responsive-audit.mjs:672` shows the shape:
`[{ name: "kp-locale", value: locale, url: BASE }]`), assert `<html lang>` matches (03 §5.19), zero horizontal overflow,
and **open and read every PNG** (PR RESUME AT item 2). All seven routes are `PLAYER_PUBLIC`
(`scripts/design-gate/routes.mjs:28-31`) and need no login, so 03 §7 phase B/E applies, not the admin harness.
Add one **no-cookie** pass: the page must come up in **Swahili** (`DEFAULT_LOCALE`), which is what a new visitor sees.

| # | Route | What commit 6 changes there | It must look like |
|---|---|---|---|
| 1 | `/legal/rules/yes-no` | §8 carve-out; §4 pools disclosure; §3 conviction clause; §2 if T2 says so; META | the same page today: plain `<p>`/`<li>` inside `LegalSection`, no new classes, no emphasis colour (03:334) |
| 2 | `/legal/rules/up-down` | §8 carve-out; §3 pools disclosure; META | as above |
| 3 | `/legal/rules` (chooser) | META only, if T18 says bump | unchanged otherwise |
| 4 | `/legal/terms` | §4 line; META (from `TERMS_VERSION`) | the existing §4 paragraphs |
| 5 | `/legal/privacy` | §3 liquidity item; META | the existing §3 lawful-basis list |
| 6 | `/help` | `faq1`/`faq1aLoser` and `faq8a` answers — **inside `<details>`, so the drive must open them** | the existing FAQ rows |
| 7 | `/` (home) | `howStep1B`; `heroConvEmpty` **only in the empty state** (`landing-hero.tsx:160-168`, `figures.yesShare == null`) | the existing hero and "How it works" |

Reusable instruments: `scripts/live/rules-pages-drive.mjs` (`BASE=…` env; routes 1-3, widths 360/768/1280, three
locales, a locale positive control, geometry/type assertions) and
`MSYS_NO_PATHCONV=1 ONLY=/help,/ LOCALES=en,sw,zh node scripts/responsive-audit.mjs`.
Baseline for "unchanged elsewhere": the clean-main worktree `F:/kipindi-old-build` at the same width and locale.
**The chatbot is not a rendered surface in this commit** — the bullet lives in a system prompt. A live reply needs
`ANTHROPIC_API_KEY` and an enabled chatbot; if it is not driven, record it **NOT MEASURED**, never "passed".

## 6. Build order (numbered; WIP-commit and push after each step)

1. **Re-derive and decide.** Read this file whole; re-derive every `file:line`; fetch `origin/main` and check whether
   Terms / Privacy / the rulebooks / `privacy-notice.test.mts` moved again; write the chosen rulings for T1–T24 into
   `C6-SPEC.md` §6 (or this file) **before** any edit. Re-read `CD:145-293` — the entry already carries most of P2.
2. **Draft the words first, in English, then sw/zh** (T1, T2, T9, T10, T11): the two §8 carve-outs, the two pools
   disclosure lines, the YES/NO §3 clause, the Terms §4 line, the privacy item (3.1 is sealed — copy it verbatim), the
   `faq8a` sentence and the four dictionary rewrites, and the chatbot bullet. Check each against §4's guards *on paper*
   (no rate, no identity claim, no "crowd", `{pct}` kept, sides via `sideWordIn`).
3. **`package.json`**: add `"test:house-bot-disclosure": "tsx scripts/house-bot-disclosure.test.mts"` and (T15) the
   `predeploy` step, **before** any comment cites the key (`test:guards-exist`).
4. **Rulebooks** — `_content-yes-no.tsx` and `_content-up-down.tsx`, all three locales each; then the two sub-page
   METAs (and the chooser's, per T18). Run `test:rules-copy`, `test:labels`, `test:kyc-copy-truth`, `test:i18n`,
   `test:red-anchors`.
5. **Terms** — the §4 `<p>` in three locales, then `TERMS_VERSION` **and** `TERMS_TEXT_SHA` in `src/lib/terms-version.ts`
   with a dated comment block above `META` (P2's "house-bots block in the style of `terms/page.tsx:27-41`").
   Run `test:terms-binding`, `test:terms-cancellation`, `test:rate-copy`, `test:kyc-copy-truth`.
6. **Privacy** — the §3 item (3.1, verbatim) in three locales, the META bump, the file-header history line, then
   `PRIVACY_VERSION`, `PRIVACY_EN_SHA` and the §5f plant literal in `scripts/privacy-notice.test.mts`.
   Run `test:privacy-notice` (it will name the new hash in its failure message).
7. **COMPLIANCE-DECISIONS** — the new dated entry that names the published versions (T7), and the §10 waiver paragraph
   check; keep the House bots entry heading unique and newest-first ordering. Add the rulebook-amendment waiver if T3
   is answered that way.
8. **FAQ, hero and chatbot** — the `i18n-dict.ts` keys (en/sw/zh each, parity-safe) and the prompt bullet after
   today's `chat.ts:156`, leaving :152-153 byte-identical. Run `test:i18n`, `test:chat-safety`, `test:rate-copy`,
   `test:privacy-notice` §2c, `test:support-contact`.
9. **Docs** — `docs/BOARD-DISCLOSURE-HOUSE-BOTS.md` (DRAFT FOR ALI, KYC-disclosure format, with "Stakes chosen by
   staff"); `BOARD_DISCLOSURE_SECTIONS` in `src/lib/house-bot/constants.ts` equal to its headings (T12);
   `HOUSE-BOTS.md` §10 "Disclosure surfaces" + the support script (T13) + §12's commit-6 row; `RULES.md` §2.11
   "Stated" row; `PROGRESS.md` and the session log.
10. **The suite** — `scripts/house-bot-disclosure.test.mts` per §7 below: pure, no database, locales from
    `Object.keys(dict)`, rendered (not grepped) where the text is JSX, planted controls for every negative assertion.
11. **Mutations** — the in-place scratchpad harness (commit 3/4 pattern, worktree + junction, files restored,
    `git diff --quiet` after each): one per assertion class (see §7's "mutation" column).
12. **Closing gates** — `npx tsc --noEmit`; the touched guards above; `node scripts/test-all.mjs --skip responsive,motion`
    compared line-for-line against clean `origin/main` in `F:/kipindi-old-build`; the §5 render pass with every PNG
    read; the 3-lens adversarial review with every confirmed finding fixed; docs and `PROGRESS.md` in the same commit;
    push `house-bots`.

## 7. `test:house-bot-disclosure` — the case list

Pure (no database, no server); it renders the JSX maps the way `test:rules-copy` and `test:terms-cancellation` do
(`yesNoContent(DRIVEN)`, `upDownContent(DRIVEN)`, `content(objectionHours)`) and reads the dictionary through
`Object.keys(dict)` (FS-30, 01:2589-2592). Every negative assertion carries a planted positive control.

**§1 · the rulebook carve-out** (P:471, P:522, CD:217)
- 1.1 each rulebook's §8, in each locale, carries the carve-out; it is inside the §8 block, not elsewhere (position, like `terms-cancellation`'s 200-character rule).
- 1.2 the carve-out covers the **whole** prohibited list, multi-account and coordination included (P:471) — assert against the §8 bullets it must except.
- 1.3 (if T2 = yes) the YES/NO §2 "shared accounts" item carries it too.
- 1.4 ⭐ CONTROL: a copy with the carve-out deleted from one locale is reported; a copy with it in §9 instead of §8 is reported.
- **mutation:** drop the sentence from sw only; move it out of §8.

**§2 · the pools disclosure and the conviction clause** (P:472-473)
- 2.1 YES/NO §4 and Up & Down §3 each carry the disclosure line, each locale.
- 2.2 YES/NO §3's conviction sentence carries "…including any stakes 50pick places to add liquidity" (P:473) in each locale.
- 2.3 ⛔ no "crowd" word anywhere in the disclosure corpus: `\bcrowd('s)?\b` (en), `umati` (sw), `群众|大众` (zh) — today the only hits are `_content-yes-no.tsx:127`/`:301` and the two dictionary keys (P:522 "no 'crowd'").
- 2.4 ⭐ CONTROL: the pre-edit sentences (verbatim fixtures) are REJECTED by 2.2/2.3.
- **mutation:** restore "the crowd's money"; drop the clause from zh.

**§3 · Terms §4 and the version machinery** (P:474, 04:2063-2065, 01:2134-2143)
- 3.1 Terms §4 carries the house line in all three locales, as its own paragraph.
- 3.2 `TERMS_VERSION` ≠ the pre-commit value, is an ISO date, and equals what §4's META prints (`test:terms-binding` owns the mechanics; this pins the *move*).
- 3.3 §10 is **unchanged** (P:474 "§10 unchanged (waiver recorded)") — the §10 text is pinned verbatim in all three locales.
- 3.4 `test:terms-cancellation`'s four anchors still render (a cross-check, cheap).
- **mutation:** revert `TERMS_VERSION`; edit §10.

**§4 · the privacy line** (04:2083, 04:3751, 01:1927)
- 4.1 the N1 §10 line (3.1 above) appears in §3 "Legitimate basis" block of each locale — **rendered**, and inside §3, not merely present in the file.
- 4.2 the superseded P1 wording is **absent** (it would imply an automated system decides every stake — 04:3605).
- 4.3 the privacy META version is identical across locales and differs from the pre-commit value (`test:privacy-notice` owns the hash and the COMPLIANCE heading).
- **mutation:** put the P1 wording back; drop the line from sw.

**§5 · META parity across locales** (01:2136-2143, P:522)
- 5.1 for each of `/legal/terms`, `/legal/privacy`, `/legal/rules/yes-no`, `/legal/rules/up-down` (+ chooser per T18): the three locale version labels are equal.
- 5.2 each differs from the value it had before this commit (pinned as a literal in the suite — see T8 for making this more than a one-shot check).
- 5.3 `TERMS_VERSION` equals the Terms META version (01:2143).
- 5.4 ⭐ CONTROL: a copy that left one locale on the old label is reported.

**§6 · the chatbot** (04:2067, 04:3607-3609, 01:2101)
- 6.1 the bullet is present in `buildSystemPrompt`, after the one-sided line, with each of the four sealed contents (3.3).
- 6.2 the forbidden-phrase regex finds nothing in the prompt **or** in `faq8a` in all three locales: "independent", "cannot influence", "never bets against you", "fully automated", "only automated", "no person decides", "no one at 50pick chooses", and any pattern that names or confirms an account.
- 6.3 the untouched prompt lines (today `chat.ts:152-153`) are byte-identical to their pinned fixtures (01:2101).
- 6.4 ⭐ CONTROL: each forbidden phrase planted into a copy of the prompt is reported; an empty pattern list fails a population check (the `red:rate-copy` lesson at `rate-copy-red.mjs:134`).
- **mutation:** delete the bullet; plant "never bets against you" in `faq8a` (sw).

**§7 · FAQ and hero copy** (P:475, 01:2097)
- 7.1 `faq8a` carries the matching sentence in en/sw/zh.
- 7.2 `faq1aLoser` keeps `{pct}` (P:522) — and (per T11) so does `faq1a`.
- 7.3 `howStep1B` and `heroConvEmpty` carry no "crowd" word in any locale (§2.3's patterns).
- 7.4 locales come from `Object.keys(dict)`, so a fourth locale makes this demand copy for it (01:2592, FS-30).

**§8 · the Board draft and its constant** (04:3610-3623, 01:2105-2113)
- 8.1 `docs/BOARD-DISCLOSURE-HOUSE-BOTS.md` exists, is headed DRAFT FOR ALI, and contains every required section incl. "Stakes chosen by staff".
- 8.2 that section names: Enter now (polls only), targets (5–600 s, the absolute hold with the 7 s margin), the formula side and amount, the money the house may add to and the share limit, the blackout incl. reopen, the staff-chosen caps with NULL meaning off, press and veto records, the three alerts, risks 13–20 (04:3611-3619, 04:4319).
- 8.3 `BOARD_DISCLOSURE_SECTIONS` **equals** the draft's section headings, in order (04:3621).
- 8.4 ⭐ CONTROL: a renamed heading, or an extra constant entry, is reported.

**§9 · the §10 waiver record (P2)** (04:1362-1365)
- 9.1 the House bots COMPLIANCE entry contains "waived on Ali's ruling alone", "smsConfigured" and "no re-acceptance" — ⚠️ re-derive against `CD:240`, which already carries all three, and against P:824 (the entry says **in-app**, not "in-app + SMS").
- 9.2 **no file under `src/lib/server/house-bot/**` or `src/app/admin/house-bots/**` imports `setAnnouncementAction` or `setPlatformConfig`** — with a population floor (the house tree has ≥ N files) and a planted control, or the assertion is vacuous while the console does not exist (T17).
- 9.3 both legal pages carry the house META comment block (04:1360).
- 9.4 the house COMPLIANCE heading is unique in the file (04:3755).

**§docs** (04:1397-1399, 04:1421-1424, 04:3754, PR:396)
- d.1 risks **13–20** and the three do-not-restore lines appear in **both** `CD` and `HOUSE-BOTS.md` §13, verbatim (04:3754) — today at `CD:278-285`, `:221-224` and `HB:731-745`.
- d.2 `DATA-RETENTION.md` names all four house tables and the `/admin/retention` row's period equals the exported constant (04:1399).
- d.3 the doc-content assertions A1/A23/CRA-25 move here from `test:docs` (04:1419): the HOUSE-BOTS §13 risk-7 line; the COMPLIANCE heading suffix and the F6 §5 supersede row (01:2132); (per T14) the preflight and runbook headings and risks 8–12 only once commit 8 writes them.
- d.4 `test:docs` still passes (04:1425).
- d.5 ⭐ CONTROL / **mutation:** deleting one heading or one risk line turns the section red (04:1424).

**§0 · controls for the readers themselves** — every extractor (locale blocks, section slices, the dictionary walk,
the prompt slice) asserts a non-trivial size before any negative assertion runs; a section that finds nothing fails
loudly rather than passing an empty loop (`chat-safety` §2.1's shape).

## 8. Open points (T1–T24), each with a recommended ruling

⚠️ **OWNER** = a legal meaning changes; do not decide it in the build. **T3 and T4 only.**

**T1 · The carve-out and disclosure wording itself.** The plan seals the privacy line and the YES/NO §3 clause and
nothing else. Options: (a) the builder drafts English, sw/zh as drafts for native review; (b) ask Ali to approve the
English first; (c) copy F6 §5's "this market includes operator-provided liquidity" style per-market label (superseded:
CD:213 replaces condition 6 with one rulebook + Terms line).
**Recommended: (a)**, with these constraints written into the draft: name the actor as "accounts 50pick operates"
(D2/D7 wording, `CD:154`), never "bot"; never identify an account (D6, 04:2067); never claim independence or that
50pick "never bets against you"; state that the stakes obey the same rules, cut-offs and fee and can win or lose; and
say that the market and the moment may be chosen by staff (D17/D18, else the privacy line and the rulebook disagree).
Suggested English skeletons — **to be re-read, not pasted blind**:
- §8 carve-out: "These rules do not prohibit stakes placed by 50pick from accounts it operates to add liquidity. Those
  stakes follow the same rules, cut-offs, stake bounds and fee as every other stake, they can win or lose, and they
  are disclosed in §3/§4 and in the Privacy Policy."
- §3/§4 pools disclosure: "50pick may itself stake into these pools, from accounts it operates, to add liquidity —
  usually on the side players have left thinner. Those stakes are pooled, priced and settled exactly like a player's."
- Terms §4: "50pick may place stakes from accounts it operates to add liquidity to a market. They are pooled, charged
  the same commission and settled under the same rules as every other stake, and they can win or lose."

**T2 · Does the carve-out reach beyond §8?** YES/NO §2 (`:92`) bans "**shared accounts**", and a house bot account is
operated by both its holder (D3) and 50pick. Terms §2 and the chooser's §1 bullet say "one account per person", which
stays true (the holder keeps one account). Options: (a) carve out §8 only, as P:471 says; (b) carve out §8 **and**
name §2's shared-account item in the same sentence; (c) rewrite §2.
**Recommended: (b)** — one added clause in the §8 carve-out ("…and the account-sharing rule in §2 does not apply to an
account its holder has permitted 50pick to stake from"), so the published rules do not prohibit exactly what the
platform now does. Cheap, truthful, and it keeps §2's text otherwise untouched (its KYC `<li>` is a red anchor).

**T3 · ⚠️ OWNER — the rulebooks' own "announced" promises.** D2/D7 waives Terms §10's 14-day notice, and the entry
records it (`CD:240`). But YES/NO §10 (`:238`) promises "material changes are **announced on the platform**" and
Up & Down §9 (`:234`) "Material changes are **announced before taking effect**" — separate promises in binding text,
not covered by the §10 paragraph, and nothing is broadcast (P2: no banner, no bell, no SMS).
Options: (a) extend the waiver paragraph to name both rulebook clauses, same reasoning, effective on deploy;
(b) publish something (the `/admin/system` banner is one untranslated dismissible string — P2 rejected it);
(c) soften the two clauses in the same commit ("material changes are published here", which is true).
**Recommended: (a) plus (c)** — record the waiver explicitly *and* make the sentences true going forward; but because
this waives and edits a promise in binding player text, **put it to Ali** before building. If he does not answer,
(a) alone is the smaller step and matches D2/D7's shape.

**T4 · ⚠️ OWNER — which lawful basis the privacy line sits under.** P1/N1 put it in §3 "Legitimate interest"
(04:2062, 04:3601) — written 2026-09-13/14. On 2026-09-15 `main` recorded (CD:21-40, Privacy v2026-09-15.2) that
"the Tanzania PDPA 2022 has **no general legitimate-interests ground** — consent is the basis for ordinary
processing", and moved analytics from legitimate interest to consent. The page still lists fraud prevention and
market-integrity monitoring under legitimate interest.
Options: (a) keep the sealed placement (next to market-integrity monitoring, which is the closest neighbour);
(b) put it under "Performance of contract" (the processing is reading bets placed on a market the player is in);
(c) split: the liquidity stakes under contract, the penalty-box exclusion under legitimate interest.
**Recommended: (a) as built, flagged to Ali in the release note** — it is what the sealed text says and it is
consistent with the page as it stands; but the contradiction with the platform's own recorded PDPA reading is a legal
judgement, so **ask**. If Ali prefers (b), only the `<li>` it sits in changes, and every guard behaves the same.

**T5 · What date the new versions carry.** Every version date means "the day the binding text moved", but commit 6
lands on a branch that deploys at REL-4, on an unknown day, and `main` keeps publishing privacy versions.
Options: (a) date them commit-6 day and re-date at REL-0 if `main` moved past them; (b) use the release day from the
start (unknowable now); (c) a placeholder constant.
**Recommended: (a)**, plus a REL-0 checklist line: "re-derive `TERMS_VERSION`, the two rulebook METAs and
`PRIVACY_VERSION` against `origin/main`; if any collides with, or is older than, a version `main` published, move ours
to the release day (privacy may take a `.N` suffix; **Terms may not** — `test:terms-binding` 1.5 demands a bare ISO
date), and move `TERMS_TEXT_SHA` / `PRIVACY_EN_SHA` with them."

**T6 · Saying out loud what a Terms bump does.** §2.2 answers it: nothing re-accepts, nothing is blocked.
**Recommended:** state it in three places, each already precedented — the COMPLIANCE entry (already at `CD:240`
"Existing players keep `acceptedTermsVersion`; no re-acceptance"), the comment block above `META` in `terms/page.tsx`
(P2 04:1360), and §3.2 of the suite. Do **not** build a re-acceptance gate: it is not in scope and D2/D7 rules the
change effective on deploy.

**T7 · The privacy bump needs its own COMPLIANCE heading.** `privacy-notice.test.mts:100` requires a heading matching
`^## [0-9-]+.*Privacy v<version>`; the House bots entry heading (`CD:145`) does not name a privacy version.
Options: (a) a new dated entry, e.g. "## 2026-09-1X (Nth) · Privacy v…, Terms v… and the rulebooks — house liquidity
disclosure", cross-linked from the House bots entry; (b) rename the House bots heading (it also has to stay unique and
newest-first); (c) weaken the guard.
**Recommended: (a).** It is how every other legal bump on this platform is recorded, it keeps the House bots entry's
date and number stable, and (c) is a guard edit that buys nothing.

**T8 · How the suite makes a META bump *honest*.** "differs from the previous value" passes once and then forever.
Options: (a) pin the expected new version strings as suite constants (a human must move them, like `PRIVACY_VERSION`);
(b) add a text hash for the two rulebooks, the way `TERMS_TEXT_SHA` pins Terms;
(c) both.
**Recommended: (c) lite** — pin the expected version strings (a), and hash **only the §8 + disclosure blocks** of each
rulebook in the suite (b), so a future edit to the carve-out cannot ship without moving the rulebook META. A full
rules-version module is commit-8 scope at most; say so rather than leaving the door open.

**T9 · Which section carries the pools disclosure in each rulebook.** P:472 says "§3/§4 pools sections". In YES/NO the
pools section is §4 ("How the pools work", :131); in Up & Down it is §3 ("Pools, our fee and payouts", :108) — §4 there
is the worked example. **Recommended:** YES/NO §4 and Up & Down §3, one paragraph each, plus the YES/NO §3 conviction
clause (P:473). Do not touch Up & Down §2's "Two pools" bullet (it is mechanism, not disclosure).

**T10 · The chatbot bullet's placement and the phrase list's home.** **Recommended:** insert one bullet after today's
`chat.ts:156` (the one-sided line — the old `:147`), keeping `:152-153` byte-identical; write the four sealed contents
as one bullet with sub-clauses, in the prompt's existing voice; keep the forbidden-phrase list **in the suite** (not in
`chat.ts`), because it is an assertion about copy, and give it a population control so an emptied list fails.

**T11 · The four dictionary keys.** P:475 lists `faq1aLoser` (keeps `{pct}`), `faq8a`, `howStep1B`, `heroConvEmpty`.
Open: (i) does `faq1a` (the capped-commission arm, rendered only when the fee model is not loser-share) change too?
(ii) what replaces "crowd"?
**Recommended:** change `faq1a` as well (same sentence shape) — one arm saying "every player" while the other names
house stakes is exactly the drift these files keep producing; replace "crowd" with "the money staked on each side" /
"pesa zilizowekwa kila upande" / "各方投注的资金", and append "including any stakes 50pick places to add liquidity"
where the sentence describes whose money the needle shows. Keep `{pct}`; add no rate (`test:i18n` §4).

**T12 · Where `BOARD_DISCLOSURE_SECTIONS` lives.** Options: `src/lib/house-bot/constants.ts` (pure, already the home of
every closed list, and within the §0 module law), or a console-side constant in commit 7.
**Recommended: `constants.ts` in commit 6**, with §8.3's equality check — the constant and the draft ship together, so
commit 7's checklist has something true to read.

**T13 · HOUSE-BOTS.md §10 and the support script.** §10 is a stub; CRA-23 asks for a support script ("never confirm an
account; escalate to the owner"). **Recommended:** write §10 as a table — surface · what it says · where the text lives
· which guard holds it — covering the two rulebooks, Terms, privacy, the FAQ, the chatbot and the Board draft; add the
support script under it. It is the file a support agent or an auditor opens.

**T14 · §docs assertions that name documents commit 8 writes.** P4 (04:1421-1424) wants §docs to find RULES `### 2.11`,
FLOWS `## 9`, the four §7.1 families, `houseBotId` in AGENT-PROGRAMME §5, the HOUSE-BOTS §13 risk-7 line, and the
preflight and runbook headings; A23 (04:1548) adds the R0–R6 headings; S5 (04:1611) risks 8–12. Several of those are
explicitly commit-8 text (HB:671-689 is "⏳ Written in commit 8").
Options: (a) assert everything now and leave commit 6 red; (b) assert only what exists now, with a **declared list that
may only grow**, and a named commit-8 task to add the rest; (c) skip §docs until commit 8.
**Recommended: (b)** — a `PENDING` table in the suite naming each missing heading and the commit that writes it, with an
assertion that the table only shrinks. (c) would leave P4's whole point (doc-content tests that can fail) unbuilt.

**T15 · Suite placement and shape.** **Recommended:** `scripts/house-bot-disclosure.test.mts`, key
`test:house-bot-disclosure`, added to `predeploy` right after `test:privacy-notice` (it is pure and fast, and every
neighbouring legal guard is in `predeploy`); it imports `scripts/lib/decomment.mts` (`test:decomment` ceiling); **no
`red:` key** — the planted controls live inside the suite (C3-SPEC ruling 17's precedent), with the mutation run
recorded in `PROGRESS.md`. Expect a `predeploy` merge conflict with `main` (every merge so far has had one).

**T16 · Locale list.** **Recommended:** derive from `Object.keys(dict)` and from the `Record<Locale, …>` maps, never a
hard-coded `["en","sw","zh"]` (FS-30 01:2589-2592); assert the list has ≥ 3 entries so an empty derivation fails.

**T17 · The "nothing is broadcast" assertion (P2 04:1364).** As written ("no file under house-bots imports
`setAnnouncementAction` or `setPlatformConfig`") it is vacuous today: `src/app/admin/house-bots/**` does not exist yet,
and `src/lib/server/house-bot/control.ts` legitimately reads platform config through `loadConfigResult` (F7).
**Recommended:** scope it to the two globs, require a population floor (files found > 0) and a planted control, and
ban only the two **writer** symbols (`setAnnouncementAction`, `setPlatformConfig(`), naming the read path that is
allowed. Re-check the glob in commit 7 when the console lands.

**T18 · The `/legal/rules` chooser page.** Its text does not change; its META says "Version 2026-09-13".
Options: (a) leave it; (b) bump it with the two sub-pages so the three rules documents carry one date.
**Recommended: (a) leave it**, and say so in §5.1 of the suite (assert only the documents whose text moved) — bumping a
version whose text did not move is the mirror of the defect `terms-version.ts` exists to prevent. Revisit only if T2
adds a line to the chooser's `COMMON` list (it should not).

**T19 · Merge exposure.** `main` has bumped Privacy three times in two days and owns `privacy-notice.test.mts`,
`i18n-dict.ts`, `COMPLIANCE-DECISIONS.md` and `package.json predeploy` — all four are commit-6 files.
**Recommended:** merge `origin/main` immediately before starting commit 6 and again before the closing gates; if a
privacy version landed in between, re-run T5's re-date rule and re-derive `PRIVACY_EN_SHA` (never paste a hash without
reading what moved).

**T20 · Where the sw/zh "draft, native review" status is recorded.** 04:3601 and P:477 say English is binding and sw/zh
are drafts; risk 6 already says "sw/zh legal text needs native review" (`CD:273`, `HB:723`).
**Recommended:** a comment above each new sw/zh block naming it a draft for native review, one line in the new
COMPLIANCE entry, and a `PROGRESS.md` "Later" row so the review is not forgotten. Do **not** mark it in player-visible
copy (the binding-language sentence already covers it: `_components.tsx` `LEGAL_BINDING_LANGUAGE`).

**T21 · Paragraph shapes that keep guards honest.** **Recommended:** Terms §4's line is its own `<p>` **after** the
cash-out paragraph (`test:terms-cancellation`'s 200-character proximity rule); the rulebook carve-out is its own `<li>`
at the end of the §8 list or a `<p>` under it (so `test:kyc-copy-truth`'s per-unit rules read it as one unit); the
privacy line is its own `<li>` in §3 (so `privacy-notice` §4f still finds the Legitimate-interest item by its own
words).

**T22 · What a no-cookie visitor reads.** With `DEFAULT_LOCALE = "sw"` merged, the **Swahili draft** is the first text
most visitors see. **Recommended:** treat the sw drafts as first-class in review and in the render pass (add the
no-cookie render as its own case), and say plainly in the COMPLIANCE entry and in `PROGRESS.md` that the binding text
is English while the default rendering is Swahili.

**T23 · Does commit 6 touch `docs/RULES.md` §2.11 now or at commit 8?** §2.11 exists as a ⏳ stub whose own "Stated"
row points at commit 6, while its header says "Final text in build commit 8".
**Recommended:** in commit 6, flip only the "**Stated:**" row (drop its ⏳, name the four surfaces and their versions)
and leave the rest ⏳ for commit 8; §docs asserts the row it can see (T14).

**T24 · What is deliberately NOT in commit 6.** Record it in `PROGRESS.md` so the next session does not hunt for it:
the §12 public-payload leak sweep (commit 5), the holder chip and SellButton copy (commit 5), the Board checklist
action and the ON-modal amber line (commit 7, 04:2076, 04:3622-3623), the sunset "past tense + META bump" flip
(F2/FS-06, 04:1650, 01:2321 — a future event, not this commit), and the "disclosure change procedure" for FS-25
(aggregate-only public display).

---

**Count:** 24 open points (T1–T24). **Two need the owner:** T3 (waiving the two rulebooks' own "announced" promises)
and T4 (which lawful basis the privacy line sits under, given the PDPA reading `main` recorded on 2026-09-15). Every
other point has a recommended ruling the build may take on its own, written into `C6-SPEC.md` §6 before any code.
