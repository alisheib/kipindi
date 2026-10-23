/** Compare the open checklist with actual standing. Pools' "Needed now" counts open weeks, not this draft. */
export function checkOpenChecklist(standing, problems) {
  const amount = (text) => {
    const match = /^TZS ([\d,]+)$/.exec(text ?? "");
    if (!match) return null;
    const value = Number(match[1].replaceAll(",", ""));
    return Number.isSafeInteger(value) && value >= 0 ? value : null;
  };
  const current = amount(standing.guarantee);
  const required = amount(standing.requirement);
  if (!['None', 'Board letter', 'Owner ruling'].includes(standing.licence) || current === null || required === null)
    return { ok: false, reason: "the standing or required guarantee could not be read" };

  const expected = ["attestation"];
  // The licence tile reads None only while the gate truly holds — a recorded None, a record that does not validate, or
  // no record and no valid licence number (with nothing recorded, the Owner's ruling of 2026-10-23 is the basis).
  if (standing.licence === "None") expected.push("licence");
  // This drive starts either with no capital or with already sufficient capital. Opening a new week
  // adds its own positive floor; pools' existing-open-week figure is only a lower bound here.
  if (current === 0 || current < required) expected.push("guarantee");
  const actual = problems.map((item) => {
    if (/^A second reader has not attested that English, Swahili and Chinese agree/.test(item)) return "attestation";
    // Each of the open's three licence refusals names "licence basis", and no other line of the checklist does
    // (`maswali-licence.ts`; `test:maswali-licence-gate` §1.11–§1.12 feed this the real sentences).
    if (/licence basis/.test(item)) return "licence";
    const guarantee = /^The guarantee holds (TZS [\d,]+); (TZS [\d,]+) is needed to open/.exec(item);
    if (guarantee && amount(guarantee[1]) === current && amount(guarantee[2]) > current && amount(guarantee[2]) >= required) return "guarantee";
    return "unrecognized";
  });
  const ok = actual.length === expected.length &&
    actual.slice().sort().join("|") === expected.slice().sort().join("|");
  return { ok, reason: `expected ${expected.join(", ")}; read ${actual.join(", ")}` };
}
