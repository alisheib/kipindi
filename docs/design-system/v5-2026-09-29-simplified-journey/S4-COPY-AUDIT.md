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
- Placing "Inaweka…". Receipt: eyebrow "Dau lipo"; title "{side} · TZS {stake}"; "Tiketi"; "Dau"; "Lipo" = "Wakati wa utatuzi"; "Bahati njema."; buttons keepPredicting "Endelea kutabiri", viewPositions "Tazama nafasi"; "Endelea kucheza" exists (udRcKeepPlaying); "Tiketi zangu" NO STRING (plan).
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

## Akaunti hub (signed in): Pochi · Toa (Toa pesa NO STRING; "Toa"/"Toa fedha") · Matokeo · Mubashara · Jedwali la Washindi · Alika marafiki · Pendekeza na upate zawadi / Kupendekeza ·
  Wasifu · Thibitisha ID (sub "Kitambulisho · picha ya uso · ukaguzi") · Weka mipaka / Vikomo ("Mipaka · Kujitenga") · Uthibitisho wa utatuzi · Msaada ("Maswali · Simu · Barua pepe") · Arifa · Lugha ·
  Nafasi ya kadi (Ndogo/Kubwa; "Kwa simu tu. Hakuna kinachofichwa.") · Sindano (hard-coded) · Tafuta · Kuwa wakala / Dashibodi ya wakala · Konsoli ya wafanyakazi ("Staff · Internal") · Toka
  (confirm: "Kutoka kwenye akaunti" / "Utatolewa kwenye akaunti yako kwenye kifaa hiki." / "Ndio, toka" / "Baki ukiwa umeingia"). Title "Akaunti" (profile.account).
- Guest: Ingia/Jisajili, Lugha, Matokeo, Mubashara, Jedwali la Washindi, Uadilifu/"Uthibitisho wa utatuzi", Msaada, Weka mipaka/Pumzika/Jizuie, Faragha: Notisi ya faragha · Sera ya AML / KYC · Masharti ya huduma · RTP ya mchezo na sheria.

## Tiketi zangu (positions): H1 "Utabiri wako"; sub "Kila soko uliloweka — tofauti na raundi zako za Juu na Chini."; lenses Zote/Hai/Imekamilika/Umeshinda/Umeshindwa/Imebatilishwa/Imetolewa.
- Cash-out: "Toka bila gharama" m:ss · "Hakuna ada"; "TZS {n} pesa yote"; "Uza sasa" "TZS {n} −{fee} ada"; "Kuuza kumefungwa".
- Dates: "Uchaguzi unafungwa 11 Jun, 14:30" (formatDeadline en-GB: ENGLISH month names even in sw); "Uchaguzi umefungwa"; "Imefunguliwa 11 Jun 2026, 14:30".
- Stats: Dau · Lipo · "Upande wako ukishinda" · "Dau likifungwa" · "Mwisho"; chips "Inasubiri" / "Imekamilika · Ushindi" / "Imekamilika · Hasara".
- Empty: "Bado huna utabiri hai" (+ body with banned "dial/imani"), "Tazama masoko →", "Hakuna yako inayoendelea", "Hakuna yako iliyokamilika bado". Guest sheet "Ingia uone tiketi zako" NO STRING.

## Market page: "Chanzo"; "Kigezo cha utatuzi"; KPI "Kiasi" (volume), "Watabiri", "Inaisha"; chart "Uwezekano wa NDIYO kwa muda" (misspelt); countdowns "Uchaguzi unafungwa baada ya" / "Matokeo baada ya"; units Siku/Saa/Dak/Sek;
  holder block "Nafasi zako"; row status WAZI/UMESHINDA/UMEPOTEZA/BATILI/UMETOA; "Imefunguliwa"; SellButton as above.

## Juu/Chini: "Kiasi"; chips "1K"; "Maalum"; Juu/Chini; "Gusa Juu au Chini kuweka dau"; low balance inline "Salio halitoshi kwa dau hili." + link "Weka pesa" (?from=low-balance);
  udNobodyBacked "Hakuna aliyeweka dau {side} bado — kama hali hii haitabadilika, dau lako litarudi."
