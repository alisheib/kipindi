"use client";

/**
 * PasswordInput — kit-faithful password field with:
 *  - Eye / eye-off toggle to show/hide the value (lucide icons, kit
 *    line-stroke style)
 *  - Optional strength meter using the kit ProgressBar tone
 *    (danger / warning / yes for weak / ok / strong)
 *
 * Atomic with the kit Input atom — same focus glow, same height tiers,
 * same prefix slot pattern (we use a trailing slot for the toggle).
 */

import * as React from "react";
import { I } from "@/components/ui/glyphs";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size"> & {
  size?: "sm" | "md" | "lg";
  /** When true, render a strength meter under the field. */
  showStrength?: boolean;
};

const heightCls: Record<NonNullable<Props["size"]>, string> = {
  sm: "h-9",
  md: "h-11",
  lg: "h-12",
};

export const PasswordInput = React.forwardRef<HTMLInputElement, Props>(function PasswordInput(
  {
    size = "md",
    showStrength = false,
    className,
    defaultValue,
    value,
    onChange,
    ...rest
  },
  forwardedRef,
) {
  const { t } = useT();
  const [reveal, setReveal] = React.useState(false);
  const [val, setVal] = React.useState<string>(() => String(defaultValue ?? value ?? ""));
  React.useEffect(() => { if (value !== undefined) setVal(String(value)); }, [value]);

  const internalRef = React.useRef<HTMLInputElement>(null);
  // Merge forwarded ref + internal ref
  const setRef = React.useCallback(
    (el: HTMLInputElement | null) => {
      (internalRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
      if (typeof forwardedRef === "function") forwardedRef(el);
      else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
    },
    [forwardedRef],
  );

  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVal(e.target.value);
    onChange?.(e);
  };

  return (
    <div>
      <span
        className={cn(
          "flex items-stretch rounded-lg border border-border overflow-hidden brand-focus-within transition-colors",
          heightCls[size],
        )}
      >
        <input
          {...rest}
          ref={setRef}
          type={reveal ? "text" : "password"}
          value={val}
          onChange={handle}
          className={cn(
            "flex-1 min-w-0 bg-transparent px-3 text-text outline-none placeholder:text-text-subtle font-mono",
            size === "lg" ? "text-[16px]" : size === "sm" ? "text-[13px]" : "text-[16px]",
            className,
          )}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={reveal ? t.common.hidePassword : t.common.showPassword}
          aria-pressed={reveal}
          onClick={() => setReveal(r => !r)}
          className="inline-flex items-center justify-center px-3 bg-bg-elevated border-l border-border text-text-subtle hover:text-text transition-colors shrink-0"
        >
          {reveal ? <I.eyeOff s={16} /> : <I.eye s={16} />}
        </button>
      </span>

      {showStrength && val.length > 0 && <PasswordStrength value={val} />}
    </div>
  );
});

/**
 * Strength meter — three-bar segmented gauge using the kit's yes / gold
 * / danger tones. Heuristic: length + character class diversity.
 */
function PasswordStrength({ value }: { value: string }) {
  const { t } = useT();
  const score = scorePassword(value);   // 0 / 1 / 2 / 3
  const tone = score >= 3 ? "yes" : score === 2 ? "gold" : "danger";
  const label = score >= 3 ? t.common.strong : score === 2 ? t.common.ok : score === 1 ? t.common.weak : t.common.tooShort;
  const fillCls =
    tone === "yes" ? "bg-yes-500"
    : tone === "gold" ? "bg-gold-500"
    : "bg-no-500";
  const fgCls =
    tone === "yes" ? "text-yes-300"
    : tone === "gold" ? "text-gold-300"
    : "text-no-300";

  return (
    <div className="mt-1.5">
      <div className="flex items-center gap-1.5">
        <span className={cn("h-[3px] flex-1 rounded-pill", score >= 1 ? fillCls : "bg-bg-overlay")} />
        <span className={cn("h-[3px] flex-1 rounded-pill", score >= 2 ? fillCls : "bg-bg-overlay")} />
        <span className={cn("h-[3px] flex-1 rounded-pill", score >= 3 ? fillCls : "bg-bg-overlay")} />
      </div>
      <p className={cn("mt-1 font-mono text-[12px] sm:text-[10px] uppercase tracking-[0.14em] font-bold", fgCls)}>
        {label}
      </p>
    </div>
  );
}

function scorePassword(pw: string): 0 | 1 | 2 | 3 {
  if (pw.length < 8) return 0;
  let classes = 0;
  if (/[a-z]/.test(pw)) classes++;
  if (/[A-Z]/.test(pw)) classes++;
  if (/\d/.test(pw)) classes++;
  if (/[^A-Za-z0-9]/.test(pw)) classes++;
  if (pw.length >= 12 && classes >= 3) return 3;
  if (classes >= 2) return 2;
  return 1;
}
