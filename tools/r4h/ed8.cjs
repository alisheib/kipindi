const { edit } = require('./ed1.cjs');
edit('src/app/live/pulse-grid.tsx', [
  [`import { Suspense, useEffect, useRef, useState } from "react";`, `import { Fragment, Suspense, useEffect, useRef, useState } from "react";`],
  [` * ⭐ ROUND 4 (2026-10-09, edges 197 255): a token stops at an ideograph, and the text between the tokens keeps its
 * figures whole. \`\\S*\` ran across Chinese, which has no spaces, so "辛巴俱乐部赢得2026-27赛季NBC超级联赛" was ONE
 * token — the whole title in one nowrap span, wider than any card. A token is now a run of non-space, non-Han
 * characters, and \`keepFigures\` (keep-words.tsx, the cards' and the market page's own rule) shapes the text between the
 * tokens: "2026-27赛季" and "dakika 28:00" never break inside.
 */
export function KeepHyphenated({ text }: { text: string }) {
  const parts = text.split(/([^\\s\\p{Script=Han}]*[\\p{L}\\p{N}]-[\\p{L}\\p{N}][^\\s\\p{Script=Han}]*)/u);
  return <>{parts.map((part, i) => (i % 2 === 1 ? <span key={i} className="whitespace-nowrap">{part}</span> : <span key={i}>{keepFigures(part)}</span>))}</>;
}`, ` * ⭐ ROUND 4 (2026-10-09, edges 197 255): a token stops at an ideograph, its hyphen touches a letter, and the text
 * between the tokens keeps its figures whole. \`\\S*\` ran across Chinese, which has no spaces, so
 * "辛巴俱乐部赢得2026-27赛季NBC超级联赛" was ONE token — the whole title in one nowrap span, wider than any card. A token
 * is now a run of non-space, non-Han characters around a hyphen with a letter on one side ("month-end?", "30-day"); a
 * range of two numbers ("2026-27") is a figure, and \`keepFigures\` (keep-words.tsx, the cards' and the market page's own
 * rule) shapes the text between the tokens, so "2026-27赛季" and "dakika 28:00" never break inside. A part with no
 * figure renders as the plain text it was (a keyed fragment, no element).
 */
export function KeepHyphenated({ text }: { text: string }) {
  const parts = text.split(/([^\\s\\p{Script=Han}]*(?:\\p{L}-[\\p{L}\\p{N}]|\\p{N}-\\p{L})[^\\s\\p{Script=Han}]*)/u);
  return <>{parts.map((part, i) => (i % 2 === 1 ? <span key={i} className="whitespace-nowrap">{part}</span> : <Fragment key={i}>{keepFigures(part)}</Fragment>))}</>;
}`],
]);
