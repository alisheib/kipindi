import { Callout } from "@/components/ui/callout";
import type { ConsoleWhyIdleView } from "@/lib/server/house-console-read";

/**
 * ⭐ "WHY IS IT NOT STAKING?" — THE ANSWER, IN THE CONSOLE'S OWN SENTENCES. Every line here is `CONSOLE_SKIP_SENTENCE`
 * — the engine's outcomes in the officer's words, from the one copy home (rulings 370(c), 453) — so a screen and a
 * feed never describe the same refusal two ways. ⛔ The count column is `shrink-0` beside a `min-w-0` sentence
 * (432(b)): a long reason wraps, the number never does.
 *
 * ⛔ A REMOVED ACCOUNT GETS NOTHING, DECIDED HERE AS WELL AS AT THE DOOR (2026-09-26). `houseWhyIdleForConsole`
 * already refuses a removed account, so on today's code this guard never fires — which is why, as a bare
 * `{!view.removed && (` wrapper on the page, it could not fail at all and existed only so 1.435's literal count
 * reached twelve. As a component it is RENDERED by `test:house-bot-console` 1.435b with a live answer and
 * `removed: true`, so dropping it turns a case red for a reason a reader can state: the moment the door stops
 * refusing, a removed account would be told why it is not staking.
 * ⛔ A PURE FUNCTION OF ITS PROPS — no hook, no router — which is what lets the suite render it outside the shell.
 */
export function AccountWhyPanel({ removed, why }: { removed: boolean; why: ConsoleWhyIdleView | null }) {
  if (removed || why == null) return null;
  return (
    <Callout tone="neutral" title="Why is it not staking?">
      {why.headline}
      {why.reasons.length > 0 && (
        <ul className="mt-3 space-y-1">
          {why.reasons.map((r) => (
            <li key={r.text} className="flex items-baseline justify-between gap-4">
              <span className="min-w-0">{r.text}</span>
              <span className="tabular-nums shrink-0">{r.markets}</span>
            </li>
          ))}
        </ul>
      )}
      {why.scanned && <p className="text-caption mt-3">{why.scanned}</p>}
    </Callout>
  );
}
