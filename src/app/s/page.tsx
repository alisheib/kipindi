import { getServerT } from "@/lib/i18n-server";
import { OptOutRefusal } from "./optout-refusal";

/**
 * Bare `/s` — an opt-out link that lost its token (a truncated or half-copied SMS link).
 *
 * 🔴 IT USED TO BE THE ROOT 404, INSIDE THE STRIPPED OPT-OUT SHELL. The shell is chosen for `/s` in the
 * root layout (`isOptOutPath`), and the 404's recovery links are soft `<Link>`s, so a tap on one opened
 * the landing page with no nav and no sign-in until a hard reload. It is now the opt-out page's own
 * refusal: the link does not work, nothing has changed, and here are the two other ways to stop.
 * Deeper paths (`/s/<token>/<more>`) are not the opt-out page and get the full shell's 404.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const { t } = await getServerT();
  // ⛔ NOINDEX, like `/s/<token>`.
  return { title: t.optout.title, robots: { index: false, follow: false } };
}

export default async function OptOutBarePage() {
  const { t } = await getServerT();
  return <OptOutRefusal t={t} kind="invalid" />;
}
