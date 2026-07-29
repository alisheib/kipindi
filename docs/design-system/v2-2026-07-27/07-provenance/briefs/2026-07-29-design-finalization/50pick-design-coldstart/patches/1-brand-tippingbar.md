# Patch 1 — `src/components/brand.tsx` : add an `empty` variant to `TippingBar`

The cold-start card needs the tipping bar to render a **neutral "awaiting first
prediction"** track — no green/rose split, no needle — so an empty market doesn't
look like a perfectly balanced 50/50 contest.

### (a) Add `empty` to the props (both the destructure and the type)

Find the `TippingBar` signature (around line 183) and add `empty = false`:

```tsx
export function TippingBar({
  yesPct = 50,
  height = 28,
  animate = true,
  showLabels = true,
  resolved = false,
  className,
  recastOnHover = true,
  empty = false,                 // ← ADD
}: {
  yesPct?: number;
  height?: number;
  animate?: boolean;
  showLabels?: boolean;
  resolved?: boolean;
  className?: string;
  recastOnHover?: boolean;
  /** No activity yet — render a neutral dashed track (no split, no needle,
   *  no labels). Honest "awaiting first bet" state; never a fake 50/50. */
  empty?: boolean;               // ← ADD
}) {
```

### (b) Early-return the neutral track — AFTER the hooks, BEFORE the main JSX

The React hooks (`useState`/`useEffect`/`useRef`) at the top of the function must
still run unconditionally, so place this return **just before** the existing
`return (` that starts the bar markup (i.e. after all the `const` setup like
`const yesRadii = …`):

```tsx
  // Cold-start: neutral track, no split/needle/labels. Placed after all hooks
  // so hook order is stable (React rules-of-hooks safe).
  if (empty) {
    const rr = height / 2;
    return (
      <div className={cn("w-full", className)}>
        <div
          role="progressbar"
          aria-valuenow={0}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="No bets yet"
          style={{
            height,
            borderRadius: rr,
            background:
              "repeating-linear-gradient(90deg, var(--border-strong) 0 8px, transparent 8px 15px)",
            boxShadow: "inset 0 0 0 1px var(--border)",
            opacity: 0.55,
          }}
        />
      </div>
    );
  }

  return (               // ← the EXISTING main return stays exactly as-is
    <div className={cn("w-full", className)}>
    …
```

That's the whole change — every existing caller keeps working (`empty` defaults to
`false`).
