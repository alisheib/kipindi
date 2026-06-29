/**
 * Message bubble components — AI (left), user (right gilt-edge), typing.
 */

import { FiftyMark } from "@/components/brand";
import { useT } from "@/lib/i18n";

export function AiMessage({
  children,
  withAvatar = true,
}: {
  children: React.ReactNode;
  withAvatar?: boolean;
}) {
  return (
    <div className="cm-row cm-row-ai">
      {withAvatar && <FiftyMark size={22} />}
      <div className="cm-bubble-ai">{children}</div>
    </div>
  );
}

export function UserMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="cm-row cm-row-user">
      <div className="cm-bubble-user">{children}</div>
    </div>
  );
}

export function TypingMessage() {
  const { t } = useT();
  return (
    <div className="cm-row cm-row-ai" aria-live="polite" aria-label={t.chat.typing}>
      <FiftyMark size={22} />
      <div className="cm-bubble-ai" style={{ padding: 0 }}>
        <div className="cm-typing">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
