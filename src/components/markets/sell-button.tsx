"use client";

/**
 * Sell button — cash out an open position before resolution.
 * Shows the live cash-out value with the slippage already applied,
 * a confirm flow, and a result toast.
 *
 * The current value is computed server-side and passed in as `value`. We
 * don't recalculate on the client because pool composition changes second
 * by second; the value displayed here is the moment we render — the
 * server re-runs the math when the action fires.
 *
 * ⛔ THE FREE-EXIT COUNTDOWN RUNS TO THE SERVER'S INSTANT (`freeUntil`), NEVER TO A WINDOW BUILT
 * HERE. How long a free exit lasts is each poll's FROZEN grace, and only the server reads it:
 * `freeExitEndsAt` (market-service) takes it through the same `exitWindowFacts` that
 * `cashOutValue` sells by. A constant five-minute grace on this side told a poll frozen at 2
 * minutes it could still sell free after the server had locked the exit, and cut a 10-minute
 * poll's free window in half on screen (S6 A8). `test:sell-grace-truth` holds both halves.
 *
 * ⭐ THE FIRST RENDER DRAWS WHAT THE COUNTDOWN WILL KEEP, AND A RENDER BROUGHT BACK IS NO OFFER (S6 A8e, for every
 * player, both looks). The countdown's first value is the time its instant had left at the server's own render
 * (`serverNow`), read from the props alone, so the server's paint, the browser's hydrating render and every later
 * mount draw the arm the countdown then keeps: inside the free window the strip and the free price, never
 * "Uza sasa · TZS 3,600 −0 ada" until an effect has run; and a shut exit says "Kuuza kumefungwa" from the server's
 * paint on. A price the server priced with a fee (`pricedFree === false`) is never drawn free, not even for the one
 * commit before the countdown catches up. A render the router brings back for Back or Forward — a page it mounts
 * again, or new props for buttons already on the page when only the address's query differs — is recognised by its
 * position and `serverNow`, which a button in this tab has drawn and no button draws now (the record below the
 * imports): until a fresh render arrives either look withdraws its price ("Inapakia…", no figure, nothing to press),
 * and the page is asked once for the server's answer. A first load, however slow, is never one.
 * `test:sell-grace-truth` holds it: 3.first, 3.state and 3.restore the button, 2.now and 2.poller its hosts, and
 * 4.premise the router it reads.
 *
 * ⭐ TWO LOOKS, ONE SALE (the Vodacom plan S6, WP10). With no `look` this draws today's markup and words, byte for byte,
 * for every host. The journey's ticket card alone asks for `look="journey"`, the S4 frame s4-9-tiketi-open in the kit's
 * tokens. In the free window: "Uza bila ada hadi 11:23 · 3:42" (the clock time the host read on the server from
 * `freeUntil`, then this button's own countdown to that instant) over an outlined button, "Uza bila ada" above
 * "Rudishiwa TZS 1,000 kamili". That free offer stands only while the page priced the exit free (`pricedFree`, the
 * server's own verdict) and the countdown runs: it is drawn on the server's paint, before the countdown first runs, and
 * withdrawn the moment the countdown runs out, when the look asks the page for the server's answer at once. A price with
 * a fee keeps today's "Uza sasa" and its fee; a shut exit is "Kuuza kumefungwa" and the journey's sentence, in words,
 * from the first paint. The look changes what is drawn and three of the dialogs' words (a ticket where today's say a
 * position, S6 A7), never the sale: the countdown, the confirm, the one action, the latch on a sale in flight, the
 * deferred toast and the sale's two refresh events below are the same code for both looks. `test:journey-tickets` §12
 * holds the look, `test:sell-grace-truth` §3 its free offer, and `test:timer-date` §3 its clock time.
 *
 * ⭐ A FREE PRICE ITS COUNTDOWN HAS OUTLIVED IS WITHDRAWN IN BOTH LOOKS (S6 A8b, for every player). A host that priced the
 * exit inside its free window says so (`pricedFree`, `cashOutValue`'s own `inGracePeriod`), and that price is the whole
 * stake. The moment this button's countdown runs out it is no longer the offer — a default poll has locked the exit, and
 * a legacy paid window charges its fee — so either look then says "Inapakia…" with no figure and nothing to press,
 * closes a confirm still showing the free price (unless a sale is already in flight: the server decides that one), and
 * asks the page for the server's answer once. Until A8b today's look turned that price into "Uza sasa · TZS 3,600 −0
 * ada" until the page's next refresh (up to 20 s), and its confirm said "Hakuna ada" while the server charged the fee.
 * Today's look also draws the server's shut verdict from its first commit (`shutNow`), so that answer is never preceded
 * by one pressable "Uza sasa · TZS 0" render, and below 360px it leaves out its free note ("pesa yote": the strip above
 * it already says "Hakuna ada"), so its free row fits a 320px phone on /positions in every language; its label keeps one
 * line at every width. `test:sell-grace-truth` holds every host to the flag (2.priced), the withdrawal and the shut
 * verdict (3.classic), and the fit (§5).
 *
 * ⭐ A SALE'S RESULT OUTLIVES THE ROW IT WAS SOLD FROM, AND A REFUSED SALE IS AS LOUD AS THE REGISTRY RANKS IT (S6 A8h,
 * for every player, both looks). The result used to be drawn here, so it lived as long as this button's row: on
 * /positions' open lens the sale's own refresh takes the sold ticket off the list, and the A8c drive measured the result
 * on screen for 388 ms (the question page's holder block and Tiketi zangu draw no Sell button for a ticket that is no
 * longer open, so they lose it alike). `submit()` now hands it to the shell's host (`showResult`, below;
 * `sell-result.tsx`), which keeps it until the player closes it (a sale that went through also closes at
 * DESIGN_AUTHORITY §F2's shared 5 s, held while it is read), and the button draws the same result itself only when no
 * host took it: the host's code never arrived, or a page without the shell. A refused sale is answered as the failure
 * registry ranks its reason (§F2/§F3): a hard block or a fault (the registry's `error`, a refusal it cannot rank, the
 * request that threw) gets the red toast and the ✗ result; every other refusal, a moved price among them, gets the calm
 * `factual` toast alone, and focus comes back to this button. Every refusal's toast stays until it is read, its figures
 * whole, and the next sale, from any button on any page, dismisses it. `test:sell-price-guard` §7 holds the hand-off,
 * the fallback, the routing, the host's mount, how it draws the result and how focus goes back.
 *
 * ⭐ THE SALE CARRIES THE FIGURE THE PLAYER CONFIRMED (S6 A8c, for every player). `submit()` — the one sale both looks share —
 * sends `value`, the figure the confirm showed, as `expectedValue`, and the server sells at exactly that figure or not at
 * all. If the price has moved since this button drew it (a free window ending a moment before the tap, on a poll with a
 * paid window), the server refuses with its new figure (`price_changed`) and nothing moves: the toast — the calm
 * `factual` one, as a refusal one tap fixes is — names the new price (alone since S6 A8h, and until it is read: no result
 * opens, so nothing holds it back), the page is asked once for it, and
 * until it is drawn both looks say "Inapakia…" with no figure (`repricing`), so the next tap sells at it. A pool short of
 * the price (`cashout_pool_short`) is refused as unavailable, with today's red toast and no refresh: no page could show
 * what that sale would pay. `test:sell-price-guard` §4 holds the figure sent, the toast, the one refresh and the wait;
 * `test:journey-tickets` §12 and `test:sell-grace-truth` §3 count them beside the lapse.
 *
 * ⭐ ON A PHONE, THE QUESTION PAGE'S HOLDER BLOCK STACKS TODAY'S ROW (S6 A8d; VODACOM-PLAN §0h point 37 (h), §0i A8d).
 * There this button sits 84px narrower than on /positions, and its one-line row ran past it on the most common phones
 * (the Swahili free row 67px past its content at 360). A host that asks (`stackOnPhone`, the holder block alone) gets
 * the stacked rule in globals.css below 640: the control takes the --h-control-xl rung (56px), the label takes one line
 * and the figure the next, centred, its note beside it or under it. The words, the figures, the states and the sale
 * are today's, the markup gains only that class, and the journey's look is drawn as before. `test:sell-grace-truth` §5
 * holds the fit.
 *
 * ⭐ WHERE ONE LINE CANNOT HOLD THE ROW, ITS NOTE GOES UNDER ITS FIGURE, AND THE FREE STRIP NEVER BREAKS A PART (S6 A8g;
 * VODACOM-PLAN §0h point 37 (h), §0i A8g). Every host that does not ask for the stack (/positions) is drawn the wrap
 * class, and below 640 globals.css makes the figure a wrapping row: a row that fits keeps its one line, untouched, and
 * one that does not (the Swahili free row for TZS 1,000,000 from 360px — to 376px with the label a browser measured,
 * to 383px by the static model, an upper bound — and a Chinese legacy paid row with a six-figure fee at 320 to 324px)
 * keeps its label on the line and puts the note under the figure, at the right end, in the same 44px. The free strip
 * above the button keeps each of its parts whole (the free word, the countdown, the note): it is a wrapping row, so a
 * part that cannot share a line moves to the next one whole (only a part wider than the whole strip, which none is
 * from 320px at the default text size, could break), and in the holder block's narrow column Swahili reads
 * "TOKA BILA GHARAMA 4:59" over "· Hakuna ada" where it broke "TOKA BILA" over "GHARAMA" and "· Hakuna" over "ada".
 * Every word, figure and state is today's. `test:sell-grace-truth` §5 holds both (5.list, 5.paid and 5.strip).
 */
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDeferredToast } from "@/components/ui/toast";
import { useT } from "@/lib/i18n";
import { cashOutPositionAction } from "@/app/markets/actions";
import { SellConfirmModal } from "./sell-confirm-modal";
import { SellResultModal, handSellResult, keepFiguresWhole, type SellResultData } from "./sell-result";
import { formatTzs, formatNumber } from "@/lib/utils";
import { errorCopy } from "@/lib/error-copy";
import { REASONS, hasReason, reasonForCode } from "@/lib/failure-reasons";
import { I } from "@/components/ui/glyphs";

/**
 * ⭐ S6 A8e — THE RENDERS THE SELL BUTTONS IN THIS TAB HAVE DRAWN, so a button can tell a render the router brought back
 * for Back or Forward from a fresh one. Next keeps each page it has shown as the server sent it and, on Back or
 * Forward, draws it again with those props, `serverNow` among them, however long ago (unless a refresh, or a server
 * action that revalidates, has cleared that cache since); a fresh render always carries a new `serverNow` (every host
 * renders per request). So a render whose position and `serverNow` a button in this tab has drawn, while no button
 * draws it now, is a render brought back, and its prices are as old as it is. Each button counts the render it draws
 * once its commit is done, and uncounts it when it moves on or unmounts; the key stays, uncounted, so Back or Forward
 * can still find it (beyond DRAWN_KEPT keys the oldest uncounted ones go). A button reads the record at its first
 * render and in every render that hands it a new `serverNow`. A page loaded afresh starts with no record, so a first
 * load is never read as a restore however slowly it arrives; nothing is counted on the server, where effects never run,
 * so the server's paint and the hydrating render read the same; and a second button drawing a render that one already
 * draws is not a restore. ⚠️ It holds while Back or Forward mounts a page again or hands its mounted buttons the old
 * props — not if Next kept earlier pages mounted and hidden (`cacheComponents`: `test:sell-grace-truth` 4.premise) —
 * and while no host unmounts and remounts a ticket's button inside one render: a sheet or a tab that did would be read
 * as brought back ("Inapakia…" and one ask, never an old price).
 */
const drawnRenders = new Map<string, number>();
/** The uncounted renders the record keeps: far more than the pages of one poll (each refresh clears Next's own cache). */
const DRAWN_KEPT = 512;
const renderKey = (positionId: string, serverNow: number) => `${positionId}@${serverNow}`;
/** The `serverNow` of a render brought back — drawn in this tab, and drawn by no button now — or null. */
const restoredOf = (positionId: string, serverNow: number | undefined) =>
  serverNow != null && drawnRenders.get(renderKey(positionId, serverNow)) === 0 ? serverNow : null;
/** The button that asks the server about the restore on screen: one ask per restore, whatever each ticket's `serverNow`. */
let restoreAsker: object | null = null;
/**
 * ⭐ S6 A8h — THE LAST REFUSED SALE'S TOAST, ONE FOR EVERY SELL BUTTON IN THIS TAB. A refusal's toast stays until it is
 * read (DESIGN_AUTHORITY §F2, §F8), and its sentence never names the ticket, so the next sale, from any button on any
 * page, dismisses it before it starts: one answer stands, the latest, never a stack (§F6: a burst coalesces). Kept per
 * button, a refusal on one ticket stayed beside another ticket's sale, and refusals across tickets (too many tries, a
 * question whose selections closed) piled up (the review of 2026-10-04). Never written on the server: only a sale writes it.
 */
let lastRefusalToast: string | null = null;

export function SellButton({
  positionId,
  stake,
  value,
  freeUntil,
  closesAt,
  alreadyClosed,
  serverNow,
  look,
  freeUntilLabel,
  pricedFree,
  stackOnPhone,
}: {
  positionId: string;
  /** Stake at place-time. */
  stake: number;
  /** Current sellback value (post-slippage). */
  value: number;
  /**
   * ISO instant the FREE exit ends — the server's own (`freeExitEndsAt`), from this poll's frozen
   * grace. `null` when no free window was ever offered (a 0-minute grace, or a bet placed with less
   * than the grace left before selection close). The countdown, its m:ss label and the free/fee
   * state read this and nothing else; the placement is deliberately no longer a prop, so nothing
   * here can rebuild a window from it.
   */
  freeUntil?: string | null;
  /**
   * ISO timestamp when SELLING shuts — i.e. the selection cutoff
   * (`selectionClosedAt ?? resolutionAt`), NOT the resolution time.
   *
   * This used to be passed `resolutionAt`, which is LATER: it left the "Sell now"
   * button live through the whole window between selections closing and the
   * officers recording the result — exactly the window in which the real-world
   * outcome is already knowable. The server now refuses those sales, so offering
   * the button there would only be a lie the server rejects. The exit shuts when
   * the entry shuts.
   */
  closesAt?: string;
  /**
   * The server's own verdict (`isSelectionClosed(market)`), so the button is
   * right on the first paint and covers the cases a timestamp alone cannot —
   * notably a sentinel-CLOSED market, which is the single most dangerous moment
   * to leave an exit open.
   */
  alreadyClosed?: boolean;
  /** Server's Date.now() at render time. Passed from the server component
   *  so the client can calibrate its clock against the server — prevents
   *  clock skew (e.g. server 1 min ahead of device) from showing 6 min
   *  instead of 5 on the free-exit countdown. */
  serverNow?: number;
  /**
   * ⭐ THE JOURNEY'S LOOK (S6 WP10) — passed by the journey's ticket card and by no other host. Without it the button is
   * today's, markup and words (`test:journey-tickets` §12).
   */
  look?: "journey";
  /**
   * The clock time `freeUntil` names, read ON THE SERVER by the host that passed the instant (`formatClock`, in the
   * platform's zone), for the journey's "Uza bila ada hadi {time}". ⛔ Never formatted here — this is a client file and
   * the zone is a server fact — and never built from the placement: it is the instant the countdown runs to (S6 A8;
   * `test:sell-grace-truth` §2, `test:timer-date` §3). `null` when no free window was offered.
   */
  freeUntilLabel?: string | null;
  /**
   * The page priced this exit INSIDE its free window (`cashOutValue`'s own `inGracePeriod`), so `value` is the whole stake.
   * Every host passes it (the journey's card since WP10, today's two hosts since A8b). Either look offers that price as
   * free only while the countdown runs, and withdraws it the moment the countdown runs out: a default poll has locked the
   * exit, and a paid window charges its fee (`test:sell-grace-truth` 3.journey, 3.classic and 2.priced).
   */
  pricedFree?: boolean;
  /**
   * ⭐ S6 A8d — the host's column cannot hold today's one-line row on a phone: the question page's holder block, 84px
   * narrower than /positions. Below 640 today's look then stacks (globals.css, beside the button sizes): the label on one
   * line and the figure on the next, on the --h-control-xl rung. Nothing else changes, and from 640 nothing at all. The
   * journey's look ignores it; only the holder block passes it (`test:sell-grace-truth` 5.model and 5.stack). A host
   * that does not ask is drawn the wrap class instead (S6 A8g): below 640 its figure lets its note go under it where
   * one line cannot hold both (5.list).
   */
  stackOnPhone?: boolean;
}) {
  const [pending, start] = useTransition();
  const [closedNow, setClosedNow] = useState(false);
  // The free window — ticks once per second to update the countdown label. It counts down to
  // the server's instant, so a poll frozen at any grace shows its own window.
  // NaN when no free window is offered, and when one is WITHDRAWN while this button is mounted
  // (a cutoff moved earlier, so the bet no longer had its runway): the countdown then reads 0,
  // never the last value it showed. Both hosts also lock the button then (`alreadyClosed`);
  // the free state must not lean on that. Parsed once (S6 A8e), and read by the countdown's first value and by its clock.
  const freeEndTs = useMemo(() => (freeUntil ? Date.parse(freeUntil) : NaN), [freeUntil]);
  // ⭐ S6 A8e — THE COUNTDOWN'S FIRST VALUE IS THE SERVER'S: the time its instant had left at the server's own render
  // (`serverNow`), from the props alone and never from this device's clock. So the server's paint and the browser's
  // hydrating render read one value and draw one arm, and every mount starts on the arm the clock below then keeps:
  // inside the free window the strip and the free price, where it drew "Uza sasa · TZS 3,600 −0 ada" until that clock
  // had first run. The clock recalibrates it from there, as before.
  const [graceRemainMs, setGraceRemainMs] = useState<number>(() => (Number.isFinite(freeEndTs) && serverNow != null ? Math.max(0, freeEndTs - serverNow) : 0));
  useEffect(() => {
    // Compute clock offset once: server ahead → positive offset.
    // Applying it keeps the countdown aligned to server time so a device
    // clock that's 1 min behind doesn't show 6:00 instead of 5:00.
    const clockOffset = serverNow != null ? serverNow - Date.now() : 0;
    const update = () => setGraceRemainMs(Number.isFinite(freeEndTs) ? Math.max(0, freeEndTs - (Date.now() + clockOffset)) : 0);
    update();
    if (!Number.isFinite(freeEndTs)) return;
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [freeEndTs, serverNow]);
  // closedNow flips client-side the moment the wall clock crosses
  // resolutionAt. Tick once per second.
  useEffect(() => {
    // The server already told us if selling is shut (covers sentinel-CLOSED, which
    // no timestamp can express). Otherwise tick against the SELECTION cutoff.
    if (alreadyClosed) { setClosedNow(true); return; }
    if (!closesAt) return;
    const closeTs = Date.parse(closesAt);
    if (!Number.isFinite(closeTs)) return;
    const update = () => setClosedNow(Date.now() >= closeTs);
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [closesAt, alreadyClosed]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [resultData, setResultData] = useState<SellResultData | null>(null);
  const router = useRouter();
  // B-16 — the success toast rides the transition's falling edge (the wallet
  // figure it announces is then actually on screen); errors stay immediate.
  const { toast, deferToast, dismiss } = useDeferredToast(pending);
  const { t } = useT();

  // ⭐ S6 A8e — A RENDER BROUGHT BACK BY BACK OR FORWARD IS NO OFFER. A button's first render reads whether its render was
  // brought back (the record above the component), and so does every render that hands a button already on the page a
  // new `serverNow` — Back or Forward between two addresses of one page keeps its buttons — in that very render, so no
  // commit draws the old prices. Until a fresh render arrives the button withdraws them in either look ("Inapakia…", no
  // figure, nothing to press), and the lapse below asks the page for the server's answer, once for the whole restore.
  // `restoredAt` is the restored render's `serverNow`; a fresh render clears it in the commit that recalibrates the
  // countdown, so the countdown drawn next is never the old render's.
  const [restoredAt, setRestoredAt] = useState<number | null>(() => restoredOf(positionId, serverNow));
  const [drawnNow, setDrawnNow] = useState(serverNow);
  if (serverNow !== drawnNow) {
    setDrawnNow(serverNow);
    const back = restoredOf(positionId, serverNow);
    if (back !== null) setRestoredAt(back);
  }
  const stale = restoredAt !== null;
  // Free exit is exactly the server's free window: open while its instant is still ahead of the
  // server-calibrated clock, and no other clock is read. The last-second guard that sat here
  // ("closes in more than five minutes", on the device clock) was not the server's rule: the
  // server offers no free window to a bet placed with less than the grace left before selection
  // close, so the instant never runs past the cutoff — and that guard took the free label off
  // sales the server still granted free.
  // ⭐ S6 A8e — and never against the server's own verdicts: not once the page has priced the exit with a fee
  // (`pricedFree === false`), so a refresh that brings a paid price draws it paid in that very commit, never the free
  // words over the paid figure while the countdown catches up (a host that passes no flag reads the countdown alone, as
  // before); and not for a restored render.
  const inGrace = graceRemainMs > 0 && pricedFree !== false && !stale;
  // Cash-out is an EARLY EXIT, never a profit. `value` is the stake returned:
  // the full stake inside the free-exit window, or stake − fee outside it.
  // `net` is therefore always ≤ 0 (0 when free, −fee otherwise).
  const net = value - stake;
  const fee = Math.max(0, stake - value);

  // Grace countdown label: "43:12" remaining
  const graceMin = Math.floor(graceRemainMs / 60_000);
  const graceSec = Math.floor((graceRemainMs % 60_000) / 1000);
  const graceLabel = `${graceMin}:${String(graceSec).padStart(2, "0")}`;

  // ⭐ S6 A8h — the control that opened this sale's confirm, handed over with its result: when the result closes and the
  // row this button sat in has gone with a sold ticket, the shell's host gives focus to a control near where it stood.
  const openedFrom = useRef<HTMLElement | null>(null);
  const openConfirm = (e?: { currentTarget: HTMLElement }) => {
    if (pending || closedNow) return;
    openedFrom.current = e?.currentTarget ?? null;
    setConfirmOpen(true);
  };

  // ONE SALE PER CONFIRM. `openConfirm` guards on `pending` and the confirm button is
  // `disabled={pending}` — but until S6 A8i (2026-10-06) the modal's Enter-to-confirm was a
  // WINDOW keydown listener reading a `pendingRef` that an effect synced one commit late,
  // so two fast Enters both passed it and both landed here. No money can move twice — the
  // server re-reads the position inside `withLock(wallet:{userId})` and refuses the second
  // with `position_not_open` — but that refusal writes the SAME `resultData` as the success,
  // and whichever reply lands last wins. So the player can be told "Couldn't cash out"
  // after their money has correctly moved. That is a truthfulness defect on a money
  // control, which is the one thing a cash-out screen must never be.
  //
  // BOTH latches below stay, because they close different windows. `pending` is
  // `useTransition` state read from the closure of the render that built this `submit`, so
  // a second call in the same tick — before React has re-rendered — still reads it false and
  // walks straight through. Since A8i Enter is the sell button's own press, which React
  // re-renders after, but a double press from any surface (two fast clicks, a script) is the
  // same window. `inFlight` is set SYNCHRONOUSLY on the first call, so it is the only one
  // that closes that tick. `pending` stays because it is the in-repo precedent
  // (`conviction-dial.tsx`'s `submit` opens with exactly it) and it refuses a repeat
  // arriving from any surface that never armed the ref.
  const inFlight = useRef(false);

  // ⭐ S6 A8c · WAITING FOR THE SERVER'S NEW PRICE. When a sale is refused because its price moved after this button drew
  // it, the page is asked once for the server's figure (in `submit`), and until that answer has been drawn the button
  // offers nothing: in either look it says "Inapakia…", draws no figure and has nothing to press. Without this it would
  // read "Inauza…" beside a toast that says nothing was sold, over the refused figure: the page's refresh starts inside
  // the sale's transition, so `pending` stays true until the refreshed page is drawn. The wait ends exactly then, when
  // `pending` falls. It is false on the server's paint, so no served byte changes.
  const [repricing, setRepricing] = useState(false);
  useEffect(() => { if (!pending) setRepricing(false); }, [pending]);

  // ⭐ S6 A8h · A REFUSAL THAT OPENS NO RESULT GIVES FOCUS BACK TO THIS BUTTON. The confirm closes while the sale is in
  // flight, when this button is disabled, so the confirm cannot hand focus back to it and focus falls to the page; a
  // result would take it, and only a hard block or a fault opens one now (`submit`, below). So once this button can be
  // pressed again (the sale settled, and a moved price's new figure drawn), focus comes back to it if it is still nowhere
  // (on the page itself, or in the confirm as it leaves), and its name then says what it offers. Nothing scrolls.
  // The last refusal's toast stays until it is read, and the next sale, from any button, dismisses it (`lastRefusalToast`).
  const refocus = useRef(false);
  useEffect(() => {
    if (pending || repricing || !refocus.current) return;
    refocus.current = false;
    const opener = openedFrom.current;
    const now = document.activeElement;
    if (now && now !== document.body && !now.closest("[aria-hidden='true'], [inert]")) return;
    if (!opener || !opener.isConnected || opener.matches(":disabled")) return;
    opener.focus({ preventScroll: true });
  }, [pending, repricing]);

  // ⭐ S6 A8h · THE RESULT GOES TO THE SHELL'S HOST, WHICH OUTLIVES THIS ROW. A sale's result (a sale that went through,
  // or a refused sale that is a hard block or a fault) is handed to `SellResultHost` first (`handSellResult`, with the
  // control that opened the sale, so focus can go back near it), and the host keeps it on screen until the player
  // closes it (a sale that went through also closes at DESIGN_AUTHORITY §F2's shared 5 s, held while it is read). Drawn
  // here it lived only as long as this button's row: a sold ticket leaves /positions' open lens with the sale's own
  // refresh, and the A8c drive measured its result on screen for 388 ms. Only when no host took it (the host's code
  // never arrived, or a page without the shell) does this button draw the same result itself, as before A8h.
  // `test:sell-price-guard` 7.handed pins this function whole.
  const showResult = (data: SellResultData) => {
    if (handSellResult({ resultData: data, positionId, journey: look === "journey", from: openedFrom.current })) return;
    setResultData(data);
    setResultOpen(true);
  };

  const submit = () => {
    if (inFlight.current || pending) return;
    inFlight.current = true;
    // ⭐ S6 A8h — a new sale, from any button, supersedes the last refusal's toast, which stays until it is read
    // (`lastRefusalToast`, at the top of this module).
    if (lastRefusalToast) { dismiss(lastRefusalToast); lastRefusalToast = null; }
    start(async () => {
      try {
        const fd = new FormData();
        fd.set("positionId", positionId);
        // ⭐ S6 A8c — the figure this player confirmed, exactly as the confirm printed it, as a plain whole number: the
        // server sells at that figure or not at all. Both looks sell through here.
        fd.set("expectedValue", String(value));
        // A throw here was as silent as it was on the bet path (see conviction-dial):
        // the rejection escaped the transition, the confirm dialog dismissed itself, and
        // no toast, modal or error state ever mounted — leaving the player unsure whether
        // their position had been sold. Mapped to a refusal the copy layer can render.
        let r: Awaited<ReturnType<typeof cashOutPositionAction>>;
        try {
          r = await cashOutPositionAction(fd);
        } catch {
          r = { ok: false as const, error: "", code: "BUSY" } as Awaited<ReturnType<typeof cashOutPositionAction>>;
        }
        setConfirmOpen(false);
        // AUTH LOSS IS NOT A FAILED SALE — same shape as the bet path, same model
        // (`use-quick-bet.ts`). A session revoked in another tab makes
        // `cashOutPositionAction` `redirect("/auth/login")`, and a Server Action that
        // redirects RESOLVES TO NOTHING. Reading `.ok` off that undefined throws a
        // TypeError below the catch above, so the rejection escapes the transition and
        // the error boundary flashes while the login page loads — leaving the player
        // unable to tell whether the position was sold. Return silently; the nav speaks.
        if (r == null) return;
        if (!r.ok) {
          // B-7 — the refusal is rendered as toast body AND modal title, so it must
          // be the localized line, never the raw service string.
          const msg = errorCopy(t, r);
          // ⭐ S6 A8c — a price that moved after this button drew it (`price_changed`): the sentence names the server's new
          // figure (the refusal's `detail`, never the figure this button held). It is a refusal one more tap fixes, and the
          // player's money did not move, so its toast is the calm `factual` one with no error buzz (DESIGN_AUTHORITY §F3);
          // since S6 A8h every refusal is ranked so, below. The page is then asked once for the server's price, as a sale
          // asks, and the button waits on it (`repricing`), so the next tap sells at it.
          // ⭐ S6 A8h · A REFUSED SALE IS AS LOUD AS THE REGISTRY RANKS ITS REASON (DESIGN_AUTHORITY §F2/§F3, which take
          // the ranks from FAILURE-INVENTORY §0, written for each reason in `failure-reasons.ts`). Only a hard block or a
          // real fault gets the red toast and the ✗ result: the registry's `error` (a ticket that is not the player's, a
          // missing wallet, a pool short of the price), a refusal it cannot rank, and BUSY, which on this path is only the
          // request that threw above (the cash-out path never answers with it), whose outcome is unknown. Every other
          // refusal, a warning or an info (a moved price, too many tries, selling shut, the ticket already sold or settled),
          // gets the calm `factual` toast alone, since §F2 gives a refusal the player can fix no popup, and focus comes back
          // to this button (`refocus`, above). Every refusal's toast stays until it is read (§F2, §F8: `durationMs: 0`),
          // each figure in it whole (`keepFiguresWhole`), and the next sale, from any button, dismisses it. Before A8h every refusal opened
          // the ✗ result over a red toast, a moved price's too, its calm toast held behind it (toast.tsx §F1).
          const moved = r.reason === "price_changed";
          const said = hasReason(r) ? r.reason : reasonForCode(r.code);
          const fault = r.code === "BUSY" || said === null || REASONS[said].severity === "error";
          lastRefusalToast = toast({ title: t.toast.couldntCashOut, description: keepFiguresWhole(msg), variant: fault ? "danger" : "factual", durationMs: 0 });
          if (moved) { setRepricing(true); window.dispatchEvent(new Event("50pick:refresh")); }
          if (fault) showResult({ variant: "danger", value: value, net, error: msg });
          else refocus.current = true;
          return;
        }
        const realisedValue = r.data!.value;
        const realisedFee = Math.max(0, stake - realisedValue); // 0 inside the free-exit window
        deferToast({
          title: `${t.dialog.sellLabel} · ${formatTzs(realisedValue)} ${t.toast.soldReturned}`,
          description: realisedFee <= 0
            ? t.toast.fullStakeRefunded
            : `${formatTzs(realisedFee)} ${t.toast.earlyExitFeeApplied}`,
          variant: "success",
        });
        // net is stored as −fee so the result modal can surface the fee row.
        // ⭐ S6 A8h — handed to the shell's host BEFORE the page is asked to refresh: the host reads the controls around
        // this ticket while it is still on the page, for where focus goes when the result closes.
        showResult({ variant: "success", value: realisedValue, net: -realisedFee });
        window.dispatchEvent(new Event("50pick:refresh"));
        window.dispatchEvent(new Event("50pick:refresh-notifications"));
        // B-16 — both SellButton hosts (/markets/[id], /positions) mount a
        // RefreshPoller on the "50pick:refresh" event; a direct refresh beside
        // the dispatch was a guaranteed double fetch.
      } finally {
        // Disarmed only once the whole body has run — including every early `return`
        // above — so the latch can never outlive the request it is guarding, and a
        // retry after a genuine refusal is never blocked by a stuck ref.
        inFlight.current = false;
      }
    });
  };

  // ⭐ THE LAPSE, BOTH LOOKS' (S6 WP10 for the journey's look, A8b for today's, A8e for a restored render) — above every
  // return, as hooks must be. A price drawn has LAPSED once it is no longer known to be the offer: a free price
  // (`pricedFree`) whose countdown has run out — a default poll has locked the exit, and a paid window charges its fee —
  // or any price of a restored render (`stale`). Then either look withdraws it, closes a confirm still showing it (unless
  // a sale is already in flight: the server decides that one), and asks the page for the server's answer at once rather
  // than at its poller's next beat (up to 20 s). It asks once per run of the countdown: an answer that is still free
  // restarts the countdown, which re-arms the ask, so no answer can set off another ask by itself. A restore asks once
  // for all its buttons: the first of them that can sell claims the ask and arms it, the rest wait for that answer, and
  // the answer that ends the restore re-arms every button once, so an answer that is itself no offer is asked about too.
  // The countdown has its value from the first render (S6 A8e), so nothing holds the verdict back until a commit: the
  // server's paint and every first render draw what the lapse then keeps. The sale's own refresh events stay in `submit`.
  const journey = look === "journey";
  const lapseArmed = useRef(true);
  // The record (S6 A8e, above the component): this button's render, counted while it draws it.
  useEffect(() => {
    if (serverNow == null) return;
    const key = renderKey(positionId, serverNow);
    drawnRenders.set(key, (drawnRenders.get(key) ?? 0) + 1);
    for (const [k, live] of drawnRenders) {
      if (drawnRenders.size <= DRAWN_KEPT) break;
      if (live === 0) drawnRenders.delete(k);
    }
    return () => { drawnRenders.set(key, (drawnRenders.get(key) ?? 1) - 1); };
  }, [positionId, serverNow]);
  // A fresh render ends a restore, in the same commit as the countdown's recalibration (both run on the fresh props), and
  // re-arms the ask.
  useEffect(() => {
    if (restoredAt === null || serverNow === restoredAt) return;
    lapseArmed.current = true;
    setRestoredAt(null);
  }, [serverNow, restoredAt]);
  // Lapsed: the price drawn is no longer known to be the offer (both looks).
  const lapsed = (pricedFree === true && !inGrace) || stale;
  // One ask for a whole restore, above the lapse that makes it: the first of its buttons that can sell (shut by neither the
  // server's verdict nor this phone's clock, as the lapse asks) claims it and arms it, once for that restore (an answer to
  // an earlier ask may have spent it); the others are disarmed until the answer.
  const restoreAsk = useRef<number | null>(null);
  useEffect(() => {
    if (restoredAt === null || closedNow || alreadyClosed) return;
    if (restoreAsker !== null && restoreAsker !== restoreAsk) { lapseArmed.current = false; return; }
    restoreAsker = restoreAsk;
    if (restoreAsk.current !== restoredAt) { restoreAsk.current = restoredAt; lapseArmed.current = true; }
    return () => { if (restoreAsker === restoreAsk) restoreAsker = null; };
  }, [restoredAt, closedNow, alreadyClosed]);
  useEffect(() => {
    if (closedNow || alreadyClosed) return;
    if (inGrace) { lapseArmed.current = true; return; }
    if (!lapsed) return;
    if (!pending) setConfirmOpen(false);
    if (!lapseArmed.current) return;
    lapseArmed.current = false;
    window.dispatchEvent(new Event("50pick:refresh"));
  }, [lapsed, inGrace, restoredAt, closedNow, alreadyClosed, pending]);

  // ⭐ THE TWO DIALOGS ARE ONE PAIR FOR BOTH LOOKS — the confirm and the result, wired to the one `submit` above. The
  // journey's look changes three of their words, each a ticket where today's says a position (S6 A7): the question, the
  // keep button, and the line under a sale that failed. Without the look they are today's words. Since S6 A8f the result
  // sets each money figure in its title as one amount (`wholeFigures`), and the confirm keeps its own figures whole and
  // reflows its receive row (`test:sell-grace-truth` §6). Since S6 A8h the result is `SellResultModal` (`sell-result.tsx`),
  // the one place its words are written: the shell's host draws it, and this button only when no host took the result
  // (`showResult`, above).
  const dialogs = (
    <>
      <SellConfirmModal
        open={confirmOpen}
        pending={pending}
        stake={stake}
        value={value}
        positionId={positionId}
        onConfirm={submit}
        onCancel={() => { if (!pending) setConfirmOpen(false); }}
        titleLabel={journey ? t.journey.sellConfirmTitle : undefined}
        keepLabel={journey ? t.journey.sellKeep : undefined}
      />
      {resultData && (
        <SellResultModal
          open={resultOpen}
          resultData={resultData}
          positionId={positionId}
          journey={journey}
          onClose={() => setResultOpen(false)}
        />
      )}
    </>
  );

  // ⭐ THE JOURNEY'S LOOK (S6 WP10) — the state above, drawn as the canvas draws a ticket's exit, in the kit's tokens. In
  // the free window: "Uza bila ada hadi {time} · m:ss", where {time} is the clock reading the host made on the server of
  // the very instant the countdown runs to, then an outlined button, "Uza bila ada" over "Rudishiwa {amount} kamili",
  // whose amount is `value`: the server's own figure for this exit, the whole stake inside the free window
  // (`cashOutValue`), never one worked out here. A price with a fee: today's "Uza sasa", figure and fee (a fee of 0 is not
  // printed). A free price whose countdown has run out, or any price of a render brought back by Back or Forward (S6
  // A8e): "Inapakia…", no figure and nothing to press, until the server's answer arrives. Once selling has shut: "Kuuza
  // kumefungwa" and the journey's sentence, in words, with nothing to press
  // — from the server's own paint, because `alreadyClosed` is the server's verdict and arrives as a prop. The button's
  // edge is the kit's token for a control's edge, the canvas's own colour: an outlined button's edge is its only
  // boundary, so it is held to the floor a money control's edge is held to (DESIGN_AUTHORITY's accessibility floor).
  // ⛔ Nothing in the look formats a time or computes money.
  // ⭐ S6 A8c — a price the server refused because it moved is withdrawn the same way until the refreshed page brings the
  // server's price (`repricing`): "Inapakia…" ahead of "Inauza…", no figure, no free line, nothing to press.
  if (journey) {
    // The dictionary marks where the clock time and the amount sit, so each is drawn in its own element.
    const [freeBefore, freeAfter] = t.journey.sellFreeUntil.split("{time}");
    const [refundBefore, refundAfter] = t.journey.sellFullRefund.split("{amount}");
    // Shut: the server's verdict first (a prop, so the server's paint and the browser's first render agree), then this clock.
    const shut = closedNow || alreadyClosed === true;
    // The free offer: the page priced the exit free, and the countdown runs, from the server's paint on (S6 A8e: its first
    // value is the server's own).
    const offerFree = pricedFree === true && inGrace;
    return (
      <>
        {shut ? (
          <p className="flex items-start gap-1.5 text-body-sm text-text-subtle">
            <I.lock s={14} className="mt-0.5 shrink-0" />
            <span className="min-w-0 break-keep [overflow-wrap:anywhere]">
              <span className="block font-semibold text-text-muted">{t.common.sellLocked}</span>
              {t.journey.sellClosedBody}
            </span>
          </p>
        ) : (
          <div className="space-y-1.5">
            {offerFree && freeUntilLabel && !repricing ? (
              <p className="text-body-sm text-text-muted">
                {freeBefore}<time dateTime={freeUntil ?? undefined} className="whitespace-nowrap tabular-nums">{freeUntilLabel}</time>{freeAfter}
                {inGrace ? (
                  <>
                    {" · "}
                    <span role="timer" className="whitespace-nowrap font-mono font-bold tabular-nums text-text">{graceLabel}</span>
                  </>
                ) : null}
              </p>
            ) : null}
            <button type="button" onClick={openConfirm} disabled={pending || lapsed || repricing} className="btn btn-ghost w-full px-2 py-1.5" style={{ borderColor: "var(--border-control)" }}>
              <span className="flex flex-col items-center text-center">
                <span className="whitespace-normal text-body">
                  {repricing ? t.common.loading : pending ? t.common.selling : lapsed ? t.common.loading : offerFree ? t.journey.sellFreeCta : t.common.sellNow}
                </span>
                {lapsed || repricing ? null : (
                  <span className="whitespace-normal text-body-sm font-medium text-text-muted">
                    {offerFree ? (
                      <>{refundBefore}<span className="amount font-semibold text-text">{formatTzs(value)}</span>{refundAfter}</>
                    ) : (
                      <><span className="amount text-text">TZS {formatNumber(value)}</span>{fee > 0 ? <>{" "}<span className="amount">−{formatNumber(fee)}</span>{" "}{t.common.fee}</> : null}</>
                    )}
                  </span>
                )}
              </span>
            </button>
          </div>
        )}
        {dialogs}
      </>
    );
  }

  // Cash-out is an early-exit utility, not a win — always the neutral royal CTA.
  // ⭐ S6 A8b — today's look reads the lapse too (`lapsed`, above): a free price the countdown has outlived is withdrawn,
  // so the button is disabled and says "Inapakia…" (`common.loading`, the journey's word for the same wait; "Inauza…"
  // while a sale is in flight) as its words and its spoken name, with no figure, until the server's answer arrives — it
  // can no longer offer "Uza sasa · TZS 3,600 −0 ada" for a price the server has stopped granting. Below 360px it leaves
  // out its free note (the strip above already says "Hakuna ada"), so the free row fits a 320px phone on /positions in
  // every language. Its label keeps one line at every width, as today: let it wrap and, in the question page's narrower
  // holder block, Chinese would stack one glyph a line, taller than the button.
  // ⭐ S6 A8c — a price the server refused because it moved (`repricing`, above) is withdrawn the same way, strip and all:
  // "Inapakia…" ahead of "Inauza…", no figure, nothing to press, until the refreshed page brings the server's price.
  // ⭐ S6 A8d — the question page's holder block passes `stackOnPhone`, and below 640 its button stacks instead: the label
  // takes a line of its own and the figure the next, on the --h-control-xl rung (the stacked rule in globals.css), so
  // neither wraps and nothing runs past the button. The markup below is every host's but for one class: the stack for
  // the host that asks, and (S6 A8g) the wrap for every other, whose figure lets its note go under it below 640 where
  // one line cannot hold both. And the free strip is a wrapping row, so each of its parts moves to the next line whole
  // when it cannot share one (S6 A8g).
  const btnVariant = "btn-primary";
  // Shut: this phone's clock (`closedNow`), and the server's verdict as it arrives, so a refresh that brings
  // `alreadyClosed` is drawn shut in that very render, never as one pressable "Uza sasa · TZS 0 −3,600 ada" while the
  // effect above copies the verdict into `closedNow`. Since S6 A8e that holds from the server's paint on, as the journey's
  // look draws it: the verdict is a prop, so the server's paint and the browser's first render agree, and a shut ticket
  // is no longer served as "Uza sasa · TZS 0 −1,000 ada" until the page has started. The free strip is served since A8e
  // too, so its note is one text: the server writes two texts side by side with a marker between them that the browser
  // keeps, and the strip would no longer be the markup a classic holder was shown (`qa:classic-shell-parity` 4.4).
  const shutNow = closedNow || alreadyClosed === true;

  return (
    <>
      {inGrace && !shutNow && !repricing && (
        <div className="mb-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 px-2 py-1 rounded-md bg-brand-500/[0.12] border border-brand-500/30">
          <span className="font-mono text-micro font-bold text-brand-300 uppercase tracking-[0.12em]">{t.common.freeExitLabel}</span>
          <span className="font-mono text-[10px] text-brand-300 tabular-nums">{graceLabel}</span>
          <span className="font-mono text-[10px] text-text-subtle">{`· ${t.dialog.noFee}`}</span>
        </div>
      )}
      <button
        type="button"
        onClick={shutNow ? undefined : openConfirm}
        disabled={pending || shutNow || lapsed || repricing}
        aria-label={
          shutNow
            ? t.common.sellLockedHint
            : repricing
            ? t.common.loading
            : lapsed
            ? (pending ? t.common.selling : t.common.loading)
            : inGrace
            ? `${t.common.freeExitLabel} — ${formatTzs(value)}`
            : `${t.common.cashOut} ${formatTzs(value)}`
        }
        // Height is `.btn-md` (--h-control-md = 44px, globals.css) and nothing else — or, in a host that asks for the
        // stacked phone row (`stackOnPhone`, below 640), the stacked rule's --h-control-xl (56px), in globals.css too.
        // The inline `minHeight: 44` that used to sit here existed only because
        // btn-md capped at 38px; `h-auto` beside it was always inert (no cascade
        // layers — `.btn-md`'s `height` wins on source order). ⛔ Do not re-add
        // a per-call height: the token owns it.
        className={`btn ${shutNow ? "btn-ghost" : btnVariant} btn-md w-full whitespace-normal${stackOnPhone ? " kp-sell-stack" : " kp-sell-wrap"}`}
        style={{ justifyContent: "space-between" }}
      >
        <span>
          {shutNow ? t.common.sellLocked
            : repricing ? t.common.loading
            : pending ? t.common.selling
            : lapsed ? t.common.loading
            : inGrace ? t.common.freeExitLabel
            : t.common.sellNow}
        </span>
        {!shutNow && !lapsed && !repricing && (
          <span className="font-mono tabular-nums">
            TZS {formatNumber(value)}
            {inGrace
              ? <span className="ml-1.5 hidden opacity-80 text-[11px] xs:inline">{t.common.fullRefund}</span>
              : <span className="ml-1.5 opacity-80 text-[11px]">−{formatNumber(fee)} {t.common.fee}</span>
            }
          </span>
        )}
      </button>
      {dialogs}
    </>
  );
}
