/**
 * TEMPORARY diagnostic page — tests whether the shell/layout can render
 * an auth-gated page at all. If this page shows "SHELL OK" on Railway,
 * the issue is in the real deposit page. If this ALSO crashes, the issue
 * is in the AppShell or root layout for authenticated users.
 *
 * DELETE THIS FILE once the root cause is found.
 */
import { redirect } from "next/navigation";
import { currentSession } from "@/lib/server/auth-service";

export const metadata = { title: "Deposit Test" };

export default async function DepositTestPage() {
  let sessionOk = false;
  let sessionError = "";
  let userId = "";

  try {
    const session = await currentSession();
    if (!session) redirect("/auth/login?next=/wallet/deposit-test");
    sessionOk = true;
    userId = session.userId.slice(0, 10) + "…";
  } catch (err) {
    // redirect() throws a special error — let it propagate
    const msg = (err as Error)?.message ?? "";
    if (msg.includes("NEXT_REDIRECT")) throw err;
    sessionError = msg.slice(0, 200);
  }

  return (
    <main style={{ padding: 40, fontFamily: "monospace", color: "#fff", background: "#0a0e33", minHeight: "100vh" }}>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>Deposit Test Page</h1>
      <p>If you can read this, the shell + layout + auth rendered successfully.</p>
      <hr style={{ margin: "16px 0", borderColor: "#333" }} />
      <p>Session: {sessionOk ? `OK (${userId})` : `FAILED: ${sessionError}`}</p>
      <p>Timestamp: {new Date().toISOString()}</p>
      <p>NODE_ENV: {process.env.NODE_ENV}</p>
      <p style={{ marginTop: 16, color: "#888" }}>
        This means the error is in the REAL deposit page code, not the shell.
        Check /api/diagnostic/last-error for the actual error.
      </p>
    </main>
  );
}
