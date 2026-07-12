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
import { resolveWinShareToken } from "@/lib/server/share-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** TZS with thin grouping — Satori has no Intl, so group manually. */
const tzs = (n: number) => "TZS " + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

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
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const m = await getMarket(id);
  if (!m) return new Response("Not found", { status: 404 });
  const yes = impliedYesPct(m);

  // ── WIN VARIANT (F5) ──────────────────────────────────────────────────────
  // Addressed ONLY by an HMAC-signed token we minted for the position's owner.
  // The amount is re-read from the ledger inside resolveWinShareToken — it is
  // never taken from the URL, so a fabricated "I won TZS 50M" card is impossible.
  // A forged/expired token silently falls through to the normal market card.
  const win = await resolveWinShareToken(new URL(req.url).searchParams.get("w"));
  if (win && win.marketId === id) {
    const sideColor = win.side === "YES" ? C.yesLabel : C.noLabel;
    return new ImageResponse(
      (
        <div style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          background: "linear-gradient(135deg, #0A0E33 0%, #060A50 100%)",
          padding: 60, color: C.ink, fontFamily: "Sora, sans-serif",
        }}>
          {/* Header — brand mark */}
          <div style={{ display: "flex", alignItems: "center" }}>
            <svg width="48" height="48" viewBox="0 0 100 100" style={{ marginRight: 16 }}>
              <path d="M 38.87 5.37 A 46 46 0 0 0 61.13 94.63 Z" fill="#1EA362" />
              <path d="M 38.87 5.37 A 46 46 0 0 1 61.13 94.63 Z" fill="#B03A3E" />
              <line x1="38.39" y1="3.43" x2="61.61" y2="96.57" stroke="#E3BC66" strokeWidth="3.5" strokeLinecap="round" />
              <circle cx="50" cy="50" r="5" fill="#E3BC66" />
              <circle cx="50" cy="50" r="1.7" fill="#1A2140" />
            </svg>
            <div style={{ display: "flex", alignItems: "baseline", fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em" }}>
              <span>50pick</span>
              <span style={{ fontSize: 17, marginLeft: 4, opacity: 0.7, fontFamily: "JetBrains Mono, monospace" }}>.tz</span>
            </div>
          </div>

          {/* The win — gilt is legitimate here: this is an EARNED-money moment. */}
          <div style={{ marginTop: 44, display: "flex", flexDirection: "column" }}>
            <div style={{
              display: "flex", fontSize: 15, fontFamily: "JetBrains Mono, monospace",
              letterSpacing: "0.18em", textTransform: "uppercase", color: C.gilt,
            }}>
              Won on 50pick
            </div>
            <div style={{ display: "flex", marginTop: 10, fontSize: 92, fontWeight: 700, letterSpacing: "-0.03em", color: C.gilt }}>
              {tzs(win.payout)}
            </div>
            <div style={{ display: "flex", marginTop: 6, fontSize: 22, fontFamily: "JetBrains Mono, monospace", color: C.tipLabel }}>
              <span style={{ color: sideColor, fontWeight: 700 }}>{win.side}</span>
              <span style={{ marginLeft: 10, opacity: 0.75 }}>· staked {tzs(win.stake)} · net +{tzs(win.net)}</span>
            </div>
          </div>

          {/* The market it was won on */}
          <div style={{
            marginTop: 34, fontSize: 36, fontWeight: 700, lineHeight: 1.1,
            letterSpacing: "-0.02em", maxWidth: 1080, display: "flex", opacity: 0.92,
          }}>
            {win.marketTitle}
          </div>

          <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", fontSize: 14, opacity: 0.6, fontFamily: "JetBrains Mono, monospace" }}>
            <span>Predict events. Not chance.</span>
            <span>Licensed by the Gaming Board of Tanzania · 18+</span>
          </div>
        </div>
      ),
      { width: 1200, height: 630 },
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #0A0E33 0%, #060A50 100%)",
          padding: 60,
          color: C.ink,
          fontFamily: "Sora, sans-serif",
        }}
      >
        {/* Header — brand mark + wordmark + category */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            {/* FiftyMark (mark-a) drawn inline — Satori can't import the React
                component, so the mark is raw SVG shapes using the delivered
                brand hex (green/red chord split + gilt needle + gilt/navy hub). */}
            <svg width="48" height="48" viewBox="0 0 100 100" style={{ marginRight: 16 }}>
              <path d="M 38.87 5.37 A 46 46 0 0 0 61.13 94.63 Z" fill="#1EA362" />
              <path d="M 38.87 5.37 A 46 46 0 0 1 61.13 94.63 Z" fill="#B03A3E" />
              <line x1="38.39" y1="3.43" x2="61.61" y2="96.57" stroke="#E3BC66" strokeWidth="3.5" strokeLinecap="round" />
              <circle cx="50" cy="50" r="5" fill="#E3BC66" />
              <circle cx="50" cy="50" r="1.7" fill="#1A2140" />
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
