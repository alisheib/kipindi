/**
 * /api/og/market/[id] — 1200×630 OG share card for a market.
 *
 * Generated server-side via @vercel/og's ImageResponse, which is bundled
 * with Next 16. Renders a kit-faithful tipping-bar hero with the market
 * title, current YES/NO probability, and the brand mark.
 *
 * Used by:
 *   - Twitter/Facebook/WhatsApp share previews (linked from /markets/[id])
 *   - The "Share" button on each market detail page
 */
import { ImageResponse } from "next/og";
import { getMarket, impliedYesPct } from "@/lib/server/market-service";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
          background: "linear-gradient(160deg, oklch(15% 0.03 215) 0%, oklch(20% 0.06 152) 50%, oklch(18% 0.05 22) 100%)",
          padding: 60,
          color: "oklch(96% 0.005 240)",
          fontFamily: "Sora, sans-serif",
        }}
      >
        {/* Header — wordmark + category */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "baseline", fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em" }}>
            <span>50pick</span>
            <span style={{ fontSize: 17, marginLeft: 4, opacity: 0.7, fontFamily: "JetBrains Mono, monospace" }}>.tz</span>
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
            background: "oklch(22% 0.01 240)",
            borderRadius: 18,
            overflow: "hidden",
            display: "flex",
          }}>
            <div style={{
              width: `${yes}%`,
              background: "linear-gradient(90deg, oklch(50% 0.14 152), oklch(58% 0.16 152))",
              boxShadow: "0 0 18px oklch(58% 0.16 152 / 0.4)",
              display: "flex",
            }} />
            <div style={{
              width: `${100 - yes}%`,
              background: "linear-gradient(270deg, oklch(52% 0.16 22), oklch(60% 0.18 22))",
              boxShadow: "0 0 18px oklch(60% 0.18 22 / 0.4)",
              display: "flex",
            }} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, fontFamily: "JetBrains Mono, monospace" }}>
            <span style={{ color: "oklch(80% 0.13 152)", fontWeight: 700 }}>YES {yes}%</span>
            <span style={{ color: "oklch(80% 0.005 240)", opacity: 0.6, fontStyle: "italic", textTransform: "uppercase", fontSize: 14 }}>
              {Math.abs(yes - 50) < 4 ? "tipping" : yes > 50 ? "leans yes" : "leans no"}
            </span>
            <span style={{ color: "oklch(80% 0.14 22)", fontWeight: 700 }}>{100 - yes}% NO</span>
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
