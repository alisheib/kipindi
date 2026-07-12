/**
 * Admin status-label lexicon — the ONE source of truth for the bilingual
 * (English · Kiswahili) status vocabulary rendered across the operator console.
 *
 * WHY THIS EXISTS
 * ---------------
 * The admin console renders its status labels as inline bilingual literals
 * ("English · Kiswahili" in a single span, or as an `AdminCard title=/sw=` pair)
 * rather than through the trilingual player dict (`i18n-dict.ts`). Because those
 * literals were hand-typed at ~12 call sites, the same concept drifted into
 * divergent wordings — e.g. the two-officer note read "Afisa wa pili anahitajika"
 * in the resolver ceremony but a truncated "Afisa wa pili" on the report-pack
 * controls. This module makes each concept a single named constant so the drift
 * cannot recur: change the word once here, every surface follows.
 *
 * SWAHILI PROVENANCE (never fabricated)
 * -------------------------------------
 * Every `sw` string is lifted verbatim from an existing, already-shipped source
 * — the admin surfaces themselves (the most complete variant wins) or the blessed
 * player dict (`i18n-dict.ts`). No new translations are invented here.
 *
 * SHAPE
 * -----
 * Each entry is `{ en, sw? }`. Surfaces that render one language only (uppercase
 * chips, toast titles, server-action error messages) use `.en`; surfaces that show
 * both languages use `bi()` for the "English · Kiswahili" join or the `.en`/`.sw`
 * pair directly (e.g. `AdminCard title={x.en} sw={x.sw}`).
 *
 * Plain constants only — no server-only imports — so it is safe to import from
 * server components, "use client" components, and server actions alike.
 *
 * Families are migrated one per verified push (see docs/status-lexicon-inventory.md).
 * Family 3 (two-officer resolution ceremony) is first.
 */

export type AdminLabel = { en: string; sw?: string };

/** Bilingual inline join: `"English · Kiswahili"` (falls back to English alone
 *  when the label carries no Swahili). Matches the console's existing " · " form. */
export function bi(label: AdminLabel): string {
  return label.sw ? `${label.en} · ${label.sw}` : label.en;
}

/**
 * FAMILY 3 — two-officer resolution ceremony.
 * Spans ADM1 regulator packs (maker-checker), ADM2 resolver queue + ceremony,
 * and the KYC/AML co-sign gates. All share the same "one officer stages, a
 * different officer countersigns" vocabulary.
 */
export const CEREMONY = {
  /** The gate note shown to the officer who staged/prepared and therefore cannot
   *  also seal. Canonical SW = the complete "…anahitajika" form (resolver ceremony);
   *  the report-pack controls previously truncated it to "Afisa wa pili". */
  secondOfficerRequired:  { en: "Second officer required", sw: "Afisa wa pili anahitajika" },
  /** The rule itself, as a section/attestation header. SW from i18n-dict resTwoOfficer. */
  twoOfficerRule:         { en: "Two-officer rule",        sw: "Kanuni ya maofisa wawili" },
  twoOfficerAttestation:  { en: "Two-officer attestation", sw: "Uthibitisho wa maafisa wawili" },
  /** Stage labels. SW from i18n-dict step1/step2. */
  stage1:                 { en: "Stage 1",                 sw: "Hatua ya 1" },
  stage2:                 { en: "Stage 2",                 sw: "Hatua ya 2" },
  /** Queue/KPI state: a staged item waiting for the countersignature. */
  awaitingSecondSignature:{ en: "Awaiting 2nd signature",  sw: "Inasubiri saini" },
  /** Short EN-only state labels (uppercase chips / muted captions). */
  awaitingSecondOfficer:  { en: "Awaiting 2nd officer" },
  awaitingStage1:         { en: "Awaiting Stage 1" },
  awaitingSignature:      { en: "awaiting signature" },
  coSignRequired:         { en: "Co-sign required" },
  /** The 24-hour objection window that opens on seal. SW from resolver page. */
  objectionWindow:        { en: "Objection window",        sw: "Dirisha la pingamizi" },
  /** Officer evidence captured at Stage 1. SW = "Ushahidi" (evidence). */
  recordedEvidence:       { en: "Recorded evidence",       sw: "Ushahidi" },
  evidenceExcerpt:        { en: "Evidence excerpt",        sw: "Ushahidi" },
} satisfies Record<string, AdminLabel>;
