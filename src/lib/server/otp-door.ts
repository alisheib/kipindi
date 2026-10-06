/** The one read of OTP_ENABLED: is one-time-code SIGN-IN open? It closes the door, not only the page: /auth/otp, every code
 *  action and the boot check ask this. Off unless exactly "1". Pure env read, sync. */
export function phoneCodeSignInEnabled(): boolean {
  return process.env.OTP_ENABLED === "1";
}
