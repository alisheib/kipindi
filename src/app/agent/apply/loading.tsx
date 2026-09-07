import { AgentGhost } from "../loading-shared";

/** The form: back link, the four-step progress bar, one step panel, the persistent counter. */
export default function AgentApplyLoading() {
  return <AgentGhost tier="form" panels={2} heading={false} steps />;
}
