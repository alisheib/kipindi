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
 *
 * i18n: Since the root layout (with I18nProvider) never ran, we read
 * the kp-locale cookie directly and use an inline mini-dict.
 */

import { useEffect, useMemo } from "react";

const MINI_DICT = {
  en: {
    criticalError: "Critical error",
    title: "Something broke too early to recover",
    body: "Your wallet, positions, and bets are unaffected \u2014 every state change is captured in our append-only audit log. The team has been notified.",
    tryAgain: "Try again",
    goHome: "Go home",
    reference: "Reference",
    help: "Gambling should stay fun. If it stops, take a break or set limits.",
    rg: "Responsible gaming",
    helpline: "Helpline 0800 11 0011",
    gbt: "18+ \u00b7 Licensed by the Gaming Board of Tanzania",
  },
  sw: {
    criticalError: "Hitilafu kubwa",
    title: "Kitu kimevunjika kabla hata ya kuanza",
    body: "Pochi yako, nafasi na madau hayajaathiriwa \u2014 kila mabadiliko yanarekodiwa kwenye kumbukumbu yetu. Timu imetaarifiwa.",
    tryAgain: "Jaribu tena",
    goHome: "Nenda nyumbani",
    reference: "Rejea",
    help: "Kucheza kuwe raha. Kikiacha kuwa raha, pumzika au weka mipaka.",
    rg: "Uchezaji wa busara",
    helpline: "Simu ya msaada 0800 11 0011",
    gbt: "18+ \u00b7 Imepewa leseni na Bodi ya Michezo ya Kubahatisha Tanzania",
  },
  zh: {
    criticalError: "\u4e25\u91cd\u9519\u8bef",
    title: "\u7cfb\u7edf\u5728\u542f\u52a8\u524d\u5c31\u51fa\u4e86\u95ee\u9898",
    body: "\u60a8\u7684\u94b1\u5305\u3001\u6301\u4ed3\u548c\u6295\u6ce8\u4e0d\u53d7\u5f71\u54cd \u2014 \u6bcf\u6b21\u72b6\u6001\u53d8\u66f4\u90fd\u8bb0\u5f55\u5728\u5ba1\u8ba1\u65e5\u5fd7\u4e2d\u3002\u56e2\u961f\u5df2\u6536\u5230\u901a\u77e5\u3002",
    tryAgain: "\u518d\u8bd5\u4e00\u6b21",
    goHome: "\u56de\u5230\u9996\u9875",
    reference: "\u53c2\u8003\u7f16\u53f7",
    help: "\u535a\u5f69\u5e94\u4fdd\u6301\u4e50\u8da3\u3002\u5982\u679c\u4e0d\u518d\u5feb\u4e50\uff0c\u8bf7\u4f11\u606f\u6216\u8bbe\u7f6e\u9650\u989d\u3002",
    rg: "\u8d1f\u8d23\u4efb\u535a\u5f69",
    helpline: "\u5e2e\u52a9\u70ed\u7ebf 0800 11 0011",
    gbt: "18+ \u00b7 \u7531\u5766\u6851\u5c3c\u4e9a\u535a\u5f69\u59d4\u5458\u4f1a\u53d1\u7167",
  },
} as const;

function readLocale(): "en" | "sw" | "zh" {
  if (typeof document === "undefined") return "en";
  const m = document.cookie.match(/(?:^|; )kp-locale=([^;]*)/);
  if (!m) return "en";
  const v = decodeURIComponent(m[1]);
  return v === "sw" || v === "zh" ? v : "en";
}

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

  const t = useMemo(() => MINI_DICT[readLocale()], []);

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
            {t.criticalError}
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
            {t.title}
          </h1>

          <p
            style={{
              maxWidth: 420,
              fontSize: 13,
              lineHeight: 1.5,
              color: TEXT_SUBTLE,
              margin: 0,
            }}
          >
            {t.body}
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
              {t.reference}: <span style={{ color: TEXT }}>{error.digest}</span>
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
              {t.tryAgain}
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
              {t.goHome}
            </a>
          </div>

          {/* Responsible-gambling footer — required on EVERY surface incl. this
              root-error boundary (GLI-19 / LCCP). Helpline + RG link are always
              reachable even when the whole app failed to boot. */}
          <div
            style={{
              marginTop: 18,
              paddingTop: 16,
              borderTop: `1px solid ${BORDER}`,
              display: "flex",
              flexDirection: "column",
              gap: 6,
              maxWidth: 420,
              fontSize: 11,
              lineHeight: 1.5,
              color: TEXT_SUBTLE,
            }}
          >
            <span>{t.help}</span>
            <span>
              <a href="/legal/responsible-gambling" style={{ color: GOLD, textDecoration: "none", fontWeight: 700 }}>
                {t.rg}
              </a>
              <span style={{ color: BORDER }}>{"   ·   "}</span>
              <a href="tel:0800110011" style={{ color: TEXT_MUTED, textDecoration: "none" }}>
                {t.helpline}
              </a>
            </span>
            <span>{t.gbt}</span>
          </div>
        </main>
      </body>
    </html>
  );
}
