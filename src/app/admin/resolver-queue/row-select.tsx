"use client";

/**
 * ONE ROW'S TICK BOX, ITS AUTO-RESOLVE VERDICT, AND — when the floor refused it — the box
 * where the officer types why they are sealing it anyway.
 *
 * 🔴 THE VERDICT LINE IS THE ACTUAL FIX. Before it, this card showed *"97% confidence"*
 * and a chip reading *"not the approved source"*, and NOTHING said those two facts were
 * connected or that the second one is why the market was still sitting there. An officer
 * with auto-resolve switched on saw a high number and silence, and reported the resolver
 * as broken. It was refusing, correctly, and never said so.
 *
 * ⛔ TWO COMPONENTS, NOT ONE, AND THE SPLIT IS A LAYOUT LAW RATHER THAN A PREFERENCE.
 * `<RowCheck>` is the 44px tick box and lives in the card's header flex row. `<RowVerdict>`
 * is the sentence and lives FULL WIDTH in the card body. Putting the sentence in the narrow
 * header column is what an earlier draft did, and a grid item's `min-content` forces its
 * track: a chip carrying *"The AI read a different site from this market's approved source"*
 * has a min-content width of the longest word plus its padding, the header column is
 * `shrink-0`, and the card is a `lg:grid-cols-2` item — so the whole card grew past its
 * track. This platform has already shipped 441px cards into a 358px page exactly that way.
 *
 * ⛔ IT PAINTS; IT DOES NOT DECIDE. Every field of `verdict` was derived on the server and
 * is re-derived there before anything is sealed. Nothing here is an input to a money
 * decision — a browser's opinion of a row is an attacker's opinion of a row.
 *
 * ⛔ NO SERVER ACTION IS IMPORTED HERE, deliberately: these components tick a box and paint
 * a sentence, and the act-gate belongs on the control that SUBMITS.
 */

import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Chip } from "@/components/ui/chip";
import { I } from "@/components/ui/glyphs";
import { useBulkSelection } from "./bulk-selection";
import { BULK_REASON, bulkReasonDetail } from "./bulk-verdict-copy";
import { BULK_VERDICT } from "@/lib/admin-status-lexicon";
import type { BulkVerdictView } from "./bulk-resolve-types";

/** The tick box alone. Fixed 44px, `shrink-0`, and NOTHING that can widen a track. */
export function RowCheck({ marketId, title }: { marketId: string; title: string }) {
  const { selected, toggle, extendTo } = useBulkSelection();
  const on = selected.has(marketId);

  /**
   * ⛔ SHIFT IS CAPTURED, NOT HANDLED. The obvious shape — an `onClick` on a wrapper that
   * reads `e.shiftKey` — breaks the KEYBOARD: the kit Checkbox hides a real
   * `<input type="checkbox">` and a wrapper click handler never sees a space-bar press, so
   * the control would be mouse-only while looking perfectly accessible. So the modifier is
   * recorded on the way down and the single `onChange` — which fires for a click AND for
   * the space bar — decides what it means.
   */
  const shiftRef = React.useRef(false);

  return (
    <div
      onMouseDownCapture={(e) => { shiftRef.current = e.shiftKey; }}
      onKeyDownCapture={(e) => { shiftRef.current = e.shiftKey; }}
    >
      {/* ⛔ THE 44px HIT AREA IS THE LABEL ITSELF, not a wrapper around it: a wrapper's
          padding is dead space that looks tappable and is not. Literal `min-h/min-w`, never
          `h-8`/`h-10` — this project OVERRIDES Tailwind's numeric spacing scale (`h-8` is
          48px here, `h-10` is 80px), so a scale class silently means something else. */}
      <Checkbox
        checked={on}
        className="min-h-[44px] min-w-[44px] justify-center"
        onChange={() => {
          if (shiftRef.current) extendTo(marketId);
          else toggle(marketId);
          shiftRef.current = false;
        }}
        ariaLabel={`Select ${title}`}
      />
    </div>
  );
}

/** The sentence. Full width, inside the card body, free to wrap. */
export function RowVerdict({
  marketId,
  verdict,
  canOverride,
}: {
  marketId: string;
  verdict: BulkVerdictView;
  /** Does THIS officer hold the compliance grant the override needs? When false the row
   *  states the refusal and offers no box — a control that bounces is worse than a locked
   *  one, and pressing it writes a privilege-escalation row against an honest officer. */
  canOverride: boolean;
}) {
  const { selected } = useBulkSelection();
  const on = selected.has(marketId);
  const reason = verdict.reason;
  // ⛔ `verdict.threshold`, not a prop. The floor is a PER-MARKET config value, so the row
  // states the one it was actually refused against.
  const detail = bulkReasonDetail(verdict);
  const chip = reason ? BULK_REASON[reason] : null;
  const needsOverride = on && !verdict.eligible && verdict.overridable;

  return (
    <div className="px-4 py-3 border-b border-border">
      {/* ⭐ ALWAYS RENDERED — an eligible row says so as plainly as a blocked one, because
          "nothing is shown" is exactly the state that was misread as broken. */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {verdict.eligible ? (
          <Chip size="sm" variant="success" title={verdict.modeIsAuto
            ? "This market clears every clause of the platform's auto-resolve floor."
            : "This market clears the auto-resolve floor. Resolution mode is set to human, so nothing seals it automatically — the bulk bar will."}>
            {verdict.modeIsAuto ? BULK_VERDICT.eligibleAuto.en : BULK_VERDICT.eligible.en}
          </Chip>
        ) : chip ? (
          <Chip
            size="sm"
            variant={chip.variant}
            /* ⛔ EVERY standing reason in the tooltip, not just the headline. A row blocked
               on two clauses that names one is the same silence this whole change exists
               to end, one level down. */
            title={verdict.all.map((r) => BULK_REASON[r].label).join(" · ")}
          >
            {chip.label}
          </Chip>
        ) : null}
        {detail && (
          <span className="font-mono text-caption leading-tight text-text-subtle">{detail}</span>
        )}
      </div>

      {needsOverride && (
        <div className="mt-2">
          {canOverride ? (
            /* ⭐ THE BOX MOVED TO THE BAR; THE ROW STILL DECLARES ITSELF.
               One reason is typed once, in the bulk bar, and recorded against every row in
               this list — so what belongs HERE is not a second input but the sentence that
               tells the officer this row is one of the ones that reason will cover. Leaving
               the row silent would have made the shared field look like it applied to the
               selection as a whole, including the rows that seal cleanly. */
            <p className="flex items-start gap-1.5 rounded-md border border-warning/50 bg-warning/5 px-3 py-2 font-mono text-caption leading-relaxed text-warning">
              <I.shieldAlert s={11} className="mt-0.5 shrink-0" />
              <span>Needs an override. The reason you type in the bar below is recorded against this market by name.</span>
            </p>
          ) : (
            /* Same shape as the page's other locked controls: state WHY the control is
               absent, and never offer a box the server will refuse. */
            <p className="flex items-start gap-1.5 rounded-md border border-border bg-bg-overlay px-3 py-2 font-mono text-caption leading-relaxed text-text-subtle">
              <I.lock s={11} className="mt-0.5 shrink-0" />
              Sealing a market the citation gate refused needs compliance access. This one will be skipped.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
