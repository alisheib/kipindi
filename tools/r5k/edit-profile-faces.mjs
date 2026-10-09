import { edit } from "./edit-lib.mjs";
edit("src/components/profile/name-editor.tsx", [
  [`import { keepNameEnd } from "@/components/ui/keep-words";
`, `import { keepNameEnd } from "@/components/ui/keep-words";
import { PROFILE_NAME_FACE } from "@/components/profile/profile-faces";
`],
  [`          className="font-display text-[24px] md:text-[28px] font-bold leading-tight tracking-[-0.02em] text-text bg-transparent border-b border-border-control`,
   `          className={\`\${PROFILE_NAME_FACE} text-text bg-transparent border-b border-border-control`],
  [`focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--brand-500)_25%,transparent)] px-0 min-h-[40px] min-w-0 max-w-full flex-1"
`, `focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--brand-500)_25%,transparent)] px-0 min-h-[40px] min-w-0 max-w-full flex-1\`}
`],
  [`      <span className="min-w-0 font-display text-[24px] md:text-[28px] font-bold leading-tight tracking-[-0.02em] text-text text-balance [overflow-wrap:anywhere]">`,
   `      <span className={\`min-w-0 \${PROFILE_NAME_FACE} text-text text-balance [overflow-wrap:anywhere]\`}>`],
]);
edit("src/app/profile/page.tsx", [
  [`import { maskPhone } from "@/lib/phone-normalize";
`, `import { maskPhone } from "@/lib/phone-normalize";
// The faces the page's loading ghost draws its lines in too (\`profile-faces.ts\`, round 5's follow-up, R5-K).
import { PROFILE_PHONE_LINE, PROFILE_ROW_TITLE, PROFILE_SIGN_OUT_TITLE } from "@/components/profile/profile-faces";
`],
  [`            <p className="mt-1.5 font-mono text-[12px] text-text-muted tabular-nums">`, `            <p className={PROFILE_PHONE_LINE}>`],
  [`              <p className="font-display text-[14px] font-semibold text-text leading-tight">{t.common.signOut}</p>`,
   `              <p className={PROFILE_SIGN_OUT_TITLE}>{t.common.signOut}</p>`],
  [`        <p className="font-display text-[13.5px] font-semibold text-text leading-tight flex items-center gap-2">`,
   `        <p className={PROFILE_ROW_TITLE}>`],
]);
