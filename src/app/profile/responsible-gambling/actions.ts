"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentSession } from "@/lib/server/auth-service";
import { signInPathForAction } from "@/lib/server/sign-in-path";
import { setLimits, selfExclude, coolOff, selfExclusionStandingOf, SELF_EXCLUSION_PERIODS_SEC, COOLING_OFF_PERIODS_SEC } from "@/lib/server/responsible-gambling";
import { destroySession } from "@/lib/server/session";
import { breakEndParam } from "@/lib/break-end";

function n(s: FormDataEntryValue | null): number | null {
  if (s === null) return null;
  const v = String(s).trim();
  if (v === "" || v === "0") return null;
  const x = parseInt(v.replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(x) && x > 0 ? x : null;
}

export async function setLimitsAction(formData: FormData) {
  const session = await currentSession();
  if (!session) redirect((await signInPathForAction()) as never);
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
  if (!session) redirect((await signInPathForAction()) as never);
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
  // A PERMANENT exclusion lands on the permanent panel, the one every later sign-in shows - asked through
  // selfExclusionStandingOf, the one definition of permanent, never by comparing the period name.
  const untilIso = res?.data?.until ?? null;
  const standing = untilIso ? selfExclusionStandingOf(untilIso) : null;
  if (standing?.state === "serving" && standing.permanent) redirect("/auth/login?excluded=permanent");
  // ⭐ THE INSTANT, NOT THE DAY (R4-I, 2026-10-09, tiles 113–130). This sent `untilIso.slice(0, 10)` — the UTC calendar
  // day — so a 24-hour exclusion taken at 05:05 EAT read "until 2026-10-10" with no time, as if it ended at midnight (and an
  // end between 00:00 and 03:00 EAT named the day before). `breakEndParam` carries the instant; the page says it on the
  // East Africa clock in the reader's words (`formatBreakEnd`).
  const endParam = breakEndParam(untilIso);
  const until = endParam ? `&until=${encodeURIComponent(endParam)}` : "";
  redirect(`/auth/login?excluded=serving${until}`);
}

export async function coolOffAction(formData: FormData) {
  const session = await currentSession();
  if (!session) redirect((await signInPathForAction()) as never);
  const period = String(formData.get("period") ?? "");
  if (!(period in COOLING_OFF_PERIODS_SEC)) {
    redirect(`/profile/responsible-gambling?reason=rg_period_invalid`);
  }
  const res = await coolOff(session.userId, period as keyof typeof COOLING_OFF_PERIODS_SEC);
  await destroySession();
  // ⭐ THE BREAK'S END TRAVELS WITH IT (R4-I, 2026-10-09, tiles 003–011), as the exclusion's does above: the landing panel
  // said only "when the break ends". `coolOff` returns the end it wrote (the furthest of the old and the new one); the page
  // prints it, and decides nothing on it.
  const endParam = breakEndParam(res?.data?.until ?? null);
  redirect(`/auth/login?cooled=1${endParam ? `&until=${encodeURIComponent(endParam)}` : ""}`);
}
