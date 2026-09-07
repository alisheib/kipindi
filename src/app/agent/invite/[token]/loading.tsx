import { AgentGhost } from "../../loading-shared";

/** Header, the "sent to" panel, then the action row. */
export default function AgentInviteLoading() {
  return <AgentGhost tier="reading" panels={1} />;
}
