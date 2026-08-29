/**
 * ProviderRadioGrid — the payment-provider chooser shared by the deposit and
 * withdraw forms (spec A6 tile system). Both render byte-for-byte identical
 * tiles; this is the single source of truth. Server component (no client
 * state) — the enclosing <form> reads the checked `provider` radio on submit,
 * and all interactive states are pure CSS (`group-has-[:checked]/tile`).
 *
 * ⚠️ The group is NAMED (`group/tile`). An unnamed `group` here would also be
 * satisfied by any ANCESTOR marked `group` — the deposit form is one, so every
 * tile's selection ring and check pip lit up at once regardless of which radio
 * was actually checked. Naming scopes the match to this label.
 *
 * Tile: 48×48 PaymentLogo slot + provider name (Inter 500) beneath.
 *   • selected  — 2px royal `--brand-500` ring + check pip (120ms scale-in;
 *                 reduced-motion instant). Royal, NOT gold (gold = earned money).
 *   • focused   — real `outline` on the TILE (see §A3 note on the label below).
 *   • disabled  — provider down: 40% opacity + "Temporarily unavailable".
 */
import { I } from "@/components/ui/glyphs";
import { PaymentLogo } from "./payment-logo";

export type ProviderOption = { id: string; name: string; hue: number; unavailable?: boolean };

export function ProviderRadioGrid({
  providers,
  defaultProvider,
  unavailableLabel,
}: {
  providers: readonly ProviderOption[];
  /** Pre-selects this provider (e.g. round-tripped after a validation error);
   *  falls back to the first selectable provider. */
  defaultProvider?: string;
  /** Localized "Temporarily unavailable" for the disabled state. */
  unavailableLabel: string;
}) {
  const firstSelectable = providers.findIndex((p) => !p.unavailable);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {providers.map((p, i) => {
        const checked = defaultProvider ? p.id === defaultProvider : i === firstSelectable;
        // §A3 — the real control is `sr-only`, and `sr-only` clips to a 1×1 box, so the
        // catch-all focus outline in globals.css was being drawn on something a player
        // cannot see: tabbing through HOW THEY GET PAID showed nothing at all. The ring
        // has to land on the visible tile. `has-[:focus-visible]` rather than
        // `peer-focus-visible` because the input is this label's CHILD, not its sibling —
        // Tailwind's `peer-*` compiles to `~`, which could never match here (checkbox.tsx
        // can use `peer-*` because its box IS a sibling). `:has()` is already load-bearing
        // in this file for the selection ring, so it adds no new browser requirement.
        // And it is a real `outline`, not a `box-shadow` ring: forced-colors / Windows
        // high-contrast strips box-shadow and keeps outline — the same reason
        // `.gilt-metal:focus-visible` keeps one (E-129).
        return (
          <label
            key={p.id}
            className={`group/tile relative flex flex-col items-center gap-2 px-2 py-3.5 rounded-md border border-border transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[color:var(--brand-400)] ${
              p.unavailable ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:border-border-strong"
            }`}
            style={{ background: "var(--bg-inset)" }}
          >
            <input
              type="radio"
              name="provider"
              // Stable id so a form can react to the CHOSEN rail in pure CSS
              // (`group-has-[#provider-CARD:checked]`) — the deposit form uses it
              // to reveal card-billing fields and hide the mobile-money handset
              // field without any client state. Keep the `provider-<ID>` shape.
              id={`provider-${p.id}`}
              value={p.id}
              required
              disabled={p.unavailable}
              defaultChecked={!p.unavailable && checked}
              className="sr-only peer"
            />
            {/* Royal selection ring — scales in 120ms; instant under reduced-motion. */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-md ring-2 ring-brand-500 opacity-0 scale-95 transition duration-[var(--t-flick)] ease-out motion-reduce:transition-none group-has-[:checked]/tile:opacity-100 group-has-[:checked]/tile:scale-100"
            />
            {/* Check pip — top-right. */}
            <span
              aria-hidden
              className="absolute right-1.5 top-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-white opacity-0 scale-75 transition duration-[var(--t-flick)] ease-out motion-reduce:transition-none group-has-[:checked]/tile:opacity-100 group-has-[:checked]/tile:scale-100"
            >
              <I.check s={11} />
            </span>
            <PaymentLogo id={p.id} name={p.name} hue={p.hue} size={48} />
            <span className="font-medium text-body-sm text-text text-center leading-tight">{p.name}</span>
            {p.unavailable && (
              <span className="text-body-sm text-text-subtle text-center leading-tight">{unavailableLabel}</span>
            )}
          </label>
        );
      })}
    </div>
  );
}
