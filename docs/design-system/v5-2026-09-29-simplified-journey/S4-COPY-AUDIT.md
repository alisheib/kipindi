# S4 copy audit — every state's existing words, and which have none (snapshot 2026-10-01)

> ⚠️ A SNAPSHOT. `src/lib/i18n-dict.ts` is the source of truth; re-check a string there before using it. Collected by
> three read-only researchers for the Vodacom plan's S4 design pass (`VODACOM-PLAN.md` §0g). "NO STRING" = the
> state has no words yet and needs a draft (R8). Keys are `namespace.key`; line numbers were omitted because they rot.


## Header
- Guest: Ingia | Sign in (common.signIn, ghost pill) · Jisajili | Sign up (common.signUp, filled pill). No avatar/bell for guests.
- Held wallet: the pill shows NOTHING today; WalletSheet shows "Salio · limegandishwa" (common.balanceFrozen),
  "Pochi yako imegandishwa" (kycGate.frozenTitle), "Wasiliana na msaada na timu yetu itakueleza kinachofuata."; held hides the header Deposit CTA.
- Hidden balance mask: "TZS •••••" (hard-coded). Eye aria: Onyesha salio / Ficha salio.
- Desktop nav today: Masoko · Juu na Chini · Mubashara · Matokeo · Nafasi; More: zaidi. Lang trigger "SW"; bell aria "Arifa"; avatar aria "Menyu ya akaunti".
- 18+ = footer.eighteenPlus. "Salio" = profile.balance. "Weka pesa" = common.addFunds / market.udDepositCta.

## Cards
- beFirst "Kuwa wa kwanza kutabiri" (plan says "Kuwa wa kwanza") · oneSideOnly "Upande mmoja tu" · noBetsYet "Hakuna dau bado".
- oneSidedNote "Hakuna dau upande wa {side} bado. Kama upande mmoja tu una dau wakati wa kufunga, kila dau hurudishwa kamili."
- Selection closed: time slot "Inasubiri matokeo" (market.waitingForResults); chip/action "Imefungwa" (statusClosed).
- Settled: caption "Matokeo" + NDIO/HAPANA/Batili; "Imetatuliwa {word}" on /results; void "Imebatilishwa". No won/lost on cards.
- Source "Linatatuliwa kwa {source}". "Onyesha zaidi" NO STRING (plan journey.showMore).
- Engine: emptyPool → both "Kuwa wa kwanza"; oneSidedRefund (other side empty) → "Upande mmoja tu"; fillsEmptySide → "Kuwa wa kwanza";
  hidden (legacy capped) → no figure (describeFeeModel is an ENGLISH admin string "capped 13%/33.33%" — not player copy); overCap → "Upande mdogo, ona makadirio", with no number, and a thin side → "Faida ndogo · ≈{mult}×" (the S4 panel's amended SJ-1, VODACOM-PLAN §0h point 2 — corrected by S7 WP4 on 2026-10-12, S7-PLAN Correction 9; this snapshot said "Shinda zaidi ya 100× dau").
- Short title max: sw/en 56 code points, zh 28. ⟶ 2026-10-10 (Ali): sw/en 100, zh 50 (`SHORT_TITLE_MAX`).

## Home
- Chips order today: Zote, Michezo, Uchumi, Hali ya hewa, Kripto, Utamaduni, Teknolojia, Nyingine (SJ-7 wants Michezo · Hali ya hewa · Uchumi first).
- Empty: filter miss "Hakuna soko linalolingana na vichujio hivi" / "Hakuna lililo ubaoni linalokidhi vyote kwa pamoja. Panua kimoja:" + "Mada zote";
  none at all "Hakuna masoko kwa sasa" / "Masoko yatatokea hapa opereta watakapoyachapisha. Rudi baadaye." No per-category empty message.

## Bet sheet
- Bounds: failStakeBelowMin "Dau la chini kabisa ni {min}. Weka {min} au zaidi kisha jaribu tena." · failStakeAboveMax "Kiwango cha juu kwa dau moja ni {max}. Unaweza kuweka zaidi ya dau moja kwenye soko hili." · dial chip "Chini 1,000"/"Juu …" (⚠️ "Chini 500" since the owner's ruling of 2026-10-12 — the chip reads the minimum).
- "Makadirio yamesasishwa" NO STRING. Capped: payout2 "Lipo" + payoutCalcBody "Inahesabiwa wakati wa matokeo kutoka bwawa la mwisho. Tutakuambia kiasi kamili mara dau litakapofungwa."
- Holder: "Tayari unashikilia NDIO hapa" (youAlreadyHold + here). hedgeOppositeBody "Tayari una dau upande mwingine wa soko hili. Dau zote mbili zinabaki na kila moja hulipwa peke yake — upande mmoja tu unaweza kushinda, na ada yetu hutolewa kabla washindi hawajalipwa." hedgeAddBody "Kuweka tena kunaongeza dau lako kwenye soko hili."
- Bonus warning failBonusWageringOneSide (never shows in practice; bonus withdrawn).
- Thin: crowdedWarning "Faida ni ndogo hapa — upande mwingine ni mdogo." · thinUpsideNote "Dau la upande mwingine ndiyo zawadi, kwa hiyo hakuna kingi cha kushinda. Hutalipwa chini ya dau lako ukiwa sahihi — lakini faida hapa ni ndogo."
- Placing "Inaweka…". Receipt: eyebrow "Dau lipo"; title "{side} · TZS {stake}"; "Tiketi"; "Dau"; "Lipo" = "Wakati wa utatuzi"; "Bahati njema."; buttons keepPredicting "Endelea kutabiri", viewPositions "Tazama nafasi"; "Endelea kucheza" exists (udRcKeepPlaying); "Tiketi zangu" = journey.tabTickets (S6).
- Closed: "Soko limefungwa" · "Imefungwa · Inasubiri utatuzi" · "Uchaguzi umefungwa — tunasubiri matokeo" · failSelectionClosed "Uchaguzi umefungwa kwenye hili. Sasa linasubiri matokeo." "Swali hili limefungwa" NO STRING.
- Refusal titles: loss limit "Kikomo cha hasara cha siku kimefikiwa"; others "Kuweka dau hakupatikani"; dial "Haikuwekwa" / "Angalia hili"; busy "Kuna msongamano"; retry "Jaribu tena".
  - failLossLimitDaily "Umefikia kikomo cha hasara cha siku ulichojiwekea. Kitaanza upya kesho — unaweza kukiangalia kwenye Uchezaji salama."
  - failSelfExcluded "Uko kwenye mapumziko ya kujizuia hadi {until}. Uwekaji dau utabaki umezimwa hadi wakati huo."
  - failCoolingOff "Uko kwenye mapumziko ya kupoa hadi {until}. Uwekaji dau utabaki umezimwa hadi wakati huo — hakuna kitu unachohitaji kufanya."
  - failAccountBlocked "Akaunti yako haiwezi kuweka dau kwa sasa. Wasiliana na msaada tutakueleza sababu."
  - failWalletFrozen "Pochi yako imegandishwa, hivyo dau haziwezi kuwekwa. Wasiliana na msaada kutatua hili."
  - failSessionLimit "Ulijiwekea kikomo cha dakika {limitMin} kwa kipindi kimoja, na kipindi hiki kimefika. Uwekaji dau umezimwa hadi upumzike — rudi baadaye na kitaanza upya."
  - failRateLimited "Hilo lilikuwa haraka. Subiri sekunde {sec} kisha jaribu tena."
  - failSystemBusy "Tuna shughuli nyingi kwa sasa. Dau lako HALIJAONDOKA — jaribu tena baada ya muda mfupi."
  - failMaintenance "Uwekaji dau umesimamishwa kwa matengenezo. Hakuna kilichotozwa."
- Guest: "Ingia ili kutabiri" / "Weka dau lako kwenye soko hili" / "Tazama bure, lakini simu iliyothibitishwa inahitajika kabla ya kuweka dau." / Jisajili / Ingia. "Jisajili uweke dau" NO STRING (plan).
- Stake bounds: PLATFORM_MIN_STAKE 1,000, MAX 1,000,000 (per-market via config). ⚠️ PLATFORM_MIN_STAKE is 500 since the owner's ruling of 2026-10-12; the deposit minimum stays 1,000.

## Low balance variants (shortfallPlan states: pending, deposit_limit, sof_required, wallet_held, loss_limit, belowDepositMin, rails_paused) — NO sheet strings yet.
⟶ S8 WP4 (2026-10-13): the sheet's low-balance strings are journey keys now — "S8 drafts" below.
- Pending: depositStarted "Amana imeanza"; returnPendingWarnTitle "Tafadhali usilipe tena".
- errDepositLimit "Amana hii ingepita kikomo cha amana ulichojiwekea. Unaweza kukagua vikomo vyako chini ya Uchezaji Salama."
- errSofRequired "Amana hii inahitaji tamko la chanzo cha fedha lililokubaliwa na timu yetu. Jaza tamko kutoka kwenye wasifu wako; utaweza kuweka amana hii baada ya kukubaliwa."
- Frozen: errWalletFrozen "Pochi yako imegandishwa. Wasiliana na msaada ili kutatua."; kycGate.frozenCta "Wasiliana na msaada".
- 500 minimum note NO STRING. DEPOSIT_MIN 500 (⚠️ TZS 1,000 since the owner's ruling of 2026-10-07), MAX 2,000,000. Deposit quick ladder 1,000/5,000/10,000/25,000/50,000/100,000 (page shows "1K"…).

## Deposit
- Email gate today is LINK-based: verifyGateTitle "Thibitisha barua pepe yako ili kuweka fedha"; verifyGateBody "Tumekutumia kiungo cha uthibitisho. Kifungue, kisha rudi hapa — hii ni hatua ya mara moja kabla ya amana yako ya kwanza." (⛔ the owner's ruling of 2026-10-07, NEXT-PLAN ▶ 0e: the app-wide email bar and the deposit's email gate are deleted for every viewer, and a deposit asks no email question)
  Code UI NO STRING; reusable: "Ingiza msimbo wa tarakimu 6", "Tumetuma msimbo kwa", "Msimbo mpya umetumwa.", "Tuma msimbo tena", "Inathibitisha…",
  "Msimbo si sahihi — jaribu tena.", "Msimbo umeisha muda — omba mpya.", "Majaribio mengi sana — subiri kidogo.", "Unaweza kuomba msimbo mpya baada ya" + countdown,
  agent.inviteOtpSent "Msimbo umetumwa kwa {address}", inviteOtpHint "Tarakimu sita, kutoka kwenye barua pepe tuliyotuma". "Tuma msimbo" NO STRING.
- No email: verifyNoEmailTitle "Hakuna barua pepe kwenye akaunti yako"; body "Ongeza moja ili tuweze kutuma risiti za amana na kuthibitisha ni wewe."; "Ongeza barua pepe"; auth.emailLabel "Anwani ya barua pepe"; placeholder "wewe@mfano.com".
- Paused rail: "Haipatikani kwa sasa" (common.temporarilyUnavailable); the page never marks it today.
- Frozen wallet deposit: depositPausedTitle "Kuweka pesa kumesitishwa"; body "Pochi yako imegandishwa, kwa hiyo haiwezi kupokea amana mpya. Wasiliana na msaada na timu yetu itakueleza kinachofuata."
- Payout notice: delayed title "Kutoa pesa kunachukua muda mrefu kuliko kawaida"; delayed body "Malipo yanachukua muda mrefu kuliko kawaida kufika kwenye akaunti za pesa za simu. Bado unaweza kuomba kutoa pesa na salio lako ni salama — inaweza tu kutofika mara moja."; unavailable title "Kutoa pesa hakuwezekani kwa sasa"; deposit warning "Kutoa pesa hakuwezekani kwa sasa. Unaweza kuweka pesa, lakini hutaweza kuzitoa hadi malipo yarejeshwe." (F1 fix: deposit warning for unavailable only).
- Page: "Kiasi"; wallet names literal; "Tumia namba nyingine"; bounds "Weka kiasi kati ya TZS {min} na TZS {max}."; "Chagua njia ya malipo kwanza."; failure title "Amana haijafanikiwa".
- Waiting page does NOT exist. Result modal pending: "Amana imeanza" / "Inasubiri uthibitisho" / depositPendingBody "Idhinisha kwenye simu yako. Mtoa huduma akithibitisha, tunaongeza pesa mara moja na kukutumia arifa na risiti kwa barua pepe. Huhitaji kubaki kwenye skrini hii, na tafadhali usilipe tena."; confirmed "Amana imethibitishwa" / "Pesa imeongezwa" / "Salio lako limeongezwa."; "Kumbukumbu"; "Risiti ipo kwenye historia ya pochi."; "Sawa".
  Card return: "Malipo yamepokelewa", "Malipo bado yanachakatwa", "Tafadhali usilipe tena", "Malipo hayakukamilika", "Hakuna kilichotolewa kwenye kadi yako.", "Jaribu tena", "Angalia risiti", "Rudi kwenye pochi".
  Plan-only: "Weka PIN yako · usilipe tena", "hadi dakika 30 · usilipe tena", "Pesa zimeingia", "Hakuna pesa iliyotolewa", "Rudi kwenye dau", "Weka pesa tena", "Bado utapungukiwa TZS {gap} kwa dau lako", "Swali hili limefungwa".
- First-deposit notice: "Thibitisha utambulisho wako wakati wowote kabla ya kutoa pesa kwa mara ya kwanza." + "Thibitisha".

## Akaunti hub (signed in): Pochi · Toa (Toa pesa = journey.withdrawAction, S6; "Toa"/"Toa fedha") · Matokeo · Mubashara · Jedwali la Washindi · Alika marafiki · Pendekeza na upate zawadi / Kupendekeza ·
  Wasifu · Thibitisha ID (sub "Kitambulisho · picha ya uso · ukaguzi") · Weka mipaka / Vikomo ("Mipaka · Kujitenga") · Uthibitisho wa utatuzi · Msaada ("Maswali · Simu · Barua pepe") · Arifa · Lugha ·
  Nafasi ya kadi (Ndogo/Kubwa; "Kwa simu tu. Hakuna kinachofichwa.") · Sindano (hard-coded) · Tafuta · Kuwa wakala / Dashibodi ya wakala · Konsoli ya wafanyakazi ("Staff · Internal") · Toka
  (confirm: "Kutoka kwenye akaunti" / "Utatolewa kwenye akaunti yako kwenye kifaa hiki." / "Ndio, toka" / "Baki ukiwa umeingia"). Title "Akaunti" (profile.account).
- Guest: Ingia/Jisajili, Lugha, Matokeo, Mubashara, Jedwali la Washindi, Uadilifu/"Uthibitisho wa utatuzi", Msaada, Weka mipaka/Pumzika/Jizuie, Faragha: Notisi ya faragha · Sera ya AML / KYC · Masharti ya huduma · RTP ya mchezo na sheria.

## Tiketi zangu (positions): H1 "Utabiri wako"; sub "Kila soko uliloweka — tofauti na raundi zako za Juu na Chini."; lenses Zote/Hai/Imekamilika/Umeshinda/Umeshindwa/Imebatilishwa/Imetolewa.
- Cash-out: "Toka bila gharama" m:ss · "Hakuna ada"; "TZS {n} pesa yote"; "Uza sasa" "TZS {n} −{fee} ada"; "Kuuza kumefungwa".
- Dates: "Uchaguzi unafungwa 11 Jun, 14:30" (formatDeadline en-GB: ENGLISH month names even in sw); "Uchaguzi umefungwa"; "Imefunguliwa 11 Jun 2026, 14:30".
- Stats: Dau · Lipo · "Upande wako ukishinda" · "Dau likifungwa" · "Mwisho"; chips "Inasubiri" / "Imekamilika · Ushindi" / "Imekamilika · Hasara".
- Empty: "Bado huna utabiri hai" (+ body with banned "dial/imani"), "Tazama masoko →", "Hakuna yako inayoendelea", "Hakuna yako iliyokamilika bado". Guest sheet "Ingia uone tiketi zako" = journey.ticketsGuestTitle (S6).

## Market page: "Chanzo"; "Kigezo cha utatuzi"; KPI "Kiasi" (volume), "Watabiri", "Inaisha"; chart "Uwezekano wa NDIYO kwa muda" (misspelt); countdowns "Uchaguzi unafungwa baada ya" / "Matokeo baada ya"; units Siku/Saa/Dak/Sek;
  holder block "Nafasi zako"; row status WAZI/UMESHINDA/UMEPOTEZA/BATILI/UMETOA; "Imefunguliwa"; SellButton as above.

## Juu/Chini: "Kiasi"; chips "1K"; "Maalum"; Juu/Chini; "Gusa Juu au Chini kuweka dau"; low balance inline "Salio halitoshi kwa dau hili." + link "Weka pesa" (?from=low-balance);
  udNobodyBacked "Hakuna aliyeweka dau {side} bado — kama hali hii haitabadilika, dau lako litarudi."

## Existing words the S4 panel found wrong (2026-10-01) — fix in the dictionary after the native review

The canvas already shows the corrected words. Each line: key (or where it shows) · today → corrected.
- `payout2` (receipt, Tiketi, legacy box) · "Lipo" ("it is there") → "Malipo". Its value "Wakati wa utatuzi" → "Matokeo yakitoka".
- `payoutCalcBody` · "…mara dau litakapofungwa" ("when the bet closes") → "…mara uchaguzi utakapofungwa".
- Tiketi stat "Mwisho" → "Malipo ya mwisho" · "Imefunguliwa {date}" → "Imewekwa {date}".
- `failSystemBusy` · "Dau lako HALIJAONDOKA" → "Dau lako HALIJAWEKWA na hakuna pesa iliyokatwa".
- `failAccountBlocked` · "Wasiliana na msaada tutakueleza sababu." → "…msaada na tutakueleza sababu."
- `failWalletFrozen` · "hivyo dau haziwezi kuwekwa" → "kwa hiyo huwezi kuweka dau".
  ⟶ The six lines above: **shipped on `codex/vodacom-s12-w`** (S12 WP3) — `payout2` and `market.atResolution` (its
  value), `payoutCalcBody`, `market.finalLabel`, `market.opened` (the word only: the key is still drawn as
  `{opened} {date}`, so en and zh need no placeholder), `failSystemBusy`, `failAccountBlocked`, `failWalletFrozen`. The
  same "Lipo" and "dau litakapofungwa / likifungwa" where this list did not look (`dialog.payoutLabel`,
  `toast.payoutAtResolution`, `dialog.poolSharePayout`, `market.payoutAtClose`) are waiting for review 9 (S12-PLAN WP3 step 3).

**Found 2026-10-03 by Claude as Ali's Swahili reviewer — the same error as `failWalletFrozen`, twelve more times.** The
panel ruled *dau* class 5/6 (singular *dau lako / limefungwa*, plural *madau ya / yamefungwa*); these live strings give
it class-10 agreement (*dau zote / zinafungwa / zako*). *Madau* is the plural Tanzanian betting copy already uses. Same
rule as above: they ship with S12, never earlier.
- `udNoHistory` · "Bado hakuna dau za Juu na Chini" → "Bado hakuna madau ya Juu na Chini".
- `udHistoryBody` · "…tofauti na dau zako za muda mrefu." → "…tofauti na madau yako ya muda mrefu."
- `udRcBetsClose` · "Dau zinafungwa" → "Madau yanafungwa".
- `udEstimateNote` · "Dau zikifungwa, inakuwa malipo yako kamili." → "Madau yakifungwa, inakuwa malipo yako kamili."
  ⟶ **The sentence was rewritten by the owner's Up & Down ruling (2026-10-14)**: the qualifier now names the projected
  return (*marejesho*, class 6), so its last clause reads "Madau yakifungwa, **yanakuwa** malipo yako kamili." — this
  line's "inakuwa" no longer fits. The ruling's release carried "Dau zikifungwa" forward; corrected on its own the same
  day (branch `codex/vodacom-s12-madau`, guard `test:updown-pricing` 6.10), together with the same class-10 error in the
  binding Up & Down Rules §2 (sw): "Si ahadi hadi dau zitakapofungwa." → "Si ahadi hadi **madau yatakapofungwa**."
  (6.11; the document stays at its same-day version 2026-10-14).
- `udNobodyBackedEither` · "…wakati dau zinafungwa, kila dau litarudi." → "…wakati madau yanafungwa, kila dau litarudi."
- `resVoidRefund` · "Dau zote zilirejeshwa kikamilifu — hakuna ada iliyokatwa." → "Madau yote yalirejeshwa kikamilifu — hakuna
  ada iliyokatwa."
- `noVoidedSettlementsBody` · "…iwapo dau zitarudishwa." → "…iwapo madau yatarudishwa."
- `hedgeBothBody` and `hedgeOppositeBody` · "Dau zote mbili zinabaki na kila moja hulipwa peke yake" → "Madau yote mawili
  yanabaki na kila moja hulipwa peke yake".
- `card3Body` · "dau za washindi zinarudishwa zote na haziguswi kamwe" → "madau ya washindi yanarudishwa yote na hayaguswi
  kamwe".
  ⟶ `udNoHistory`, `udHistoryBody`, `udRcBetsClose`, `udNobodyBackedEither`, `resVoidRefund`, `noVoidedSettlementsBody`,
  `hedgeBothBody` and `hedgeOppositeBody` (the clause above), `card3Body` (the clause above): **shipped on
  `codex/vodacom-s12-w`** (S12 WP3). The same error in `hedgeBothBody`'s second clause and in `card3Body`'s closing
  "Dau likifungwa" is waiting for review 9 (S12-PLAN WP3 step 3).
- `faq1a` and `faq1aLoser` · "Dau za kila mchezaji kwenye soko moja zinajiunga bwawa moja" → "Madau ya kila mchezaji
  kwenye soko moja yanaungana kuwa bwawa moja"; `faq1aLoser` also "kutoka dau za upande ulioshindwa" → "kutoka madau ya
  upande ulioshindwa".
  ⟶ **Shipped on `codex/vodacom-s12-w`** (S12 WP2's commit: each line edited once, with its side word, "— NDIO na
  HAPANA pamoja").

- `failSessionLimit` · "kipindi hiki kimefika … rudi baadaye na kitaanza upya" → "kipindi hiki kimefikia kikomo hicho … rudi baadaye uanze kipindi kipya".
  ⟶ **Shipped on `codex/vodacom-s12-w`** in its own commit — a responsible-gambling sentence, changed on Ali's yes
  (S12-PLAN Point for Ali 4, accepted by Ali, 2026-10-14). It now reads as `journey.sheetSessionLimit` does.
- `failRateLimited` · "Hilo lilikuwa haraka." → "Umejaribu haraka mno."
  ⟶ **Shipped on `codex/vodacom-s12-w`** (S12 WP3).
- ~~`failLossLimitDaily` · "Kitaanza upya kesho — … kwenye Uchezaji salama" → "Kitaanza upya kesho saa 00:00 — … kwenye Weka mipaka".~~
  ⟶ **SHIPPED LIVE 2026-10-12, in another form, by Ali's ruling** (not with S12): the limit is a rolling 24 hours
  (responsible-gambling.ts, `Date.now() - 86_400 * 1000`), so "kesho" — at any hour — was untrue. Now: "Umefikia kikomo
  cha hasara cha siku ulichojiwekea. **Kinahesabu saa 24 zilizopita** — unaweza kukiangalia kwenye Uchezaji salama." (en
  "It counts the last 24 hours", zh "该上限按过去 24 小时计算"), the same clause S8's `journey.sheetLossBlock` uses; see
  "Swahili review" 7. ⟶ S8 WP4: the sheet reads this key itself; no `sheetLossBlock` was added (S8-PLAN A5).
- `youAlreadyHold` · "Tayari unashikilia NDIO hapa" → "Tayari una dau la NDIO hapa"; `hedgeAddBody` "kwenye soko hili" → "kwenye swali hili".
  ⟶ `youAlreadyHold`: **shipped on `codex/vodacom-s12-w`** (S12 WP3; the first piece only, as the key is drawn
  `{youAlreadyHold} {side} {here}`). `hedgeAddBody` is a "soko" → "swali" rename only and waits for S15's Maswali sweep
  (S12-PLAN Open point 33).
- `failSelectionClosed` / "Soko limefungwa" → "Swali hili limefungwa" / "Muda wa kuchagua umekwisha. Sasa tunasubiri matokeo."
  ⟶ `failSelectionClosed`: **shipped on `codex/vodacom-s12-w`** (S12 WP3). The "Soko limefungwa" lines are a rename
  only and wait for S15 (Open point 33).
- Cash-out: "Toka bila gharama · Hakuna ada" → "Uza bila ada hadi {saa}"; "TZS {n} pesa yote" → "Rudishiwa TZS {n} kamili".
- `errDepositLimit` / `errSofRequired` · "Amana hii…" → the C11 sentences (the deposit has not happened yet; SJ-19 "kuweka pesa").
  ⟶ **Shipped on `codex/vodacom-s12-w`** (S12 WP3): `errSofRequired` is `journey.sheetSofRequired`'s Swahili word for
  word; `errDepositLimit` is `journey.sheetDepositLimit`'s sentence with "kiasi hiki" ("this amount") where it says
  `{amount}` — the classic refusal has no amount to fill (failure-reasons.ts), and a literal "{amount}" must never reach
  a player: "Kuweka kiasi hiki kungepita kikomo cha kuweka pesa ulichojiwekea. Unaweza kukagua vikomo vyako kwenye
  Uchezaji salama." ("kiasi hiki" is the build's two words, for the reviewer.)
- `verifyGateTitle` · "ili kuweka fedha" → "ili uweke pesa"; `depositStarted` "Amana imeanza" → "Malipo yameanza" (journey screens). (`verifyGateTitle`'s change is moot since 2026-10-07: the gate is deleted.)
- Payout delayed body · "— inaweza tu kutofika mara moja." → "— pesa zinaweza tu kuchelewa kufika."
  ⟶ **Shipped on `codex/vodacom-s12-w`** (S12 WP3).
- Market chart "Uwezekano wa NDIYO kwa muda" → "NDIO"; market KPI "Kiasi" (pool) → "Bwawa"; "Inaisha {date}" → "Matokeo {date}".
  ⟶ The chart: **shipped on `codex/vodacom-s12-w`** (S12 WP2, with the other side words spelt NDIYO — eight Swahili
  values in all, the YES/NO rules §1 and the wizard's placeholder; guard `test:labels` §12).
  "Inaisha {date}" (`market.resolves`) has had no reader since R4-I and stays (S12-PLAN ledger row 22).
  ⟶ The KPI, `market.volume` "Kiasi" → "Bwawa": **shipped on `codex/vodacom-s12-w`** (S12 WP3; the Swahili only — en
  "Volume" and zh 成交量 wait for S15's words, S12-PLAN Open point 29).
- Akaunti · "Maswali · Simu · Barua pepe" → "Maswali ya kawaida · Simu · Barua pepe" (no number: VODACOM-PLAN §0h point 10 reversed the panel here — 0800 11 0011 is the national helpline, not our desk, and keeps its own labelled row); "Nafasi ya kadi" → "Ukubwa wa kadi"; "Mipaka · Kujitenga" → "Mipaka · Pumzika · Jizuie".
  ⟶ `nav.cardSpacing` and `profile.responsibleGamblingSub`: **shipped on `codex/vodacom-s12-w`** (S12 WP3). The privacy
  notice keeps "nafasi ya kadi" until its own next version (S12-PLAN Open point 29).
- Juu/Chini · "Kiasi" → "Dau lako"; "Gusa Juu au Chini" → "Bonyeza Juu au Chini".
  ⟶ **Shipped on `codex/vodacom-s12-w`** (S12 WP3: `market.udStake`, `market.udTapToBet`). The round page's result label
  "CHAGUO LAKO · DAU LAKO" (162.8px) is held to its own site's measure in `test:visual-pass-r7a` 5.3″.
- Chinese How-to · side words quoted 「是」「否」 in running text; "赢家平分奖池" (split equally — false) → "赢家按投注比例分享奖池".

**Found 2026-10-08 by Claude as Ali's Swahili reviewer, reading WP12's 333 tiles — the card's time left.** `market.timeLeftH`
"masaa {n} yamebaki" put a colloquial ma- plural, and its plural agreement, on every count, so one hour left read
"masaa 1 yamebaki". *Saa* is the standard noun, the same word for one hour or many (N-class, as *siku* and *dakika*
already are beside it), and one of anything takes the singular verb. Ships with S12, with the formatter's singular
templates (prepared on branch `vodacom-s12-timeleft`, its guard in `test:time-left`):
- `timeLeftH` · "masaa {n} yamebaki" → "saa {n} zimebaki"; new `timeLeftH1` · "saa {n} imebaki" (n = 1).
- `timeLeftD` stays "siku {n} zimebaki"; new `timeLeftD1` · "siku {n} imebaki". `timeLeftM` stays "dakika {n} zimebaki";
  new `timeLeftM1` · "dakika {n} imebaki". (en and zh have no number agreement: their singular keys repeat the plural.)
  ⟶ **Shipped on `codex/vodacom-s12-w`** (S12 WP4, 2026-10-14): `1468d7cca` cherry-picked onto `ed95ab031` with no
  conflict; the five `timeLeftLabel(` callers pass the singular keys and no journey file calls it.

## S6 drafts (2026-10-01) — for the native review

Added by S6 WP1 (`S6-PLAN.md`). These Swahili strings entered `src/lib/i18n-dict.ts` as new keys of the `journey`
namespace; only journey files read them, so no classic word changed (§3.9). The dictionary stays the truth — re-read a
value there before quoting it. Each line: key · sw · where it comes from.

**S4 canvas words, now keys** (drawn and panel-checked at S4; the review signs off the dictionary copy):
- `journey.withdrawAction` · "Toa pesa" · SJ-15's WalletSheet door (the Akaunti hub line above now names the key).
- `journey.ticketsGuestTitle` · "Ingia uone tiketi zako" · the guest Tiketi sheet (the Tiketi zangu line above now names the key).
- `journey.ticketsKindAria` · "Aina ya tiketi" · the name of the Maswali | Juu/Chini switch.
- `journey.ticketsFilterAria` · "Chuja tiketi" · the name of the status strip; replaces "Kichujio cha nafasi" (S6-PLAN A7).
- `journey.ticketsEmptyOpenTitle` · "Bado huna tiketi hai" · replaces "Bado huna utabiri hai".
- `journey.ticketsEmptyOpenBody` · "Chagua swali, bonyeza {yes} au {no} — tiketi yako itaonekana hapa." · replaces the body with the banned "dial ya imani".
- `journey.ticketsBrowse` · "Tazama maswali" · replaces "Tazama masoko →".
- `journey.ticketPayout` · "Malipo" · the "Lipo" correction above.
- `journey.ticketPayoutAtResult` · "Matokeo yakitoka" · the "Wakati wa utatuzi" correction above.
- `journey.ticketFinalPayout` · "Malipo ya mwisho" · replaces "Mwisho".
- `journey.ticketPlacedAt` · "Imewekwa {date}" · replaces "Imefunguliwa {date}".
- `journey.sellFreeUntil` · "Uza bila ada hadi {time}" · replaces "Toka bila gharama · Hakuna ada".
- `journey.sellFreeCta` · "Uza bila ada" · the outlined sell button's first line.
- `journey.sellFullRefund` · "Rudishiwa {amount} kamili" · replaces "TZS {n} pesa yote".
- `journey.sellClosedBody` · "Dau hili sasa linasubiri matokeo — haliwezi kuuzwa tena." · replaces "…litaenda hadi malipo…" (`common.sellLockedHint`).
- `journey.hubGuestPrompt` · "Ingia au jisajili ili kuona pochi na tiketi zako." · the signed-out Akaunti.
- `journey.hubHelpSub` · "Maswali ya kawaida · Simu · Barua pepe" · the corrected Akaunti line above.
- `journey.hubLimitsSub` · "Mipaka · Pumzika · Jizuie" · replaces "Mipaka · Kujitenga".
- `journey.hubCardSize` · "Ukubwa wa kadi" · replaces "Nafasi ya kadi".
- `journey.hubStaffSub` · "Wafanyakazi tu" · the staff row (the avatar menu's sub is the English "Staff · Internal").
- The hub's card names (s4-8-akaunti*): `hubGroupMoney` "Pesa", `hubGroupPlay` "Cheza", `hubGroupSafety` "Cheza kistaarabu",
  `hubGroupInvite` "Alika", `hubGroupProfile` "Wasifu", `hubGroupHelp` "Msaada", `hubGroupSettings` "Mipangilio",
  `hubGroupAgent` "Wakala", `hubGroupStaff` "Wafanyakazi", and for guests `hubGroupFairnessHelp` "Uadilifu na msaada" and
  `hubGroupLegal` "Faragha". New words among them: "Cheza", "Wakala", "Wafanyakazi", "Uadilifu na msaada"; the rest
  repeat an existing value.

**Drafted at S6** (no deck or canvas source) — the "tiketi" copies of classic lines that say "nafasi" (SJ-19):
- `journey.ticketsEmptyLens` · "Hakuna tiketi inayolingana na vichujio hivi" · of `positions.emptyFilter`.
- `journey.ticketsEmptyCashed` · "Bado hujauza tiketi yoyote" · of `positions.emptyCashed` ("Hujatoa nafasi yoyote mapema"); "uza" is the journey's sell word.
- `journey.ticketsExitLens` · "Tiketi zote" · of `positions.exitLens`.
- `journey.ticketsErrorBody` · "Tiketi zako ziko salama. Tumeandika kilichotokea na tutashughulikia. Madau na malipo yote hayajaathiriwa." · of `error.positionsSafe`.
- `journey.ticketsBack` · "Rudi kwenye tiketi" · of `error.backToPositions`.
- `journey.sellConfirmTitle` · "Uza tiketi hii sasa?" · of `dialog.sellPositionNow`.
- `journey.sellKeep` · "Baki na tiketi" · of `dialog.keepPosition`.
- `journey.sellUnchanged` · "Tiketi haijabadilika." · of `common.positionUnchanged`.

Not for review: `balanceCaption` "Salio", `depositAction` "Weka pesa", `tabQuestions` "Maswali", `tabTickets` "Tiketi
zangu" and `tabAccount` "Akaunti" are the deck's own words (VODACOM-PLAN §3, binding).

**Found while drafting** — classic words, left as they are until S15 (§3.9):
- `error.positionsSafe` (sw) · "hayajaaathiriwa" carries a third "a" → "hayajaathiriwa" (the journey copy is spelt right, as `error.pageHitSnagBody` already is).
  ⟶ **Shipped on `codex/vodacom-s12-w`** (S12 WP3, with review 2's corrections, as review 2 asked). `error.walletSafe`
  carries the same typo and is waiting for review 9 (S12-PLAN WP3 step 3).
- `profile.helpSupportSub` (en, zh) · "FAQ · Helpline · Email" / "常见问题 · 热线 · 邮件" names our help desk a helpline — §0h point 10's mix-up; the journey copy says "Phone" / "电话".
- `profile.inviteFriendsSub` (zh) · "分享你的链接 · 查看谁加入" uses the informal 你 → 您.

**Added at S6 WP9 (2026-10-03)** — Tiketi zangu's own copies of classic lines that say 持仓 in Chinese, and its
strip's name in every language (VODACOM-PLAN §0h point 27):
- `journey.ticketsEmptySettled` · "Hakuna yako iliyokamilika bado" · of `positions.emptySettledLens`: en and sw verbatim (already reviewed); zh "您还没有已结算的注单" (注单 for 持仓, approved).
- `journey.ticketsEmptyWon` · "Hakuna yako iliyoshinda bado" · of `positions.emptyWon`; zh "您还没有获胜的注单".
- `journey.ticketsEmptyLost` · "Hakuna yako iliyopotea" · of `positions.emptyLost`; zh "您没有失利的注单".
- `journey.ticketsEmptyRefunded` · "Hakuna yako iliyorudishwa" · of `positions.emptyRefunded`; zh "您没有被退还的注单".
- `journey.ticketsFilterAria` · "Chuja tiketi", unchanged · en "Status" → "Filter tickets" and zh "状态" → "筛选注单" (approved): the strip's name now says what it does in every language, as the Swahili always did.

## S7 drafts (2026-10-12) — for the native review

Added by S7 WP4 (`S7-PLAN.md`) as keys of the `journey` namespace; only journey files read them, so no classic word
changed (§3.9). Each line: key · sw · where it comes from. The dictionary stays the truth.

**The deck's words, now keys** (VODACOM-PLAN §3, binding — read, never re-worded): `howToCardTitle`, `howToCardMeta`,
`headlineAsk`, `headlineSides`, `cardWin`, `showMore`, `howToTitle`, `howStep1Title` … `howStep3Body`,
`howExampleLabel`, `howExampleBody`, `howCta`, `estimateNote` (shared with S8). Not added: `cardWinOver` (S7-PLAN
Correction 9) and `howHelplineLabel` (no player surface shows the helpline: the owner ruling of 2026-10-06, A6).

**S4 canvas words, now keys** (approved in "Swahili review" 3 below):
- `journey.cardOverCap` · "Upande mdogo, ona makadirio" · the over-cap pick line, with no number.
- `journey.cardThin` · "Faida ndogo · ≈{mult}×" · the thin-side pick line; the canvas's "≈1.0×" is the `{mult}` placeholder.
- `journey.similarTitle` · "Maswali yanayofanana" · the similar rail's heading in the journey's words.
- `journey.homeEmptyCatTitle` · "{cat}: hakuna maswali wazi kwa sasa" · the canvas's "Kripto: hakuna maswali wazi kwa sasa".
- `journey.homeEmptyBody` · "Maswali mapya yataonekana hapa yakichapishwa." · the home's empty-book body.
- `journey.homeEmptyAll` · "Onyesha maswali yote" · the empty category's way back to every question.

**Drafted at S7** (no deck or canvas source):
- `journey.cardBeFirst` · "Kuwa wa kwanza" · the empty-side pick line (§0g item 11; S7-PLAN Open point 8): `market.beFirst`'s
  "Kuwa wa kwanza kutabiri" wraps on a pick at every width.
- `journey.cardResultLabel` · "Matokeo" · the settled row's caption (the "Cards" line above).
- `journey.homeChipsAria` · "Aina za maswali" · the chips rail's name.
- `journey.homeEmptyTitle` · "Hakuna maswali wazi kwa sasa" · the empty book, the canvas's category line without its category.
- `journey.homeQueryLine` · "Unatafuta: “{q}”" · the line over a searched home.
- `journey.homeQueryNone` · "Hakuna swali linalolingana na “{q}”" · a search with no match.
- `journey.howStepsAria` · "Hatua" · the How-to sheet's scrolling steps region.
- `journey.hubSearchPlaceholder` · "Tafuta swali" · Tafuta in the Akaunti hub (S7 WP9).

## S8 drafts (2026-10-13) — for the native review

Added by S8 WP4 (`S8-PLAN.md` WP4, as amended by A5, A10, A20 and A24) as keys of the `journey` namespace; only journey
files will read them, so no classic word changed (§3.9). Each line: key · sw · where it comes from. The dictionary stays
the truth; every figure is a placeholder (the minimum stake, TZS 500 since 2026-10-12, is read per market).

**The deck's words, now keys** (VODACOM-PLAN §3, binding — read, never re-worded): `sheetChosen`, `stakeLabel`,
`estimateLead`, `estimatePill`, `balanceRow`, `placeCta`, `placeCtaBare`, `estimateCompact`, `lowTitle`, `lowBody`,
`lowChoose`, `lowDeposit`, `lowBetInstead`. Not added: `pendingBet` (S9's).

**S4 canvas words, now keys** (approved in "Swahili review" 3 below; the drawn "TZS 3,000", "TZS 1,000", "TZS 800",
"100", "10%" and "8 Okt" are `{amount}`, `{min}`, `{left}`, `{cap}`, `{pct}` and `{date}`): `estimatePillOver`,
`estimateUpdated`, `sheetEmptyPoolBody`, `sheetRefundRule`, `sheetFirstOnSide`, `sheetLegacyFee`, `lowMinNote`,
`lowPendingTitle`, `lowPendingTrack`, `lowSofCta`, `homeBreakTitle`, `homeBreakBody`, `cardBreak`. Not built as drawn:
the loss room's "leo" (S8-PLAN A5: now a draft below, `lowLossRoom`).

**Review 2's corrected live words, as journey copies** (approved in "Swahili review" 2; the classic keys keep their
words until S12): `sheetClosedTitle`, `sheetClosedBody`, `sheetHolds`, `sheetHoldAddBody`, `sheetHedgeBody`,
`sheetHedgeBothBody`, `sheetLegacyBody`, `sheetBusy`, `sheetBlocked`, `sheetFrozen`, `sheetSessionLimit`,
`sheetRateLimited`, `sheetDepositLimit`, `sheetSofRequired`, `sheetBelowMin`, `sheetAboveMax`. `sheetHedgeBody` and
`sheetHedgeBothBody` say "swali hili" where the corrected classic sentences say "soko hili" (SJ-19), as `hedgeAddBody`'s
correction does — review 8 confirms it.

**Reused by key, never copied:** the loss block is `error.failLossLimitDaily` as corrected live on 2026-10-12 (review 7;
S8-PLAN A5 — there is no `sheetLossBlock`); the ✕ is `common.close` ("Funga"); the receipt's "Dau" is `common.stake`;
the pending body under 10 minutes is `common.depositPendingBody`; and the rest of S8-PLAN's "Reused, never copied" list.
⛔ No helpline key.

**Drafted at S8** (no deck slide gives them; for review 8 below):
- `journey.sheetPlacing` · "Inaweka dau…" · the placing frame (s4-4-sheet-placing): `dialog.placing`'s "Inaweka…" with its object.
- `journey.sheetPlacingSlow` · "Bado tunaweka dau lako — inachukua muda kidogo." · the placing frame's wait line at 1.5 s (S8-PLAN A7); never the classic `dialog.busyHolding`, whose money claim nobody can check mid-request.
- `journey.retryCta` · "Jaribu tena · {amount}" · the in-doubt frame's retry with its amount (A2, A20 item 1): "Jaribu tena" as `common.retryNow` says it, then the figure as `placeCta` carries it.
- `journey.sheetNotTaking` · "Swali hili halipokei dau kwa sasa." · the closed frame's body for a question that is not LIVE (A8, A20 item 3): `error.failMarketNotLive` with "swali hili" for "soko hili".
- `journey.sheetBonusWager` · "Dau hili halitahesabiwa kwenye bonasi yako. Tayari una fedha upande wa pili wa swali hili, na upande mmoja tu ndio unaohesabiwa kwenye {remaining} unayohitaji kuweka kabla ya bonasi yako kutolewa." · the sheet's SJ-22 bonus line (A20 item 2): `error.failBonusWageringOneSide` with "swali hili" for "soko hili", nothing else changed.
- `journey.sheetRailsPaused` · "Kuweka pesa kwa simu hakupatikani kwa sasa. Njia zote za malipo kwa simu zimesimama kwa muda — jaribu tena baadaye." · every mobile-money rail paused (s4-5-low-paused; review 8 narrows the wording to the methods the gate reads).
- `journey.sheetDepositMax` · "Kiwango cha juu cha kuweka pesa mara moja ni {max}." · the `deposit_max` branch (none drawn), in `sheetAboveMax`'s shape.
- `journey.estimateUpdatedLive` · "Makadirio yamesasishwa: ≈ {amount}, ≈{mult}× dau lako" · the polite region's estimate update (s4-4-sheet-updated), with the board's "≈ " (A20 item 8).
- `journey.estimateNoteCompact` · "Makadirio · kamisheni ya {pct}% imeshatolewa." · the keyboard-up note (s4-4-sheet-keyboard-360), `estimateNote` shortened.
- `journey.multOnly` · "≈{mult}×" · the bare multiple (pick-3; the keyboard frame): a figure with no words, the same in every language (test:i18n's IDENTICAL_OK names it).
- `journey.lowBetInsteadEstimate` · "Ukishinda ≈ {amount} · ≈{mult}×" · bet-instead's estimate row (pick-3; the panel's A1).
- `journey.lowLossTitle` · "Kikomo cha hasara" · the loss-room frame's title (s4-4-sheet-loss-room).
- `journey.lowLossRoom` · "Kikomo chako cha hasara kinaruhusu dau la hadi {amount} kwa sasa." · the loss room without a calendar day (S8-PLAN A5 item 5): the approved "…hadi {amount} leo" with "dau la" and "kwa sasa", because the limit is a rolling 24 hours.
- `journey.lowPendingWaitBody` · "Inaweza kuchukua hadi dakika 30 — usianzishe malipo mengine." · a deposit pending 10 to 30 minutes (A10; s4-6-wait-long's line, without its emailed receipt).
- `journey.lowPendingLateTitle` · "Malipo bado hayajathibitishwa" · a deposit pending from 30 minutes (A10): the approved title (review 3), now a key.
- `journey.lowPendingLateBody` · "Imepita dakika 30. Usianzishe malipo mengine — pesa zikikatwa, zitaingia kwenye salio lako zikithibitishwa." · its approved sentence (review 3; s4-6-wait-over30), now a key — shown only from 30 minutes, where "Imepita dakika 30" is true.
- `journey.ticketsHere` · "Tiketi zako" · the question page's holder block (s4-10-market).

## S11 drafts (2026-10-14) — for the native review

Added by S11 WP3 (`S11-PLAN.md` WP3, "New dictionary keys") as keys of the `journey` namespace — /help and the chat panel
read them for a journey reader only (WP5, WP6), so no classic word changed (§3.9) — beside the chat's offline journey
words (WP6, code strings in `send-message.ts`), the privacy line (WP4), the legal texts parked for the S15 commit (WP9)
and the tagline's sw and zh (SJ-20, carried by WP9). Each line: key · sw · where it comes from. The dictionary stays the
truth; `{max}` is `WITHDRAW_MAX_TZS`, formatted. All signed in review 9 below, its corrections applied.
- `journey.faq2q` · "Makadirio yanabadilika baada ya kuweka dau?" · faq2's question in the journey's word, the estimate, not "odds" (deck slide 3).
- `journey.faq2a` · "Kabla ya kuweka dau, swali linaonyesha makadirio ya unachoweza kushinda: pale yanapoweza kukadiriwa, …" · faq2's answer without the shelved dial and confirm popup.
- `journey.faq3a` · "Bonyeza salio lako juu kisha uchague Toa pesa — au fungua Akaunti → Toa pesa — …" · the journey's two withdraw doors (the capsule's sheet, Akaunti's row).
- `journey.faq5a` · "Fungua Akaunti → Weka mipaka. Unaweza kuweka mipaka ya amana, hasara na muda, kupumzika, au kujizuia." · the at-risk answer's shortest true path.
- `journey.faq6a` · "Unaweza, kwa muda mfupi. Mara baada ya kuweka dau, tiketi yake kwenye Tiketi zangu inaonyesha Uza bila ada …" · the journey Sell look's words, with no typed minutes.
- `journey.chatIntro` · "Niulize kuhusu amana, kuweka dau, malipo, au chochote usichokipata kwenye Msaada." · the chat panel's intro, without "dial".
- `journey.chatStarterHowTo` · "Ninawezaje kucheza?" · the starter chip, in place of "Dial ya imani ni nini?".
- The four zh How-to values (`howStep1Body`, `howStep2Title`, `howStep3Body`, `howExampleBody`) take the corrections the
  "Chinese How-to" line above recorded: the side words in 「」, and 赢家按投注比例分享奖池 (pro rata, never "equally").
## S10 drafts (2026-10-15) — for the native review

Added by S10 WP2 (`S10-PLAN.md` "New dictionary keys") as one key of the `journey` namespace; only the journey's guest bet
sheet reads it, so no classic word changed (§3.9).
- `journey.sheetSignUp` · "Jisajili uweke dau" · the guest sheet's first door, in the commit's place (`s4-4-sheet-guest`):
  the canvas's word, approved in review 3 below; en and zh drafted at S10, for review 10 below.

**Reused by key, never copied:** the second door is `common.signIn` ("Ingia"); every other word the guest sheet shows is
S8's (`S10-PLAN.md` "Reused, never copied"). ⛔ No balance or "your bet is saved" sentence, and no helpline key.

## Swahili review — signed off by Claude (Ali, 2026-10-02: "you will be the Swahili speaker")

Reviewed 2026-10-02, string by string, for grammar (noun-class agreement, tense, object markers), meaning against the
English, and natural Tanzanian usage on a money screen. Imperative labels ("Cheza", "Alika", "Pumzika", "Jizuie") are
kept: the product already names its sections and doors with imperatives, and players read them that way.

**1. S6 dictionary keys (journey.*, not shown to anyone until S15) — approved, with three corrections applied:**
- `journey.hubGuestPrompt` · "Ingia au jisajili ili ~~kuona~~ **uone** pochi na tiketi zako." — after *ili* a person
  needs the subjunctive with its subject (the S4 panel's own rule, C12); the infinitive left the sentence without one.
- `journey.ticketsErrorBody` · "Tumeandika kilichotokea na ~~tutashughulikia~~ **tutakichunguza**." — the English says
  *investigate*, and the verb needs the object marker of *kilichotokea* (class 7, -ki-); "tutashughulikia" had neither.
- `journey.hubGroupLegal` · ~~"Faragha"~~ **"Sheria na faragha"** (en "Legal & privacy", zh "法律与隐私") — the card holds
  the privacy notice, the AML/KYC policy, the terms and the RTP rules; "Privacy" named only one of the four, in every
  language.
- Every other S6 key is approved as written: `withdrawAction`, `ticketsGuestTitle`, `ticketsKindAria`,
  `ticketsFilterAria`, `ticketsEmptyOpenTitle`/`Body`, `ticketsBrowse`, `ticketPayout`, `ticketPayoutAtResult`,
  `ticketFinalPayout`, `ticketPlacedAt` (class 9 *tiketi* → "Imewekwa"), `sellFreeUntil`, `sellFreeCta`,
  `sellFullRefund`, `sellClosedBody` (class 5 *dau* → "linasubiri … haliwezi"), `hubHelpSub`, `hubLimitsSub`,
  `hubCardSize`, `hubStaffSub`, the group names, `ticketsEmptyLens`, `ticketsEmptyCashed` ("hujauza", negative perfect
  of *kuuza*), `ticketsExitLens`, `ticketsBack`, `sellConfirmTitle`, `sellKeep`, `sellUnchanged` (class 9 →
  "haijabadilika").

**2. Corrections to words players see today — approved as listed above; they ship with S12, never earlier.** Every line
in "Existing words the S4 panel found wrong" is correct Swahili and says what the English says. Two notes: "kesho saa
00:00" keeps the platform's 24-hour digital time (the product never uses Swahili clock reckoning) — ⚠️ withdrawn
2026-10-12: the loss limit is a rolling 24 hours, so no reset time is true; that line shipped live in its corrected form
(review 7); and the classic
`error.positionsSafe` typo "hayajaaathiriwa" (three a's) is fixed in the same S12 commit.

**3. S4 canvas drafts that S7–S11 will turn into keys — approved, with two corrections the build must use:**
- Juu/Chini round closed: "Pesa zako zimeingia — TZS 5,000 ~~iko~~ **ziko** kwenye salio lako." — *pesa* takes class 10
  agreement in the same sentence ("zimeingia"), so the figure that stands for it does too.
- Its button: "Nenda **kwenye** raundi inayofuata" — *kwenda* to a place needs *kwenye*.
- Approved as drawn: "Upande mdogo, ona makadirio"; "Faida ndogo · ≈1.0×"; "Kiasi cha chini cha kuweka ni TZS 500 —
  TZS 300 zitabaki kwenye salio lako." (⚠️ from the owner's ruling of 2026-10-07, a TZS 1,000 minimum: "Kiasi cha chini
  cha kuweka ni TZS 1,000 — TZS 800 zitabaki kwenye salio lako."); "Malipo yako ya TZS 3,000 yanasubiri"; "Fuatilia malipo"; "Jaza tamko"; "Weka
  PIN kwenye simu yako"; "Usianzishe malipo mengine."; "Angalia hali ya malipo"; "Hakuna pesa iliyokatwa"; "Pesa zako
  zitarudishwa" and its sentence; "Malipo bado hayajathibitishwa" and its sentence; "Maswali yanayofanana"; "Weka pesa
  tena"; "Kikomo chako cha hasara kinaruhusu hadi TZS 3,000 leo."; "Jisajili uweke dau"; "Makadirio yamesasishwa"; the
  empty-side and empty-pool lines; "Kripto: hakuna maswali wazi kwa sasa"; "Maswali mapya yataonekana hapa
  yakichapishwa."; "Onyesha maswali yote"; the break notice and "Mapumziko hadi 8 Okt"; "Kamisheni ya hadi 10% ya bwawa
  lote hutolewa kabla washindi hawajalipwa."; "≈ zaidi ya 100× dau lako"; "Raundi hii imefungwa"; "Tuma msimbo";
  "Thibitisha barua pepe yako ili uweke pesa"; "Bado utapungukiwa na TZS 1,000 kwa dau lako."; "Salio lako · —".
  ⚠️ S8-PLAN Correction 14 and A5/A10 (2026-10-12): three canvas sentences are not built as drawn — the pending board's
  receipt "kwa barua pepe" (money mail goes only to a confirmed address since 2026-10-07; the receipt stays in the app),
  the inline session-limit line's "hadi 15:40" (the refusal carries no clock time), and the loss room's "leo" (the limit
  is a rolling 24 hours: "kwa sasa", for review 8 to sign).

**4. S6 A8c (2026-10-03, revised 2026-10-04) — two live keys, approved as written:** `error.failPriceChanged` · "Bei
imebadilika kuwa {value}. Dau lako halijauzwa — unaweza kuliuza kwa bei mpya." — *bei* (class 9) takes "imebadilika
kuwa" for "changed to"; *dau* is class 5 throughout: *lako*, *halijauzwa* (negative perfect, "has not been sold") and
*kuliuza*, whose object marker *-li-* is the bet's. ⚠️ *Bei* is the word the A8c brief names among the house's for a
sale's price; it is NOT an existing Sell phrase — the dictionary's other *bei mpya* is Up & Down's new asset reading
("Bado hakuna bei mpya."), the confirm prints its figure under *Utapokea*, the quote line says *kiasi*, and
`failCashoutValueZero` says *thamani ya kuuza*. It is kept because the sentence is read beside the refreshed button that
prints the very price it names; "kwa bei mpya" is plain Swahili for "at the new price". And `error.failCashoutPoolShort` ·
"Kuna hitilafu upande wetu, hivyo dau hili haliwezi kuuzwa sasa. Wasiliana na msaada." — the platform's own "hitilafu
upande wetu" (`failSystemError`) and "Wasiliana na msaada" (`failAccountBlocked`); *dau hili haliwezi kuuzwa*, class 5.
Both ship with A8c, live strings for every player, and not with S12, because they are new sentences rather than
corrections to ones players see today. Chinese for the same keys: "价格已变为 {value}。您的投注未卖出——您可以按新价格卖出。" and
"我们这边出现错误，您的投注暂时无法卖出。请联系客服。" — formal 您, and 卖出, the failure registry's word for sell; the second takes the
platform's own 我们这边出现错误 and 请联系客服.

**5. The agent application's referee step (2026-10-08, `a042dc65`) — one new live key, approved as written:**
`agent.refConsentRule` · "Weka alama kwenye kisanduku kuthibitisha kwamba wadhamini wote wawili wamekubali kutajwa." —
shown, in the toast and on the box, when the consent box was left empty. *Weka alama kwenye kisanduku* is "tick the box"
(*kisanduku*, class 7, a small box); *kuthibitisha kwamba* "to confirm that"; *wadhamini wote wawili wamekubali* repeats
the box's own label (`refConsent`: "Wadhamini wote wawili … wamekubali …"), so the line names what the box says;
*kutajwa*, the passive of *kutaja*, "to be named". The step's other refusals now show the two rules the boxes already
carry as their titles (`refNameRule`, `refContactRule`), live words unchanged. A new sentence, not a correction, so it
shipped with its fix rather than with S12. Chinese: "请勾选此框，确认两位推荐人均同意被提名。" — 勾选 for ticking a box, and the label's own 两位推荐人 and 提名.

**6. S7 dictionary keys (2026-10-12, S7 WP4; journey.*, not shown to anyone until S15) — approved as written:**
- The deck's words are binding and were read, not re-worded; each agrees: *tukio* (class 5) takes *lenye* in
  `howStep1Body`; *dau* (class 5) takes *lako* in `howStep2Body` and `howExampleBody`; *soko likifungwa* (class 5, "when
  the market is closed") and *kamisheni … imeshatolewa* (class 9, perfect passive, "has already been deducted") in
  `estimateNote`.
- The canvas words keep review 3's approval; `cardThin`'s figure is now the `{mult}` placeholder, and
  `homeEmptyCatTitle`'s category is `{cat}` ("Kripto" was the drawn example).
- The S7 drafts: `cardBeFirst` · "Kuwa wa kwanza" — imperative of *kuwa* with *wa kwanza* (class 1, "the first
  [person]"), short enough for a pick's second line; `cardResultLabel` · "Matokeo" — the noun the settled card already
  uses as its caption; `homeChipsAria` · "Aina za maswali" — *aina* in the plural (class 10) takes *za*;
  `homeEmptyTitle` · "Hakuna maswali wazi kwa sasa" — the approved category line without its category;
  `homeQueryLine` · "Unatafuta: “{q}”" — present tense, second person, as the product addresses the player;
  `homeQueryNone` · "Hakuna swali linalolingana na “{q}”" — *swali* (class 5) takes the relative *-li-* in
  *linalolingana*; `howStepsAria` · "Hatua" — one form for one step and for many (class 9/10); `hubSearchPlaceholder`
  · "Tafuta swali" — an imperative with its object, like the hub's other doors ("Weka mipaka", "Alika").
- Chinese: formal 您 wherever the player is addressed (`howStep2Body`, `howStep3Body`, `howExampleBody`), 投注 for a bet,
  and full-width punctuation around `{q}`; `cardBeFirst` · "抢先下注" ("bet first") is the action the empty side invites.

**7. The live loss-limit refusal (2026-10-12; Ali's ruling, by question: "fix it now", not with S12) — approved:**
`error.failLossLimitDaily` · "Umefikia kikomo cha hasara cha siku ulichojiwekea. Kinahesabu saa 24 zilizopita — unaweza
kukiangalia kwenye Uchezaji salama." — *kikomo* (class 7) takes *ki-* in *kinahesabu* ("it counts"); *saa 24 zilizopita*
is "the past 24 hours", *saa* in the plural (class 10) with *zilizopita*. It replaces "Kitaanza upya kesho" ("it starts
again tomorrow"), which was untrue at any hour: the gate sums the last 24 hours (responsible-gambling.ts). The page keeps
its classic name, *Uchezaji salama*. English "It counts the last 24 hours"; Chinese "该上限按过去 24 小时计算" as its own
sentence — the same clause S8's `journey.sheetLossBlock` will use, so the classic and journey refusals say one truth.
⟶ S8 WP4 (2026-10-13, S8-PLAN A5 item 2): there is no `journey.sheetLossBlock` — the sheet's loss block reads
`error.failLossLimitDaily` itself, so the classic and journey refusals are one sentence, not two copies of it.

**8. S8 dictionary keys (2026-10-13, S8 WP4; journey.*, not shown to anyone until S15) — independently reviewed and
signed by Codex, the AI reviewer, under Ali's existing delegation of the Swahili-speaker role (2026-10-02, quoted in
this section's heading).** This is the reviewer's sign-off, not a human or owner signature. All 59 new keys in each
language were read against the deck's binding words, the approved canvas words, review 2 and S8-PLAN's amendments;
the S8 drafts below are approved with the payment-scope correction recorded here. The strings stay in the `journey`
namespace that no player sees before the S15 flip.

**Correction found by the independent review:** `sheetRailsPaused` formerly said all deposits and every payment
method were unavailable. `viewerFacts` reads only `MOBILE_MONEY_METHODS` after the deposit kill switches, and S8-PLAN
Open point 36 leaves Card to the deposit screen's link (S9). All four mobile-money methods can be paused while Card
still works. Both sentences now name mobile-money deposits and methods in en, sw and zh; the dictionary and the S8
tables in VODACOM-PLAN, this audit and S8-PLAN agree. No gate or payment availability changed. Swahili *kwa simu*
qualifies both *kuweka pesa* and *njia zote za malipo*; Chinese *手机钱包* names the same phone-wallet scope. No other
new key needed correction: amounts, multiples and rates remain placeholders; loss-room words say *kwa sasa*, never a
calendar-day reset; uncertain placing lines make no claim that money was or was not taken; no helpline or literal side
word was introduced.
- The deck's words (VODACOM-PLAN §3) are binding and were read, not re-worded: *dau lako* (class 5) in `stakeLabel` and
  `estimatePill`; *salio halitoshi* (class 5, negative of *-tosha*) in `lowTitle`; *Weka dau la {amount} badala yake*
  (class 5 *la*) in `lowBetInstead`.
- The canvas words keep review 3's approval; each drawn figure is now a placeholder (`{amount}`, `{min}`, `{left}`,
  `{cap}`, `{pct}`, `{date}`). The loss room's "leo" is not built: see `lowLossRoom` below.
- Review 2's corrections, as journey copies, keep its approval. To confirm: `sheetHedgeBody` and `sheetHedgeBothBody`
  say "swali hili" (class 5 *hili*) where the corrected classic sentences say "soko hili" — SJ-19, "Maswali" replaces
  "Masoko", as `hedgeAddBody`'s correction already does; `sheetNotTaking` and `sheetBonusWager` below follow the same
  rule (S8-PLAN A20 items 2 and 3).
- One name for the limits page (A20 item 7), confirmed: sentences name the page by its title, "Uchezaji salama", as
  `error.failLossLimitDaily` (review 7) and `sheetDepositLimit` do; the button keeps its action, "Weka mipaka"
  (`rg.setLimits`).
- The S8 drafts, now approved, each with its three languages and a one-line reason:
- `journey.sheetRailsPaused` · sw "Kuweka pesa kwa simu hakupatikani kwa sasa. Njia zote za malipo kwa simu zimesimama kwa muda — jaribu tena baadaye." · en "Mobile-money deposits are unavailable right now. Every mobile-money method is paused for a while — try again later." · zh "目前无法通过手机钱包充值。所有手机钱包支付方式暂停中——请稍后再试。" — *kuweka pesa* (class 15) takes *haku-* in *hakupatikani*; *njia zote* (class 10) takes *zimesimama*.
- `journey.sheetDepositMax` · sw "Kiwango cha juu cha kuweka pesa mara moja ni {max}." · en "The most you can deposit at once is {max}." · zh "单笔充值上限为 {max}。" — *kiwango* (class 7) takes *cha* twice, in `sheetAboveMax`'s shape; *mara moja* "at once".
- `journey.sheetPlacing` · sw "Inaweka dau…" · en "Placing your bet…" · zh "正在投注…" — *inaweka* (impersonal present) takes its object *dau*, so the frame says what is being placed.
- `journey.sheetPlacingSlow` · sw "Bado tunaweka dau lako — inachukua muda kidogo." · en "Still placing your bet — this is taking a moment." · zh "仍在为您投注——需要一点时间。" — *bado tunaweka* ("we are still placing") with *dau lako* (class 5); *inachukua muda kidogo* ("it is taking a little time") makes no money claim.
- `journey.retryCta` · sw "Jaribu tena · {amount}" · en "Try again · {amount}" · zh "重试 · {amount}" — the live imperative *Jaribu tena* with the same figure the CTA carries, so a retry names the same bet.
- `journey.sheetNotTaking` · sw "Swali hili halipokei dau kwa sasa." · en "This question isn’t taking bets right now." · zh "此问题目前不接受投注。" — *swali hili* (class 5) takes the negative *ha-li-pokei*; the classic "Soko hili" follows SJ-19.
- `journey.sheetBonusWager` · sw "Dau hili halitahesabiwa kwenye bonasi yako. Tayari una fedha upande wa pili wa swali hili, na upande mmoja tu ndio unaohesabiwa kwenye {remaining} unayohitaji kuweka kabla ya bonasi yako kutolewa." · en "This bet won’t count toward your bonus. You already have money on the other side of this question, and only one side counts toward the {remaining} you still need to bet before your bonus can be withdrawn." · zh "此注不计入您的奖金要求。您在此问题的另一方已有资金，仅一方计入您提取奖金前仍需投注的 {remaining}。" — the classic sentence word for word but *swali hili* for *soko hili*; *upande wa pili wa swali hili* (*upande*, class 11, takes *wa*).
- `journey.estimateUpdatedLive` · sw "Makadirio yamesasishwa: ≈ {amount}, ≈{mult}× dau lako" · en "Estimate updated: ≈ {amount}, ≈{mult}× your bet" · zh "预估已更新：≈ {amount}，≈{mult}× 您的投注" — the approved "Makadirio yamesasishwa" (class 6 *ya-*) with the board's "≈ {amount}" and the pill's words.
- `journey.estimateNoteCompact` · sw "Makadirio · kamisheni ya {pct}% imeshatolewa." · en "Estimate · our {pct}% commission is already deducted." · zh "预估 · 已扣除 {pct}% 佣金。" — `estimateNote`'s *kamisheni … imeshatolewa* (class 9, perfect passive), shortened for a raised keyboard.
- `journey.multOnly` · sw "≈{mult}×" · en "≈{mult}×" · zh "≈{mult}×" — a figure with no words; nothing to translate.
- `journey.lowBetInsteadEstimate` · sw "Ukishinda ≈ {amount} · ≈{mult}×" · en "If you win ≈ {amount} · ≈{mult}×" · zh "若赢 ≈ {amount} · ≈{mult}×" — `estimateCompact`'s words with the bare multiple after a middle dot.
- `journey.lowLossTitle` · sw "Kikomo cha hasara" · en "Loss limit" · zh "亏损上限" — the noun phrase of the live title "Kikomo cha hasara cha siku kimefikiwa" (*kikomo*, class 7, *cha*).
- `journey.lowLossRoom` · sw "Kikomo chako cha hasara kinaruhusu dau la hadi {amount} kwa sasa." · en "Your loss limit allows a bet of up to {amount} right now." · zh "您的亏损上限目前最多允许投注 {amount}。" — *kikomo chako* (class 7) takes *ki-* in *kinaruhusu*; *dau la hadi {amount}* (class 5) "a bet of up to"; *kwa sasa* replaces *leo*, because the window is a rolling 24 hours (A5).
- `journey.lowPendingWaitBody` · sw "Inaweza kuchukua hadi dakika 30 — usianzishe malipo mengine." · en "It can take up to 30 minutes — don’t start another payment." · zh "最长可能需要 30 分钟——请勿发起另一笔付款。" — *inaweza kuchukua* impersonal; *usianzishe* the negative subjunctive "do not start"; *malipo mengine* (class 6).
- `journey.lowPendingLateTitle` · sw "Malipo bado hayajathibitishwa" · en "Payment not confirmed yet" · zh "付款尚未确认" — review 3's approved title, unchanged; *malipo* (class 6) takes *ya-* in *hayajathibitishwa*.
- `journey.lowPendingLateBody` · sw "Imepita dakika 30. Usianzishe malipo mengine — pesa zikikatwa, zitaingia kwenye salio lako zikithibitishwa." · en "It’s been 30 minutes. Don’t start another payment — if money was taken, it will reach your balance once confirmed." · zh "已超过 30 分钟。请勿发起另一笔付款——如已扣款，确认后将计入您的余额。" — review 3's approved sentence, unchanged; *pesa* (class 10) takes *zi-* in *zikikatwa*, *zitaingia*, *zikithibitishwa*.
- `journey.ticketsHere` · sw "Tiketi zako" · en "Your tickets" · zh "您的注单" — *tiketi* (class 10) takes *zako*, as `journey.tabTickets` "Tiketi zangu" does.
- Chinese: formal 您 wherever the player is addressed, 充值 for a deposit, 投注 for a bet, 注单 for a ticket (as S6's
  Tiketi zangu), and full-width punctuation between Chinese clauses.
**9. S11's words (2026-10-14, S11 WP3; journey.*, the chat's offline journey words, the privacy line, the parked legal
texts and the tagline) — independently reviewed and signed by Claude, the AI reviewer, under Ali's existing delegation of
the Swahili-speaker role (2026-10-02, quoted in this section's heading).** This is the reviewer's sign-off, not a human or
owner signature. 54 strings were read against the deck's binding words, the screen labels they name (`footer.setLimits`,
`journey.withdrawAction`, `journey.tabAccount`, `journey.tabTickets`, `journey.sellFreeCta`, `journey.depositAction`,
`journey.howToTitle`, `profile.kycIdentityVerification`), this audit's rules and S11-PLAN: 42 approved as drafted and 12
corrected. The corrections are applied in the dictionary, `send-message.ts`, the privacy page and the parked texts, and
S11-PLAN's tables take them:
- `journey.faq2a` sw — *hasa kama* and *kamwe* restore the English's "exactly" and "never", two money promises the draft
  dropped. And in all three languages the button multiple is qualified "where it can be worked out" (*pale yanapoweza
  kukadiriwa* · 在可以估算时): the card prints a multiple only on its priced faces (journey-card.tsx `pickWords`).
- `journey.faq2a` zh — 奖池 for 资金池: the product's Chinese word for the pool (faq1a beside it, howStep3Body, estimateNote).
- `journey.faq3a` sw — *Bonyeza* for *Gusa*: the journey's tap word (review 3's "Bonyeza Juu au Chini", howStep2Title).
- `journey.chatStarterHowTo` sw — "Ninawezaje kucheza?": a chip puts the player's own question as *Ninawezaje …?*, and
  "Jinsi ya kucheza?" is the guide's title with a question mark. The chat's How-to intent matches *kucheza*.
- `journey.faq5a` (en, sw, zh) — the loss limit named beside the deposit and time limits: the limits page offers it
  (`rg.dailyLoss`), and the at-risk answer names every door it has.
- The chat's identity step 1 and invites (sw) — *Nenda kwenye*: review 3's rule, *kwenda* to a place takes *kwenye*.
- The chat's zh hand-off — 进一步协助 for 人工协助: the chat never says "human" (`send-message.ts`'s own rule).
- The privacy line (sw) — *ufunguke wenyewe* for *ujifungue wenyewe*: *kujifungua* is "to give birth"; "opens by itself"
  is the stative *kufunguka* (*mwongozo*, class 3).
- Rules §4's new paragraph — sw *kutokana na mabwawa ya mwisho* (*kutoka kwa* takes a person); zh 奖池 (the page's word).
- Terms §4's estimate paragraph (sw) — *Vyote viwili si bei (odds) za uhakika* for *Hivyo si …*: a sentence-initial
  *Hivyo* reads "therefore"; *vyote viwili* (class 8) agrees with the next clause's *vyote*.
- Terms §4 (sw) — "Kama madau yote yapo upande mmoja" for "… yako …": after *madau yote*, *yako* also reads "your", which
  would misstate a money rule; *yapo* is the Rules' own word.
- The tagline — sw "Chagua. Ona unachoweza kushinda. Cheza." is signed over SJ-20's "Ona unachoshinda": *unachoshinda*
  ("what you are winning") promises a result before there is one; an estimate is what you *can* win, How-to step 2's own
  words. zh "选择。看看您能赢多少。开始玩。" approved (您, full-width stops; it echoes the guide's 选择问题 and 您可赢取).
Checked clean: no NDIYO; no class-10 "dau zote"; no typed figure, rate, ×, % or TZS (placeholders and ≈ only); no
helpline; Chinese 您, 充值, 投注, 注单 and full-width punctuation; the journey says swali/maswali, the legal texts keep their
defined soko/market. Noted, not changed (outside S11's strings): the deposit and payout chat intents answer a Swahili
question in English, and the unchanged paragraphs of Terms §4 type "13%" and "5 minutes".

**10. S10 dictionary key (2026-10-15, S10 WP2; journey.*, not shown to anyone until S15) — reviewed and signed by Claude,
the AI reviewer, under Ali's existing delegation of the Swahili-speaker role (2026-10-02, quoted in this section's
heading).** This is the reviewer's sign-off, not a human or owner signature. (Review 9 is S11's, claimed on its own branch.)
- `journey.sheetSignUp` · sw "Jisajili uweke dau" · en "Sign up to place your bet" · zh "注册以投注" — review 3's approved
  canvas word, unchanged: *jisajili* (the reflexive imperative "register yourself", the live `common.signUp`'s own verb),
  then the subjunctive of purpose *uweke dau* ("so that you place a bet"; *dau* as in `stakeLabel`'s *dau lako*) — after
  an imperative the purpose needs no *ili*. The English says purpose ("to place"), never that signing up places the bet;
  the Chinese marks purpose with 以 and uses 投注 as every S8 key does. ⛔ Not 注册并投注 ("sign up and bet"): it reads as if
  signing up placed the bet, which nothing does — the one explicit tap on the signed-in sheet does (DESIGN_AUTHORITY §C).

**11. Review 2's defects where review 2 did not look (S12 WP3 step 3, 2026-10-14) — DRAFTED FOR SIGN-OFF, NOT SIGNED.**
Built on `codex/vodacom-s12-w` in their own commit, so the reviewer can sign this review or drop the commit whole. The
same three defects review 2 approved corrections for — "Lipo" for the payout, "dau" closing where the choosing closes,
and class-10 agreement on *dau* — plus review 2's typo, each where its list did not reach. Swahili only; en and zh
unchanged. Each line: key · today → drafted · why.
- `dialog.payoutLabel` · "Lipo" → "Malipo" · `common.payout2`'s approved correction, on the dial's estimate row and the
  position card (*malipo*, class 6, "the payout"; "Lipo" reads "it is there").
- `toast.payoutAtResolution` · "Lipo litahesabiwa utatuzi unapofanyika." → "Malipo yatahesabiwa utatuzi unapofanyika." ·
  the same noun; *malipo* (class 6) takes *ya-* in *yatahesabiwa*.
- `dialog.poolSharePayout` · "…kitawekwa dau litakapofungwa." → "…kitawekwa uchaguzi utakapofungwa." · `payoutCalcBody`'s
  approved correction: the bet does not close, the choosing does (*uchaguzi*, class 11, *utakapofungwa*).
- `market.payoutAtClose` · "Dau likifungwa" → "Uchaguzi ukifungwa" · the same, as the position card's caption (en "When
  betting closes").
- `market.hedgeBothBody`'s second clause · "kwa hiyo dau zako zote mbili haziwezi kurudi zote" → "kwa hiyo madau yako yote
  mawili hayawezi kurudi yote" · review 2's class-6 plural through the whole clause (*madau yako yote mawili hayawezi*,
  and *kurudi yote*, "come back in full", agreeing with it).
- `primer.card3Body`'s closing sentence · "Dau likifungwa tutakuambia kiasi kamili utakachopata." → "Uchaguzi ukifungwa
  tutakuambia kiasi kamili utakachopata." · as `market.payoutAtClose` (en "When betting closes we tell you…").
- `error.walletSafe` · "hayajaaathiriwa" → "hayajaathiriwa" · review 2's typo, which `error.positionsSafe` shipped with.
