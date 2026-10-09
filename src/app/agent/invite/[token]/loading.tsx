import { AgentGhost } from "../../loading-shared";

/** Header, the "sent to" panel, then the action row — and no back link: the invitation opens on its header (R5-H · G-2b). */
export default function AgentInviteLoading() {
  return <AgentGhost tier="reading" panels={1} back={false} />;
}
