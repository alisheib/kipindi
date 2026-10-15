/**
 * Decide whether an S15 source tree may build or boot. Keep this pure so the
 * source-only red control can prove the decision without starting Next.
 */
export function s15LaunchBuildDecision(source, env = process.env) {
  const match = /^const SIMPLE_JOURNEY_SHIPPED: RolloutState = "(WITHDRAWN|STAFF_PREVIEW|ACTIVE)";$/m.exec(source);
  if (!match) return { kind: "refuse", reason: "cannot read the shipped journey ceiling" };

  const active = match[1] === "ACTIVE" || env.FEATURE_SIMPLEJOURNEY === "ACTIVE";
  if (!active) return { kind: "preview" };

  if (env.S15_PRELAUNCH_LOCAL !== "1") return { kind: "release" };
  // A review build is permitted only on a local/in-memory checkout or a PR
  // runner. Any Railway context, database connection, or main/push runner must
  // use the real publication gate. A misplaced bypass must fail, not degrade to
  // a successful build.
  const railway = Object.keys(env).some((key) => key.startsWith("RAILWAY_"));
  const database = ["DATABASE_URL", "DIRECT_URL", "PROD_DATABASE_PUBLIC_URL", "VERIFY_DATABASE_URL"]
    .some((key) => Boolean(env[key]));
  const mainPush = env.GITHUB_REF === "refs/heads/main" || env.GITHUB_EVENT_NAME === "push";
  const otherCi = Boolean(env.CI) && env.GITHUB_EVENT_NAME !== "pull_request";
  if (railway || database || mainPush || otherCi) {
    return { kind: "refuse", reason: "S15_PRELAUNCH_LOCAL is restricted to an in-memory local or pull-request review" };
  }
  return { kind: "candidate" };
}
