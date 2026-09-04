import { defineRailway, github, postgres, preserve, project, redis, service, volume } from "railway/iac";

export default defineRailway(() => {
  const Postgres = postgres("Postgres", { region: "us-west2" });
  const Redis = redis("Redis", { region: "us-west2" });
  Redis.deploy = { startCommand: "/bin/sh -c \"rm -rf $RAILWAY_VOLUME_MOUNT_PATH/lost+found/ && exec docker-entrypoint.sh redis-server --requirepass $REDIS_PASSWORD --save 60 1 --dir $RAILWAY_VOLUME_MOUNT_PATH\"" };
  const redisVolume5JMf = volume("redis-volume-5JMf", { alerts: { usage: { "100": {}, "80": {}, "95": {} } }, allowOnlineResize: true, region: "us-west2", sizeMB: 5000 });
  const postgresVolume = volume("postgres-volume", { alerts: { usage: { "100": {}, "80": {}, "95": {} } }, allowOnlineResize: true, region: "us-west2", sizeMB: 5000 });
  const _50pick = service("50pick", {
    source: github("alisheib/kipindi", { checkSuites: false }),
    // LAUNCH-1K C · the zero-downtime deploy chain, as code (railway.json is
    // deprecated platform-wide and was silently ignored — proven by a deploy
    // whose manifest carried fileServiceManifest:{} — so THIS file is the one
    // home for deploy config now).
    //   healthcheckPath   → /api/health, the endpoint that can FAIL (503 when
    //                       Postgres is unreachable/unmigrated; proven RED+GREEN
    //                       by test:health-readiness and live on production)
    //   overlapSeconds 60 → the old container keeps serving until the new one
    //                       is healthy; a broken release can no longer replace
    //                       a working one, a working one arrives without downtime
    //   drainingSeconds 30→ in-flight requests (a bet mid-placement) complete
    //                       instead of dying at the socket
    deploy: { healthcheckPath: "/api/health", healthcheckTimeout: 300, overlapSeconds: 60, drainingSeconds: 30 },
    replicas: { "us-west2": 1 },
    domains: ["50pick.tz", "www.50pick.tz"],
    networking: { privateNetworkEndpoint: "kipindi" },
    env: { ADMIN_BOOTSTRAP_PHONES: preserve(), ANTHROPIC_API_KEY: preserve(), AUDIT_CHAIN_SECRET: preserve(), BACKUP_ENCRYPTION_KEY: preserve(), DATABASE_URL: preserve(), DISABLE_ADMIN_TOTP: preserve(), KYC_STORAGE: preserve(), NEXT_PUBLIC_APP_URL: preserve(), NEXT_PUBLIC_LICENSE_REF: preserve(), NEXT_PUBLIC_VAPID_PUBLIC_KEY: preserve(), NODE_ENV: preserve(), OTP_PEPPER: preserve(), PAYMENT_AGGREGATOR: preserve(), PAYMENT_API_KEY: preserve(), PAYMENT_API_SECRET: preserve(), PAYMENT_API_URL: preserve(), PAYMENT_VENDOR_ID: preserve(), PAYMENT_VENDOR_PIN: preserve(), PAYMENT_WEBHOOK_URL: preserve(), PHONE_EMAIL_MAP: preserve(), POSTMARK_API_KEY: preserve(), POSTMARK_WEBHOOK_SECRET: preserve(), R2_ACCESS_KEY_ID: preserve(), R2_BACKUP_BUCKET: preserve(), R2_BUCKET: preserve(), R2_ENDPOINT: preserve(), R2_SECRET_ACCESS_KEY: preserve(), REDIS_ENABLED: preserve(), REDIS_URL: preserve(), SELCOM_WEBHOOK_SECRET: preserve(), SELCOM_WIRE_LOG: preserve(), SENTRY_DSN: preserve(), SENTRY_ENVIRONMENT: preserve(), SESSION_SECRET: preserve(), SMS_PROVIDER: preserve(), SX_REGISTER_SALT: preserve(), TWELVEDATA_API_KEY: preserve(), USE_PRISMA_DAL: preserve(), VAPID_PRIVATE_KEY: preserve(), VAPID_PUBLIC_KEY: preserve(), VAPID_SUBJECT: preserve() },
  });

  return project("50pick", {
    resources: [Postgres, Redis, _50pick, redisVolume5JMf, postgresVolume],
  });
});
