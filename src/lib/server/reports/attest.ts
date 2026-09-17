/**
 * THE ATTESTATION PIECES EVERY REGULATOR REPORT SHARES — signatures, reference numbers and the masked player id
 * (C5-SPEC rulings 186 (4), 201).
 *
 * Moved out of `catalogue.ts` unchanged, into a LEAF: this module imports no builder and no catalogue, so any report
 * module can import it without a `catalogue.ts` ↔ builder cycle (tsx compiles these files to CommonJS, where such a
 * cycle holds only while every shared symbol stays a hoisted function declaration). `test:house-bot-reports` §0 pins it.
 */
import { db } from "../store";

/** Standard regulator attestation block — three roles at the foot of every
 *  hand-off-grade report. Only "Prepared by" is filled (the real generator, who
 *  is known at build time). "Reviewed by" / "Approved by" are left BLANK
 *  signature lines — never-fabricate: we must not pre-print a Compliance/AML
 *  signer name that no identified person actually attested. The reviewer/approver
 *  countersigns (or e-signs) the issued copy; the blank line + "Signature & date"
 *  is what both renderers draw. Kept here so every report renders the same three
 *  columns in the same order. */
export async function regulatorSignatures(generatorId: string) {
  const u = await db.user.findById(generatorId);
  const generator = u?.displayName?.trim() || `Generator · ${generatorId}`;
  return [
    { role: "Prepared by",   name: generator, id: generatorId },
    { role: "Reviewed by",   name: "" }, // countersigned on the issued copy — never pre-filled
    { role: "Approved by",   name: "" },
  ];
}

/** A report's reference: acronym, today's UTC date and the generator's id tail. */
export function makeReference(acronym: string, generatorId: string): string {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const tail = generatorId.replace(/^usr_/, "").slice(-6).toUpperCase();
  return `${acronym}-${today}-${tail}`;
}

/** The masked player id every regulator report prints, so rows cross-reference between reports without a phone or name. */
export function maskUserId(id: string): string {
  return `${id.replace(/^usr_/, "").slice(0, 4)}…${id.slice(-4)}`;
}
