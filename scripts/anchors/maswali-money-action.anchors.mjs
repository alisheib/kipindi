/** The one disk plant of red:maswali-money-action, consumed by the runner and test:red-anchors. */
export const MUTATIONS = [{
  name: "the action drops the signed play clock before the shared bet gate",
  file: "src/lib/server/maswali-player-acts.ts",
  from: "playStartedAt: opts.playStartedAt, stateNow: deps.stateNow",
  to: "playStartedAt: undefined, stateNow: deps.stateNow",
  expect: "the signed play clock enforces the session limit on the action",
}];
