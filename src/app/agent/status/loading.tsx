import { AgentGhost } from "../loading-shared";

/** Back link, header, the status panel, then the what-happens-next panel. */
export default function AgentStatusLoading() {
  return <AgentGhost tier="reading" panels={2} />;
}
