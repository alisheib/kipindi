/**
 * Tabular-numeral helper + inline citation + sources footer + smart
 * paragraph renderer with numbered lists, bullet lists, and **bold**.
 *
 * The kit's hard rule: every number in chat (TZS, %, IDs, times) renders
 * in JetBrains Mono with `font-variant-numeric: tabular-nums`. <Num>
 * enforces this everywhere it's used.
 */

import type { Citation } from "../types";
import { useT } from "@/lib/i18n";

export function Num({ children }: { children: React.ReactNode }) {
  return <span className="cm-num">{children}</span>;
}

export function Cite({ n, href }: { n: number; href: string }) {
  const { t } = useT();
  return (
    <a className="cm-cite" href={href} aria-label={t.chat.sourceN.replace("{n}", String(n)).replace("{href}", href)}>
      {n}
    </a>
  );
}

export function Sources({ items }: { items: Citation[] }) {
  const { t } = useT();
  return (
    <div className="cm-sources" role="list" aria-label={t.chat.sources}>
      {items.map((it) => (
        <div className="cm-source-row" role="listitem" key={it.n}>
          <span className="cm-source-n">[{it.n}]</span>
          <a href={it.href}>{it.label}</a>
        </div>
      ))}
    </div>
  );
}

/** Render inline tokens: `[1]` → Cite, `{n}` → Num, `**bold**` → strong. */
export function renderParagraph(p: string, citations: Citation[]): React.ReactNode {
  const parts = p.split(/(\[\d+\]|\{[^}]+\}|\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (/^\[\d+\]$/.test(part)) {
      const n = parseInt(part.slice(1, -1), 10);
      const c = citations.find((c) => c.n === n);
      return c ? <Cite key={i} n={n} href={c.href} /> : part;
    }
    if (/^\{[^}]+\}$/.test(part)) {
      return <Num key={i}>{part.slice(1, -1)}</Num>;
    }
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

/** Render inline tokens for plain text (no citations): `**bold**` → strong. */
function renderPlainInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

type Block = { type: "p"; text: string } | { type: "ol"; items: string[] } | { type: "ul"; items: string[] };

/** Group an array of paragraph strings into blocks: plain paragraphs,
 *  ordered lists (lines starting with `\d+. `), and unordered lists
 *  (lines starting with `- `). Consecutive list items are merged. */
function groupBlocks(paragraphs: string[]): Block[] {
  const blocks: Block[] = [];
  let i = 0;
  while (i < paragraphs.length) {
    const p = paragraphs[i];
    if (/^\d+\.\s/.test(p)) {
      const items: string[] = [];
      while (i < paragraphs.length && /^\d+\.\s/.test(paragraphs[i])) {
        items.push(paragraphs[i].replace(/^\d+\.\s*/, ""));
        i++;
      }
      blocks.push({ type: "ol", items });
    } else if (/^- /.test(p)) {
      const items: string[] = [];
      while (i < paragraphs.length && /^- /.test(paragraphs[i])) {
        items.push(paragraphs[i].slice(2));
        i++;
      }
      blocks.push({ type: "ul", items });
    } else {
      blocks.push({ type: "p", text: p });
      i++;
    }
  }
  return blocks;
}

/** Render an array of paragraph strings as structured blocks (paragraphs,
 *  numbered lists, bullet lists) with optional citation support. */
export function renderBlocks(
  paragraphs: string[],
  citations?: Citation[],
): React.ReactNode {
  const blocks = groupBlocks(paragraphs);
  const inline = (text: string) =>
    citations ? renderParagraph(text, citations) : renderPlainInline(text);

  return blocks.map((block, i) => {
    if (block.type === "ol") {
      return (
        <ol key={i} className="cm-steps">
          {block.items.map((item, j) => (
            <li key={j}>{inline(item)}</li>
          ))}
        </ol>
      );
    }
    if (block.type === "ul") {
      return (
        <ul key={i} className="cm-bullets">
          {block.items.map((item, j) => (
            <li key={j}>{inline(item)}</li>
          ))}
        </ul>
      );
    }
    return <p key={i}>{inline(block.text)}</p>;
  });
}

/** Split a plain text string (from live Claude) into paragraph strings,
 *  then render as structured blocks. Splits on double-newline for
 *  paragraphs, then detects numbered/bulleted lines within each. */
export function renderPlainText(text: string): React.ReactNode {
  // Split on double-newline to get major blocks, then within each block
  // split on single newline to detect lists.
  const lines: string[] = [];
  for (const block of text.split(/\n\n+/)) {
    const sublines = block.split(/\n/);
    for (const line of sublines) {
      const trimmed = line.trim();
      if (trimmed) lines.push(trimmed);
    }
  }
  return renderBlocks(lines);
}
