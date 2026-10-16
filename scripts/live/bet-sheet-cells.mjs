/** S8 WP11: shared served-document traces and browser verdicts, used unchanged by the negative controls. */
export const BET_SHEET_TESTIDS = ["journey-bet-buttons", "journey-home-break", "journey-question-ghost"];
export const BET_SHEET_SELECTORS = {
  root: '[data-testid="journey-bet-sheet"]',
  scroll: '[data-testid="journey-sheet-scroll"]',
  stake: '[data-testid="journey-sheet-stake"]',
  place: '[data-testid="journey-sheet-place"]',
  close: ".kp-bsheet__close",
  deposit: '[data-testid="journey-sheet-deposit"]',
  instead: '[data-testid="journey-sheet-bet-instead"]',
  ticket: ".kp-bsheet__ticket-link",
  pick: "[data-sheet] a[data-bet-side]",
};
const normalized = text => String(text ?? "").replace(/\\+"/g, '"');
export function betSheetTracesIn(html) {
  const text = normalized(html);
  const ids = BET_SHEET_TESTIDS.filter(id => new RegExp(`(?:data-testid\\s*=\\s*|"(?:data-testid|testId)"\\s*:\\s*)"${id}"`).test(text));
  if (/\bdata-sheet(?![\w-])(?:\s*=|"\s*:)/.test(text)) ids.push("data-sheet");
  if (/(?:class\s*=\s*|"className"\s*:\s*)"[^"]*(?<![\w-])kp-bsheet(?![\w-])/.test(text)) ids.push("kp-bsheet");
  return ids;
}
export function betSheetTracesControl() {
  const problems = [];
  for (const id of BET_SHEET_TESTIDS) for (const text of [
    `<div data-testid="${id}">`, JSON.stringify({ "data-testid": id }), JSON.stringify(JSON.stringify({ "data-testid": id })),
  ]) if (betSheetTracesIn(text).join() !== id) problems.push(`unread ${id}: ${text}`);
  for (const [marker, text] of [["data-sheet", '<article data-sheet="{}">'], ["data-sheet", JSON.stringify({ "data-sheet": "{}" })],
    ["kp-bsheet", '<div class="x kp-bsheet y">'], ["kp-bsheet", JSON.stringify({ className: "kp-bsheet" })]]) {
    if (betSheetTracesIn(text).join() !== marker) problems.push(`unread ${marker}`);
  }
  const clean = '<div data-sheet-open="true" data-testid="journey-bet-buttons-x" class="kp-bsheet__shell"></div><p>data-sheet kp-bsheet</p>';
  if (betSheetTracesIn(clean).length) problems.push("classic filter sheet or marker suffix is falsely matched");
  return problems;
}

/** Serializes into a browser; every selector is passed in so the probe holds no Node closure. */
export function betSheetDomProbe(selectors) {
  const root = document.querySelector(selectors.root);
  if (!root) return { present: false };
  const visible = el => !!el && getComputedStyle(el).display !== "none" && getComputedStyle(el).visibility !== "hidden" && el.getBoundingClientRect().width > 0;
  const rect = el => { if (!el) return null; const r = el.getBoundingClientRect(); return { top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
  const stake = root.querySelector(selectors.stake), place = root.querySelector(selectors.place), heading = root.querySelector("h2");
  const box = stake?.closest("span.field-measure");
  const deposit = root.querySelector(selectors.deposit);
  const scroller = root.querySelector(selectors.scroll), scrollBox = rect(scroller), stakeBox = rect(stake);
  const stakeClipped = !!stakeBox && !!scrollBox && (stakeBox.top < scrollBox.top - 1 || stakeBox.bottom > scrollBox.bottom + 1 || stakeBox.left < scrollBox.left - 1 || stakeBox.right > scrollBox.right + 1);
  const stakePainted = !!stakeBox && document.elementsFromPoint((stakeBox.left + stakeBox.right) / 2, (stakeBox.top + stakeBox.bottom) / 2).some(el => el === stake);
  return {
    present: true, frame: root.dataset.frame, focusedInside: root.contains(document.activeElement), headingFocused: heading === document.activeElement,
    viewport: { width: innerWidth, height: innerHeight, visualHeight: visualViewport?.height ?? innerHeight },
    root: rect(root), heading: rect(heading), stake: stakeBox, place: rect(place), close: rect(root.querySelector(selectors.close)), scroll: scrollBox, stakeClipped, stakePainted,
    stakeValue: stake?.value, stakeInvalid: stake?.getAttribute("aria-invalid"), stakeLocked: !!stake?.disabled,
    attentionBorder: box ? { width: getComputedStyle(box).borderTopWidth, color: getComputedStyle(box).borderTopColor, background: getComputedStyle(box).backgroundColor } : null,
    placeDisabled: place ? !!place.disabled : null,
    describedBy: stake?.getAttribute("aria-describedby"),
    scrollPaddingBottom: getComputedStyle(root).paddingBottom,
    visibleDeposit: visible(root.querySelector(selectors.deposit)), visibleInstead: visible(root.querySelector(selectors.instead)),
    depositPaint: deposit ? { image: getComputedStyle(deposit).backgroundImage, color: getComputedStyle(deposit).color } : null,
    overflow: root.scrollWidth - root.clientWidth, text: root.innerText,
  };
}
export function betSheetDomVerdict(probe, { frame = null, focus = false, trap = false, safeInset = 0, keyboard = false, depositMetal = false } = {}) {
  const errors = [];
  if (!probe.present) return ["sheet absent"];
  if (frame && probe.frame !== frame) errors.push(`frame ${probe.frame}, expected ${frame}`);
  if (focus && !probe.headingFocused) errors.push("initial focus is not the heading");
  if (trap && !probe.focusedInside) errors.push("focus escaped the sheet");
  if (probe.overflow > 1) errors.push(`sheet horizontal overflow ${probe.overflow}px`);
  if (probe.root.left < -1 || probe.root.right > probe.viewport.width + 1) errors.push("sheet exceeds viewport width");
  if (safeInset > 0 && probe.place && probe.place.bottom > probe.viewport.height - safeInset + 1) errors.push("CTA enters the bottom safe area");
  if (keyboard && probe.stake && (probe.stake.top < 0 || probe.stake.bottom > probe.viewport.visualHeight + 1)) errors.push("stake lies behind the keyboard");
  if (keyboard && probe.stake && probe.stakeClipped) errors.push("stake is clipped by the sheet scroller");
  if (keyboard && probe.stake && !probe.stakePainted) errors.push("stake is obscured");
  if (keyboard && probe.place && probe.place.bottom > probe.viewport.visualHeight + 1) errors.push("CTA lies behind the keyboard");
  if (keyboard && probe.close && (probe.close.top < 0 || probe.close.bottom > probe.viewport.visualHeight + 1)) errors.push("CloseX lies behind the keyboard");
  if (depositMetal && probe.visibleDeposit && !probe.depositPaint?.image.includes("gradient(")) errors.push("deposit loses its gold material");
  if (["placing", "inDoubt"].includes(probe.frame) && !probe.stakeLocked) errors.push("frozen intent stake remains editable");
  if (["low", "lossRoom", "pending"].includes(probe.frame)) {
    if (probe.stakeInvalid !== "true") errors.push("low stake does not announce invalid");
    if (!probe.describedBy) errors.push("low stake lacks its explanatory relationship");
    if (probe.attentionBorder?.width !== "2px") errors.push("attention lacks its 2px noncolour cue");
    if (probe.placeDisabled !== true) errors.push("low frame accepts the full stake");
  }
  return errors;
}
/**
 * Round V2 (S8-PLAN A25) · the geometry the close's tile read judged by eye, measured: the grab's height (item 7), the
 * middle's top edge against every text line and control (item 8), whether the middle hides anything at either edge
 * (item 9), each option of the low frame inside the middle and above the footer (item 4), the reason line above the
 * commit (item 3), the commit's separator on its amount's line (item 10), the deposit amounts' pill radius (item 18).
 * Serializes into a browser; every selector is passed in.
 */
export function betSheetLayoutProbe(selectors) {
  const root = document.querySelector(selectors.root);
  if (!root) return { present: false };
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, height: r.height }; };
  const scroller = root.querySelector(selectors.scroll), port = box(scroller), footer = box(root.querySelector(".kp-bsheet__footer"));
  const rows = [];
  if (scroller) {
    const range = document.createRange(), walker = document.createTreeWalker(scroller, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent.trim() || n.parentElement?.closest(".sr-only")) continue;
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) if (r.height > 0) rows.push({ top: r.top, bottom: r.bottom, what: n.textContent.trim().slice(0, 24) });
    }
    for (const el of scroller.querySelectorAll("input, button")) { const r = el.getBoundingClientRect(); if (r.height > 0) rows.push({ top: r.top, bottom: r.bottom, what: el.tagName }); }
  }
  const cutTop = port ? rows.filter((r) => r.top < port.top - 0.5 && r.bottom > port.top + 0.5) : [];
  const inside = (el) => { const b = box(el); return !!b && !!port && b.top >= port.top - 0.5 && b.bottom <= port.bottom + 0.5 && (!footer || b.bottom <= footer.top + 0.5); };
  const option = (selector) => { const el = root.querySelector(selector); return el ? { box: box(el), inside: inside(el) } : null; };
  const place = root.querySelector(selectors.place), reason = root.querySelector('[data-testid="journey-sheet-reason"]');
  let separatorWithAmount = null;
  const held = place?.querySelector("span.whitespace-nowrap");
  if (held?.firstChild) {
    const dot = document.createRange(); dot.setStart(held.firstChild, 0); dot.setEnd(held.firstChild, 1);
    const amount = held.querySelector(".amount");
    separatorWithAmount = !!amount && Math.abs(dot.getBoundingClientRect().top - amount.getClientRects()[0].top) < 2;
  }
  const pill = root.querySelector('[data-testid="journey-sheet-deposit-amounts"] button');
  return {
    present: true, frame: root.dataset.frame,
    grabHeight: box(root.querySelector(".kp-wsheet__grab"))?.height ?? null,
    port, footer, scrollTop: scroller?.scrollTop ?? null, overflowing: scroller ? scroller.scrollHeight > scroller.clientHeight + 1 : null,
    cutTop: cutTop.map((r) => r.what),
    deposit: option(selectors.deposit), instead: option(selectors.instead), amounts: option('[data-testid="journey-sheet-deposit-amounts"]'),
    callout: option("[data-low-start]"),
    reason: box(reason), reasonText: reason?.textContent ?? null, place: box(place), placeDisabled: place ? !!place.disabled : null,
    separatorWithAmount,
    pillRound: pill ? parseFloat(getComputedStyle(pill).borderTopLeftRadius) >= pill.getBoundingClientRect().height / 2 - 0.5 : null,
    visualHeight: visualViewport?.height ?? innerHeight,
  };
}
export function onceOnlyVerdict(before, after, requestCount, count = 1, expectedRequests = count) {
  const errors = [];
  if (requestCount !== expectedRequests) errors.push(`${requestCount} action requests, expected ${expectedRequests}`);
  if (after.positionCount - before.positionCount !== count) errors.push("position count differs from committed intents");
  if (after.betPlacedCount - before.betPlacedCount !== count) errors.push("BET_PLACED row count differs from committed intents");
  const fresh = after.positions.filter(p => !before.positions.some(b => b.positionId === p.positionId));
  if (new Set(fresh.map(p => p.key)).size !== count || fresh.some(p => !p.key)) errors.push("new positions do not have distinct nonempty keys");
  return errors;
}

export const NOT_DRIVEN_MATRIX = [
  { row: 11, reason: "account_blocked divergence", proof: "test:bet-sheet §2 and test:journey-sheet" },
  { row: 18, reason: "missing wallet", proof: "test:bet-sheet §2 and test:journey-sheet" },
  { row: 23, reason: "missing parameters", proof: "test:bet-sheet §2" },
  { row: 23, reason: "invalid side", proof: "test:bet-sheet §2" },
];
