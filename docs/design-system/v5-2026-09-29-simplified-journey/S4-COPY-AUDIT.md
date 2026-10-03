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
  hidden (legacy capped) → no figure (describeFeeModel is an ENGLISH admin string "capped 13%/33.33%" — not player copy); overCap → "Shinda zaidi ya 100× dau".
- Short title max: sw/en 56 code points, zh 28.

## Home
- Chips order today: Zote, Michezo, Uchumi, Hali ya hewa, Kripto, Utamaduni, Teknolojia, Nyingine (SJ-7 wants Michezo · Hali ya hewa · Uchumi first).
- Empty: filter miss "Hakuna soko linalolingana na vichujio hivi" / "Hakuna lililo ubaoni linalokidhi vyote kwa pamoja. Panua kimoja:" + "Mada zote";
  none at all "Hakuna masoko kwa sasa" / "Masoko yatatokea hapa opereta watakapoyachapisha. Rudi baadaye." No per-category empty message.

## Bet sheet
- Bounds: failStakeBelowMin "Dau la chini kabisa ni {min}. Weka {min} au zaidi kisha jaribu tena." · failStakeAboveMax "Kiwango cha juu kwa dau moja ni {max}. Unaweza kuweka zaidi ya dau moja kwenye soko hili." · dial chip "Chini 1,000"/"Juu …".
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
- Stake bounds: PLATFORM_MIN_STAKE 1,000, MAX 1,000,000 (per-market via config).

## Low balance variants (shortfallPlan states: pending, deposit_limit, sof_required, wallet_held, loss_limit, belowDepositMin, rails_paused) — NO sheet strings yet.
- Pending: depositStarted "Amana imeanza"; returnPendingWarnTitle "Tafadhali usilipe tena".
- errDepositLimit "Amana hii ingepita kikomo cha amana ulichojiwekea. Unaweza kukagua vikomo vyako chini ya Uchezaji Salama."
- errSofRequired "Amana hii inahitaji tamko la chanzo cha fedha lililokubaliwa na timu yetu. Jaza tamko kutoka kwenye wasifu wako; utaweza kuweka amana hii baada ya kukubaliwa."
- Frozen: errWalletFrozen "Pochi yako imegandishwa. Wasiliana na msaada ili kutatua."; kycGate.frozenCta "Wasiliana na msaada".
- 500 minimum note NO STRING. DEPOSIT_MIN 500, MAX 2,000,000. Deposit quick ladder 1,000/5,000/10,000/25,000/50,000/100,000 (page shows "1K"…).

## Deposit
- Email gate today is LINK-based: verifyGateTitle "Thibitisha barua pepe yako ili kuweka fedha"; verifyGateBody "Tumekutumia kiungo cha uthibitisho. Kifungue, kisha rudi hapa — hii ni hatua ya mara moja kabla ya amana yako ya kwanza."
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

**Found 2026-10-03 by Claude as Ali's Swahili reviewer — the same error as `failWalletFrozen`, twelve more times.** The
panel ruled *dau* class 5/6 (singular *dau lako / limefungwa*, plural *madau ya / yamefungwa*); these live strings give
it class-10 agreement (*dau zote / zinafungwa / zako*). *Madau* is the plural Tanzanian betting copy already uses. Same
rule as above: they ship with S12, never earlier.
- `udNoHistory` · "Bado hakuna dau za Juu na Chini" → "Bado hakuna madau ya Juu na Chini".
- `udHistoryBody` · "…tofauti na dau zako za muda mrefu." → "…tofauti na madau yako ya muda mrefu."
- `udRcBetsClose` · "Dau zinafungwa" → "Madau yanafungwa".
- `udEstimateNote` · "Dau zikifungwa, inakuwa malipo yako kamili." → "Madau yakifungwa, inakuwa malipo yako kamili."
- `udNobodyBackedEither` · "…wakati dau zinafungwa, kila dau litarudi." → "…wakati madau yanafungwa, kila dau litarudi."
- `resVoidRefund` · "Dau zote zilirejeshwa kikamilifu — hakuna ada iliyokatwa." → "Madau yote yalirejeshwa kikamilifu — hakuna
  ada iliyokatwa."
- `noVoidedSettlementsBody` · "…iwapo dau zitarudishwa." → "…iwapo madau yatarudishwa."
- `hedgeBothBody` and `hedgeOppositeBody` · "Dau zote mbili zinabaki na kila moja hulipwa peke yake" → "Madau yote mawili
  yanabaki na kila moja hulipwa peke yake".
- `card3Body` · "dau za washindi zinarudishwa zote na haziguswi kamwe" → "madau ya washindi yanarudishwa yote na hayaguswi
  kamwe".
- `faq1a` and `faq1aLoser` · "Dau za kila mchezaji kwenye soko moja zinajiunga bwawa moja" → "Madau ya kila mchezaji
  kwenye soko moja yanaungana kuwa bwawa moja"; `faq1aLoser` also "kutoka dau za upande ulioshindwa" → "kutoka madau ya
  upande ulioshindwa".

- `failSessionLimit` · "kipindi hiki kimefika … rudi baadaye na kitaanza upya" → "kipindi hiki kimefikia kikomo hicho … rudi baadaye uanze kipindi kipya".
- `failRateLimited` · "Hilo lilikuwa haraka." → "Umejaribu haraka mno."
- `failLossLimitDaily` · "Kitaanza upya kesho — … kwenye Uchezaji salama" → "Kitaanza upya kesho saa 00:00 — … kwenye Weka mipaka".
- `youAlreadyHold` · "Tayari unashikilia NDIO hapa" → "Tayari una dau la NDIO hapa"; `hedgeAddBody` "kwenye soko hili" → "kwenye swali hili".
- `failSelectionClosed` / "Soko limefungwa" → "Swali hili limefungwa" / "Muda wa kuchagua umekwisha. Sasa tunasubiri matokeo."
- Cash-out: "Toka bila gharama · Hakuna ada" → "Uza bila ada hadi {saa}"; "TZS {n} pesa yote" → "Rudishiwa TZS {n} kamili".
- `errDepositLimit` / `errSofRequired` · "Amana hii…" → the C11 sentences (the deposit has not happened yet; SJ-19 "kuweka pesa").
- `verifyGateTitle` · "ili kuweka fedha" → "ili uweke pesa"; `depositStarted` "Amana imeanza" → "Malipo yameanza" (journey screens).
- Payout delayed body · "— inaweza tu kutofika mara moja." → "— pesa zinaweza tu kuchelewa kufika."
- Market chart "Uwezekano wa NDIYO kwa muda" → "NDIO"; market KPI "Kiasi" (pool) → "Bwawa"; "Inaisha {date}" → "Matokeo {date}".
- Akaunti · "Maswali · Simu · Barua pepe" → "Maswali ya kawaida · Simu · Barua pepe" (no number: VODACOM-PLAN §0h point 10 reversed the panel here — 0800 11 0011 is the national helpline, not our desk, and keeps its own labelled row); "Nafasi ya kadi" → "Ukubwa wa kadi"; "Mipaka · Kujitenga" → "Mipaka · Pumzika · Jizuie".
- Juu/Chini · "Kiasi" → "Dau lako"; "Gusa Juu au Chini" → "Bonyeza Juu au Chini".
- Chinese How-to · side words quoted 「是」「否」 in running text; "赢家平分奖池" (split equally — false) → "赢家按投注比例分享奖池".

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
- `profile.helpSupportSub` (en, zh) · "FAQ · Helpline · Email" / "常见问题 · 热线 · 邮件" names our help desk a helpline — §0h point 10's mix-up; the journey copy says "Phone" / "电话".
- `profile.inviteFriendsSub` (zh) · "分享你的链接 · 查看谁加入" uses the informal 你 → 您.

**Added at S6 WP9 (2026-10-03)** — Tiketi zangu's own copies of classic lines that say 持仓 in Chinese, and its
strip's name in every language (VODACOM-PLAN §0h point 27):
- `journey.ticketsEmptySettled` · "Hakuna yako iliyokamilika bado" · of `positions.emptySettledLens`: en and sw verbatim (already reviewed); zh "您还没有已结算的注单" (注单 for 持仓, approved).
- `journey.ticketsEmptyWon` · "Hakuna yako iliyoshinda bado" · of `positions.emptyWon`; zh "您还没有获胜的注单".
- `journey.ticketsEmptyLost` · "Hakuna yako iliyopotea" · of `positions.emptyLost`; zh "您没有失利的注单".
- `journey.ticketsEmptyRefunded` · "Hakuna yako iliyorudishwa" · of `positions.emptyRefunded`; zh "您没有被退还的注单".
- `journey.ticketsFilterAria` · "Chuja tiketi", unchanged · en "Status" → "Filter tickets" and zh "状态" → "筛选注单" (approved): the strip's name now says what it does in every language, as the Swahili always did.

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
00:00" keeps the platform's 24-hour digital time (the product never uses Swahili clock reckoning); and the classic
`error.positionsSafe` typo "hayajaaathiriwa" (three a's) is fixed in the same S12 commit.

**3. S4 canvas drafts that S7–S11 will turn into keys — approved, with two corrections the build must use:**
- Juu/Chini round closed: "Pesa zako zimeingia — TZS 5,000 ~~iko~~ **ziko** kwenye salio lako." — *pesa* takes class 10
  agreement in the same sentence ("zimeingia"), so the figure that stands for it does too.
- Its button: "Nenda **kwenye** raundi inayofuata" — *kwenda* to a place needs *kwenye*.
- Approved as drawn: "Upande mdogo, ona makadirio"; "Faida ndogo · ≈1.0×"; "Kiasi cha chini cha kuweka ni TZS 500 —
  TZS 300 zitabaki kwenye salio lako."; "Malipo yako ya TZS 3,000 yanasubiri"; "Fuatilia malipo"; "Jaza tamko"; "Weka
  PIN kwenye simu yako"; "Usianzishe malipo mengine."; "Angalia hali ya malipo"; "Hakuna pesa iliyokatwa"; "Pesa zako
  zitarudishwa" and its sentence; "Malipo bado hayajathibitishwa" and its sentence; "Maswali yanayofanana"; "Weka pesa
  tena"; "Kikomo chako cha hasara kinaruhusu hadi TZS 3,000 leo."; "Jisajili uweke dau"; "Makadirio yamesasishwa"; the
  empty-side and empty-pool lines; "Kripto: hakuna maswali wazi kwa sasa"; "Maswali mapya yataonekana hapa
  yakichapishwa."; "Onyesha maswali yote"; the break notice and "Mapumziko hadi 8 Okt"; "Kamisheni ya hadi 10% ya bwawa
  lote hutolewa kabla washindi hawajalipwa."; "≈ zaidi ya 100× dau lako"; "Raundi hii imefungwa"; "Tuma msimbo";
  "Thibitisha barua pepe yako ili uweke pesa"; "Bado utapungukiwa na TZS 1,000 kwa dau lako."; "Salio lako · —".

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
