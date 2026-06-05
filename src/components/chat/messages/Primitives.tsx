/**
 * Tabular-numeral helper + inline citation + sources footer.
 *
 * The kit's hard rule: every number in chat (TZS, %, IDs, times) renders
 * in JetBrains Mono with `font-variant-numeric: tabular-nums`. <Num>
 * enforces this everywhere it's used.
 */

import type { Citation } from "../types";

export function Num({ children }: { children: React.ReactNode }) {
  return <span className="cm-num">{children}</span>;
}

export function Cite({ n, href }: { n: number; href: string }) {
  return (
    <a className="cm-cite" href={href} aria-label={`Source ${n}: ${href}`}>
      {n}
    </a>
  );
}

export function Sources({ items }: { items: Citation[] }) {
  return (
    <div className="cm-sources" role="list" aria-label="Sources">
      {items.map((it) => (
        <div className="cm-source-row" role="listitem" key={it.n}>
          <span className="cm-source-n">[{it.n}]</span>
          <a href={it.href}>{it.label}</a>
        </div>
      ))}
    </div>
  );
}

/** Render a paragraph that may contain inline `[1]` / `[2]` markers and
 *  swap them with <Cite /> components anchored to the citations list.
 *  Also wraps `{n: "..."}` tokens with <Num /> — see send-message stub
 *  for the encoding. Currently the stub returns prose with TZS amounts
 *  + percentages naked; <Num /> is applied via the renderer where it
 *  matters (handoff meta), and any number-heavy reply uses the
 *  text_with_citations variant where the renderer already mono-tabular
 *  treats the whole inner-html block via the `.cm-bubble-ai .cm-num`
 *  selector cascade.
 *
 *  The simplest path that respects the kit rule + the design is:
 *  the AI replies use plain `<p>` text, and ALL numerals in the
 *  RESPONSE PROSE go through <Num>; the stub author wraps them
 *  consistently. See `lib/chat/send-message.ts`. */
export function renderParagraph(p: string, citations: Citation[]): React.ReactNode {
  // Tokens look like `[1]` or `{12,500}` for numerals. We split on both.
  const parts = p.split(/(\[\d+\]|\{[^}]+\})/g);
  return parts.map((part, i) => {
    if (/^\[\d+\]$/.test(part)) {
      const n = parseInt(part.slice(1, -1), 10);
      const c = citations.find((c) => c.n === n);
      return c ? <Cite key={i} n={n} href={c.href} /> : part;
    }
    if (/^\{[^}]+\}$/.test(part)) {
      return <Num key={i}>{part.slice(1, -1)}</Num>;
    }
    return <span key={i}>{part}</span>;
  });
}
