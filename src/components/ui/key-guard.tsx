"use client";

/**
 * ⭐ THE KEY GUARD — A KEY HELD DOWN PRESSES ONCE, WHEREVER IT IS, AND NOTHING BEHIND THE TOP DIALOG TAKES A KEY (Vodacom plan
 * S6 A8i-2, 2026-10-07 · live for every player).
 *
 * 🔴 WHAT THIS CLOSES. A8i ran the held-key rule (`held-key.ts`) inside each open dialog's own window listener, which left
 * the page outside a dialog, and a dialog whose host stops keys, unguarded:
 *   · Enter held on Up & Down's UP placed a new bet on every repeat, about thirty a second, each with a fresh idempotency
 *     key, until the balance or the rate limit ran out; Enter held on "Hifadhi nafasi" closed the Sell confirm and its
 *     repeats opened it again (proven in a real browser, 2026-10-07);
 *   · the board card's controls stop Enter and Space on their way up (UD-16), so the window listener of the receipt drawn
 *     inside them never heard its repeats: a held Enter on "Endelea kucheza" closed the receipt and then bet on UP, again
 *     and again.
 * ⭐ So the rule runs ONCE, for the whole page, FIRST: this window listener in the CAPTURE phase sees every keydown before
 * any element, React handler or bubbling listener does, and a key it swallows is both prevented (the browser presses
 * nothing) and stopped (no handler acts on it). The decision is `swallowsKey` (`modal-stack.ts`): a held repeat that would
 * press something, a press behind the top dialog, and a fresh press in a dialog's arming beat. Any other press is
 * untouched: a tap of Enter on UP with no dialog open is a bet, every time (repeat taps are repeat bets, Ali's standing
 * decision).
 * ⭐ AND A SPACE PRESSES ONLY WHERE IT WENT DOWN. Space presses on its release, and a Space whose press began elsewhere (held
 * on the dial while the confirm took focus) or was swallowed presses nothing when it is let go; the browsers do not agree
 * on that by themselves.
 * ⛔ A KEY THAT IS COMPOSING TEXT (an input method's Enter or Space, Chinese among them) is never touched.
 * Installed once per page (`installed`): by AppShell on every page its full shell renders, and by every `Modal` when it
 * mounts, so a page outside that shell (the console, the opt-out page) has it wherever a dialog can open.
 */
import { useEffect } from "react";
import { keyTargetOf } from "@/lib/held-key";
import { currentBeat, inBeat, openLayers, swallowsKey, swallowsSpaceUp, whereIs } from "@/lib/modal-stack";

let installed = false;
/** The element the last fresh Space went down on, when that press was let through; null when it was swallowed. */
let spacePressedOn: EventTarget | null = null;

function onKeyDown(e: KeyboardEvent) {
  if (e.key !== "Enter" && e.key !== " ") return;
  // An input method's composing key is the text's: its keydown says so, or reports key code 229, as Safari's last one does.
  if (e.isComposing || e.keyCode === 229) return;
  const t = keyTargetOf(e.target);
  // A key with no control under it, on the page itself, presses nothing: it is nowhere, and no dialog rule refuses it.
  const where = whereIs(openLayers(), e.target, t === null || t.tag === "BODY" || t.tag === "HTML");
  const swallow = swallowsKey(e.key, e.repeat, t, where, inBeat(currentBeat(), e.target, performance.now()));
  if (e.key === " " && !e.repeat) spacePressedOn = swallow ? null : e.target;
  if (!swallow) return;
  e.preventDefault();
  e.stopPropagation();
}

function onKeyUp(e: KeyboardEvent) {
  if (e.key !== " ") return;
  const pressedHere = e.target === spacePressedOn;
  spacePressedOn = null;
  if (!swallowsSpaceUp(e.key, keyTargetOf(e.target), pressedHere)) return;
  e.preventDefault();
  e.stopPropagation();
}

/** Installs the guard on this page, once: keydown and keyup on the window, in the capture phase. */
export function installKeyGuard(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("keyup", onKeyUp, true);
}

/** AppShell's mount of the guard. It renders nothing. */
export function KeyGuard() {
  useEffect(() => { installKeyGuard(); }, []);
  return null;
}
