/** Checks the post-launch sequence without copying private harm counts into Git. */
export const S16_MEASURES = ["homeToSheet", "sheetToBet", "shortToDeposit", "depositToBet", "timeToFirstBet"];
export const S16_HARM_MARKERS = ["rapidDeposit", "chasingLosses"];
export const SEVEN_DAYS_MS = 7 * 86_400_000;

const time = (value) => Date.parse(value ?? "");
const exact = (actual, expected) => Array.isArray(actual) && actual.length === expected.length
  && expected.every((item, i) => actual[i] === item);

export function validateS16Postlaunch(record, now = Date.now()) {
  const errors = [];
  const launchAt = time(record?.s15?.launchAt);
  if (!Number.isFinite(launchAt) || launchAt > now || now - launchAt < SEVEN_DAYS_MS) {
    return ["s16: seven full days since the actual production launch have not elapsed"];
  }
  const edge = launchAt + SEVEN_DAYS_MS;
  const checkedAt = (proof) => time(proof?.checkedAt);
  if (!(checkedAt(record.s15?.ownerGo) <= launchAt)) errors.push("s15.ownerGo: Ali's launch go must precede launchAt");
  if (!(checkedAt(record.s15?.baseline14Days) <= launchAt)) errors.push("s15.baseline14Days: baseline proof must precede launchAt");
  if (!(checkedAt(record.s15?.productionReadback) >= launchAt)) errors.push("s15.productionReadback: launch read-back must follow launchAt");

  const s16 = record.s16 ?? {};
  for (const field of ["sevenDayMeasures", "noRollback", "agencyAcknowledgment", "shelvingProof"]) {
    if (!(checkedAt(s16[field]) >= edge)) errors.push(`s16.${field}: proof must follow seven full days after launch`);
  }
  const measured = s16.sevenDayMeasures ?? {};
  if (measured.verdict !== "in-bounds" || measured.baselineDays !== 14 || measured.afterDays !== 7
    || !exact(measured.measureKeys, S16_MEASURES) || !exact(measured.harmMarkerKeys, S16_HARM_MARKERS)) {
    errors.push("s16.sevenDayMeasures: require an in-bounds seven-day verdict over the five measures and both harm markers against the 14-day baseline");
  }
  if (s16.noRollback?.events !== 0) errors.push("s16.noRollback: require zero rollback events through the seven-day observation");
  if (s16.agencyAcknowledgment?.acknowledged !== true) errors.push("s16.agencyAcknowledgment: written agency acknowledgment is pending");
  if (s16.shelvingProof?.testShelved !== "passed" || s16.shelvingProof?.redShelved !== "passed") {
    errors.push("s16.shelvingProof: source, compile and red checks must be recorded as passed");
  }
  return errors;
}
