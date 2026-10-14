/** Classify the real built action, never a request's route: the bell's read uses the same POST route as a bet. */
export function readOnlyAction(manifest, id) {
  const action = manifest?.node?.[id];
  if (!action || typeof action !== "object" || Array.isArray(action)) return false;
  const workers = action.workers;
  if (!workers || typeof workers !== "object" || Array.isArray(workers)) return false;
  const entries = Object.values(workers);
  if (entries.length === 0) return false;
  const identity = entry => entry?.exportedName === "fetchMyNotifications"
    && entry?.filename === "src/app/_actions/notifications.ts";
  const hasIdentity = entry => Object.hasOwn(entry, "filename") || Object.hasOwn(entry, "exportedName");
  // Next 16.4 records the source identity on the action, with moduleId/async-only worker rows.
  // An incomplete or conflicting action identity must never fall back to a plausible worker name.
  if (hasIdentity(action)) {
    if (!identity(action)) return false;
    return entries.every(worker => {
      if (!worker || typeof worker !== "object" || Array.isArray(worker)) return false;
      const moduleId = worker.moduleId;
      const validModule = typeof moduleId === "string" ? moduleId.trim().length > 0
        : typeof moduleId === "number" && Number.isSafeInteger(moduleId) && moduleId >= 0;
      return Object.hasOwn(worker, "moduleId") && Object.hasOwn(worker, "async")
        && validModule && typeof worker.async === "boolean"
        && (!hasIdentity(worker) || identity(worker));
    });
  }
  // Retain the older manifest's exact identity on every worker. Bare module IDs are unclassified here.
  return entries.every(identity);
}
