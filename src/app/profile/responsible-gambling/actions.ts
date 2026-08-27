"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentSession } from "@/lib/server/auth-service";
import { setLimits, selfExclude, coolOff, SELF_EXCLUSION_PERIODS_SEC, COOLING_OFF_PERIODS_SEC } from "@/lib/server/responsible-gambling";
import { destroySession } from "@/lib/server/session";

function n(s: FormDataEntryValue | null): number | null {
  if (s === null) return null;
  const v = String(s).trim();
  if (v === "" || v === "0") return null;
  const x = parseInt(v.replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(x) && x > 0 ? x : null;
}

export async function setLimitsAction(formData: FormData) {
  const session = await currentSession();
  if (!session) redirect("/auth/login");
  const result = await setLimits(session.userId, {
    dailyDepositLimit:   n(formData.get("dailyDepositLimit")),
    weeklyDepositLimit:  n(formData.get("weeklyDepositLimit")),
    monthlyDepositLimit: n(formData.get("monthlyDepositLimit")),
    dailyLossLimit:      n(formData.get("dailyLossLimit")),
    sessionTimeLimitMin: n(formData.get("sessionTimeLimitMin")),
    realityCheckIntervalMin: parseInt(String(formData.get("realityCheckIntervalMin") ?? "30"), 10) || 30,
  });
  revalidatePath("/profile/responsible-gambling");
  // ⛔ THE KEY, NOT THE PROSE. This used to forward `result.error` — the server's own English —
  // straight onto a COMPLIANCE screen, so a Swahili or Chinese player who mistyped a limit read
  // "Invalid value for dailyLossLimit." The page renders the reason through the registry now.
  if (!result.ok) {
    redirect(`/profile/responsible-gambling?reason=rg_limit_invalid`);
  }
  redirect("/profile/responsible-gambling?saved=1");
}

export async function selfExcludeAction(formData: FormData) {
  const session = await currentSession();
  if (!session) redirect("/auth/login");
  const period = String(formData.get("period") ?? "");
  if (!(period in SELF_EXCLUSION_PERIODS_SEC)) {
    redirect(`/profile/responsible-gambling?reason=rg_period_invalid`);
  }
  const res = await selfExclude(session.userId, period as keyof typeof SELF_EXCLUSION_PERIODS_SEC);
  await destroySession();
  // ⭐ `serving`, EXPLICITLY, AND WITH THE END DATE — not the `?excluded=1` alias.
  //
  // This is the path a REAL player takes: they press the button and land here immediately. The
  // alias still renders the serving panel so a bookmarked link keeps working, but leaving the
  // common path on a compatibility shim meant the named branch was reached only from a failed
  // sign-in — the rarest route exercising the code, the commonest route on the fallback.
  // The date matters here more than anywhere: this is the moment the player is told how long
  // the break they just chose actually lasts.
  const until = res?.data?.until ? `&until=${encodeURIComponent(res.data.until.slice(0, 10))}` : "";
  redirect(`/auth/login?excluded=serving${until}`);
}

export async function coolOffAction(formData: FormData) {
  const session = await currentSession();
  if (!session) redirect("/auth/login");
  const period = String(formData.get("period") ?? "");
  if (!(period in COOLING_OFF_PERIODS_SEC)) {
    redirect(`/profile/responsible-gambling?reason=rg_period_invalid`);
  }
  await coolOff(session.userId, period as keyof typeof COOLING_OFF_PERIODS_SEC);
  await destroySession();
  redirect("/auth/login?cooled=1");
}
