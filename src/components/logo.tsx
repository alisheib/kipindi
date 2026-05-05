/**
 * Logo — thin alias around the kit's brand primitives so existing call-sites
 * don't break. The actual mark + wordmark + lockup live in `./brand.tsx`.
 */
import { FiftyMark, FiftyWordmark, FiftyLockup } from "./brand";

type LogoVariant = "primary" | "stacked" | "monogram" | "wordmark" | "reverse";

type LogoProps = {
  variant?: LogoVariant;
  className?: string;
  ariaLabel?: string;
};

export function Logo({ variant = "primary", className }: LogoProps) {
  if (variant === "monogram") return <FiftyMark size={32} className={className} />;
  if (variant === "wordmark") return <FiftyWordmark size={28} className={className} />;
  if (variant === "stacked") {
    return (
      <span className={`inline-flex flex-col items-center gap-2 ${className ?? ""}`}>
        <FiftyMark size={56} />
        <FiftyWordmark size={24} />
      </span>
    );
  }
  // primary + reverse share the same lockup; reverse is monochrome
  if (variant === "reverse") return <FiftyLockup size={28} mono inverted className={className} />;
  return <FiftyLockup size={28} className={className} />;
}

export { FiftyMark as LogoMark } from "./brand";
