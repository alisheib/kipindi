/**
 * U37b · ONE VARIANT'S COUNTER ROW — presentational, fed one `VariantCounter` (`counterFor`, the ONE worst-case counter
 * in `campaign-template.ts`). ⛔ It sizes nothing itself: no sizer, no encoder, no budget arithmetic here — the figures
 * are the counter's, and the counter's are the renderer's (`test:campaign-compose` §16.2).
 *
 * ⭐ THE LIVE REGION SPEAKS ONLY ON A CHANGE THAT MATTERS: its text is `counterAnnounce` — fits / over / Unicode — which
 * does not move while the officer types inside one message, so a screen reader is not read a number on every key. The
 * visible line ("80 characters left · 1 message · GSM-7") updates per keystroke beside it, wrapping only at " · ".
 * ⭐ UCS-2 IS A REFUSAL WITH THE OFFENDER NAMED ("Forced to Unicode by: ’ (curly apostrophe)"), and "Replace with plain
 * characters" is offered when ANY offender has a plain twin (`foldOffered`) — the fold swaps those, and whatever has
 * no twin (an emoji) stays named here on its own (validation audit, 2026-10-03: one emoji hid the button for a quote).
 * ⛔ The cap is `SMS_MAX_SEGMENTS`, the ONE cap — never a literal here.
 */
import { Button } from "@/components/ui/button";
import type { VariantCounter } from "@/lib/marketing/campaign-template";
import { SMS_MAX_SEGMENTS } from "@/lib/sms-compose";
import {
  COMPOSE_AS_WRITTEN, COMPOSE_FOLD, COMPOSE_FORCED, COMPOSE_JINA_RESERVE, counterAnnounce, counterLine,
  foldOffered,
} from "./composer-copy";

export function ComposerCounter({
  counter, disabled, onFold,
}: {
  counter: VariantCounter;
  disabled: boolean;
  onFold: () => void;
}) {
  const over = counter.left < 0 || counter.segments > SMS_MAX_SEGMENTS;
  const unicode = counter.encoding === "UCS2";
  const foldable = foldOffered(counter);
  return (
    <div className="mt-2 space-y-1.5" data-counter={counter.variant} data-counter-state={unicode ? "unicode" : over ? "over" : "fits"}>
      <p className={`text-body-sm tabular-nums ${over || unicode ? "text-danger-fg" : "text-text-secondary"}`} data-counter-line>
        {counterLine(counter)}
      </p>
      {/* ⭐ The announcement: one of three sentences, unchanged while the officer types inside one message. */}
      <p className="sr-only" aria-live="polite" data-counter-live={counter.variant}>{counterAnnounce(counter)}</p>
      {unicode && counter.offenders.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1" data-counter-unicode>
          <span className="text-body-sm text-danger-fg">{`${COMPOSE_FORCED} ${counter.offenders.map((o) => o.label).join(", ")}`}</span>
          {foldable && (
            <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={onFold} data-counter-fold>
              {COMPOSE_FOLD}
            </Button>
          )}
        </div>
      )}
      {/* The owner's ruling of 2026-10-09: the message is sent exactly as written — no footer, no stop link, no source line. */}
      <p className="text-body-sm text-text-tertiary" data-counter-as-written>{COMPOSE_AS_WRITTEN}</p>
      {counter.jinaReserve > 0 && <p className="text-body-sm text-text-tertiary" data-counter-jina>{COMPOSE_JINA_RESERVE}</p>}
    </div>
  );
}
