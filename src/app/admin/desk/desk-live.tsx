"use client";

/**
 * THE DESK'S ONE LIVE TRIGGER — one `RefreshPoller`, in the strip, on `LIVE_ROUND_MS` (C7-SPEC ruling 316, built at
 * C7 step 3 under replan ruling 473).
 *
 * ⛔ IT LIVES IN THE STRIP, AND THAT IS WHY THERE IS ONLY ONE. The strip renders ABOVE the rail on every tab (ruling
 * 406), so a tab switch never remounts this and the page never ends up with two timers racing each other.
 *
 * ⛔ `enabled` COMES FROM REACT STATE, NEVER FROM A DOM QUERY. A `document.querySelector("[role=dialog]")` answers
 * "is a dialog in the DOM", not "is one VISIBLE" — a CLOSED dialog left in the tree once silenced the reality check
 * and the social links on `/markets`, and the correct question is always whether it is on screen. So the hold is a
 * NUMBER in React state and the only way to raise it is to say so.
 *
 * ⛔ AND IT NAMES NO NOTIFICATION KIND (ruling 386). The strip mounts `useEventStream()` itself — nothing else does on
 * `/admin`, because `AppShell` returns bare children there — and passes the GENERIC window event `EVENT_MAP` gives
 * `notification:new`. ⛔ NOT the literal `notification:new`, which is the SSE wire type and is dispatched on `window`
 * by nothing at all. No `detail.notification.kind` is inspected: `notification:new` is user-scoped, so the stream
 * only ever forwards the signed-in officer's own notices, and a kind comparison here would put the literal
 * `HOUSE_BOT` into a client chunk — a hit in `test:house-bot-disclosure` 1.1 and in the bundle scan.
 *
 * ⛔ NOTHING HOUSE REACHES THIS FILE (rulings 384, 401): no import from `@/lib/house-bot/**`,
 * `@/lib/server/house-bot/**`, the DAL or the gate module, by value OR by type. It receives one boolean.
 *
 * ⚠️ WHY 20 s AND NOT 30. `LIVE_ROUND_MS` is the platform's own live cadence, and ruling 353's engine-staleness
 * threshold is 30 s — so a stale engine becomes visible within at most two polls. The default `intervalMs` of 30 s
 * would make that up to three, with a threshold the same size as the gap.
 */
import { useEffect, useState } from "react";
import { RefreshPoller } from "@/components/ui/refresh-poller";
import { useEventStream } from "@/lib/use-event-stream";
import { LIVE_ROUND_MS } from "@/lib/refresh-cadence";

/**
 * Raise the hold while a dialog is open or a form is dirty; drop it when the dialog closes or the form is saved.
 * ⛔ COUNTED, NOT A BOOLEAN: two holds and one release must not leave the page refreshing under the second one.
 */
export const DESK_HOLD_EVENT = "50pick:desk:hold";
export const DESK_RELEASE_EVENT = "50pick:desk:release";

/**
 * ⛔ THE PREDICATE IS PURE AND EXPORTED, so all three of its branches are asserted DIRECTLY rather than through a
 * render that can only reach one of them today. Ruling 316: refresh only while something can still change on its own
 * (`live`, decided on the server from the switch and the roster's own statuses) and nothing is being edited.
 */
export function deskPollerEnabled(live: boolean, holds: number): boolean {
  return live && holds === 0;
}

export function DeskLive({ live }: { live: boolean }) {
  /* The console's own SSE connection. `AppShell` returns bare children for `/admin`, so no stream mounts here
     otherwise and the poller's immediate-refresh listener would never fire. */
  useEventStream();
  const [holds, setHolds] = useState(0);

  useEffect(() => {
    const up = () => setHolds((n) => n + 1);
    const down = () => setHolds((n) => (n > 0 ? n - 1 : 0));
    window.addEventListener(DESK_HOLD_EVENT, up);
    window.addEventListener(DESK_RELEASE_EVENT, down);
    return () => {
      window.removeEventListener(DESK_HOLD_EVENT, up);
      window.removeEventListener(DESK_RELEASE_EVENT, down);
    };
  }, []);

  return (
    <RefreshPoller
      intervalMs={LIVE_ROUND_MS}
      eventName="50pick:sse:notification"
      enabled={deskPollerEnabled(live, holds)}
    />
  );
}
