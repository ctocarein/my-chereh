import type { KeyboardEvent, ReactNode } from "react";

type ChatBubbleProps = {
  type: "user" | "bot";
  children?: ReactNode;
  isTyping?: boolean;
  variant?: "default" | "soft" | "accent";
  delayMs?: number;
  interactive?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
  hint?: string;
  timestamp?: string;
};

export default function ChatBubble({
  type,
  children,
  isTyping = false,
  variant = "default",
  delayMs,
  interactive = false,
  onClick,
  ariaLabel,
  hint,
  timestamp,
}: ChatBubbleProps) {
  const variantClass = variant !== "default" ? ` chat__bubble--${variant}` : "";
  const interactiveClass = interactive ? " chat__bubble--interactive" : "";
  const className = `chat__bubble chat__bubble--${type}${variantClass}${
    isTyping ? " chat__bubble--typing" : ""
  }${interactiveClass}`;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!interactive || !onClick) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div className={`chat__bubble-group chat__bubble-group--${type}`}>
      <div
        className={className}
        style={delayMs ? { animationDelay: `${delayMs}ms` } : undefined}
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : undefined}
        onClick={interactive ? onClick : undefined}
        onKeyDown={handleKeyDown}
        aria-label={interactive ? ariaLabel : undefined}
      >
        {isTyping ? (
          <div className="chat__typing" aria-label="CheReh ecrit">
            <span />
            <span />
            <span />
          </div>
        ) : (
          <div className="chat__bubble-text">{children}</div>
        )}
      </div>
      {!isTyping && (hint || timestamp) ? (
        <div className="chat__bubble-meta">
          {hint ? (
            <span className="chat__bubble-hint">
              <span className="chat__bubble-hint-icon" aria-hidden="true">
                <svg viewBox="0 0 20 20" focusable="false" aria-hidden="true">
                  <path
                    d="M16.6 6.6A7 7 0 1 0 17 10h-2a5 5 0 1 1-1.5-3.5L11 9h7V2l-1.4 1.4z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              <span>{hint}</span>
            </span>
          ) : null}
          {timestamp ? (
            <span className="chat__bubble-time">{timestamp}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
