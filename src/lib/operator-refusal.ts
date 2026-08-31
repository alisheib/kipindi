/**
 * THE ADMIN REFUSAL CONTRACT — isomorphic, so both halves of the seam can name it.
 *
 * ⛔ WHY THIS IS NOT IN `lib/server/safe-error.ts` WITH ITS EMITTERS. The console that RENDERS
 * a refusal is a client component, and a client file importing from `lib/server/` to obtain a
 * type is the shape that eventually drags a server module into the browser bundle: `import type`
 * erases today, and the first person to need a value from the same file makes it a real import.
 * `src/lib/failure-reasons.ts` and `src/lib/ai-cycle-rules.ts` are both isomorphic for exactly
 * this reason — the rules live where both sides may read them, and only the EMITTERS are
 * server-side. `lib/server/safe-error.ts` re-exports these, so no call site needs to know.
 *
 * 🔴 THE ARCHITECTURE THIS ENCODES (production incident, 2026-08-31). Poll generation was
 * refused by our own AI spend cap and the operator was shown *"The AI could not produce a valid
 * poll. Try again."* The first repair passed the SERVER'S ENGLISH SENTENCE through instead —
 * which unblocked him, and was still the wrong shape. The sentence NAMES the screen that lifts
 * the block, and he read it and still had to ask *"where do I fix it, which screen?"*, because
 * a console can print prose but cannot follow it.
 *
 *     ⛔ THE SERVER SAYS WHY, IN A MACHINE TOKEN, AND CARRIES THE FIGURES AS DATA.
 *     ⛔ INTERPOLATED FIGURES COME FROM `detail`, NEVER FROM THE PROSE.
 *
 * Those two lines are quoted from `src/lib/failure-reasons.ts`, which settled this for the
 * PLAYER surface after `errorCopy` tried to recover "TZS 1,234" out of a server sentence with a
 * regex — so rewording the sentence silently dropped the figure off the player's screen.
 */

/**
 * Where the operator goes to lift the refusal — a LINK, not a sentence naming a screen.
 *
 * ⛔ `href` MUST BE A REAL, REACHABLE ROUTE (optionally with an `#anchor`), because the UI
 * renders it as a button. Prose can afford to be vague about a destination; a button cannot.
 * `test:operator-error` §6 resolves every `href` in the catalogue against the app router and
 * every `#anchor` against the `id` actually rendered on that page, because a button that goes
 * nowhere is worse than the sentence it replaced.
 */
export type RefusalFix = { label: string; href: string };

/**
 * A refusal the operator can act on, in the shape a UI can actually use.
 *
 * ⛔ `reason` IS NEVER SHOWN AND NEVER PHRASE-MATCHED. It is the switch the UI renders on.
 * ⛔ `detail` CARRIES THE FIGURES AS NUMBERS, never as substrings of `message`.
 */
export type OperatorRefusal = {
  reason: string;
  detail?: Record<string, string | number>;
  fix?: RefusalFix;
};

/**
 * Every reason the ADMIN seam can emit, and how to render it.
 *
 * ⛔ THE CATALOGUE IS DATA, SO IT CAN BE CHECKED. `docs/FAILURE-INVENTORY.md` §3.12 deleted six
 * `REASON_BY_CODE` rows that NOTHING emitted, and §3.10 found a dead phrase test hiding a live
 * wrong heading — both because the mapping was prose or a hand-list nobody could enumerate.
 * `test:operator-error` walks this object: every key must be emitted somewhere in `src/`, and
 * every emitted reason must have a key here. Neither half can rot alone.
 *
 * ⚠️ `figures` NAMES THE `detail` KEYS THIS REASON PROMISES, in render order. It is what lets a
 * guard prove the emitter and the renderer agree about a figure's NAME — the failure that
 * produced "$undefined" is a missing key, not a missing row.
 */
export type RefusalSpec = {
  /** Short operator-facing headline. */
  title: string;
  /**
   * The NEXT STEP, and ONLY the next step.
   *
   * ⛔ IT MUST NOT RESTATE THE TITLE OR THE FIGURES. The first render of this card showed the
   * title, then the figure grid, then the server's full sentence — which opens with the title's
   * exact words and repeats both figures. One fact, stated three times, on a card whose entire
   * job is to be read quickly. `message` (the server sentence) stays as the fallback for a
   * surface that does not know this reason and therefore renders no title and no figures.
   */
  body: string;
  /** `detail` keys this reason promises to carry, in the order they should render. */
  figures: readonly string[];
  /** How to format each figure for display. `usd` renders `$12.34`; `count` renders `3`. */
  format: Record<string, "usd" | "count">;
};

export const ADMIN_REFUSALS = {
  /**
   * The AI spend ceiling for the current TOP-UP WINDOW is reached.
   * ⚠️ NOT the spend CYCLE — see `ai-usage.ts`'s header. Conflating the two is what sent the
   * owner to read a healthy `$63.14 / $100` cycle card while a $20 window was refusing him.
   */
  ai_budget_exhausted: {
    title: "AI credit limit reached",
    body: "Raise the limit, or start a new top-up window after adding credit.",
    figures: ["spentUsd", "limitUsd"],
    format: { spentUsd: "usd", limitUsd: "usd" },
  },
  /** A spend cycle closed and nobody opened its successor, so AI is paused. */
  ai_cycle_ended: {
    title: "AI spend cycle complete",
    body: "AI is paused until the next cycle is opened.",
    figures: ["lastClosedIndex", "nextIndex"],
    format: { lastClosedIndex: "count", nextIndex: "count" },
  },
} as const satisfies Record<string, RefusalSpec>;

export type AdminReason = keyof typeof ADMIN_REFUSALS;

/** True when `r` carries a reason this build knows how to render as a control. */
export function isKnownRefusal(r: OperatorRefusal | undefined): r is OperatorRefusal & { reason: AdminReason } {
  return !!r && Object.prototype.hasOwnProperty.call(ADMIN_REFUSALS, r.reason);
}

/**
 * Render a refusal's figures as label/value rows.
 *
 * ⛔ A MISSING FIGURE IS OMITTED, NOT RENDERED AS "undefined". An emitter that forgets a key is
 * a defect the guard catches; a screen in front of an operator is not the place to report it.
 */
export function refusalFigures(r: OperatorRefusal): { label: string; value: string }[] {
  if (!isKnownRefusal(r)) return [];
  const spec: RefusalSpec = ADMIN_REFUSALS[r.reason];
  const out: { label: string; value: string }[] = [];
  for (const key of spec.figures) {
    const v = r.detail?.[key];
    if (v === undefined || v === null) continue;
    const n = Number(v);
    out.push({
      label: FIGURE_LABELS[key] ?? key,
      value: spec.format[key] === "usd" && Number.isFinite(n) ? `$${n.toFixed(2)}` : String(v),
    });
  }
  return out;
}

/** Operator-facing names for the figure keys. Kept beside the catalogue so a new figure
 *  without a label is visible in one place rather than surfacing as a raw key on screen. */
const FIGURE_LABELS: Record<string, string> = {
  spentUsd: "Spent this window",
  limitUsd: "Limit",
  lastClosedIndex: "Last closed cycle",
  nextIndex: "Next cycle",
};
