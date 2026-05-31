/* 50pick — Motion & Reward Lab: spec data.
   Single source for the haptic tokens, event→pattern map, micro-animation
   catalogue, achievement set, and the celebration ladder. */

(function () {
  "use strict";

  // ---- Haptic tokens (mirrors haptics.js PATTERNS) ----------------------
  var HAPTIC_TOKENS = [
    { token: "tap",       label: "Tap",        sw: "Gusa",        desc: "Routine acknowledgement — a single light pulse.",          defaultOn: false },
    { token: "select",    label: "Select",     sw: "Chagua",      desc: "Chip / toggle / segmented pick.",                          defaultOn: false },
    { token: "confirm",   label: "Confirm",    sw: "Thibitisha",  desc: "A definite double-knock: the action landed.",              defaultOn: true },
    { token: "success",   label: "Success",    sw: "Imefaulu",    desc: "Money settled / verified — a rising, settling cadence.",   defaultOn: true },
    { token: "warning",   label: "Warning",    sw: "Tahadhari",   desc: "Pay attention — even, measured.",                          defaultOn: true },
    { token: "error",     label: "Error",      sw: "Hitilafu",    desc: "Blunt, twice. Something needs you.",                       defaultOn: true },
    { token: "celebrate", label: "Celebrate",  sw: "Sherehekea",  desc: "The peak — a heraldic seal-stamp flourish. Earned, rare.", defaultOn: true },
  ];

  // ---- Event → pattern mapping ------------------------------------------
  var EVENT_MAP = [
    { group: "Money", event: "Place prediction · confirm bet",        sw: "Weka ubashiri",          token: "confirm",   note: "Fires as the slip seals." },
    { group: "Money", event: "Cash out",                              sw: "Toa pesa mapema",        token: "confirm",   note: "" },
    { group: "Money", event: "Deposit success",                       sw: "Amana imefika",          token: "success",   note: "Pairs with balance value-flash." },
    { group: "Money", event: "Withdrawal submitted",                  sw: "Uondoaji umewasilishwa", token: "success",   note: "" },
    { group: "Money", event: "Transaction failed",                    sw: "Muamala umeshindwa",     token: "error",     note: "" },
    { group: "Outcome", event: "Win reveal",                          sw: "Ushindi",                token: "celebrate", note: "Same frame as win-burst / confetti." },
    { group: "Outcome", event: "Loss",                                sw: "Kushindwa",              token: "—",         note: "No haptic. Dignified, never punitive." },
    { group: "Outcome", event: "Reward earned (referral / prize)",    sw: "Zawadi imepatikana",     token: "celebrate", note: "" },
    { group: "Outcome", event: "Badge unlocked",                      sw: "Beji imefunguliwa",      token: "celebrate", note: "Same frame as seal-impress." },
    { group: "Outcome", event: "Level up",                            sw: "Kupanda daraja",         token: "celebrate", note: "" },
    { group: "Action", event: "Proposal submitted",                   sw: "Pendekezo limewasilishwa", token: "success",  note: "Pairs with checkmark draw." },
    { group: "Action", event: "Vote up / down",                       sw: "Piga kura",              token: "select",    note: "OFF by default — routine." },
    { group: "Action", event: "Toggle · chip select",                 sw: "Geuza · chagua",         token: "select",    note: "OFF by default." },
    { group: "Action", event: "Routine tap · navigate",              sw: "Gusa · nenda",           token: "tap",       note: "OFF by default." },
    { group: "Caution", event: "Destructive confirm (self-exclude)",  sw: "Thibitisho hatari",      token: "warning",   note: "Self-exclude, close account." },
    { group: "Caution", event: "Form validation error",              sw: "Hitilafu ya fomu",       token: "error",     note: "" },
  ];

  // ---- Micro-animation catalogue ----------------------------------------
  var ANIMATIONS = [
    { id: "press",   n: 1,  title: "Button / chip press",    sw: "Bonyeza", keyframe: "press-pop",          tokens: "--dur-flick · --ease-micro",   trigger: "pointerdown on .btn / .chip", haptic: "tap", demo: "press" },
    { id: "stagger", n: 2,  title: "List entrance stagger",  sw: "Mfululizo wa orodha", keyframe: "reveal-up (reused) + .stagger-item", tokens: "--dur-arrive · --ease-arrive", trigger: "on mount; --i index, capped at 8", haptic: "—", demo: "stagger" },
    { id: "tabs",    n: 3,  title: "Sliding tab indicator",  sw: "Kichupo", keyframe: ".tab-indicator transform", tokens: "--dur-quick · --ease-glide",   trigger: "active tab change; JS sets --x / --w", haptic: "select", demo: "tabs" },
    { id: "vote",    n: 4,  title: "Optimistic vote",        sw: "Kura", keyframe: "vote-pop + count-up-flash", tokens: "--dur-quick · --ease-arrive",  trigger: "vote click (optimistic)", haptic: "select", demo: "vote" },
    { id: "toggle",  n: 5,  title: "Toggle thumb + glow",    sw: "Swichi", keyframe: "thumb transform + toggle-glow", tokens: "--dur-quick · --ease-arrive",  trigger: "switch ON/OFF", haptic: "select", demo: "toggle" },
    { id: "value",   n: 6,  title: "Value changed (TZS)",    sw: "Thamani imebadilika", keyframe: "count-up-flash + value-delta-fade", tokens: "--dur-glide · --ease-glide",   trigger: "any TZS figure changes", haptic: "—", demo: "value" },
    { id: "check",   n: 7,  title: "Success checkmark draw", sw: "Alama ya kufaulu", keyframe: "check-draw + check-pop", tokens: "--dur-glide · --ease-glide",   trigger: "saved / submitted / verified", haptic: "success", demo: "check" },
    { id: "route",   n: 8,  title: "Page / route transition", sw: "Mpito wa ukurasa", keyframe: "reveal-up (.route-enter)", tokens: "--dur-quick · --ease-glide",   trigger: "route navigate", haptic: "—", demo: "route" },
    { id: "skeleton", n: 9, title: "Skeleton → content",     sw: "Maudhui", keyframe: "content-fade-in + skel fade", tokens: "--dur-quick · --ease-glide",   trigger: "data resolves", haptic: "—", demo: "skeleton" },
  ];

  // ---- Achievement set ---------------------------------------------------
  // ship: in the first release. tiered: one badge with 1/5/25-style tiers.
  var BADGES = [
    { id: "first-prediction", name: "First Prediction", sw: "Ubashiri wa Kwanza", cond: "Place your first prediction.", condSw: "Weka ubashiri wako wa kwanza.", rarity: "Common", ship: true },
    { id: "first-win",        name: "First Win",        sw: "Ushindi wa Kwanza",  cond: "Win your first settled market.", condSw: "Shinda soko lako la kwanza.", rarity: "Common", ship: true },
    { id: "sharp",            name: "Sharp",            sw: "Mahiri",             cond: "≥ 60% accuracy over ≥ 20 settled predictions.", condSw: "Usahihi ≥ 60% kwa ubashiri ≥ 20.", rarity: "Rare · skill", ship: true },
    { id: "market-maker",     name: "Market Maker",     sw: "Mtengeneza Soko",    cond: "A proposal you wrote gets listed.", condSw: "Pendekezo lako limeorodheshwa.", rarity: "Uncommon", ship: true },
    { id: "connector",        name: "Connector",        sw: "Mwunganishi",        cond: "Refer friends — tiers at 1 · 5 · 25.", condSw: "Alika marafiki — 1 · 5 · 25.", rarity: "Tiered", ship: true, tiered: true },
    { id: "verified",         name: "Verified",         sw: "Umethibitishwa",     cond: "Complete KYC identity verification.", condSw: "Kamilisha uthibitishaji wa KYC.", rarity: "Utility", ship: true },
    // coming soon
    { id: "hot-streak",  name: "Hot Streak",  sw: "Mfululizo",         cond: "Win N predictions in a row.", condSw: "Shinda ubashiri N mfululizo.", rarity: "Rare", ship: false },
    { id: "oracle",      name: "Oracle",      sw: "Nabii",             cond: "A market you proposed resolves correctly.", condSw: "Soko ulilopendekeza limetatuliwa sawa.", rarity: "Rare", ship: false },
    { id: "high-roller", name: "High Roller", sw: "Mchezaji Mkubwa",   cond: "Reach a cumulative stake milestone.", condSw: "Fikia kiwango cha jumla ya dau.", rarity: "Uncommon", ship: false },
    { id: "day-one",     name: "Day One",     sw: "Siku ya Kwanza",    cond: "Joined during the launch window. Collectible.", condSw: "Ulijiunga wakati wa uzinduzi.", rarity: "Collectible", ship: false },
  ];

  // ---- Profile shelf mock state (a believable user) ----------------------
  var PROFILE = {
    name: "Asha Mwakitwange",
    handle: "@asha_tz",
    initials: "AM",
    tier: "gold",
    level: 12,
    levelLabel: "Predictor",
    xp: 740, xpMax: 1000,
    streak: 6,
    accuracy: 64,
    shelf: [
      { id: "first-prediction", state: "unlocked" },
      { id: "first-win",        state: "unlocked" },
      { id: "verified",         state: "unlocked" },
      { id: "connector",        state: "progress", progress: { value: 3, max: 5, tier: "II" } },
      { id: "sharp",            state: "progress", progress: { value: 14, max: 20 } },
      { id: "market-maker",     state: "locked" },
    ],
  };

  // ---- Celebration ladder (#4 stretch) ----------------------------------
  // Thresholds are PROPOSED — flagged for product sign-off.
  var CELEBRATION = [
    {
      tier: "micro", label: "Micro", sub: "Small win",
      threshold: "payout < 3× stake  ·  net < TZS 5,000",
      assets: "count-up-flash on payout",
      haptic: "success",
      blurb: "Quiet and dignified. The number ticks up in gilt and settles. No confetti — a small win shouldn't pretend to be a jackpot.",
    },
    {
      tier: "standard", label: "Standard", sub: "Typical win",
      threshold: "3×–10× stake  ·  net TZS 5k–100k",
      assets: "win-burst card + celebrate-pop seal + slow gilt rays",
      haptic: "celebrate",
      blurb: "The win card bursts in, the gilt seal pops, rays turn slowly behind the crest. One celebrate flourish. Confident, not loud.",
    },
    {
      tier: "rare", label: "Rare", sub: "Big win · jackpot · badge",
      threshold: "≥ 10× stake  ·  net ≥ TZS 100k  ·  jackpot pool",
      assets: "win-confetti + seal-impress + wc-ray-spin + wc-trophy-pulse",
      haptic: "celebrate",
      blurb: "The full moment — heraldic confetti (gilt · emerald · rose only), the seal impresses hard, the trophy halo breathes. Reserved for moments that truly earned it.",
    },
  ];

  window.LabData = {
    HAPTIC_TOKENS: HAPTIC_TOKENS,
    EVENT_MAP: EVENT_MAP,
    ANIMATIONS: ANIMATIONS,
    BADGES: BADGES,
    PROFILE: PROFILE,
    CELEBRATION: CELEBRATION,
  };
})();
