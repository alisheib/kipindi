/**
 * Support contact details — single source of truth.
 *
 * Defaults below; admin can override at /admin/config (Support section).
 * Every page that shows support info imports from here, so changes
 * propagate everywhere instantly: help page, chatbot, login/register
 * footers, legal pages, KYC, account, forgot-password, reality-check.
 */

export type SupportConfig = {
  email: string;
  phone: string;
  phoneTel: string;
  helpline: string;
  helplineTel: string;
};

const DEFAULTS: SupportConfig = {
  // Must match the email service's ReplyTo (support@50pick.tz) so a user who
  // replies to a 50pick email and a user who taps "contact support" in the app
  // reach the SAME inbox, on the one licensed domain.
  email: "support@50pick.tz",
  phone: "+255 22 211 5811",
  phoneTel: "+255222115811",
  helpline: "0800 11 0011",
  helplineTel: "0800110011",
};

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_SUPPORT_CONFIG: SupportConfig | undefined;
}

const cfg: SupportConfig =
  globalThis.__50PICK_SUPPORT_CONFIG ?? (globalThis.__50PICK_SUPPORT_CONFIG = { ...DEFAULTS });

export function getSupportConfig(): SupportConfig {
  return { ...cfg };
}

export function setSupportConfig(patch: Partial<SupportConfig>): SupportConfig {
  if (patch.email !== undefined) cfg.email = patch.email.trim();
  if (patch.phone !== undefined) cfg.phone = patch.phone.trim();
  if (patch.phoneTel !== undefined) cfg.phoneTel = patch.phoneTel.replace(/\s/g, "");
  if (patch.helpline !== undefined) cfg.helpline = patch.helpline.trim();
  if (patch.helplineTel !== undefined) cfg.helplineTel = patch.helplineTel.replace(/\s/g, "");
  return { ...cfg };
}

// Convenience getters — use these in pages/components.
// They read from the live runtime config so admin changes take effect immediately.
export function SUPPORT_EMAIL() { return cfg.email; }
export function SUPPORT_PHONE() { return cfg.phone; }
export function SUPPORT_PHONE_TEL() { return cfg.phoneTel; }
export function HELPLINE() { return cfg.helpline; }
export function HELPLINE_TEL() { return cfg.helplineTel; }
