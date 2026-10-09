const { edit } = require('./ed1.cjs');
edit('src/app/profile/account/page.tsx', [
  [`import { SearchBox } from "@/components/ui/search-box";\n`, `import { SearchBox } from "@/components/ui/search-box";\nimport { QUERY_SEARCH_BAND_CLASS } from "@/components/ui/query-bar";\nimport { maskPhone } from "@/lib/phone-normalize";\n`],
  [`            {/* ⛔ NOT STICKY. \`QUERY_BAR_CLASS\` already sticks at \`top-[56px]\`, and two sticky
                surfaces cannot share one offset — that is the 91px overlap \`qa:bar-geometry\` found
                on three routes at once. */}
            <div className="py-1">`, `            {/* ⛔ NOT STICKY. \`QUERY_BAR_CLASS\` already sticks at \`top-[56px]\`, and two sticky
                surfaces cannot share one offset — that is the 91px overlap \`qa:bar-geometry\` found
                on three routes at once.
                ⭐ THE SEARCH AND THE PANEL'S BAR ARE ONE BAND (round 4 of the visual pass, 2026-10-09, R4-C's leftover):
                \`QUERY_SEARCH_BAND_CLASS\`, as on every page with a search over its bar. The panel's rung is 16px
                (\`space-y-3\`), so the box stands 26 under the heading, the pills 26 under the box and the table 26 under
                the bar's last row — 16 + 10 each — where \`py-1\` put the box 20 under the heading and the pills 55 under it
                (the empty echo row's 25 + 4 + 16 + 10). */}
            <div className={QUERY_SEARCH_BAND_CLASS}>`],
  [`            value={user?.phoneE164
              ? \`\${user.phoneE164.slice(0, 4)}*****\${user.phoneE164.slice(-2)}\`
              : "—"}`, `            /* ONE PHONE, ONE MASK (round 4 of the visual pass, 2026-10-09, edges E32): this read "+255*****84" in the audit
               log's stars while /profile and the hub read "+255••••84" — \`maskPhone\` (phone-normalize.ts) is the one
               definition of a masked number, and a short or malformed value masks to dots instead of being echoed. */
            value={user?.phoneE164 ? maskPhone(user.phoneE164) : "—"}`],
]);
edit('src/app/updown/history/page.tsx', [
  [`import { SearchBox } from "@/components/ui/search-box";\n`, `import { SearchBox } from "@/components/ui/search-box";\nimport { QUERY_SEARCH_BAND_CLASS } from "@/components/ui/query-bar";\n`],
  [`      {allRows.length > 0 && (
        <>
        <div className="mt-4">
          <SearchBox`, `      {/* ⭐ THE SEARCH AND THE BAR ARE ONE BAND (round 4 of the visual pass, 2026-10-09, R4-C's leftover):
          \`QUERY_SEARCH_BAND_CLASS\`, as on every page with a search over its bar. This page spaces its blocks by margin, on
          a 24px rung (the strip's \`mt-5\` under the bar), so the band takes the rung above it (\`mt-5\`) and below it
          (\`pb-5\`: the bar must stay the container's direct child, or it would stop sticking): the box 34 under the head,
          the pills 34 under the box, the strip 34 under the bar — where \`mt-4\` put the box 20 under the head and the empty
          echo row the pills 35 under it. */}
      {allRows.length > 0 && (
        <>
        <div className={\`\${QUERY_SEARCH_BAND_CLASS} mt-5 pb-5\`}>
          <SearchBox`],
]);
