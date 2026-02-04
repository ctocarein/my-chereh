"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import ChatInputBar from "@/components/flow/ChatInputBar";
import ChatMessageList, {
  type ChatMessage,
} from "@/components/flow/ChatMessageList";
import ProgressBar from "@/components/flow/ProgressBar";
import RequireAuth from "@/components/auth/RequireAuth";

import {
  advanceEvaluation,
  getCurrentEvaluation,
  getEvaluationState,
  startEvaluation,
} from "@/lib/api/evaluations";
import { getCurrentIdentity } from "@/lib/api/identity";
import { listAnswers } from "@/lib/api/answers";
import {
  extractSessionIds,
  pickInternalSessionId,
  pickPublicSessionId,
} from "@/lib/api/session";
import { uploadEvaluationFile } from "@/lib/api/uploads";
import type { EvaluationQuestion, StartEvaluationResponse } from "@/lib/api/types";
import { ApiError } from "@/lib/api/client";
import type { Question, QuestionOption, QuestionType } from "@/types/questions";
import { readStoredReferralCode } from "@/lib/referral";

type Answer = {
  questionId: string;
  questionKey: string;
  value: string | string[];
  display: string;
};

type FlowAnswerInput = string | string[] | File;

type StoredFlowState = {
  version: 3 | 4;
  answers: Answer[];
  messages: ChatMessage[];
  questionHistory: Question[];
  isComplete: boolean;
  sessionId?: string | null;
  sessionInternalId?: string | null;
  sessionPublicId?: string | null;
  completionMessage?: string | null;
  ownerId?: string | null;
};

const flowStorageKey = "evaluation-flow-v1";
const defaultCompletionPrompt =
  "Merci. Je prepare une orientation claire et rassurante.";
const evaluationType =
  process.env.NEXT_PUBLIC_EVALUATION_TYPE ?? "complete";
const shouldLog = process.env.NEXT_PUBLIC_FLOW_DEBUG === "true";
const parseBlocKeys = (raw?: string) => {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => String(item).trim())
        .filter(Boolean);
    }
  } catch {
    // Fall back to comma-separated values.
  }

  return trimmed.split(",").map((item) => item.trim()).filter(Boolean);
};

const configuredBlocKeys = parseBlocKeys(
  process.env.NEXT_PUBLIC_EVALUATION_BLOC_KEYS,
);
const evaluationBlocKeys = configuredBlocKeys;
const evaluationContext = (() => {
  const raw = process.env.NEXT_PUBLIC_EVALUATION_CONTEXT;
  if (!raw) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : undefined;
  } catch {
    return undefined;
  }
})();

const createMessage = (
  role: ChatMessage["role"],
  text: string,
  stepIndex?: number,
): ChatMessage => ({
  id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  role,
  text,
  stepIndex,
  timestamp: Date.now(),
});

const mapQuestionType = (value?: string): QuestionType => {
  const normalized = typeof value === "string" ? value.toLowerCase().trim() : "";
  switch (normalized) {
    case "select":
    case "select_one":
    case "single":
      return "select_one";
    case "multi_select":
    case "select_multiple":
    case "multiple":
      return "select_multiple";
    case "boolean":
    case "yes_no":
      return "boolean";
    case "number":
    case "numeric":
      return "number";
    case "date":
      return "date";
    case "time":
      return "time";
    case "slider":
      return "slider";
    case "rating":
      return "rating";
    case "file":
      return "file";
    case "image":
      return "image";
    case "audio":
      return "audio";
    case "video":
      return "video";
    case "location":
      return "location";
    case "info":
      return "info";
    case "custom":
      return "custom";
    default:
      return "text";
  }
};

const normalizeQuestion = (question: EvaluationQuestion | Question): Question => {
  const rawId = question.id ?? question.key ?? "question";
  const id = String(rawId);
  const key = question.key ? String(question.key) : id;
  const text =
    question.text ??
    (question as { label?: string }).label ??
    "";

  return {
    ...question,
    id,
    key,
    text,
    type: mapQuestionType(question.type),
  } as Question;
};

const normalizeOptions = (options?: Question["options"]): QuestionOption[] => {
  if (!options) {
    return [];
  }

  if (typeof options === "string") {
    try {
      const parsed = JSON.parse(options);
      if (Array.isArray(parsed)) {
        return parsed.map((option) => ({
          value: String(option.value ?? option),
          label: String(option.label ?? option),
        }));
      }
    } catch {
      return [];
    }
  }

  if (Array.isArray(options)) {
    return options.map((option) =>
      typeof option === "string"
        ? { value: option, label: option }
        : { value: String(option.value), label: String(option.label) },
    );
  }

  return [];
};

const getQuestionText = (question: Question) =>
  question.text || question.prompt || "";

const isFileAnswer = (answer: unknown): answer is File =>
  typeof File !== "undefined" && answer instanceof File;

const formatAnswerForDisplay = (
  question: Question,
  answer: FlowAnswerInput,
) => {
  if (isFileAnswer(answer)) {
    return answer.name || "Fichier joint";
  }

  const options = normalizeOptions(question.options);

  const mapValue = (value: string) => {
    if (question.type === "boolean") {
      if (value === "yes" || value === "true") {
        return "Oui";
      }
      if (value === "no" || value === "false") {
        return "Non";
      }
    }

    const option = options.find((item) => item.value === value);
    return option?.label ?? value;
  };

  if (Array.isArray(answer)) {
    return answer.map(mapValue).join(", ");
  }

  return mapValue(answer);
};

const buildMessages = (
  questions: Question[],
  answers: Answer[],
  isComplete: boolean,
  completionText: string,
) => {
  const result: ChatMessage[] = [];

  questions.forEach((question, index) => {
    result.push(createMessage("bot", getQuestionText(question), index));
    const answer = answers[index];
    if (answer) {
      result.push(createMessage("user", answer.display, index));
    }
  });

  if (isComplete) {
    result.push(createMessage("bot", completionText));
  }

  return result;
};

const getTypingDelay = (text: string) => {
  const base = 200;
  const perChar = 12;
  return Math.min(900, Math.max(220, base + text.length * perChar));
};

const createIdempotencyKey = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const looksLikeUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );

const resolveStoredSessionIds = (stored: StoredFlowState | null) => {
  const internalId = stored?.sessionInternalId ?? null;
  const publicId = stored?.sessionPublicId ?? null;
  if (internalId || publicId) {
    return { internalId, publicId };
  }
  const fallback = stored?.sessionId ? String(stored.sessionId) : null;
  if (!fallback) {
    return { internalId: null, publicId: null };
  }
  if (looksLikeUuid(fallback)) {
    return { internalId: null, publicId: fallback };
  }
  return { internalId: fallback, publicId: null };
};

const extractEvaluationQuestion = (payload: {
  question?: EvaluationQuestion | null;
  currentQuestion?: EvaluationQuestion | null;
  session?: {
    current_question?: EvaluationQuestion | null;
    currentQuestion?: EvaluationQuestion | null;
  };
}) =>
  payload.question ??
  payload.currentQuestion ??
  payload.session?.current_question ??
  payload.session?.currentQuestion ??
  null;

const logResolvedSessionIds = (
  label: string,
  ids: ReturnType<typeof extractSessionIds>,
) => {
  if (!shouldLog) {
    return;
  }
  // eslint-disable-next-line no-console
  console.info(label, {
    internalId: ids.internalId,
    publicId: ids.publicId,
  });
};

const logApiError = (label: string, error: unknown) => {
  if (!shouldLog) {
    return;
  }

  if (error instanceof ApiError) {
    // eslint-disable-next-line no-console
    console.error(label, error);
    // eslint-disable-next-line no-console
    console.error(`${label} details`, {
      status: error.status,
      message: error.message,
      data: error.data,
    });
    return;
  }

  if (error instanceof Error) {
    // eslint-disable-next-line no-console
    console.error(label, {
      message: error.message,
      stack: error.stack,
    });
    return;
  }

  // eslint-disable-next-line no-console
  console.error(label, error);
};

const extractFirstError = (data: unknown) => {
  if (!data || typeof data !== "object") {
    return null;
  }

  const errors = (data as { errors?: Record<string, unknown> }).errors;
  if (!errors || typeof errors !== "object") {
    return null;
  }

  for (const value of Object.values(errors)) {
    if (Array.isArray(value)) {
      const first = value.find((item) => typeof item === "string");
      if (first) {
        return first;
      }
    } else if (typeof value === "string") {
      return value;
    }
  }

  return null;
};

const formatApiError = (error: ApiError) => {
  const fallback = `Erreur ${error.status}. Veuillez reessayer.`;

  if (!error.data) {
    return fallback;
  }

  if (typeof error.data === "string") {
    return error.data;
  }

  if (typeof error.data === "object") {
    const firstError = extractFirstError(error.data);
    if (firstError) {
      return firstError;
    }

    const data = error.data as { message?: string };
    if (typeof data.message === "string") {
      return data.message;
    }

    try {
      return `Erreur ${error.status}. ${JSON.stringify(error.data)}`;
    } catch {
      return fallback;
    }
  }

  return fallback;
};

type ReferralStartError = {
  code: "ALREADY_COMPLETED" | "SESSION_IN_PROGRESS";
  redirectUrl?: string;
  sessionId?: string | null;
  message?: string | null;
};

const extractReferralError = (error: ApiError): ReferralStartError | null => {
  const data = error.data;
  if (!data || typeof data !== "object") {
    return null;
  }

  const record = data as Record<string, unknown>;
  const rawCode =
    record.error_code ??
    record.errorCode ??
    record.code ??
    record.status_code ??
    record.statusCode;
  if (typeof rawCode !== "string") {
    return null;
  }

  const normalized = rawCode.trim().toUpperCase();
  if (normalized !== "ALREADY_COMPLETED" && normalized !== "SESSION_IN_PROGRESS") {
    return null;
  }

  const redirectUrl =
    typeof record.redirect_url === "string"
      ? record.redirect_url
      : typeof record.redirectUrl === "string"
        ? record.redirectUrl
        : undefined;

  const sessionIdRaw =
    record.session_id ?? record.sessionId ?? record.session;
  const sessionId =
    sessionIdRaw !== undefined && sessionIdRaw !== null
      ? String(sessionIdRaw)
      : null;

  const message =
    typeof record.message === "string" ? record.message : null;

  return {
    code: normalized,
    redirectUrl,
    sessionId,
    message,
  };
};

const normalizeAnswerValue = (value: unknown): string | string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
};

const formatAnswerDisplay = (value: string | string[], display?: unknown) => {
  if (typeof display === "string" && display.trim()) {
    return display;
  }
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  return value;
};

export default function FlowPage() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [questionHistory, setQuestionHistory] = useState<Question[]>([]);
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [sessionInternalId, setSessionInternalId] = useState<string | null>(
    null,
  );
  const [sessionPublicId, setSessionPublicId] = useState<string | null>(null);
  const [completionMessage, setCompletionMessage] = useState(
    defaultCompletionPrompt,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [referralError, setReferralError] = useState<ReferralStartError | null>(
    null,
  );
  const timeoutRef = useRef<number | null>(null);
  const flowRef = useRef<HTMLElement | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const actionsRef = useRef<HTMLDivElement | null>(null);
  const hasHydratedRef = useRef(false);
  const requestIdRef = useRef(0);
  const ownerIdRef = useRef<string | null>(null);

  const currentQuestion = useMemo(() => {
    if (isComplete) {
      return null;
    }
    return questionHistory[answers.length] ?? null;
  }, [answers.length, isComplete, questionHistory]);

  const evaluationSessionId = sessionInternalId ?? null;
  const answersSessionId = sessionPublicId ?? sessionInternalId ?? null;

  const progressDenominator = answers.length + (currentQuestion ? 1 : 0);
  const progressValue = isComplete
    ? 1
    : progressDenominator > 0
      ? answers.length / progressDenominator
      : 0;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!shouldLog) {
      return;
    }
    // eslint-disable-next-line no-console
    console.info("flow state snapshot", {
      sessionInternalId,
      sessionPublicId,
      isComplete,
      isBotTyping,
      errorMessage,
      messagesCount: messages.length,
      questionsCount: questionHistory.length,
      answersCount: answers.length,
      currentQuestion: currentQuestion
        ? { id: currentQuestion.id, type: currentQuestion.type }
        : null,
    });
  }, [
    answers.length,
    currentQuestion,
    errorMessage,
    isBotTyping,
    isComplete,
    messages.length,
    questionHistory.length,
    sessionInternalId,
    sessionPublicId,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const clearStoredFlow = (reason?: string) => {
      if (typeof window === "undefined") {
        return;
      }
      if (shouldLog) {
        // eslint-disable-next-line no-console
        console.warn("flow clearStoredFlow", { reason });
      }
      window.localStorage.removeItem(flowStorageKey);
    };

    const hydrateCurrentEvaluation = async () => {
      const requestId = (requestIdRef.current += 1);
      try {
        const state = await getCurrentEvaluation();
        if (requestIdRef.current !== requestId) {
          return;
        }
        if (shouldLog) {
          // eslint-disable-next-line no-console
          console.info("getCurrentEvaluation response", state);
        }
        const nextSessionIds = extractSessionIds(
          state as StartEvaluationResponse,
        );
        logResolvedSessionIds("getCurrentEvaluation session ids", nextSessionIds);
        if (nextSessionIds.internalId !== null) {
          setSessionInternalId(nextSessionIds.internalId);
        }
        if (nextSessionIds.publicId !== null) {
          setSessionPublicId(nextSessionIds.publicId);
        }
        const nextAnswersSessionId = pickPublicSessionId(nextSessionIds);
        const nextMessage =
          (state as { message?: string }).message ?? defaultCompletionPrompt;
        setCompletionMessage(nextMessage);
        const isDone =
          state.isComplete === true ||
          state.session?.status === "completed";
        const resolvedQuestion = !isDone
          ? extractEvaluationQuestion(state)
          : null;
        if (resolvedQuestion) {
          const nextQuestion = normalizeQuestion(resolvedQuestion);
          setQuestionHistory([nextQuestion]);
          setMessages([createMessage("bot", getQuestionText(nextQuestion), 0)]);
          setIsComplete(false);
          if (nextAnswersSessionId && answers.length === 0) {
            listAnswers(nextAnswersSessionId)
              .then((items) => {
                if (requestIdRef.current !== requestId) {
                  return;
                }
                const nextAnswers = Array.isArray(items)
                  ? items
                    .map((item) => {
                      if (!item || typeof item !== "object") {
                        return null;
                      }
                      const record = item as Record<string, unknown>;
                      const rawQuestionId =
                        record.questionId ?? record.question_id ?? record.question;
                      if (!rawQuestionId) {
                        return null;
                      }
                      const questionId = String(rawQuestionId);
                      const value = normalizeAnswerValue(record.value);
                      return {
                        questionId,
                        questionKey: questionId,
                        value,
                        display: formatAnswerDisplay(value, record.display),
                      } as Answer;
                    })
                    .filter((answer): answer is Answer => Boolean(answer))
                  : [];

                if (nextAnswers.length > 0) {
                  setAnswers((current) =>
                    current.length > 0 ? current : nextAnswers,
                  );
                  setMessages((current) =>
                    current.length > 0
                      ? current
                      : buildMessages(
                        [nextQuestion],
                        nextAnswers,
                        false,
                        nextMessage,
                      ),
                  );
                }
              })
              .catch(() => {
                // Ignore answers hydration failures.
              });
          }
        } else if (isDone) {
          setQuestionHistory([]);
          setMessages([createMessage("bot", nextMessage)]);
          setIsComplete(true);
        } else {
          void startNewEvaluation();
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          void startNewEvaluation();
          return;
        }
        logApiError("Flow current evaluation failed", error);
        void startNewEvaluation();
      } finally {
        if (requestIdRef.current === requestId) {
          setIsBotTyping(false);
          hasHydratedRef.current = true;
        }
      }
    };

    const startNewEvaluation = async () => {
      setErrorMessage(null);
      setReferralError(null);
      setIsBotTyping(true);
      const requestId = (requestIdRef.current += 1);

      try {
        if (shouldLog) {
          // eslint-disable-next-line no-console
          console.info("startEvaluation payload", {
            type: evaluationType,
            bloc_keys: evaluationBlocKeys,
            context: evaluationContext,
          });
        }

        if (evaluationType === "thematic" && evaluationBlocKeys.length === 0) {
          setErrorMessage("bloc_keys requis pour une evaluation thematique.");
          setIsBotTyping(false);
          hasHydratedRef.current = true;
          return;
        }

        const referralCode = readStoredReferralCode();
        const response = await startEvaluation(
          {
            type: evaluationType,
            bloc_keys: evaluationBlocKeys,
            ...(evaluationType === "thematic" && evaluationContext
              ? { context: evaluationContext }
              : {}),
            ...(referralCode
              ? { ref: referralCode, referral_code: referralCode }
              : {}),
          },
          undefined,
          createIdempotencyKey(),
        );
        if (requestIdRef.current !== requestId) {
          return;
        }

        if (shouldLog) {
          // eslint-disable-next-line no-console
          console.info("startEvaluation response", response);
        }

        const nextSessionIds = extractSessionIds(response);
        logResolvedSessionIds("startEvaluation session ids", nextSessionIds);
        const nextEvaluationId = pickInternalSessionId(nextSessionIds);
        if (!nextEvaluationId) {
          setErrorMessage("Session invalide.");
          if (shouldLog) {
            // eslint-disable-next-line no-console
            console.warn("startEvaluation missing session id", response);
          }
          return;
        }
        setSessionInternalId(nextSessionIds.internalId ?? null);
        setSessionPublicId(nextSessionIds.publicId ?? null);

        const nextMessage =
          (response as { message?: string }).message ?? defaultCompletionPrompt;
        setCompletionMessage(nextMessage);

        const initialQuestion = extractEvaluationQuestion(response);
        if (initialQuestion) {
          if (shouldLog) {
            // eslint-disable-next-line no-console
            console.info("startEvaluation initial question", initialQuestion);
          }
          const nextQuestion = normalizeQuestion(initialQuestion);
          setAnswers([]);
          setQuestionHistory([nextQuestion]);
          setMessages([createMessage("bot", getQuestionText(nextQuestion), 0)]);
          setIsComplete(false);
          return;
        }

        if (shouldLog) {
          // eslint-disable-next-line no-console
          console.info("startEvaluation completed without question", {
            message: nextMessage,
          });
        }
        setAnswers([]);
        setQuestionHistory([]);
        setMessages([createMessage("bot", nextMessage)]);
        setIsComplete(true);
      } catch (error) {
        if (requestIdRef.current !== requestId) {
          return;
        }
        if (error instanceof ApiError) {
          const referralIssue = extractReferralError(error);
          if (referralIssue) {
            setReferralError(referralIssue);
            setErrorMessage(null);
            setIsBotTyping(false);
            hasHydratedRef.current = true;
            return;
          }
          setErrorMessage(formatApiError(error));
        } else {
          setErrorMessage("Impossible de charger la premiere question.");
        }
        logApiError("Flow initial question failed", error);
      } finally {
        if (requestIdRef.current === requestId) {
          setIsBotTyping(false);
          hasHydratedRef.current = true;
        }
      }
    };

    const hydrateStoredSession = async (
      storedSessionId: string,
      storedCompletion: string,
    ) => {
      setErrorMessage(null);
      setIsBotTyping(true);
      const requestId = (requestIdRef.current += 1);
      try {
        if (shouldLog) {
          // eslint-disable-next-line no-console
          console.info("hydrateStoredSession start", {
            storedSessionId,
            storedCompletion,
          });
        }
        const state = await getEvaluationState(
          storedSessionId,
          undefined,
          createIdempotencyKey(),
        );
        if (requestIdRef.current !== requestId) {
          return;
        }
        if (shouldLog) {
          // eslint-disable-next-line no-console
          console.info("getEvaluationState response", state);
        }
        const nextSessionIds = extractSessionIds(state);
        logResolvedSessionIds("getEvaluationState session ids", nextSessionIds);
        if (nextSessionIds.internalId !== null) {
          setSessionInternalId(nextSessionIds.internalId);
        }
        if (nextSessionIds.publicId !== null) {
          setSessionPublicId(nextSessionIds.publicId);
        }
        const nextMessage =
          (state as { message?: string }).message ?? defaultCompletionPrompt;
        setCompletionMessage(nextMessage);
        const isDone =
          state.isComplete === true ||
          state.session?.status === "completed";
        const resolvedQuestion = !isDone
          ? extractEvaluationQuestion(state)
          : null;

        if (resolvedQuestion) {
          if (shouldLog) {
            // eslint-disable-next-line no-console
            console.info("hydrateStoredSession resolved question", resolvedQuestion);
          }
          const nextQuestion = normalizeQuestion(resolvedQuestion);
          setQuestionHistory([nextQuestion]);
          setMessages([
            createMessage("bot", getQuestionText(nextQuestion), 0),
          ]);
          setIsComplete(false);
        } else if (!isDone) {
          if (shouldLog) {
            // eslint-disable-next-line no-console
            console.warn("hydrateStoredSession empty question, restarting");
          }
            clearStoredFlow("hydrate:missing-question");
            setSessionInternalId(null);
            setSessionPublicId(null);
            setQuestionHistory([]);
            setMessages([]);
            setIsComplete(false);
            void startNewEvaluation();
            return;
        } else {
          if (shouldLog) {
            // eslint-disable-next-line no-console
            console.info("hydrateStoredSession completed", nextMessage);
          }
          setQuestionHistory([]);
          setMessages([createMessage("bot", nextMessage)]);
          setIsComplete(true);
        }
      } catch (error) {
        if (requestIdRef.current !== requestId) {
          return;
        }
        if (error instanceof ApiError) {
          if (error.status === 404 || error.status === 410) {
            clearStoredFlow("hydrate:not-found-or-expired");
            void hydrateCurrentEvaluation();
            return;
          }
          setErrorMessage(formatApiError(error));
        } else {
          setErrorMessage("Impossible de charger la premiere question.");
        }
        logApiError("Flow state failed", error);
        clearStoredFlow("hydrate:error");
        void hydrateCurrentEvaluation();
      } finally {
        if (requestIdRef.current === requestId) {
          setIsBotTyping(false);
          hasHydratedRef.current = true;
        }
      }
    };

    const run = async () => {
      const identity = await getCurrentIdentity().catch(() => null);
      const identityId = identity?.id ? String(identity.id) : null;
      ownerIdRef.current = identityId;

      const raw = window.localStorage.getItem(flowStorageKey);
      if (raw) {
        try {
          const stored = JSON.parse(raw) as StoredFlowState;
          if (stored?.version === 3 || stored?.version === 4) {
            if (identityId && stored.ownerId && stored.ownerId !== identityId) {
              clearStoredFlow("owner-mismatch");
              void hydrateCurrentEvaluation();
              return;
            }
            if (identityId && !stored.ownerId) {
              stored.ownerId = identityId;
              try {
                window.localStorage.setItem(
                  flowStorageKey,
                  JSON.stringify(stored),
                );
              } catch {
                // Ignore storage failures.
              }
            }
            if (shouldLog) {
              // eslint-disable-next-line no-console
              console.info("flow hydrate from storage", {
                hasSessionId: Boolean(stored.sessionId),
                hasSessionInternalId: Boolean(stored.sessionInternalId),
                hasSessionPublicId: Boolean(stored.sessionPublicId),
                isComplete: stored.isComplete,
                answersCount: Array.isArray(stored.answers) ? stored.answers.length : 0,
                messagesCount: Array.isArray(stored.messages) ? stored.messages.length : 0,
                questionsCount: Array.isArray(stored.questionHistory)
                  ? stored.questionHistory.length
                  : 0,
              });
            }
            const safeAnswers = Array.isArray(stored.answers)
              ? stored.answers
              : [];
            const safeMessages = Array.isArray(stored.messages)
              ? stored.messages
              : [];
            const safeQuestions = Array.isArray(stored.questionHistory)
              ? stored.questionHistory
                .filter(
                  (question) =>
                    Boolean(question) && typeof question === "object",
                )
                .map((question) => {
                  try {
                    return normalizeQuestion(
                      question as EvaluationQuestion | Question,
                    );
                  } catch {
                    return null;
                  }
                })
                .filter((question): question is Question => Boolean(question))
              : [];
            const safeIsComplete = Boolean(stored.isComplete);
            const storedCompletion =
              stored.completionMessage ?? defaultCompletionPrompt;
            const storedIds = resolveStoredSessionIds(stored);
            const storedEvaluationId = pickInternalSessionId(storedIds);
            const storedAnswersId = pickPublicSessionId(storedIds);

            setAnswers(safeAnswers);
            setMessages(
              safeMessages.length > 0
                ? safeMessages
                : buildMessages(
                  safeQuestions,
                  safeAnswers,
                  safeIsComplete,
                  storedCompletion,
                ),
            );
            setQuestionHistory(safeQuestions);
            setIsComplete(safeIsComplete);
            setSessionInternalId(storedIds.internalId);
            setSessionPublicId(storedIds.publicId);
            setCompletionMessage(storedCompletion);
            setIsBotTyping(false);
            setErrorMessage(null);
            hasHydratedRef.current = true;

            if (
              storedAnswersId &&
              safeAnswers.length === 0 &&
              safeQuestions.length > 0
            ) {
              const requestId = (requestIdRef.current += 1);
              listAnswers(storedAnswersId)
                .then((items) => {
                  if (requestIdRef.current !== requestId) {
                    return;
                  }
                  const nextAnswers = Array.isArray(items)
                    ? items
                      .map((item) => {
                        if (!item || typeof item !== "object") {
                          return null;
                        }
                        const record = item as Record<string, unknown>;
                        const rawQuestionId =
                          record.questionId ?? record.question_id ?? record.question;
                        if (!rawQuestionId) {
                          return null;
                        }
                        const questionId = String(rawQuestionId);
                        const value = normalizeAnswerValue(record.value);
                        return {
                          questionId,
                          questionKey: questionId,
                          value,
                          display: formatAnswerDisplay(value, record.display),
                        } as Answer;
                      })
                      .filter((answer): answer is Answer => Boolean(answer))
                    : [];

                  if (nextAnswers.length > 0) {
                    setAnswers(nextAnswers);
                    setMessages(
                      buildMessages(
                        safeQuestions,
                        nextAnswers,
                        safeIsComplete,
                        storedCompletion,
                      ),
                    );
                  }
                })
                .catch(() => {
                  // Ignore answers hydration failures.
                });
            }

            if (storedEvaluationId && !safeIsComplete && safeQuestions.length === 0) {
              void hydrateStoredSession(
                storedEvaluationId,
                storedCompletion,
              );
              return;
            }
            return;
          }
        } catch {
          // Ignore malformed storage payloads.
        }
      }

      if (shouldLog) {
        // eslint-disable-next-line no-console
        console.info("flow no stored session, starting new evaluation");
      }
      void hydrateCurrentEvaluation();
    };

    void run();
  }, []);

  useEffect(() => {
    if (!hasHydratedRef.current || typeof window === "undefined") {
      return;
    }

    const payload: StoredFlowState = {
      version: 4,
      answers,
      messages,
      questionHistory,
      isComplete,
      sessionId: evaluationSessionId,
      sessionInternalId,
      sessionPublicId,
      completionMessage,
      ownerId: ownerIdRef.current ?? null,
    };

    const hasMeaningfulState =
      Boolean(evaluationSessionId) ||
      Boolean(sessionInternalId) ||
      Boolean(sessionPublicId) ||
      isComplete ||
      answers.length > 0 ||
      questionHistory.length > 0 ||
      messages.length > 0;

    if (!hasMeaningfulState) {
      if (shouldLog) {
        // eslint-disable-next-line no-console
        console.info("flow persist skipped (empty state)");
      }
      return;
    }

    try {
      if (shouldLog) {
        // eslint-disable-next-line no-console
        console.info("flow persist storage", {
          sessionId: evaluationSessionId,
          sessionInternalId,
          sessionPublicId,
          isComplete,
          messagesCount: messages.length,
          questionsCount: questionHistory.length,
          answersCount: answers.length,
        });
      }
      window.localStorage.setItem(flowStorageKey, JSON.stringify(payload));
    } catch {
      // Ignore storage write failures.
    }
  }, [
    answers,
    messages,
    questionHistory,
    isComplete,
    evaluationSessionId,
    sessionInternalId,
    sessionPublicId,
    completionMessage,
  ]);

  useLayoutEffect(() => {
    const flow = flowRef.current;
    const messages = messagesRef.current;
    const progress = progressRef.current;
    const actions = actionsRef.current;

    if (!flow || !messages || !progress || !actions) {
      return;
    }

    const updateMessagesHeight = () => {
      const progressHeight = progress.offsetHeight;
      const actionsHeight = actions.offsetHeight;
      const styles = window.getComputedStyle(flow);
      const gapValue = styles.rowGap || styles.gap || "0";
      const gap = Number.parseFloat(gapValue);
      const totalGap = Number.isNaN(gap) ? 0 : gap * 2;
      const paddingTop = Number.parseFloat(styles.paddingTop || "0");
      const paddingBottom = Number.parseFloat(styles.paddingBottom || "0");
      const flowHeight = flow.clientHeight - paddingTop - paddingBottom;
      const nextHeight = Math.max(
        0,
        flowHeight - progressHeight - actionsHeight - totalGap,
      );
      messages.style.height = `${nextHeight}px`;
      messages.style.maxHeight = `${nextHeight}px`;
    };

    updateMessagesHeight();
    window.addEventListener("resize", updateMessagesHeight);

    if (typeof ResizeObserver === "undefined") {
      return () => window.removeEventListener("resize", updateMessagesHeight);
    }

    const observer = new ResizeObserver(() => updateMessagesHeight());
    observer.observe(flow);
    observer.observe(progress);
    observer.observe(actions);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateMessagesHeight);
    };
  }, []);

  const handleAnswer = async (answer: FlowAnswerInput) => {
    if (isBotTyping || isComplete) {
      return;
    }

    if (!currentQuestion) {
      return;
    }

    const displayText = formatAnswerForDisplay(currentQuestion, answer).trim();
    if (!displayText) {
      return;
    }

    if (!evaluationSessionId) {
      setErrorMessage("Session invalide. Merci de recharger la page.");
      return;
    }

    const answerIndex = answers.length;
    const currentQuestionId = currentQuestion.id ?? currentQuestion.key;
    const currentQuestionKey = currentQuestion.key ?? currentQuestionId;
    const normalizedAnswer: string | string[] = isFileAnswer(answer)
      ? answer.name || "Fichier joint"
      : answer;
    const nextAnswer: Answer = {
      questionId: currentQuestionId,
      questionKey: currentQuestionKey,
      value: normalizedAnswer,
      display: displayText,
    };
    const nextAnswers = [...answers, nextAnswer];

    setMessages((prev) => [
      ...prev,
      createMessage("user", displayText, answerIndex),
    ]);
    setAnswers(nextAnswers);
    setIsBotTyping(true);
    setErrorMessage(null);

    const requestId = (requestIdRef.current += 1);
    try {
      const isFile = isFileAnswer(answer);
      let fileIds: string[] | undefined;
      if (isFile) {
        const upload = await uploadEvaluationFile(answer);
        const fileId = upload.file_id || upload.upload?.file_id;
        if (!fileId) {
          throw new Error("Upload incomplet.");
        }
        fileIds = [fileId];
      }

      const payload = {
        question_id: currentQuestionId,
        value: normalizedAnswer,
        ...(fileIds ? { file_ids: fileIds } : {}),
      };

      if (shouldLog) {
        // eslint-disable-next-line no-console
        console.info("advanceEvaluation payload", {
          sessionId: evaluationSessionId,
          ...payload,
        });
      }

      const response = await advanceEvaluation(
        evaluationSessionId,
        payload,
        undefined,
        createIdempotencyKey(),
      );
      if (requestIdRef.current !== requestId) {
        return;
      }

      if (shouldLog) {
        // eslint-disable-next-line no-console
        console.info("advanceEvaluation response", response);
      }

      const responseSessionIds = extractSessionIds(response);
      logResolvedSessionIds("advanceEvaluation session ids", responseSessionIds);
      if (responseSessionIds.internalId !== null) {
        setSessionInternalId(responseSessionIds.internalId);
      }
      if (responseSessionIds.publicId !== null) {
        setSessionPublicId(responseSessionIds.publicId);
      }

      const resolvedQuestion = extractEvaluationQuestion(response);
      const nextQuestion = resolvedQuestion
        ? normalizeQuestion(resolvedQuestion)
        : null;
      const nextMessage =
        (response as { message?: string }).message ?? completionMessage;
      setCompletionMessage(nextMessage);
      const nextText = nextQuestion
        ? getQuestionText(nextQuestion)
        : nextMessage;
      const isDone =
        response.isComplete === true ||
        response.session?.status === "completed" ||
        !nextQuestion;
      const delay = getTypingDelay(nextText);

      timeoutRef.current = window.setTimeout(() => {
        if (nextQuestion) {
          setQuestionHistory((prev) => [...prev, nextQuestion]);
        }
        setIsComplete(isDone);

        setMessages((prev) => [
          ...prev,
          createMessage("bot", nextText, answerIndex + 1),
        ]);
        setIsBotTyping(false);
        timeoutRef.current = null;
      }, delay);
    } catch (error) {
      if (requestIdRef.current !== requestId) {
        return;
      }
      if (error instanceof ApiError) {
        setErrorMessage(formatApiError(error));
      } else {
        setErrorMessage("Impossible de charger la prochaine question.");
      }
      logApiError("Flow next question failed", error);
      setIsBotTyping(false);
    }
  };

  const editableAnswerIndex =
    !isBotTyping && answers.length > 0 ? answers.length - 1 : null;

  const handleEditStep = (stepIndex: number) => {
    if (isBotTyping) {
      return;
    }
    if (stepIndex < 0 || stepIndex >= answers.length) {
      return;
    }

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const nextAnswers = answers.slice(0, stepIndex);
    const nextQuestions = questionHistory.slice(0, stepIndex + 1);
    const nextMessages = buildMessages(
      nextQuestions,
      nextAnswers,
      false,
      completionMessage,
    );

    setAnswers(nextAnswers);
    setQuestionHistory(nextQuestions);
    setMessages(nextMessages);
    setIsComplete(false);
    setIsBotTyping(false);
    setErrorMessage(null);
  };

  const handleResumeReferralSession = () => {
    if (!referralError?.sessionId || typeof window === "undefined") {
      return;
    }

    const isReferralPublic = looksLikeUuid(referralError.sessionId);
    const payload: StoredFlowState = {
      version: 4,
      answers: [],
      messages: [],
      questionHistory: [],
      isComplete: false,
      sessionId: referralError.sessionId,
      sessionInternalId: isReferralPublic ? null : referralError.sessionId,
      sessionPublicId: isReferralPublic ? referralError.sessionId : null,
      completionMessage: defaultCompletionPrompt,
      ownerId: ownerIdRef.current ?? null,
    };

    try {
      window.localStorage.setItem(flowStorageKey, JSON.stringify(payload));
    } catch {
      // Ignore storage failures.
    }

    window.location.reload();
  };

  const isRelativeUrl = (value: string) =>
    value.startsWith("/") && !value.startsWith("//");

  if (referralError) {
    const isCompleted = referralError.code === "ALREADY_COMPLETED";
    const isInProgress = referralError.code === "SESSION_IN_PROGRESS";
    const redirectUrl = referralError.redirectUrl;
    const description =
      referralError.message ??
      (isCompleted
        ? "Ce lien d'invitation a deja ete utilise sur cet appareil."
        : "Une evaluation est deja en cours pour ce lien.");
    const helperText = isCompleted
      ? "Pour proteger vos donnees de sante, un lien ne peut etre utilise qu'une seule fois."
      : "Vous pouvez reprendre votre evaluation la ou vous vous etiez arrete.";

    return (
      <RequireAuth>
        <main className="page__content" style={{ paddingTop: "28px" }}>
          <h1>{isCompleted ? "Lien deja utilise" : "Evaluation en cours"}</h1>
          <p style={{ marginTop: "8px" }}>{description}</p>
          <p style={{ color: "var(--muted)", marginTop: "6px" }}>
            {helperText}
          </p>
          <div className="page__actions" style={{ marginTop: "20px" }}>
            {isInProgress && referralError.sessionId ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleResumeReferralSession}
              >
                Reprendre l'evaluation
              </button>
            ) : null}
            {redirectUrl ? (
              isRelativeUrl(redirectUrl) ? (
                <Link className="btn btn-primary" href={redirectUrl}>
                  Continuer
                </Link>
              ) : (
                <a className="btn btn-primary" href={redirectUrl}>
                  Continuer
                </a>
              )
            ) : null}
            {isCompleted ? (
              <>
                <Link className="btn btn-secondary" href="/signin">
                  Se connecter
                </Link>
                <Link className="btn btn-secondary" href="/support">
                  Contacter le support
                </Link>
              </>
            ) : null}
            <Link className="btn" href="/">
              Retour a l'accueil
            </Link>
          </div>
        </main>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <main className="page__content flow" ref={flowRef}>
        <header className="page-header">
          <button
            type="button"
            className="page-back"
            onClick={() => router.back()}
            aria-label="Retour"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <div className="page-header__title">Conversation</div>
        </header>
        <div className="flow__progress" ref={progressRef}>
          <ProgressBar progress={progressValue} />
        </div>
        <div className="flow__messages" ref={messagesRef} tabIndex={0}>
          <ChatMessageList
            messages={messages}
            isTyping={isBotTyping}
            editableAnswerIndex={editableAnswerIndex}
            onEditStep={handleEditStep}
            scrollContainerRef={messagesRef}
          />
        </div>
        <div className="flow__actions" ref={actionsRef}>
          {errorMessage ? (
            <div className="chat-input__error">{errorMessage}</div>
          ) : null}
          {!isComplete && currentQuestion ? (
            <ChatInputBar
              question={currentQuestion}
              onAnswer={handleAnswer}
              disabled={isBotTyping}
            />
          ) : null}
          {isComplete && !isBotTyping ? (
            <Link className="btn btn-primary w-full" href="/result">
              Voir mon orientation
            </Link>
          ) : null}
        </div>
      </main>
    </RequireAuth>
  );
}
