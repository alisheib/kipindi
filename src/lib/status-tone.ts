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
  // ── Agent programme (2026-09-07) ──────────────────────────────────────────
  /** An officer proposed it and nobody has answered yet. Waiting — royal. */
  INVITED:  { player: "royal", admin: "royal" },
  /** The applicant is still assembling documents. Inert to an officer — slate. */
  DRAFT:    { player: "royal", admin: "slate" },
  /** The applicant has done their part. To the officer it is work to DO — amber. To the
   *  applicant it is waiting — royal (the same reason PENDING is royal). */
  UNDER_REVIEW: { player: "royal", admin: "amber" },
  /** The mirror: the APPLICANT must do something — amber for them; the officer waits — royal. */
  ADDITIONAL_INFO_REQUIRED: { player: "amber", admin: "royal" },
  /** The invitee said no, or the draft lapsed. Terminal, nobody's fault — slate. */
  DECLINED: { player: "slate", admin: "slate" },
  EXPIRED:  { player: "slate", admin: "slate" },
  /** The partnership ended. Terminal and inert — slate (⛔ not rose: an ended contract is
   *  not a refusal, and the person may apply again). */
  REVOKED:  { player: "slate", admin: "slate" },
  /** Agent standing. Deactivated is a PAUSE an officer applied — amber on the console (the
   *  officer may need to act on it again), slate to the agent (inert, nothing to do). */
  DEACTIVATED: { player: "slate", admin: "amber" },
  /* ⭐ Agent standing + invitation lifecycle (2026-09-07): the console's chips read these, never a
     variant typed beside the label. SUSPENDED reads claret (an officer's hold, reversible);
     SELF_EXCLUDED rose (the person's own lock, and the one that ends a partnership). */
  ACTIVE:   { admin: "green" },
  SUSPENDED: { admin: "claret" },
  SELF_EXCLUDED: { admin: "rose" },
  ISSUED:   { admin: "royal" },
  ACCEPTED: { admin: "green" },
  // ── A PLAYER'S OWN POSITION (2026-09-08 · PLAYER QUERY, stage 5) ───────────────────────────
  /**
   * ⭐ THREE OF THE FIVE `PositionStatus` VALUES HAD NO ENTRY HERE, so `position-card.tsx`
   * hand-typed its chip variant in a ternary beside the status label — the exact shape §B11 names
   * as a defect ("a chip variant hand-typed beside a status label"). `home/trust-band.tsx` was
   * already doing it correctly and is the pattern this follows.
   *
   * ⛔ THIS IS WHAT STOPS THE NEW *Refunded* LENS AND THE CARD IT FILTERS TO FROM DISAGREEING
   * ABOUT WHAT REFUNDED LOOKS LIKE. Stage 4 gave five player surfaces a `void` pill; the card is
   * where the row lands, and until now its colour for that word came from a different place than
   * every other surface's.
   *
   * ⚠️ MEASURED, NOT CHOSEN — §B11's Player column records the SHIPPED state. Each tone below is
   * what the card already paints, resolved through `TONE_CHIP`, except the two divergences that
   * are named in `STATUS_TONE_EXCEPTIONS` as decisions.
   */
  /**
   * ⭐ `gilt` RESOLVES TO THE `gold` VARIANT — byte-identical to what the card paints today, and
   * that is Ali's ruling verbatim: *"WIN carries `gold` verbatim. `test:gold-is-money` passes
   * today because a winning position IS a money outcome. Normalising it to `success` for tidiness
   * would give that gate an opinion."* ⛔ Do not "harmonise" this to green.
   */
  WIN:  { player: "gilt" },
  /**
   * ⛔ THE STATUS READING IS ROSE — but the card paints the BETTING rose, which is a different
   * token, and that is a DECISION. See `STATUS_TONE_EXCEPTIONS.LOSS`.
   */
  LOSS: { player: "rose" },
  /**
   * ⭐ SLATE, AND IT IS THE VOCABULARY'S OWN ANSWER — Ali's ruling, 2026-09-09.
   *
   * This entry shipped as `amber` because amber is what the card painted, recorded as measured
   * rather than repainted, with the mismatch filed for a human instead of corrected in passing.
   * The answer came back `slate`: amber means *somebody must act* (§B11 says "an officer must do
   * something that is not simply waiting"; `ADDITIONAL_INFO_REQUIRED` gives the player half of the
   * same rule), and a cashed-out position is **terminal** — settled, paid, asking nothing of
   * anyone. `slate` is defined one screen up as *"terminal, inert, or 'nothing here yet'"*, which
   * is exactly what this word is.
   *
   * ⚠️ THE CONSOLE STILL PAINTS THIS WORD AMBER, AND THAT IS RECORDED RATHER THAN SWEPT UP.
   * `src/app/admin/markets/[id]/page.tsx` carries a file-local `STATUS_VARIANT` with
   * `CASHED_OUT: "warning"`, and this entry has no `admin` arm to route it through. §B11 is *one
   * word, one tone, PER SURFACE*, so a player/console split is legal — but an unwritten one is the
   * drift B11 exists to prevent, and admin is out of scope by Ali's standing ruling. Named here so
   * whoever next opens that console page finds the reason instead of a puzzle.
   *
   * ⛔ There is no `STATUS_TONE_EXCEPTIONS` entry for this word any more, deliberately. It was
   * deleted rather than amended, on the instruction the old note itself carried — an exceptions
   * key for a word that is no longer an exception would freeze this tone against future correction
   * by paperwork.
   */
  CASHED_OUT: { player: "slate" },
} as const satisfies Record<string, Partial<Record<StatusSurface, StatusTone>>>;

/**
 * ⭐ THE PLAYER-SURFACE ACCESSOR (2026-09-08 · PLAYER QUERY, stage 5.3).
 *
 * ⛔ WHY IT IS A FUNCTION AND NOT AN INDEX AT THE CALL SITE. `STATUS_TONE` is `as const`, so its
 * value type is a UNION of the entry shapes — and not every entry has a `player` arm (`APPROVED`
 * and `ACTIVE` are console-only). Reading `.player` off that union is a type error, and the
 * obvious way around it at a call site is a cast — which is how a surface ends up reading a tone
 * the dictionary never gave it.
 *
 * ⚠️ IT RETURNS `null`, NOT A DEFAULT. A word with no player entry is a word this dictionary has
 * no opinion about on a player surface, and that is a different fact from "royal". The caller
 * supplies its own fallback and can SEE itself doing so — Ali's ruling: *"A bare map lookup
 * returning `undefined` is an untoned chip that no gate would catch."*
 */
export function playerStatusChip(word: string): StatusChipVariant | null {
  const entry = (STATUS_TONE as Record<string, Partial<Record<StatusSurface, StatusTone>>>)[word];
  const tone = entry?.player;
  return tone ? TONE_CHIP[tone] : null;
}

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
  /**
   * ⭐ ADDED 2026-09-08 (PLAYER QUERY, stage 5.2) — ALI'S RULING, recorded as a decision so it
   * stops looking like a drift: *"`LOSS` keeps the betting rose, recorded in
   * `STATUS_TONE_EXCEPTIONS` with its reason — a lost bet is betting semantics."*
   *
   * ⛔ THE DIVERGENCE IS NOT PLAYER-vs-CONSOLE, IT IS STATUS-vs-BETTING, and that is why it needs
   * writing down. Every other entry in this dictionary resolves through `TONE_CHIP`, whose nine
   * variants are the STATUS vocabulary. `LOSS` on a position card paints the `no` variant — the
   * BETTING rose, the same colour the card's own side chip uses for the No side, one row above it.
   *
   * ⚠️ THEY ARE DIFFERENT TOKENS, MEASURED: `no` is `ROSE`; `rose` resolves to `danger`, which is
   * `oklch(55% 0.20 25 / 0.22)` — a redder, hotter red. Harmonising `LOSS` onto `danger` would
   * paint a lost bet in the platform's FAILURE colour, and a bet that lost is not a failure of
   * anything: it is the ordinary other half of a two-sided market. ⛔ It would also put a
   * different red beside the No chip it sits next to, on the same card, in the same row.
   *
   * ⭐ SO THE CARD KEEPS AN EXPLICIT `"no"` ARM rather than reading `TONE_CHIP[STATUS_TONE.LOSS…]`,
   * and the arm carries a pointer back to this entry. The table's `rose` records what the STATUS
   * reading would be — for any surface that renders the word outside a betting context — and this
   * note records why the card does not use it.
   */
  LOSS: "Betting rose (`no`) on a position card — the same red as the No side chip beside it — NOT the status `rose`/`danger`, which is the platform's failure colour. A bet that lost is the ordinary other half of a two-sided market, not a fault.",
  /*
   * ⛔ `CASHED_OUT` USED TO HAVE AN ENTRY HERE AND IT IS GONE ON PURPOSE — answered by Ali
   * 2026-09-09, and the note it replaced carried the instruction followed here verbatim: *"if the
   * answer is slate, the table entry changes and this note is deleted, not amended."*
   *
   * ⭐ WHY DELETION IS THE CORRECT EDIT AND NOT PEDANTRY. This map's own contract, one screen up,
   * is that everything in it is DELIBERATE and must not be "harmonised". An entry for a word that
   * is no longer an exception would invert that protection: it would tell every future reader that
   * `slate` on a terminal state is a considered divergence to be preserved, when it is simply the
   * dictionary being obeyed. The exceptions list only means something while every line in it is
   * still an exception.
   */
} as const satisfies Partial<Record<keyof typeof STATUS_TONE, string>>;
