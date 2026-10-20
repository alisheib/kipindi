/** Match the money service's amount/reference gate before opening its confirmation. */
export function validGuaranteeDraft(amount: string, reference: string): boolean {
  const value = Number(amount);
  const ref = reference.trim();
  return /^\d+$/.test(amount) && Number.isSafeInteger(value) && value > 0 && ref.length >= 5 && ref.length <= 120;
}

/** Match the share service's required decision length inside its confirmation. */
export function validShareDecision(text: string): boolean {
  const length = text.trim().length;
  return length >= 5 && length <= 300;
}
