export async function seedDemoMarkets() {
  // Migrate older snapshots: purge any market with category "politics"
  // (pre-Sprint 37 the seed included an LGA-turnout market; the Tanzania
  // Gaming Board licence excludes political-event markets entirely).
  const allMarkets = await marketStore.values();
  for (const m of allMarkets) {
    if ((m as { category: string }).category === "politics") {
      await marketStore.delete(m.id);
    }
  }

  // 1. Auto-resolve expired Demo · markets so the manager sees their
  //    win/loss the moment the countdown hits 0 (no human officer
  //    needed for synthetic markets — production polls a real vendor).
  // 2. Sweep orphaned positions left over from the deletion bug that
  //    Sprint 56.4 fixed; refunds the stake.
  // Both are idempotent; running them on every /markets page hit is
  // safe and keeps state self-healing without a cron.
  autoResolveExpiredDemoMarkets().catch(() => {});
  // Heal any market that lost its per-market timer (resolution + settlement are now
  // timer-driven, not swept) — dev self-heal on a page hit, mirroring the ticker's
  // reconciler. Dynamic import breaks the market-service ⇄ market-scheduler cycle.
  import("./market-scheduler").then((s) => s.reconcileMarketSchedules()).catch(() => {});
  repairOrphanedPositions().catch(() => {});
  // 3. Expire bonus grants past their validity window — removes the unspent
  //    remainder from the bonus wallet and notifies the player. Idempotent and
  //    self-healing like the sweeps above (no cron needed).
  expireActiveGrants().catch(() => {});

  // NOTE: demo "Demo · " markets are no longer seeded (tester feedback) and
  // are hidden from every player listing by isDemoMarket(). Any that already
  // exist stay in the store so their open positions settle and resolve
  // cleanly — we only ever ADD real markets below, never DELETE.

  // Top-up gate: if we already have 25+ LIVE markets, leave them alone.
  // Otherwise we'll re-seed the canonical 40-market catalogue below to
  // bring the count back up. Resolved + voided markets stay in history.
  const liveNow = (await marketStore.values()).filter(m => m.status === "LIVE").length;
  if (liveNow >= 25) return;
  const day = 24 * 3600_000;
  const seed: CreateMarketInput[] = [
    {
      titleEn: "Will the TZS strengthen against the USD by month-end?",
      titleSw: "Je, TZS itaimarika dhidi ya USD kufikia mwisho wa mwezi?",
      category: "macro",
      sourceUrl: "https://www.bot.go.tz/exchangerates",
      resolutionCriterion: "Resolves YES if the BoT mid-rate on the last business day of the calendar month is below the rate on the first business day. Source: Bank of Tanzania official daily mid-rate.",
      resolutionAt: new Date(Date.now() + 7 * day).toISOString(),
      proposedBy: "system",
    },
    {
      titleEn: "Will the long rains begin in Dar es Salaam before April 15?",
      titleSw: "Je, masika yataanza Dar es Salaam kabla ya Aprili 15?",
      category: "weather",
      sourceUrl: "https://www.meteo.go.tz",
      resolutionCriterion: "Resolves YES if Dar es Salaam records ≥10mm rainfall on at least three calendar days between March 1 and April 14 inclusive. Source: TMA daily station report.",
      resolutionAt: new Date(Date.now() + 14 * day).toISOString(),
      proposedBy: "system",
    },
    {
      titleEn: "Will Simba SC win the next Kariakoo Derby?",
      titleSw: "Je, Simba SC watashinda Derby ya Kariakoo ijayo?",
      category: "sports",
      sourceUrl: "https://nbc.co.tz/premier-league",
      resolutionCriterion: "Resolves YES if Simba SC win the scheduled NBC Premier League fixture vs Yanga SC. Draw or Yanga win resolves NO. Source: NBC Premier League official result.",
      resolutionAt: new Date(Date.now() + 3 * day).toISOString(),
      proposedBy: "system",
    },
    {
      titleEn: "Will the BoT base rate change at the next MPC meeting?",
      titleSw: "Je, kiwango cha riba cha BoT kitabadilika kwenye mkutano ujao wa MPC?",
      category: "macro",
      sourceUrl: "https://www.bot.go.tz/MonetaryPolicy/",
      resolutionCriterion: "Resolves YES if the announced policy rate differs from the prior rate. Source: BoT MPC press release.",
      resolutionAt: new Date(Date.now() + 21 * day).toISOString(),
      proposedBy: "system",
    },
    {
      titleEn: "Will Bongo Star Search 2026 finale air on schedule?",
      titleSw: "Je, fainali ya Bongo Star Search 2026 itarushwa kwa wakati uliopangwa?",
      category: "culture",
      sourceUrl: "https://www.itv.co.tz/bongostarsearch",
      resolutionCriterion: "Resolves YES if the finale episode airs on the scheduled date and time per the official broadcast schedule. Source: ITV Tanzania programming.",
      resolutionAt: new Date(Date.now() + 28 * day).toISOString(),
      proposedBy: "system",
    },
    {
      titleEn: "Will Bitcoin close above $80,000 at end of week?",
      titleSw: "Je, Bitcoin itafungwa juu ya $80,000 mwishoni mwa wiki?",
      category: "crypto",
      sourceUrl: "https://www.coingecko.com/en/coins/bitcoin",
      resolutionCriterion: "Resolves YES if BTC/USD on CoinGecko at 23:59 UTC on Sunday is ≥ 80,000. Source: CoinGecko close price.",
      resolutionAt: new Date(Date.now() + 4 * day).toISOString(),
      proposedBy: "system",
    },
    {
      titleEn: "Will Mount Kilimanjaro see snow at the summit by mid-June?",
      titleSw: "Je, Mlima Kilimanjaro utakuwa na theluji kileleni ifikapo katikati ya Juni?",
      category: "weather",
      sourceUrl: "https://www.meteo.go.tz",
      resolutionCriterion:
        "Resolves YES if the Tanzania Meteorological Authority records measurable snowfall at the Uhuru Peak weather station between 1 May and 15 June. Source: TMA daily station report.",
      resolutionAt: new Date(Date.now() + 38 * day).toISOString(),
      proposedBy: "system",
    },
    // ── Sports — football fixtures & national teams ──────────────────────
    { titleEn: "Will Yanga SC top the NBC Premier League at the next round?", titleSw: "Je, Yanga SC watakuwa juu ya jedwali la NBC ifikapo raundi ijayo?", category: "sports", sourceUrl: "https://nbc.co.tz/premier-league", resolutionCriterion: "Resolves YES if Yanga SC are top of the official NBC Premier League standings at end of the next scheduled match round. Source: NBC official table.", resolutionAt: new Date(Date.now() + 5 * day).toISOString(), proposedBy: "system" },
    { titleEn: "Will Taifa Stars qualify for the next AFCON?", titleSw: "Je, Taifa Stars wataitishwa AFCON ijayo?", category: "sports", sourceUrl: "https://www.cafonline.com", resolutionCriterion: "Resolves YES if Tanzania appears on the official CAF AFCON qualified-teams list at qualifier conclusion. Source: CAF Online.", resolutionAt: new Date(Date.now() + 60 * day).toISOString(), proposedBy: "system" },
    { titleEn: "Will Azam FC reach the CAF Confederation Cup quarter-finals?", titleSw: "Je, Azam FC watafika robo-fainali ya Kombe la Shirikisho la CAF?", category: "sports", sourceUrl: "https://www.cafonline.com/caf-confederation-cup/", resolutionCriterion: "Resolves YES if Azam FC are listed in the official CAF quarter-final draw. Source: CAF Online.", resolutionAt: new Date(Date.now() + 45 * day).toISOString(), proposedBy: "system" },
    { titleEn: "Will Manchester City win the Premier League this season?", titleSw: "Je, Manchester City watashinda Premier League msimu huu?", category: "sports", sourceUrl: "https://www.premierleague.com/tables", resolutionCriterion: "Resolves YES if Manchester City are crowned champions per the official Premier League final standings. Source: Premier League official site.", resolutionAt: new Date(Date.now() + 80 * day).toISOString(), proposedBy: "system" },
    { titleEn: "Will Real Madrid reach the Champions League final?", titleSw: "Je, Real Madrid watafika fainali ya Champions League?", category: "sports", sourceUrl: "https://www.uefa.com/uefachampionsleague/", resolutionCriterion: "Resolves YES if Real Madrid appear in the official UEFA Champions League final fixture. Source: UEFA Online.", resolutionAt: new Date(Date.now() + 50 * day).toISOString(), proposedBy: "system" },
    { titleEn: "Will Tanzania win an Olympic medal at the next Summer Games?", titleSw: "Je, Tanzania itashinda medali ya Olimpiki kwenye michezo ya majira ya joto ijayo?", category: "sports", sourceUrl: "https://olympics.com/en/medals", resolutionCriterion: "Resolves YES if Tanzania appears on the official IOC medal table at games close. Source: olympics.com.", resolutionAt: new Date(Date.now() + 90 * day).toISOString(), proposedBy: "system" },
    // ── Macro — TZ economy / BoT / NBS releases ──────────────────────────
    { titleEn: "Will TZS inflation print below 4.0% next NBS release?", titleSw: "Je, mfumuko wa bei wa TZS utakuwa chini ya 4.0% kwenye taarifa ijayo ya NBS?", category: "macro", sourceUrl: "https://www.nbs.go.tz", resolutionCriterion: "Resolves YES if year-over-year CPI in the next NBS Monthly CPI press release is < 4.0%. Source: NBS official release.", resolutionAt: new Date(Date.now() + 30 * day).toISOString(), proposedBy: "system" },
    { titleEn: "Will the BoT keep the policy rate unchanged at the next MPC?", titleSw: "Je, BoT itaiacha riba kuu bila mabadiliko kwenye MPC ijayo?", category: "macro", sourceUrl: "https://www.bot.go.tz/MonetaryPolicy/", resolutionCriterion: "Resolves YES if the BoT MPC press release reports an unchanged policy rate vs the prior decision. Source: BoT MPC.", resolutionAt: new Date(Date.now() + 22 * day).toISOString(), proposedBy: "system" },
    { titleEn: "Will the BoT FX reserves rise above $5.5 billion next monthly print?", titleSw: "Je, akiba ya BoT itazidi $5.5 bilioni kwenye taarifa ya kila mwezi ijayo?", category: "macro", sourceUrl: "https://www.bot.go.tz", resolutionCriterion: "Resolves YES if Bank of Tanzania official monthly FX reserves figure exceeds USD 5.5 billion. Source: BoT monthly bulletin.", resolutionAt: new Date(Date.now() + 33 * day).toISOString(), proposedBy: "system" },
    { titleEn: "Will Tanzania GDP growth print above 5.5% in the next quarterly NBS release?", titleSw: "Je, ukuaji wa Pato la Taifa utazidi 5.5% kwenye taarifa ya robo mwaka ijayo ya NBS?", category: "macro", sourceUrl: "https://www.nbs.go.tz", resolutionCriterion: "Resolves YES if NBS reports quarterly real GDP growth > 5.5%. Source: NBS quarterly GDP release.", resolutionAt: new Date(Date.now() + 65 * day).toISOString(), proposedBy: "system" },
    { titleEn: "Will the next US Fed FOMC keep rates unchanged?", titleSw: "Je, FOMC ijayo ya Fed itaiacha riba bila mabadiliko?", category: "macro", sourceUrl: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm", resolutionCriterion: "Resolves YES if the FOMC statement reports the target range unchanged from the previous decision. Source: Federal Reserve.", resolutionAt: new Date(Date.now() + 26 * day).toISOString(), proposedBy: "system" },
    // ── Weather — TMA station-driven outcomes ─────────────────────────────
    { titleEn: "Will Arusha get measurable rainfall on Saturday?", titleSw: "Je, Arusha kutapata mvua inayopimika Jumamosi?", category: "weather", sourceUrl: "https://www.meteo.go.tz", resolutionCriterion: "Resolves YES if Arusha TMA station records ≥ 1.0 mm rainfall on the named Saturday. Source: TMA daily report.", resolutionAt: new Date(Date.now() + 5 * day).toISOString(), proposedBy: "system" },
    { titleEn: "Will Mwanza max temperature exceed 32°C this Sunday?", titleSw: "Je, joto la juu Mwanza litazidi nyuzi 32 Jumapili?", category: "weather", sourceUrl: "https://www.meteo.go.tz", resolutionCriterion: "Resolves YES if Mwanza TMA station's daily Tmax for the named Sunday exceeds 32.0 °C. Source: TMA daily report.", resolutionAt: new Date(Date.now() + 6 * day).toISOString(), proposedBy: "system" },
    { titleEn: "Will Zanzibar see a full sunny day this Friday?", titleSw: "Je, Zanzibar itakuwa na siku kamili ya jua Ijumaa hii?", category: "weather", sourceUrl: "https://www.meteo.go.tz", resolutionCriterion: "Resolves YES if Zanzibar TMA station records < 0.2 mm rainfall and ≥ 7 hours sunshine on the named Friday. Source: TMA station report.", resolutionAt: new Date(Date.now() + 4 * day).toISOString(), proposedBy: "system" },
    { titleEn: "Will Dodoma exceed 35°C any day this week?", titleSw: "Je, Dodoma itazidi nyuzi 35 siku yoyote wiki hii?", category: "weather", sourceUrl: "https://www.meteo.go.tz", resolutionCriterion: "Resolves YES if Dodoma TMA station Tmax exceeds 35 °C on any day in the named week. Source: TMA daily report.", resolutionAt: new Date(Date.now() + 7 * day).toISOString(), proposedBy: "system" },
    { titleEn: "Will the masika season end before May 31 in Dar es Salaam?", titleSw: "Je, masika yataisha kabla ya Mei 31 Dar es Salaam?", category: "weather", sourceUrl: "https://www.meteo.go.tz", resolutionCriterion: "Resolves YES if the TMA officially declares the long-rain season ended on or before May 31 in their seasonal bulletin. Source: TMA seasonal bulletin.", resolutionAt: new Date(Date.now() + 25 * day).toISOString(), proposedBy: "system" },
    // ── Crypto — daily/weekly closes, BTC + ETH + SOL ────────────────────
    { titleEn: "Will Bitcoin close above $90,000 next Sunday?", titleSw: "Je, Bitcoin itafungwa juu ya $90,000 Jumapili ijayo?", category: "crypto", sourceUrl: "https://www.coingecko.com/en/coins/bitcoin", resolutionCriterion: "Resolves YES if BTC/USD CoinGecko close on the named Sunday at 23:59 UTC ≥ 90,000. Source: CoinGecko.", resolutionAt: new Date(Date.now() + 6 * day).toISOString(), proposedBy: "system" },
    { titleEn: "Will Ethereum close above $3,500 next Sunday?", titleSw: "Je, Ethereum itafungwa juu ya $3,500 Jumapili ijayo?", category: "crypto", sourceUrl: "https://www.coingecko.com/en/coins/ethereum", resolutionCriterion: "Resolves YES if ETH/USD CoinGecko close on the named Sunday at 23:59 UTC ≥ 3,500. Source: CoinGecko.", resolutionAt: new Date(Date.now() + 6 * day).toISOString(), proposedBy: "system" },
    { titleEn: "Will Solana close above $200 next Sunday?", titleSw: "Je, Solana itafungwa juu ya $200 Jumapili ijayo?", category: "crypto", sourceUrl: "https://www.coingecko.com/en/coins/solana", resolutionCriterion: "Resolves YES if SOL/USD CoinGecko close on the named Sunday at 23:59 UTC ≥ 200. Source: CoinGecko.", resolutionAt: new Date(Date.now() + 6 * day).toISOString(), proposedBy: "system" },
    { titleEn: "Will Bitcoin's 7-day move be positive?", titleSw: "Je, mwendo wa Bitcoin wa siku 7 utakuwa chanya?", category: "crypto", sourceUrl: "https://www.coingecko.com/en/coins/bitcoin", resolutionCriterion: "Resolves YES if BTC/USD CoinGecko close 7 days from market open exceeds the open-day close. Source: CoinGecko.", resolutionAt: new Date(Date.now() + 7 * day).toISOString(), proposedBy: "system" },
    { titleEn: "Will Ethereum hit a new 30-day high before month-end?", titleSw: "Je, Ethereum itafikia kiwango kipya cha juu cha siku 30 kabla ya mwisho wa mwezi?", category: "crypto", sourceUrl: "https://www.coingecko.com/en/coins/ethereum", resolutionCriterion: "Resolves YES if ETH/USD CoinGecko 24h-high exceeds the prior 30-day rolling high before the last calendar day of the month. Source: CoinGecko.", resolutionAt: new Date(Date.now() + 18 * day).toISOString(), proposedBy: "system" },
    { titleEn: "Will the next Bitcoin daily close be green?", titleSw: "Je, kufungwa kwa kila siku kwa Bitcoin kutakuwa kijani kesho?", category: "crypto", sourceUrl: "https://www.coingecko.com/en/coins/bitcoin", resolutionCriterion: "Resolves YES if BTC/USD CoinGecko close on the named day exceeds the prior day's close. Source: CoinGecko.", resolutionAt: new Date(Date.now() + 1 * day).toISOString(), proposedBy: "system" },
    // ── Culture — film, music, awards ────────────────────────────────────
    { titleEn: "Will the next Diamond Platnumz single chart top 5 on Boomplay TZ?", titleSw: "Je, wimbo ujao wa Diamond Platnumz utakuwa kati ya 5 bora kwenye Boomplay TZ?", category: "culture", sourceUrl: "https://www.boomplay.com/charts", resolutionCriterion: "Resolves YES if the named single appears in Top 5 on the Boomplay Tanzania weekly chart within 14 days of release. Source: Boomplay.", resolutionAt: new Date(Date.now() + 14 * day).toISOString(), proposedBy: "system" },
    { titleEn: "Will the next Wasafi-released video pass 1M views in its first week?", titleSw: "Je, video ijayo ya Wasafi itapita milioni 1 wiki ya kwanza?", category: "culture", sourceUrl: "https://www.youtube.com/@WasafiClassicBaby", resolutionCriterion: "Resolves YES if the named YouTube upload reports ≥ 1,000,000 views 7 days after publish. Source: YouTube public counter.", resolutionAt: new Date(Date.now() + 8 * day).toISOString(), proposedBy: "system" },
    { titleEn: "Will Bongo Movie Awards 2026 air on schedule?", titleSw: "Je, Tuzo za Filamu za Bongo 2026 zitarushwa kwa wakati?", category: "culture", sourceUrl: "https://www.bongomovie.com", resolutionCriterion: "Resolves YES if the broadcast occurs on the announced date and channel. Source: Official Bongo Movie Awards announcement.", resolutionAt: new Date(Date.now() + 33 * day).toISOString(), proposedBy: "system" },
    { titleEn: "Will the next Marvel film open above $100M domestic box office?", titleSw: "Je, filamu ijayo ya Marvel itafungua juu ya $100M ndani ya nchi?", category: "culture", sourceUrl: "https://www.boxofficemojo.com", resolutionCriterion: "Resolves YES if the named Marvel theatrical release reports a US domestic opening weekend gross above $100,000,000. Source: Box Office Mojo.", resolutionAt: new Date(Date.now() + 22 * day).toISOString(), proposedBy: "system" },
    { titleEn: "Will Sauti Sol release a new single in the next 30 days?", titleSw: "Je, Sauti Sol watatoa wimbo mpya katika siku 30 zijazo?", category: "culture", sourceUrl: "https://www.sautisol.com", resolutionCriterion: "Resolves YES if a new single is released on at least one major streaming platform within 30 days of market open. Source: Spotify/Boomplay artist pages.", resolutionAt: new Date(Date.now() + 30 * day).toISOString(), proposedBy: "system" },
    // ── Sports — boxing & athletics ──────────────────────────────────────
    { titleEn: "Will Hassan Mwakinyo win his next professional bout?", titleSw: "Je, Hassan Mwakinyo atashinda mechi yake ijayo ya kulipwa?", category: "sports", sourceUrl: "https://boxrec.com", resolutionCriterion: "Resolves YES if BoxRec records Mwakinyo's next professional bout as a win by KO/TKO/decision. Source: BoxRec.", resolutionAt: new Date(Date.now() + 28 * day).toISOString(), proposedBy: "system" },
    { titleEn: "Will a Tanzanian runner break 28:00 in the next World Athletics 10K?", titleSw: "Je, mkimbiaji wa Tanzania atavunja dakika 28:00 kwenye 10K ya World Athletics ijayo?", category: "sports", sourceUrl: "https://worldathletics.org", resolutionCriterion: "Resolves YES if any Tanzanian runner runs a sub-28:00 in an official World Athletics 10,000 m race in the named period. Source: WA results.", resolutionAt: new Date(Date.now() + 70 * day).toISOString(), proposedBy: "system" },
    // ── Macro — global markets ────────────────────────────────────────────
    { titleEn: "Will the S&P 500 close higher this week?", titleSw: "Je, S&P 500 itafungwa juu wiki hii?", category: "macro", sourceUrl: "https://www.spglobal.com/spdji/en/indices/equity/sp-500/", resolutionCriterion: "Resolves YES if the S&P 500 official Friday close exceeds the prior Friday close. Source: S&P Dow Jones Indices.", resolutionAt: new Date(Date.now() + 5 * day).toISOString(), proposedBy: "system" },
    { titleEn: "Will gold close above $2,400/oz next Friday?", titleSw: "Je, dhahabu itafungwa juu ya $2,400/oz Ijumaa ijayo?", category: "macro", sourceUrl: "https://www.lbma.org.uk/prices-and-data/precious-metal-prices", resolutionCriterion: "Resolves YES if the LBMA Gold Price PM fix on the named Friday is ≥ 2,400.00 USD/oz. Source: LBMA.", resolutionAt: new Date(Date.now() + 5 * day).toISOString(), proposedBy: "system" },
    { titleEn: "Will Brent crude close above $80/bbl next Monday?", titleSw: "Je, Brent itafungwa juu ya $80/bbl Jumatatu ijayo?", category: "macro", sourceUrl: "https://www.eia.gov/dnav/pet/pet_pri_spt_s1_d.htm", resolutionCriterion: "Resolves YES if EIA Brent spot price on the named Monday closes ≥ 80.00 USD/bbl. Source: EIA.", resolutionAt: new Date(Date.now() + 4 * day).toISOString(), proposedBy: "system" },
    // ── Weather — long-range hurricane / drought ──────────────────────────
    { titleEn: "Will the next Indian Ocean tropical cyclone reach Category 3+?", titleSw: "Je, kimbunga kijacho cha Bahari ya Hindi kitafikia daraja la 3 au juu?", category: "weather", sourceUrl: "https://www.meteo.go.tz", resolutionCriterion: "Resolves YES if any tropical cyclone in the SW Indian Ocean basin during the named period reaches Category 3 (≥ 178 km/h sustained) per RSMC La Réunion. Source: RSMC La Réunion bulletin.", resolutionAt: new Date(Date.now() + 45 * day).toISOString(), proposedBy: "system" },
    // Demo markets removed per tester feedback — real markets only.
  ];
  for (const s of seed) {
    // createMarket throws on duplicate id; since we're idempotent on
    // existing-market count, this loop only fires when the count is low.
    try {
      await createMarket(s);
      // No history seeding. A market with no bets has no price history, and its
