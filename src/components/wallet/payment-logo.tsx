/**
 * PaymentLogo — the 48×48 provider mark slot shared by the deposit/withdraw
 * chooser and the wallet "Methods" tab (spec A6). One source of truth so every
 * payment surface renders the same tile.
 *
 * Marks by kind:
 *  • Card / Bank — in-house glyphs (`cardPay` / `bank`) in the kit idiom;
 *    shippable now.
 *  • MNOs (M-Pesa, Airtel Money, HaloPesa, Mixx by Yas) — official brand marks
 *    are TRADEMARKED and must not be redrawn; they're sourced by Ali into
 *    `public/pay/`. Until a slug is delivered its entry stays `null` and we show
 *    a branded placeholder (hued initials on the slot) so layout ships now and
 *    the real SVG is a one-line drop-in later.
 *
 * Presentational (no hooks) → renders in both server pages and the client
 * wallet.
 */
import { I } from "@/components/ui/glyphs";

// Official MNO marks — set the path once Ali delivers each asset.
const MNO_LOGOS: Record<string, string | null> = {
  MPESA: null, // "/pay/mpesa.svg"
  AIRTEL_MONEY: null, // "/pay/airtel.svg"
  HALO_PESA: null, // "/pay/halopesa.svg"
  MIXX: null, // "/pay/mixx.svg"
};

export function PaymentLogo({
  id,
  name,
  hue,
  size = 48,
}: {
  id: string;
  name: string;
  hue: number;
  size?: number;
}) {
  const inner = Math.round(size * 0.5);
  const slotStyle = {
    width: size,
    height: size,
    borderRadius: "var(--r-md)",
    background: "var(--bg-inset)",
    border: "1px solid var(--border)",
  } as const;

  // In-house glyph marks — Card / Bank.
  if (id === "CARD" || id === "BANK_TRANSFER") {
    const Mark = id === "CARD" ? I.cardPay : I.bank;
    return (
      <span className="inline-flex items-center justify-center shrink-0 text-text-muted" style={slotStyle}>
        <Mark s={inner} />
      </span>
    );
  }

  // Official MNO logo, once delivered.
  const logo = MNO_LOGOS[id] ?? null;
  if (logo) {
    return (
      <span className="inline-flex items-center justify-center shrink-0 p-2" style={slotStyle}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} alt={name} className="max-h-full max-w-full object-contain" />
      </span>
    );
  }

  // Placeholder until the official mark lands — hued initials on the slot.
  const initials = name.split(" ").map((s) => s[0]).join("").slice(0, 2);
  return (
    <span
      className="inline-flex items-center justify-center shrink-0 font-display font-bold text-text"
      style={{
        ...slotStyle,
        fontSize: Math.round(size * 0.27),
        background: `linear-gradient(135deg, oklch(45% 0.10 ${hue}), oklch(30% 0.08 ${hue}))`,
      }}
    >
      {initials}
    </span>
  );
}
