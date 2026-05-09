import { Suspense } from "react";
import { TopAppBar } from "./top-app-bar";
import { BottomNav } from "./bottom-nav";
import { PublicFooter } from "./public-footer";
import { AuthFlash } from "./auth-flash";
import { NotifyPoller } from "@/components/markets/notify-poller";
import { WinCelebrationHost } from "@/components/markets/win-celebration";
import { getSession } from "@/lib/server/session";
import { db } from "@/lib/server/store";
import { user as guestUser } from "@/lib/mock-data";
import { RealityCheckHost } from "@/components/rg/reality-check";
import { getRgSettings } from "@/lib/server/responsible-gambling";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  let topUser: {
    initials: string;
    name: string;
    phone: string;
    isAuthed: boolean;
    avatarSrc?: string | null;
    seed?: string;
    balance?: number | null;
  } = { initials: guestUser.initials, name: guestUser.name, phone: guestUser.phone, isAuthed: false, balance: null };
  let realityCheckMin = 30;
  if (session) {
    const u = db.user.findById(session.userId);
    const display = u?.displayName ?? "Demo Manager";
    const initials = display.split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase() || "AS";
    const masked = session.phoneE164.length > 6
      ? `${session.phoneE164.slice(0, 4)}*****${session.phoneE164.slice(-2)}`
      : session.phoneE164;
    const wallet = db.wallet.findByUserId(session.userId);
    topUser = {
      initials,
      name: display,
      phone: masked,
      isAuthed: true,
      avatarSrc: u?.avatarDataUrl ?? null,
      seed: session.userId,
      balance: wallet?.balance ?? null,
    };
    const rg = getRgSettings(session.userId);
    realityCheckMin = rg.realityCheckIntervalMin || 30;
  }
  return (
    <div className="min-h-screen bg-bg-base text-text">
      <TopAppBar user={topUser} />
      <main className="pb-[calc(56px+env(safe-area-inset-bottom))] xl:pb-0">
        {children}
      </main>
      <PublicFooter />
      <BottomNav />
      <RealityCheckHost enabled={!!session} intervalMin={realityCheckMin} />
      <NotifyPoller />
      <WinCelebrationHost />
      <Suspense fallback={null}>
        <AuthFlash />
      </Suspense>
    </div>
  );
}
