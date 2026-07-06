/**
 * /api/og/market/[id] — 1200×630 OG share card for a market.
 *
 * Generated server-side via next/og's ImageResponse (Satori). Renders a
 * kit-faithful tipping-bar hero with the FiftyMark, market title, and the
 * current YES/NO probability.
 *
 * Colours are sRGB hex/rgba, NOT oklch: this Satori version can't parse
 * oklch() and throws "Failed to parse declaration" (which previously 500'd
 * every share card). The hex values below are the sRGB equivalents of the
 * brand palette in components/brand.tsx.
 *
 * Used by:
 *   - Twitter/Facebook/WhatsApp share previews (linked from /markets/[id])
 *   - The "Share" button on each market detail page
 */
import { ImageResponse } from "next/og";
import { getMarket, impliedYesPct } from "@/lib/server/market-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// sRGB equivalents of the brand oklch palette.
const C = {
  ink: "#eef1f4",
  yes: "#1f9e5b",
  yesDark: "#178048",
  yesLabel: "#63d08f",
  no: "#e05650",
  noDark: "#c1443c",
  noLabel: "#f28b81",
  royal: "#4834c9",
  gilt: "#cba95a",
  track: "#2b2e33",
  tipLabel: "#c8cbcf",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const m = await getMarket(id);
  if (!m) return new Response("Not found", { status: 404 });
  const yes = impliedYesPct(m);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(160deg, #0c1a1f 0%, #16301f 50%, #241417 100%)",
          padding: 60,
          color: C.ink,
          fontFamily: "Sora, sans-serif",
        }}
      >
        {/* Header — brand mark + wordmark + category */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            {/* FiftyMark (simplified) drawn inline — Satori can't import the React
                component, so the coin is raw SVG shapes. */}
            <svg width="48" height="48" viewBox="-3 -3 106 106" style={{ marginRight: 16 }}>
              <defs><clipPath id="ogfm"><circle cx="50" cy="50" r="44.6" /></clipPath></defs>
              <g clipPath="url(#ogfm)">
                <path d="M 30.646 -27.624 A 80 80 0 0 0 69.354 127.624 L 30.646 -27.624 Z" fill={C.yes} />
                <path d="M 30.646 -27.624 A 80 80 0 0 1 69.354 127.624 L 30.646 -27.624 Z" fill={C.no} />
              </g>
              <circle cx="50" cy="50" r="44.6" fill="none" stroke={C.royal} strokeWidth="4" />
              <line x1="37.541" y1="0.030" x2="62.459" y2="99.970" stroke={C.gilt} strokeWidth="5" strokeLinecap="round" />
            </svg>
            <div style={{ display: "flex", alignItems: "baseline", fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em" }}>
              <span>50pick</span>
              <span style={{ fontSize: 17, marginLeft: 4, opacity: 0.7, fontFamily: "JetBrains Mono, monospace" }}>.tz</span>
            </div>
          </div>
          <div style={{ fontSize: 14, fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.16em", textTransform: "uppercase", opacity: 0.7 }}>
            {m.category}
          </div>
        </div>

        {/* Title */}
        <div style={{ marginTop: 48, fontSize: 56, fontWeight: 700, lineHeight: 1.05, letterSpacing: "-0.025em", maxWidth: 1080, display: "flex" }}>
          {m.titleEn}
        </div>

        {/* Tipping bar */}
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{
            position: "relative",
            height: 36,
            background: C.track,
            borderRadius: 18,
            overflow: "hidden",
            display: "flex",
          }}>
            <div style={{
              width: `${yes}%`,
              background: `linear-gradient(90deg, ${C.yesDark}, ${C.yes})`,
              boxShadow: "0 0 18px rgba(31,158,91,0.4)",
              display: "flex",
            }} />
            <div style={{
              width: `${100 - yes}%`,
              background: `linear-gradient(270deg, ${C.noDark}, ${C.no})`,
              boxShadow: "0 0 18px rgba(224,86,80,0.4)",
              display: "flex",
            }} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, fontFamily: "JetBrains Mono, monospace" }}>
            <span style={{ color: C.yesLabel, fontWeight: 700 }}>YES {yes}%</span>
            <span style={{ color: C.tipLabel, opacity: 0.6, fontStyle: "italic", textTransform: "uppercase", fontSize: 14 }}>
              {Math.abs(yes - 50) < 4 ? "tipping" : yes > 50 ? "leans yes" : "leans no"}
            </span>
            <span style={{ color: C.noLabel, fontWeight: 700 }}>{100 - yes}% NO</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 14, opacity: 0.6, fontFamily: "JetBrains Mono, monospace" }}>
            <span>Predict events. Not chance.</span>
            <span>{m.yesPool + m.noPool} TZS volume · {m.predictorCount} predictors</span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
