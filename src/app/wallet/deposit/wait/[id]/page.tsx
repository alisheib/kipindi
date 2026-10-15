import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { readDepositStatus } from "@/lib/server/deposit-status";
import { DepositWaitingClient } from "../deposit-waiting-client";
import { firstDepositNotice, kycNoticeDismissValue } from "@/lib/server/kyc-notice";
import { KYC_NOTICE_COOKIE } from "@/lib/kyc-notice";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function DepositWaitPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await currentSession();
  const id = (await params).id;
  if (!session) redirect(`/auth/login?next=${encodeURIComponent(`/wallet/deposit/wait/${id}`)}`);
  const read = await readDepositStatus(session.userId, { kind: "txn-id", value: id });
  const notice = await firstDepositNotice(session.userId, {
    dismissCookie: (await cookies()).get(KYC_NOTICE_COOKIE)?.value, depositInHand: true,
  });
  return <DepositWaitingClient ownerId={session.userId} initial={read.view}
    lookupUrl={`/api/wallet/deposits/${encodeURIComponent(id)}/status`} paymentKey={read.txn?.idempotencyKey ?? null}
    firstDepositNotice={notice} noticeDismissValue={notice ? kycNoticeDismissValue(session.userId) : null} />;
}
