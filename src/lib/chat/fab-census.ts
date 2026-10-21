/**
 * WHAT LIES UNDER THE CHAT BUBBLE WHERE IT RESTS (MASWALI-BUILD S5-FIX-PLATFORM D15, 2026-10-21; the register critic's M5,
 * ruled by the lead 2026-10-21, the 10/10 pass).
 *
 * The bubble (ChatRoot's `.cm-fab`) is fixed bottom-right over every page. D3 clears it while the page moves and D75 once
 * the reader has left the page alone for 3s (globals.css); between the two it stood at full ink over whatever lay under
 * it: a Millionea week page's Money out, How to play's worked figures, every right-aligned figure of a classic page. The
 * Needle answers the same question by MOVING its rest off the text (`needle-rest.ts`); a support button that moves is
 * disorienting, so the bubble YIELDS in place: ChatRoot marks it `data-over-content` while this census finds a line of
 * text or a figure under it, and globals.css (D15) takes it to `--state-yield-opacity` — still live, never disabled.
 *
 * The census, the Needle's own terms for "under it": visible text (each line box of a text node, its parent seen —
 * not `visibility: hidden`, not under an `opacity: 0` ancestor, not a 1px screen-reader box) and every `.amount` box,
 * against the bubble's RESTING rect: its painted `.cm-bubble`, with the fade's own translate taken back off (D3/D75 move
 * the wrapper 8px down) and grown by its pulse ring at its widest (`bubbleInk`, the one definition the Needle's rest
 * reads too). The walk enters only the subtrees whose box reaches that rect (or that overflow their box), so a long page
 * costs what the few elements at the bottom-right cost. Never counted: the bubble itself, the Needle, and what holds no
 * laid-out text (script, style, a select's options, a text field's value).
 *
 * DOM only, no React: ChatRoot asks it at most once a frame (on a scroll, a resize, a change of page or of the body's
 * size, the fonts' arrival, and whenever D3 or D75 hands the bubble back); `qa:chat-yield` drives the result.
 */
import { bubbleInk, type Box } from "@/lib/needle-rest";

/** Elements whose own text is not laid-out page text: never walked into. */
const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "IFRAME", "SELECT", "TEXTAREA", "INPUT"]);
/** The Needle (`needle.tsx`): a fidget the page's text is not. */
const NEEDLE_ROOT = "needle-root";

type Rect = { left: number; right: number; top: number; bottom: number };
const meets = (a: Rect, b: Rect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

/** Both spellings of the options, as the Needle asks (Chromium 105–120 read `checkOpacity`/`checkVisibilityCSS`). */
type CheckVisibility = (o?: { opacityProperty?: boolean; visibilityProperty?: boolean; checkOpacity?: boolean; checkVisibilityCSS?: boolean }) => boolean;
function seen(el: Element): boolean {
  const check = (el as Element & { checkVisibility?: CheckVisibility }).checkVisibility;
  return check
    ? check.call(el, { opacityProperty: true, visibilityProperty: true, checkOpacity: true, checkVisibilityCSS: true })
    : getComputedStyle(el).visibility === "visible";
}

/** The bubble where it RESTS, in viewport px: its painted `.cm-bubble`, the fade's translate taken back off, grown by its
 *  ring (`bubbleInk`). Null when it is not laid out. */
export function restingRect(fab: HTMLElement): Box | null {
  const bubble = fab.querySelector<HTMLElement>(".cm-bubble") ?? fab;
  const r = bubble.getBoundingClientRect();
  if (r.width < 1 || r.height < 1) return null;
  const t = getComputedStyle(fab).transform;
  const m = t && t !== "none" ? new DOMMatrixReadOnly(t) : null;
  const dx = m ? m.e : 0;
  const dy = m ? m.f : 0;
  return bubbleInk({ left: r.left - dx, right: r.right - dx, top: r.top - dy, bottom: r.bottom - dy });
}

/** Whether a figure (`.amount`) or a visible line of text lies under the bubble's resting rect. */
export function contentUnder(fab: HTMLElement): boolean {
  const rect = restingRect(fab);
  if (!rect) return false;
  for (const a of document.querySelectorAll<HTMLElement>(".amount")) {
    if (fab.contains(a)) continue;
    const r = a.getBoundingClientRect();
    if (r.width > 1 && r.height > 1 && meets(rect, r) && seen(a)) return true;
  }
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      if (n.nodeType === Node.TEXT_NODE) return (n.textContent || "").trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      const el = n as Element;
      if (el === fab || el.id === NEEDLE_ROOT || SKIP.has(el.tagName)) return NodeFilter.FILTER_REJECT;
      const r = el.getBoundingClientRect();
      // `display: contents` reports an empty box and still holds laid-out text; any other empty box holds none.
      if (r.width === 0 && r.height === 0) return getComputedStyle(el).display === "contents" ? NodeFilter.FILTER_SKIP : NodeFilter.FILTER_REJECT;
      if (meets(rect, r)) return NodeFilter.FILTER_SKIP;
      const overflows = el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;
      return overflows ? NodeFilter.FILTER_SKIP : NodeFilter.FILTER_REJECT;
    },
  });
  const range = document.createRange();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement;
    if (!parent) continue;
    range.selectNodeContents(node);
    for (const line of range.getClientRects()) {
      if (line.width <= 1 || line.height <= 1 || !meets(rect, line)) continue;
      if (seen(parent)) return true;
      break;
    }
  }
  return false;
}
