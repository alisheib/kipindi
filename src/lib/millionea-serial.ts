/** A ticket serial as minted, or null. Shared by the ticket page and its pre-render ownership gate. */
export function normalizeMillioneaSerial(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const serial = raw.trim().toUpperCase();
  return /^ML[ND]-\d{4}-W\d{2}-\d{6,9}$/.test(serial) ? serial : null;
}
