import { TopAppBar } from "./top-app-bar";
import { BottomNav } from "./bottom-nav";
import { LiveTicker } from "./live-ticker";
import { DemoBanner } from "./demo-banner";
import { getSession } from "@/lib/server/session";
import { db } from "@/lib/server/store";
import { user as guestUser } from "@/lib/mock-data";
import { RealityCheckHost } from "@/components/rg/reality-check";
import { getRgSettings } from "@/lib/server/responsible-gambling";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  let topUser = { initials: guestUser.initials, name: guestUser.name, phone: guestUser.phone, isAuthed: false };
  let realityCheckMin = 30;
  if (session) {
    const u = db.user.findById(session.userId);
    const display = u?.displayName ?? "Demo Manager";
    const initials = display.split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase() || "AS";
    const masked = session.phoneE164.length > 6
      ? `${session.phoneE164.slice(0, 4)}*****${session.phoneE164.slice(-2)}`
      : session.phoneE164;
    topUser = { initials, name: display, phone: masked, isAuthed: true };
    const rg = getRgSettings(session.userId);
    realityCheckMin = rg.realityCheckIntervalMin || 30;
  }
  return (
    <div className="min-h-screen bg-bg-base text-text">
      <DemoBanner />
      <TopAppBar user={topUser} />
      <LiveTicker />
      <main className="pb-[calc(56px+env(safe-area-inset-bottom))] xl:pb-0">
        {children}
      </main>
      <BottomNav />
      <RealityCheckHost enabled={!!session} intervalMin={realityCheckMin} />
    </div>
  );
}
