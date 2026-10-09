const { edit } = require('./ed1.cjs');
edit('src/app/markets/[id]/page.tsx', [
  ['import { BackLink } from "@/components/ui/back-link";', 'import { BackLink } from "@/components/ui/back-link";\nimport { keepFigures } from "@/components/ui/keep-words";'],
  ['          >{pickLocalized(locale, m.titleEn, m.titleSw, m.titleZh)}</h1>',
   '          >{/* `keepFigures` (round 4, edges 197 199 255): "2026-27" and "dakika 28:00" never break inside. */}{keepFigures(pickLocalized(locale, m.titleEn, m.titleSw, m.titleZh))}</h1>'],
]);
