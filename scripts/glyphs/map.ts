/**
 * THE GLYPH MAP — every key of the house family `I` (src/components/ui/glyphs.tsx) and what draws it once the family is
 * Phosphor (PHOSPHOR-MIGRATION, docs/PHOSPHOR-MIGRATION.md §4; Ali's rulings §2–§3).
 *
 *   ph      — a Phosphor Icons name, checked against the pinned package by `test:glyph-map`.
 *   extra   — no Phosphor glyph fits; a house extra drawn in Phosphor's grammar (256 grid, every shipped weight). The
 *             string says why.
 *   retire  — the key is not drawn anywhere and nothing reserves it: it leaves the family at the swap (W2). The string
 *             says why. The swap adds the guard that fails a retired key still drawn somewhere.
 *
 * Keys stay the house names call sites already use; only the drawings change underneath. One meaning, one glyph: two keys
 * may share a Phosphor name only when they mean the same thing (`profile`/`user`, `hot`/`flame2`, `landmark`/`bank`), and
 * the swap collapses those aliases.
 */
export const PHOSPHOR_PACKAGE = "@phosphor-icons/core";
export const PHOSPHOR_VERSION = "2.1.1";

export type MapEntry = { ph: string } | { extra: string } | { retire: string };

const UNUSED = "drawn nowhere at the 2026-10-17 census (PHOSPHOR-MIGRATION Appendix A)";
const GL_ART = "a 64-grid empty-state art drawn nowhere; empty states become a Duotone glyph on a plate (W6)";
const CAT_REF = "the unused reference category set; categories draw through categoryGlyph's keys";

export const GLYPH_MAP: Record<string, MapEntry> = {
  // ── categories (categoryGlyph) ──
  football: { ph: "soccer-ball" },
  politics: { ph: "flag-banner" },
  forex: { ph: "currency-circle-dollar" },
  weather: { ph: "cloud-rain" },
  economy: { ph: "chart-line-up" },
  crypto: { ph: "currency-btc" },
  entertainment: { ph: "film-slate" },
  tech: { ph: "cpu" },
  shuffle: { ph: "shuffle" },
  landmark: { ph: "bank" },
  markets: { ph: "squares-four" }, // R-LEXICON 5.1A: the board, both shells; also the "other" category

  // ── actions ──
  trade: { ph: "arrows-down-up" }, // R-LEXICON 5.4A: Up & Down
  watch: { retire: UNUSED },
  share: { ph: "share-network" },
  comment: { ph: "chat-text" },
  bell: { ph: "bell" },
  search: { ph: "magnifying-glass" },
  filter: { ph: "funnel" },
  plus: { ph: "plus-circle" },

  // ── nav ──
  home: { retire: UNUSED },
  portfolio: { ph: "ticket" }, // positions are tickets (docs/PHOSPHOR-MIGRATION.md §3)
  trophy: { ph: "trophy" },
  profile: { ph: "user" },

  // ── status ──
  live: { ph: "broadcast" }, // R-LEXICON 5.2A
  tipping: { retire: UNUSED },
  hot: { ph: "fire" },
  soon: { retire: UNUSED },
  resolved: { ph: "seal-check" }, // R-LEXICON 5.5A
  void: { ph: "prohibit" },

  // ── trust / misc / heraldic ──
  shieldcheck: { ph: "shield-check" },
  bolt: { ph: "lightning" },
  wallet: { ph: "wallet" },
  crown: { ph: "crown" },
  shield: { ph: "shield" },
  sparkle: { ph: "sparkle" },
  star: { ph: "star" },
  flame2: { ph: "fire" },

  // ── the kit's extended set ──
  check: { ph: "check" },
  x: { ph: "x" },
  info: { ph: "info" },
  ext: { ph: "arrow-square-out" },
  phone: { ph: "phone" },
  globe: { ph: "globe" },
  chart: { ph: "chart-bar" },
  warning: { ph: "warning" },
  alertCircle: { ph: "warning-circle" },
  eye: { ph: "eye" },
  eyeOff: { ph: "eye-slash" },
  edit: { ph: "pencil-simple" },
  camera: { ph: "camera" },
  trash: { ph: "trash" },
  flag: { ph: "flag" },
  menu: { ph: "list" },
  chevronDown: { ph: "caret-down" },
  chevronUp: { ph: "caret-up" },
  chevronRight: { ph: "caret-right" },
  chevronLeft: { ph: "caret-left" },
  chevronsLeft: { ph: "caret-double-left" },
  chevronsRight: { ph: "caret-double-right" },
  checkCircle: { ph: "check-circle" },
  bellRing: { ph: "bell-ringing" },
  bellOff: { ph: "bell-slash" },
  trendingUp: { ph: "trend-up" },
  trendingDown: { ph: "trend-down" },
  clock: { ph: "clock" },
  arrowDown: { ph: "arrow-down" },
  arrowUp: { ph: "arrow-up" },
  arrowRight: { ph: "arrow-right" },
  arrowLeft: { ph: "arrow-left" },
  play: { retire: UNUSED },
  download: { ph: "download-simple" },
  upload: { ph: "upload-simple" },
  copy: { ph: "copy" },
  lock: { ph: "lock" },
  unlock: { ph: "lock-open" },
  user: { ph: "user" },
  users: { ph: "users" },
  settings: { ph: "gear-six" },
  logOut: { ph: "sign-out" },
  logIn: { retire: UNUSED },
  gift: { ph: "gift" },
  receipt: { ph: "receipt" },
  coins: { ph: "coins" },
  ticket: { ph: "ticket" },
  listChecks: { ph: "list-checks" },
  layoutGrid: { ph: "grid-four" }, // "all categories" — kept apart from the board's squares-four
  needle: { extra: "the brand's own mark (a disc and the needle across it); Phosphor has nothing like it" },
  radio: { ph: "radio-button" },
  pause: { ph: "pause" },
  playBare: { ph: "play" },

  // ── A1 · player-facing ──
  mail: { ph: "envelope-simple" },
  calendar: { ph: "calendar-blank" },
  device: { ph: "devices" },
  vibrate: { retire: UNUSED },
  smartphone: { ph: "device-mobile" },
  shieldQuestion: { ph: "seal-question" },
  fileSignature: { ph: "signature" },
  link: { ph: "link" },

  // ── A2 · admin ──
  keyRound: { ph: "key" },
  megaphone: { ph: "megaphone" },
  database: { retire: UNUSED },
  server: { ph: "hard-drives" },
  fileText: { ph: "file-text" },
  fileCheck: { ph: "certificate" }, // a verified document; Phosphor 2.1.1 has no file-check
  fileSpreadsheet: { ph: "file-xls" },
  brain: { ph: "brain" },
  bot: { ph: "robot" },
  shieldAlert: { ph: "shield-warning" },
  shieldOff: { ph: "shield-slash" },
  heartPulse: { ph: "heartbeat" },
  rotateCcw: { ph: "arrow-counter-clockwise" },
  archive: { ph: "archive" },
  xCircle: { ph: "x-circle" },
  alertOctagon: { ph: "warning-octagon" },
  arrowUpFromLine: { ph: "arrow-line-up" }, // R-LEXICON 5.3A: withdraw
  arrowDownToLine: { ph: "arrow-line-down" }, // R-LEXICON 5.3A: deposit
  scrollText: { ph: "scroll" },

  // ── 64-grid empty-state arts ──
  emptyMarkets: { retire: GL_ART },
  emptyPositions: { retire: GL_ART },
  emptyLeaderboard: { retire: GL_ART },
  emptyProposals: { retire: GL_ART },
  kycRail: { retire: GL_ART },
  fairnessChain: { retire: GL_ART },
  rgSelfCare: { retire: GL_ART },
  adminGeneric: { retire: GL_ART },

  // ── controlled poll ──
  calendarClock: { ph: "calendar-dots" },
  hourglassHalf: { ph: "hourglass-medium" },
  hourglassOff: { ph: "hourglass-low" },
  target: { ph: "target" },
  sliders: { ph: "sliders-horizontal" },
  calendarRange: { retire: UNUSED },
  gauge: { ph: "gauge" },
  circleStop: { ph: "stop-circle" },
  timerReset: { retire: UNUSED },
  listFilter: { retire: UNUSED },
  stepForward: { retire: UNUSED },

  // ── payments & money ──
  cardPay: { ph: "credit-card" },
  bank: { ph: "bank" },
  mobileMoney: { extra: "a handset carrying money — the Tanzanian wallets' own idea; Phosphor has no such glyph" },
  cashOut: { ph: "hand-coins" },
  cashback: { retire: UNUSED },
  percent: { ph: "percent" },

  // ── source of funds ──
  sofSalary: { ph: "briefcase" },
  sofBusiness: { ph: "storefront" },
  sofSavings: { ph: "piggy-bank" },
  sofInvestment: { ph: "chart-pie-slice" }, // investment income — kept apart from the economy category
  sofGift: { ph: "gift" },

  // ── devices & sessions ──
  devicePhone: { ph: "device-mobile" },
  deviceDesktop: { ph: "desktop" },
  deviceTablet: { ph: "device-tablet" },

  // ── help & support ──
  compass: { retire: UNUSED },
  idCard: { ph: "identification-card" },
  headset: { ph: "headset" },
  questionCircle: { ph: "question" }, // Help; the journey's board tab moves to `markets` (R-LEXICON 5.1A)

  // ── status & tags ──
  sealCheck: { ph: "seal-check" },
  voidX: { ph: "prohibit" }, // reserved: Maswali R2 renames it sealX; void is prohibit (one meaning, one glyph)
  clockPending: { ph: "clock-countdown" }, // pending (W4)
  lockSide: { retire: UNUSED },
  sparkleNew: { retire: UNUSED },
  flame: { retire: UNUSED },
  tippingScales: { ph: "scales" }, // the rules
  podium: { ph: "ranking" },

  // ── system ──
  qr: { ph: "qr-code" },
  wifiOff: { ph: "wifi-slash" }, // reserved: the offline page draws it
  activity: { ph: "pulse" },

  // ── utility ──
  externalLink: { ph: "arrow-square-out" },
  sortAsc: { retire: UNUSED },
  sortDesc: { retire: UNUSED },
  dragHandle: { ph: "dots-six-vertical" },
  csvExport: { retire: UNUSED },
  ussd: { extra: "a USSD dial string on a handset (*150*00#), the way most Tanzanian players pay; Phosphor has no such glyph" },
  simCard: { retire: UNUSED },
  attest: { retire: UNUSED },
  reconcile: { ph: "equals" }, // two sides that balance — kept apart from the rules' scales

  // ── categories (reference set) ──
  catSports: { retire: CAT_REF },
  catMacro: { retire: CAT_REF },
  catWeather: { retire: CAT_REF },
  catCrypto: { retire: CAT_REF },
  catCulture: { retire: CAT_REF },
  catTech: { retire: CAT_REF },
  catForex: { retire: CAT_REF },
  catOther: { retire: CAT_REF },
};

/** New keys the lexicon adds at the swap (W2), so each meaning has its own key (docs/PHOSPHOR-MIGRATION.md §3). */
/** Keys that share one Phosphor drawing because they mean the same thing; the swap collapses each pair. */
export const ALIASES: Array<[string, string]> = [
  ["profile", "user"], ["hot", "flame2"], ["landmark", "bank"], ["ext", "externalLink"], ["resolved", "sealCheck"],
  ["gift", "sofGift"], ["portfolio", "ticket"], ["smartphone", "devicePhone"], ["void", "voidX"],
];

export const NEW_KEYS: Record<string, MapEntry> = {
  idea: { ph: "lightbulb" }, // R-LEXICON 5.6A: proposals
  limits: { ph: "hand-palm" }, // R-LEXICON 5.7A: limits and breaks
  // Maswali Millionea's own meanings (MASWALI-PLAN §10c, Ali 2026-10-17; MASWALI-BUILD S5). Where the lexicon already owns
  // a meaning Millionea calls that key and adds none; these thirteen are the meanings it does not own.
  millionea: { ph: "diamond" }, // the product mark: Ali's pick among diamond / star-four / crown-simple / medal, diamond until then
  markPending: { ph: "circle-dashed" }, // a question not yet sealed: "not known yet", never "wrong" (replaces the delivery's sealNil)
  reserve: { ph: "lifebuoy" }, // the reserves A1–A5: the backup that saves a ticket when a main question voids
  standIn: { ph: "arrow-bend-down-right" }, // a reserve stood in for a voided main (its socket carries into the main's)
  carry: { ph: "arrow-bend-double-up-right" }, // carried forward to the next jackpot (not the lexicon's savings or cash-out)
  floor: { ph: "vault" }, // the house floor guarantee (shield-check already means "verified")
  register: { ph: "notebook" }, // the week's register, Daftari la Wiki
  commitment: { ph: "fingerprint" }, // the week's ticket commitment fixed at the close (MR-13); /fairness keeps attestation
  refund: { ph: "arrow-u-down-left" }, // refunded with a voided week
  salesPaused: { ph: "pause-circle" }, // an operator's pause of sales (the lexicon's pause is the player's own break)
  howTo: { ph: "book-open-text" }, // how it works (question stays Help)
  cap: { ph: "stack" }, // the weekly ticket cap
  finalWeek: { ph: "flag-checkered" }, // the final week of a sunset
};
