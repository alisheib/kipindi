/**
 * A KEY HELD DOWN FROM BEFORE PRESSES NOTHING IN A DIALOG (Vodacom plan S6 A8i, 2026-10-06 · live for every player).
 *
 * 🔴 WHAT THIS CLOSES. A dialog moves focus onto its primary button 30 ms after it opens (`modal.tsx`). A key that opened
 * it and is still held keeps sending keydowns, and from that instant they land on the primary: the browser presses a
 * focused button on every repeated Enter, and on the release of a Space whose repeat reached it. Holding Enter or Space on
 * the bet dial for about half a second therefore opened the bet confirm and then placed the bet — the confirm was on
 * screen for a frame. The press a dialog asks for must begin inside it.
 *
 * ⭐ THE RULE. While a dialog is open, a key's AUTO-REPEAT (`KeyboardEvent.repeat`) that would press something is
 * swallowed:
 *   · Enter, anywhere but text that takes a new line (a textarea, an editable region) — Enter presses a focused button or
 *     link and submits the form of a focused field;
 *   · Space, on a control Space presses (a button, a summary, a checkbox, a radio, a role that says so) — never in a text
 *     field, where a held Space is typing, and never on a link, which Space does not press.
 * The first keydown of every press is untouched, so a deliberate press works exactly as it did.
 *
 * ⛔ PURE AND DOM-FREE, so `test:enter-where-pressed` runs the very rule the dialog runs; `keyTargetOf` is the one place
 * that reads an element.
 */

/** What the rule needs to know about the element a key went to. */
export type KeyTarget = { tag: string; type: string | null; role: string | null; editable: boolean };

/** `<input type>` values that Space presses. */
const SPACE_PRESSES_INPUT = new Set(["button", "submit", "reset", "image", "checkbox", "radio"]);
/** ARIA roles whose widgets are pressed by Space. */
const SPACE_PRESSES_ROLE = new Set([
  "button", "checkbox", "radio", "switch", "menuitem", "menuitemcheckbox", "menuitemradio", "option", "tab",
]);

function spacePresses(t: KeyTarget): boolean {
  if (t.editable) return false;
  if (t.tag === "INPUT") return SPACE_PRESSES_INPUT.has((t.type ?? "text").toLowerCase());
  if (t.tag === "TEXTAREA" || t.tag === "SELECT") return false;
  if (t.tag === "BUTTON" || t.tag === "SUMMARY") return true;
  return t.role !== null && SPACE_PRESSES_ROLE.has(t.role);
}

/** True when this keydown is a held key's repeat that would press something — the dialog swallows it. */
export function swallowsHeldKey(key: string, repeat: boolean, target: KeyTarget | null): boolean {
  if (!repeat) return false;
  if (key === "Enter") return !(target && (target.tag === "TEXTAREA" || target.editable));
  if (key === " ") return target !== null && spacePresses(target);
  return false;
}

/** The element a keydown went to, as the rule reads it; `null` when the target is not an element. */
export function keyTargetOf(el: EventTarget | null): KeyTarget | null {
  const e = el as HTMLElement | null;
  if (!e || typeof e.tagName !== "string") return null;
  return { tag: e.tagName.toUpperCase(), type: e.getAttribute("type"), role: e.getAttribute("role"), editable: e.isContentEditable === true };
}
