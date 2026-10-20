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
  weather: { ph: "cloud-sun" }, // W2 review: cloud-rain at 11–13px read as a speech balloon (its rain stroke joins the cloud)
  sunHorizon: { ph: "sun-horizon" }, // RG self-care sunrise; care, never a reward
  economy: { ph: "chart-line-up" },
  crypto: { ph: "currency-btc" },
  entertainment: { ph: "film-slate" },
  tech: { ph: "cpu" },
  shuffle: { ph: "shuffle" },
  landmark: { ph: "bank" },
  markets: { ph: "squares-four" }, // R-LEXICON 5.1A: the board, both shells (the "other" category draws `assorted`)

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
  // W4 (§8b): drawn nowhere once Up & Down's sides became the halves of its ⇅ (arrowUp / arrowDown), the product's own
  // mentions its `trade`, and a lost bet's notification the quiet xCircle.
  trendingUp: { retire: "drawn nowhere after W4: Up & Down's sides are arrowUp / arrowDown and the product is trade (§8b)" },
  trendingDown: { retire: "drawn nowhere after W4: Up & Down's DOWN is arrowDown and a loss is xCircle (§8b)" },
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
  radio: { retire: "its one use, the hub's Live row, draws `live` (R-LEXICON 5.2A); nothing else draws it" },
  pause: { ph: "pause" },
  playBare: { ph: "play" },

  // ── A1 · player-facing ──
  mail: { ph: "envelope-simple" },
  calendar: { ph: "calendar-blank" },
  device: { ph: "devices" },
  vibrate: { ph: "vibrate" }, // W4 (§8b): haptic feedback's own glyph — the settings row wore the activity log's pulse
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
  compass: { ph: "compass" }, // W6: the generic empty state's wayfinding mark
  idCard: { ph: "identification-card" },
  headset: { ph: "headset" },
  questionCircle: { retire: "its one use, the journey's board tab, draws `markets` (R-LEXICON 5.1A); Help draws `headset`" },

  // ── status & tags ──
  sealCheck: { ph: "seal-check" }, // the certified seal — results' (resolved, R-LEXICON 5.5A) and Maswali R2's seal family
  // Nothing ever drew it. Reserved for Maswali R2's sealX until Ali ruled (2026-10-17, MASWALI-PLAN §10c) that Millionea
  // draws only Phosphor, through `I` — so its keys are new map entries, not house drawings, and the reservation ended.
  voidX: { retire: "unused: Maswali's sealX became Phosphor keys (Ali, 2026-10-17); void is prohibit" },
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
/**
 * Where each live key's symbols are served from (W2). "shell" keys are the always-visible chrome — the two tab bars and
 * the two headers, as they stand after the lexicon (§3), the balance pill's eye and lock among them — and their Bold
 * drawings are inlined in the root layout, so the chrome never waits for a file on a slow first visit. "admin" keys are
 * drawn only by the console and sit in a sprite a player never downloads. Every other key is "app": one cached file. A
 * key drawn outside its group still works (it is fetched from its own group's sprite); the groups only decide what a page
 * has to download. `test:glyph-map` §9 holds the chrome to it: every key a chrome file draws before a tap is a shell key.
 */
export const SHELL_KEYS: readonly string[] = [
  // W4 (the audit of 2026-10-19, §8b): the classic rail's More draws its own key, `more`, and `menu` (≡) left the shell:
  // no player chrome draws it. The console's phone header does (admin-mobile-nav.tsx), from the app sprite — the
  // console's own chrome is release 3's (§8d).
  "markets", "trade", "live", "more", "ticket", "user", "bell", "arrowDownToLine", "chevronDown",
  "eye", "eyeOff", "lock", // the balance pill: its eye (CashEye) shows or hides the balance; the lock marks a held wallet
];
/**
 * The shell keys whose FILL the chrome itself draws, so it is inlined beside their Bold (W4). The rest of a shell key's
 * Fill ships in the app sprite: a page never inlines a drawing its chrome does not draw. Today:
 * - the tab bars' destinations, the current one drawn in Fill on the pill (NavGlyph, W3);
 * - the header bell, drawn in Fill while its panel is open (a toggle that is on, §8c).
 * The balance pill's lock and eye, and the header's caret, draw their Fill only in a page's body (a callout, the preview
 * notice, a card's 24h move), so those Fills ride in the app sprite. `test:glyph-map` §9b holds the list to the chrome.
 */
export const CHROME_FILLS: readonly string[] = ["markets", "trade", "live", "more", "ticket", "user", "bell"];
export const ADMIN_KEYS: readonly string[] = [
  "upload", "fileSpreadsheet", "brain", "shieldAlert", "shieldOff", "archive", "gauge", "reconcile",
  // W3 (R-ADMIN, R-INDICATOR 3B): the console's own destinations (NEW_KEYS below), drawn only by its sidebar and drawer.
  // A destination that reuses a player key (live, the board, results, KYC…) leaves that key in its own group.
  // `agent` left in W4: the player's own doors to the agent programme (the hub's and the profile's) wear it too.
  "dashboard", "journey", "insights", "settlement", "finance", "house", "desk", "reports", "tax", "aiUsage",
  "roster", "cohorts", "sources", "rounds", "weeks", "pools", "integrity", "contacts", "invites", "traffic",
  "privacy", "audit", "approvals", "staff", "roles",
];

/**
 * Keys drawn at 27 px or more somewhere (R-WEIGHT: the Line tier is Bold up to 26 px and Regular from 27): only these ship
 * a Regular drawing. The census of 2026-10-17 — bellRing 30, clock 28, idCard 28, gift 150; the result dialog's status
 * glyphs at 36; the category glyph behind a question's title at 96; RewardBurst's medallion glyph at 36 (`RewardGlyph`:
 * trophy, shieldcheck, resolved, star — W2's review); the cashback promo's coins at 110/140. Any other key drawn that large
 * falls back to Bold, so a glyph is never blank, only heavier. (The market card's category watermark is drawn at its
 * default 24 and scaled to 140 by CSS, so it draws Bold: W5 retires that watermark.)
 */
export const REGULAR_KEYS: readonly string[] = [
  "bellRing", "clock", "idCard", "gift", "check", "x", "warning", "info",
  "football", "politics", "forex", "weather", "economy", "crypto", "entertainment", "tech", "shuffle", "landmark", "assorted",
  "trophy", "shieldcheck", "resolved", "star", "coins",
];

/** Keys that ship a Fill or a Duo drawing — added by the waves that use them (W3 selected states, W4 seals, W5 plates). */
export const FILL_KEYS: readonly string[] = [
  "playBare", // W2: the How-to card's play on its royal plate stays solid, as the hand-drawn one was (a play button reads solid)
  "star", // W2: a followed market's star is solid (WatchStar `on`), as the hand-drawn star filled by `fill-current` was
  "pause", // W2: the LIVE strip's pause (and its play, playBare) are solid, as a player's are: outlined at 14px they read "00"
  // W3 (R-INDICATOR 3B): the two tab bars' destinations — the current one draws its Fill on the pill (NavGlyph). Shell
  // keys in CHROME_FILLS, so their Fill is inlined beside their Bold. (W4: the classic rail's More is `more`.)
  "markets", "trade", "live", "more", "ticket", "user",
  // W3 (R-INDICATOR 3B): the admin sidebar's destinations — the current one draws its Fill (NavGlyph).
  // In the sidebar's order (admin-nav-groups.ts NAV_GROUPS); `live`, `markets` and `trade` are listed above. The console's
  // own keys ship it in the admin sprite; a reused player key ships it in its own group's file.
  "dashboard", "journey", "insights", "settlement", "finance", "house", "desk", "reports", "tax", "mobileMoney",
  "receipt", "roster", "cohorts", "calendar", "bot", "brain", "idea", "resolved", "sources", "percent", "sparkle",
  "rounds", "weeks", "pools", "integrity", "users", "gift", "contacts", "invites", "megaphone", "traffic", "agent",
  "tippingScales", "idCard", "flag", "comment", "shieldAlert", "circleStop", "privacy", "archive", "audit", "server",
  "aiUsage", "approvals", "keyRound", "staff", "roles",
  // W4 (docs/PHOSPHOR-MIGRATION.md §8c: Fill means a state) — `idCard`, `resolved`, `live` and `pause` ship it above.
  // A status in a status container: the doors Callout, NoticeBar, StatusFlag, Toast, a receipt's status, the KYC panel's
  // plate and the proposal's chip draw their glyph in Fill. Circled keys only for a tick or a cross: Phosphor fills a
  // bare `check` or `x` into a solid square, which reads as a checkbox.
  "info", "warning", "alertCircle", "checkCircle", "xCircle", "void", "clock", "clockPending", "lock", "shieldcheck", "bellOff", "eye",
  "rotateCcw", "mail", "camera", "flame2", "edit",
  "bell", // a toggle on: "notify me" on a market, and the header bell while its panel is open (CHROME_FILLS)
  "bellRing", // W8: the saved browser-push subscription's identity glyph changes from Duo to Fill
  "chevronUp", "chevronDown", // the 24h move on every market card: the solid caret is the direction, where ▲▼ were typed
  "wallet", "arrowDownToLine", // W7 installed-app Wallet and Deposit shortcuts rasterise these Fill drawings
];
/**
 * Release 2 (W5, R-TONE 2B; DESIGN_AUTHORITY §K3 item 3: Duotone is identity on a plate) — the keys that stand on an
 * identity or a status plate (`IconPlate`), each drawn in Duotone there: Phosphor's Regular outline over its tone layer at
 * `--glyph-tone`. In the order the surfaces draw them.
 */
export const DUO_KEYS: readonly string[] = [
  // PHOSPHOR-MIGRATION 2c: every category sigil is an identity mark on a royal plate.
  "football", "politics", "forex", "weather", "sunHorizon", "economy", "crypto", "entertainment", "tech",
  "shuffle", "landmark", "assorted",
  // the journey's Akaunti hub, row by row (hub-rows.ts), its live rows (Arifa, Lugha, card size, the Needle) and Toka
  "wallet", "arrowUpFromLine", "resolved", "live", "podium", "attestation", "headset", "search", "limits", "pause",
  "circleStop", "privacyNotice", "shieldcheck", "scrollText", "tippingScales", "users", "idea", "user", "idCard", "agent",
  "bell", "globe", "layoutGrid", "needle", "logOut", "staffConsole",
  // the notification plates (notification-appearance.ts iconFor) — a win's seal stays in Fill
  "xCircle", "ticket", "hourglassOff", "arrowDownToLine", "keyRound", "star", "flag", "gift", "refund",
  // /help's topics, its contact and quick-link cards, and the home's trust band; the chat's help button (`comment`)
  "percent", "activity", "cashOut", "void", "phone", "mail", "comment", "portfolio",
  // /profile's rows and the settings pages' plates
  "chart", "receipt", "bellRing", "fileSignature", "device", "megaphone", "vibrate", "sparkle", "clock",
  // W5 boxed stat tiles: the number's subject is an identity, not a status claim.
  "calendarClock", "trophy", "net",
  // R-ADMIN: the console's KPI subjects use the same Duotone identity grammar as player stats.
  "dashboard", "insights", "settlement", "finance", "house", "desk", "tax", "aiUsage",
  "roster", "cohorts", "rounds", "weeks", "pools", "integrity", "contacts", "invites",
  "traffic", "privacy", "approvals", "staff", "roles", "bot", "brain", "gauge",
  "reconcile", "shieldAlert", "shieldOff", "archive", "megaphone", "calendar", "sources",
  "keyRound", "refund", "limits", "agent", "globe", "server", "receipt", "checkCircle", "clockPending", "lock", "unlock",
  "devicePhone", "deviceDesktop", "deviceTablet",
  // W6: the empty-state family uses the same key as its page, on one identity plate.
  "markets", "audit", "sources", "reports", "compass",
  // the legal header and the rules' cards; /fairness' steps
  "trade", "listChecks", "coins",
  // the KYC page's document plates, the 404's doors
  "camera", "info", "markets",
];

/**
 * DEPLOY SKEW (W3): a page a player opened before a release still asks for the sprite its HTML named. Each release that
 * changes a sprite keeps the one production served before it here, so that open page keeps its icons until its next
 * load; `npm run glyphs:gen` keeps these files and deletes every other stale one, and `test:glyph-sync` §1 allows exactly
 * these. The next release that changes a sprite names the then-live files instead (one release each, never a pile).
 * File names inside `public/icons/g/`.
 */
export const PREVIOUS_SPRITES: readonly string[] = [
  "app.c21618eb.svg", "admin.5c185f72.svg",
];

/** Keys that share one Phosphor drawing because they mean the same thing; the swap collapses each pair. */
export const ALIASES: Array<[string, string]> = [
  ["profile", "user"], ["hot", "flame2"], ["landmark", "bank"], ["ext", "externalLink"], ["resolved", "sealCheck"],
  ["gift", "sofGift"], ["portfolio", "ticket"], ["smartphone", "devicePhone"],
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
  // W2 (lead engineer, 2026-10-17): the hub's Uthibitisho wa utatuzi row — the resolution's attestation, an official
  // stamp — so it never wears the seal of its neighbour Matokeo (results = seal-check, 5.5A): R5-A parted those two rows.
  attestation: { ph: "stamp" },
  // W2 (W2's review): the category "Other" — and any category the map does not know — took the board's key, which the
  // lexicon redrew as squares-four, so it read as "All" (grid-four) and as the board tab. Assorted topics: shapes.
  assorted: { ph: "shapes" },

  // ── W4 (the audit of 2026-10-19, docs/PHOSPHOR-MIGRATION.md §8): meanings that had no key of their own ──
  // The classic rail's More: hollow dots, solid on the pill. `menu` (≡) stays the console drawer's button; its Fill was a
  // solid tile with lines cut out, which read as a card (W3's open call).
  more: { ph: "dots-three-outline" },
  // The privacy notice: a protected document. It wore a lock on its page (the lock also means a held wallet, a closed
  // market and a locked round) and a plain document on the hub.
  privacyNotice: { ph: "file-lock" },
  net: { ph: "plus-minus" }, // a net figure — what came in less what went out (the activity page's Net tile)
  send: { ph: "paper-plane-right" }, // send a message (the chat's send button, which drew its own arrow)
  // The staff console's door, shown to staff in the account menu and the journey's Akaunti: a staff badge. It wore the
  // shield (verified) in one door and the System section's drives in the other (W3 left it for later; §8b).
  staffConsole: { ph: "identification-badge" },

  // ── W3 (R-ADMIN "Yes, sidebar + cards"; R-INDICATOR 3B): the admin console's destinations, one glyph each, drawn by its
  // sidebar and drawer (admin-nav-groups.ts NAV_GROUPS; docs/PHOSPHOR-MIGRATION.md §3 "Admin destinations (W3)"). A
  // destination whose meaning a key already carries wears that key (live, the board, Up & Down, results, proposals, KYC,
  // AML, self-exclusion…); these are the meanings no key had. Console-only (ADMIN_KEYS), each with its Fill (FILL_KEYS).
  dashboard: { ph: "layout" }, // the console's overview: one page of panes
  journey: { ph: "path" }, // the new player journey's rollout and preview: a route from its start to its end
  insights: { ph: "presentation-chart" }, // the owner's insight board: the funnel, lifetime value, cohort value
  settlement: { ph: "money" }, // paying a resolved market's winners once its objection window closes
  finance: { ph: "calculator" }, // the books and their proof: the trial balance, the drift
  // the operator's own book (/admin/house: what we hold, what we made) — the house as the firm, never a "home" glyph: W3's
  // review moved it off Phosphor's `house`, the universal Home mark, which beside the console's Overview read as "home"
  house: { ph: "building-office" },
  desk: { ph: "desk" }, // the Owner's desk (/admin/desk): its label's own neutral word, never a feature word (ruling 453)
  reports: { ph: "clipboard-text" }, // the statutory report library: packs prepared, signed and downloaded
  tax: { ph: "invoice" }, // the government tax report: what is owed to TRA and GBT, per day, week or month
  roster: { ph: "user-list" }, // the player roster
  cohorts: { ph: "chart-donut" }, // players in segments: by status, region, age band
  sources: { ph: "newspaper" }, // the trusted sources markets are generated and resolved from, and their categories
  rounds: { ph: "timer" }, // Up & Down's rounds, each a timed window
  weeks: { ph: "list-numbers" }, // Millionea's weeks, each fifteen numbered questions
  pools: { ph: "treasure-chest" }, // Millionea's prize pools and the jackpot
  integrity: { ph: "gavel" }, // Millionea's integrity rulings: the sales pause, voids, held shares, winners screened
  contacts: { ph: "address-book" }, // the marketing contact book
  invites: { ph: "paper-plane-tilt" }, // invitations sent (the invite campaigns)
  traffic: { ph: "chart-line" }, // the site's traffic over time
  agent: { ph: "handshake" }, // an agent: a business partner vetted, priced and paid
  privacy: { ph: "folder-user" }, // privacy requests (DSAR): one person's own data, exported, corrected or erased
  audit: { ph: "clock-counter-clockwise" }, // the audit log: what was done, in order
  approvals: { ph: "check-square-offset" }, // sign-offs waiting on an officer (KYC files with us, AML holds, source of funds)
  staff: { ph: "user-circle-gear" }, // staff accounts and the role each holds (user-gear's Fill reaches 0.25 past its box)
  // role permissions: what each role may open (W3's review: the shield already carries about five meanings, AML's warning
  // among them, so the permission is a lock with its key)
  roles: { ph: "lock-key" },
  // AI usage and credits: what the generators spent against what is left, a meter (W3's review: `activity`'s pulse already
  // means an activity log — a player's own page and the console's player Activity tab)
  aiUsage: { ph: "speedometer" },
  // (W3's review: Transactions wears `receipt`, the meaning a player's wallet receipts already carry — one record per money
  // movement; `table` read as the Overview's `layout` at 18px.)
};
