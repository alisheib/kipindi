"use server";

/**
 * /millionea/tickets/[serial] — THE PLAYER'S OBJECTION TO ONE QUESTION (MASWALI-BUILD S7-OB; MASWALI-PLAN §3 MR-16, MB-23).
 *
 * The session check and ONE call into the door (`maswali-objections.ts`, the path `test:maswali-objections` drives on both
 * stores): a live ticket in the week, the week's own window, one objection per question — all the server's, under the
 * chain lock. The answer carries the refusal's code only; the dialog says it in the player's language. A signed-out
 * player is sent to sign in and back, as every player act is.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";
import { signInPathForAction } from "@/lib/server/sign-in-path";
import { fileMillioneaObjectionFromForm } from "@/lib/server/maswali-objections";

export async function fileMillioneaObjectionAction(formData: FormData) {
  const session = await currentSession();
  if (!session) redirect((await signInPathForAction()) as never);
  const r = await fileMillioneaObjectionFromForm(session.userId, formData);
  // The ticket's door lists the new objection, and the hub's week waits on it.
  if (r.ok) {
    revalidatePath("/millionea/tickets", "layout");
    revalidatePath("/millionea");
  }
  return r;
}
