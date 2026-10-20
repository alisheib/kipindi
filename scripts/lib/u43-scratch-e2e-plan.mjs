import { resolve } from "node:path";

const normalized = (path) => resolve(path).replaceAll("\\", "/").toLowerCase();

/** This runner is only for this checkout's owned loopback scratch cluster. */
export function validateScratchEndpoint(raw, root, dataDirectory = null, production = false) {
  if (production || !raw) throw new Error("Disposable U43 scratch cluster required");
  let url;
  try { url = new URL(raw); } catch { throw new Error("Invalid U43 scratch endpoint"); }
  if (!["postgres:", "postgresql:"].includes(url.protocol) ||
      url.hostname !== "127.0.0.1" || url.port !== "5491" || url.pathname !== "/postgres" ||
      url.search || url.hash) {
    throw new Error("Refusing a database outside reserved U43 loopback scratch");
  }
  if (dataDirectory != null && normalized(dataDirectory) !== normalized(resolve(root, ".pgscratch"))) {
    throw new Error("Refusing another checkout's scratch data directory");
  }
  return url;
}

export function makeDatabaseNames(tag) {
  if (!/^[a-z0-9_]{6,32}$/.test(tag)) throw new Error("Unsafe U43 scratch run tag");
  const names = {
    money: `u43_e2e_money_${tag}`,
    fault: `u43_e2e_fault_${tag}`,
    card: `u43_e2e_card_${tag}`,
  };
  const values = Object.values(names);
  if (new Set(values).size !== 3 || values.some((name) =>
    !/^u43_e2e_(money|fault|card)_[a-z0-9_]+$/.test(name) || name.length > 63)) {
    throw new Error("U43 scratch database names must be distinct and owned");
  }
  return names;
}

export function databaseUrl(adminUrl, name) {
  if (!/^u43_e2e_(money|fault|card)_[a-z0-9_]+$/.test(name) || name.length > 63) {
    throw new Error("Refusing an unowned U43 scratch database name");
  }
  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  return url.toString();
}

export function suitePlan(names) {
  if (new Set(Object.values(names)).size !== 3) throw new Error("Each money E2E needs an isolated database");
  return [
    { label: "e2e-money", file: "scripts/money-e2e.test.mts", database: names.money },
    { label: "e2e-fault", file: "scripts/fault-injection-bet.test.mts", database: names.fault },
    { label: "e2e-card", file: "scripts/card-flow-e2e.test.mts", database: names.card },
  ];
}

/** Set before launching Node: these E2E files import their DAL at module load. */
export function childEnvironment(parent, targetUrl) {
  const env = {
    ...parent,
    DATABASE_URL: targetUrl,
    USE_PRISMA_DAL: "true",
    NODE_ENV: "test",
    PAYMENT_AGGREGATOR: "mock",
    PAYMENT_API_URL: "",
    PAYMENT_API_KEY: "",
    PAYMENT_API_SECRET: "",
    PAYMENT_VENDOR_ID: "",
    PAYMENTS_DEMO_ASYNC: "false",
    SMS_PROVIDER: "console",
    POSTMARK_API_KEY: "",
    EMAIL_OUTBOX_CAPTURE: "1",
    MARKET_SCHEDULER: "false",
    UPDOWN_SCHEDULER: "false",
    UPDOWN_HEALER: "false",
  };
  delete env.VERIFY_DATABASE_URL;
  return env;
}
