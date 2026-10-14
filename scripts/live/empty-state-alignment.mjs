/**
 * PV-03's measured relationship: the heading that introduces THIS empty state, not the last heading whose box is
 * above it. Self-contained for page.evaluate. No route exceptions and no changed 24px tolerance live here.
 * AdminCard declares data-empty-state-scope; its title declares data-section-heading. Semantic sections and the
 * PageContainer/main provide the same ownership when no card contract exists. Explicit collection owners measure
 * the primitive's centered, contained 360px box against their real content box; this is not a route exemption.
 * A closer local title always wins. A missing association is reported, never fabricated as aligned.
 * The caller retains the seven historical page/tab-level rulings.
 */
export function emptyStateAlignment() {
  const HEAD = "h1,h2,h3,h4,[data-section-heading]";
  const SCOPE = "[data-empty-state-scope],[data-empty-state-owner],section,article,[role=region],[role=tabpanel],[data-measure],main";
  function paintedRect(h) {
    const style = getComputedStyle(h);
    if (style.visibility === "hidden" || style.visibility === "collapse") return false;
    const box = h.getBoundingClientRect();
    const paint = { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
    const intersect = (r) => {
      paint.left = Math.max(paint.left, r.left); paint.right = Math.min(paint.right, r.right);
      paint.top = Math.max(paint.top, r.top); paint.bottom = Math.min(paint.bottom, r.bottom);
    };
    for (let node = h; node; node = node.parentElement) {
      const cs = getComputedStyle(node), r = node.getBoundingClientRect();
      if (cs.display === "none" || cs.contentVisibility === "hidden") return false;
      if (Number(cs.opacity) === 0) return false;
      // Tailwind's sr-only keeps a 1x1 layout box, but its absolute legacy clip paints no part of that box.
      const clip = /^(?:rect\()\s*(.*?)\s*\)$/.exec(cs.clip);
      if (clip && (cs.position === "absolute" || cs.position === "fixed")) {
        const values = clip[1].split(/\s*,\s*|\s+/);
        if (values.length === 4) {
          const edge = (v, auto) => v === "auto" ? auto : /^-?(?:\d+(?:\.\d*)?|\.\d+)px$/.test(v) ? Number.parseFloat(v) : null;
          const [top, right, bottom, left] = values.map((v, i) => edge(v, [0, r.width, r.height, 0][i]));
          if ([top, right, bottom, left].every((v) => v !== null)) intersect({ top:r.top+top, right:r.left+right, bottom:r.top+bottom, left:r.left+left });
        }
      }
      const inset = /^inset\((.*?)(?:\s+round\b.*?)?\)$/.exec(cs.clipPath);
      if (inset) {
        const values = inset[1].trim().split(/\s+/);
        if (values.length >= 1 && values.length <= 4) {
          const edges = values.length === 1 ? [values[0],values[0],values[0],values[0]]
            : values.length === 2 ? [values[0],values[1],values[0],values[1]]
            : values.length === 3 ? [values[0],values[1],values[2],values[1]] : values;
          const amount = (v, length) => /^-?(?:\d+(?:\.\d*)?|\.\d+)px$/.test(v) ? Number.parseFloat(v)
            : /^-?(?:\d+(?:\.\d*)?|\.\d+)%$/.test(v) ? Number.parseFloat(v)*length/100 : null;
          const [top,right,bottom,left] = edges.map((v,i) => amount(v,i%2 ? r.width : r.height));
          if ([top,right,bottom,left].every((v) => v !== null)) intersect({ top:r.top+top,right:r.right-right,bottom:r.bottom-bottom,left:r.left+left });
        }
      }
      // The document's scrollable viewport is reachable page content, not an intrinsically hidden heading.
      // Keep hard clips, and ordinary nested scrollport clips; do not require a below-fold section to be on screen.
      const viewportScroller = node === document.scrollingElement;
      const clips = (axis) => ["hidden","clip"].includes(axis) || (!viewportScroller && ["auto","scroll"].includes(axis));
      if (clips(cs.overflowX)) {
        paint.left = Math.max(paint.left,r.left+node.clientLeft); paint.right = Math.min(paint.right,r.left+node.clientLeft+node.clientWidth);
      }
      if (clips(cs.overflowY)) {
        paint.top = Math.max(paint.top,r.top+node.clientTop); paint.bottom = Math.min(paint.bottom,r.top+node.clientTop+node.clientHeight);
      }
      if (!(paint.right > paint.left && paint.bottom > paint.top)) return false;
    }
    return paint;
  }
  const headingPaints = (h) => Boolean(paintedRect(h));
  return [...document.querySelectorAll("[data-empty-state]")].map((el) => {
    const r = el.getBoundingClientRect();
    let head = null, owner = null, collectionOwner = null;
    for (let scope = el.parentElement; scope; scope = scope.parentElement) {
      if (!scope.matches(SCOPE)) continue;
      const collection = scope.getAttribute("data-empty-state-owner") === "collection";
      const heads = [...scope.querySelectorAll(HEAD)].filter((h) => {
        if (el.contains(h) || h.contains(el)) return false;
        if (!(h.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)) return false;
        if (h.closest(SCOPE) !== scope) return false;
        // A PageContainer's h1 names the whole page. Other headings, including a local section's h1, still win.
        if (collection && scope.matches("[data-measure]") && h.tagName === "H1" && !h.hasAttribute("data-section-heading")) return false;
        if (!headingPaints(h)) return false;
        const hr = h.getBoundingClientRect();
        return hr.top <= r.top + 1 && hr.width > 0 && hr.height > 0 && h.textContent.trim();
      });
      if (heads.length) { head = heads[heads.length - 1]; owner = scope; break; }
      if (collection) { collectionOwner = scope; break; }
    }
    if (collectionOwner) {
      const cr = collectionOwner.getBoundingClientRect(), cs = getComputedStyle(collectionOwner);
      const content = {
        left: cr.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft),
        right: cr.right - parseFloat(cs.borderRightWidth) - parseFloat(cs.paddingRight),
        top: cr.top + parseFloat(cs.borderTopWidth) + parseFloat(cs.paddingTop),
        bottom: cr.bottom - parseFloat(cs.borderBottomWidth) - parseFloat(cs.paddingBottom),
      };
      const centerDelta = Math.abs((r.left + r.right) / 2 - (content.left + content.right) / 2);
      // 360px is EmptyState's existing boxed cap. Check the cap rather than trusting a mutated computed max-width.
      const expectedWidth = Math.min(360, content.right - content.left);
      const widthDelta = Math.abs(r.width - expectedWidth);
      const contained = r.left >= content.left - 1 && r.right <= content.right + 1
        && r.top >= content.top - 1 && r.bottom <= content.bottom + 1;
      const paint = paintedRect(el);
      const unclipped = Boolean(paint) && paint.left <= r.left + 1 && paint.right >= r.right - 1
        && paint.top <= r.top + 1 && paint.bottom >= r.bottom - 1;
      const boxed = el.getAttribute("data-empty-state") === "boxed";
      return {
        variant: el.getAttribute("data-empty-state"), left: Math.round(r.left), width: Math.round(r.width),
        headText: null, headLeft: null, delta: null, association: "collection",
        scopeTag: collectionOwner.tagName.toLowerCase(), reference: content,
        collection: { centerDelta, expectedWidth, widthDelta, contained, unclipped, boxed,
          passed: boxed && centerDelta <= 1 && widthDelta <= 1 && contained && unclipped },
      };
    }
    const hr = head?.getBoundingClientRect() ?? null;
    const left = Math.round(r.left), headLeft = hr ? Math.round(hr.left) : null;
    return {
      variant: el.getAttribute("data-empty-state"), left, width: Math.round(r.width),
      headText: head ? head.textContent.trim().slice(0, 24) : null, headLeft,
      delta: hr ? Math.round(Math.abs(r.left - hr.left)) : null,
      association: !owner ? "unassociated" : owner.matches("[data-empty-state-scope]") ? "card"
        : owner.matches("[data-measure]") ? "page-container" : owner.matches("main") ? "main-fallback" : "section",
      scopeTag: owner?.tagName.toLowerCase() ?? null,
      // The reference is the actual heading span, including its real card/header inset. No padding is subtracted.
      reference: hr ? { left: hr.left, width: hr.width } : null,
    };
  });
}
