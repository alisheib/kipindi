import { cn } from "@/lib/utils";

type LogoVariant = "primary" | "stacked" | "monogram" | "wordmark" | "reverse";

type LogoProps = {
  variant?: LogoVariant;
  className?: string;
  ariaLabel?: string;
};

export function Logo({ variant = "primary", className, ariaLabel = "50pick" }: LogoProps) {
  if (variant === "monogram") {
    return (
      <svg
        viewBox="0 0 64 64"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={ariaLabel}
        className={cn("h-8 w-8", className)}
      >
        <g transform="translate(32,32)">
          <path d="M 24 0 A 24 24 0 1 0 0 -24" fill="none" stroke="currentColor" strokeWidth={5} strokeLinecap="round" />
          <circle cx={14} cy={-14} r={4} fill="var(--gold)" />
        </g>
      </svg>
    );
  }

  if (variant === "wordmark") {
    return (
      <svg viewBox="0 0 200 48" xmlns="http://www.w3.org/2000/svg" role="img" aria-label={ariaLabel} className={cn("h-6", className)}>
        <text x={0} y={36} fontFamily="Sora, Inter, sans-serif" fontWeight={600} fontSize={32} fill="currentColor" letterSpacing={-0.5}>
          50pick
        </text>
      </svg>
    );
  }

  if (variant === "stacked") {
    return (
      <svg viewBox="0 0 96 128" xmlns="http://www.w3.org/2000/svg" role="img" aria-label={ariaLabel} className={cn("h-16", className)}>
        <g transform="translate(48,40)">
          <path d="M 24 0 A 24 24 0 1 0 0 -24" fill="none" stroke="currentColor" strokeWidth={5} strokeLinecap="round" />
          <circle cx={14} cy={-14} r={4} fill="var(--gold)" />
        </g>
        <text x={48} y={108} textAnchor="middle" fontFamily="Sora, Inter, sans-serif" fontWeight={600} fontSize={26} fill="currentColor" letterSpacing={-0.4}>
          50pick
        </text>
      </svg>
    );
  }

  // primary or reverse — same geometry, currentColor wins via CSS class
  return (
    <svg viewBox="0 0 256 64" xmlns="http://www.w3.org/2000/svg" role="img" aria-label={ariaLabel} className={cn("h-10", className)}>
      <g transform="translate(32,32)">
        <path d="M 24 0 A 24 24 0 1 0 0 -24" fill="none" stroke="currentColor" strokeWidth={5} strokeLinecap="round" />
        <circle cx={14} cy={-14} r={4} fill="var(--gold)" />
      </g>
      <text x={72} y={42} fontFamily="Sora, Inter, sans-serif" fontWeight={600} fontSize={32} fill="currentColor" letterSpacing={-0.5}>
        50pick
      </text>
    </svg>
  );
}
