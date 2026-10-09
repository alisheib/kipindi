  /* ── ⭐ E-400 ① · COME TO REST WHERE NOTHING IS UNDER IT ─────────────────────────────────────────────────────
     Measured 2026-09-14 at 360 and 768: the parked disc and its tap pad cover a 12–16px strip of the right edge at one
     fixed height, and landed on an interactive control in 6 of 40 samples (a CTA's end, the Rounds/Chart toggle, a
     footer link). No static pose fixes that — a deeper tuck is a 16px target, under the 24px minimum exactly where it
     overlaps. So on REST (a park or a sleep), on SCROLL-IDLE, on a route change and on a resize, the host measures the
     footprint (the visible disc ∪ the tap pad); if an interactive element is under it, it picks the NEAREST rail
     position within a third of the viewport where nothing is, and glides there on the engine's OWN park spring
     (`target` + `parking`, exactly the path `parkTo` takes) — or snaps under reduced motion. If no clear position
     exists within reach it stays where it is. The engine is not edited: this is host logic, like `nearestEdge`.
     ⛔ Never while held, mid-throw, parking, suppressed, or on a top/bottom edge; never chained (a glide's own park
     does not re-check); `test:needle-rest` reviews the glide frame by frame.
     ⭐ 2026-10-09 · R3-B · THE DECISION IS GEOMETRY NOW, IN `@/lib/needle-rest`: this host reads the page — the
     controls, the open floating surfaces, the visible text near the rail — and hands it the boxes. The tiers (clear of
     the GLOW, then the rim 8px clear of everything, then 4px, then off every control), the reseat on a viewport change
     and the record that stops a chained glide are documented there, once, and `test:needle-host` proves them on the
     vendored engine without a browser. Three triggers were added here: a check asked for mid-glide runs when the glide
     lands, an open surface mounting or going asks for one, and a viewport change re-seats a disc on its way to a rest. */
  const INTERACTIVE = 'a[href],button,input:not([type="hidden"]),select,textarea,summary,[role="button"],[role="link"],[role="tab"],[role="switch"],[role="checkbox"],[role="menuitem"],[tabindex]:not([tabindex="-1"])';
  /* ⭐ R3-B ③ · THE OPEN FLOATING SURFACES A PARKED DISC MUST NEVER COVER (tile 321: the disc on the open channels
     panel, hiding its right border). The house's two markers — `data-needle-keepout` (the rails, the rail's coin, the
     channels panel: until now an obstacle to a THROWN disc only) and `data-invitation` (every floating invitation card)
     — and any popup that floats: a dialog, menu or listbox laid out fixed or absolute. One laid out in the flow is a
     row of options (the hub's language row), and its options are counted as controls. Each counts WHOLE. */
  const SURFACES = '[data-needle-keepout],[data-invitation],[role="dialog"],[role="alertdialog"],[role="menu"],[role="listbox"],dialog[open]';
  const MARKED = "[data-needle-keepout],[data-invitation]";
  let gliding = false;
  let glideQuietUntil = 0;
  let clearTimer: number | null = null;
  /* ⭐ R3-B · A CHECK ASKED FOR WHILE A GLIDE IS IN FLIGHT IS NOT DROPPED. It was: `clearRestY` answered "not
     parked" and the landing re-checks nothing, so a glide chosen for one scroll position landed after the page had
     moved and stayed there — the disc on the preview strip's "Toka kwenye onyesho" pill at 1024, its rim at x992
     against the pill's border at x991 (257, and 265 273 in the other two languages, all three at y≈64). The landing
     still asks for nothing by itself (no chain); a scroll, a resize, a route or a surface DURING the glide does. */
  let recheckOnLand = false;
  type Band = { left: number; right: number };
  const boxOf = (r: Box): Box => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom });
  /* The footprint from the ENGINE's pose, not the DOM: the disc's box (the tap pad sits inside it on a side rail),
     clipped to the viewport. ⚠️ Measured 2026-09-14: under reduced motion the app's universal clamp gives #needle a
     near-zero transition, so getBoundingClientRect() right after a paint still returned the previous position and the
     rest check looked at the wrong place. Geometry has no such lag. */
  function footprint(): Box {
    const v = viewport();
    return { left: Math.max(0, body.x), right: Math.min(v.w, body.x + body.size), top: body.y, bottom: body.y + body.size };
  }
  /** How far the glow reaches past the disc at this size (`glowReach`; `--halo` is `haloInset()`, a negative %). */
  const glow = () => glowReach(body.size, -haloInset() / 100);
  /* What must not be under the disc is a control's CONTENT — its text, icon or field — or the whole of a SMALL
     control (≤ 64px either way). Measured: on /markets and /live every rail height crosses a full-width card link, so
     "any control" left no clear position at all, while 16px of a 328px card's padding hides nothing a player needs.
     The session-96 cases were all content: a CTA's label end, the Rounds/Chart toggle, a footer link. */
  const SMALL_CONTROL = 64;
  function contentRects(n: HTMLElement, band: Band) {
    const out: Box[] = [];
    const r = n.getBoundingClientRect();
    const inBand = (x: Box) => x.right >= band.left && x.left <= band.right;
    if (r.width <= SMALL_CONTROL || r.height <= SMALL_CONTROL || n.matches("input,select,textarea")) {
      if (inBand(r)) out.push(boxOf(r));
      return out;
    }
    const walker = document.createTreeWalker(n, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!(node.textContent || "").trim() || node.parentElement?.closest("svg")) continue;
      range.selectNodeContents(node);
      for (const t of range.getClientRects()) if (t.width > 0 && inBand(t)) out.push(boxOf(t));
    }
    for (const e of n.querySelectorAll("svg,img,video,canvas,input,select,textarea")) {
      if (e.parentElement?.closest("svg")) continue;
      const t = e.getBoundingClientRect();
      if (t.width > 0 && inBand(t)) out.push(boxOf(t));
    }
    return out;
  }
  function controlsInBand(band: Band) {
    const out: Box[] = [];
    for (const n of document.querySelectorAll<HTMLElement>(INTERACTIVE)) {
      if (root.contains(n)) continue;
      const r = n.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      if (r.right < band.left || r.left > band.right) continue;
      if (r.bottom < -viewport().h || r.top > 2 * viewport().h) continue;
      const cs = getComputedStyle(n);
      if (cs.visibility === "hidden" || cs.pointerEvents === "none") continue;
      out.push(...contentRects(n, band));
    }
    return out;
  }
  function surfacesInBand(band: Band) {
    const out: Box[] = [];
    for (const n of document.querySelectorAll<HTMLElement>(SURFACES)) {
      if (root.contains(n)) continue;
      const r = n.getBoundingClientRect();
      if (r.width < 1 || r.height < 1 || r.right < band.left || r.left > band.right) continue;
      if (!n.matches(MARKED) && !/^(fixed|absolute)$/.test(getComputedStyle(n).position)) continue;
      if (!seen(n)) continue;
      out.push(boxOf(r));
    }
    return out;
  }
  /* ⭐ 2026-10-08 · G1 [193] · READABLE TEXT IS SOMETHING UNDER IT TOO. The census above counts CONTROLS only
     (the session-96 cases), so the disc rested on the /markets stat line at 390 in Swahili — "● 40 hai · TZS 49K
     katika mchezo" cut at "mche", the board's own money figure line, which is text and not a control. ⛔ The page
     reserves no room for the rest position, and never did: the `needle-rest.css` that `bottom-nav.tsx` cites was
     never written (no commit ever added it) — the rest position is this host logic, and it had a blind spot.
     So the visible text in the band is read as well: a TreeWalker over the page that skips the Needle, controls
     (counted above, by their own rule), script, and every subtree whose box neither reaches the band nor overflows —
     so on a phone it reads the few elements at the right edge, not the page. Text that is not seen
     (`visibility: hidden` slides, an `opacity: 0` ancestor, a 1px screen-reader-only box) is not counted.
     ⭐ R3-B · AND ITS INK, NOT JUST ITS GLYPHS: text in a box painted round it (a roundel, a pill, a chip, a badge)
     counts as the box — the footer's 18+ roundel's ring was 0–1px from the disc at 1280 and 320 (301 309 310) while
     its glyphs sat 6px further in. A small picture outside any control (an icon, a mark, an avatar, ≤ 64px) counts
     as text; a larger one is a surface (art, a background, a chart's field). */
  const TEXT_SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "IFRAME", "SELECT", "TEXTAREA"]);
  const MEDIA = new Set(["svg", "IMG", "CANVAS", "VIDEO"]);
  const SMALL_MEDIA = 64;
  // Both spellings of the options: Chromium 105–120 read `checkOpacity`/`checkVisibilityCSS`, later engines the
  // `…Property` names; an engine ignores the pair it does not know.
  type CheckVisibility = (o?: { opacityProperty?: boolean; visibilityProperty?: boolean; checkOpacity?: boolean; checkVisibilityCSS?: boolean }) => boolean;
  function seen(el: Element) {
    const check = (el as Element & { checkVisibility?: CheckVisibility }).checkVisibility;
    return check
      ? check.call(el, { opacityProperty: true, visibilityProperty: true, checkOpacity: true, checkVisibilityCSS: true })
      : getComputedStyle(el).visibility === "visible";
  }
  /** A computed colour that paints nothing: `transparent`, or any colour function whose alpha is 0. */
  const unpainted = (c: string) => !c || c === "transparent" || /[,/]\s*0(?:\.0*)?\s*\)$/.test(c);
  /** The box painted round a line of text, when one hugs it (≤ 24px taller, ≤ 48px wider) — else null. */
  function paintedBox(el: Element, t: Box): Box | null {
    const r = el.getBoundingClientRect();
    if (r.height > t.bottom - t.top + 24 || r.width > t.right - t.left + 48) return null;
    const s = getComputedStyle(el);
    const border = (["Top", "Right", "Bottom", "Left"] as const).some((k) => parseFloat(s[`border${k}Width`]) > 0 && !unpainted(s[`border${k}Color`]));
    return border || !unpainted(s.backgroundColor) || s.backgroundImage !== "none" || s.boxShadow !== "none" ? boxOf(r) : null;
  }
  function textInBand(band: Band, rows: { top: number; bottom: number }) {
    const out: Box[] = [];
    const inBand = (x: Box) => x.right >= band.left && x.left <= band.right;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        if (n.nodeType === Node.TEXT_NODE) return (n.textContent || "").trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        const el = n as Element;
        if (el === root || TEXT_SKIP.has(el.tagName) || el.matches(INTERACTIVE)) return NodeFilter.FILTER_REJECT;
        const r = el.getBoundingClientRect();
        // `display: contents` reports an empty box and still holds laid-out text; any other empty box holds none.
        if (r.width === 0 && r.height === 0) return getComputedStyle(el).display === "contents" ? NodeFilter.FILTER_SKIP : NodeFilter.FILTER_REJECT;
        // Only the rows a rest within reach can occupy (the caller's window), so a long page costs nothing extra.
        const near = inBand(r) && r.bottom >= rows.top && r.top <= rows.bottom;
        if (MEDIA.has(el.tagName)) {
          // Counted here and never walked into: an svg's own <text> is part of its picture.
          if (near && r.width > 1 && r.height > 1 && r.width <= SMALL_MEDIA && r.height <= SMALL_MEDIA && seen(el)) out.push(boxOf(r));
          return NodeFilter.FILTER_REJECT;
        }
        const overflows = el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;
        return near || overflows ? NodeFilter.FILTER_SKIP : NodeFilter.FILTER_REJECT;
      },
    });
    const range = document.createRange();
    const inks = new Map<Element, Box | null>();
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const parent = node.parentElement;
      if (!parent) continue;
      range.selectNodeContents(node);
      let visible: boolean | null = null;
      for (const t of range.getClientRects()) {
        if (t.width <= 1 || t.height <= 1) continue;
        if (!inks.has(parent)) inks.set(parent, paintedBox(parent, t));
        const ink = inks.get(parent) ?? boxOf(t);
        if (!inBand(ink)) continue;
        visible ??= seen(parent);
        if (!visible) break;
        out.push(ink);
      }
    }
    return out;
  }
  /* The tier a rest was taken at, and where (its y and the page's scroll): the rest is not re-decided until the page
     moves under it, or what is under it gets worse than that tier — E-413's rule (`test:needle-rest` §1) that a rest
     never chains into a second glide. Compared with 2px of slack: the park spring lands within a pixel of its target. */
  let accepted: { tier: number; y: number; sx: number; sy: number } | null = null;
  /** The y to rest at, or `null` to stay (already at its best, nothing better within reach, or not applicable). */
  function clearRestY(): number | null {
    if (!body.parked || body.held || body.parking || isSuppressed()) return null;
    if (body.edge !== "left" && body.edge !== "right") return null;
    const fp = footprint();
    const g = glow();
    const pad = censusPad(g);
    const band = { left: fp.left - pad, right: fp.right + pad };
    const reach = viewport().h / 3;
    const L = body.limits();
    const { minY, maxY } = railRange({ minX: L.minX, maxX: L.maxX, minY: L.minY, maxY: L.maxY, size: body.size });
    const here = accepted !== null && Math.abs(accepted.y - body.y) < 2
      && accepted.sx === window.scrollX && accepted.sy === window.scrollY;
    const r = decideRest({
      fp,
      controls: [...controlsInBand(band), ...surfacesInBand(band)],
      text: textInBand(band, { top: fp.top - reach - pad, bottom: fp.bottom + reach + pad }),
      glow: g, reach, minY, maxY, y: body.y,
      accepted: here && accepted ? accepted.tier : null,
    });
    accepted = r.tier === 0 ? null : { tier: r.tier, y: r.y ?? body.y, sx: window.scrollX, sy: window.scrollY };
    return r.y;
  }
  function settleClear() {
    clearTimer = null;
    if (gliding) { recheckOnLand = true; return; }
    const y = clearRestY();
    if (y === null) return;
    if (calmed) {
      body.y = y;
      body.snapPark(body.edge);
      paint(0);
      save();
      return;
    }
    gliding = true;
    body.parked = false;
    body.parking = true;
    body.target = { x: body.x, y };
    start();
  }
  function scheduleClear(delay = 180) {
    if (clearTimer !== null) window.clearTimeout(clearTimer);
    clearTimer = window.setTimeout(settleClear, delay);
  }
  /** A glide that ends without its own park (a viewport change re-seated it): quiet, and nothing owed on landing. */
  function endGlide() {
    if (gliding) { gliding = false; glideQuietUntil = performance.now() + 2000; }
    recheckOnLand = false;
  }
