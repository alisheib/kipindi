import { getServerT } from "@/lib/i18n-server";
import { renderDepositPage, type DepositSearch } from "../page";

export async function generateMetadata() {
  const { t } = await getServerT();
  return { title: t.wallet.methodCard };
}

/** Hosted Card checkout keeps every classic billing field and its explicit confirmation. */
export default async function DepositCardPage({ searchParams }: { searchParams: Promise<DepositSearch> }) {
  return renderDepositPage(searchParams, true);
}
