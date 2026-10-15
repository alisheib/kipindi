import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { AppShell } from "@/components/layout/app-shell";
import { LazyOverlays } from "@/components/layout/lazy-overlays";
import { isChatbotEnabled } from "@/lib/server/ai-controls";
import { SUPPORT_EMAIL, getSupportConfig } from "@/lib/server/support-config";
import { publicFactAttrs } from "@/lib/support-config";
import { ScrollRestore } from "@/components/ui/scroll-restore";
import { GoogleTag } from "@/components/analytics/google-tag";
import { DomTranslationGuard } from "@/components/layout/dom-translation-guard";
import { SiteVisitBeacon } from "@/components/analytics/site-visit-beacon";
import { appUrl } from "@/lib/app-url";
import { dict, localeOrDefault } from "@/lib/i18n-dict";
import "./globals.css";
import "./fonts.css";
import "./state-tokens.css";
import "./motion.css";

/**
 * The three site families are frozen from the successful 20c49f568 build in
 * public/fonts and src/app/fonts.css. This preserves the exact WOFF2 faces,
 * unicode ranges, weight coverage, fallback metrics and Latin preloads while
 * removing the intermittent Google stylesheet response from the build path.
 * The Sora/Inter/JetBrains Mono OFL licenses are in public/fonts.
 */
// One source of truth — do not re-derive the base URL here. This line used to
// duplicate app-url.ts and the two could drift independently.
const APP_URL = appUrl();
const APP_DESC = "Tanzania-licensed prediction markets. Pick YES or NO on real events — winners share the pool minus our commission. Mobile-first, trilingual EN/SW/ZH.";
/** The site's title reads the tagline's single dictionary key. */
const SITE_TITLE = `50pick — ${dict.en.auth.railTagline}`;

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
    title: SITE_TITLE,
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
    default: SITE_TITLE,
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
    title: SITE_TITLE,
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
import { journeyShellShown } from "@/lib/server/journey-preview";
import { NOT_FOUND_WATCH_SCRIPT } from "@/lib/not-found-watch";
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
  // ⭐ AND THE SHELL'S JOURNEY ANSWER (A21, 2026-10-14), read beside it: `data-shell="journey"` on <html> is how the
  // stylesheet knows the journey shell is drawn (`journeyShellShown` says why it is no longer `:root:has()`). A classic
  // request gets no attribute, so its served bytes are what they were.
  const [chatbotEnabled, journeyShell] = await Promise.all([isChatbotEnabled().catch(() => true), journeyShellShown()]);
  // ⛔ `translate="no"` + the `notranslate` class are the ATTRIBUTE half of the
  // `google: "notranslate"` meta in `metadata` above; browsers honour the two in different
  // places, so both are set. See that comment for WHY this product blocks machine translation
  // at all, and `dom-translation-guard.ts` for what protects us when a translator ignores both.
  return (
    /* ⭐ THE PUBLIC FACT RIDES ON <html> (owner's rule 2026-10-03: the licence is editable). Client components
       cannot read the server config (E-226), so the saved licence is published here, from the live row, and
       `LICENCE_NUMBER()` reads it back in the browser. The start tag is parsed before any script runs, so the
       first client render already agrees with the server HTML. See `@/lib/support-config` "HOW A SAVED VALUE
       REACHES A CLIENT COMPONENT".
       ⛔ The helpline is NOT published here since 2026-10-09: no player page shows it (the owner's ruling of
       2026-10-06), and once the marketing footer was emptied that day nothing read it — it sat in every page's
       HTML for no reader. `test:support-contact` §15.8 holds it off. */
    <html lang={lang} translate="no" data-density={density} data-shell={journeyShell ? "journey" : undefined} {...publicFactAttrs(getSupportConfig())} suppressHydrationWarning className="notranslate kp-local-fonts">
      <head>
        <link rel="preload" href="/fonts/6bd983bd58a87a3d-s.p.1hey5yyym6mz_.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/83afe278b6a6bb3c-s.p.2bn3s6zvc0dyp.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/051742360c26797e-s.p.1bkzbscqrt8rl.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
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
        {/* ⭐ A21 (2026-10-14) · A JOURNEY REQUEST'S NOT-FOUND WATCH: raises `data-not-found` on <html> while the page loads,
            so the journey's chrome rests its lit tab before any script runs (`lib/not-found-watch.ts` has the why — it
            replaced a root `:has()`). Above AppShell, so it is listening before the mark or React's 404 template can
            arrive; a classic request renders nothing here and its bytes are unchanged. */}
        {journeyShell && <script dangerouslySetInnerHTML={{ __html: NOT_FOUND_WATCH_SCRIPT }} />}
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
