/** A desk pair needs two people. Compare the same typed identity facts the KYC same-person check uses. */
import { samePersonNameKey } from "@/lib/kyc-auto-checks";
import { houseSeamStore, type HouseHolderFacts, type HouseTx } from "../house-bot-dal";

const emailKey = (v: string | null): string => (v ?? "").trim().toLowerCase();
const dayKey = (v: string | null): string => (v ?? "").slice(0, 10);
const identityComplete = (f: HouseHolderFacts): boolean => !!samePersonNameKey(f.fullName)
  && !String(f.fullName).startsWith("Erased ") && /^\d{4}-\d{2}-\d{2}$/.test(dayKey(f.dob));
const sameDocument = (a: HouseHolderFacts, b: HouseHolderFacts): boolean => a.documentVerified && b.documentVerified
  && ((!!a.idFingerprint && !!b.idFingerprint && a.idFingerprint === b.idFingerprint)
    || (!!a.idType && !!b.idType && !!a.idNumber && !!b.idNumber && a.idType === b.idType && a.idNumber === b.idNumber));
const sameEmail = (a: HouseHolderFacts, b: HouseHolderFacts): boolean => a.emailVerified && b.emailVerified
  && !!emailKey(a.email) && emailKey(a.email) === emailKey(b.email);

/** Unknown or incomplete holder identity is treated as a conflict. */
export function sameHouseHolderFacts(a: HouseHolderFacts | null, b: HouseHolderFacts | null): boolean {
  if (!a || !b || a.userId === b.userId) return true;
  if (sameDocument(a, b) || sameEmail(a, b)) return true;
  const aName = samePersonNameKey(a.fullName);
  const bName = samePersonNameKey(b.fullName);
  const aDob = dayKey(a.dob);
  const bDob = dayKey(b.dob);
  // The KYC same-person rule requires BOTH a nonempty normalised name and the calendar DOB.
  if (!identityComplete(a) || !identityComplete(b)) return true;
  return aName === bName && aDob === bDob;
}

/** A correction or restart cannot erase evidence that two accounts previously presented the same identity. */
export function sameHouseHolderFactSets(aRows: readonly HouseHolderFacts[], bRows: readonly HouseHolderFacts[]): boolean {
  if (aRows.length === 0 || bRows.length === 0) return true;
  for (const a of aRows) for (const b of bRows) {
    if (a.userId === b.userId || sameDocument(a, b) || sameEmail(a, b)) return true;
  }
  const aIdentities = aRows.filter(identityComplete);
  const bIdentities = bRows.filter(identityComplete);
  if (aIdentities.length === 0 || bIdentities.length === 0) return true;
  return aIdentities.some((a) => bIdentities.some((b) => sameHouseHolderFacts(a, b)));
}

export async function sameHouseHolder(userIdA: string, userIdB: string, tx?: HouseTx): Promise<boolean> {
  if (userIdA === userIdB) return true;
  const facts = await houseSeamStore.holderFacts({ userIds: [userIdA, userIdB] }, tx);
  return sameHouseHolderFactSets(facts.filter((f) => f.userId === userIdA), facts.filter((f) => f.userId === userIdB));
}
