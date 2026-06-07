import type { Metadata, Viewport } from "next";
import { Sora, Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { AppShell } from "@/components/layout/app-shell";
import { ChatRoot } from "@/components/chat/ChatRoot";
import { FirstVisitPrimer } from "@/components/onboarding/first-visit-primer";
import "./globals.css";

const sora = Sora({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin", "latin-ext"],
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

export const metadata: Metadata = {
  title: {
    default: "50pick — Predict events. Not chance.",
    template: "%s · 50pick",
  },
  description: "Tanzania-licensed binary price-competition markets. Price Competition pool — winners share losers' stake. Mobile-first.",
  applicationName: "50pick",
  formatDetection: { telephone: false, email: false, address: false },
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
  themeColor: "#050817",
};

import { cookies } from "next/headers";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const cookieLocale = jar.get("kp-locale")?.value;
  const lang = cookieLocale === "sw" || cookieLocale === "fr" ? cookieLocale : "en";
  return (
    <html lang={lang} suppressHydrationWarning className={`${sora.variable} ${inter.variable} ${jbm.variable}`}>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <AppShell>{children}</AppShell>
          {/* AI Help Companion — floats on every authed page. The
              component self-hides on /auth/* and /admin/* via a
              pathname guard, so it can sit at the root level here. */}
          <ChatRoot />
          {/* First-visit primer — shows once per browser. Self-hides
              on /auth/* + /admin/* and after localStorage flag set. */}
          <FirstVisitPrimer />
        </ThemeProvider>
      </body>
    </html>
  );
}
