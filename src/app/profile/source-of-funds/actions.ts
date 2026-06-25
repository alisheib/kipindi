"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentSession } from "@/lib/server/auth-service";
import { db } from "@/lib/server/store";
import { audit } from "@/lib/server/audit";
import type { StoredSourceOfFunds } from "@/lib/server/store";

export async function submitSourceOfFundsAction(formData: FormData) {
  const session = await currentSession();
  if (!session) redirect("/auth/login");

  const declaredSource = String(formData.get("declaredSource") ?? "") as StoredSourceOfFunds["declaredSource"];
  const declaredOccupation = String(formData.get("declaredOccupation") ?? "").trim().slice(0, 200);
  const declaredEmployer = String(formData.get("declaredEmployer") ?? "").trim().slice(0, 200) || null;
  const declaredAnnualIncomeBand = String(formData.get("declaredAnnualIncomeBand") ?? "") as StoredSourceOfFunds["declaredAnnualIncomeBand"];
  const declaredOther = String(formData.get("declaredOther") ?? "").trim().slice(0, 500) || null;

  const validSources: StoredSourceOfFunds["declaredSource"][] = ["salary", "business", "savings", "investments", "inheritance", "other"];
  const validBands: StoredSourceOfFunds["declaredAnnualIncomeBand"][] = ["under-12m", "12m-50m", "50m-200m", "over-200m"];

  // Carry form values through error redirects so the player doesn't re-enter everything
  const carry = `&src=${encodeURIComponent(declaredSource)}&occ=${encodeURIComponent(declaredOccupation)}&band=${encodeURIComponent(declaredAnnualIncomeBand)}${declaredEmployer ? `&emp=${encodeURIComponent(declaredEmployer)}` : ""}${declaredOther ? `&other=${encodeURIComponent(declaredOther)}` : ""}`;
  const fail = (msg: string) => redirect(`/profile/source-of-funds?error=${encodeURIComponent(msg)}${carry}`);
  if (!validSources.includes(declaredSource)) fail("Pick a source of funds.");
  if (!validBands.includes(declaredAnnualIncomeBand)) fail("Pick an annual income band.");
  if (declaredOccupation.length < 2) fail("Tell us your occupation.");
  if (declaredSource === "other" && (!declaredOther || declaredOther.length < 10)) {
    fail("When source is 'other', describe it (at least 10 characters).");
  }

  const record: StoredSourceOfFunds = {
    userId: session.userId,
    declaredSource,
    declaredOccupation,
    declaredEmployer,
    declaredAnnualIncomeBand,
    declaredOther,
    reviewStatus: "PENDING",
    reviewerId: null,
    reviewedAt: null,
    submittedAt: new Date().toISOString(),
  };
  await db.sourceOfFunds.upsert(record);

  audit({
    category: "COMPLIANCE",
    action: "sof.submitted",
    actorId: session.userId,
    targetType: "User",
    targetId: session.userId,
    payload: { declaredSource, declaredAnnualIncomeBand },
  });

  revalidatePath("/profile/source-of-funds");
  redirect("/profile/source-of-funds?saved=1");
}
