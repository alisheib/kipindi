import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { readDepositStatus } from "@/lib/server/deposit-status";
import { pathWithQuery } from "@/lib/safe-next";
import { DepositWaitingClient } from "./deposit-waiting-client";
import { firstDepositNotice, kycNoticeDismissValue } from "@/lib/server/kyc-notice";
import { KYC_NOTICE_COOKIE } from "@/lib/kyc-notice";
import { cookies } from "next/headers";
import { isFundingUuid } from "@/lib/journey/funding-storage";

export const dynamic = "force-dynamic";

export default async function RecoverDepositPage({ searchParams }: { searchParams: Promise<{ key?: string }> }) {
  const session = await currentSession();
  if (!session) redirect(`/auth/login?next=${encodeURIComponent(pathWithQuery("/wallet/deposit/wait", await searchParams))}`);
  const key = (await searchParams).key ?? "";
  const read = await readDepositStatus(session.userId, { kind: "funding-key", value: key });
  const notice = await firstDepositNotice(session.userId, {
    dismissCookie: (await cookies()).get(KYC_NOTICE_COOKIE)?.value, depositInHand: true,
  });
  return <DepositWaitingClient ownerId={session.userId} initial={read.view}
    lookupUrl={`/api/wallet/deposits/recover?key=${encodeURIComponent(key)}`}
    paymentKey={isFundingUuid(key) ? key : null}
    firstDepositNotice={notice} noticeDismissValue={notice ? kycNoticeDismissValue(session.userId) : null} />;
}
