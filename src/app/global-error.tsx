"use client";

/**
 * global-error.tsx — Next.js App Router's last-resort error boundary.
 *
 * Fires when even the root layout fails to render. error.tsx catches
 * errors inside a route segment; this catches errors OUTSIDE every
 * segment — provider crashes, theme-boot script crashes, font-loader
 * failures, etc. It must:
 *   - Define its own <html> and <body> (the root layout never ran)
 *   - Inline its own minimal styles (no globals.css available — kit
 *     tokens are inlined as OKLCH literals so the page still looks
 *     like 50pick instead of an unstyled browser default)
 *   - Reach for ZERO imports beyond React + next/link to keep the
 *     bundle that ships in the boundary case as small as possible
 *   - Echo only the `digest` ID (never the raw message or stack)
 *
 * This is the page that's the difference between a player seeing a
 * branded "we noticed something broke" and a raw stack trace they
 * can't read. Production-grade requirement.
 */

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-console
      console.error("[50pick] root error boundary fired", { digest: error.digest });
    }
  }, [error]);

  // Inline OKLCH so the page is readable even with no stylesheet.
  const BG = "oklch(15% 0.130 268)";
  const ELEVATED = "oklch(22% 0.140 268)";
  const TEXT = "oklch(98% 0.012 268)";
  const TEXT_MUTED = "oklch(86% 0.040 268)";
  const TEXT_SUBTLE = "oklch(70% 0.080 268)";
  const GOLD = "oklch(86% 0.13 82)";
  const NO_BORDER = "oklch(44% 0.17 22)";
  const NO_TEXT = "oklch(80% 0.14 22)";
  const BORDER = "oklch(34% 0.130 268)";

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100svh",
          background: BG,
          color: TEXT,
          fontFamily:
            "'Sora', 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          fontFeatureSettings: '"ss01", "cv11"',
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <main
          role="alert"
          style={{
            maxWidth: 520,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
          }}
        >
          {/* Inline 50pick mark — no asset dependencies. Just two
              wedges + a divider + the "50" numeral. */}
          <svg width="56" height="56" viewBox="0 0 100 100" aria-label="50pick" style={{ display: "block" }}>
            <defs>
              <clipPath id="ge-coin">
                <circle cx="50" cy="50" r="49" />
              </clipPath>
            </defs>
            <g clipPath="url(#ge-coin)">
              <path d="M 30.65 -27.62 A 50 50 0 0 0 69.35 127.62 L 30.65 -27.62 Z" fill="oklch(58% 0.16 152)" />
              <path d="M 30.65 -27.62 A 50 50 0 0 1 69.35 127.62 L 30.65 -27.62 Z" fill="oklch(60% 0.18 22)" />
              <line x1="30.65" y1="-27.62" x2="69.35" y2="127.62" stroke={GOLD} strokeWidth="2" strokeLinecap="round" />
              <text
                x="50"
                y="55"
                textAnchor="middle"
                fontFamily="'JetBrains Mono', monospace"
                fontWeight={700}
                fontSize="30"
                fill="oklch(99% 0.006 268)"
                style={{ letterSpacing: "-0.04em" }}
              >
                50
              </text>
            </g>
            <circle cx="50" cy="50" r="49" fill="none" stroke="oklch(48% 0.20 268)" strokeWidth="2" />
          </svg>

          <div
            aria-hidden
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 44,
              height: 44,
              borderRadius: 999,
              border: `1px solid ${NO_BORDER}`,
              background: "oklch(40% 0.13 22 / 0.15)",
              color: NO_TEXT,
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            !
          </div>

          <p
            style={{
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.20em",
              color: NO_TEXT,
              margin: 0,
            }}
          >
            Critical error · Hitilafu kubwa
          </p>

          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              margin: 0,
              color: TEXT,
            }}
          >
            Something broke too early to recover
          </h1>
          <p style={{ margin: 0, fontStyle: "italic", color: TEXT_MUTED, fontSize: 14 }}>
            Kitu kimevunjika kabla hata ya kuanza
          </p>

          <p
            style={{
              maxWidth: 420,
              fontSize: 13,
              lineHeight: 1.5,
              color: TEXT_SUBTLE,
              margin: 0,
            }}
          >
            Your wallet, positions, and bets are unaffected — every state
            change is captured in our append-only audit log. The team has
            been notified.
          </p>

          {error.digest && (
            <p
              style={{
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                fontSize: 11,
                color: TEXT_SUBTLE,
                margin: 0,
              }}
            >
              Reference: <span style={{ color: TEXT }}>{error.digest}</span>
            </p>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 8 }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                appearance: "none",
                border: `1px solid ${GOLD}`,
                background: `linear-gradient(180deg, ${GOLD} 0%, oklch(72% 0.14 78) 100%)`,
                color: "oklch(18% 0.06 76)",
                fontWeight: 700,
                fontSize: 13,
                padding: "0 18px",
                height: 40,
                borderRadius: 999,
                cursor: "pointer",
              }}
            >
              Try again · Jaribu tena
            </button>
            <a
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 40,
                padding: "0 16px",
                borderRadius: 999,
                border: `1px solid ${BORDER}`,
                background: ELEVATED,
                color: TEXT_MUTED,
                fontSize: 13,
                textDecoration: "none",
              }}
            >
              Go home · Mwanzo
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
