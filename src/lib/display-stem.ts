/**
 * ⭐ A DISPLAY HEADING OPENS ON ITS COLUMN'S EDGE — one rule for every display heading, in every language (the visual
 * pass, round 7, R7-C, 2026-10-10; round 6's read R6-3).
 *
 * 🔴 WHAT THE READ FOUND. On every English Tiketi zangu tile the h1 "My tickets" began 2px inside the column — its ink at
 * x18.17 (1280: x134.17) where the column, the sub-tabs' first label and the cards begin at x16 (x132) — while the same
 * heading in Swahili ("Tiketi zangu") began at x16.39 and in Chinese (我的注单) at x16.17. The box was on the edge in all
 * three; the difference is the first letter. Sora draws a straight-stem capital with a side bearing of its own, read off
 * the served font's outlines (fonts.gstatic.com, Sora v17, the static instances of the variable file next/font serves):
 *
 *     weight 700   B D E F H K L M N P R 0.082em · I 0.084em · U 0.068em   (T 0.022 · Y 0.007 · A 0.013 · C G O Q 0.043)
 *     weight 600   the same stems 0.090em · U 0.076em
 *
 * At the page title's 28px that is 2.30px of outline — the tile's 2.17px of ink, a rendered edge running ~0.13px proud of
 * its outline — where "T" leaves 0.62px and a Chinese glyph ~0.2px. A heading that opens on one of these letters stood 2px
 * inside the edge every box around it keeps, and the same heading in another language did not.
 *
 * ⭐ THE RULE WAS ALREADY THE PRODUCT'S, ON TWO HEADINGS: the market question (`markets/[id]/page.tsx`, round 4: its first
 * line set back 0.075em when it opens on a straight stem) and the home hero (`.kp-hero__grp[data-stem]`, round 3, Sora 800,
 * 0.07em). Every other display heading kept the bearing — the 72 page titles `PageHeader` draws (their loading drawings
 * among them), the auth panels, the hub, the round and proposal pages, the landing's section heads. Now one test decides it
 * for all of them, and THE LETTER DECIDES, NEVER THE LOCALE: a display heading whose words open on a straight-stem capital
 * carries `data-stem`, and globals.css sets its first line back by the stem's bearing (`text-indent`: 0.075em at 700 —
 * round 4's measured 0.0775 of ink — and 0.085em at 600). U joins the stems round 4 measured: set back 0.075em, its
 * 0.0635em of ink stands 0.3px past the edge at 28px, where it stood 1.8px inside.
 * ⚠️ Only the first line moves (`text-indent`): a wrapped heading's next line opens on whatever letter the browser's
 * balance gives it, as the market question's always did.
 * ⛔ A DISPLAY HEADING is the display face at 24px or more, at some width (700's stem bearing reaches 2px at 24px): the
 * page-title step (28px) and above, the auth rail's 30px line, the bet confirm's 26px side word, the primer's and /live's
 * 24px titles. A centred heading keeps its bearing (a stem's is the same on both sides), and the hero keeps its own rule
 * (two groups that can each open a line). `test:visual-pass-r7c` §3 finds every display heading in player code and fails
 * on one that does not ask this module.
 * Pure: no hooks, no browser — a server page, a client panel and a loading drawing ask it the same way.
 */
import { isValidElement, type ReactNode } from "react";

/** The capitals whose left edge is a straight stem in Sora, measured (above). ⛔ Measure a letter before adding it. */
export const DISPLAY_STEM = /^[BDEFHIKLMNPRU]/u;

/**
 * The words a heading opens with, read through what a heading is given: a string, a run (`keepText`, `keepFigures`,
 * `keepLastWords`), an element's children (a loading drawing's `GhostText`). The first non-blank piece answers.
 */
export function leadingText(node: ReactNode, depth = 0): string {
  if (depth > 12 || node == null || typeof node === "boolean") return "";
  if (typeof node === "string") return node;
  if (typeof node === "number" || typeof node === "bigint") return String(node);
  if (Array.isArray(node)) {
    for (const part of node) {
      const s = leadingText(part as ReactNode, depth + 1);
      if (s.trim()) return s;
    }
    return "";
  }
  if (isValidElement(node)) return leadingText((node.props as { children?: ReactNode }).children, depth + 1);
  return "";
}

/**
 * A display heading's `data-stem`: "" (Sora 700) or "600" when its words open on a straight-stem capital, absent
 * otherwise. globals.css holds the amounts.
 */
export function stemOf(node: ReactNode, weight: 600 | 700 = 700): "" | "600" | undefined {
  if (!DISPLAY_STEM.test(leadingText(node).trimStart())) return undefined;
  return weight === 600 ? "600" : "";
}
