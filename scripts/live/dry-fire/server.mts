/**
 * THE DRY-FIRE HARNESS'S SERVER MODULES — loaded LATE and ONCE. `store.ts` picks its memory twin or Prisma at import time from
 * `DATABASE_URL`, so nothing here may load before the guard has judged the environment (and, with `--pg`, before the loopback
 * URL is in place). Every other harness module imports server code as TYPES only (erased); the values come through here.
 * They are imported one after another, in the order the suites import them, never in parallel: several of these modules import
 * one another, and a parallel load is a different evaluation order from any the codebase has run.
 *
 * ⛔ This file holds no backslash (an editing tool decodes them).
 */

export type Server = Awaited<ReturnType<typeof importAll>>;

async function importAll() {
  const store = await import("../../../src/lib/server/store.ts");
  const audit = await import("../../../src/lib/server/audit.ts");
  const control = await import("../../../src/lib/server/marketing/campaign-control.ts");
  const live = await import("../../../src/lib/server/marketing/campaign-live.ts");
  const campaignStatus = await import("../../../src/lib/marketing/campaign-status.ts");
  const startCheck = await import("../../../src/lib/server/marketing/start-check.ts");
  const enqueue = await import("../../../src/lib/server/marketing/enqueue.ts");
  const engine = await import("../../../src/lib/server/marketing/engine.ts");
  const rules = await import("../../../src/lib/marketing/engine-rules.ts");
  const audience = await import("../../../src/lib/server/marketing/audience.ts");
  const dispatch = await import("../../../src/lib/server/marketing/dispatch.ts");
  const sms = await import("../../../src/lib/server/sms.ts");
  const consent = await import("../../../src/lib/server/marketing/consent.ts");
  const optout = await import("../../../src/lib/server/marketing/optout-service.ts");
  const wordings = await import("../../../src/lib/server/marketing/wordings.ts");
  const consentBasis = await import("../../../src/lib/marketing/consent-basis.ts");
  const marketingWordings = await import("../../../src/lib/marketing/marketing-wordings.ts");
  const consentWording = await import("../../../src/lib/marketing/consent-wording.ts");
  const settings = await import("../../../src/lib/server/marketing/sms-settings.ts");
  const settingsPure = await import("../../../src/lib/marketing/sms-settings.ts");
  const route = await import("../../../src/app/api/webhooks/blackball/route.ts");
  const campaignModel = await import("../../../src/lib/server/marketing/campaign-model.ts");
  const template = await import("../../../src/lib/marketing/campaign-template.ts");
  const liveSwitch = await import("../../../src/lib/server/marketing/live-switch.ts");
  const moneyBusy = await import("../../../src/lib/server/money-busy.ts");
  const estimate = await import("../../../src/lib/server/marketing/estimate.ts");
  const contactFields = await import("../../../src/lib/contacts/contact-fields.ts");
  const phone = await import("../../../src/lib/tz-msisdn.ts");
  const window = await import("../../../src/lib/marketing/window.ts");
  const campaignsCopy = await import("../../../src/app/admin/campaigns/campaigns-copy.ts");
  const liveCopy = await import("../../../src/app/admin/campaigns/[id]/live-copy.ts");
  return {
    db: store.db, store, audit, control, live, campaignStatus, startCheck, enqueue, engine, rules, audience, dispatch, sms, consent,
    optout, wordings, consentBasis, marketingWordings, consentWording, settings, settingsPure, route, campaignModel, template,
    liveSwitch, moneyBusy, estimate, contactFields, phone, window, campaignsCopy, liveCopy,
  };
}

let cached: Promise<Server> | null = null;

/** The server modules, loaded on first call and shared by every run of this process. */
export function loadServer(): Promise<Server> {
  if (cached === null) cached = importAll();
  return cached;
}
