/**
 * A KEY HELD DOWN PRESSES ONCE, WHEREVER IT IS (Vodacom plan S6 A8i, 2026-10-06; on the whole page since A8i-2, 2026-10-07 ·
 * live for every player).
 *
 * 🔴 WHAT THIS CLOSES. A dialog moves focus onto its primary button 30 ms after it opens (`modal.tsx`). A key that opened
 * it and is still held keeps sending keydowns, and from that instant they land on the primary: the browser presses a
 * focused button on every repeated Enter, and on the release of a Space whose repeat reached it. Holding Enter or Space on
 * the bet dial for about half a second therefore opened the bet confirm and then placed the bet — the confirm was on
 * screen for a frame. The press a dialog asks for must begin inside it.
 * 🔴 AND OUTSIDE A DIALOG (A8i-2). A8i ran this rule only inside an open dialog, so Enter held on Up & Down's UP placed a
 * new bet on every repeat — about thirty a second, each with its own idempotency key — and Enter held on "Hifadhi nafasi"
 * closed the Sell confirm and its repeats opened it again (proven in a real browser). The key guard (`key-guard.tsx`) now
 * runs this rule on every keydown of the page, first, in the window's capture phase.
 *
 * ⭐ THE RULE. A key's AUTO-REPEAT (`KeyboardEvent.repeat`) that would press something is swallowed (`swallowsHeldKey`).
 * What presses (`pressesSomething`):
 *   · Enter, anywhere but text that takes a new line (a textarea, an editable region) — Enter presses a focused button or
 *     link and submits the form of a focused field;
 *   · Space, on a control Space presses (a button, a summary, a checkbox, a radio, a role that says so) — never in a text
 *     field, where a held Space is typing, and never on a link, which Space does not press.
 * The first keydown of every press is untouched by this rule, so a deliberate press works exactly as it did: a tap of
 * Enter on UP is a bet each time (repeat taps are repeat bets, Ali's standing decision). Only the dialog stack refuses a
 * fresh press — behind the top dialog, in a dialog's first moment, and on what a closing dialog has just given focus back
 * to (`modal-stack.ts`).
 *
 * ⛔ PURE AND DOM-FREE, so `test:enter-where-pressed` runs the very rule the guard runs; `keyTargetOf` is the one place
 * that reads an element, and `test:enter-where-pressed` 1.7 runs it on element-shaped stand-ins.
 */

/** What the rule needs to know about the element a key went to. */
export type KeyTarget = { tag: string; type: string | null; role: string | null; editable: boolean };

/** `<input type>` values that Space presses. */
const SPACE_PRESSES_INPUT = new Set(["button", "submit", "reset", "image", "checkbox", "radio"]);
/** ARIA roles whose widgets are pressed by Space. ⭐ `slider` (S6 A8i-2): the bet dial is a slider, and Space on it OPENS
 *  the bet confirm (`conviction-dial.tsx`), so a held Space's repeats there, or a fresh Space in the beat after a dialog
 *  hands focus back to it, would open a new confirm with a new key — the K defect, on Space. */
const SPACE_PRESSES_ROLE = new Set([
  "button", "checkbox", "radio", "switch", "menuitem", "menuitemcheckbox", "menuitemradio", "option", "tab", "slider",
]);

function spacePresses(t: KeyTarget): boolean {
  if (t.editable) return false;
  if (t.tag === "INPUT") return SPACE_PRESSES_INPUT.has((t.type ?? "text").toLowerCase());
  if (t.tag === "TEXTAREA" || t.tag === "SELECT") return false;
  if (t.tag === "BUTTON" || t.tag === "SUMMARY") return true;
  return t.role !== null && SPACE_PRESSES_ROLE.has(t.role);
}

/** True when this key, pressed on this target, presses something: what a held repeat is swallowed for here, and what the
 *  dialog stack refuses in an arming beat (`modal-stack.ts`; behind the top dialog it refuses every Enter and Space). */
export function pressesSomething(key: string, target: KeyTarget | null): boolean {
  if (key === "Enter") return !(target && (target.tag === "TEXTAREA" || target.editable));
  if (key === " ") return target !== null && spacePresses(target);
  return false;
}

/** True when this keydown is a held key's repeat that would press something — the key guard swallows it, wherever it lands. */
export function swallowsHeldKey(key: string, repeat: boolean, target: KeyTarget | null): boolean {
  return repeat && pressesSomething(key, target);
}

/** The element a keydown went to, as the rule reads it; `null` when the target is not an element. */
export function keyTargetOf(el: EventTarget | null): KeyTarget | null {
  const e = el as HTMLElement | null;
  if (!e || typeof e.tagName !== "string") return null;
  return { tag: e.tagName.toUpperCase(), type: e.getAttribute("type"), role: e.getAttribute("role"), editable: e.isContentEditable === true };
}
