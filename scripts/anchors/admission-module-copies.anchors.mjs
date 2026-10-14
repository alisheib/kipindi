/** Bounded actual-esbuild source-copy defects planted in memory, without editing source or running any money call. */
const file = "src/lib/server/admission.ts";
const mutation = (name, from, to, expect) => ({ name, file, from, to, expect });
export const MUTATIONS = [
  mutation("copy-resets-configuration", "globalThis.__50PICK_ADMISSION_RUNTIME ??=", "globalThis.__50PICK_ADMISSION_RUNTIME =", "config.copy-keeps-limits"),
  mutation("module-local-limits-read", "export function getAdmissionLimits(): AdmissionLimits {\n  return runtime.limits;\n}", "export function getAdmissionLimits(): AdmissionLimits {\n  return clampLimits({});\n}", "config.copy-keeps-limits"),
  mutation("admission-ignores-shared-limits", "const { maxInFlight, maxQueue, maxWaitMs: configuredWaitMs } = runtime.limits;", "const { maxInFlight, maxQueue, maxWaitMs: configuredWaitMs } = clampLimits({});", "queue.one-capacity"),
  mutation("module-local-async-context", "const reentrancy = runtime.reentrancy;", "const reentrancy = new AsyncLocalStorage<true>();", "context.nested"),
  mutation("escape-does-not-exit", "return reentrancy.exit(fn);", "return fn();", "context.genuine-escape"),
  mutation("copy-local-semaphore", "const st: AdmissionState = globalThis.__50PICK_ADMISSION ??", "const st: AdmissionState = undefined ??", "queue.shared-state"),
  mutation("throw-leaks-slot", "    releaseSlot();", "    /* leaked fixture slot */", "release.throw"),
];
