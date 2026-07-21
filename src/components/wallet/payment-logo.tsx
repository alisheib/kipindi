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

// Official MNO marks, sourced by Ali (mixx + halopesa refreshed 2026-07-21 to the
// current transparent brand lockups).
//
// All four are now transparent, but they are still NOT a matched set:
//   • mpesa.svg      transparent, but a VERTICAL lockup (icon above wordmark)
//   • airtel.png     transparent, horizontal — red mark + grey "money"
//   • mixx.png       transparent, horizontal — official "yas | mixx" lockup
//                    (dark-blue badge, yellow "yas", DARK-BLUE "mixx" wordmark)
//   • halopesa.png   transparent, horizontal — orange "halopesa" wordmark + swirl
//
// They are rendered on a WHITE tile rather than the dark inset slot used for
// in-house glyphs, and the tile must stay: mixx's wordmark is dark blue and
// airtel's "money" is grey, so on the dark inset they'd be near-invisible. Every
// one of these marks is drawn for a light surface. The white tile also normalises
// the differing aspect ratios (mpesa vertical vs the rest horizontal) so the row
// reads as one. This is the standard checkout treatment for MNO brand assets.
//
// ⚠️ Cache note: these files keep their names (mixx.png / halopesa.png), and the
// service worker (public/sw.js) caches /pay/*.png cache-first. When you swap a
// mark, BUMP CACHE_NAME in sw.js or returning visitors keep the old logo forever.
const MNO_LOGOS: Record<string, string | null> = {
  MPESA: "/pay/mpesa.svg",
  AIRTEL_MONEY: "/pay/airtel.png",
  HALO_PESA: "/pay/halopesa.png",
  MIXX: "/pay/mixx.png",
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
      <span
        className="inline-flex items-center justify-center shrink-0 overflow-hidden"
        style={{
          ...slotStyle,
          // White, not the dark inset: see the note on MNO_LOGOS. Every mark is
          // drawn for a light surface (mixx's wordmark is dark blue), so the dark
          // inset would swallow them.
          background: "#FFFFFF",
          // A hairline keeps the white tile from bleeding into a light container
          // while staying invisible against the dark theme.
          border: "1px solid var(--border)",
          // Generous padding is what makes four different aspect ratios read as one
          // row: each mark is contained, centred and optically similar in weight
          // rather than one filling the tile edge-to-edge.
          padding: Math.max(4, Math.round(size * 0.14)),
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo}
          alt={name}
          loading="lazy"
          decoding="async"
          className="max-h-full max-w-full object-contain"
        />
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
