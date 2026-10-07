/**
 * ⭐ THE DIALOG STACK — WHICH OPEN DIALOG IS ON TOP, AND WHAT A KEY OR A FOCUS MOVE MAY DO ABOUT IT (Vodacom plan S6 A8i-2,
 * 2026-10-07 · live for every player).
 *
 * 🔴 WHAT THIS CLOSES. Every `Modal` acted as if it were the only dialog on screen, and the win seal (zIndex 1700) opens over
 * the bet confirm or the Sell confirm (100) on any poll tick. A five-lens review of A8i found, and a real browser proved:
 *   · the seal's close gave focus back to the Sell confirm's money button, so a second Enter about 60 ms later, meant for
 *     the seal or for the next one, SOLD the ticket (W2, 2026-10-07);
 *   · a confirm whose quote lapsed under the seal gave focus back to the dial, behind the seal's scrim, where the Enter
 *     meant for the seal opened a new confirm and the next Enter placed the bet unseen;
 *   · a dialog opened beneath the seal (a bet refused while it was up) took focus all the same, and one Escape closed every
 *     open dialog, the lower one first.
 *
 * ⭐ THE RULES, each a pure function, so `test:enter-where-pressed` runs the very rules the dialogs and the key guard run:
 *   · ORDER (`ordered`, `topOf`): by zIndex, then by open order; of two dialogs at one z, the later is drawn over.
 *   · WHERE (`whereIs`): a key or a focus lands in the top dialog; above it (in a surface put in the page after it, as a
 *     dropdown's list or a calendar it opened); behind it (in a covered dialog, or on the page under its scrim); or nowhere
 *     (the page itself).
 *   · ONLY THE TOP DIALOG takes focus and answers Escape and Tab (`modal.tsx`), and NOTHING BEHIND IT TAKES ENTER OR SPACE
 *     (`swallowsKey`, asked by the key guard).
 *   · CLOSING (`closePlan`, `heirsOf`, `leaveLayer`): focus moves only from inside the closing dialog or from nowhere, and
 *     never behind the dialog now on top; a dialog uncovered takes focus on its way out (Cancel, "Hifadhi nafasi"), never
 *     on its money button; a way back that lay inside the closing dialog is handed on.
 *   · THE ARMING BEAT (`ARMING_MS`, `inBeat`): for a moment after a dialog takes focus, and after a closing one gives focus
 *     back to a control, a fresh press there presses nothing.
 * ⛔ NO BROWSER GLOBAL IS READ HERE: the caller hands in the elements (anything with `contains` and
 * `compareDocumentPosition`), the clock, and — to leave — the page itself (`Page`). The registry at the end is the page's
 * one list of open dialogs, kept by `Modal`.
 */
import { pressesSomething, swallowsHeldKey, type KeyTarget } from "./held-key";

/** What the stack reads of an element: whether another node lies inside it, and where another lies in the document. */
export type Box = {
  contains(other: unknown): boolean;
  compareDocumentPosition(other: unknown): number;
};

/** One open dialog, as the stack keeps it. */
export type Layer = {
  /** Its zIndex: `Modal`'s `zIndex`, 100 unless raised (the win seal and the reality check sit at 1700). */
  z: number;
  /** Its open order (`nextOpenOrder`). */
  seq: number;
  /** Its portal root (its scrim and its panel), read when asked: null until it has been drawn. */
  root: () => Box | null;
  /** Where focus goes back when it closes: what had focus when it opened. A closing dialog may hand it on (`heirsOf`). */
  restoreTo: unknown;
  /** Gives focus to its own first target (its `initialFocus`, else its first control), and arms its beat. */
  focusIn: () => void;
  /** Its way out (`Modal`'s `safeFocus`: Cancel, "Hifadhi nafasi"), read when asked, or null: where focus lands when a
   *  dialog drawn over it closes (`leaveLayer`), so a press meant for the dialog that closed never lands on its money. */
  safe?: () => unknown;
};

/** Bottom first, top last: by zIndex, then by open order. */
export function ordered<L extends Layer>(layers: readonly L[]): L[] {
  return [...layers].sort((a, b) => a.z - b.z || a.seq - b.seq);
}

/** The dialog drawn over every other, or null when none is open. */
export function topOf<L extends Layer>(layers: readonly L[]): L | null {
  const all = ordered(layers);
  return all.length > 0 ? all[all.length - 1] : null;
}

/** Where a key or a focus lands, seen from the top dialog. */
export type Where = "free" | "nowhere" | "top" | "above" | "behind";

/** `DOCUMENT_POSITION_FOLLOWING`: the other node comes after this one in the document. */
const FOLLOWING = 4;

/**
 * "free": no dialog is open. "nowhere": no element, or the page itself (`nowhere`, as the caller reads it). "top": inside
 * the top dialog. "behind": inside a covered dialog, or on the page under the top dialog's scrim. "above": in a surface put
 * in the page after the top dialog opened, as a dropdown's list or a calendar it opened, drawn over it.
 */
export function whereIs(layers: readonly Layer[], node: unknown, nowhere: boolean): Where {
  const top = topOf(layers);
  if (!top) return "free";
  if (nowhere || node === null || node === undefined) return "nowhere";
  const root = top.root();
  if (root !== null && root.contains(node)) return "top";
  if (layers.some((l) => l !== top && l.root()?.contains(node) === true)) return "behind";
  return root !== null && (root.compareDocumentPosition(node) & FOLLOWING) !== 0 ? "above" : "behind";
}

/** What a closing dialog does with focus — leaves it, gives it back where it was, or gives it to the dialog now on top —
 *  and what it arms: that dialog, or what it gave focus back to. */
export type ClosePlan = { move: "none" | "back" | "top"; arm: "none" | "top" | "back" };

/**
 * `wasTop`: the closing dialog was the top one. `focus`: where focus is as it closes: inside it; nowhere (the page itself,
 * a removed element, withheld content); or elsewhere, somewhere real, which is left alone. `back`: where its way back lies
 * among the dialogs still open (`whereIs`).
 */
export function closePlan(wasTop: boolean, focus: "inside" | "nowhere" | "elsewhere", back: Where): ClosePlan {
  if (focus === "elsewhere") return { move: "none", arm: "none" };
  // A covered dialog closing (its quote lapsing under the seal) moves nobody's focus, unless focus was inside it.
  if (!wasTop) return focus === "inside" ? { move: "top", arm: "top" } : { move: "none", arm: "none" };
  // Nothing open any more: back to the control that opened it, armed.
  if (back === "free") return { move: "back", arm: "back" };
  // Its way back lies in the dialog now on top (the seal closing over the confirm), or over it: back there, that dialog armed.
  if (back === "top" || back === "above") return { move: "back", arm: "top" };
  // Its way back is behind the dialog now on top, or gone: that dialog's own first control instead, armed.
  return { move: "top", arm: "top" };
}

/** The dialogs still open whose way back lies inside the closing one; each takes the closing dialog's way back instead. */
export function heirsOf<L extends Layer>(closing: Box | null, remaining: readonly L[]): L[] {
  if (closing === null) return [];
  return remaining.filter((l) => l.restoreTo !== null && l.restoreTo !== undefined && closing.contains(l.restoreTo));
}

/**
 * ⭐ THE ARMING BEAT, IN MILLISECONDS: for this long after a dialog takes focus (on opening, and when a dialog drawn over it
 * closes), and after a closing dialog gives focus back to the page, a fresh Enter or Space there presses nothing.
 * WHY 400. It outlasts the win seal's own rhythm: two seals queued are presented 350 ms apart (`win-celebration.tsx`), so
 * an Enter meant for the second seal that lands on the confirm under them lands inside this beat, never after it (from the
 * moment the second seal is drawn, the confirm is behind it). It covers a double press (two Enters 60 to 250 ms apart; the
 * proven W2 was 60 ms), key chatter (under 50 ms) and the seal's auto-dismiss racing a press. And it is shorter than anyone
 * takes to read a confirm and decide, so a press that follows reading is never refused. The same under reduced motion: it
 * is input, not motion. `test:enter-where-pressed` 5.7 holds it above the seal's gap and at most 600 ms.
 */
export const ARMING_MS = 400;

/** The armed moment: until when, and within what (a dialog's root, or the control focus was given back to). */
export type Beat = { until: number; within: Box | null };

/** True when `node` lies within the armed place and `now` is still inside the beat. */
export function inBeat(beat: Beat | null, node: unknown, now: number): boolean {
  return beat !== null && now < beat.until && beat.within !== null && beat.within.contains(node);
}

/**
 * ⭐ THE KEY GUARD'S DECISION (`key-guard.tsx` asks it of every keydown of the page, first): true when this keydown must
 * press nothing —
 *   · a held key's repeat that would press something, anywhere (`swallowsHeldKey`);
 *   · an Enter or a Space behind the top dialog (a covered dialog's button, the page under the scrim), whatever it is on;
 *   · a fresh press that would press something, in the arming beat.
 * Any other keydown is untouched: with no dialog open, a fresh Enter on Up & Down's UP is a bet, every time (repeat taps
 * are repeat bets, Ali's standing decision) — save in the beat after a closing dialog has just given focus back to it.
 */
export function swallowsKey(key: string, repeat: boolean, target: KeyTarget | null, where: Where, beat: boolean): boolean {
  if (swallowsHeldKey(key, repeat, target)) return true;
  if (key !== "Enter" && key !== " ") return false;
  if (where === "behind") return true;
  return !repeat && beat && pressesSomething(key, target);
}

/**
 * True when a Space released here would press what it is released on though its press did not go down there — held on the
 * dial while the confirm took focus, or swallowed when it went down. Space presses on its release, and the browsers do not
 * agree on what a release on another control does; here it does nothing.
 */
export function swallowsSpaceUp(key: string, target: KeyTarget | null, pressedHere: boolean): boolean {
  return key === " " && !pressedHere && pressesSomething(" ", target);
}

// ── THE PAGE'S OPEN DIALOGS, kept by `Modal`: laid on at opening, taken off at closing (`modal.tsx`) ──────────────────────
const openDialogs: Layer[] = [];
let opened = 0;
let armed: Beat | null = null;

/** The next open order. */
export function nextOpenOrder(): number {
  opened += 1;
  return opened;
}
/** Lays an opening dialog on the stack. */
export function openLayer(layer: Layer): void {
  openDialogs.push(layer);
}
/** Takes a closing dialog off the stack. */
export function closeLayer(layer: Layer): void {
  const at = openDialogs.indexOf(layer);
  if (at >= 0) openDialogs.splice(at, 1);
}
/** The dialogs open now, in no order (`ordered` orders them). */
export function openLayers(): Layer[] {
  return openDialogs.slice();
}
/** True when this dialog is the top one. */
export function isTopLayer(layer: Layer): boolean {
  return topOf(openDialogs) === layer;
}
/** Arms the beat within `within`, from `now` (the caller's clock). */
export function armBeat(within: Box | null, now: number): void {
  armed = { until: now + ARMING_MS, within };
}
/** The armed moment, or null. */
export function currentBeat(): Beat | null {
  return armed;
}

/** What leaving a dialog reads of the page and does to it, handed in by `Modal` (the document), so that
 *  `test:enter-where-pressed` runs this very function on stand-ins. */
export type Page = {
  /** What has focus now. */
  activeElement(): unknown;
  /** True when focus there would be nowhere: no element, the page itself, a removed element, or withheld content. */
  isNowhere(node: unknown): boolean;
  /** Gives focus to `node`. */
  focus(node: unknown): void;
  /** The clock the beat is armed by. */
  now(): number;
};

/**
 * ⭐ A DIALOG LEAVES THE STACK — where focus goes, and what is armed. `Modal` calls this when one of its dialogs closes
 * (or unmounts open); the rules are `closePlan` and `heirsOf`, above.
 * 🔴 It was one line: focus back to whatever had it when the dialog opened, always. So when the win seal closed over the
 * Sell confirm, focus went back to the confirm's money button and a second Enter about 60 ms later SOLD the ticket (W2,
 * proven in a real browser 2026-10-07); and when a confirm's quote lapsed under the seal, focus went back to the dial
 * behind the seal's scrim, where the Enter meant for the seal opened a new confirm.
 * ⭐ Now:
 *   · a dialog still open whose way back lay inside the closing one takes the closing one's way back (`heirsOf`);
 *   · focus moves only when it was inside the closing dialog or nowhere, and never behind the dialog now on top;
 *   · UNCOVERING — the dialog drawn over another closes — focus lands on the uncovered dialog's WAY OUT (`safe`: Cancel,
 *     "Hifadhi nafasi") when it names one, never on its money button: a press meant for the dialog that just closed, or
 *     for a second win seal still on its way (two queued seals are 350 ms apart, and a slow phone draws the second later
 *     still), can at worst close the confirm. A dialog that names none gets focus back where it was, or on its own first
 *     target;
 *   · whatever takes focus is armed (`ARMING_MS`), so a second press a moment later presses nothing — save the page itself:
 *     a dialog opened with focus on the page (the win seal, on a poll tick) gives focus back to nothing and arms nothing,
 *     where it used to arm the whole page for 400 ms.
 */
export function leaveLayer(layer: Layer, page: Page): void {
  const box = layer.root();
  const active = page.activeElement();
  const focus = box !== null && box.contains(active) ? "inside" : page.isNowhere(active) ? "nowhere" : "elsewhere";
  const back = page.isNowhere(layer.restoreTo) ? null : layer.restoreTo;
  const wasTop = isTopLayer(layer);
  closeLayer(layer);
  const rest = openLayers();
  for (const heir of heirsOf(box, rest)) heir.restoreTo = layer.restoreTo;
  const plan = closePlan(wasTop, focus, whereIs(rest, back, back === null));
  if (plan.move === "none") return;
  const top = topOf(rest);
  const now = page.now();
  if (wasTop && top !== null) {
    const safe = top.safe?.() ?? null;
    if (safe !== null) {
      page.focus(safe);
      armBeat(top.root(), now);
      return;
    }
  }
  if (plan.move === "top") {
    top?.focusIn();
    return;
  }
  if (back === null) return;
  page.focus(back);
  armBeat(plan.arm === "top" ? (top?.root() ?? null) : (back as Box), now);
}
