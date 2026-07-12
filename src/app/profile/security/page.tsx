import { redirect } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { BackLink } from "@/components/ui/back-link";
import { PageHeader } from "@/components/ui/page-header";
import { getSession } from "@/lib/server/session";
import { player2faStatus } from "@/lib/server/player-2fa";
import { getServerT } from "@/lib/i18n-server";
import { SecurityClient } from "./security-client";

export const metadata = { title: "Security" };
export const dynamic = "force-dynamic";

export default async function SecurityPage() {
  const { t } = await getServerT();
  const session = await getSession();
  if (!session) redirect("/auth/login?next=/profile/security");
  const status = await player2faStatus(session.userId);

  return (
    <main className="mx-auto max-w-[640px] px-3 lg:px-6 py-6 space-y-5">
      <BackLink fallbackHref="/profile" label={t.profile.title} />
      <PageHeader tone="info" icon={<I.keyRound s={22} />} eyebrow={t.security.eyebrow} title={t.security.title} />
      <SecurityClient enabled={status.enabled} backupRemaining={status.backupRemaining} />
    </main>
  );
}
