import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";

import ChatBubble from "./ChatBubble";

export type ChatMessage = {
  id: string;
  role: "bot" | "user";
  text: string;
  stepIndex?: number;
  timestamp?: number;
};

type ChatMessageListProps = {
  messages: ChatMessage[];
  isTyping: boolean;
  editableAnswerIndex?: number | null;
  onEditStep?: (stepIndex: number) => void;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
};

export default function ChatMessageList({
  messages,
  isTyping,
  editableAnswerIndex = null,
  onEditStep,
  scrollContainerRef,
}: ChatMessageListProps) {
  const safeMessages = messages.map((message, index) => {
    const role =
      message.role === "user" || message.role === "bot" ? message.role : "bot";
    const text = typeof message.text === "string" ? message.text : "";
    const id =
      typeof message.id === "string" && message.id.trim()
        ? message.id
        : `${role}-${index}`;
    const stepIndex =
      typeof message.stepIndex === "number" ? message.stepIndex : undefined;
    const timestamp =
      typeof message.timestamp === "number" ? message.timestamp : undefined;

    return { ...message, id, role, text, stepIndex, timestamp };
  });

  const formatTime = (timestamp?: number) => {
    if (!timestamp) {
      return "";
    }

    return new Date(timestamp).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatSeparatorLabel = (timestamp: number) => {
    const date = new Date(timestamp);
    const dateLabel = date.toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "2-digit",
      month: "short",
    });
    const timeLabel = formatTime(timestamp);
    return `${dateLabel} · ${timeLabel}`;
  };

  const getSeparatorLabel = (
    currentTimestamp?: number,
    previousTimestamp?: number,
  ) => {
    if (!currentTimestamp || !previousTimestamp) {
      return null;
    }

    const currentDate = new Date(currentTimestamp);
    const previousDate = new Date(previousTimestamp);
    const isNewDay =
      currentDate.toDateString() !== previousDate.toDateString();
    if (isNewDay) {
      return formatSeparatorLabel(currentTimestamp);
    }

    const gapMinutes = (currentTimestamp - previousTimestamp) / 60000;
    if (gapMinutes >= 30) {
      return formatTime(currentTimestamp);
    }

    return null;
  };

  const chatRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const didInitialScrollRef = useRef(false);
  const [isNearBottom, setIsNearBottom] = useState(true);

  useEffect(() => {
    const container = scrollContainerRef?.current ?? chatRef.current;
    if (!container) {
      return;
    }

    const updateNearBottom = () => {
      const threshold = 320;
      const distanceToBottom =
        container.scrollHeight - (container.scrollTop + container.clientHeight);
      setIsNearBottom(distanceToBottom <= threshold);
    };

    const handleScroll = () => updateNearBottom();

    updateNearBottom();
    container.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", updateNearBottom);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updateNearBottom);
    };
  }, [scrollContainerRef]);

  useLayoutEffect(() => {
    if (!isNearBottom && didInitialScrollRef.current) {
      return;
    }

    const delay = isTyping ? 260 : 0;
    const timeoutId = window.setTimeout(() => {
      endRef.current?.scrollIntoView({
        behavior: isTyping ? "smooth" : "auto",
        block: "end",
      });
      didInitialScrollRef.current = true;
    }, delay);

    return () => window.clearTimeout(timeoutId);
  }, [messages, isTyping, isNearBottom]);

  const showScrollToBottom = !isNearBottom && safeMessages.length > 0;
  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  return (
    <div
      className="chat"
      aria-live="polite"
      ref={chatRef}
    >
      {safeMessages.map((message, index) => {
        const previousMessage = index > 0 ? safeMessages[index - 1] : null;
        const separatorLabel = getSeparatorLabel(
          message.timestamp,
          previousMessage?.timestamp,
        );
        const trimmedText = message.text.trim();
        const isCompact =
          trimmedText.length > 0 &&
          trimmedText.length <= 40 &&
          !trimmedText.includes("\n");
        const rowClass = `chat__row chat__row--${message.role}${
          isCompact ? " chat__row--compact" : ""
        }`;

        return (
          <Fragment key={message.id}>
            {separatorLabel ? (
              <div
                className="chat__time-separator"
                role="separator"
                aria-label={separatorLabel}
              >
                <span>{separatorLabel}</span>
              </div>
            ) : null}
            <div className={rowClass}>
              {message.role === "bot" ? (
                <span className="chat__avatar" aria-hidden="true">
                  <span className="chat__avatar-initials">CH</span>
                  <span className="chat__avatar-dot" />
                </span>
              ) : null}
              <ChatBubble
                type={message.role}
                delayMs={Math.min(index * 40, 200)}
                interactive={
                  message.role === "user" &&
                  typeof message.stepIndex === "number" &&
                  typeof editableAnswerIndex === "number" &&
                  message.stepIndex === editableAnswerIndex
                }
                ariaLabel={
                  message.role === "user" && typeof message.stepIndex === "number"
                    ? "Modifier la reponse precedente"
                    : undefined
                }
                onClick={
                  message.role === "user" &&
                    typeof message.stepIndex === "number" &&
                    typeof editableAnswerIndex === "number" &&
                    message.stepIndex === editableAnswerIndex
                    ? () => onEditStep?.(message.stepIndex ?? 0)
                    : undefined
                }
                hint={
                  message.role === "user" &&
                    typeof message.stepIndex === "number" &&
                    typeof editableAnswerIndex === "number" &&
                    message.stepIndex === editableAnswerIndex
                    ? "Toucher pour modifier"
                    : undefined
                }
                timestamp={formatTime(message.timestamp)}
              >
                {message.text}
              </ChatBubble>
            </div>
          </Fragment>
        );
      })}
      {isTyping ? (
        <div className="chat__row chat__row--bot">
          <span className="chat__avatar" aria-hidden="true">
            <span className="chat__avatar-initials">CH</span>
            <span className="chat__avatar-dot" />
          </span>
          <ChatBubble type="bot" isTyping />
        </div>
      ) : null}
      {showScrollToBottom ? (
        <div className="chat__scroll-to-bottom">
          <button
            type="button"
            className="chat__scroll-btn"
            onClick={scrollToBottom}
            aria-label="Revenir en bas"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5v12" />
              <path d="M7 12l5 5 5-5" />
            </svg>
          </button>
        </div>
      ) : null}
      <div ref={endRef} />
    </div>
  );
}
