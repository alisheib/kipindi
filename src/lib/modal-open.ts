/**
 * IS A MODAL DIALOG ACTUALLY ON SCREEN? — one answer for everything that must not interrupt one.
 *
 * 🔴 WHY THIS EXISTS (found 2026-09-13, on a screenshot that should have shown the socials panel). Two
 * surfaces asked `document.querySelector('[role="dialog"][aria-modal="true"]')` — the reality-check
 * reminder (responsible gambling) and the socials panel — and deferred whenever it matched. The markets
 * filter sheet keeps its panel in the DOM with `role="dialog" aria-modal="true"` while CLOSED (zero size),
 * so on /markets the selector ALWAYS matched: the socials panel never appeared there, and the reality check
 * deferred every 30 seconds for as long as a player stayed on the board. A reminder that silently never
 * fires is the worst failure a responsible-gambling control can have.
 *
 * ⭐ A dialog counts only when it has a box and is not hidden — what a person could actually see. Both
 * `dialog` and `alertdialog` count: the money confirmations are alert dialogs, which the old selector missed.
 *
 * ⛔ DOM ONLY, NO REACT, NO "use client": call it from an effect or an event handler, never during render.
 */
export function isModalDialogOpen(doc: Document = document): boolean {
  const nodes = doc.querySelectorAll('[role="dialog"][aria-modal="true"], [role="alertdialog"][aria-modal="true"]');
  for (const el of nodes) {
    const box = (el as HTMLElement).getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) continue;
    const style = getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none" || style.opacity === "0") continue;
    return true;
  }
  return false;
}
