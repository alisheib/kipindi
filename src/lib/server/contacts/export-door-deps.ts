/**
 * vb7 (review m8) · THE EXPORT DOOR'S PRODUCTION DEPENDENCIES — the session cookie, the viewer on the STORED role, the
 * REAL second factor (`checkAdminTotp`) and the export — in ONE frozen object, which the route hands `contactsExportDoor`.
 *
 * ⭐ A MODULE OF ITS OWN so `test:contacts-export` imports exactly what the route runs, and drives it (V9): an officer who
 * never set up 2-step sign-in is sent to the setup page by THIS object's own second factor — never handed the file. The
 * route keeps nothing but the call (V6), so a factor that always says "ok" cannot be slipped in beside it.
 * ⛔ FROZEN: no caller can swap a dependency under the route at runtime.
 */
import { currentSession } from "@/lib/server/auth-service";
import { checkAdminTotp } from "@/lib/server/admin-guard";
import { contactsExportViewer, exportContactsCsv } from "./export";
import type { ContactsExportDoorDeps } from "./export";

export const CONTACTS_EXPORT_DOOR_DEPS: Readonly<ContactsExportDoorDeps> = Object.freeze({
  session: currentSession,
  viewer: contactsExportViewer,
  secondFactor: checkAdminTotp,
  run: exportContactsCsv,
  now: () => Date.now(),
});
