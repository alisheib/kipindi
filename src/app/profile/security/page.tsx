import { redirect } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { BackLink } from "@/components/ui/back-link";
import { PageHeader } from "@/components/ui/page-header";
import { getSession } from "@/lib/server/session";
import { player2faStatus } from "@/lib/server/player-2fa";
import { db } from "@/lib/server/store";
import { getServerT } from "@/lib/i18n-server";
import { SecurityClient } from "./security-client";
import { PageContainer } from "@/components/layout/page-container";

// Localised tab title (POLISH-BACKLOG §1.7) — was the hard-coded English
// "Security", which a Swahili player saw in their browser tab and history.
export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.security.title };
}
export const dynamic = "force-dynamic";

export default async function SecurityPage() {
  const { t } = await getServerT();
  const session = await getSession();
  if (!session) redirect("/auth/login?next=/profile/security");
  const status = await player2faStatus(session.userId);
  // A-X3 · turning two-step on asks for the current password, so the client must know
  // whether there is one (a password-less account goes straight to the QR).
  const user = await db.user.findById(session.userId);

  return (
    <PageContainer tier="form" className="space-y-5">
      <BackLink fallbackHref="/profile" label={t.profile.title} />
      <PageHeader tone="info" icon={<I.keyRound s={22} />} eyebrow={t.security.eyebrow} title={t.security.title} />
      <SecurityClient enabled={status.enabled} backupRemaining={status.backupRemaining} hasPassword={!!user?.passwordHash} />
    </PageContainer>
  );
}
