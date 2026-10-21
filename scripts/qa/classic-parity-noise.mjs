/** Only live values may disappear from the classic parity capture. */
import { createHash } from "node:crypto";

const NL = "\n";

/** The open ticket's ring ticks every 15 seconds. Keep its accessible status words and ink. */
export const maskPositionCountdown = (html) => String(html).replace(
  /<svg\b(?=[^>]*\brole="img")(?=[^>]*\bclass="shrink-0")[^>]*>[\s\S]*?<\/svg>/g,
  (svg) => {
    if ([...svg.matchAll(/<circle\b/g)].length !== 2 || !/<circle\b[^>]*\bstroke-dashoffset="[^"]*"/.test(svg)
      || !/<text\b[^>]*>(?:\d+[dhm]|·)<\/text>/.test(svg)) return svg;
    return svg.replace(/\bstroke-dashoffset="[^"]*"/, 'stroke-dashoffset="~"')
      .replace(/(<text\b[^>]*>)(?:\d+[dhm]|·)(<\/text>)/, '$1~$2');
  },
);

/** Find only book-card labels whose seeded calendar date was already masked in markup. */
export function timeLeftPaths(html) {
  const paths = new Map(), stack = [];
  const voids = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
  for (const token of String(html ?? "").matchAll(/<\/?([A-Za-z][\w:-]*)\b([^>]*?)>/g)) {
    const [whole, rawTag, attrs] = token, tag = rawTag.toLowerCase();
    if (whole.startsWith("</")) {
      while (stack.length && stack.pop().tag !== tag) { /* malformed ancestors close here too */ }
      continue;
    }
    const parent = stack.at(-1);
    const path = parent ? `${parent.path}>${tag}${parent.next++}` : tag;
    const isMeta = /\bclass="[^"]*\bmcardp-meta-right\b/.test(attrs);
    const isTime = /\bclass="[^"]*\bmcardp-timeleft\b/.test(attrs);
    const following = String(html).slice(token.index + whole.length);
    const ownText = following.slice(0, Math.max(0, following.indexOf("<")));
    if (isTime && parent?.isMeta && ownText.includes("~date")) {
      paths.set(parent.path, "parent");
      paths.set(path, "child");
    }
    if (!whole.endsWith("/>") && !voids.has(tag)) stack.push({ tag, path, next: 0, isMeta });
  }
  return paths;
}

/**
 * The unmasked calendar date can change a right-aligned label's width and left edge between
 * fresh servers. Its right edge must stay at the card row's right edge. Each coordinate is
 * rounded separately to half a pixel by the capture, so a gap of up to half a pixel is zero;
 * a lost right alignment remains a visible diff. Keep y, height and every other style.
 */
export function steadyTimeLeftLayout(layout, html, store) {
  const paths = timeLeftPaths(html);
  if (!paths.size) return layout;
  const lines = String(layout).split(NL);
  const boxes = new Map();
  for (const line of lines) {
    const match = /^(\S+) (\S+) [0-9a-f]{12}$/.exec(line);
    const box = match && /^(-?[\d.]+),(-?[\d.]+),(-?[\d.]+)x(-?[\d.]+)$/.exec(match[2]);
    if (box) boxes.set(match[1], box);
  }
  return lines.map((line) => {
    const match = /^(\S+) (\S+) ([0-9a-f]{12})$/.exec(line);
    if (!match || !paths.has(match[1])) return line;
    const [, path, geo, id] = match;
    const box = /^(-?[\d.]+),(-?[\d.]+),(-?[\d.]+)x(-?[\d.]+)$/.exec(geo);
    const sig = store[id];
    if (!box || !sig) return line;
    const [, x, y, width, height] = box;
    const right = Number(x) + Number(width);
    const rowPath = paths.get(path) === "child" ? path.slice(0, path.lastIndexOf(">")) : path;
    const anchor = boxes.get(rowPath.slice(0, rowPath.lastIndexOf(">")));
    const anchorRight = anchor ? Number(anchor[1]) + Number(anchor[3]) : null;
    const gap = anchorRight === null ? null : Math.round((anchorRight - right) * 2) / 2;
    const stableGeo = `${gap === null ? `right:${right}` : `right-gap:${Math.abs(gap) <= 0.5 ? 0 : gap}`},${y},~x${height}`;
    // An auto margin absorbs the date's width. The anchored gap still exposes a lost alignment.
    const stableSig = paths.get(path) === "child" ? sig : sig.replace(/^margin-left:-?[\d.]+px$/m, "margin-left:~");
    const stableId = createHash("sha1").update(stableSig).digest("hex").slice(0, 12);
    store[stableId] = stableSig;
    return `${path} ${stableGeo} ${stableId}`;
  }).join(NL);
}
