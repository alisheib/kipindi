import { ImageResponse } from "next/og";
import { weekNumberOf, weekWord, millioneaWord } from "@/components/maswali/maswali-format";
import { dict } from "@/lib/i18n-dict";
import { WEEK_STATE_KEY } from "@/lib/maswali-week-label";
import type { PublishedOgWeek } from "@/lib/server/millionea-og-week";

/** Canonical English card for share crawlers, which do not carry a player's locale cookie. */
export function renderMillioneaWeekOg(week: PublishedOgWeek): ImageResponse {
  const t = dict.en;
  const title = weekWord(t, weekNumberOf(week.code));
  const state = millioneaWord(t, WEEK_STATE_KEY[week.state]);
  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", display: "flex", flexDirection: "column",
        padding: 64, color: "#F7F8FC", fontFamily: "sans-serif",
        background: "linear-gradient(135deg, #0A0E33 0%, #060A50 100%)",
      }}>
        <div style={{ display: "flex", alignItems: "baseline", fontSize: 34, fontWeight: 700 }}>
          <span>50pick</span><span style={{ fontSize: 19, marginLeft: 5, opacity: 0.7 }}>.tz</span>
        </div>
        <div style={{ display: "flex", marginTop: 82, color: "#c8cbcf", fontSize: 28 }}>
          {t.millionea.productTitle}
        </div>
        <div style={{ display: "flex", marginTop: 14, fontSize: 88, fontWeight: 800, lineHeight: 1.1 }}>
          {title}
        </div>
        <div style={{ display: "flex", marginTop: 15, fontSize: 27, color: "#c8cbcf" }}>
          {week.code}
        </div>
        <div style={{ display: "flex", marginTop: "auto", alignItems: "center" }}>
          <div style={{ width: 8, height: 42, borderRadius: 4, background: "#8978ee", marginRight: 20 }} />
          <span style={{ fontSize: 32, fontWeight: 600 }}>{state}</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { "Cache-Control": "no-store" } },
  );
}
