/* Maswali Millionea · design round 2 · sample data, draft strings and the two pure functions.
   Classic script (opens offline over file://). Sets window.MASWALI. Every figure is from PROMPT.txt §3. */
(function () {
  const NB = "\u00a0";
  const fmtN = (n) => Math.abs(n).toLocaleString("en-US");
  const fmt = (n) => (n < 0 ? "\u2212TZS" : "TZS") + NB + fmtN(n);
  const fmtNeg = (n) => "\u2212TZS" + NB + fmtN(n);

  /* ─── Draft strings. Final strings belong to the dictionary. sw and zh need native review. ─── */
  const STR = {
    sw: {
      productTitle: "Maswali Millionea", productLabel: "Millionea", week: "Wiki {week}", weekShort: "Wiki {week}",
      ruleWithFigure: "Jackpot TZS\u00a0{amount} · inagawanywa sawa kwa kila tiketi ya 10/10 · ada 13% wakati wa malipo",
      ruleNoFigure: "Inagawanywa sawa kwa kila tiketi ya 10/10 · ada 13% wakati wa malipo",
      jackpotDash: "Jackpot —", atLeast: "angalau TZS\u00a0{amount}", opensMonday: "Inafunguliwa Jumatatu",
      salesClose: "Mauzo yanafungwa: {when}", salesCloseShort: "Mauzo yanafungwa {when}", salesClosed: "Mauzo yamefungwa · {when}", closingSoonPill: "Inafunga karibuni · {n} Dak", closingSoonShort: "{n} Dak",
      firstEvent: "Tukio la kwanza: {when}", yourTickets: "Tiketi zako {n}/{cap}", yourTicketsThisWeek: "Tiketi zako wiki hii: {n} kati ya {cap}",
      resultsOut: "Matokeo {n} kati ya 15 yametolewa", nextEvent: "tukio linalofuata {when}",
      settledWon: "Wiki {week}: tiketi {n} zilishinda", settledRollover: "hakuna 10/10 · TZS\u00a0{amount} imeletwa mbele",
      finalWeek: "Wiki ya mwisho ya Millionea", paused: "Millionea imesimamishwa kwa muda. Tiketi zilizonunuliwa ziko salama.",
      pausedShort: "Imesimamishwa kwa muda", stoppedSunset: "Millionea imefungwa. Wiki {week} ilikuwa wiki ya mwisho; malipo ya mwisho yamekamilika.",
      cardMetaOpen: "Mauzo yanafungwa Ijumaa 18:00 · Tiketi zako {n}/10", cardMetaGuest: "Mauzo yanafungwa Ijumaa 18:00",
      cardCapFull: "Tiketi zako 10/10 · Wiki {next} inafunguliwa Jumatatu",
      // week strip
      stripSales: "Mauzo · Jumatatu – Ijumaa 18:00 EAT", stripEvents: "Matukio · Ijumaa jioni – Jumapili", stripResults: "Matokeo na malipo · Jumatatu/Jumanne",
      // ledger
      carriedIn: "Imeletwa mbele (Wiki {week})", salesThisWeek: "Mauzo wiki hii", ticketsN: "tiketi {n}", poolTotal: "Jumla ya bwawa", floor: "Dhamana ya chini",
      jackpot: "Jackpot", fee: "Ada", feeDash: "—", feeZero: "ada 0", feeAtPayout: "ada 13% wakati wa malipo", feeLine: "Ada 13%", toWinners: "Kwa washindi",
      perTicket: "÷ tiketi {n} zilizoshinda", forYourTicket: "Kwa tiketi yako", timesN: "× {n}", yourTotal: "Jumla yako", topUp: "Nyongeza ya dhamana",
      remainder: "Salio la mgawanyo", remainderNote: "halilipwi kutoka fedha za nyumba", carriedOut: "Imeletwa mbele kwenda Wiki {week}", yourNet: "Jumla yako halisi wiki hii",
      refundEach: "Kila tiketi imerejeshwa TZS\u00a01,000", winningTickets: "Tiketi zilizoshinda", paidOut: "Imelipwa", levies: "TRA 10% · GBT 5% ya ada",
      lastWeek: "Wiki iliyopita", lastWeekRow: "Wiki {week} · hakuna 10/10 · TZS\u00a0{amount} imeletwa mbele · ada 0",
      // doors and controls
      fillTicket: "Jaza tiketi · TZS\u00a01,000", followResults: "Fuatilia matokeo", continueBtn: "Endelea · TZS\u00a01,000", answer15: "Jibu maswali 15",
      cutTicket: "Kata tiketi · TZS\u00a01,000", viewTicket: "Tazama tiketi", signIn: "Ingia ili kununua", deposit: "Weka pesa", depositAmount: "Weka pesa TZS\u00a0{amount}",
      cancel: "Ghairi", cancelFree: "Kughairi bila malipo", cancelFreeUntil: "Kughairi bila malipo hadi {time}", cancelNoFee: "Ghairi bila malipo hadi {time}",
      keepTicket: "Baki na tiketi", confirmCancel: "Ghairi tiketi", seeExample: "Tazama mfano", exampleEnded: "Mfano umeisha", replay: "Rudia",
      howToPlay: "Jinsi ya kucheza", register: "Daftari la wiki", registerTitle: "Daftari la Wiki", auditChain: "Msururu wa ukaguzi",
      // slip
      slipTitle: "Jaza tiketi · Wiki {week}", reserveRule: "Akiba A1–A5 zinahesabiwa tu swali kuu likibatilishwa, kwa mpangilio",
      capRule: "Kikomo: tiketi 10 kwa wiki · hii ni ya {n}", mainOnly: "Salio kuu pekee", annexDivider: "Akiba · A1–A5 — zinahesabiwa tu swali kuu likibatilishwa, kwa mpangilio",
      mainsProgress: "Kuu {a}/10", reservesProgress: "Akiba {b}/5", source: "Chanzo", eventAt: "Tukio {when}",
      refusalIncomplete: "Tiketi haijakamilika", refusalIncompleteBody: "Maswali {n} hayajajibiwa — namba {list}.", jumpTo: "Nenda kwenye swali {n} ↓",
      picksSoFar: "Chaguo hadi sasa", price: "Bei", yes: "NDIO", no: "HAPANA",
      // confirm
      confirmTitle: "Thibitisha tiketi", fromMain: "TZS\u00a01,000 · kutoka salio kuu (TZS\u00a0{balance})", ticketNofCap: "Tiketi {n} kati ya 10 wiki hii",
      mains: "Maswali makuu", reserves: "Akiba", inFlight: "Inakatwa…",
      lowBalanceBody: "Salio kuu TZS\u00a0{balance} halitoshi kwa TZS\u00a01,000. Bonasi haihesabiwi hapa.",
      // result modal
      ticketCut: "Tiketi imekatwa", resultDetails: "Wiki {week} · TZS\u00a01,000 (salio kuu) · Ghairi bila malipo hadi {time}",
      resultDetailsNoCancel: "Wiki {week} · TZS\u00a01,000 (salio kuu)", refusedTitle: "Haikukatwa",
      // ticket
      ticketStatusOpen: "Inasubiri", ticketStatusWon: "Imekamilika · Ushindi", ticketStatusLost: "Imekamilika · Hasara", ticketStatusRefunded: "Imerudishwa", ticketStatusCancelled: "Imeghairiwa",
      lensAll: "Zote", lensOpen: "Hai", lensSettled: "Imekamilika", lensWon: "Umeshinda", statStake: "Dau", statPayout: "Malipo", statPayoutAtResult: "Matokeo yakitoka", statFinalPayout: "Malipo ya mwisho", placedAt: "Imewekwa {date}",
      weekStatusOpen: "WAZI", weekStatusClosed: "IMEFUNGWA", weekStatusCheck: "UKAGUZI", weekStatusResultsOut: "MATOKEO YANATOLEWA", weekStatusDone: "IMEKAMILIKA", weekStatusVoid: "IMEBATILISHWA",
      pick: "Chaguo", outcome: "Matokeo", stampPrefix: "MATOKEO", batili: "Batili", batiliArrow: "Batili → {r}", batiliAwaiting: "Batili · akiba itachukua nafasi yake",
      carriedFrom: "{r} → {n}", notUsed: "Haikutumika", standby: "Akiba", awaiting: "Inasubiri", matched: "Imelingana", noMatch: "Haikulingana",
      reservesLeft: "Akiba halali zilizobaki: {a} kati ya {b}", cannotWin: "Kwa matokeo yaliyotolewa hadi sasa, tiketi hii haiwezi kushinda wiki hii",
      stubSerial: "Tiketi", stubWeek: "Wiki", stubPrice: "Bei", stubBought: "Imenunuliwa", stubHash: "Seti ya maswali", stubLocked: "Imefungwa Ijumaa 18:00 EAT",
      refundedLine: "IMEREJESHWA · TZS\u00a01,000", cancelledLine: "IMEGHAIRIWA · TZS\u00a01,000 imerudi kwenye salio kuu",
      cancelModalTitle: "Tiketi imeghairiwa", cancelModalBody: "TZS\u00a01,000 imerudi kwenye salio kuu",
      cancelConfirmTitle: "Ughairi tiketi {serial}?", cancelConfirmBody: "TZS\u00a01,000 itarudi kwenye salio kuu sasa hivi. Chaguo zako zitafutwa; tiketi hii haitahesabiwa kwenye kikomo cha 10.",
      ticketsTitle: "Tiketi zangu", switchMaswali: "Maswali", switchUpDown: "Juu/Chini", switchMillionea: "Millionea", emptyTickets: "Huna tiketi ya Millionea bado.",
      emptyTicketsNext: "Wiki {week} iko wazi hadi Ijumaa 18:00.", guestTickets: "Ingia ili kuona tiketi zako.", thisWeek: "Wiki hii",
      // settlement
      awayWon: "Millionea Wiki {week}: tiketi yako imeshinda", awayMixed: "Millionea Wiki {week}: tiketi {w} imeshinda, {l} hazikushinda",
      awayLost: "Millionea Wiki {week}: tiketi zako {n} hazikushinda", awayRefunded: "Millionea Wiki {week}: wiki imebatilishwa · tiketi {n} zimerejeshwa",
      awayOpen: "Ona matokeo", awayPrefix: "Ulipokuwa mbali", awayAlso: "Matokeo {n} yamekamilika",
      wonHeading: "Umeshinda", wonEyebrow: "Millionea · Wiki {week}", wonTickets: "Tiketi {n} za 10/10", wonTicketsOne: "Tiketi 1 ya 10/10", lossHeading: "Haikushinda",
      weekLineNoWinner: "Wiki {week}: hakuna tiketi ya 10/10", weekLineWinners: "Wiki {week}: tiketi {n} zilishinda",
      finality: "Kila takwimu hapa ni ya mwisho — hakuna kinachodaiwa zaidi.", attested: "Uthibitisho wa utatuzi · {hash}",
      rolloverNotice: "Wiki {prev}: hakuna tiketi ya 10/10. TZS\u00a0{amount} imeletwa mbele kwenye Wiki {week}.",
      weekVoiding: "Wiki inabatilishwa", weekVoidingBody: "Maswali makuu 3 batili, akiba halali 2 tu. Marejesho {when}.",
      weekVoided: "Wiki imebatilishwa", weekVoidedBody: "Wiki imebatilishwa: maswali makuu 3 batili, akiba halali 2 tu. Kila tiketi imerejeshwa TZS\u00a01,000.",
      weekVoidModalTitle: "Wiki {week} imebatilishwa", weekVoidModalBody: "Tiketi zako {n} zimerejeshwa · TZS\u00a0{amount} imerudi kwenye salio kuu",
      checkWindow: "Muda wa ukaguzi hadi {when}", sunsetScore: "Alama ya juu wiki hii: 9 kati ya 10 · tiketi 2", legalLine: "Imethibitishwa kwa kanuni ya maofisa wawili · Uthibitisho wa utatuzi {hash}",
      closeMoved: "Muda wa kufunga mauzo umebadilishwa: sasa ni {when} (awali {from}). Kila tukio bado linaanza baada ya kufunga.",
      // refusals
      refCap: "Umefikia tiketi 10 za wiki hii. Wiki {next} inafunguliwa Jumatatu.",
      refClosed: "Mauzo yalifungwa Ijumaa 18:00, kabla ya tukio la kwanza. Fuatilia matokeo hapa.",
      refInsider: "Akaunti za watumishi na za nyumba haziruhusiwi kununua tiketi za Millionea.",
      refBonus: "Millionea inalipwa kwa salio kuu tu; bonasi haitumiki hapa. Salio kuu: TZS\u00a0{balance}.",
      refGuest: "Ingia ili kununua tiketi ya Millionea.", breakNote: "Wakati wa mapumziko hakuna mlango wa kununua. Tiketi zako zinabaki.",
      // how
      howOne: "Jibu maswali 15: makuu 10 na akiba 5. Tiketi ni TZS\u00a01,000, kutoka salio kuu pekee.",
      howTwo: "Akiba inahesabiwa tu swali kuu likibatilishwa — kwa mpangilio A1 → A5; akiba batili inarukwa.",
      howThree: "Tiketi yenye 10/10 inagawana jackpot sawa kwa kila tiketi; ada 13% inatolewa wakati wa malipo tu.",
      howFour: "Hakuna 10/10? Bwawa lote linaletwa mbele kwenye wiki inayofuata, bila ada.",
      exampleLabel: "Mfano", rulesTitle: "Kanuni", timelineTitle: "Ratiba ya wiki", categoriesTitle: "Aina za maswali",
      rule1: "Kikomo: tiketi 10 kwa mchezaji kwa wiki", rule2: "Malipo kutoka salio kuu pekee; bonasi haitumiki",
      rule3: "Kughairi bila malipo ndani ya dakika 5, iwapo mauzo yalikuwa na angalau dakika 5 zaidi", rule4: "Kila tukio linaanza baada ya mauzo kufungwa",
      rule5: "Muda wa ukaguzi wa saa 24 kabla ya malipo", rule6: "Watumishi na akaunti za nyumba hawawezi kununua",
      rule7: "Ikiwa Millionea itafungwa kabisa, wiki ya mwisho inatangazwa wiki moja mapema; bwawa ambalo halijashindwa linakwenda kwa tiketi zenye alama za juu",
      // register
      regHash: "Seti ya maswali", regPublished: "imechapishwa", regCols: ["#", "Aina", "Swali", "Chanzo", "Tukio", "Afisa", "Imethibitishwa", "Matokeo", "Sababu ya ubatili"],
      regLog: "Kumbukumbu", regSubRule: "Kanuni ya akiba: swali kuu batili lenye namba ndogo zaidi linachukua akiba halali ya kwanza ambayo haijatumika, A1 → A5.",
      regMap: "Ramani ya akiba", regLedger: "Leja", regStrata: "Historia", regCheck: "Muda wa ukaguzi", regNoResults: "Matokeo bado — mauzo yako wazi",
      officerRole: "Afisa wa matokeo", officerRole2: "Afisa wa mapingamizi", voidPostponed: "mechi imeahirishwa", voidAbandoned: "mechi imesitishwa",
      voidNoReading: "hakuna usomaji kutoka chanzo", voidNotPublished: "usomaji haujachapishwa", carriedForwardAgain: "Imeletwa mbele tena kwa ukamilifu",
      ticketsTimes: "tiketi × TZS\u00a01,000", logVoid: "Swali {n} batili", logCarry: "Swali {n} → {r}", logWeekVoid: "Wiki imebatilishwa",
      cat: { Michezo: "Michezo", Uchumi: "Uchumi", "Hali ya hewa": "Hali ya hewa", Kripto: "Kripto", Utamaduni: "Utamaduni", Teknolojia: "Teknolojia", Nyingine: "Nyingine" },
      // chrome words that exist already
      navMaswali: "Maswali", navUpDown: "Juu/Chini", navTickets: "Tiketi zangu", navAccount: "Akaunti", balance: "Salio", howCard: "Jinsi ya kucheza", howCardSub: "Hatua 3 · dakika 1",
      homeHeadline: "Jibu swali. NDIO au HAPANA.", chipAll: "Zote", classicMarkets: "Masoko", classicMore: "Zaidi", classicLive: "Mubashara", classicCoin: "Amana",
      positionsNotice: "Tiketi za Millionea wiki hii: {n} →", moreMenuRow: "Millionea",
      notify: {
        purchase: "Tiketi {serial} imekatwa · Wiki {week} · TZS\u00a0{amount} kutoka salio kuu.",
        cancel: "Tiketi {serial} imeghairiwa · TZS\u00a0{amount} imerudi kwenye salio kuu.",
        resultWon: "Millionea Wiki {week}: tiketi yako imeshinda. Fungua ili kuona leja.",
        resultLost: "Millionea Wiki {week}: tiketi zako {n} hazikushinda.",
        rollover: "Millionea Wiki {week}: hakuna tiketi ya 10/10. TZS\u00a0{amount} imeletwa mbele kwenye Wiki {next}.",
        weekVoid: "Millionea Wiki {week} imebatilishwa. Kila tiketi inarejeshwa TZS\u00a0{amount} {when}.",
        refund: "TZS\u00a0{amount} imerudi kwenye salio kuu · tiketi {n} za Wiki {week}."
      }
    },
    en: {
      productTitle: "Maswali Millionea", productLabel: "Millionea", week: "Week {week}", weekShort: "Wk {week}",
      ruleWithFigure: "Jackpot TZS\u00a0{amount} · shared by every 10/10 ticket · 13% fee at payout",
      ruleNoFigure: "Shared by every 10/10 ticket · 13% fee at payout",
      jackpotDash: "Jackpot —", atLeast: "at least TZS\u00a0{amount}", opensMonday: "Opens Monday",
      salesClose: "Sales close: {when}", salesCloseShort: "Sales close {when}", salesClosed: "Sales closed · {when}", closingSoonPill: "Closing soon · {n} Min", closingSoonShort: "{n} Min",
      firstEvent: "First event: {when}", yourTickets: "Your tickets {n}/{cap}", yourTicketsThisWeek: "Your tickets this week: {n} of {cap}",
      resultsOut: "{n} of 15 results in", nextEvent: "next event {when}",
      settledWon: "Week {week}: {n} tickets won", settledRollover: "no 10/10 · TZS\u00a0{amount} carried forward",
      finalWeek: "Final week of Millionea", paused: "Millionea is paused for now. Tickets already bought are safe.",
      pausedShort: "Paused for now", stoppedSunset: "Millionea has closed. Week {week} was the final week; the final payout is complete.",
      cardMetaOpen: "Sales close Friday 18:00 · Your tickets {n}/10", cardMetaGuest: "Sales close Friday 18:00",
      cardCapFull: "Your tickets 10/10 · Week {next} opens Monday",
      stripSales: "Sales · Monday – Friday 18:00 EAT", stripEvents: "Events · Friday evening – Sunday", stripResults: "Results and payout · Monday/Tuesday",
      carriedIn: "Carried in (Week {week})", salesThisWeek: "Sales this week", ticketsN: "{n} tickets", poolTotal: "Total pool", floor: "Guaranteed floor",
      jackpot: "Jackpot", fee: "Fee", feeDash: "—", feeZero: "fee 0", feeAtPayout: "13% fee at payout", feeLine: "Fee 13%", toWinners: "To winners",
      perTicket: "÷ {n} winning tickets", forYourTicket: "For your ticket", timesN: "× {n}", yourTotal: "Your total", topUp: "Floor top-up",
      remainder: "Rounding remainder", remainderNote: "never paid from house money", carriedOut: "Carried forward to Week {week}", yourNet: "Your net this week",
      refundEach: "Every ticket refunded TZS\u00a01,000", winningTickets: "Winning tickets", paidOut: "Paid", levies: "TRA 10% · GBT 5% of the fee",
      lastWeek: "Last week", lastWeekRow: "Week {week} · no 10/10 · TZS\u00a0{amount} carried forward · fee 0",
      fillTicket: "Fill a ticket · TZS\u00a01,000", followResults: "Follow the results", continueBtn: "Continue · TZS\u00a01,000", answer15: "Answer all 15",
      cutTicket: "Cut ticket · TZS\u00a01,000", viewTicket: "View ticket", signIn: "Sign in to buy", deposit: "Deposit", depositAmount: "Deposit TZS\u00a0{amount}",
      cancel: "Cancel", cancelFree: "Free cancel", cancelFreeUntil: "Free cancel until {time}", cancelNoFee: "Free cancel until {time}",
      keepTicket: "Keep ticket", confirmCancel: "Cancel ticket", seeExample: "See an example", exampleEnded: "Example ended", replay: "Replay",
      howToPlay: "How to play", register: "Week register", registerTitle: "Week Register", auditChain: "Audit chain",
      slipTitle: "Fill a ticket · Week {week}", reserveRule: "Reserves A1–A5 count only when a main question voids, in order",
      capRule: "Cap: 10 tickets a week · this is your {n}", mainOnly: "Main balance only", annexDivider: "Reserves · A1–A5 — count only when a main question voids, in order",
      mainsProgress: "Main {a}/10", reservesProgress: "Reserve {b}/5", source: "Source", eventAt: "Event {when}",
      refusalIncomplete: "Ticket incomplete", refusalIncompleteBody: "{n} questions unanswered — numbers {list}.", jumpTo: "Go to question {n} ↓",
      picksSoFar: "Picks so far", price: "Price", yes: "YES", no: "NO",
      confirmTitle: "Confirm ticket", fromMain: "TZS\u00a01,000 · from main balance (TZS\u00a0{balance})", ticketNofCap: "Ticket {n} of 10 this week",
      mains: "Main questions", reserves: "Reserves", inFlight: "Cutting…",
      lowBalanceBody: "Main balance TZS\u00a0{balance} is below TZS\u00a01,000. Bonus money does not count here.",
      ticketCut: "Ticket cut", resultDetails: "Week {week} · TZS\u00a01,000 (main balance) · Free cancel until {time}",
      resultDetailsNoCancel: "Week {week} · TZS\u00a01,000 (main balance)", refusedTitle: "Not cut",
      ticketStatusOpen: "Pending", ticketStatusWon: "Resolved · Win", ticketStatusLost: "Resolved · Loss", ticketStatusRefunded: "Refunded", ticketStatusCancelled: "Cancelled",
      lensAll: "All", lensOpen: "Open", lensSettled: "Settled", lensWon: "Won", statStake: "Stake", statPayout: "Payout", statPayoutAtResult: "When the result is in", statFinalPayout: "Final payout", placedAt: "Placed {date}",
      weekStatusOpen: "OPEN", weekStatusClosed: "CLOSED", weekStatusCheck: "CHECK WINDOW", weekStatusResultsOut: "RESULTS COMING IN", weekStatusDone: "SETTLED", weekStatusVoid: "VOIDED",
      pick: "Pick", outcome: "Outcome", stampPrefix: "RESULT", batili: "Void", batiliArrow: "Void → {r}", batiliAwaiting: "Void · a reserve will take its place",
      carriedFrom: "{r} → {n}", notUsed: "Not used", standby: "Reserve", awaiting: "Awaiting", matched: "Matched", noMatch: "No match",
      reservesLeft: "Valid reserves left: {a} of {b}", cannotWin: "On the results published so far, this ticket cannot win this week",
      stubSerial: "Ticket", stubWeek: "Week", stubPrice: "Price", stubBought: "Bought", stubHash: "Question set", stubLocked: "Locked Friday 18:00 EAT",
      refundedLine: "REFUNDED · TZS\u00a01,000", cancelledLine: "CANCELLED · TZS\u00a01,000 returned to main balance",
      cancelModalTitle: "Ticket cancelled", cancelModalBody: "TZS\u00a01,000 returned to main balance",
      cancelConfirmTitle: "Cancel ticket {serial}?", cancelConfirmBody: "TZS\u00a01,000 returns to your main balance now. Your picks are discarded; this ticket will not count toward the cap of 10.",
      ticketsTitle: "My tickets", switchMaswali: "Maswali", switchUpDown: "Up & Down", switchMillionea: "Millionea", emptyTickets: "No Millionea ticket yet.",
      emptyTicketsNext: "Week {week} is open until Friday 18:00.", guestTickets: "Sign in to see your tickets.", thisWeek: "This week",
      awayWon: "Millionea Week {week}: your ticket won", awayMixed: "Millionea Week {week}: {w} ticket won, {l} did not",
      awayLost: "Millionea Week {week}: your {n} tickets did not win", awayRefunded: "Millionea Week {week}: week voided · {n} tickets refunded",
      awayOpen: "See results", awayPrefix: "While you were away", awayAlso: "{n} results settled",
      wonHeading: "You won", wonEyebrow: "Millionea · Week {week}", wonTickets: "{n} tickets at 10/10", wonTicketsOne: "1 ticket at 10/10", lossHeading: "Did not win",
      weekLineNoWinner: "Week {week}: no 10/10 ticket", weekLineWinners: "Week {week}: {n} tickets won",
      finality: "Every figure here is final — nothing more is owed.", attested: "Resolution attestation · {hash}",
      rolloverNotice: "Week {prev}: no 10/10 ticket. TZS\u00a0{amount} carried forward into Week {week}.",
      weekVoiding: "Week is being voided", weekVoidingBody: "3 main questions void, only 2 valid reserves. Refunds {when}.",
      weekVoided: "Week voided", weekVoidedBody: "Week voided: 3 main questions void, only 2 valid reserves. Every ticket refunded TZS\u00a01,000.",
      weekVoidModalTitle: "Week {week} voided", weekVoidModalBody: "Your {n} tickets refunded · TZS\u00a0{amount} returned to main balance",
      checkWindow: "Check window until {when}", sunsetScore: "Highest score this week: 9 of 10 · 2 tickets", legalLine: "Attested by the two-officer rule · Resolution attestation {hash}",
      closeMoved: "The sales close has moved: it is now {when} (was {from}). Every event still starts after the close.",
      refCap: "You have reached 10 tickets this week. Week {next} opens Monday.",
      refClosed: "Sales closed Friday 18:00, before the first event. Follow the results here.",
      refInsider: "Staff and house accounts cannot buy Millionea tickets.",
      refBonus: "Millionea is paid from the main balance only; bonus money does not apply here. Main balance: TZS\u00a0{balance}.",
      refGuest: "Sign in to buy a Millionea ticket.", breakNote: "During a break there is no door to buy. Your tickets remain.",
      howOne: "Answer 15 questions: 10 main and 5 reserve. A ticket is TZS\u00a01,000, from the main balance only.",
      howTwo: "A reserve counts only when a main question voids — in order A1 → A5; a voided reserve is skipped.",
      howThree: "A 10/10 ticket shares the jackpot equally per ticket; the 13% fee is taken at payout only.",
      howFour: "No 10/10? The whole pool carries forward to next week, with no fee.",
      exampleLabel: "Example", rulesTitle: "Rules", timelineTitle: "Week timeline", categoriesTitle: "Question categories",
      rule1: "Cap: 10 tickets per player per week", rule2: "Paid from the main balance only; bonus does not apply",
      rule3: "Free cancel within 5 minutes, if sales had at least 5 more minutes to run", rule4: "Every event starts after sales close",
      rule5: "A 24-hour check window before payout", rule6: "Staff and house accounts cannot buy",
      rule7: "If Millionea is ever stopped for good, the final week is announced a week ahead; the unwon pool goes to that week's highest-scoring tickets",
      regHash: "Question set", regPublished: "published", regCols: ["#", "Category", "Question", "Source", "Event", "Officer", "Attested", "Outcome", "Void reason"],
      regLog: "Log", regSubRule: "Reserve rule: the lowest-numbered voided main takes the first unused valid reserve, A1 → A5.",
      regMap: "Reserve map", regLedger: "Ledger", regStrata: "History", regCheck: "Check window", regNoResults: "No results yet — sales are open",
      officerRole: "Results officer", officerRole2: "Disputes officer", voidPostponed: "match postponed", voidAbandoned: "match abandoned",
      voidNoReading: "no reading from source", voidNotPublished: "reading not published", carriedForwardAgain: "Carried forward again in full",
      ticketsTimes: "tickets × TZS\u00a01,000", logVoid: "Question {n} void", logCarry: "Question {n} → {r}", logWeekVoid: "Week voided",
      cat: { Michezo: "Sports", Uchumi: "Macro", "Hali ya hewa": "Weather", Kripto: "Crypto", Utamaduni: "Culture", Teknolojia: "Tech", Nyingine: "Other" },
      navMaswali: "Maswali", navUpDown: "Up & Down", navTickets: "My tickets", navAccount: "Account", balance: "Balance", howCard: "How to play", howCardSub: "3 steps · 1 minute",
      homeHeadline: "Answer a question. YES or NO.", chipAll: "All", classicMarkets: "Markets", classicMore: "More", classicLive: "Live", classicCoin: "Deposit",
      positionsNotice: "Millionea tickets this week: {n} →", moreMenuRow: "Millionea",
      notify: {
        purchase: "Ticket {serial} cut · Week {week} · TZS\u00a0{amount} from main balance.",
        cancel: "Ticket {serial} cancelled · TZS\u00a0{amount} returned to main balance.",
        resultWon: "Millionea Week {week}: your ticket won. Open to see the ledger.",
        resultLost: "Millionea Week {week}: your {n} tickets did not win.",
        rollover: "Millionea Week {week}: no 10/10 ticket. TZS\u00a0{amount} carried forward into Week {next}.",
        weekVoid: "Millionea Week {week} voided. Every ticket is refunded TZS\u00a0{amount} {when}.",
        refund: "TZS\u00a0{amount} returned to main balance · {n} tickets of Week {week}."
      }
    },
    zh: {
      productTitle: "Maswali Millionea", productLabel: "Millionea", week: "第{week}周", weekShort: "第{week}周",
      ruleWithFigure: "大奖 TZS\u00a0{amount} · 由每张 10/10 彩票平分 · 支付时收取 13% 费用",
      ruleNoFigure: "由每张 10/10 彩票平分 · 支付时收取 13% 费用",
      jackpotDash: "大奖 —", atLeast: "至少 TZS\u00a0{amount}", opensMonday: "周一开放",
      salesClose: "销售截止：{when}", salesCloseShort: "销售截止 {when}", salesClosed: "销售已截止 · {when}", closingSoonPill: "即将截止 · {n} 分", closingSoonShort: "{n} 分",
      firstEvent: "首个赛事：{when}", yourTickets: "你的彩票 {n}/{cap}", yourTicketsThisWeek: "本周你的彩票：{n}/{cap}",
      resultsOut: "15 个结果已公布 {n} 个", nextEvent: "下一赛事 {when}",
      settledWon: "第{week}周：{n} 张彩票中奖", settledRollover: "无 10/10 · TZS\u00a0{amount} 滚存至下周",
      finalWeek: "Millionea 最后一周", paused: "Millionea 暂时停售。已购彩票安全。",
      pausedShort: "暂时停售", stoppedSunset: "Millionea 已结束。第{week}周为最后一周；最终支付已完成。",
      cardMetaOpen: "周五 18:00 截止销售 · 你的彩票 {n}/10", cardMetaGuest: "周五 18:00 截止销售",
      cardCapFull: "你的彩票 10/10 · 第{next}周周一开放",
      stripSales: "销售 · 周一 – 周五 18:00 EAT", stripEvents: "赛事 · 周五晚 – 周日", stripResults: "结果与支付 · 周一/周二",
      carriedIn: "滚存（第{week}周）", salesThisWeek: "本周销售", ticketsN: "{n} 张", poolTotal: "奖池总额", floor: "保底金额",
      jackpot: "大奖", fee: "费用", feeDash: "—", feeZero: "费用 0", feeAtPayout: "支付时收取 13% 费用", feeLine: "费用 13%", toWinners: "支付给中奖者",
      perTicket: "÷ {n} 张中奖彩票", forYourTicket: "你的每张彩票", timesN: "× {n}", yourTotal: "你的总额", topUp: "保底补足",
      remainder: "分配余数", remainderNote: "不从平台资金支付", carriedOut: "滚存至第{week}周", yourNet: "本周你的净额",
      refundEach: "每张彩票退款 TZS\u00a01,000", winningTickets: "中奖彩票", paidOut: "已支付", levies: "费用的 TRA 10% · GBT 5%",
      lastWeek: "上周", lastWeekRow: "第{week}周 · 无 10/10 · TZS\u00a0{amount} 滚存 · 费用 0",
      fillTicket: "填写彩票 · TZS\u00a01,000", followResults: "查看结果", continueBtn: "继续 · TZS\u00a01,000", answer15: "回答全部 15 题",
      cutTicket: "出票 · TZS\u00a01,000", viewTicket: "查看彩票", signIn: "登录以购买", deposit: "存款", depositAmount: "存款 TZS\u00a0{amount}",
      cancel: "取消", cancelFree: "免费取消", cancelFreeUntil: "免费取消至 {time}", cancelNoFee: "免费取消至 {time}",
      keepTicket: "保留彩票", confirmCancel: "取消彩票", seeExample: "查看示例", exampleEnded: "示例已结束", replay: "重播",
      howToPlay: "玩法说明", register: "每周登记册", registerTitle: "每周登记册", auditChain: "审计链",
      slipTitle: "填写彩票 · 第{week}周", reserveRule: "备用题 A1–A5 仅在主题作废时按顺序计入",
      capRule: "上限：每周 10 张 · 这是第 {n} 张", mainOnly: "仅限主余额", annexDivider: "备用题 · A1–A5 — 仅在主题作废时按顺序计入",
      mainsProgress: "主题 {a}/10", reservesProgress: "备用 {b}/5", source: "来源", eventAt: "赛事 {when}",
      refusalIncomplete: "彩票未完成", refusalIncompleteBody: "{n} 题未作答 — 第 {list} 题。", jumpTo: "前往第 {n} 题 ↓",
      picksSoFar: "已选", price: "价格", yes: "是", no: "否",
      confirmTitle: "确认彩票", fromMain: "TZS\u00a01,000 · 从主余额扣除（TZS\u00a0{balance}）", ticketNofCap: "本周第 {n} 张（上限 10）",
      mains: "主题", reserves: "备用题", inFlight: "出票中…",
      lowBalanceBody: "主余额 TZS\u00a0{balance} 不足 TZS\u00a01,000。奖金余额在此不计。",
      ticketCut: "已出票", resultDetails: "第{week}周 · TZS\u00a01,000（主余额）· 免费取消至 {time}",
      resultDetailsNoCancel: "第{week}周 · TZS\u00a01,000（主余额）", refusedTitle: "未出票",
      ticketStatusOpen: "待定", ticketStatusWon: "已结算 · 赢", ticketStatusLost: "已结算 · 输", ticketStatusRefunded: "已退还", ticketStatusCancelled: "已取消",
      lensAll: "全部", lensOpen: "进行中", lensSettled: "已结算", lensWon: "已赢", statStake: "投注额", statPayout: "派彩", statPayoutAtResult: "结果公布后", statFinalPayout: "最终派彩", placedAt: "下注于 {date}",
      weekStatusOpen: "开放", weekStatusClosed: "已截止", weekStatusCheck: "复核期", weekStatusResultsOut: "结果公布中", weekStatusDone: "已结算", weekStatusVoid: "已作废",
      pick: "选择", outcome: "结果", stampPrefix: "结果", batili: "作废", batiliArrow: "作废 → {r}", batiliAwaiting: "作废 · 将由备用题替补",
      carriedFrom: "{r} → {n}", notUsed: "未使用", standby: "备用", awaiting: "待定", matched: "已匹配", noMatch: "未匹配",
      reservesLeft: "剩余有效备用题：{a}/{b}", cannotWin: "根据目前公布的结果，此彩票本周无法中奖",
      stubSerial: "彩票", stubWeek: "周", stubPrice: "价格", stubBought: "购买时间", stubHash: "题目集", stubLocked: "周五 18:00 EAT 锁定",
      refundedLine: "已退款 · TZS\u00a01,000", cancelledLine: "已取消 · TZS\u00a01,000 已退回主余额",
      cancelModalTitle: "彩票已取消", cancelModalBody: "TZS\u00a01,000 已退回主余额",
      cancelConfirmTitle: "取消彩票 {serial}？", cancelConfirmBody: "TZS\u00a01,000 将立即退回主余额。你的选择将被清除；此彩票不计入 10 张上限。",
      ticketsTitle: "我的彩票", switchMaswali: "Maswali", switchUpDown: "涨跌", switchMillionea: "Millionea", emptyTickets: "尚无 Millionea 彩票。",
      emptyTicketsNext: "第{week}周开放至周五 18:00。", guestTickets: "登录以查看你的彩票。", thisWeek: "本周",
      awayWon: "Millionea 第{week}周：你的彩票中奖", awayMixed: "Millionea 第{week}周：{w} 张中奖，{l} 张未中奖",
      awayLost: "Millionea 第{week}周：你的 {n} 张彩票未中奖", awayRefunded: "Millionea 第{week}周：本周作废 · {n} 张彩票已退款",
      awayOpen: "查看结果", awayPrefix: "你离开期间", awayAlso: "{n} 个结果已结算",
      wonHeading: "你中奖了", wonEyebrow: "Millionea · 第{week}周", wonTickets: "{n} 张 10/10 彩票", wonTicketsOne: "1 张 10/10 彩票", lossHeading: "未中奖",
      weekLineNoWinner: "第{week}周：无 10/10 彩票", weekLineWinners: "第{week}周：{n} 张彩票中奖",
      finality: "此处每个数字均为最终结果 — 不再有任何欠付。", attested: "结算证明 · {hash}",
      rolloverNotice: "第{prev}周：无 10/10 彩票。TZS\u00a0{amount} 滚存至第{week}周。",
      weekVoiding: "本周作废中", weekVoidingBody: "3 道主题作废，有效备用题仅 2 道。退款时间 {when}。",
      weekVoided: "本周已作废", weekVoidedBody: "本周已作废：3 道主题作废，有效备用题仅 2 道。每张彩票退款 TZS\u00a01,000。",
      weekVoidModalTitle: "第{week}周已作废", weekVoidModalBody: "你的 {n} 张彩票已退款 · TZS\u00a0{amount} 已退回主余额",
      checkWindow: "复核期至 {when}", sunsetScore: "本周最高分：10 题中 9 题 · 2 张彩票", legalLine: "经两名官员规则认证 · 结算证明 {hash}",
      closeMoved: "销售截止时间已更改：现为 {when}（原为 {from}）。所有赛事仍在截止之后开始。",
      refCap: "本周已达 10 张彩票上限。第{next}周周一开放。",
      refClosed: "销售已于周五 18:00 截止，早于首个赛事。在此查看结果。",
      refInsider: "员工账户与平台账户不能购买 Millionea 彩票。",
      refBonus: "Millionea 仅从主余额支付；奖金余额在此不适用。主余额：TZS\u00a0{balance}。",
      refGuest: "登录以购买 Millionea 彩票。", breakNote: "休息期间没有购买入口。你的彩票保留。",
      howOne: "回答 15 题：10 道主题与 5 道备用题。每张彩票 TZS\u00a01,000，仅从主余额支付。",
      howTwo: "备用题仅在主题作废时计入 — 按 A1 → A5 顺序；作废的备用题跳过。",
      howThree: "10/10 的彩票按每张平分大奖；13% 费用仅在支付时收取。",
      howFour: "没有 10/10？整个奖池滚存至下周，不收费用。",
      exampleLabel: "示例", rulesTitle: "规则", timelineTitle: "每周时间表", categoriesTitle: "题目类别",
      rule1: "上限：每位玩家每周 10 张", rule2: "仅从主余额支付；奖金不适用",
      rule3: "购买后 5 分钟内可免费取消，前提是销售尚有至少 5 分钟", rule4: "所有赛事在销售截止后开始",
      rule5: "支付前有 24 小时复核期", rule6: "员工与平台账户不能购买",
      rule7: "若 Millionea 永久停办，最后一周提前一周公布；未中奖的奖池归该周得分最高的彩票",
      regHash: "题目集", regPublished: "发布于", regCols: ["#", "类别", "题目", "来源", "赛事", "官员", "认证时间", "结果", "作废原因"],
      regLog: "日志", regSubRule: "备用规则：编号最小的作废主题取第一道未使用的有效备用题，A1 → A5。",
      regMap: "备用映射", regLedger: "账目", regStrata: "历史", regCheck: "复核期", regNoResults: "尚无结果 — 销售开放中",
      officerRole: "结果官员", officerRole2: "争议官员", voidPostponed: "比赛推迟", voidAbandoned: "比赛中止",
      voidNoReading: "来源无读数", voidNotPublished: "读数未发布", carriedForwardAgain: "全额再次滚存",
      ticketsTimes: "张 × TZS\u00a01,000", logVoid: "第 {n} 题作废", logCarry: "第 {n} 题 → {r}", logWeekVoid: "本周作废",
      cat: { Michezo: "体育", Uchumi: "宏观", "Hali ya hewa": "天气", Kripto: "加密货币", Utamaduni: "文化", Teknolojia: "科技", Nyingine: "其他" },
      navMaswali: "Maswali", navUpDown: "涨跌", navTickets: "我的彩票", navAccount: "账户", balance: "余额", howCard: "玩法说明", howCardSub: "3 步 · 1 分钟",
      homeHeadline: "回答问题。是或否。", chipAll: "全部", classicMarkets: "市场", classicMore: "更多", classicLive: "直播", classicCoin: "存款",
      positionsNotice: "本周 Millionea 彩票：{n} →", moreMenuRow: "Millionea",
      notify: {
        purchase: "彩票 {serial} 已出票 · 第{week}周 · 从主余额扣除 TZS\u00a0{amount}。",
        cancel: "彩票 {serial} 已取消 · TZS\u00a0{amount} 已退回主余额。",
        resultWon: "Millionea 第{week}周：你的彩票中奖。打开查看账目。",
        resultLost: "Millionea 第{week}周：你的 {n} 张彩票未中奖。",
        rollover: "Millionea 第{week}周：无 10/10 彩票。TZS\u00a0{amount} 滚存至第{next}周。",
        weekVoid: "Millionea 第{week}周已作废。每张彩票 {when} 退款 TZS\u00a0{amount}。",
        refund: "TZS\u00a0{amount} 已退回主余额 · 第{week}周 {n} 张彩票。"
      }
    }
  };
  const t = (loc, key, vars) => {
    let s = STR[loc] && STR[loc][key]; if (s == null) s = STR.sw[key]; if (s == null) return key;
    if (typeof s !== "string") return s;
    return s.replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] != null ? String(vars[k]) : m));
  };
  /* 2.25× stretch: a label padded with its own letters to 2.25× the English length (money and times kept whole). */
  const stretch = (loc, en, sw) => {
    const base = STR[loc] ? sw : sw; const target = Math.ceil(en.length * 2.25);
    if (base.length >= target) return base;
    const letters = base.replace(/[^A-Za-z]/g, "").toLowerCase() || "akiba"; let out = base;
    let i = 0; while (out.length < target) { out += letters[i % letters.length]; i++; } return out;
  };

  /* ─── Week 42 ─── */
  const WEEK = {
    n: 42, prev: 41, next: 43, salesOpen: "Jumatatu 19 Okt", salesCloseSw: "Ijumaa 18:00", salesCloseEn: "Friday 18:00", salesCloseZh: "周五 18:00",
    firstEventSw: "Ijumaa 19:30", firstEventEn: "Friday 19:30", firstEventZh: "周五 19:30",
    hash: "7f3a9c…e21", hashShort: "7f3a…", hashPublished: "2026-10-19 00:00", resultsFinal: "2026-10-26 10:41", checkUntilSw: "Jumanne 12:00", checkUntilEn: "Tuesday 12:00", checkUntilZh: "周二 12:00",
    checkOpen: "2026-10-26 10:41", checkClose: "2026-10-27 12:00", payout: "2026-10-27",
    liveNowSw: "Jumapili 12:00", liveNextSw: "Jumapili 16:00", liveNextEn: "Sunday 16:00", liveNextZh: "周日 16:00",
    boughtSw: "Jumatano 21 Okt 14:02", boughtEn: "Wed 21 Oct 14:02", boughtZh: "10月21日 周三 14:02", placedSw: "21 Okt, 14:02", placedEn: "21 Oct, 14:02", placedZh: "2026年10月21日 14:02", cancelUntil: "14:07", serial: "MLN-W42-004417",
    /* Owner, 2026-10-17: the player's 2nd ticket (bought Tue 20 Oct 09:41) — the second winner in the two-ticket variant, the second held ticket everywhere else. The 1st (MLN-W42-002083, Mon 19 Oct 20:15) is available if a frame ever needs a third. */
    serial2: "MLN-W42-003310", serial1: "MLN-W42-002083", placed2Sw: "20 Okt, 09:41", placed2En: "20 Oct, 09:41", placed2Zh: "2026年10月20日 09:41", placed1Sw: "19 Okt, 20:15", placed1En: "19 Oct, 20:15", placed1Zh: "2026年10月19日 20:15",
    /* Owner, 2026-10-17: the moved close — Fri 23 Oct 16:00 EAT, moved EARLIER from 18:00, announced Thu 22 Oct 10:15; the first event stays Fri 19:30. A close can never be later than Fri 19:00 (30 minutes before the first event). */
    movedCloseSw: "Ijumaa 23 Okt 16:00 EAT", movedCloseEn: "Friday 23 Oct 16:00 EAT", movedCloseZh: "10月23日 周五 16:00 EAT", movedFrom: "18:00", movedAnnouncedSw: "Alhamisi 22 Okt 10:15", latestCloseSw: "Ijumaa 19:00",
    /* Owner, 2026-10-17: Timeline D — the week void is certain at A5's attestation, Mon 26 Oct 10:24; refunds Tue 27 Oct 12:00. */
    voidCertainSw: "Jumatatu 26 Okt 10:24", refundSw: "Jumanne 27 Okt 12:00", refundEn: "Tuesday 27 Oct 12:00", refundZh: "10月27日 周二 12:00",
    /* Owner, 2026-10-17: the closing pill exists only in the last hour and counts minutes, as on Yes/No markets. The last-hour frames are drawn 48 minutes before the close. */
    lastHourMins: 48, balance: 44196, lowMain: 400, lowBonus: 5000
  };
  const CAT_GLYPH = { Michezo: "football", Uchumi: "economy", "Hali ya hewa": "weather", Kripto: "crypto", Utamaduni: "entertainment", Teknolojia: "tech", Nyingine: "catOther" };
  const Q = [
    { n: "1", cat: "Michezo", sw: "Je, Simba SC itashinda mechi yake ya Ligi Kuu Jumamosi?", en: "Will Simba SC win its Premier League match on Saturday?", start: "Jumamosi 16:00", startEn: "Sat 16:00", src: "NBC Premier League" },
    { n: "2", cat: "Kripto", sw: "Je, bei ya Bitcoin itakuwa juu ya $120,000 Jumapili saa 23:59?", en: "Will Bitcoin be above $120,000 on Sunday at 23:59?", start: "Jumapili 23:59", startEn: "Sun 23:59", src: "Coinbase BTC-USD" },
    { n: "3", cat: "Hali ya hewa", sw: "Je, mvua ya angalau mm 1 itanyesha Dar es Salaam Jumapili (kipimo cha TMA)?", en: "Will at least 1 mm of rain fall in Dar es Salaam on Sunday (TMA reading)?", start: "Jumapili 00:00", startEn: "Sun 00:00", src: "TMA" },
    { n: "4", cat: "Michezo", sw: "Je, Young Africans watafunga magoli 2 au zaidi katika mechi yao ya Jumamosi?", en: "Will Young Africans score 2 or more goals in their Saturday match?", start: "Jumamosi 19:00", startEn: "Sat 19:00", src: "NBC Premier League" },
    { n: "5", cat: "Uchumi", sw: "Je, faharasa ya DSE (DSEI) itafungua Jumatatu juu kuliko ilivyofunga Ijumaa?", en: "Will the DSE All Share Index open Monday above Friday's close?", start: "Jumatatu 10:00", startEn: "Mon 10:00", src: "DSE" },
    { n: "6", cat: "Utamaduni", sw: "Je, wimbo namba 1 kwenye chati ya Boomplay Tanzania Jumapili utakuwa wa msanii wa Tanzania?", en: "Will Sunday's No. 1 on the Boomplay Tanzania chart be by a Tanzanian artist?", start: "Jumapili 20:00", startEn: "Sun 20:00", src: "Boomplay" },
    { n: "7", cat: "Michezo", sw: "Je, mechi ya Arsenal na Chelsea ya Jumapili itaisha kwa sare?", en: "Will Sunday's Arsenal v Chelsea match end in a draw?", start: "Jumapili 18:30", startEn: "Sun 18:30", src: "Premier League" },
    { n: "8", cat: "Hali ya hewa", sw: "Je, joto la juu Arusha Jumamosi litazidi nyuzi 25°C (TMA)?", en: "Will Arusha's high on Saturday exceed 25°C (TMA)?", start: "Jumamosi 00:00", startEn: "Sat 00:00", src: "TMA" },
    { n: "9", cat: "Kripto", sw: "Je, bei ya Ethereum Jumapili saa 23:59 itakuwa juu kuliko Ijumaa saa 19:30?", en: "Will Ethereum be higher on Sunday 23:59 than on Friday 19:30?", start: "Ijumaa 19:30", startEn: "Fri 19:30", src: "Coinbase ETH-USD" },
    { n: "10", cat: "Michezo", sw: "Je, Taifa Stars watapata ushindi au sare katika mechi yao ya kirafiki ya kimataifa itakayochezwa Jumapili jioni kwenye Uwanja wa Benjamin Mkapa?", en: "Will Taifa Stars win or draw their international friendly on Sunday evening at Benjamin Mkapa Stadium?", start: "Jumapili 19:00", startEn: "Sun 19:00", src: "TFF" },
    { n: "A1", cat: "Michezo", sw: "Je, Azam FC itashinda mechi yake ya Jumapili?", en: "Will Azam FC win on Sunday?", start: "Jumapili 16:00", startEn: "Sun 16:00", src: "NBC Premier League" },
    { n: "A2", cat: "Kripto", sw: "Je, bei ya Bitcoin Jumapili saa 23:59 itakuwa juu kuliko Ijumaa saa 19:30?", en: "Will Bitcoin be higher on Sunday 23:59 than on Friday 19:30?", start: "Ijumaa 19:30", startEn: "Fri 19:30", src: "Coinbase BTC-USD" },
    { n: "A3", cat: "Hali ya hewa", sw: "Je, mvua ya angalau mm 1 itanyesha Mwanza Jumamosi (TMA)?", en: "Will at least 1 mm of rain fall in Mwanza on Saturday (TMA)?", start: "Jumamosi 00:00", startEn: "Sat 00:00", src: "TMA" },
    { n: "A4", cat: "Michezo", sw: "Je, mechi ya Real Madrid ya Jumamosi itakuwa na magoli 3 au zaidi?", en: "Will Real Madrid's Saturday match have 3 or more goals?", start: "Jumamosi 22:00", startEn: "Sat 22:00", src: "LaLiga" },
    { n: "A5", cat: "Uchumi", sw: "Je, kiwango cha dola kwa shilingi cha BoT Jumatatu kitakuwa juu kuliko cha Ijumaa?", en: "Will the BoT dollar rate on Monday be higher than Friday's?", start: "Jumatatu 10:00", startEn: "Mon 10:00", src: "BoT" }
  ];
  Q.forEach((q) => { q.glyph = CAT_GLYPH[q.cat]; q.isReserve = q.n[0] === "A"; });

  /* Picks on MLN-W42-004417 — Y = NDIO, N = HAPANA */
  const PICKS = { 1: "Y", 2: "N", 3: "Y", 4: "Y", 5: "N", 6: "Y", 7: "N", 8: "Y", 9: "Y", 10: "N", A1: "Y", A2: "N", A3: "Y", A4: "N", A5: "Y" };

  /* Outcomes per timeline. V = void. { out, at, reason } */
  const TL = {
    /* Attested times — the owner's list (2026-10-17): main 1 Sat 17:52 · 2 Mon 00:12 · 3 Mon 09:10 · 4 Sat 11:02 · 5 Mon 10:41 (the last, = results final) · 6 Sun 20:36 · 7 Sun 20:41 · 8 Sun 09:10 · 9 Mon 00:14 · 10 Sun 21:06 · A1 Sun 17:54 · A2 Mon 00:16 · A3 Sun 09:10 · A4 Sat 23:51 · A5 Mon 10:24. B and E reuse these; D keeps each void row's time. */
    A: { mains: { 1: ["Y", "Jumamosi 17:52"], 2: ["N", "Jumatatu 00:12"], 3: ["N", "Jumatatu 09:10"], 4: ["V", "Jumamosi 11:02", "voidPostponed"], 5: ["N", "Jumatatu 10:41"], 6: ["Y", "Jumapili 20:36"], 7: ["Y", "Jumapili 20:41"], 8: ["Y", "Jumapili 09:10"], 9: ["N", "Jumatatu 00:14"], 10: ["N", "Jumapili 21:06"] },
         reserves: { A1: ["Y", "Jumapili 17:54"], A2: ["N", "Jumatatu 00:16"], A3: ["N", "Jumapili 09:10"], A4: ["Y", "Jumamosi 23:51"], A5: ["Y", "Jumatatu 10:24"] },
         tickets: 212, pool: 601000, carriedOut: 601000, winners: 0 },
    B: { mains: { 1: ["Y", "Jumamosi 17:52"], 2: ["N", "Jumatatu 00:12"], 3: ["Y", "Jumatatu 09:10"], 4: ["V", "Jumamosi 11:02", "voidPostponed"], 5: ["N", "Jumatatu 10:41"], 6: ["Y", "Jumapili 20:36"], 7: ["N", "Jumapili 20:41"], 8: ["Y", "Jumapili 09:10"], 9: ["Y", "Jumatatu 00:14"], 10: ["N", "Jumapili 21:06"] },
         reserves: { A1: ["Y", "Jumapili 17:54"], A2: ["N", "Jumatatu 00:16"], A3: ["N", "Jumapili 09:10"], A4: ["Y", "Jumamosi 23:51"], A5: ["Y", "Jumatatu 10:24"] },
         tickets: 661, pool: 1050000, jackpot: 1050000, fee: 136500, tra: 13650, gbt: 6825, toWinners: 913500, winners: 3, perTicket: 304500 },
    C: { tickets: 212, pool: 601000, jackpot: 1000000, fee: 130000, tra: 13000, gbt: 6500, toWinners: 870000, winners: 7, perTicket: 124285, paid: 869995, remainder: 5, topUp: 398995,
         netNeg: { winners: 200, perTicket: 4350, spent: 10000, held: 1, net: -5650 } },
    D: { voidMains: { 2: "voidNoReading", 4: "voidPostponed", 7: "voidAbandoned" }, voidReserves: { A2: "voidNoReading", A3: "voidNotPublished", A5: "voidNoReading" }, standing: ["A1", "A4"], refund: 1000, carried: 389000 },
    E: { pool: 601000, fee: 78130, tra: 7813, gbt: 3907, toWinners: 522870, winners: 2, perTicket: 261435, topScore: 9 }
  };
  TL.A.mains[4].push("A1"); TL.B.mains[4].push("A1");

  /* The live frame: Sun 25 Oct 12:00 — results out so far. */
  const LIVE = { out: { 4: ["V", "Jumamosi 11:02", "voidPostponed"], 1: ["Y", "Jumamosi 17:52"], A4: ["Y", "Jumamosi 23:51"], 8: ["Y", "Jumapili 09:10"], A3: ["N", "Jumapili 09:10"] }, count: 5, reservesLeft: 4, reservesTotal: 5 };
  /* live-cannot-win: Sun 25 Oct 21:30 — 9 of 15 out on the owner's attested times; main 7 (Sun 20:41, NDIO against the ticket's HAPANA) is the first miss, so the ticket cannot win. */
  const LIVE_CANNOT = { out: Object.assign({}, LIVE.out, { A1: ["Y", "Jumapili 17:54"], 6: ["Y", "Jumapili 20:36"], 7: ["Y", "Jumapili 20:41"], 10: ["N", "Jumapili 21:06"] }), count: 9, reservesLeft: 4, reservesTotal: 5, nowSw: "Jumapili 21:30" };

  /* ─── lib maswali-substitution: a pure function. mains: {n: 'Y'|'N'|'V'}, reserves: {A1: 'Y'|'N'|'V'} → map {mainN: reserveKey} and the week-void flag */
  function substitution(mainsOut, reservesOut) {
    const voided = Object.keys(mainsOut).map(Number).filter((n) => mainsOut[n] === "V").sort((a, b) => a - b);
    const valid = ["A1", "A2", "A3", "A4", "A5"].filter((k) => reservesOut[k] && reservesOut[k] !== "V");
    const skipped = ["A1", "A2", "A3", "A4", "A5"].filter((k) => reservesOut[k] === "V");
    const map = {}; const used = [];
    voided.forEach((n, i) => { if (valid[i]) { map[n] = valid[i]; used.push(valid[i]); } });
    const unused = valid.filter((k) => used.indexOf(k) < 0);
    return { map, voided, valid, skipped, used, unused, weekVoid: voided.length > valid.length, reservesLeft: valid.length - voided.length };
  }
  /* Grade one ticket against final outcomes → sockets. kind: check | x | nil | pending */
  function grade(picks, mainsOut, reservesOut, sub) {
    const mains = []; for (let n = 1; n <= 10; n++) {
      const o = mainsOut[n]; let kind = "pending", carriedFrom = null, outcome = o ? o[0] : null;
      if (o && o[0] === "V") { const r = sub.map[n]; carriedFrom = r || null; if (r) { const ro = reservesOut[r]; kind = ro[0] === picks[r] ? "check" : "x"; outcome = ro[0]; } else kind = "nil"; }
      else if (o) kind = o[0] === picks[n] ? "check" : "x";
      mains.push({ n, kind, carriedFrom, pick: picks[n], outcome, voidReason: o && o[2] });
    }
    const reserves = ["A1", "A2", "A3", "A4", "A5"].map((k) => {
      const ro = reservesOut[k]; const to = Object.keys(sub.map).find((n) => sub.map[n] === k);
      let kind = "standby"; if (ro && ro[0] === "V") kind = "nil"; else if (to) kind = "carried"; else if (ro && sub.final) kind = "unused";
      return { k, kind, to: to ? Number(to) : null, pick: picks[k], outcome: ro ? ro[0] : null, voidReason: ro && ro[2] };
    });
    return { mains, reserves, unbroken: mains.every((m) => m.kind === "check") };
  }
  const outOnly = (o) => { const r = {}; Object.keys(o).forEach((k) => (r[k] = o[k][0])); return r; };

  /* Split a sentence into parts so every numeral that is DATA renders mono + tabular (money, counts, times, serials, hashes). */
  const SEG_RE = /((?:\u2212|\+)?TZS\u00a0[\d,]+\+?|MLN-W\d+-\d+|[0-9a-f]{4}…(?:[0-9a-f]{3})?|\d{4}-\d{2}-\d{2}(?: \d{2}:\d{2})?|\d{1,2}:\d{2}|\d+(?:,\d{3})+|\d+\/\d+|\d+(?:\.\d+)?%|\bA[1-5]\b|\d+)/g;
  const segs = (s) => { const out = []; let last = 0; let m; SEG_RE.lastIndex = 0;
    while ((m = SEG_RE.exec(s))) { if (m.index > last) out.push({ t: s.slice(last, m.index), mono: false, plain: true }); const money = /TZS/.test(m[0]); out.push({ t: m[0], mono: true, plain: false, money, monoOnly: !money }); last = m.index + m[0].length; }
    if (last < s.length) out.push({ t: s.slice(last), mono: false, plain: true }); return out; };

  /* The home headline is two sentences; each is kept whole on its own line (the journey canvas). */
  const splitHead = (s) => { const m = /^(.*?[.。])\s*(.*)$/.exec(s); return m && m[2] ? [m[1], m[2]] : [s, '']; };
  window.MASWALI = { NB, fmt, fmtN, fmtNeg, STR, t, stretch, segs, splitHead, WEEK, Q, PICKS, TL, LIVE, LIVE_CANNOT, substitution, grade, outOnly, CAT_GLYPH };
})();
