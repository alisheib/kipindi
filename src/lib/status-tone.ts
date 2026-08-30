/**
 * D4 — THE STATUS-COLOUR DICTIONARY. One home for word × surface × tone.
 *
 * ── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
 * `admin-status-lexicon.ts` made a status WORD have one definition site. Nothing
 * did the same for its COLOUR, so the same word was painted differently depending
 * on which file happened to render it — and not one of the divergences was written
 * down, so a reader could not tell a decision from a drift. Measured 2026-08-21:
 *
 *   · LIVE      — red-rose to a player · success-green in the console · royal on /proposals
 *   · RESOLVED  — a solid gilt gradient to a player · soft translucent gilt in the console
 *   · CLOSED    — royal to a player · amber in the console
 *   · PENDING   — royal to a player · amber in the console
 *   · APPROVED  — green in the KYC queue · a solid gold gradient on /proposals
 *   · REJECTED  — rose in KYC/DSAR · slate on the objection queue · claret on /proposals
 *   · OPEN      — info-royal to a player · claret on the objection queue
 *
 * ⭐ ALI'S RULING (2026-08-21), applied at its stated default. The table below IS the
 * shipped state, with exactly three corrections:
 *
 *   1. **APPROVED is success-green everywhere.** /proposals loses its gold gradient —
 *      DESIGN_AUTHORITY §M3: struck gold means money that was EARNED, and an approval
 *      is not money. (KYC and the three AI queues were already green.)
 *   2. **PENDING is royal everywhere.** The console loses amber for it.
 *   3. **CLOSED is royal everywhere.** The console loses amber for it.
 *
 * ⛔ AND ONE DIVERGENCE IS KEPT ON PURPOSE — see `STATUS_TONE_EXCEPTIONS`. A drift
 * that is written down as a decision stops being a drift; an undocumented one gets
 * "fixed" by the next session in whichever direction they read first.
 *
 * ── WHAT A "TONE" IS, AND WHY IT IS NOT A CHIP VARIANT ───────────────────────
 * A tone is the DESIGN fact — "royal", "green", "struck gilt". A chip variant is the
 * kit's expression of it, and one tone legitimately has more than one expression
 * (`pending` and `active` are both royal, at different alphas and heights). Recording
 * the tone means the dictionary survives a kit rename, and it is the level the rule in
 * DESIGN_AUTHORITY §B11 is written at.
 *
 * ⛔ NO COLOUR VALUE IS WRITTEN HERE. Every tone resolves to a kit `<Chip variant>`,
 * whose paint lives in `src/components/ui/chip.tsx` and `globals.css` — §0d.
 */

/** The three surfaces the audit measured. `/proposals` is a player surface but is
 *  counted separately because it renders a proposal's OWN lifecycle, not a market's. */
export type StatusSurface = "player" | "admin" | "proposals";

/** The design words for the colour families a status chip may wear. */
export type StatusTone =
  /** brand royal — the neutral "in flight, nothing is wrong" tone */
  | "royal"
  /** success green — a thing an officer or a player asked for has happened */
  | "green"
  /** amber — an officer must DO something that is not simply waiting */
  | "amber"
  /** rose — refused, failed, or a restricted account */
  | "rose"
  /** bright red broadcast — "this is happening NOW", the player-facing live pill */
  | "broadcast"
  /** soft translucent gilt — settled money, at console weight */
  | "gilt"
  /** struck gilt gradient — settled money, at the player's celebration weight (§M3) */
  | "giltStruck"
  /** claret — irreversible operator ceremony, and editorial weight (§B4) */
  | "claret"
  /** slate — terminal, inert, or "nothing here yet" */
  | "slate";

/**
 * The nine `<Chip variant>` names a STATUS is allowed to wear.
 * ⛔ Not a second definition of the chip's variant set — a NARROWING of it. A wrong
 * name here is a compile error at the `<Chip variant={…}>` call site, not a silent
 * repaint, because these strings are checked against the kit's own union there.
 */
export type StatusChipVariant =
  | "pending" | "success" | "warning" | "danger" | "live"
  | "gold" | "resolved" | "claret" | "neutral";

/** Tone → the kit chip that expresses it. THE one translation. */
export const TONE_CHIP = {
  royal:      "pending",
  green:      "success",
  amber:      "warning",
  rose:       "danger",
  broadcast:  "live",
  gilt:       "gold",
  giltStruck: "resolved",
  claret:     "claret",
  slate:      "neutral",
} as const satisfies Record<StatusTone, StatusChipVariant>;

/**
 * ⭐ THE DICTIONARY. Keyed by the WORD a human reads, because that is the level the
 * defect lives at — a player and an officer looking at the same word.
 *
 * A missing surface means the word is not rendered there; reading it is a compile
 * error rather than a guess.
 */
export const STATUS_TONE = {
  /** ⛔ THE ONE KEPT SPLIT — see `STATUS_TONE_EXCEPTIONS.LIVE`. */
  LIVE:     { player: "broadcast", admin: "green", proposals: "royal" },
  /** Betting is shut and the market is waiting to be resolved. Nothing is wrong,
   *  so it is royal — the console's amber said otherwise until 2026-08-21. */
  CLOSED:   { player: "royal", admin: "royal" },
  /** Waiting on a queue. Royal for the same reason: waiting is not a warning. */
  PENDING:  { player: "royal", admin: "royal", proposals: "royal" },
  /** Settled money. The player gets the struck seal (§M3, §M7); the console gets the
   *  soft gilt, because an operator reading a hundred rows is not being congratulated. */
  RESOLVED: { player: "giltStruck", admin: "gilt", proposals: "giltStruck" },
  /** ⭐ ADDED 2026-08-30 (DG-P-10). The market or round settled to NOTHING and every
   *  stake came back. MEASURED, not chosen — §B11's Player column records the shipped
   *  state, and five player surfaces already paint this word royal (`market-card`,
   *  `home/trust-band`, `updown/history`, `markets/resolution-panel`, `results`): a
   *  refund is not a fault, which is the same reason CLOSED and PENDING are royal. The
   *  console's market table paints it SLATE — terminal and inert, sitting beside DRAFT.
   *  ⛔ There is a THIRD tone and it is a decision, not a drift — see
   *  `STATUS_TONE_EXCEPTIONS.VOID`. */
  VOID:     { player: "royal", admin: "slate" },
  /** A decision went the applicant's way. NEVER gold: an approval is not earned money. */
  APPROVED: { admin: "green", proposals: "green" },
  /** A decision went against them. See `STATUS_TONE_EXCEPTIONS.REJECTED`. */
  REJECTED: { admin: "rose", proposals: "claret" },
  /** An OPEN objection FREEZES a market's money, which is why the console's is claret
   *  and a player's own open position is not. */
  OPEN:     { player: "royal", admin: "claret" },
} as const satisfies Record<string, Partial<Record<StatusSurface, StatusTone>>>;

/**
 * ⛔ THE DIVERGENCES THAT ARE DECISIONS, STATED AS DECISIONS.
 *
 * Anything in here is deliberate and must not be "harmonised" by a later session.
 * Anything NOT in here and not in the table above is drift, and drift gets fixed.
 */
export const STATUS_TONE_EXCEPTIONS = {
  /**
   * LIVE is the one word that is a different colour on purpose, because it is two
   * different facts wearing one word:
   *   · to a PLAYER it is a broadcast — "this is open, money is moving, act now" —
   *     and the red live-pill is the platform's oldest and loudest such signal;
   *   · to an OFFICER it is operational health — "this market is up" — sitting in a
   *     column beside DRAFT and VOIDED, where red would read as an incident.
   * Painting both the same would make one of the two lie about what it is for.
   * The third arm (royal on /proposals) is the proposal's own lifecycle step, not a
   * market broadcast, and was left as shipped — it is the one arm Ali's ruling did
   * not adjudicate.
   */
  LIVE: "Two facts, one word: player broadcast (red) vs console ops-health (green). /proposals keeps royal as a lifecycle step.",
  /**
   * REJECTED is rose in KYC/DSAR (a person was refused), claret on /proposals (an
   * editorial decline, §B4), and deliberately SLATE on the objection queue — a
   * rejected objection is a CLOSED file, and rose there would read as though the
   * player had done something wrong by objecting.
   */
  REJECTED: "Rose in KYC/DSAR · claret on /proposals · slate on the objection queue (a closed file, not a fault).",
  /**
   * CLOSED-the-lifecycle-stage (a market between betting and settlement) is royal.
   * CLOSED-the-account (a player who left) stays SLATE: it is terminal and inert, and
   * royal would give a dead account the tone of a live one. The ruling's operative
   * clause is that the console loses AMBER for CLOSED — slate was never amber.
   */
  CLOSED: "Royal as a market lifecycle stage; SLATE as a terminal account state — royal would make a dead account look live.",
  /**
   * ⭐ ADDED 2026-08-30 (DG-P-10). VOID is the SECOND word with more than one tone, and
   * unlike LIVE nobody had written it down — which is exactly how it acquired THREE:
   *   · a PLAYER sees royal — a refund is not a fault, and their stake is back;
   *   · the console's market table sees SLATE — terminal and inert, beside DRAFT;
   *   · the RESOLVER's settlement ceremony sees CLARET, because voiding a market is an
   *     irreversible operator act and §B4a gives that class of act its own colour.
   * The first two are in the table above because they are the ordinary reading of the
   * word; the claret is the exception, and it is the SAME reason claret already carries
   * everywhere else in the console.
   *
   * ⚠️ `components/admin/status-badge.tsx` hard-types `VOIDED: "neutral"` under a comment
   * saying slate "is not in the dictionary because no other surface disagrees about it".
   * That clause is FALSE at HEAD — verified 2026-08-30: `app/admin/resolver/[id]/page.tsx`
   * renders the word VOIDED in claret, and the five player surfaces listed above render it
   * royal. This entry is the record; correcting that file's comment and pointing its
   * `VOIDED` arm at `TONE_CHIP[STATUS_TONE.VOID.admin]` belongs to the CONSOLE's migration,
   * which owns that file. Both arms above are what those surfaces already paint, so nothing
   * repaints when it lands.
   */
  VOID: "Royal to a player (a refund is not a fault) · slate in the console market table (terminal, inert) · claret in the resolver's settlement ceremony (§B4a, an irreversible operator act).",
} as const satisfies Partial<Record<keyof typeof STATUS_TONE, string>>;
