import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Sora, Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { AppShell } from "@/components/layout/app-shell";
import { LazyOverlays } from "@/components/layout/lazy-overlays";
import { isChatbotEnabled } from "@/lib/server/ai-controls";
import { ScrollRestore } from "@/components/ui/scroll-restore";
import { appUrl } from "@/lib/app-url";
import "./globals.css";
import "./state-tokens.css";
import "./motion.css";

/* ─────────────────────────────────────────────────────────────────────────────
 * FONTS — measured 2026-08-21 against the built `.next/static/media` + the
 * generated `@font-face` chunk, not guessed. Two things the numbers say, and the
 * second is the opposite of what everyone assumes:
 *
 * 1. ⭐ `subsets` DOES NOT CHOOSE WHICH GLYPHS EXIST — IT CHOOSES WHAT IS PRELOADED.
 *    Google returns seven subsets per family (latin · latin-ext · greek ·
 *    greek-ext · cyrillic · cyrillic-ext · vietnamese) and next/font emits an
 *    `@font-face` + a woff2 for EVERY one of them regardless of this array. Proof
 *    in this very build: JetBrains_Mono declares `["latin"]` below and the CSS
 *    chunk still carries its cyrillic, greek, vietnamese AND latin-ext blocks,
 *    each `unicode-range`-gated so the browser fetches them only if a glyph in
 *    that range is actually painted. What `subsets` decides is which of those
 *    files get a `<link rel="preload">` — i.e. which are pulled down eagerly, on
 *    every route, whether or not a single glyph needs them.
 *
 * 2. 🔴 SO `latin-ext` WAS 48% OF THE FONT BYTES ON THE CRITICAL PATH, FOR GLYPHS
 *    THIS APP NEVER RENDERS. Preloaded before: 5 files / 202,400 B. Of that,
 *    Inter latin-ext alone was **85,272 B — the largest font file on the site,
 *    1.76× Inter's own latin** — plus Sora latin-ext at 12,116 B. A scan of all
 *    of `src/` for codepoints above U+00BF found seven distinct characters
 *    (× ÷ â Â é ñ ï), every one of them inside `latin`'s own U+0000–00FF range.
 *    Zero latin-ext codepoints in the product's copy; the three locales are
 *    EN + SW (plain ASCII) + ZH (per-glyph fallback by decision, §T6).
 *    Dropping it from this array preloads 3 files / 105,012 B instead — **95 KB
 *    off every first load** on the low-end Android over Tanzanian mobile data
 *    that §A/§M6 gate 3 exists for.
 *    ⛔ AND IT LOSES NO COVERAGE: the latin-ext face is still declared. A player
 *    display name with an "ł" in it still renders in Inter — the file is just
 *    fetched on demand, exactly as cyrillic and greek already are.
 *
 * ⛔ DO NOT PRUNE A WEIGHT TO SAVE BYTES — THERE ARE NO BYTES TO SAVE. All three
 *    families are served as VARIABLE fonts: Sora 400/500/600/700/800 latin all
 *    resolve to the SAME 25,240 B file, Inter 400–700 latin to the same 48,432 B
 *    file, JBM 400–600 latin to the same 31,340 B file. A weight costs one
 *    ~200-byte `@font-face` block and nothing else. Every weight listed below is
 *    also genuinely referenced (Sora 400 via `.mterm-q`/`.display`/`.num-roll`,
 *    Sora 500 in avatar-menu + needle-drawer, Inter 500 in ~34 places), so
 *    cutting one would trade a real rendering change for no download at all.
 *
 * ⚠️ KNOWN, NOT FIXED HERE: 297 `font-mono` class strings and 11 CSS rules ask
 *    JetBrains Mono for weight **700**, which is not in its list — so the browser
 *    SYNTHESISES bold on most money figures, KPI values and countdowns. Adding
 *    "700" would cost zero extra bytes (same variable file) but it changes how
 *    those numerals look, so it is a design call, not a performance one.
 * ───────────────────────────────────────────────────────────────────────────── */
const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const jbm = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

// One source of truth — do not re-derive the base URL here. This line used to
// duplicate app-url.ts and the two could drift independently.
const APP_URL = appUrl();
const APP_DESC = "Tanzania-licensed prediction markets. Pick YES or NO on real events — winners share the pool minus our commission. Mobile-first, trilingual EN/SW/ZH.";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "50pick — Predict events. Not chance.",
    template: "%s · 50pick",
  },
  description: APP_DESC,
  applicationName: "50pick",
  formatDetection: { telephone: false, email: false, address: false },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "50pick",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: { url: "/icons/apple-touch-180.png", sizes: "180x180" },
  },
  robots: { index: true, follow: true },
  other: { "mobile-web-app-capable": "yes" },
  openGraph: {
    type: "website",
    siteName: "50pick",
    title: "50pick — Predict events. Not chance.",
    description: APP_DESC,
    locale: "en_US",
    images: [{ url: "/og/og-1200x630.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "50pick — Predict events. Not chance.",
    description: APP_DESC,
    images: ["/og/twitter-1200x600.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  // viewport-fit=cover lets the app draw under the notch/home-indicator and is
  // REQUIRED for env(safe-area-inset-*) to return real values on iOS. Without it
  // the bottom-nav / sheets / menus that pad with safe-area-inset-bottom collapse
  // to 0 and sit flush against the home indicator on notched iPhones.
  viewportFit: "cover",
  themeColor: "#0a0e33",
};

import { cookies } from "next/headers";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const cookieLocale = jar.get("kp-locale")?.value;
  const lang = cookieLocale === "sw" || cookieLocale === "zh" ? cookieLocale : "en";
  // Chatbot on/off (AI toolkit). Default ON if the read fails — a config hiccup must
  // never silently hide a working help widget.
  const chatbotEnabled = await isChatbotEnabled().catch(() => true);
  return (
    <html lang={lang} suppressHydrationWarning className={`${sora.variable} ${inter.variable} ${jbm.variable}`}>
      <body className="font-sans antialiased">
        <ThemeProvider initialLocale={lang}>
          <ScrollRestore />
          <AppShell>{children}</AppShell>
          {/* Lazy-loaded overlay components — ChatRoot + FirstVisitPrimer
              are portaled and not needed for FCP. The client wrapper uses
              dynamic() with ssr:false to defer their JS from the initial
              bundle. */}
          <Suspense fallback={null}>
            <LazyOverlays chatbotEnabled={chatbotEnabled} />
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
