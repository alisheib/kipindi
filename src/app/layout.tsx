import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Sora, Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { AppShell } from "@/components/layout/app-shell";
import { LazyOverlays } from "@/components/layout/lazy-overlays";
import { isChatbotEnabled } from "@/lib/server/ai-controls";
import { SUPPORT_EMAIL } from "@/lib/server/support-config";
import { ScrollRestore } from "@/components/ui/scroll-restore";
import { GoogleTag } from "@/components/analytics/google-tag";
import { DomTranslationGuard } from "@/components/layout/dom-translation-guard";
import { SiteVisitBeacon } from "@/components/analytics/site-visit-beacon";
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

/**
 * 🔴 EXPORTED SO A ROUTE CAN SPREAD IT, AND THAT IS NOT TIDINESS — IT IS A REGRESSION FIX.
 * Next merges `metadata` per FIELD, not deeply: a route that exports `openGraph: { url: "/" }`
 * REPLACES this whole object. On 2026-09-24 a commit that added og:url to the landing page did
 * exactly that and deleted og:image, og:locale, og:site_name and og:type from the single most
 * shared URL on the platform — measured 0 of each on "/" while /markets, untouched, had them all.
 * The share card the commit was written to improve was the share card it removed.
 * ⛔ Any route that needs ONE openGraph field must spread this object, never re-declare a partial.
 */
export const ROOT_OPEN_GRAPH = {
    type: "website" as const,
    siteName: "50pick",
    title: "50pick — Predict events. Not chance.",
    description: APP_DESC,
    // 🔴 THIS SAID `en_US` ON A SWAHILI-DEFAULT PRODUCT. Since 8822b648 a visitor with no
    // language cookie gets Swahili, so every link shared into WhatsApp — the main way players
    // arrive here — announced the wrong language for the page it opens.
    // ⚠️ NO `hreflang` IS ADDED, AND ITS ABSENCE IS CORRECT, NOT AN OVERSIGHT. hreflang requires a
    // DISTINCT URL PER LANGUAGE; this product switches locale by cookie, so all three locales live
    // at the same URL. Emitting three alternates pointing at one URL would declare duplicates to a
    // crawler and describe the site less accurately than saying nothing.
    locale: "sw_TZ",
    alternateLocale: ["en_US", "zh_CN"],
    images: [{ url: "/og/og-1200x630.png", width: 1200, height: 630 }],
};

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
  /**
   * 🔴 `notranslate` — A LICENSED MONEY PRODUCT MUST NOT LET A MACHINE REWRITE ITS COPY.
   * Reported by Ali 2026-09-18 and captured off the player's own handset:
   *
   *   NotFoundError: Failed to execute 'removeChild' on 'Node': The node to be removed is
   *   not a child of this node.        (Android 10, Chrome 152 Mobile)
   *
   * Google Translate REPLACES text nodes (wrapping each in its own `<font>`), so the nodes
   * React is holding references to are no longer the nodes in the document. The next re-render
   * — here, the board repainting after a bet — asks the DOM to remove a child that has been
   * swapped underneath it, and the throw takes the whole route to its error boundary. It looked
   * like "only on one phone" for two sessions because **auto-translate is a per-device browser
   * setting**, which nothing in our data, our logs or our test suites can see.
   *
   * ⭐ AND BLOCKING IT IS THE PRODUCT-CORRECT CALL, not merely the crash-avoiding one. 50pick
   * ships a reviewed trilingual dictionary (sw/en/zh) whose betting and money wording is
   * deliberate — "Stake returned", "You win X if Up", "Your funds are safe". A machine
   * paraphrase of those sentences on a regulated real-money surface is a compliance and trust
   * hazard well before it is a rendering one, and this product already has the honest route: the
   * in-app SW/EN/ZH switcher, which swaps our own vetted strings and cannot crash.
   *
   * ⚠️ IT IS ADVISORY, AND THAT IS WHY IT IS ONLY HALF THE FIX. Google honours it; an in-app
   * webview (Facebook/Instagram), an extension, or another translator need not. The belt is
   * `installDomTranslationGuard()` — see `src/lib/client/dom-translation-guard.ts`.
   * Guard: `npm run test:translation-safety`.
   */
  other: { "mobile-web-app-capable": "yes", google: "notranslate" },
  openGraph: ROOT_OPEN_GRAPH,
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
import { localeOrDefault } from "@/lib/i18n-dict";
import { CARD_SPACING_COOKIE, cardSpacingFromCookie } from "@/lib/card-spacing";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  // A visitor with no language chosen gets Swahili, the platform default (`localeOrDefault`).
  const lang = localeOrDefault(jar.get("kp-locale")?.value);
  // Card spacing (Mobile Visual Plan U2): only "comfortable" is stamped; no attribute IS Compact, the phone default.
  // Read here, on the server, so the first paint is already right — see `src/lib/card-spacing.ts`.
  const density = cardSpacingFromCookie(jar.get(CARD_SPACING_COOKIE)?.value) === "comfortable" ? "comfortable" : undefined;
  // Chatbot on/off (AI toolkit). Default ON if the read fails — a config hiccup must
  // never silently hide a working help widget.
  const chatbotEnabled = await isChatbotEnabled().catch(() => true);
  // ⛔ `translate="no"` + the `notranslate` class are the ATTRIBUTE half of the
  // `google: "notranslate"` meta in `metadata` above; browsers honour the two in different
  // places, so both are set. See that comment for WHY this product blocks machine translation
  // at all, and `dom-translation-guard.ts` for what protects us when a translator ignores both.
  return (
    <html lang={lang} translate="no" data-density={density} suppressHydrationWarning className={`notranslate ${sora.variable} ${inter.variable} ${jbm.variable}`}>
      <body className="font-sans antialiased">
        {/* ⛔ FIRST IN THE BODY, DELIBERATELY. Makes `removeChild`/`insertBefore` tolerant of a
            page translator that has re-parented React's nodes — the crash that took the Up & Down
            board off a player's phone on 2026-09-18 and read as "only one handset" for two
            sessions. It renders nothing; the position is about load order, not layout. */}
        <DomTranslationGuard />
        {/* GA4 — live hosts only, never on /admin or a tokened page, addresses scrubbed. Read the
            component's header before touching it; Privacy §4/§7 describe exactly this. */}
        <GoogleTag />
        {/* First-party visit counter — every visitor, no cookie, no identifier; see site-visit-beacon.tsx. */}
        <SiteVisitBeacon />
        <ThemeProvider initialLocale={lang} initialDensity={density}>
          <ScrollRestore />
          <AppShell>{children}</AppShell>
          {/* Lazy-loaded overlay components — ChatRoot + FirstVisitPrimer
              are portaled and not needed for FCP. The client wrapper uses
              dynamic() with ssr:false to defer their JS from the initial
              bundle. */}
          <Suspense fallback={null}>
            {/* ⛔ `supportEmail` is READ HERE, on the server, for the same reason
                `chatbotEnabled` is — and E-226 is why it is a prop rather than an import.
                The chat's escalate card is inside a `"use client"` tree, and
                `defineConfig`'s cache does not cross into the browser bundle, so a client
                component importing `SUPPORT_EMAIL()` reads the module DEFAULT for ever and
                an officer's saved address never reaches it. Same trap `agentDoorVisible`
                already documents in `app-shell.tsx`. */}
            <LazyOverlays chatbotEnabled={chatbotEnabled} supportEmail={SUPPORT_EMAIL()} />
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
