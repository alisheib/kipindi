const edit = require("./edit-lib.cjs");
process.chdir("F:/kipindi-r4i");
edit("src/components/auth/auth-panel.tsx", [
  [`import { cn } from "@/lib/utils";
`, `import { cn } from "@/lib/utils";
import { keepText } from "@/components/ui/keep-run";
`],
  [`      <h1 className="mt-1.5 font-display text-title-lg font-bold leading-tight text-text tracking-[-0.02em]">
        {title}
      </h1>`, `      {/* ⭐ NEVER ONE WORD ALONE (R4-I, 2026-10-09; edges E11): "Karibu kwenye / 50pick" and "Welcome to / 50pick" (sw
          360/390, en 360) left the brand alone on its line, and "…on your / account." the subtitle's last word. A string
          heading and subtitle keep their last two words together (\`keepText\`: "kwenye 50pick", "your account."); the words
          are unchanged, and a heading of two words or fewer is drawn as given. */}
      <h1 className="mt-1.5 font-display text-title-lg font-bold leading-tight text-text tracking-[-0.02em]">
        {typeof title === "string" ? keepText(title) : title}
      </h1>`],
  [`          {subtitle}
        </p>
      )}
      {children}`, `          {typeof subtitle === "string" ? keepText(subtitle) : subtitle}
        </p>
      )}
      {children}`],
]);
edit("src/components/auth/login-identifier.tsx", [
  [`        <p className="mt-1.5 text-body-sm text-text-subtle">
          {method === "phone" ? t.common.phoneInputTitle : t.auth.emailSignInHint}
        </p>`, `        {/* R4-I (2026-10-09; edges E11, en 390): "…starting with 6 / or 7" split the two digits a number may start with.
            The pair is one run ("6 or 7", "6 au 7", "6 或 7"), and the hint's last two words keep together (\`keepText\`). */}
        <p className="mt-1.5 text-body-sm text-text-subtle">
          {method === "phone" ? keepText(t.common.phoneInputTitle, digitChoice(t.common.phoneInputTitle)) : keepText(t.auth.emailSignInHint)}
        </p>`],
]);
edit("src/components/auth/login-identifier.tsx", [
  [`import { cn } from "@/lib/utils";`, `import { cn } from "@/lib/utils";
import { digitChoice, keepText } from "@/components/ui/keep-run";`],
]);
