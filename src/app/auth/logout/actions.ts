"use server";

/**
 * B-20 — sign-out as a REACT form action, so `useFormStatus` consumers (the
 * kit SubmitButton) get a real pending face during the round-trip. The POST
 * route handler stays for non-React callers; both run the same `logout()`
 * (session destroyed server-side, registry row cleared) and clear the same
 * two cookies. CSRF posture is unchanged: server actions are POST-only and
 * origin-checked by Next.
 */
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { logout } from "@/lib/server/auth-service";

const COOKIE_NAME = "kp_session";
const TOTP_COOKIE = "kp_admin_totp";

export async function logoutAction() {
  await logout();
  const jar = await cookies();
  jar.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
  // Clear the admin TOTP cookie so the next person logging in on the same
  // browser doesn't inherit 2FA clearance from a prior admin.
  jar.set(TOTP_COOKIE, "", { path: "/", maxAge: 0 });
  redirect("/");
}
