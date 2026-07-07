/**
 * ProviderRadioGrid — the payment-provider chooser shared by the deposit and
 * withdraw forms. Both rendered byte-for-byte identical radio-cards inline;
 * this is the single source of truth. Server component (no client state) — the
 * enclosing <form> reads the checked `provider` radio on submit.
 *
 * The card's initials badge derives from the provider name; the gradient hue is
 * per-provider so each brand reads distinct without shipping logos.
 */
export type ProviderOption = { id: string; name: string; hue: number };

export function ProviderRadioGrid({
  providers,
  defaultProvider,
}: {
  providers: readonly ProviderOption[];
  /** Pre-selects this provider (e.g. round-tripped after a validation error);
   *  falls back to the first provider. */
  defaultProvider?: string;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {providers.map((p, i) => (
        <label
          key={p.id}
          className="relative flex flex-col items-center gap-2 px-2 py-3.5 rounded-md border border-border cursor-pointer transition-colors hover:border-gold-700 has-[:checked]:border-gold-500 has-[:checked]:bg-gold-500/10"
          style={{ background: "var(--bg-inset)" }}
        >
          <input
            type="radio"
            name="provider"
            value={p.id}
            required
            defaultChecked={defaultProvider ? p.id === defaultProvider : i === 0}
            className="sr-only peer"
          />
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-md font-display font-bold text-[12px] text-text"
            style={{ background: `linear-gradient(135deg, oklch(45% 0.10 ${p.hue}), oklch(30% 0.08 ${p.hue}))` }}
          >
            {p.name.split(" ").map((s) => s[0]).join("").slice(0, 2)}
          </span>
          <span className="font-display text-[12px] font-semibold text-text text-center leading-tight">{p.name}</span>
        </label>
      ))}
    </div>
  );
}
