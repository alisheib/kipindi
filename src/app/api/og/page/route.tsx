/**
 * /api/og/page — generic branded OG card (C2k) for surfaces without a
 * bespoke card: leaderboard, results, proposals, profile. Query:
 *   ?title=...&sub=...
 *
 * Deep-navy brand gradient (#0A0E33 → #060A50, per spec), the mark-a coin, the
 * wordmark, a gilt hairline, the title, and the "The wisdom of YES & NO" tagline.
 * Text uses Satori's default sans (brand fonts aren't loaded into ImageResponse
 * — the ⊘-font caveat); everything else is brand-exact.
 */
import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = (searchParams.get("title") || "50pick").slice(0, 90);
  const sub = (searchParams.get("sub") || "").slice(0, 110);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0A0E33 0%, #060A50 100%)",
          color: "#F7F8FC",
          padding: 64,
          fontFamily: "sans-serif",
          textAlign: "center",
        }}
      >
        {/* mark-a */}
        <svg width="116" height="116" viewBox="0 0 100 100">
          <path d="M 38.87 5.37 A 46 46 0 0 0 61.13 94.63 Z" fill="#1EA362" />
          <path d="M 38.87 5.37 A 46 46 0 0 1 61.13 94.63 Z" fill="#B03A3E" />
          <line x1="38.39" y1="3.43" x2="61.61" y2="96.57" stroke="#E3BC66" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="50" cy="50" r="5" fill="#E3BC66" />
          <circle cx="50" cy="50" r="1.7" fill="#1A2140" />
        </svg>

        <div style={{ marginTop: 22, display: "flex", alignItems: "baseline", fontSize: 30, fontWeight: 700, letterSpacing: "-0.03em" }}>
          <span>50pick</span>
          <span style={{ fontSize: 17, marginLeft: 4, opacity: 0.62 }}>.tz</span>
        </div>

        <div style={{ marginTop: 22, width: 168, height: 2, borderRadius: 2, background: "linear-gradient(90deg, transparent, #E3BC66, transparent)" }} />

        <div style={{ marginTop: 26, fontSize: 54, fontWeight: 800, lineHeight: 1.08, letterSpacing: "-0.02em", maxWidth: 960, display: "flex" }}>
          {title}
        </div>
        {sub ? <div style={{ marginTop: 16, fontSize: 25, opacity: 0.68, display: "flex" }}>{sub}</div> : null}

        <div style={{ position: "absolute", bottom: 46, fontSize: 15, letterSpacing: "0.16em", textTransform: "uppercase", opacity: 0.5 }}>
          The wisdom of YES &amp; NO
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
