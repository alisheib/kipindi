const { edit } = require('./ed1.cjs');
edit('src/components/layout/app-shell.tsx', [
  [`import { displayLabel, displayInitials } from "@/lib/display-label";\n`, `import { displayLabel, displayInitials } from "@/lib/display-label";\nimport { maskPhone } from "@/lib/phone-normalize";\n`],
  [`  const funnelScopeValue = journeyPreview || funnelViewer === "staff" || funnelViewer === "unknown" ? "off" : journeyShown ? "new" : "old";
`, `  const funnelScopeValue = journeyPreview || funnelViewer === "staff" || funnelViewer === "unknown" ? "off" : journeyShown ? "new" : "old";
  /* ⭐ ONE PHONE, ONE MASK IN THE JOURNEY (round 4 of the visual pass, 2026-10-09, edges E32): the account menu read
     "+255*****84" (\`topUser\`'s stars, above) while the hub and the profile hero read "+255••••84" — \`maskPhone\`
     (phone-normalize.ts) is the one definition of a masked number, and a short value masks to dots rather than being
     echoed. The journey's header is handed that mask; ⛔ the classic bar keeps \`topUser\` exactly as it was (frozen
     chrome for S6/S7, \`qa:classic-shell-parity\`), so a classic menu still reads its stars until S15. */
  const journeyUser = session ? { ...topUser, phone: maskPhone(session.phoneE164) } : topUser;
`],
  [`<LazyJourneyTopBar user={topUser} onBreak={promoSuppressed}`, `<LazyJourneyTopBar user={journeyUser} onBreak={promoSuppressed}`],
]);
edit('scripts/simple-journey-flag.test.mts', [
  [`  const SWAP_HEADER = '{journeyShown ? <Suspense fallback={<div aria-hidden="true" className="kp-jhdr" />}><LazyJourneyTopBar user={topUser} onBreak`,
   `  // ⚠️ \`user={journeyUser}\` since round 4 of the visual pass (2026-10-09, edges E32): the journey's header is handed
  // \`topUser\` with its phone masked by \`maskPhone\`, the one mask the hub and the profile hero use; the classic arm is
  // still \`topUser\`, today's props, character for character (visual-pass-r4h §7 holds the spread).
  const SWAP_HEADER = '{journeyShown ? <Suspense fallback={<div aria-hidden="true" className="kp-jhdr" />}><LazyJourneyTopBar user={journeyUser} onBreak`],
]);
