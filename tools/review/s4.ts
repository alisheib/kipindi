import { markup, a11yTextOf, textOf } from "./h.ts";
import { keepFigures } from "F:/kipindi-vis/src/components/ui/keep-words.tsx";
import { hangCjkMarks } from "F:/kipindi-vis/src/lib/cjk-marks.tsx";
import { emptyStateBody } from "F:/kipindi-vis/src/components/ui/empty-state-text.ts";
import { dict } from "F:/kipindi-vis/src/lib/i18n-dict.ts";

const br = (s: string) => markup(keepFigures(s)).replace(/^<div>|<\/div>$/g, "").replace(/<span class="whitespace-nowrap">/g, "[").replace(/<\/span>/g, "]");
for (const s of ["Atavunja dakika 28:00?", "Atavunja 28:00 dakika?", "Bei TZS 4,200?", "Bitcoin $5.5 bilioni?", "A 30-day high?", "Msimu 2026-27?", "Matokeo 1-2?", "Kati ya 10–20?", "Dakika 90 za mwisho?", "Saa 3 usiku?"]) console.log(br(s));

// The tickets empty state as EmptyState renders it (body -> emptyStateBody -> hangCjkMarks), zh.
const D = dict as unknown as Record<string, Record<string, Record<string, string>>>;
const raw = D.zh.journey.ticketsEmptyOpenBody.replace("{yes}", "是").replace("{no}", "否");
const html = markup(hangCjkMarks(emptyStateBody(raw)));
const esc = (s: string) => s.replace(/[\u00a0\u2060]/g, (c) => "\\u" + c.codePointAt(0)!.toString(16).padStart(4, "0"));
console.log("zh tickets empty body, dictionary :", esc(raw));
console.log("  read by a screen reader (aria-hidden out):", esc(a11yTextOf(html)), a11yTextOf(html) === raw ? "(same)" : "(DIFFERENT)");
console.log("  DOM textContent                          :", esc(textOf(html)));
const sw = D.sw.journey.ticketsEmptyOpenBody.replace("{yes}", "NDIO").replace("{no}", "HAPANA");
console.log("sw:", esc(emptyStateBody(sw)), emptyStateBody(sw) === sw ? "(same)" : "(DIFFERENT)");
