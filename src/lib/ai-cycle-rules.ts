/**
 * CYCLE SETTINGS — the bounds and the parser, in ONE isomorphic place.
 *
 * Imported by the client form (convenience), the server action (the authority) and
 * `test:ai-cycles` (the proof). ⛔ Same shape as `src/lib/payout.ts`: one definition of the
 * arithmetic, used on both sides, so a client that validates differently from the server is
 * impossible rather than merely unlikely.
 *
 * ⛔ EVERY MESSAGE SAYS WHY THE BOUND EXISTS. "Invalid" tells an operator nothing and invites
 * them to retry the same value. These are settings Ali prices from; a refusal has to teach.
 *
 * ── THE PARSING RULE, AND WHY IT IS `Number()` AND NOT `parseFloat` ──────────────────────
 * `parseFloat("0.1.2")` is `0.1` — it silently accepts a typo as a number. `Number("0.1.2")`
 * is `NaN`. `parseFloat("12abc")` is `12`; `Number("12abc")` is `NaN`. The existing
 * `setCreditLimitAction` already parses with `Number()` + `Number.isFinite()`, and this
 * copies that rather than inventing a second style.
 *
 * ⚠️ `Number("")` is `0`, not `NaN` — so an EMPTY field must be rejected BEFORE the number
 * is parsed, or a blank box silently becomes zero. A zero cycle size means infinitely many
 * cycles and a divide-by-zero on every figure downstream.
 */

export const CYCLE_BOUNDS = {
  sizeUsd: { min: 0.001, max: 1000, decimals: 6 },
  targetMarginPct: { min: 0, max: 500 },
  fxTzsPerUsd: { min: 500, max: 10_000 },
  minDaysForProjection: { min: 1, max: 365 },
  fxStaleDays: 30,
} as const;

export type CycleConfigValues = {
  sizeUsd: number;
  autoRoll: boolean;
  targetMarginPct: number;
  fxTzsPerUsd: number;
  fxAsOfIso: string;
  minDaysForProjection: number;
};

export type CycleFormInput = {
  sizeUsd: string;
  autoRoll: string | null;
  targetMarginPct: string;
  fxTzsPerUsd: string;
  fxAsOfIso: string;
  minDaysForProjection: string;
};

export type ParseResult =
  | { ok: true; value: CycleConfigValues; warnings: string[] }
  | { ok: false; field: keyof CycleFormInput; error: string };

/** Decimal places in a plain decimal string. Exponent forms carry none of their own. */
function decimalPlaces(raw: string): number {
  if (/e/i.test(raw)) return 0;
  const dot = raw.indexOf(".");
  return dot === -1 ? 0 : raw.length - dot - 1;
}

function num(
  raw: string,
  field: keyof CycleFormInput,
  label: string,
  emptyMsg: string,
): { ok: true; value: number; trimmed: string } | { ok: false; field: keyof CycleFormInput; error: string } {
  // ⛔ TRIM FIRST. " 20 " is a paste, not a mistake, and must work. "" and "   " must not.
  const t = raw.trim();
  if (t === "") return { ok: false, field, error: emptyMsg };
  const v = Number(t);
  if (!Number.isFinite(v)) {
    // Covers NaN ("0.1.2", "abc", "1,000") and ±Infinity ("1e999").
    return {
      ok: false, field,
      error: `${label} must be a plain number — “${t.slice(0, 24)}” is not one. Use digits and at most one dot, with no commas or symbols.`,
    };
  }
  return { ok: true, value: v, trimmed: t };
}

/**
 * Parse and validate the whole settings form.
 *
 * `nowMs` is injected rather than read from the clock so the date rules are testable and so
 * the server, not the browser, decides what "the future" is.
 */
export function parseCycleForm(input: CycleFormInput, nowMs: number): ParseResult {
  const warnings: string[] = [];

  // ── sizeUsd ────────────────────────────────────────────────────────────────────────
  const B = CYCLE_BOUNDS;
  const size = num(input.sizeUsd, "sizeUsd", "Cycle size",
    "Enter a cycle size in USD — this is the denomination everything else is counted in, so it cannot be blank.");
  if (!size.ok) return size;
  // ⚠️ `-0 > 0` is false, so this catches "-0" as well as "-5" and "0".
  if (!(size.value > 0)) {
    return { ok: false, field: "sizeUsd", error: "Cycle size must be greater than zero — a size of zero would mean infinitely many cycles and would divide every figure on this page by zero." };
  }
  if (size.value < B.sizeUsd.min) {
    return { ok: false, field: "sizeUsd", error: `Cycle size must be at least $${B.sizeUsd.min} — below that a single API call spans thousands of cycles and the count stops being readable.` };
  }
  if (size.value > B.sizeUsd.max) {
    return { ok: false, field: "sizeUsd", error: `Cycle size must be at most $${B.sizeUsd.max.toLocaleString()} — above that a cycle would take years to close and would never give you a rate.` };
  }
  if (decimalPlaces(size.trimmed) > B.sizeUsd.decimals) {
    return { ok: false, field: "sizeUsd", error: `Cycle size is stored to ${B.sizeUsd.decimals} decimal places — anything finer would be rounded away and the stored size would not match what you typed.` };
  }

  // ── targetMarginPct ────────────────────────────────────────────────────────────────
  const margin = num(input.targetMarginPct, "targetMarginPct", "Target margin",
    "Enter a target margin — 100 means the suggested price is twice the AI cost.");
  if (!margin.ok) return margin;
  if (margin.value < B.targetMarginPct.min || margin.value > B.targetMarginPct.max) {
    return { ok: false, field: "targetMarginPct", error: `Target margin must be between ${B.targetMarginPct.min}% and ${B.targetMarginPct.max}% — a margin above that is a typo, not a strategy.` };
  }

  // ── minDaysForProjection ───────────────────────────────────────────────────────────
  const minDays = num(input.minDaysForProjection, "minDaysForProjection", "Minimum days before projecting",
    "Enter how many days of history are needed before a yearly figure is shown.");
  if (!minDays.ok) return minDays;
  if (!Number.isInteger(minDays.value)) {
    return { ok: false, field: "minDaysForProjection", error: "Minimum days must be a whole number of days." };
  }
  if (minDays.value < B.minDaysForProjection.min || minDays.value > B.minDaysForProjection.max) {
    return { ok: false, field: "minDaysForProjection", error: `Minimum days must be between ${B.minDaysForProjection.min} and ${B.minDaysForProjection.max} — projecting a year from less history than this produces a figure that looks like an answer and is not.` };
  }

  // ── FX rate + its date — both, or neither ──────────────────────────────────────────
  // ⛔ A RATE WITH NO DATE IS NOT A RATE. Every TZS figure renders the rate AND when it was
  // taken, because a converted number nobody can check is a claim, not a measurement.
  const rateRaw = input.fxTzsPerUsd.trim();
  const asOfRaw = input.fxAsOfIso.trim();
  let fxTzsPerUsd = 0;
  let fxAsOfIso = "";
  if (rateRaw === "" && asOfRaw === "") {
    // Cleared. Every shilling figure will render "—" until a rate is entered. Honest.
  } else if (rateRaw === "") {
    return { ok: false, field: "fxTzsPerUsd", error: "You entered a rate date but no rate. Enter the USD→TZS rate, or clear the date as well." };
  } else if (asOfRaw === "") {
    return { ok: false, field: "fxAsOfIso", error: "Enter the date this rate was taken. A converted shilling figure with no date is a claim nobody can check, and a stale rate is a pricing error." };
  } else {
    const rate = num(rateRaw, "fxTzsPerUsd", "Exchange rate", "Enter the USD→TZS rate.");
    if (!rate.ok) return rate;
    if (!(rate.value > 0)) {
      return { ok: false, field: "fxTzsPerUsd", error: "The exchange rate must be greater than zero." };
    }
    if (rate.value < B.fxTzsPerUsd.min || rate.value > B.fxTzsPerUsd.max) {
      return { ok: false, field: "fxTzsPerUsd", error: `The rate must be between ${B.fxTzsPerUsd.min.toLocaleString()} and ${B.fxTzsPerUsd.max.toLocaleString()} TZS per USD — anything outside that band is a misplaced decimal point, which would mis-state every price on this page by a factor of ten.` };
    }
    const asOfMs = Date.parse(asOfRaw);
    if (!Number.isFinite(asOfMs)) {
      return { ok: false, field: "fxAsOfIso", error: "The rate date is not a date the platform can read. Use YYYY-MM-DD." };
    }
    if (asOfMs > nowMs) {
      return { ok: false, field: "fxAsOfIso", error: "The rate date is in the future. A rate cannot have been taken at a time that has not happened." };
    }
    const ageDays = (nowMs - asOfMs) / 86_400_000;
    if (ageDays > B.fxStaleDays) {
      warnings.push(`That rate is ${Math.round(ageDays)} days old. Shilling figures will be shown with the date beside them so the staleness is visible, but consider refreshing it.`);
    }
    fxTzsPerUsd = rate.value;
    fxAsOfIso = new Date(asOfMs).toISOString();
  }

  // ── autoRoll — STRICT, never truthiness ────────────────────────────────────────────
  // ⛔ An unchecked checkbox posts NOTHING, so `null` is the honest "off". Accepting any
  // non-empty string as `true` would turn a stray "0" or "false" into "on" — which here
  // means silently removing the pause Ali asked for.
  const rollRaw = (input.autoRoll ?? "").trim().toLowerCase();
  let autoRoll: boolean;
  if (rollRaw === "" || rollRaw === "false" || rollRaw === "off" || rollRaw === "0") autoRoll = false;
  else if (rollRaw === "true" || rollRaw === "on" || rollRaw === "1") autoRoll = true;
  else return { ok: false, field: "autoRoll", error: "The continuous-running switch was submitted as an unrecognised value. Reload the page and try again." };

  if (autoRoll) {
    warnings.push("Continuous running is ON: a completed cycle will open the next one automatically and the AI will never pause. Turn it off if you want each cycle to stop and wait for you.");
  }

  return {
    ok: true,
    warnings,
    value: { sizeUsd: size.value, autoRoll, targetMarginPct: margin.value, fxTzsPerUsd, fxAsOfIso, minDaysForProjection: minDays.value },
  };
}
